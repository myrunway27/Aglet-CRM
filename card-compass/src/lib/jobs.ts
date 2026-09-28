import "server-only";
import { db } from "./db";
import { formatMinor } from "./money";
import { finishLabel } from "./catalog/types";
import { pricechartingRefs } from "./pricecharting";
import { pushToUser } from "./push";
import { saveSnapshots } from "./repo";
import { mapLimit, referencesFor } from "./references";
import { subtypeLabel, SOURCES, type SourceId } from "./prices";
import { shouldTrigger, totalCollection, valueItem, type AlertDirection } from "./valuation";
import { log } from "./log";
import { env } from "./env";
import { sendMail } from "./mail";

const today = (now: number) => new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z");

/** Value a user's collection and upsert today's snapshot per source. */
export async function valueCollection(userId: string, now = Date.now()) {
  const client = db();
  if (!client) return null;
  const items = await client.collectionItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  const ids = [...new Set(items.map((i) => i.catalogId))];
  const refsById = new Map(
    await mapLimit(ids, 4, async (id) => [id, await referencesFor(id, now)] as const),
  );
  // PriceCharting references per printing (catalogId + finish), when enabled.
  const printings = [...new Map(items.map((i) => [`${i.catalogId}|${i.finish}`, i])).values()];
  const pcRefs = new Map(
    await mapLimit(printings, 4, async (i) => {
      const card = refsById.get(i.catalogId)?.data?.card;
      const pc = card ? await pricechartingRefs(card, i.finish, now) : null;
      if (card && pc?.refs.length) void saveSnapshots(card, pc.refs);
      return [`${i.catalogId}|${i.finish}`, pc?.refs ?? []] as const;
    }),
  );
  const valued = items.map((item) => {
    const r = refsById.get(item.catalogId);
    const refs = [...(r?.refs ?? []), ...(pcRefs.get(`${item.catalogId}|${item.finish}`) ?? [])];
    return { item, quantity: item.quantity, valuation: valueItem(item, refs), fromStore: r?.fromStore ?? false };
  });
  const totals = totalCollection(valued);
  if (items.length) {
    await Promise.all(
      totals.map((t) =>
        client.collectionValueSnapshot.upsert({
          where: { userId_day_source: { userId, day: today(now), source: t.source } },
          create: { userId, day: today(now), source: t.source, currency: t.currency, amountMinor: t.amountMinor, itemsPriced: t.itemsPriced, itemsTotal: t.itemsTotal },
          update: { amountMinor: t.amountMinor, itemsPriced: t.itemsPriced, itemsTotal: t.itemsTotal },
        }),
      ),
    );
  }
  return { valued, totals };
}

/** Evaluate every active alert once. Returns counts. */
export async function checkAlerts(now = Date.now()) {
  const client = db();
  if (!client) return { checked: 0, triggered: 0 };
  const alerts = await client.priceAlert.findMany({ where: { active: true } });
  const ids = [...new Set(alerts.map((a) => a.catalogId))];
  const refsById = new Map(await mapLimit(ids, 4, async (id) => [id, await referencesFor(id, now)] as const));
  let triggered = 0;
  for (const a of alerts) {
    const ref = refsById.get(a.catalogId)?.refs.find((r) => r.source === a.source && r.finish === a.finish && r.subtype === a.subtype);
    if (!ref) {
      await client.priceAlert.update({ where: { id: a.id }, data: { lastCheckedAt: new Date(now) } });
      continue;
    }
    const fire = shouldTrigger({
      value: ref.amountMinor,
      previous: a.lastValueMinor,
      direction: a.direction as AlertDirection,
      threshold: a.thresholdMinor,
      lastTriggeredAt: a.lastTriggeredAt,
      now,
    });
    await client.priceAlert.update({
      where: { id: a.id },
      data: { lastValueMinor: ref.amountMinor, lastCheckedAt: new Date(now), ...(fire ? { lastTriggeredAt: new Date(now) } : {}) },
    });
    if (!fire) continue;
    triggered++;
    const src = SOURCES[a.source as SourceId]?.label ?? a.source;
    const title = `${a.cardName}: ${src} ${subtypeLabel(a.subtype).toLowerCase()} is ${a.direction} ${formatMinor(a.thresholdMinor, a.currency)}`;
    const body = `Now ${formatMinor(ref.amountMinor, ref.currency)} (${finishLabel(a.finish)}, as of ${ref.observedAt.slice(0, 10)}). Reference price, not a listing.`;
    const url = `/cards/${encodeURIComponent(a.catalogId)}?finish=${encodeURIComponent(a.finish)}&lang=en&grading=raw&condition=NM`;
    await client.notification.create({ data: { userId: a.userId, title, body, url } });
    await pushToUser(a.userId, { title, body, url });
    const owner = await client.user.findUnique({ where: { id: a.userId }, select: { email: true, emailAlerts: true, emailVerifiedAt: true } });
    if (owner?.emailAlerts && owner.emailVerifiedAt) {
      await sendMail({
        to: owner.email,
        subject: title,
        text: `${body}\n\n${env().APP_URL}${url}\n\nTurn off email alerts on your Account page.`,
      });
    }
  }
  log.info("jobs.alerts_checked", { checked: alerts.length, triggered });
  return { checked: alerts.length, triggered };
}

/** Record today's references for every wishlisted card (collections and alerts already do this). */
export async function snapshotWishlistCards(now = Date.now()) {
  const client = db();
  if (!client) return { cards: 0 };
  const rows = await client.wishlistItem.findMany({ distinct: ["catalogId"], select: { catalogId: true } });
  await mapLimit(rows.map((r) => r.catalogId), 4, (id) => referencesFor(id, now));
  return { cards: rows.length };
}

export async function snapshotAllCollections(now = Date.now()) {
  const client = db();
  if (!client) return { users: 0 };
  const users = await client.collectionItem.findMany({ distinct: ["userId"], select: { userId: true } });
  for (const u of users) await valueCollection(u.userId, now);
  return { users: users.length };
}
