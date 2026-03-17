/**
 * Static strategic layer assignments from TOP100.md essay (March 2026).
 * Layer 1–6 thematic positioning for display in table/drawer.
 */

export interface StrategicLayerEntry {
  layer: number;
  name: string;
}

const LAYERS: Array<{ layer: number; name: string; tickers: string[] }> = [
  { layer: 1, name: "Energy & Grid", tickers: ["CEG", "GEV", "EQT", "CCJ"] },
  {
    layer: 2,
    name: "Chips, Memory & Storage",
    tickers: ["NVDA", "MU", "SNDK", "TSM"],
  },
  {
    layer: 3,
    name: "Cloud & Infrastructure",
    tickers: ["NBIS", "MRVL", "SMCI", "COHR", "LITE", "VRT", "DELL"],
  },
  {
    layer: 4,
    name: "Platforms & Software",
    tickers: ["PLTR", "APP", "DDOG", "WDAY", "TEAM"],
  },
  {
    layer: 5,
    name: "Frontier Tech",
    tickers: ["TSLA", "ONDS", "ASTS", "RKLB", "IONQ", "OKLO"],
  },
  {
    layer: 6,
    name: "Adjacent Sectors",
    tickers: ["COIN", "HOOD", "HIMS", "RTX", "GE", "BSX", "EXAS"],
  },
];

const ENTRIES = new Map<string, StrategicLayerEntry>();
for (const { layer, name, tickers } of LAYERS) {
  for (const t of tickers) {
    ENTRIES.set(t, { layer, name });
  }
}

export const STRATEGIC_LAYER_SEED = ENTRIES;

export function getStrategicLayer(
  ticker: string,
): StrategicLayerEntry | undefined {
  return STRATEGIC_LAYER_SEED.get(ticker.toUpperCase());
}
