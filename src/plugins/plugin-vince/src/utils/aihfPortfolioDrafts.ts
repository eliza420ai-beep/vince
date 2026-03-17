import * as fs from "node:fs";
import * as path from "node:path";

export type AihfDraftId =
  | "aihf_top100"
  | "aihf_tastytrade_full"
  | "aihf_hyperliquid_full";

export interface AihfPortfolioDraftAsset {
  symbol: string;
  targetWeightPct: number;
}

export interface AihfPortfolioDraftRaw {
  sleeve?: string;
  params_profile?: string;
  assets?: Array<{ symbol?: string; target_weight_pct?: number }>;
  margin_requirement?: number;
  portfolio_positions?: unknown[];
  graph_nodes?: unknown[];
  graph_edges?: unknown[];
  model_name?: string;
  model_provider?: string;
}

export interface AihfPortfolioDraft {
  id: AihfDraftId;
  label: string;
  sleeve: string | null;
  paramsProfile: string | null;
  modelName: string | null;
  modelProvider: string | null;
  marginRequirement: number | null;
  assets: AihfPortfolioDraftAsset[];
  bySymbol: Map<string, AihfPortfolioDraftAsset>;
  sourcePath: string;
}

export interface AihfPortfolioDraftLoadResult {
  drafts: AihfPortfolioDraft[];
  errors: Array<{ id: AihfDraftId; path: string; error: string }>;
}

function normalizeSymbol(sym: string): string {
  return sym.toUpperCase().trim();
}

function safeNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function readJson(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as unknown;
}

function loadOneDraft(params: {
  projectRoot: string;
  id: AihfDraftId;
  label: string;
  filename: string;
}): AihfPortfolioDraft {
  const filePath = path.join(path.resolve(params.projectRoot), params.filename);
  const parsed = readJson(filePath) as AihfPortfolioDraftRaw;
  const assetsRaw = Array.isArray(parsed.assets) ? parsed.assets : [];
  const assets: AihfPortfolioDraftAsset[] = assetsRaw
    .filter((a) => a && typeof a.symbol === "string" && a.symbol.trim() !== "")
    .map((a) => ({
      symbol: normalizeSymbol(a.symbol as string),
      targetWeightPct: safeNumber(a.target_weight_pct) ?? 0,
    }))
    .filter((a) => a.targetWeightPct > 0);

  const bySymbol = new Map<string, AihfPortfolioDraftAsset>();
  for (const a of assets) bySymbol.set(a.symbol, a);

  return {
    id: params.id,
    label: params.label,
    sleeve: typeof parsed.sleeve === "string" ? parsed.sleeve : null,
    paramsProfile:
      typeof parsed.params_profile === "string" ? parsed.params_profile : null,
    modelName: typeof parsed.model_name === "string" ? parsed.model_name : null,
    modelProvider:
      typeof parsed.model_provider === "string" ? parsed.model_provider : null,
    marginRequirement: safeNumber(parsed.margin_requirement),
    assets,
    bySymbol,
    sourcePath: filePath,
  };
}

export function loadAihfPortfolioDrafts(
  projectRoot: string = process.cwd(),
): AihfPortfolioDraftLoadResult {
  const configs: Array<{
    id: AihfDraftId;
    label: string;
    filename: string;
  }> = [
    {
      id: "aihf_top100",
      label: "AIHF Top100 Draft",
      filename: "portfolio_draft_top100.json",
    },
    {
      id: "aihf_tastytrade_full",
      label: "AIHF Tastytrade Draft",
      filename: "portfolio_draft_tastytrade_full.json",
    },
    {
      id: "aihf_hyperliquid_full",
      label: "AIHF Hyperliquid Draft",
      filename: "portfolio_draft_hyperliquid_full.json",
    },
  ];

  const drafts: AihfPortfolioDraft[] = [];
  const errors: Array<{ id: AihfDraftId; path: string; error: string }> = [];

  for (const c of configs) {
    const filePath = path.join(path.resolve(projectRoot), c.filename);
    if (!fs.existsSync(filePath)) continue;
    try {
      drafts.push(
        loadOneDraft({
          projectRoot,
          id: c.id,
          label: c.label,
          filename: c.filename,
        }),
      );
    } catch (e) {
      errors.push({
        id: c.id,
        path: filePath,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { drafts, errors };
}
