/**
 * VincePositionGuardrails Service (#61)
 *
 * Enforces hard position sizing limits regardless of signal strength.
 * Final gate before size is committed.
 *
 * Guardrails only REDUCE size — never increase.
 *
 * Config env vars (with defaults):
 *   GUARDRAIL_MAX_POSITION_PCT    — max % of bucket capital in single position (default: 10)
 *   GUARDRAIL_MAX_CORRELATED_PCT  — max % in correlated assets (default: 25)
 *   GUARDRAIL_MIN_SIZE_USD        — below this = block (default: 10)
 *   GUARDRAIL_MAX_SIZE_USD        — hard cap regardless of bucket config (default: 500)
 */

import type { BucketId } from "./vinceCapitalBuckets.service";
import { VinceCapitalBucketsService } from "./vinceCapitalBuckets.service";

// ==========================================
// Correlated asset groups
// BTC and ETH are treated as correlated for exposure limits
// ==========================================

const CORRELATED_GROUPS: string[][] = [["BTC", "ETH"]];

function getCorrelatedGroup(asset: string): string[] {
  const upper = asset.toUpperCase();
  for (const group of CORRELATED_GROUPS) {
    if (group.includes(upper)) return group;
  }
  return [];
}

// ==========================================
// Types
// ==========================================

export interface GuardrailResult {
  originalSizeUsd: number;
  approvedSizeUsd: number;
  reductionReason?: string;
  hardBlocked: boolean;
  blockReason?: string;
}

// ==========================================
// Service
// ==========================================

export class VincePositionGuardrailsService {
  private maxPositionPct: number;
  private maxCorrelatedPct: number;
  private minSizeUsd: number;
  private maxSizeUsd: number;
  private static _instance: VincePositionGuardrailsService | null = null;

  constructor() {
    this.maxPositionPct = Number(process.env.GUARDRAIL_MAX_POSITION_PCT ?? 10);
    this.maxCorrelatedPct = Number(
      process.env.GUARDRAIL_MAX_CORRELATED_PCT ?? 25,
    );
    this.minSizeUsd = Number(process.env.GUARDRAIL_MIN_SIZE_USD ?? 10);
    this.maxSizeUsd = Number(process.env.GUARDRAIL_MAX_SIZE_USD ?? 500);
  }

  // ==========================================
  // Singleton
  // ==========================================

  static getInstance(): VincePositionGuardrailsService {
    if (!VincePositionGuardrailsService._instance) {
      VincePositionGuardrailsService._instance =
        new VincePositionGuardrailsService();
    }
    return VincePositionGuardrailsService._instance;
  }

  static setInstance(instance: VincePositionGuardrailsService): void {
    VincePositionGuardrailsService._instance = instance;
  }

  // ==========================================
  // Core
  // ==========================================

  applyGuardrails(params: {
    requestedSizeUsd: number;
    bucketId: BucketId;
    asset: string;
    openPositions?: { asset: string; sizeUsd: number }[];
  }): GuardrailResult {
    const { requestedSizeUsd, bucketId, asset, openPositions = [] } = params;

    // Hard block: below minimum
    if (requestedSizeUsd < this.minSizeUsd) {
      return {
        originalSizeUsd: requestedSizeUsd,
        approvedSizeUsd: 0,
        hardBlocked: true,
        blockReason: `size-below-minimum (${requestedSizeUsd} < ${this.minSizeUsd})`,
      };
    }

    // Hard block: above maximum
    if (requestedSizeUsd > this.maxSizeUsd) {
      return {
        originalSizeUsd: requestedSizeUsd,
        approvedSizeUsd: 0,
        hardBlocked: true,
        blockReason: `size-exceeds-hard-cap (${requestedSizeUsd} > ${this.maxSizeUsd})`,
      };
    }

    let approvedSize = requestedSizeUsd;
    const reductions: string[] = [];

    // Get bucket capital for percentage-based limits
    let bucketCapital = 0;
    try {
      const bucketsService = VinceCapitalBucketsService.getInstance();
      const bucket = bucketsService.getBucket(bucketId);
      bucketCapital = bucket.allocatedUsd;
    } catch {
      // If bucket service not available, skip percentage-based limits
    }

    // Reduce if exceeds max position % of bucket
    if (bucketCapital > 0) {
      const maxByPct = (bucketCapital * this.maxPositionPct) / 100;
      if (approvedSize > maxByPct) {
        approvedSize = maxByPct;
        reductions.push(
          `max-position-pct (${this.maxPositionPct}% of $${bucketCapital})`,
        );
      }
    }

    // Reduce if correlated exposure would exceed MAX_CORRELATED_PCT
    if (bucketCapital > 0 && openPositions.length > 0) {
      const correlatedExposure = this.getCorrelatedExposure(
        asset,
        openPositions,
      );
      const maxCorrelated = (bucketCapital * this.maxCorrelatedPct) / 100;
      const remainingCorrelatedRoom = maxCorrelated - correlatedExposure;

      if (remainingCorrelatedRoom <= 0) {
        return {
          originalSizeUsd: requestedSizeUsd,
          approvedSizeUsd: 0,
          hardBlocked: true,
          blockReason: `correlated-exposure-full (${this.maxCorrelatedPct}% limit reached)`,
        };
      }

      if (approvedSize > remainingCorrelatedRoom) {
        approvedSize = remainingCorrelatedRoom;
        reductions.push(
          `max-correlated-pct (${this.maxCorrelatedPct}% of $${bucketCapital})`,
        );
      }
    }

    // Guardrails only reduce — enforce this invariant
    approvedSize = Math.min(approvedSize, requestedSizeUsd);

    return {
      originalSizeUsd: requestedSizeUsd,
      approvedSizeUsd: approvedSize,
      reductionReason:
        reductions.length > 0 ? reductions.join("; ") : undefined,
      hardBlocked: false,
    };
  }

  getCorrelatedExposure(
    asset: string,
    openPositions: { asset: string; sizeUsd: number }[],
  ): number {
    const group = getCorrelatedGroup(asset);
    if (group.length === 0) return 0;
    return openPositions
      .filter((p) => group.includes(p.asset.toUpperCase()))
      .reduce((sum, p) => sum + p.sizeUsd, 0);
  }
}
