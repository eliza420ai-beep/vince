export interface XRateLimitState {
  remaining: number;
  reset: number;
  limit: number;
}

export function getEndpointGroup(path: string): string {
  if (path.includes("/tweets/search")) return "search";
  if (path.includes("/tweets/counts")) return "counts";
  if (path.includes("/users")) return "users";
  if (path.includes("/lists")) return "lists";
  if (path.includes("/news")) return "news";
  return "default";
}

export function parseRateLimitStateFromHeaders(
  headers: Headers,
): XRateLimitState | null {
  const remaining = headers.get("x-rate-limit-remaining");
  const reset = headers.get("x-rate-limit-reset");
  const limit = headers.get("x-rate-limit-limit");
  if (!remaining || !reset) return null;
  return {
    remaining: parseInt(remaining, 10),
    reset: parseInt(reset, 10),
    limit: limit ? parseInt(limit, 10) : 100,
  };
}
