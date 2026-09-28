import { Home } from "@/components/Home";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function Page() {
  return <Home initialMode={env().CATALOG_PROVIDER === "mock" ? "mock" : "live"} />;
}
