import { Home } from "@/components/Home";
import { currentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await currentUser();
  return <Home initialMode={env().CATALOG_PROVIDER === "mock" ? "mock" : "live"} signedIn={Boolean(user)} />;
}
