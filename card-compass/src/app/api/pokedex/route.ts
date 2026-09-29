import { errorResponse } from "@/lib/api";
import { currentUser } from "@/lib/auth/session";
import { getCatalog } from "@/lib/catalog";
import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { normalizeName } from "@/lib/matching/normalize";
import { speciesOf } from "@/lib/portfolio";

export const runtime = "nodejs";

/**
 * Pokédex view. With ?name=: every card of that Pokémon (all sets, incl.
 * ex/V/VMAX forms) and which you own. Without: the species in your collection.
 */
export async function GET(req: Request) {
  try {
    const name = (new URL(req.url).searchParams.get("name") ?? "").trim();
    const user = await currentUser();
    const owned = user
      ? await db()!
          .collectionItem.findMany({ where: { userId: user.id }, select: { catalogId: true, name: true, quantity: true } })
          .catch(() => [])
      : [];

    if (!name) {
      const bySpecies = new Map<string, { species: string; cards: Set<string>; quantity: number }>();
      for (const o of owned) {
        const sp = speciesOf(o.name);
        const e = bySpecies.get(sp) ?? { species: sp, cards: new Set<string>(), quantity: 0 };
        e.cards.add(o.catalogId);
        e.quantity += o.quantity;
        bySpecies.set(sp, e);
      }
      return Response.json({
        species: [...bySpecies.values()]
          .map((e) => ({ species: e.species, distinct: e.cards.size, quantity: e.quantity }))
          .sort((a, b) => b.distinct - a.distinct || a.species.localeCompare(b.species)),
      });
    }

    if (name.length < 2 || name.length > 40) throw new ValidationError("Enter a Pokémon name.");
    const want = normalizeName(speciesOf(name));
    const cards = (await getCatalog().listByName(name)).filter((c) => normalizeName(speciesOf(c.name)) === want);
    const counts = new Map<string, number>();
    for (const o of owned) counts.set(o.catalogId, (counts.get(o.catalogId) ?? 0) + o.quantity);
    return Response.json({
      species: cards[0] ? speciesOf(cards[0].name) : speciesOf(name),
      cards: cards.map((card) => ({ card, ownedCount: counts.get(card.catalogId) ?? 0 })),
      signedIn: Boolean(user),
    });
  } catch (err) {
    return errorResponse(err, "pokedex");
  }
}
