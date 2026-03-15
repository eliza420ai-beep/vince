/**
 * Research Autopilot — essay synthesis pack: one artifact aggregating all tickers for writing.
 */

import type { TickerDossier } from "./types";
import type { TickerXEnrichment } from "./types";

export interface SynthesisPack {
  executiveSummary: string;
  sectorClustering: string;
  highestConvictionNames: string[];
  consensusVsDisagreement: string;
  priceTargetDispersion: string;
  suggestedSubstackAngle: string;
  suggestedTitleOptions: string[];
  suggestedStructure: string;
  /** Per-ticker bullets for the essay writer. */
  tickerCards: Array<{
    symbol: string;
    dossierReason: string;
    narratives?: string[];
    priceTarget?: string;
    oneLiner: string;
  }>;
}

/**
 * Build synthesis markdown from dossiers and enrichments (no LLM; structured template).
 * Essay writer can use this as context. Optional title/angle can be filled by caller or left placeholder.
 */
export function buildSynthesisMarkdown(
  dossiers: TickerDossier[],
  enrichments: TickerXEnrichment[],
  options?: {
    executiveSummary?: string;
    suggestedAngle?: string;
    suggestedTitles?: string[];
  },
): string {
  const bySymbol = new Map(enrichments.map((e) => [e.symbol, e]));
  const lines: string[] = [];

  lines.push("# Research synthesis pack");
  lines.push("");
  lines.push(
    options?.executiveSummary ??
      `Universe: ${dossiers.length} names from Watchlist Radar (add_now / research_next / net_new).`,
  );
  lines.push("");

  lines.push("## Sector clustering");
  lines.push(
    "Group by sleeve and source: add_now (promote), research_next (research queue), net_new (expansion).",
  );
  const byBucket = new Map<string, string[]>();
  for (const d of dossiers) {
    const list = byBucket.get(d.sourceBucket) ?? [];
    list.push(d.symbol);
    byBucket.set(d.sourceBucket, list);
  }
  for (const [bucket, syms] of byBucket) {
    lines.push(`- **${bucket}**: ${syms.join(", ")}`);
  }
  lines.push("");

  lines.push("## Highest-conviction names");
  const top = dossiers.slice(0, Math.min(10, dossiers.length));
  lines.push(top.map((d) => d.symbol).join(", "));
  lines.push("");

  lines.push("## Consensus vs disagreement on X");
  const withSentiment = enrichments.filter(
    (e) => e.xSentimentLabel != null || (e.dominantNarratives?.length ?? 0) > 0,
  );
  if (withSentiment.length === 0) {
    lines.push("(X enrichment not yet populated for this run.)");
  } else {
    for (const e of withSentiment) {
      const pt = e.priceTargetBase != null ? ` PT ~${e.priceTargetBase}` : "";
      lines.push(`- **${e.symbol}**: ${e.xSentimentLabel ?? "—"}${pt}`);
      if (e.dominantNarratives?.length) {
        lines.push(`  - ${e.dominantNarratives.slice(0, 2).join("; ")}`);
      }
    }
  }
  lines.push("");

  lines.push("## Price-target dispersion");
  const withPt = enrichments.filter((e) => e.priceTargetBase != null);
  if (withPt.length === 0) {
    lines.push("(No price targets in enrichment for this run.)");
  } else {
    for (const e of withPt) {
      const range =
        e.priceTargetLow != null && e.priceTargetHigh != null
          ? ` (range ${e.priceTargetLow}–${e.priceTargetHigh})`
          : "";
      lines.push(`- **${e.symbol}**: ${e.priceTargetBase}${range}`);
    }
  }
  lines.push("");

  lines.push("## Suggested Substack angle");
  lines.push(
    options?.suggestedAngle ??
      "Picks-and-shovels / AI infrastructure and power; quality names at a discount; thesis-aligned sleeve.",
  );
  lines.push("");

  lines.push("## Suggested title options");
  const titles = options?.suggestedTitles ?? [
    "The Bench: [N] Stocks Powering the AI Economy",
    "Toll Roads on the Largest Capex Cycle in History",
  ];
  titles.forEach((t) => lines.push(`- ${t}`));
  lines.push("");

  lines.push("## Suggested structure");
  lines.push("1. Executive summary");
  lines.push("2. Sector-by-sector (equipment, design, compute, power)");
  lines.push("3. Per-ticker card: thesis + analyst PT + X sentiment");
  lines.push("4. Synthesis and portfolio view");
  lines.push("");

  lines.push("## Per-ticker cards");
  for (const d of dossiers) {
    const e = bySymbol.get(d.symbol);
    const narratives = e?.dominantNarratives ?? [];
    const pt = e?.priceTargetBase != null ? ` PT ~${e.priceTargetBase}` : "";
    const oneLiner = `${d.discoveryReason}${pt}`;
    lines.push(`### ${d.symbol}`);
    lines.push(`- **Reason**: ${d.discoveryReason}`);
    if (narratives.length) lines.push(`- **X**: ${narratives.join("; ")}`);
    if (e?.priceTargetBase != null)
      lines.push(`- **Price target**: ${e.priceTargetBase}`);
    lines.push(`- **One-liner**: ${oneLiner}`);
    lines.push("");
  }

  return lines.join("\n");
}
