export function DemoBanner() {
  return (
    <div role="note" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <strong>Demo mode.</strong> The catalog and every price on this page are bundled sample fixtures,
      not real market data. Set <code className="font-mono">CATALOG_PROVIDER=pokemontcg</code> to use the
      Pokémon TCG API.
    </div>
  );
}
