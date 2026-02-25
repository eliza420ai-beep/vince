/**
 * VINCE Cross-Asset Contagion Model (#66)
 *
 * Models correlation risk between open positions.
 * Detects concentrated correlated exposure and reduces new position sizes.
 */

// ==========================================
// Types
// ==========================================

export interface ContagionGroup {
  id: string;
  label: string;
  assets: string[]; // e.g. ["BTC", "ETH", "SOL"] = "crypto-large-cap"
  correlationCoefficient: number; // 0–1, higher = more correlated
}

export interface ContagionAssessment {
  totalExposureUsd: number;
  contagionRisk: "low" | "medium" | "high" | "critical";
  // <10%=low, <25%=medium, <50%=high, >=50%=critical
  dominantGroup: string;
  sizeMultiplier: number; // 1.0=none, 0.75=medium, 0.5=high, 0.25=critical
  reason: string;
}

// ==========================================
// Hardcoded contagion groups
// ==========================================

const CONTAGION_GROUPS: ContagionGroup[] = [
  {
    id: "crypto-large-cap",
    label: "Crypto Large Cap",
    assets: ["BTC", "ETH", "SOL", "HYPE"],
    correlationCoefficient: 0.85,
  },
  {
    id: "crypto-defi",
    label: "DeFi Tokens",
    assets: ["UNI", "AAVE", "MKR", "CRV"],
    correlationCoefficient: 0.8,
  },
  {
    id: "us-tech",
    label: "US Tech",
    assets: ["NVDA", "AMD", "MSFT", "AAPL", "GOOGL"],
    correlationCoefficient: 0.7,
  },
  {
    id: "ai-infra",
    label: "AI Infrastructure",
    assets: ["NVDA", "AMD", "SMCI"],
    correlationCoefficient: 0.75,
  },
];

// ==========================================
// Service
// ==========================================

export class VinceContagionService {
  private readonly groups: ContagionGroup[];

  constructor(groups?: ContagionGroup[]) {
    this.groups = groups ?? CONTAGION_GROUPS;
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Assess contagion risk for the current open positions.
   * Finds the dominant correlated group and returns a risk level + size multiplier.
   */
  assessContagion(
    openPositions: { asset: string; sizeUsd: number }[],
    totalCapitalUsd: number,
  ): ContagionAssessment {
    if (totalCapitalUsd <= 0 || openPositions.length === 0) {
      return {
        totalExposureUsd: 0,
        contagionRisk: "low",
        dominantGroup: "none",
        sizeMultiplier: 1.0,
        reason: "No open positions — no contagion risk",
      };
    }

    // Calculate exposure per group
    let dominantGroupId = "none";
    let dominantExposureUsd = 0;

    for (const group of this.groups) {
      const groupExposure = this.getGroupExposure(group.id, openPositions);
      if (groupExposure > dominantExposureUsd) {
        dominantExposureUsd = groupExposure;
        dominantGroupId = group.id;
      }
    }

    const dominantGroup =
      this.groups.find((g) => g.id === dominantGroupId) ?? null;
    const dominantLabel = dominantGroup?.label ?? "none";
    const dominantPct =
      totalCapitalUsd > 0
        ? (dominantExposureUsd / totalCapitalUsd) * 100
        : 0;

    let contagionRisk: ContagionAssessment["contagionRisk"];
    let sizeMultiplier: number;

    if (dominantPct >= 50) {
      contagionRisk = "critical";
      sizeMultiplier = 0.25;
    } else if (dominantPct >= 25) {
      contagionRisk = "high";
      sizeMultiplier = 0.5;
    } else if (dominantPct >= 10) {
      contagionRisk = "medium";
      sizeMultiplier = 0.75;
    } else {
      contagionRisk = "low";
      sizeMultiplier = 1.0;
    }

    const reason =
      dominantGroupId === "none"
        ? "No correlated group exposure detected"
        : `${dominantLabel} group: ${dominantPct.toFixed(1)}% of capital ($${dominantExposureUsd.toFixed(0)}) → ${contagionRisk} risk`;

    return {
      totalExposureUsd: dominantExposureUsd,
      contagionRisk,
      dominantGroup: dominantGroupId,
      sizeMultiplier,
      reason,
    };
  }

  /**
   * Returns the contagion group that contains this asset, or null.
   * When an asset appears in multiple groups, returns the first match.
   */
  getGroupForAsset(asset: string): ContagionGroup | null {
    const upper = asset.toUpperCase();
    return (
      this.groups.find((g) =>
        g.assets.map((a) => a.toUpperCase()).includes(upper),
      ) ?? null
    );
  }

  /**
   * Returns total exposure (sum of sizeUsd) for all assets in a given group.
   */
  getGroupExposure(
    groupId: string,
    openPositions: { asset: string; sizeUsd: number }[],
  ): number {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return 0;

    const groupAssets = new Set(group.assets.map((a) => a.toUpperCase()));
    return openPositions
      .filter((p) => groupAssets.has(p.asset.toUpperCase()))
      .reduce((sum, p) => sum + p.sizeUsd, 0);
  }

  getGroups(): ContagionGroup[] {
    return [...this.groups];
  }
}
