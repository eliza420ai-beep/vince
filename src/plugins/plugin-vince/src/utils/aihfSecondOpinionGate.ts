export type VinceDirection = "long" | "short" | "neutral";

export type AihfBucketDirection = "bullish" | "bearish";

export interface AihfSecondOpinionPayload {
  agree_buckets?: Partial<Record<AihfBucketDirection, unknown>>;
  disagree_buckets?: Partial<Record<AihfBucketDirection, unknown>>;
  [key: string]: unknown;
}

export interface AihfSecondOpinionGateDecision {
  apply: boolean;
  /**
   * When AIHF contradicts VINCE, cap confidence to this value.
   * Undefined means "no confidence cap".
   */
  confidenceCap?: number;
  /**
   * When AIHF agrees with VINCE, multiply strength by this value.
   * Undefined means "no strength multiplier".
   */
  strengthMultiplier?: number;
  factorText: string | null;
}

const AIHF_CONFIDENCE_CAP = 50;
const DEFAULT_AGREEMENT_RATE_APPROX = 0.78; // heuristic: Phase D payload does not expose per-asset counts

function normalizeTicker(ticker: string): string {
  return ticker.toUpperCase().trim();
}

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : null))
    .filter((x): x is string => x !== null)
    .map(normalizeTicker)
    .filter(Boolean);
}

function assetInBucket(
  payload: AihfSecondOpinionPayload | null | undefined,
  bucketGroup: "agree_buckets" | "disagree_buckets",
  bucketDirection: AihfBucketDirection,
  asset: string,
): boolean {
  if (!payload) return false;
  const group = payload[bucketGroup];
  const rawBucket = (
    group as Partial<Record<AihfBucketDirection, unknown>> | undefined
  )?.[bucketDirection];
  const list = readStringArray(rawBucket);
  return list.includes(normalizeTicker(asset));
}

function aihfAgreementRateApprox(
  payload: AihfSecondOpinionPayload,
  asset: string,
): number {
  // Phase D "agree/disagree buckets" encode committee-side mapping, but do not expose exact 0-1 agreement per asset.
  // We approximate agreement using membership in the "agree" buckets.
  const inAnyAgree =
    assetInBucket(payload, "agree_buckets", "bullish", asset) ||
    assetInBucket(payload, "agree_buckets", "bearish", asset);
  return inAnyAgree ? DEFAULT_AGREEMENT_RATE_APPROX : 0.5;
}

export function getAihfSecondOpinionGateDecision(
  payload: AihfSecondOpinionPayload | null | undefined,
  asset: string,
  vinceDirection: VinceDirection,
): AihfSecondOpinionGateDecision {
  const dir: VinceDirection = vinceDirection ?? "neutral";
  if (dir === "neutral") return { apply: false, factorText: null };

  // Phase D mapping:
  // - agree_buckets.bullish + VINCE long => AIHF agrees
  // - disagree_buckets.bearish + VINCE long => AIHF contradicts
  // (and symmetric for VINCE short)
  if (dir === "long") {
    if (assetInBucket(payload, "disagree_buckets", "bearish", asset)) {
      return {
        apply: true,
        confidenceCap: AIHF_CONFIDENCE_CAP,
        factorText: `AIHF second-opinion disagreement: bearish vs VINCE long`,
      };
    }
    if (assetInBucket(payload, "agree_buckets", "bullish", asset)) {
      const agreementRate = payload
        ? aihfAgreementRateApprox(payload, asset)
        : 0.5;
      const strengthMultiplier = 1 + agreementRate * 0.5;
      return {
        apply: true,
        strengthMultiplier,
        factorText: `AIHF second-opinion agreement: bullish vs VINCE long`,
      };
    }
    return { apply: false, factorText: null };
  }

  // dir === "short"
  if (assetInBucket(payload, "disagree_buckets", "bullish", asset)) {
    return {
      apply: true,
      confidenceCap: AIHF_CONFIDENCE_CAP,
      factorText: `AIHF second-opinion disagreement: bullish vs VINCE short`,
    };
  }
  if (assetInBucket(payload, "agree_buckets", "bearish", asset)) {
    const agreementRate = payload
      ? aihfAgreementRateApprox(payload, asset)
      : 0.5;
    const strengthMultiplier = 1 + agreementRate * 0.5;
    return {
      apply: true,
      strengthMultiplier,
      factorText: `AIHF second-opinion agreement: bearish vs VINCE short`,
    };
  }

  return { apply: false, factorText: null };
}
