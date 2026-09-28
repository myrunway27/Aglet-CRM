export class RateLimitedError extends Error {
  constructor(
    public readonly retryAfterSeconds: number,
    public readonly scope: "upstream" | "local" | "client",
  ) {
    super(`Rate limited (${scope}); retry after ${retryAfterSeconds}s`);
    this.name = "RateLimitedError";
  }
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
