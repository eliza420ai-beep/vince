/**
 * Improvement report → aggregator weights: unit tests.
 * Verifies feature→source mapping and that weights utility runs without throwing.
 */
import { describe, it, expect } from "vitest";
import * as path from "path";
import * as fs from "fs";
import {
  sourceImportancesFromReport,
  logAndApplyImprovementReportWeights,
  type ImprovementReport,
} from "../utils/improvementReportWeights";

describe("improvementReportWeights", () => {
  describe("sourceImportancesFromReport", () => {
    it("returns empty Map when report has no feature_importances", () => {
      expect(sourceImportancesFromReport({})).toEqual(new Map());
      expect(
        sourceImportancesFromReport({
          feature_importances: {},
        } as ImprovementReport)
      ).toEqual(new Map());
      expect(
        sourceImportancesFromReport({
          feature_importances: { signal_quality: {} },
        } as ImprovementReport)
      ).toEqual(new Map());
    });

    it("maps known feature names to aggregator sources and sums per source", () => {
      const report: ImprovementReport = {
        feature_importances: {
          signal_quality: {
            feature_importances: {
              regime_bullish: 0.1,
              regime_bearish: 0.15,
              signal_hasWhaleSignal: 0.08,
              signal_avg_sentiment: 0.05,
              market_longShortRatio: 0.06,
              session_isOpenWindow: 0.02, // _session is skipped
            },
          },
        },
      };
      const out = sourceImportancesFromReport(report);
      expect(out.get("MarketRegime")).toBe(0.1 + 0.15);
      expect(out.get("BinanceTopTraders")).toBe(0.08);
      expect(out.get("NewsSentiment")).toBe(0.05);
      expect(out.get("CoinGlass")).toBe(0.06);
      expect(out.has("_session")).toBe(false);
    });

    it("uses real training_metadata.json when present", () => {
      const modelsDir = path.resolve(__dirname, "../../models");
      const metaPath = path.join(modelsDir, "training_metadata.json");
      if (!fs.existsSync(metaPath)) {
        return; // skip when not in plugin tree
      }
      const raw = fs.readFileSync(metaPath, "utf-8");
      const meta = JSON.parse(raw) as { improvement_report?: ImprovementReport };
      const report = meta.improvement_report ?? null;
      if (!report) return;

      const bySource = sourceImportancesFromReport(report);
      expect(bySource.size).toBeGreaterThan(0);
      const sources = [...bySource.keys()];
      expect(sources).toContain("MarketRegime");
      expect(sources.some((s) => s === "NewsSentiment" || s === "BinanceTopTraders" || s === "CoinGlass")).toBe(true);
      for (const [, v] of bySource) {
        expect(typeof v).toBe("number");
        expect(v).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("logAndApplyImprovementReportWeights", () => {
    it("runs without throwing (dry-run, applyWeights=false)", async () => {
      await expect(logAndApplyImprovementReportWeights(false)).resolves.toBeUndefined();
    });
  });
});
