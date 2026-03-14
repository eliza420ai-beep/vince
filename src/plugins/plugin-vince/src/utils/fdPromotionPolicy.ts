/**
 * FD discovery promotion policy: "should this move toward live sleeve consideration now?"
 * Separate from ranking ("is this interesting?"). Consumes bucket/source history and policy gates.
 */

import type { FdDiscoveryCandidate } from "./fdDiscoveryRanker";

/** Minimal bucket metrics for policy (hit rates and counts by bucket). */
export interface PromotionPolicyBucketMetrics {
  promoteNowHitRate: number | null;
  researchNextHitRate: number | null;
  avoidSaveRate: number | null;
  resolvedCountByBucket: Record<string, number>;
  avgReturnByBucket?: Record<string, number>;
}

export interface PromotionPolicyContext {
  projectRoot?: string;
  /** Bucket hit rates and counts from resolved outcomes (optional). */
  bucketMetrics?: PromotionPolicyBucketMetrics | null;
  /** Current sleeve tickers (uppercase) for overlap/diversification. */
  sleeveTickers?: Set<string>;
  /** Min resolved count per bucket to trust hit rate (default 5). */
  minSampleForHitRate?: number;
  /** Min hit rate for PromoteNow to allow promotion (default 0.4). */
  minPromoteNowHitRate?: number;
  /** Require human review for expansion-source when source sample is low. */
  requireReviewForExpansionBelowSample?: number;
}

export interface PromotionVerdict {
  ticker: string;
  bucket: string;
  score: number;
  /** True if policy allows moving toward live sleeve consideration. */
  eligibleForPromotion: boolean;
  /** True if policy suggests human review before promotion. */
  requiresHumanReview: boolean;
  /** Non-empty if policy blocks promotion (reason). */
  blockedByPolicy: string | null;
}

const DEFAULT_MIN_SAMPLE = 5;
const DEFAULT_MIN_PROMOTE_NOW_HIT_RATE = 0.4;
const DEFAULT_EXPANSION_REVIEW_SAMPLE = 3;

/**
 * Apply promotion policy to ranked candidates. Ranking is unchanged; this layer only
 * adds eligibleForPromotion, requiresHumanReview, blockedByPolicy per candidate.
 */
export function applyPromotionPolicy(
  candidates: FdDiscoveryCandidate[],
  context: PromotionPolicyContext,
): PromotionVerdict[] {
  const metrics = context.bucketMetrics;
  const sleeve = context.sleeveTickers ?? new Set<string>();
  const minSample = context.minSampleForHitRate ?? DEFAULT_MIN_SAMPLE;
  const minPromoteHit =
    context.minPromoteNowHitRate ?? DEFAULT_MIN_PROMOTE_NOW_HIT_RATE;
  const expansionReviewBelow =
    context.requireReviewForExpansionBelowSample ??
    DEFAULT_EXPANSION_REVIEW_SAMPLE;

  const promoteNowCount = metrics?.resolvedCountByBucket?.["PromoteNow"] ?? 0;
  const researchNextCount =
    metrics?.resolvedCountByBucket?.["ResearchNext"] ?? 0;
  const promoteNowHit = metrics?.promoteNowHitRate ?? null;
  const researchNextHit = metrics?.researchNextHitRate ?? null;

  const out: PromotionVerdict[] = [];
  for (const c of candidates) {
    const tickerUpper = c.ticker.toUpperCase().trim();
    let eligibleForPromotion = false;
    let requiresHumanReview = false;
    let blockedByPolicy: string | null = null;

    if (c.bucket === "Avoid") {
      blockedByPolicy = "Avoid bucket";
    } else if (c.bucket === "PromoteNow") {
      if (
        promoteNowCount >= minSample &&
        promoteNowHit != null &&
        promoteNowHit < minPromoteHit
      ) {
        blockedByPolicy = `PromoteNow hit rate ${((promoteNowHit ?? 0) * 100).toFixed(0)}% below ${(minPromoteHit * 100).toFixed(0)}%`;
      } else {
        eligibleForPromotion = true;
        if (
          c.sleeve === "expansion" &&
          (researchNextCount < expansionReviewBelow ||
            promoteNowCount < expansionReviewBelow)
        ) {
          requiresHumanReview = true;
        }
      }
    } else {
      // ResearchNext: allow promotion only with human review when hit rate is decent
      if (
        researchNextCount >= minSample &&
        researchNextHit != null &&
        researchNextHit >= minPromoteHit
      ) {
        eligibleForPromotion = true;
        requiresHumanReview = true;
      } else if (sleeve.has(tickerUpper)) {
        requiresHumanReview = true;
      }
    }

    out.push({
      ticker: c.ticker,
      bucket: c.bucket,
      score: c.score,
      eligibleForPromotion,
      requiresHumanReview,
      blockedByPolicy,
    });
  }
  return out;
}
