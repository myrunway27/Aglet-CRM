import "server-only";
import { ValidationError } from "../errors";
import { currentUser, type SafeUser } from "./session";

export class UnauthorizedError extends Error {
  constructor() {
    super("Please sign in.");
    this.name = "UnauthorizedError";
  }
}

/**
 * CSRF defence for cookie-authenticated writes: the session cookie is
 * SameSite=Lax, and we additionally require a same-origin Origin header.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) throw new ValidationError("Missing origin.");
  try {
    if (new URL(origin).host !== host) throw new ValidationError("Cross-origin request refused.");
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError("Bad origin.");
  }
}

export async function requireUser(): Promise<SafeUser> {
  const u = await currentUser();
  if (!u) throw new UnauthorizedError();
  return u;
}
