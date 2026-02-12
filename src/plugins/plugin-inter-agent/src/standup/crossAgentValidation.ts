/**
 * Cross-Agent Validation
 *
 * Detects when agents agree or disagree, which is valuable signal:
 * - Agreement (VINCE + ECHO bullish) = higher confidence
 * - Disagreement (VINCE bullish, ECHO bearish) = flag for review
 *
 * This adds intelligence to the standup synthesis.
 */

import { logger } from "@elizaos/core";

/** Signal direction */
export type SignalDirection = "bullish" | "bearish" | "neutral";

/** Confidence level */
export type ConfidenceLevel = "high" | "medium" | "low";

/** Agent signal */
export interface AgentSignal {
  agent: string;
  asset: string;
  direction: SignalDirection;
  confidence: ConfidenceLevel;
  reasoning: string;
  source: string;
}

/** Validation result */
export interface ValidationResult {
  asset: string;
  signals: AgentSignal[];
  consensus: SignalDirection | "divergent";
  confidence: ConfidenceLevel;
  divergence?: {
    bullish: string[];
    bearish: string[];
    neutral: string[];
  };
  recommendation: string;
}

/**
 * Validate signals across agents for an asset
 */
export function validateSignals(signals: AgentSignal[], asset: string): ValidationResult {
  const assetSignals = signals.filter((s) => s.asset.toUpperCase() === asset.toUpperCase());

  if (assetSignals.length === 0) {
    return {
      asset,
      signals: [],
      consensus: "neutral",
      confidence: "low",
      recommendation: `No signals for ${asset}`,
    };
  }

  // Group by direction
  const bullish = assetSignals.filter((s) => s.direction === "bullish");
  const bearish = assetSignals.filter((s) => s.direction === "bearish");
  const neutral = assetSignals.filter((s) => s.direction === "neutral");

  // Determine consensus
  let consensus: SignalDirection | "divergent";
  let confidence: ConfidenceLevel;
  let recommendation: string;

  if (bullish.length > 0 && bearish.length > 0) {
    // Divergence detected
    consensus = "divergent";
    confidence = "low";
    recommendation = `⚠️ DIVERGENCE: ${bullish.map((s) => s.agent).join(", ")} bullish vs ${bearish.map((s) => s.agent).join(", ")} bearish. Flag for review.`;
    
    logger.warn(`[CrossValidation] ${asset}: Divergence detected - ${bullish.length} bullish, ${bearish.length} bearish`);
  } else if (bullish.length >= 2) {
    // Strong bullish consensus
    consensus = "bullish";
    confidence = "high";
    recommendation = `✅ ALIGNED BULLISH: ${bullish.map((s) => s.agent).join(" + ")} agree. High confidence.`;
  } else if (bearish.length >= 2) {
    // Strong bearish consensus
    consensus = "bearish";
    confidence = "high";
    recommendation = `✅ ALIGNED BEARISH: ${bearish.map((s) => s.agent).join(" + ")} agree. High confidence.`;
  } else if (bullish.length === 1 && neutral.length > 0) {
    consensus = "bullish";
    confidence = "medium";
    recommendation = `${bullish[0].agent} bullish, others neutral. Medium confidence.`;
  } else if (bearish.length === 1 && neutral.length > 0) {
    consensus = "bearish";
    confidence = "medium";
    recommendation = `${bearish[0].agent} bearish, others neutral. Medium confidence.`;
  } else if (bullish.length === 1) {
    consensus = "bullish";
    confidence = "medium";
    recommendation = `Only ${bullish[0].agent} has signal. Medium confidence.`;
  } else if (bearish.length === 1) {
    consensus = "bearish";
    confidence = "medium";
    recommendation = `Only ${bearish[0].agent} has signal. Medium confidence.`;
  } else {
    consensus = "neutral";
    confidence = "low";
    recommendation = `All neutral. No clear direction.`;
  }

  return {
    asset,
    signals: assetSignals,
    consensus,
    confidence,
    divergence: bullish.length > 0 && bearish.length > 0 ? {
      bullish: bullish.map((s) => s.agent),
      bearish: bearish.map((s) => s.agent),
      neutral: neutral.map((s) => s.agent),
    } : undefined,
    recommendation,
  };
}

