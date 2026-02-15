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
import { getStandupTrackedAssets, getStandupHumanName } from "./standup.constants";

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
  const assets = getStandupTrackedAssets();
  return assets.map((asset) => validateSignals(signals, asset));
}

/** Sentiment keywords and emoji in order of strength (later = overrides earlier in same segment) */
const SENTIMENT_PATTERN = /(bullish|bearish|neutral|🟢|🔴|🟡)/gi;

/** Parsed structured block from agent reply (signals array and/or Solus call). */
export interface ParsedStructuredBlock {
  signals?: Array<{ asset?: string; direction?: string; confidence_pct?: number }>;
  call?: {
    asset?: string;
    direction?: string;
    strike?: number;
    confidence_pct?: number;
    expiry?: string;
    invalidation?: number;
  };
}

/** Extract fenced JSON block from text. Returns null if not found or invalid. */
export function parseStructuredBlockFromText(text: string): ParsedStructuredBlock | null {
  if (!text || typeof text !== "string") return null;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim()) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    const out: ParsedStructuredBlock = {};
    if (Array.isArray(parsed.signals)) {
      out.signals = parsed.signals.filter(
        (s): s is { asset?: string; direction?: string; confidence_pct?: number } =>
          s != null && typeof s === "object",
      );
    }
    if (parsed.call != null && typeof parsed.call === "object") {
      const c = parsed.call as Record<string, unknown>;
      out.call = {
        asset: typeof c.asset === "string" ? c.asset : undefined,
        direction: typeof c.direction === "string" ? c.direction : undefined,
        strike: typeof c.strike === "number" ? c.strike : undefined,
        confidence_pct: typeof c.confidence_pct === "number" ? c.confidence_pct : undefined,
        expiry: typeof c.expiry === "string" ? c.expiry : undefined,
        invalidation: typeof c.invalidation === "number" ? c.invalidation : undefined,
      };
    }
    return out.signals?.length || out.call ? out : null;
  } catch {
    return null;
  }
}

/** Map confidence_pct to ConfidenceLevel. */
function confidencePctToLevel(pct: number | undefined): ConfidenceLevel {
  if (pct == null || isNaN(pct)) return "medium";
  if (pct >= 70) return "high";
  if (pct >= 40) return "medium";
  return "low";
}

/** Extract AgentSignal[] from a parsed structured block (signals array or call). */
export function extractSignalsFromStructured(
  agentName: string,
  parsed: ParsedStructuredBlock,
): AgentSignal[] {
  const result: AgentSignal[] = [];
  if (parsed.signals?.length) {
    for (const s of parsed.signals) {
      const asset = (s.asset ?? "").trim().toUpperCase();
      if (!asset) continue;
      let direction: SignalDirection = "neutral";
      const d = (s.direction ?? "").toLowerCase();
      if (d === "bullish") direction = "bullish";
      else if (d === "bearish") direction = "bearish";
      result.push({
        agent: agentName,
        asset,
        direction,
        confidence: confidencePctToLevel(s.confidence_pct),
        reasoning: `structured (${s.confidence_pct ?? "—"}%)`,
        source: "structured",
      });
    }
  }
  if (parsed.call?.asset) {
    const c = parsed.call;
    const direction: SignalDirection = (c.direction ?? "").toLowerCase() === "above" ? "bullish" : (c.direction ?? "").toLowerCase() === "below" ? "bearish" : "neutral";
    result.push({
      agent: agentName,
      asset: c.asset.trim().toUpperCase(),
      direction,
      confidence: confidencePctToLevel(c.confidence_pct),
      reasoning: `call strike ${c.strike ?? "—"} (${c.confidence_pct ?? "—"}%)`,
      source: "structured",
    });
  }
  return result;
}

/** Get the segment of transcript for a given agent (text after "AgentName:" until next agent or end). */
function getAgentSegmentFromTranscript(transcript: string, agentName: string): string {
  const escaped = agentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z][a-zA-Z]+\\s*:|$)`, "i");
  const m = transcript.match(re);
  return (m?.[1] ?? transcript).trim();
}

/**
 * Extract signals from agent reports.
 * Tries structured JSON block first (from template); falls back to regex scan.
 */
export function extractSignalsFromReport(agentName: string, report: string): AgentSignal[] {
  const segment = getAgentSegmentFromTranscript(report, agentName);
  const parsed = parseStructuredBlockFromText(segment);
  if (parsed) {
    const structuredSignals = extractSignalsFromStructured(agentName, parsed);
    if (structuredSignals.length > 0) return structuredSignals;
  }

  const signals: AgentSignal[] = [];
  const assets = getStandupTrackedAssets();

  for (const asset of assets) {
    const assetRegex = new RegExp(`${asset}[\\s\\S]{0,200}`, "i");
    const segmentMatch = segment.match(assetRegex);
    if (!segmentMatch) continue;

    const seg = segmentMatch[0];
    const allMatches = [...seg.matchAll(SENTIMENT_PATTERN)];
    if (allMatches.length === 0) continue;

    const lastIndicator = allMatches[allMatches.length - 1][1].toLowerCase();
    let direction: SignalDirection = "neutral";
    if (lastIndicator === "bullish" || lastIndicator === "🟢") {
      direction = "bullish";
    } else if (lastIndicator === "bearish" || lastIndicator === "🔴") {
      direction = "bearish";
    }

    signals.push({
      agent: agentName,
      asset,
      direction,
      confidence: "medium",
      reasoning: seg.slice(0, 120),
      source: "report",
    });
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
    context += `\n*Divergent signals should be flagged for ${getStandupHumanName()} review.*\n`;
  }

  if (aligned.length > 0) {
    context += `\n### ✅ High Confidence (Aligned)\n`;
    for (const a of aligned) {
      context += `- **${a.asset}**: ${a.recommendation}\n`;
    }
  }

  return context;
}
