import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import {
  buildRegimeBundleV1,
  computeUniverseHash,
  resolveRegimeBundleOutPath,
  writeRegimeBundleV1ToFile,
  registerRegimeBundleV1Task,
} from "../tasks/regimeBundleV1.tasks";
import { ingestRegimeBundleV1File } from "../utils/regimeBundleV1IngestShim";

describe("regimeBundleV1", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "regime-bundle-v1-"));
    delete process.env.DEXTER_ARTIFACT_ROOT;
    delete process.env.REGIME_BUNDLE_OUT_PATH;
    delete process.env.VINCE_REGIME_BUNDLE_V1_ENABLED;
    delete process.env.VINCE_REGIME_BUNDLE_V1_HOUR_UTC;
    delete process.env.VINCE_REGIME_BUNDLE_V1_MAX_ASSETS;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("buildRegimeBundleV1 derives funding stress + OI bucket + regime label", () => {
    const generatedAtMs = 1_700_000_000_000;
    const universe = {
      hyperliquid: ["NVDA"],
      tastytrade: [],
      watchlist: [],
      coreCrypto: ["BTC", "SOL", "HYPE"],
    };

    const bundle = buildRegimeBundleV1({
      generatedAtMs,
      universe,
      universeAssetsBySleeve: { hyperliquid: ["NVDA"] },
      signalsByAsset: {
        NVDA: {
          direction: "long",
          strength: 55,
          confidence: 60,
          factors: [
            "FUNDING/OI DIVERGENCE COMBO: mean reversion setup",
            "OI cap on Hyperliquid - max crowding",
          ],
        },
      },
    });

    expect(bundle.version).toBe("regime_bundle_v1");
    expect(bundle.generated_at_ms).toBe(generatedAtMs);
    expect(bundle.assets.NVDA.funding_stress).toBe(true);
    expect(bundle.assets.NVDA.oi_change_bucket).toBe("high_crowding");
    expect(bundle.assets.NVDA.regime_label).toBe("bullish_funding_stress");
    expect(bundle.universe_hash).toMatch(/^[a-f0-9]{64}$/);

    const expectedHash = computeUniverseHash(universe);
    expect(bundle.universe_hash).toBe(expectedHash);
  });

  it("resolveRegimeBundleOutPath defaults under DEXTER_ARTIFACT_ROOT/.dexter/", () => {
    process.env.DEXTER_ARTIFACT_ROOT = tmpDir;
    const outPath = resolveRegimeBundleOutPath();
    expect(outPath).toBe(path.join(tmpDir, ".dexter", "regime_bundle_v1.json"));
  });

  it("writeRegimeBundleV1ToFile writes parseable JSON", () => {
    process.env.DEXTER_ARTIFACT_ROOT = tmpDir;
    const outPath = path.join(tmpDir, ".dexter", "regime_bundle_v1.json");

    const bundle = buildRegimeBundleV1({
      generatedAtMs: Date.now(),
      universe: {
        hyperliquid: ["NVDA"],
        tastytrade: [],
        watchlist: [],
        coreCrypto: ["BTC", "SOL", "HYPE"],
      },
      universeAssetsBySleeve: { hyperliquid: ["NVDA"] },
      signalsByAsset: {},
    });

    writeRegimeBundleV1ToFile(bundle, outPath);
    const raw = fs.readFileSync(outPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe("regime_bundle_v1");
    expect(parsed.assets.NVDA).toBeTruthy();
  });

  it("registerRegimeBundleV1Task emits regime_bundle_v1.json", async () => {
    // Create minimal Dexter artifact files
    fs.writeFileSync(
      path.join(tmpDir, "portfolio_hyperliquid.json"),
      JSON.stringify({
        sleeve: "hyperliquid",
        assets: [{ symbol: "NVDA", target_weight_pct: 10 }],
      }),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(tmpDir, "portfolio_tastytrade.json"),
      JSON.stringify({ sleeve: "tastytrade", assets: [] }),
      "utf-8",
    );
    fs.writeFileSync(
      path.join(tmpDir, "portfolio_watchlist.json"),
      JSON.stringify({ sleeve: "watchlist", assets: [] }),
      "utf-8",
    );

    process.env.DEXTER_ARTIFACT_ROOT = tmpDir;
    process.env.VINCE_REGIME_BUNDLE_V1_ENABLED = "true";
    process.env.VINCE_REGIME_BUNDLE_V1_MAX_ASSETS = "3";
    process.env.VINCE_REGIME_BUNDLE_V1_HOUR_UTC = String(
      new Date().getUTCHours(),
    );

    let registeredWorker: any;

    const signalAgg = {
      getSignal: async (asset: string) => {
        if (asset.toUpperCase().trim() !== "NVDA") {
          return {
            direction: "neutral",
            strength: 0,
            confidence: 0,
            factors: [],
          };
        }
        return {
          direction: "long",
          strength: 55,
          confidence: 60,
          factors: [
            "FUNDING/OI DIVERGENCE COMBO: mean reversion setup",
            "OI cap on Hyperliquid - max crowding",
          ],
        };
      },
    };

    const runtime = {
      agentId: uuidv4(),
      getService: (name: string) => {
        if (name === "VINCE_SIGNAL_AGGREGATOR_SERVICE") return signalAgg;
        return null;
      },
      registerTaskWorker: (worker: any) => {
        registeredWorker = worker;
      },
      createTask: vi.fn(),
    } as any;

    await registerRegimeBundleV1Task(runtime);
    expect(registeredWorker).toBeTruthy();

    await registeredWorker.execute(runtime);

    const outPath = path.join(tmpDir, ".dexter", "regime_bundle_v1.json");
    const parsed = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(parsed.version).toBe("regime_bundle_v1");
    expect(parsed.assets.NVDA.oi_change_bucket).toBe("high_crowding");

    const ingest = ingestRegimeBundleV1File(outPath);
    expect(ingest.ok).toBe(true);
    expect(ingest.summary?.overall_direction).toBe("long");
  });
});
