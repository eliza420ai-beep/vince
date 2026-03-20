/**
 * Dexter portfolio loader and drift action tests.
 *
 * - loadDexterPortfolios: reads portfolio_*.json, returns sleeve tickers + coreCrypto
 * - getDexterUniverseSet / isInDexterUniverse: membership for paper bot / aggregator
 * - getDexterDriftSummary: one-line for standup
 * - VINCE_DEXTER_DRIFT action: validate triggers, handler returns expected shape
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  loadDexterPortfolios,
  loadDexterPortfolioAssets,
  getFdSleeveTickers,
  getDexterUniverseSet,
  isInDexterUniverse,
  getDexterDriftSummary,
  resolveDexterArtifactRoot,
  type DexterPortfolios,
} from "../utils/dexterPortfolio";
import { loadDexterScorecard } from "../utils/dexterScorecard";
import { vinceDexterDriftAction } from "../actions/dexterDrift.action";

describe("dexterPortfolio", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dexter-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  describe("loadDexterPortfolios", () => {
    it("returns coreCrypto BTC, SOL, HYPE when no files exist", () => {
      const p = loadDexterPortfolios(tmpDir);
      expect(p.coreCrypto).toEqual(["BTC", "SOL", "HYPE"]);
      expect(p.hyperliquid).toEqual([]);
      expect(p.tastytrade).toEqual([]);
      expect(p.watchlist).toEqual([]);
    });

    it("reads portfolio_hyperliquid.json and returns symbols", () => {
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_hyperliquid.json"),
        JSON.stringify({
          sleeve: "hyperliquid",
          assets: [
            { symbol: "NVDA", target_weight_pct: 16 },
            { symbol: "TSM", target_weight_pct: 12 },
          ],
        }),
      );
      const p = loadDexterPortfolios(tmpDir);
      expect(p.hyperliquid).toEqual(["NVDA", "TSM"]);
      expect(p.coreCrypto).toEqual(["BTC", "SOL", "HYPE"]);
    });

    it("reads all three files and merges", () => {
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_hyperliquid.json"),
        JSON.stringify({
          sleeve: "hl",
          assets: [{ symbol: "NVDA", target_weight_pct: 10 }],
        }),
      );
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_tastytrade.json"),
        JSON.stringify({
          sleeve: "tt",
          assets: [{ symbol: "AMAT", target_weight_pct: 5 }],
        }),
      );
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_watchlist.json"),
        JSON.stringify({
          sleeve: "wl",
          assets: [{ symbol: "PANW", target_weight_pct: 5 }],
        }),
      );
      const p = loadDexterPortfolios(tmpDir);
      expect(p.hyperliquid).toEqual(["NVDA"]);
      expect(p.tastytrade).toEqual(["AMAT"]);
      expect(p.watchlist).toEqual(["PANW"]);
      expect(p.coreCrypto).toEqual(["BTC", "SOL", "HYPE"]);
    });
  });

  describe("loadDexterPortfolioAssets / getFdSleeveTickers", () => {
    it("returns rich assets with ticker, sleeve, targetWeightPct", () => {
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_tastytrade.json"),
        JSON.stringify({
          sleeve: "tastytrade",
          params_profile: "default",
          assets: [
            { symbol: "NVDA", target_weight_pct: 10 },
            { symbol: " amat ", target_weight_pct: 5 },
          ],
        }),
      );
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_watchlist.json"),
        JSON.stringify({
          sleeve: "watchlist",
          assets: [{ symbol: "PANW", target_weight_pct: 5 }],
        }),
      );
      const assets = loadDexterPortfolioAssets(tmpDir);
      expect(assets.length).toBeGreaterThanOrEqual(3);
      const tt = assets.filter((a) => a.sleeve === "tastytrade");
      expect(tt.map((a) => a.ticker)).toContain("NVDA");
      expect(tt.map((a) => a.ticker)).toContain("AMAT");
      expect(tt.some((a) => a.paramsProfile === "default")).toBe(true);
      const fdTickers = getFdSleeveTickers(tmpDir);
      expect(fdTickers).toContain("NVDA");
      expect(fdTickers).toContain("AMAT");
      expect(fdTickers).toContain("PANW");
      expect(fdTickers).not.toContain("BTC");
    });

    it("getFdSleeveTickers returns only tastytrade and watchlist tickers", () => {
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_hyperliquid.json"),
        JSON.stringify({
          sleeve: "hyperliquid",
          assets: [{ symbol: "NVDA", target_weight_pct: 10 }],
        }),
      );
      const fdTickers = getFdSleeveTickers(tmpDir);
      expect(fdTickers).toEqual([]);
    });
  });

  describe("getDexterUniverseSet / isInDexterUniverse", () => {
    it("includes coreCrypto when sleeves are empty", () => {
      const set = getDexterUniverseSet(loadDexterPortfolios(tmpDir));
      expect(set.has("BTC")).toBe(true);
      expect(set.has("SOL")).toBe(true);
      expect(set.has("HYPE")).toBe(true);
      expect(set.has("NVDA")).toBe(false);
    });

    it("includes sleeve symbols when loaded", () => {
      fs.writeFileSync(
        path.join(tmpDir, "portfolio_hyperliquid.json"),
        JSON.stringify({
          sleeve: "hl",
          assets: [{ symbol: "NVDA", target_weight_pct: 10 }],
        }),
      );
      const p = loadDexterPortfolios(tmpDir);
      expect(isInDexterUniverse("NVDA", p)).toBe(true);
      expect(isInDexterUniverse("nvda", p)).toBe(true);
      expect(isInDexterUniverse("TLT", p)).toBe(false);
    });
  });

  describe("getDexterDriftSummary", () => {
    it("formats one-line summary for standup", () => {
      const p: DexterPortfolios = {
        hyperliquid: ["NVDA"],
        tastytrade: ["AMAT"],
        watchlist: ["PANW", "CRWD"],
        coreCrypto: ["BTC", "SOL", "HYPE"],
      };
      const summary = getDexterDriftSummary(p, ["BTC", "NVDA"]);
      expect(summary).toContain("2 paper open");
      expect(summary).toContain("2 in Dexter universe");
      expect(summary).toContain("watchlist names with no paper");
    });

    it("handles no open positions", () => {
      const p = loadDexterPortfolios(tmpDir);
      const summary = getDexterDriftSummary(p, []);
      expect(summary).toContain("0 paper open");
      expect(summary).toContain("0 in Dexter universe");
    });
  });

  describe("resolveDexterArtifactRoot", () => {
    it("uses DEXTER_ARTIFACT_ROOT when set", () => {
      const prev = process.env.DEXTER_ARTIFACT_ROOT;
      try {
        process.env.DEXTER_ARTIFACT_ROOT = tmpDir;
        expect(resolveDexterArtifactRoot()).toBe(path.resolve(tmpDir));
      } finally {
        if (prev === undefined) delete process.env.DEXTER_ARTIFACT_ROOT;
        else process.env.DEXTER_ARTIFACT_ROOT = prev;
      }
    });
  });

  describe("loadDexterScorecard paths", () => {
    it("reads .dexter/scorecard.json when present", () => {
      const dexDir = path.join(tmpDir, ".dexter");
      fs.mkdirSync(dexDir, { recursive: true });
      fs.writeFileSync(
        path.join(dexDir, "scorecard.json"),
        JSON.stringify({
          generatedAt: "2020-01-01T00:00:00.000Z",
          tickers: [{ symbol: "NVDA", composite: 0.9 }],
        }),
      );
      const idx = loadDexterScorecard(tmpDir);
      expect(idx).not.toBeNull();
      expect(idx!.bySymbol.get("NVDA")?.composite).toBe(0.9);
    });

    it("falls back to scorecard.json at root", () => {
      fs.writeFileSync(
        path.join(tmpDir, "scorecard.json"),
        JSON.stringify({
          tickers: [{ symbol: "AMAT", composite: 0.5 }],
        }),
      );
      const idx = loadDexterScorecard(tmpDir);
      expect(idx).not.toBeNull();
      expect(idx!.bySymbol.get("AMAT")?.composite).toBe(0.5);
    });
  });
});

describe("VINCE_DEXTER_DRIFT action", () => {
  it("validate returns true for drift triggers", async () => {
    const runtime = {} as any;
    const message = (text: string) => ({ content: { text } }) as any;
    expect(
      await vinceDexterDriftAction.validate!(runtime, message("drift")),
    ).toBe(true);
    expect(
      await vinceDexterDriftAction.validate!(runtime, message("dexter drift")),
    ).toBe(true);
    expect(
      await vinceDexterDriftAction.validate!(
        runtime,
        message("portfolio drift"),
      ),
    ).toBe(true);
    expect(
      await vinceDexterDriftAction.validate!(runtime, message("dexter report")),
    ).toBe(true);
  });

  it("validate returns false for unrelated message", async () => {
    const runtime = {} as any;
    const message = { content: { text: "what is the weather" } } as any;
    expect(await vinceDexterDriftAction.validate!(runtime, message)).toBe(
      false,
    );
  });

  it("handler returns text containing Dexter drift and actions", async () => {
    const runtime = {} as any;
    let captured: { text?: string; actions?: string[] } = {};
    const callback = async (content: { text?: string; actions?: string[] }) => {
      captured = content;
    };
    await vinceDexterDriftAction.handler!(
      runtime,
      {} as any,
      {} as any,
      undefined,
      callback,
    );
    expect(captured.text).toBeDefined();
    expect(String(captured.text)).toContain("Dexter drift");
    expect(captured.actions).toEqual(["VINCE_DEXTER_DRIFT"]);
  });
});
