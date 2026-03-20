import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import {
  loadDexterPortfolioAssets,
  loadDexterPortfolios,
  resolveDexterArtifactRoot,
} from "../utils/dexterPortfolio";

export type Direction = "long" | "short" | "neutral";

export interface SignalLike {
  direction?: Direction;
  strength?: number;
  confidence?: number;
  factors?: string[];
}

export interface RegimeAssetFlags {
  direction: Direction;
  strength: number | null;
  confidence: number | null;
  funding_stress: boolean;
  oi_change_bucket: string;
  regime_label: string;
  factors: string[];
}

export interface RegimeSleeveFlags {
  assets: string[];
  aggregate_direction: Direction;
  funding_stress: boolean;
  regime_label: string;
}

export interface RegimeBundleV1 {
  version: "regime_bundle_v1";
  generated_at: string;
  generated_at_ms: number;
  universe_hash: string;
  universe: {
    hyperliquid: string[];
    tastytrade: string[];
    watchlist: string[];
    coreCrypto: string[];
  };
  assets: Record<string, RegimeAssetFlags>;
  sleeves: Record<string, RegimeSleeveFlags>;
  summary: {
    overall_direction: Direction;
    alerts: string[];
  };
}

export const DEFAULT_BUNDLE_FILE = "regime_bundle_v1.json";
export const DEFAULT_BUNDLE_RELATIVE_OUT_PATH = path.join(
  ".dexter",
  DEFAULT_BUNDLE_FILE,
);

export function resolveRegimeBundleOutPath(): string {
  const envOut = process.env.REGIME_BUNDLE_OUT_PATH?.trim();
  const root = resolveDexterArtifactRoot();
  if (!envOut) {
    return path.join(root, DEFAULT_BUNDLE_RELATIVE_OUT_PATH);
  }
  return path.isAbsolute(envOut) ? envOut : path.join(root, envOut);
}

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function computeUniverseHash(
  universe: RegimeBundleV1["universe"],
): string {
  const stable = JSON.stringify(
    {
      hyperliquid: [...universe.hyperliquid].sort(),
      tastytrade: [...universe.tastytrade].sort(),
      watchlist: [...universe.watchlist].sort(),
      coreCrypto: [...universe.coreCrypto].sort(),
    },
    null,
  );
  return sha256Hex(stable);
}

function deriveFundingStress(factors: string[]): boolean {
  const lower = factors.map((f) => f.toLowerCase());
  return lower.some(
    (f) =>
      f.includes("funding") ||
      f.includes("squeeze") ||
      f.includes("capitulation") ||
      f.includes("mean-reversion"),
  );
}

function deriveOiChangeBucket(factors: string[]): string {
  const lower = factors.map((f) => f.toLowerCase());
  if (lower.some((f) => f.includes("oi cap"))) return "high_crowding";
  if (
    lower.some((f) => f.includes("oi flush")) ||
    lower.some((f) => f.includes("flush"))
  )
    return "flush";
  if (lower.some((f) => f.includes("oi"))) return "unspecified";
  return "none";
}

function deriveRegimeLabel(
  direction: Direction,
  fundingStress: boolean,
): string {
  if (direction === "long") {
    return fundingStress ? "bullish_funding_stress" : "bullish";
  }
  if (direction === "short") {
    return fundingStress ? "bearish_funding_stress" : "bearish";
  }
  return "neutral";
}

function deriveOverallDirection(assets: RegimeBundleV1["assets"]): Direction {
  const dirs = Object.values(assets).map((a) => a.direction);
  const longCount = dirs.filter((d) => d === "long").length;
  const shortCount = dirs.filter((d) => d === "short").length;
  if (longCount > shortCount) return "long";
  if (shortCount > longCount) return "short";
  return "neutral";
}

function classifyAlerts(bundle: RegimeBundleV1): string[] {
  const alerts: string[] = [];
  for (const [symbol, asset] of Object.entries(bundle.assets)) {
    if (asset.funding_stress && asset.direction !== "neutral") {
      alerts.push(`${symbol}: funding stress (${asset.direction})`);
    }
    if (asset.oi_change_bucket === "high_crowding") {
      alerts.push(`${symbol}: OI cap / high crowding`);
    }
  }
  // Cap for payload sanity; keep order deterministic.
  return [...alerts].slice(0, 25);
}

