/**
 * Estimated cost per post read (X API).
 * Used for optional cost visibility when X_RESEARCH_SHOW_COST=true.
 */
export const COST_PER_POST_EST_USD = 0.005;

/**
 * Estimated cost per user lookup (X API).
 */
export const COST_PER_USER_LOOKUP_EST_USD = 0.01;

export function formatCostFooter(postsRead: number): string {
  const est = postsRead * COST_PER_POST_EST_USD;
  const formatted = est < 0.01 ? '<$0.01' : `$${est.toFixed(2)}`;
  return `_Est. X API: ~${formatted} (${postsRead} posts)_`;
}

export interface CostBreakdown {
  postReads?: number;
  userLookups?: number;
}

/**
 * Format cost footer when both post reads and user lookups are used (e.g. X_ACCOUNT, X_WATCHLIST).
 */
export function formatCostFooterCombined(breakdown: CostBreakdown): string {
  const posts = breakdown.postReads ?? 0;
  const users = breakdown.userLookups ?? 0;
  const total =
    posts * COST_PER_POST_EST_USD + users * COST_PER_USER_LOOKUP_EST_USD;
  const formatted = total < 0.01 ? '<$0.01' : `$${total.toFixed(2)}`;
  const parts: string[] = [];
  if (posts > 0) parts.push(`${posts} posts`);
  if (users > 0) parts.push(`${users} user lookups`);
  return `_Est. X API: ~${formatted} (${parts.join(', ')})_`;
}
