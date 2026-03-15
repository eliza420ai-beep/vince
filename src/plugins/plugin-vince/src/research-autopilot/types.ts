/**
 * Research Autopilot — run contract, selection modes, artifact schema, run ledger.
 * PRD: Watchlist-to-Substack Autopilot.
 */

export type ResearchAutopilotSelectionMode =
  | "add_now"
  | "research_next"
  | "net_new"
  | "add_now_plus_research"
  | "custom_symbols";

export const RESEARCH_AUTOPILOT_MAX_TICKERS_DEFAULT = 25;

export interface ResearchAutopilotRunConfig {
  selectionMode: ResearchAutopilotSelectionMode;
  /** Default RESEARCH_AUTOPILOT_MAX_TICKERS_DEFAULT when omitted. */
  maxTickerCount?: number;
  /** For custom_symbols mode only. */
  customSymbols?: string[];
}

export interface ResearchAutopilotArtifactPaths {
  runDate: string;
  selectionPath: string;
  dossiersDir: string;
  xEnrichmentPath: string;
  synthesisPath: string;
  essayDraftPath: string;
}

export type ResearchAutopilotRunStatus =
  | "pending"
  | "selection"
  | "dossiers"
  | "x_enrichment"
  | "synthesis"
  | "draft"
  | "completed"
  | "failed";

export interface ResearchAutopilotRunLedgerEntry {
  runId: string;
  createdAt: number;
  selectionMode: ResearchAutopilotSelectionMode;
  symbols: string[];
  status: ResearchAutopilotRunStatus;
  artifactPaths: Partial<ResearchAutopilotArtifactPaths>;
  essayTitle?: string;
  draftHash?: string;
  errors?: string[];
}

/** Canonical per-ticker dossier (map from watchlist/discovery outputs). */
export type TickerDossierSourceBucket = "add_now" | "research_next" | "net_new";

export interface TickerDossier {
  symbol: string;
  sourceBucket: TickerDossierSourceBucket;
  discoveryReason: string;
  priceSnapshot?: { price?: number; date?: string; source?: string };
  businessSummary?: string;
  thesisBullets?: string[];
  bullCase?: string;
  bearCase?: string;
  catalysts?: string[];
  risks?: string[];
  citations?: string[];
}

/** X sentiment and price-target enrichment (reusable structured object). */
export interface TickerXEnrichment {
  symbol: string;
  xSentimentScore?: number;
  xSentimentLabel?: string;
  dominantNarratives?: string[];
  keyAccounts?: string[];
  contrarianFlags?: string[];
  priceTargetLow?: number;
  priceTargetBase?: number;
  priceTargetHigh?: number;
  targetConfidence?: "low" | "medium" | "high";
  targetCitations?: string[];
}