export function buildRegimeBundleV1(params: {
  generatedAtMs: number;
  universe: RegimeBundleV1["universe"];
  universeAssetsBySleeve?: Record<string, string[]>;
  signalsByAsset?: Record<string, SignalLike>;
}): RegimeBundleV1 {
  const {
    generatedAtMs,
    universe,
    universeAssetsBySleeve = {},
    signalsByAsset = {},
  } = params;

  const universeHash = computeUniverseHash(universe);
  const generatedAt = new Date(generatedAtMs).toISOString();

  const allAssets = [
    ...universe.hyperliquid,
    ...universe.tastytrade,
    ...universe.watchlist,
    ...universe.coreCrypto,
  ]
    .map((s) => s.toUpperCase().trim())
    .filter(Boolean);

  const uniqueAssets = [...new Set(allAssets)].sort();

  const assets: RegimeBundleV1["assets"] = {};
  for (const symbol of uniqueAssets) {
    const signal = signalsByAsset[symbol] ?? {};
    const factors = Array.isArray(signal.factors) ? signal.factors : [];
    const direction: Direction = signal.direction ?? "neutral";
    const strength = Number.isFinite(signal.strength as number)
      ? (signal.strength as number)
      : null;
    const confidence = Number.isFinite(signal.confidence as number)
      ? (signal.confidence as number)
      : null;

    const fundingStress = deriveFundingStress(factors);
    const oiChangeBucket = deriveOiChangeBucket(factors);
    const regimeLabel = deriveRegimeLabel(direction, fundingStress);

    assets[symbol] = {
      direction,
      strength,
      confidence,
      funding_stress: fundingStress,
      oi_change_bucket: oiChangeBucket,
      regime_label: regimeLabel,
      factors,
    };
  }

  const sleeves: RegimeBundleV1["sleeves"] = {};
  const sleeveNames = new Set<string>([
    ...Object.keys(universeAssetsBySleeve ?? {}),
    "hyperliquid",
    "tastytrade",
    "watchlist",
  ]);

  for (const sleeve of sleeveNames) {
    const sleeveAssets = (universeAssetsBySleeve[sleeve] ?? []).map((s) =>
      s.toUpperCase().trim(),
    );
    if (sleeveAssets.length === 0) continue;

    const signals = sleeveAssets.map((s) => assets[s]).filter(Boolean);
    const longCount = signals.filter((a) => a.direction === "long").length;
    const shortCount = signals.filter((a) => a.direction === "short").length;

    const aggregate_direction: Direction =
      longCount > shortCount
        ? "long"
        : shortCount > longCount
          ? "short"
          : "neutral";
    const funding_stress = signals.some((a) => a.funding_stress);
    const aggregate_label = deriveRegimeLabel(
      aggregate_direction,
      funding_stress,
    );

    sleeves[sleeve] = {
      assets: [...new Set(sleeveAssets)].sort(),
      aggregate_direction,
      funding_stress,
      regime_label: aggregate_label,
    };
  }

  const overall_direction = deriveOverallDirection(assets);
  const summaryBase = {
    overall_direction,
    alerts: [] as string[],
  };

  const bundle: RegimeBundleV1 = {
    version: "regime_bundle_v1",
    generated_at: generatedAt,
    generated_at_ms: generatedAtMs,
    universe_hash: universeHash,
    universe: {
      hyperliquid: [...universe.hyperliquid].map((s) => s.toUpperCase().trim()),
      tastytrade: [...universe.tastytrade].map((s) => s.toUpperCase().trim()),
      watchlist: [...universe.watchlist].map((s) => s.toUpperCase().trim()),
      coreCrypto: [...universe.coreCrypto].map((s) => s.toUpperCase().trim()),
    },
    assets,
    sleeves,
    summary: summaryBase,
  };

  bundle.summary.alerts = classifyAlerts(bundle);
  return bundle;
}

export function writeRegimeBundleV1ToFile(
  bundle: RegimeBundleV1,
  outPath: string,
): void {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), "utf-8");
}

function normalizeSleeveMapByLowerName(
  rows: ReturnType<typeof loadDexterPortfolioAssets>,
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const r of rows) {
    const sleeve = r.sleeve?.toLowerCase?.() ?? "unknown";
    map[sleeve] ??= [];
    map[sleeve].push(r.ticker.toUpperCase().trim());
  }
  for (const [k, arr] of Object.entries(map)) {
    map[k] = [...new Set(arr)].sort();
  }
  return map;
}

export function resolveUniverseFromDexter(): RegimeBundleV1["universe"] {
  const dexter = loadDexterPortfolios();
  return {
    hyperliquid: dexter.hyperliquid,
    tastytrade: dexter.tastytrade,
    watchlist: dexter.watchlist,
    coreCrypto: dexter.coreCrypto,
  };
}

