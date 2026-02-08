/**
 * Types for crypto intel persistent memory (Phases 3–5).
 * Memory root: .elizadb/vince-paper-bot/crypto-intel/ (or VINCE_CRYPTO_INTEL_MEMORY_DIR).
 */

// ---------------------------------------------------------------------------
// Phase 3: Intelligence log and session state
// ---------------------------------------------------------------------------

export type IntelligenceLogStatus =
  | "new"
  | "developing"
  | "confirmed"
  | "invalidated";

export interface IntelligenceLogEntry {
  date: string; // ISO date or YYYY-MM-DD
  category: string;
  signal_description: string;
  source: string; // e.g. grok, web, onchain, smart_wallet, hyperliquid
  confidence?: number;
  status: IntelligenceLogStatus;
  follow_up?: string;
  related_tokens?: string[];
  tags?: string[];
}

export interface OpenInvestigation {
  id?: string;
  finding: string;
  next_steps: string[];
}

export interface SessionState {
  last_run: string; // ISO string or timestamp
  open_investigations: OpenInvestigation[];
  questions_for_next_session: string[];
  contrarian_challenges: string[];
}

// ---------------------------------------------------------------------------
// Phase 4: Recommendations and track record
// ---------------------------------------------------------------------------

export type RecommendationAction = "buy" | "sell" | "watch";
export type RecommendationStatus = "open" | "closed";
export type ScenarioPlayedOut = "bull" | "base" | "bear";

export interface RecommendationEntry {
  date: string;
  ticker: string;
  action: RecommendationAction;
  price: number;
  mcap?: string;
  category?: string;
  thesis: string;
  target?: string;
  invalidation?: string;
  timeframe?: string;
  status: RecommendationStatus;
  current_price?: number;
  pnl?: number;
  close_date?: string;
  close_reason?: string;
  source_signal?: string;
  ev_bull_pct?: number;
  ev_base_pct?: number;
  ev_bear_pct?: number;
  ev_bull_return?: number;
  ev_base_return?: number;
  ev_bear_return?: number;
  scenario_played_out?: ScenarioPlayedOut;
}

export interface TrackRecordEntry {
  ticker: string;
  action: RecommendationAction;
  open_date: string;
  close_date: string;
  pnl: number;
  scenario_played_out?: ScenarioPlayedOut;
  close_reason?: string;
}

export interface TrackRecord {
  wins: number;
  losses: number;
  win_rate?: number;
  by_category?: Record<string, { wins: number; losses: number }>;
  by_source?: Record<string, { wins: number; losses: number }>;
  lessons?: string[];
  ev_calibration?: string;
  entries?: TrackRecordEntry[];
}

// ---------------------------------------------------------------------------
// Phase 5: Smart wallets and watchlist
// ---------------------------------------------------------------------------

export type SmartWalletCategory =
  | "insider"
  | "early_degen"
  | "fund"
  | "whale"
  | "mev_bot"
  | "smart_trader";

export interface NotableTrade {
  date: string;
  outcome: string;
}

export interface SmartWallet {
  address: string;
  chain: string;
  label?: string;
  category: SmartWalletCategory;
  first_spotted?: string;
  score?: number;
  notable_trades?: NotableTrade[];
  current_holdings?: string[];
  last_checked?: string;
  active: boolean;
  notes?: string;
}

export interface SmartWalletsFile {
  version: number;
  lastUpdated: string;
  wallets: SmartWallet[];
}

export interface WatchlistEntry {
  protocol?: string;
  narrative?: string;
  airdrop?: string;
  unlock_date?: string;
  hyperliquid_position?: string;
  lifecycle_status?: string;
}

export interface WatchlistFile {
  version: number;
  lastUpdated: string;
  items: WatchlistEntry[];
}
