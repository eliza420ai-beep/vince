import type { Top100StockRow } from "./top100Stocks";

export type ConvictionTier = "S" | "A" | "B" | "C" | "D";

function normalizeFlags(flags?: string[]): string[] {
  if (!Array.isArray(flags)) return [];
  return flags.map((f) => f.toLowerCase().trim()).filter(Boolean);
}

function convictionFromComposite(composite?: number): ConvictionTier | null {
  if (typeof composite !== "number" || !Number.isFinite(composite)) return null;
  if (composite >= 80) return "S";
  if (composite >= 72) return "A";
  if (composite >= 64) return "B";
  if (composite >= 56) return "C";
  return "D";
}

function pickWhyNow(row: Top100StockRow): string {
  const flags = normalizeFlags(row.flags);
  if (flags.includes("high_momentum")) return "Momentum + narrative tailwind";
  if (flags.includes("earnings_soon"))
    return "Catalyst window (earnings/guide)";
  if (flags.includes("new_product_cycle")) return "Product cycle inflection";
  if (flags.includes("capex_cycle")) return "Capex cycle is accelerating";

  switch (row.category) {
    case "AI Semiconductors":
      return "Inference demand + supply chain tightness";
    case "AI Cloud & Compute":
      return "GPU scarcity + cloud spend rotation";
    case "AI Platforms & Infrastructure":
      return "Infra consolidation + platform take-rates";
    case "Defense & Aerospace":
      return "Defense budgets repricing upward";
    case "Energy, Power & Utilities":
      return "Grid buildout + power scarcity";
    case "Industrial & Automation":
      return "Automation spend + reshoring cycle";
    case "Healthcare & Biotech":
      return "Pipeline value + approval cadence";
    case "Enterprise Software":
      return "AI attach rates + margin expansion";
    case "Consumer & Digital Commerce":
      return "Distribution + monetization flywheel";
    default:
      return "Category tailwinds";
  }
}

function pickKeyStrength(row: Top100StockRow): string {
  const tier = convictionFromComposite(row.composite);
  const base =
    tier === "S" || tier === "A"
      ? "Clear edge vs peers"
      : tier === "B"
        ? "Strong setup, needs confirmation"
        : "Watchlist setup";

  if (row.category === "AI Semiconductors")
    return `${base} · picks-and-shovels`;
  if (row.category === "AI Cloud & Compute")
    return `${base} · capacity + distribution`;
  if (row.category === "Defense & Aerospace")
    return `${base} · multi-year demand`;
  if (row.category === "Energy, Power & Utilities")
    return `${base} · scarcity + regulated rails`;
  return base;
}

function pickRiskSummary(row: Top100StockRow): string {
  const flags = normalizeFlags(row.flags);
  const risks: string[] = [];
  if (flags.includes("insider_selling")) risks.push("insider selling");
  if (flags.includes("valuation_rich")) risks.push("valuation rich");
  if (flags.includes("guidance_risk")) risks.push("guidance risk");
  if (flags.includes("china_exposure")) risks.push("geopolitics");
  if (flags.includes("crowded")) risks.push("crowded positioning");

  if (!risks.length) {
    switch (row.category) {
      case "AI Semiconductors":
        return "Cyclical demand, inventory, multiple compression";
      case "AI Cloud & Compute":
        return "Capex digestion + pricing pressure";
      case "Defense & Aerospace":
        return "Program delays + contract timing";
      case "Energy, Power & Utilities":
        return "Rate sensitivity + regulatory lag";
      default:
        return "Execution + multiple risk";
    }
  }
  return risks.slice(0, 3).join(" · ");
}

export function computeVinceContext(row: Top100StockRow): {
  convictionTier?: ConvictionTier;
  whyNow?: string;
  keyStrength?: string;
  riskSummary?: string;
  theme?: string;
} {
  const convictionTier = convictionFromComposite(row.composite) ?? undefined;
  return {
    convictionTier,
    whyNow: pickWhyNow(row),
    keyStrength: pickKeyStrength(row),
    riskSummary: pickRiskSummary(row),
    theme: row.category,
  };
}
