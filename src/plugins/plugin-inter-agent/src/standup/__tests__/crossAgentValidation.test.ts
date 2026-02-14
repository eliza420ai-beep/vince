/**
 * Tests for cross-agent validation (validateSignals, validateAllAssets, extractSignalsFromReport, formatValidationResults, buildValidationContext).
 */

import { describe, it, expect } from "bun:test";
import {
  validateSignals,
  validateAllAssets,
  extractSignalsFromReport,
  formatValidationResults,
  getConfidenceAdjustment,
  buildValidationContext,
  type AgentSignal,
  type ValidationResult,
} from "../crossAgentValidation";

describe("crossAgentValidation", () => {
  describe("validateSignals", () => {
    it("returns neutral when no signals for asset", () => {
      const result = validateSignals([], "BTC");
      expect(result.asset).toBe("BTC");
      expect(result.consensus).toBe("neutral");
      expect(result.confidence).toBe("low");
      expect(result.signals).toEqual([]);
    });

    it("detects divergence when bullish and bearish both present", () => {
      const signals: AgentSignal[] = [
        { agent: "VINCE", asset: "BTC", direction: "bullish", confidence: "high", reasoning: "", source: "" },
        { agent: "ECHO", asset: "BTC", direction: "bearish", confidence: "medium", reasoning: "", source: "" },
      ];
      const result = validateSignals(signals, "BTC");
      expect(result.consensus).toBe("divergent");
      expect(result.confidence).toBe("low");
      expect(result.divergence).toBeDefined();
      expect(result.divergence?.bullish).toContain("VINCE");
      expect(result.divergence?.bearish).toContain("ECHO");
    });

    it("high confidence when two or more agree bullish", () => {
      const signals: AgentSignal[] = [
        { agent: "VINCE", asset: "SOL", direction: "bullish", confidence: "high", reasoning: "", source: "" },
        { agent: "ECHO", asset: "SOL", direction: "bullish", confidence: "medium", reasoning: "", source: "" },
      ];
      const result = validateSignals(signals, "SOL");
      expect(result.consensus).toBe("bullish");
      expect(result.confidence).toBe("high");
    });

    it("high confidence when two or more agree bearish", () => {
      const signals: AgentSignal[] = [
        { agent: "VINCE", asset: "HYPE", direction: "bearish", confidence: "high", reasoning: "", source: "" },
        { agent: "Oracle", asset: "HYPE", direction: "bearish", confidence: "medium", reasoning: "", source: "" },
      ];
      const result = validateSignals(signals, "HYPE");
      expect(result.consensus).toBe("bearish");
      expect(result.confidence).toBe("high");
    });

    it("filters by asset (case-insensitive)", () => {
      const signals: AgentSignal[] = [
        { agent: "VINCE", asset: "btc", direction: "bullish", confidence: "high", reasoning: "", source: "" },
      ];
      const result = validateSignals(signals, "BTC");
      expect(result.signals).toHaveLength(1);
      expect(result.consensus).toBe("bullish");
    });
  });

  describe("validateAllAssets", () => {
    it("returns one result per core asset (BTC, SOL, HYPE)", () => {
      const signals: AgentSignal[] = [];
      const results = validateAllAssets(signals);
      expect(results).toHaveLength(3);
      expect(results.map((r) => r.asset)).toEqual(["BTC", "SOL", "HYPE"]);
    });
  });

  describe("extractSignalsFromReport", () => {
    it("extracts bullish signal from report text", () => {
      const report = "BTC looks bullish going into the weekend.";
      const signals = extractSignalsFromReport("VINCE", report);
      expect(signals.length).toBeGreaterThanOrEqual(1);
      const btcSignal = signals.find((s) => s.asset === "BTC");
      expect(btcSignal?.direction).toBe("bullish");
      expect(btcSignal?.agent).toBe("VINCE");
    });

    it("extracts bearish signal", () => {
      const report = "SOL sentiment is bearish.";
      const signals = extractSignalsFromReport("ECHO", report);
      const solSignal = signals.find((s) => s.asset === "SOL");
      expect(solSignal?.direction).toBe("bearish");
    });

    it("returns empty when no signal keywords", () => {
      const report = "No clear direction for any asset.";
      const signals = extractSignalsFromReport("VINCE", report);
      expect(signals).toEqual([]);
    });
  });

  describe("formatValidationResults", () => {
    it("returns markdown with section header and per-asset blocks", () => {
      const results: ValidationResult[] = [
        {
          asset: "BTC",
          signals: [],
          consensus: "bullish",
          confidence: "high",
          recommendation: "Aligned bullish.",
        },
      ];
      const md = formatValidationResults(results);
      expect(md).toContain("## 🔍 Cross-Agent Validation");
      expect(md).toContain("### BTC");
      expect(md).toContain("BULLISH");
      expect(md).toContain("high");
    });
  });

  describe("getConfidenceAdjustment", () => {
    it("returns adjustments only for divergent results", () => {
      const results: ValidationResult[] = [
        { asset: "BTC", signals: [], consensus: "divergent", confidence: "low", recommendation: "" },
        { asset: "SOL", signals: [], consensus: "bullish", confidence: "high", recommendation: "" },
      ];
      const adjustments = getConfidenceAdjustment(results);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].asset).toBe("BTC");
      expect(adjustments[0].adjustedConfidence).toBe("low");
    });
  });

  describe("buildValidationContext", () => {
    it("includes divergence section when divergent signals exist", () => {
      const signals: AgentSignal[] = [
        { agent: "VINCE", asset: "BTC", direction: "bullish", confidence: "high", reasoning: "", source: "" },
        { agent: "ECHO", asset: "BTC", direction: "bearish", confidence: "medium", reasoning: "", source: "" },
      ];
      const context = buildValidationContext(signals);
      expect(context).toContain("Divergences Detected");
      expect(context).toContain("livethelifetv review");
    });

    it("includes aligned section when high-confidence aligned", () => {
      const signals: AgentSignal[] = [
        { agent: "VINCE", asset: "SOL", direction: "bullish", confidence: "high", reasoning: "", source: "" },
        { agent: "ECHO", asset: "SOL", direction: "bullish", confidence: "high", reasoning: "", source: "" },
      ];
      const context = buildValidationContext(signals);
      expect(context).toContain("High Confidence");
      expect(context).toContain("Aligned");
    });
  });
});
