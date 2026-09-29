/** Finish keys follow the Pokémon TCG API tcgplayer.prices keys. */
export const FINISH_LABELS: Record<string, string> = {
  normal: "Normal",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse holofoil",
  "1stEditionHolofoil": "1st Edition holofoil",
  "1stEditionNormal": "1st Edition normal",
  unlimitedHolofoil: "Unlimited holofoil",
  "1stEdition": "1st Edition",
  unspecified: "Not finish-specific",
  other: "Other / not sure",
};

export const finishLabel = (f: string) => FINISH_LABELS[f] ?? f;

export interface CatalogCard {
  catalogId: string;
  name: string;
  /** Collector number as printed in the catalog, without the set total (e.g. "25", "TG05"). */
  number: string;
  setId: string;
  setName: string;
  setSeries: string | null;
  /** Printed set total shown after the slash (e.g. 198 in 025/198). */
  setPrintedTotal: number | null;
  setPtcgoCode: string | null;
  releaseDate: string | null;
  rarity: string | null;
  imageSmall: string | null;
  imageLarge: string | null;
  /** Finishes the catalog lists prices for; may be incomplete. */
  finishes: string[];
}

/** Raw price blocks, shaped like Pokémon TCG API v2 card.tcgplayer / card.cardmarket. */
export interface RawTcgplayer {
  url?: string;
  updatedAt?: string;
  prices?: Record<string, Record<string, number | null | undefined> | undefined>;
}

export interface RawCardmarket {
  url?: string;
  updatedAt?: string;
  prices?: Record<string, number | null | undefined>;
}

export interface CatalogCardWithPrices {
  card: CatalogCard;
  tcgplayer: RawTcgplayer | null;
  cardmarket: RawCardmarket | null;
  /** True when the data comes from bundled demo fixtures, not a real source. */
  isDemo: boolean;
}

export interface CatalogSearchClues {
  name?: string;
  number?: string;
  setTotal?: number;
}

export interface CatalogProvider {
  readonly id: "mock" | "pokemontcg";
  searchByClues(clues: CatalogSearchClues): Promise<CatalogCard[]>;
  searchText(query: string): Promise<CatalogCard[]>;
  getCard(catalogId: string): Promise<CatalogCardWithPrices>;
  /** Look up many cards (missing ids are simply absent from the result). */
  getCards(catalogIds: string[]): Promise<CatalogCard[]>;
  /** Every card in a set, sorted by collector number. */
  listSet(setId: string): Promise<CatalogCard[]>;
  /** Cards whose name starts with this Pokémon's name (all sets), newest first. */
  listByName(name: string): Promise<CatalogCard[]>;
}

export const SET_ID_RE = /^[A-Za-z0-9][A-Za-z0-9.]{0,31}$/;

/** Natural sort for collector numbers ("2" < "10" < "TG05"). */
export function compareNumbers(a: string, b: string): number {
  const na = /^\d+$/.test(a);
  const nb = /^\d+$/.test(b);
  if (na && nb) return Number(a) - Number(b);
  if (na !== nb) return na ? -1 : 1;
  return a.localeCompare(b, "en", { numeric: true });
}

/** Catalog IDs look like "sv1-25" or "swsh12pt5-GG01". Validate before use in URLs. */
export const CATALOG_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