/**
 * Validate all core assets
 */
export function validateAllAssets(signals: AgentSignal[]): ValidationResult[] {
  const assets = ["BTC", "SOL", "HYPE"];
  return assets.map((asset) => validateSignals(signals, asset));
}

/**
 * Extract signals from agent reports
 */
export function extractSignalsFromReport(agentName: string, report: string): AgentSignal[] {
  const signals: AgentSignal[] = [];
  const assets = ["BTC", "SOL", "HYPE"];

  for (const asset of assets) {
    // Look for signal indicators in the report
    const assetRegex = new RegExp(`${asset}[\\s\\S]{0,100}(bullish|bearish|neutral|🟢|🔴|🟡)`, "i");
    const match = report.match(assetRegex);

    if (match) {
      let direction: SignalDirection = "neutral";
      const indicator = match[1].toLowerCase();

      if (indicator === "bullish" || indicator === "🟢") {
        direction = "bullish";
      } else if (indicator === "bearish" || indicator === "🔴") {
        direction = "bearish";
      }

      signals.push({
        agent: agentName,
        asset,
        direction,
        confidence: "medium", // Default, could be parsed from report
        reasoning: match[0].slice(0, 100),
        source: "report",
      });
    }
  }

  return signals;
}

/**
 * Format validation results as markdown
 */
export function formatValidationResults(results: ValidationResult[]): string {
  const lines: string[] = ["## 🔍 Cross-Agent Validation\n"];

  for (const result of results) {
    const emoji = result.consensus === "bullish" ? "🟢" :
      result.consensus === "bearish" ? "🔴" :
        result.consensus === "divergent" ? "⚠️" : "🟡";

    lines.push(`### ${result.asset} ${emoji}`);
    lines.push(`- **Consensus**: ${result.consensus.toUpperCase()}`);
    lines.push(`- **Confidence**: ${result.confidence}`);

    if (result.divergence) {
      lines.push(`- **Divergence detected**:`);
      if (result.divergence.bullish.length > 0) {
        lines.push(`  - Bullish: ${result.divergence.bullish.join(", ")}`);
      }
      if (result.divergence.bearish.length > 0) {
        lines.push(`  - Bearish: ${result.divergence.bearish.join(", ")}`);
      }
    }

    lines.push(`- ${result.recommendation}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get confidence adjustment based on validation
 */
export function getConfidenceAdjustment(results: ValidationResult[]): {
  asset: string;
  originalConfidence: ConfidenceLevel;
  adjustedConfidence: ConfidenceLevel;
  reason: string;
}[] {
  return results
    .filter((r) => r.consensus === "divergent")
    .map((r) => ({
      asset: r.asset,
      originalConfidence: "high" as ConfidenceLevel,
      adjustedConfidence: "low" as ConfidenceLevel,
      reason: "Cross-agent divergence detected",
    }));
}

/**
 * Build validation context for day report
 */
export function buildValidationContext(signals: AgentSignal[]): string {
  const results = validateAllAssets(signals);
  const divergent = results.filter((r) => r.consensus === "divergent");
  const aligned = results.filter((r) => r.consensus !== "divergent" && r.confidence === "high");

  let context = "";

  if (divergent.length > 0) {
    context += `\n### ⚠️ Divergences Detected\n`;
    for (const d of divergent) {
      context += `- **${d.asset}**: ${d.recommendation}\n`;
    }
    context += `\n*Divergent signals should be flagged for Yves review.*\n`;
  }

  if (aligned.length > 0) {
    context += `\n### ✅ High Confidence (Aligned)\n`;
    for (const a of aligned) {
      context += `- **${a.asset}**: ${a.recommendation}\n`;
    }
  }

  return context;
}
