import "server-only";
import { randomBytes } from "node:crypto";
import { TtlCache } from "./cache";
import { db } from "./db";
import { valueRows } from "./jobs";
import { totalCollection } from "./valuation";

export const SHARE_KINDS = ["collection", "binder", "wishlist"] as const;
export type ShareKind = (typeof SHARE_KINDS)[number];
export const SLUG_RE = /^[A-Za-z0-9_-]{16,32}$/;

/** Unguessable slug (128 bits). */
export const newSlug = () => randomBytes(16).toString("base64url");

export interface PublicCard {
  name: string;
  setName: string;
  number: string;
  finish: string;
  language: string;
  grading: string;
  condition: string | null;
  grader: string | null;
  grade: string | null;
  quantity: number;
  catalogId: string;
  values: Array<{ source: string; unitMinor: number; currency: string }> | null;
}

/**
 * Public, read-only view of a share link. Only card identity, condition/grade
 * and quantity are exposed (plus values if the owner chose to). Never the
 * owner's email, purchase prices, cert numbers or other binders.
 */
type ShareView = { title: string; kind: ShareKind; showValues: boolean; cards: PublicCard[]; totals: ReturnType<typeof totalCollection> | null };
// Anonymous views must not fan out to upstream price APIs on every hit.
const views = new TtlCache<ShareView>(10 * 60_000, 0, 1000);

export async function loadShare(slug: string, now = Date.now()): Promise<ShareView | null> {
  if (!SLUG_RE.test(slug)) return null;
  const client = db();
  if (!client) return null;
  const link = await client.shareLink.findUnique({ where: { slug } });
  if (!link || link.revokedAt) return null; // checked on every view, so revocation is immediate
  await client.shareLink.update({ where: { id: link.id }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
  const cached = views.get(`${slug}|${link.showValues}`);
  if (cached?.fresh) return cached.value;

  let cards: PublicCard[];
  let totals: ReturnType<typeof totalCollection> | null = null;
  if (link.kind === "wishlist") {
    const items = await client.wishlistItem.findMany({ where: { userId: link.userId }, orderBy: { createdAt: "desc" } });
    const rows = items.map((w) => ({ ...w, language: "en", grading: "raw", condition: null, grader: null, grade: null, quantity: 1 }));
    const valued = link.showValues ? await valueRows(rows, now) : null;
    cards = rows.map((r, i) => toPublic(r, valued?.[i].valuation));
  } else {
    if (link.kind === "binder" && !link.binderId) return null;
    const items = await client.collectionItem.findMany({
      where: { userId: link.userId, ...(link.kind === "binder" ? { binderId: link.binderId } : {}) },
      orderBy: [{ setName: "asc" }, { number: "asc" }],
    });
    const valued = link.showValues ? await valueRows(items, now) : null;
    cards = items.map((it, i) => toPublic(it, valued?.[i].valuation));
    if (valued) totals = totalCollection(valued).filter((t) => t.itemsPriced > 0);
  }
  const view: ShareView = { title: link.title, kind: link.kind as ShareKind, showValues: link.showValues, cards, totals };
  views.set(`${slug}|${link.showValues}`, view);
  return view;
}

function toPublic(
  it: { name: string; setName: string; number: string; finish: string; language: string; grading: string; condition: string | null; grader: string | null; grade: string | null; quantity: number; catalogId: string },
  valuation?: { bySource: Record<string, { unitMinor: number; currency: string } | undefined> },
): PublicCard {
  return {
    name: it.name,
    setName: it.setName,
    number: it.number,
    finish: it.finish,
    language: it.language,
    grading: it.grading,
    condition: it.condition,
    grader: it.grader,
    grade: it.grade,
    quantity: it.quantity,
    catalogId: it.catalogId,
    values: valuation
      ? Object.entries(valuation.bySource).flatMap(([source, v]) => (v ? [{ source, unitMinor: v.unitMinor, currency: v.currency }] : []))
      : null,
  };
}
