import "server-only";
import { TtlCache } from "../cache";
import { env } from "../env";
import { LivePsaProvider, MockPsaProvider, type PsaCert, type PsaProvider } from "./cert";

let provider: PsaProvider | null | undefined;
const cache = new TtlCache<PsaCert>(7 * 86_400_000, 0); // cert records rarely change

export function getPsa(): PsaProvider | null {
  if (provider !== undefined) return provider;
  const e = env();
  provider =
    e.PSA_PROVIDER === "live" && e.PSA_API_TOKEN
      ? new LivePsaProvider(e.PSA_API_TOKEN, e.PSA_LIMIT_PER_DAY)
      : e.PSA_PROVIDER === "mock"
        ? new MockPsaProvider()
        : null;
  return provider;
}

export async function lookupCert(cert: string): Promise<PsaCert> {
  const hit = cache.get(cert);
  if (hit) return hit.value;
  const c = await getPsa()!.lookup(cert);
  cache.set(cert, c);
  return c;
}
