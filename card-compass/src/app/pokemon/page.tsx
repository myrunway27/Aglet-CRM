import { SpeciesIndex } from "@/components/SpeciesBrowse";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Browse by Pokémon — Card Compass" };

export default async function PokemonPage() {
  return <SpeciesIndex signedIn={Boolean(await currentUser())} />;
}
