/**
 * Estimated cost per post read (X API).
 * Used for optional cost visibility when X_RESEARCH_SHOW_COST=true.
 */
export const COST_PER_POST_EST_USD = 0.005;

export function formatCostFooter(postsRead: number): string {
  const est = postsRead * COST_PER_POST_EST_USD;
  const formatted = est < 0.01 ? '<$0.01' : `$${est.toFixed(2)}`;
  return `_Est. X API: ~${formatted} (${postsRead} posts)_`;
}
