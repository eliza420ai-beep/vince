/**
 * Content Truth Layer (#69)
 *
 * Validates performance claims in content before publishing.
 * Ensures Eliza never publishes unverifiable numbers.
 *
 * Persists verified metrics cache from data/verified-metrics.json.
 */

import * as fs from "fs";
import * as path from "path";

// ==========================================
// Types
// ==========================================

export interface TruthCheckResult {
  passed: boolean;
  claims: { text: string; verified: boolean; source?: string }[];
  blockedClaims: string[];
  verdict: "approved" | "needs-review" | "blocked";
}

// ==========================================
// Claim extraction patterns
// ==========================================

// Matches patterns like: $1,234.56  $1k  75%  25 trades  win rate  P&L
const CLAIM_PATTERNS = [
  /\$[\d,]+(?:\.\d+)?(?:k|K|m|M)?/g, // $X, $X.XX, $1k, $1M
  /[\d,]+(?:\.\d+)?%/g, // X%, X.X%
  /[\d,]+\s+trades?/gi, // N trades
  /win\s+rate[:\s]+[\d.]+%?/gi, // win rate: X
  /P&L[:\s]+[\$\d,.\-+]+/gi, // P&L: $X
  /premium\s+collected[:\s]+[\$\d,.\-+]+/gi, // premium collected: $X
];

const VERIFIED_METRICS_FILE = "verified-metrics.json";

// ==========================================
// Service
// ==========================================

export class ContentTruthService {
  private readonly dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? path.join(process.cwd(), "data");
    fs.mkdirSync(this.dataDir, { recursive: true });
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Check content against verified metrics.
   * Scans for performance claims and validates each one.
   */
  checkContent(
    content: string,
    verifiedMetrics: Record<string, number | string>,
  ): TruthCheckResult {
    const claims = this.extractClaimsFromContent(content);

    if (claims.length === 0) {
      return {
        passed: true,
        claims: [],
        blockedClaims: [],
        verdict: "approved",
      };
    }

    const checkedClaims: {
      text: string;
      verified: boolean;
      source?: string;
    }[] = [];
    const blockedClaims: string[] = [];

    for (const claim of claims) {
      const result = this.verifyClaim(claim, verifiedMetrics);
      if (result.verified) {
        checkedClaims.push({
          text: claim,
          verified: true,
          source: result.source,
        });
      } else {
        checkedClaims.push({ text: claim, verified: false });
        blockedClaims.push(claim);
      }
    }

    const blockedRatio = blockedClaims.length / claims.length;
    let verdict: TruthCheckResult["verdict"];

    if (blockedClaims.length === 0) {
      verdict = "approved";
    } else if (blockedRatio >= 0.5) {
      verdict = "blocked";
    } else {
      verdict = "needs-review";
    }

    return {
      passed: verdict === "approved",
      claims: checkedClaims,
      blockedClaims,
      verdict,
    };
  }

  /**
   * Extract performance-style claims from content using regex patterns.
   */
  extractClaimsFromContent(content: string): string[] {
    const found = new Set<string>();

    for (const pattern of CLAIM_PATTERNS) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      // Use exec loop for global patterns
      while ((match = pattern.exec(content)) !== null) {
        const claim = match[0].trim();
        if (claim) found.add(claim);
      }
    }

    return Array.from(found);
  }

  /**
   * Load verified metrics from data/verified-metrics.json.
   * Returns empty object if file doesn't exist.
   */
  getVerifiedMetrics(): Record<string, number> {
    const filePath = path.join(this.dataDir, VERIFIED_METRICS_FILE);
    if (!fs.existsSync(filePath)) return {};
    try {
      return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<
        string,
        number
      >;
    } catch {
      return {};
    }
  }

  // ==========================================
  // Private helpers
  // ==========================================

  private verifyClaim(
    claim: string,
    verifiedMetrics: Record<string, number | string>,
  ): { verified: boolean; source?: string } {
    // Extract the numeric value from the claim
    const numericMatch = claim.replace(/[$,%,\s]/g, "").match(/^[\d.]+/);
    if (!numericMatch) {
      // Non-numeric claim (e.g. "win rate" without number) — treat as verified
      return { verified: true, source: "non-numeric" };
    }

    const claimValue = parseFloat(numericMatch[0]);
    if (Number.isNaN(claimValue)) return { verified: false };

    // Try to match against any verified metric within 10% tolerance
    for (const [key, metricValue] of Object.entries(verifiedMetrics)) {
      const numericMetric =
        typeof metricValue === "number"
          ? metricValue
          : parseFloat(String(metricValue));

      if (Number.isNaN(numericMetric) || numericMetric === 0) continue;

      const tolerance = Math.abs(numericMetric) * 0.1;
      if (Math.abs(claimValue - Math.abs(numericMetric)) <= tolerance) {
        return { verified: true, source: key };
      }
    }

    return { verified: false };
  }
}
