export class RateLimitedError extends Error {
  constructor(
    public readonly retryAfterSeconds: number,
    public readonly scope: "local" | "upstream",
  ) {
    super(scope === "local" ? "Local request budget exhausted" : "Upstream rate limit hit");
    this.name = "RateLimitedError";
  }
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}