export async function runRegimeBundleV1Emission(
  runtime: IAgentRuntime,
): Promise<{ outPath: string; bundle: RegimeBundleV1 }> {
  const enabled = process.env.VINCE_REGIME_BUNDLE_V1_ENABLED !== "false";
  if (!enabled) {
    const outPath = resolveRegimeBundleOutPath();
    throw new Error(
      `[RegimeBundleV1] Disabled: VINCE_REGIME_BUNDLE_V1_ENABLED=false (${outPath})`,
    );
  }

  const generatedAtMs = Date.now();
  const maxAssets = parseInt(
    process.env.VINCE_REGIME_BUNDLE_V1_MAX_ASSETS ?? "50",
    10,
  );

  const universe = resolveUniverseFromDexter();
  const universeAssetsRows = loadDexterPortfolioAssets();
  const universeAssetsBySleeve =
    normalizeSleeveMapByLowerName(universeAssetsRows);

  const allAssets = [
    ...universe.hyperliquid,
    ...universe.tastytrade,
    ...universe.watchlist,
    ...universe.coreCrypto,
  ]
    .map((s) => s.toUpperCase().trim())
    .filter(Boolean);

  const uniqueAssets = [...new Set(allAssets)].sort();
  const limitedAssets = uniqueAssets.slice(
    0,
    Number.isFinite(maxAssets) ? maxAssets : 50,
  );

  const signalAgg = runtime.getService("VINCE_SIGNAL_AGGREGATOR_SERVICE") as {
    getSignal?: (asset: string) => Promise<SignalLike & { factors?: string[] }>;
    getAllSignals?: () => Promise<Array<{ asset: string } & SignalLike>>;
  } | null;

  const signalsByAsset: Record<string, SignalLike> = {};

  if (signalAgg?.getAllSignals) {
    const signals = await signalAgg.getAllSignals();
    for (const s of signals) {
      const sym = s.asset?.toUpperCase?.().trim?.();
      if (!sym) continue;
      if (!limitedAssets.includes(sym)) continue;
      signalsByAsset[sym] = {
        direction: s.direction,
        strength: s.strength,
        confidence: s.confidence,
        factors: (s.factors as string[]) ?? [],
      };
    }
  } else if (signalAgg?.getSignal) {
    for (const sym of limitedAssets) {
      try {
        const s = await signalAgg.getSignal(sym);
        signalsByAsset[sym] = {
          direction: s?.direction ?? "neutral",
          strength: s?.strength,
          confidence: s?.confidence,
          factors: s?.factors ?? [],
        };
      } catch (e) {
        logger.debug(
          `[RegimeBundleV1] getSignal failed for ${sym}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
        signalsByAsset[sym] = { direction: "neutral", factors: [] };
      }
    }
  } else {
    logger.warn(
      "[RegimeBundleV1] VINCE_SIGNAL_AGGREGATOR_SERVICE missing getSignal/getAllSignals; emitting bundle with neutral assets",
    );
  }

  const bundle = buildRegimeBundleV1({
    generatedAtMs,
    universe,
    universeAssetsBySleeve,
    signalsByAsset,
  });

  const outPath = resolveRegimeBundleOutPath();
  writeRegimeBundleV1ToFile(bundle, outPath);
  return { outPath, bundle };
}

const DEFAULT_BUNDLE_HOUR_UTC = 9;
const TASK_INTERVAL_MS = 60 * 60 * 1000; // hourly check

export async function registerRegimeBundleV1Task(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.VINCE_REGIME_BUNDLE_V1_ENABLED !== "false";
  if (!enabled) return;

  const bundleHour =
    parseInt(
      process.env.VINCE_REGIME_BUNDLE_V1_HOUR_UTC ??
        String(DEFAULT_BUNDLE_HOUR_UTC),
      10,
    ) || DEFAULT_BUNDLE_HOUR_UTC;

  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "VINCE_REGIME_BUNDLE_V1",
    validate: async () => true,
    execute: async (rt) => {
      const now = new Date();
      const hourUtc = now.getUTCHours();
      if (hourUtc !== bundleHour) {
        logger.debug(
          `[RegimeBundleV1] Skipping: current hour ${hourUtc} UTC, target ${bundleHour}`,
        );
        return;
      }

      try {
        const { outPath } = await runRegimeBundleV1Emission(rt);
        logger.info(`[RegimeBundleV1] Emitted bundle: ${outPath}`);
      } catch (e) {
        logger.error(
          `[RegimeBundleV1] Emission failed: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    },
  });

  await runtime.createTask({
    name: "VINCE_REGIME_BUNDLE_V1",
    description:
      "Writes regime_bundle_v1.json to Dexter artifact root for weekly/thesis review",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "regime-bundle-v1", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: TASK_INTERVAL_MS,
    },
  });

  logger.info(
    `[RegimeBundleV1] Task registered (emits at ${bundleHour}:00 UTC)`,
  );
}
