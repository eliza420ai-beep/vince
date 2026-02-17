/**
 * User-friendly messages for X API failures.
 * Avoids surfacing raw errors like "Failed to get posts from X API:" in chat or reports.
 */

/**
 * Returns a short, safe message for the user when an X API call fails.
 * Log the real error server-side; show this in callbacks.
 */
export function getFriendlyXErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (!msg || lower.includes('x_bearer_token') || lower.includes('required')) {
    return 'X API not configured. Set `X_BEARER_TOKEN` to enable X research.';
  }
  if (lower.includes('401') || lower.includes('authentication')) {
    return 'X API authentication failed. Check that your Bearer token is valid.';
  }
  if (lower.includes('403') || lower.includes('access denied')) {
    return 'X API access denied. Check your token and project access level.';
  }
  if (lower.includes('429') || lower.includes('rate limit')) {
    return 'X API rate limit reached. Try again in a few minutes.';
  }
  if (lower.includes('posts') || lower.includes('get posts') || lower.includes('x api')) {
    return 'X API unavailable. Try again later or check X_BEARER_TOKEN.';
  }
  return 'X API unavailable. Try again later or check X_BEARER_TOKEN.';
}
