import { PokedexIndex } from "@/components/Pokedex";
import { currentUser } from "@/lib/auth/session";

export const metadata = { title: "Pokédex — Card Compass" };

export default async function PokedexPage() {
  return <PokedexIndex signedIn={Boolean(await currentUser())} />;
}
