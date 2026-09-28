import "server-only";
import { env } from "../env";
import { EcbFxProvider } from "./ecb";
import { MockFxProvider } from "./mock";
import type { FxProvider } from "./types";

let provider: FxProvider | undefined;
export function getFx(): FxProvider {
  provider ??= env().FX_PROVIDER === "ecb" ? new EcbFxProvider() : new MockFxProvider();
  return provider;
}
