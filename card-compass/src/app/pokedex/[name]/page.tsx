import { PokedexSpecies } from "@/components/Pokedex";

export default async function SpeciesPage({ params }: PageProps<"/pokedex/[name]">) {
  const { name } = await params;
  return <PokedexSpecies name={decodeURIComponent(name).slice(0, 40)} />;
}
