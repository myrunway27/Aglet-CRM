import { z } from "zod";
import { errorResponse } from "@/lib/api";
import { requireDb } from "@/lib/api-auth";
import { assertSameOrigin, requireUser } from "@/lib/auth/guard";
import { getCatalog } from "@/lib/catalog";
import { parseCollectionCsv } from "@/lib/collection-import";
import { insertItems } from "@/lib/collection-write";
import { ValidationError } from "@/lib/errors";

export const runtime = "nodejs";

const Body = z.object({ csv: z.string().max(2_000_000, "File is too large (max 2 MB)."), dryRun: z.boolean().default(true) });

/**
 * Import a CSV. With dryRun (the default) nothing is written: the response
 * lists what would be added and every row error, so the user can confirm.
 */
export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const user = await requireUser();
    const client = requireDb();
    const body = Body.safeParse(await req.json().catch(() => null));
    if (!body.success) throw new ValidationError(body.error.issues[0]?.message ?? "Invalid upload.");

    const { rows, errors } = parseCollectionCsv(body.data.csv);
    const cards = new Map((await getCatalog().getCards(rows.map((r) => r.catalogId))).map((c) => [c.catalogId, c]));
    const valid = rows.filter((r) => {
      if (cards.has(r.catalogId)) return true;
      errors.push({ line: r.line, message: `Card "${r.catalogId}" not found in the catalog` });
      return false;
    });
    errors.sort((a, b) => a.line - b.line);

    const existing = await client.collectionItem.count({ where: { userId: user.id } });
    if (existing + valid.length > 5000) throw new ValidationError("This import would exceed the 5,000-item collection limit.");

    const preview = valid.slice(0, 50).map((r) => ({
      line: r.line,
      name: cards.get(r.catalogId)!.name,
      setName: cards.get(r.catalogId)!.setName,
      number: cards.get(r.catalogId)!.number,
      finish: r.selection.finish,
      quantity: r.quantity,
      binder: r.binder,
    }));
    if (body.data.dryRun) return Response.json({ dryRun: true, valid: valid.length, errors, preview });

    // Resolve (and create) binders by name.
    const names = [...new Set(valid.map((r) => r.binder).filter((b): b is string => Boolean(b)))];
    const binderIds = new Map<string, string>();
    for (const name of names) {
      const b = await client.binder.upsert({
        where: { userId_name: { userId: user.id, name } },
        create: { userId: user.id, name },
        update: {},
      });
      binderIds.set(name, b.id);
    }
    const added = await insertItems(
      client,
      user.id,
      valid.map((r) => ({ ...r, binderId: r.binder ? binderIds.get(r.binder)! : null })),
      cards,
    );
    return Response.json({ dryRun: false, added, errors });
  } catch (err) {
    return errorResponse(err, "collection.import");
  }
}
