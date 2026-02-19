/**
 * Financial Modeling Prep (FMP) Service — Fundamental data for Solus stocks.
 * Uses the /stable/ API base (free tier). Limits: 250 requests/day, 500MB/30d bandwidth.
 * Caching is conservative to stay within free tier.
 */

import { logger, Service, type IAgentRuntime } from "@elizaos/core";
import { isSolusOffchainTicker } from "../constants/solusStockWatchlist";

const FMP_BASE = "https://financialmodelingprep.com/stable";
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const QUOTE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const RATIOS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

function getApiKey(runtime: IAgentRuntime): string | null {
  const key =
    (runtime.getSetting("FMP_API_KEY") as string) || process.env.FMP_API_KEY;
  return key?.trim() || null;
}

export interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
  ipoDate: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  isEtf: boolean;
  isActivelyTrading: boolean;
  isAdr: boolean;
  isFund: boolean;
}

export interface FMPIncomeStatement {
  calendarYear: string;
  period: string;
  revenue: number;
  revenueGrowth: number;
  grossProfit: number;
  grossProfitMargin: number;
  operatingIncome: number;
  operatingProfitMargin: number;
  netIncome: number;
  netProfitMargin: number;
  ebitda: number;
  ebitdaMargin: number;
  eps: number;
  epsGrowth: number;
}

export interface FMPRatios {
  dividendPerShare: number;
  dividendYield: number;
  dividendYieldPercentage: number;
  payoutRatio: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysOfSalesOutstanding: number;
  daysOfInventoryOutstanding: number;
  operatingCycle: number;
  daysOfPayablesOutstanding: number;
  cashConversionCycle: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  pretaxProfitMargin: number;
  netProfitMargin: number;
  effectiveTaxRate: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  netIncomePerEbt: number;
  ebtPerEbit: number;
  ebitPerRevenue: number;
  debtRatio: number;
  debtEquityRatio: number;
  longTermDebtToCapitalization: number;
  totalDebtToCapitalization: number;
  interestCoverage: number;
  cashFlowToDebtRatio: number;
  companyEquityMultiplier: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  fixedAssetTurnover: number;
  assetTurnover: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  operatingCashFlowSalesRatio: number;
  freeCashFlowOperatingCashFlowRatio: number;
  cashFlowCoverageRatio: null;
  shortTermCoverageRatios: null;
  capitalExpenditureCoverageRatio: number;
  dividendPaidAndCapexCoverageRatio: number;
  priceBookValueRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsRatio: number;
  priceToFreeCashFlowsRatio: number;
  priceToOperatingCashFlowsRatio: number;
  priceCashFlowRatio: number;
  priceEarningsToGrowthRatio: number;
  priceSalesRatio: number;
  enterpriseValueMultiple: number;
  priceFairValue: number;
}

export interface FMPEarningsCalendar {
  symbol: string;
  date: string;
  eps: number;
  epsEstimate: number;
  revenue: number;
  revenueEstimate: number;
  indicator: string;
  period: string;
  year: number;
  quarter: number;
}

export class FMPService extends Service {
  static serviceType = "FMP_SERVICE" as const;
  capabilityDescription =
    "Fundamental data, financials, ratios, and earnings calendar for Solus stocks (Financial Modeling Prep).";

  private profileCache = new Map<
    string,
    { data: FMPCompanyProfile; ts: number }
  >();
  private incomeCache = new Map<
    string,
    { data: FMPIncomeStatement[]; ts: number }
  >();
  private ratiosCache = new Map<string, { data: FMPRatios; ts: number }>();
  private earningsCache = new Map<
    string,
    { data: FMPEarningsCalendar[]; ts: number }
  >();

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<FMPService> {
    const svc = new FMPService(runtime);
    return svc;
  }

  async stop(): Promise<void> {
    this.profileCache.clear();
    this.incomeCache.clear();
    this.ratiosCache.clear();
    this.earningsCache.clear();
  }

  isConfigured(): boolean {
    return Boolean(getApiKey(this.runtime));
  }

  /** Fetch company profile with caching. */
  async getProfile(symbol: string): Promise<FMPCompanyProfile | null> {
    const key = getApiKey(this.runtime);
    if (!key) return null;
    const sym = symbol.trim().toUpperCase();

    const cached = this.profileCache.get(sym);
    if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `${FMP_BASE}/profile?symbol=${encodeURIComponent(sym)}&apikey=${key}`;
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn("[FMPService] profile not ok: " + res.status);
        return null;
      }
      const raw = (await res.json()) as FMPCompanyProfile[] | FMPCompanyProfile;
      const data = Array.isArray(raw) ? raw[0] : raw;
      if (!data) return null;
      this.profileCache.set(sym, { data, ts: Date.now() });
      return data;
    } catch (e) {
      logger.warn("[FMPService] getProfile error: " + (e as Error).message);
      return null;
    }
  }

  /** Fetch income statement (last 4 quarters). */
  async getIncomeStatement(symbol: string): Promise<FMPIncomeStatement[]> {
    const key = getApiKey(this.runtime);
    if (!key) return [];
    const sym = symbol.trim().toUpperCase();

    const cached = this.incomeCache.get(sym);
    if (cached && Date.now() - cached.ts < PROFILE_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `${FMP_BASE}/income-statement?symbol=${encodeURIComponent(sym)}&apikey=${key}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const raw = (await res.json()) as
        | FMPIncomeStatement[]
        | FMPIncomeStatement;
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
      if (arr.length === 0) return [];
      this.incomeCache.set(sym, { data: arr, ts: Date.now() });
      return arr;
    } catch (e) {
      logger.warn(
        "[FMPService] getIncomeStatement error: " + (e as Error).message,
      );
      return [];
    }
  }

  /** Fetch key ratios. */
  async getRatios(symbol: string): Promise<FMPRatios | null> {
    const key = getApiKey(this.runtime);
    if (!key) return null;
    const sym = symbol.trim().toUpperCase();

    const cached = this.ratiosCache.get(sym);
    if (cached && Date.now() - cached.ts < RATIOS_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const url = `${FMP_BASE}/ratios?symbol=${encodeURIComponent(sym)}&apikey=${key}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const raw = (await res.json()) as FMPRatios[] | FMPRatios;
      const data = Array.isArray(raw) ? raw[0] : raw;
      if (!data) return null;
      this.ratiosCache.set(sym, { data, ts: Date.now() });
      return data;
    } catch (e) {
      logger.warn("[FMPService] getRatios error: " + (e as Error).message);
      return null;
    }
  }

  /** Fetch earnings calendar (next 30 days + last 7). */
  async getEarningsCalendar(symbol?: string): Promise<FMPEarningsCalendar[]> {
    const key = getApiKey(this.runtime);
    if (!key) return [];

    try {
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      const to = new Date(today);
      to.setDate(to.getDate() + 30);

      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      let url: string;
      if (symbol) {
        const sym = symbol.trim().toUpperCase();
        url = `${FMP_BASE}/earnings-calendar?from=${fromStr}&to=${toStr}&symbol=${encodeURIComponent(sym)}&apikey=${key}`;
      } else {
        url = `${FMP_BASE}/earnings-calendar?from=${fromStr}&to=${toStr}&apikey=${key}`;
      }

      const res = await fetch(url);
      if (!res.ok) return [];
      const arr = (await res.json()) as FMPEarningsCalendar[];
      if (!arr || arr.length === 0) return [];
      return arr;
    } catch (e) {
      logger.warn(
        "[FMPService] getEarningsCalendar error: " + (e as Error).message,
      );
      return [];
    }
  }

  /** Get key metrics summary for a ticker. */
  async getKeyMetrics(symbol: string): Promise<{
    price: number;
    marketCap: number;
    peRatio: number;
    dividendYield: number;
    revenueGrowth: number;
    profitMargin: number;
    debtToEquity: number;
    returnOnEquity: number;
    beta: number;
    lastEarnings: FMPEarningsCalendar | null;
    nextEarnings: FMPEarningsCalendar | null;
  } | null> {
    const [profile, income, ratios, earnings] = await Promise.all([
      this.getProfile(symbol),
      this.getIncomeStatement(symbol),
      this.getRatios(symbol),
      this.getEarningsCalendar(symbol),
    ]);

    if (!profile) return null;

    const prof = profile as FMPCompanyProfile & { marketCap?: number };
    const sym = symbol.trim().toUpperCase();
    const forSymbol = (e: FMPEarningsCalendar) =>
      (e.symbol || "").toUpperCase() === sym;
    const lastEarnings =
      earnings.filter(forSymbol).find((e) => new Date(e.date) <= new Date()) ||
      earnings.find((e) => new Date(e.date) <= new Date()) ||
      null;
    const nextEarnings =
      earnings.filter(forSymbol).find((e) => new Date(e.date) > new Date()) ||
      earnings.find((e) => new Date(e.date) > new Date()) ||
      null;

    return {
      price: profile.price ?? 0,
      marketCap: profile.mktCap ?? prof.marketCap ?? 0,
      peRatio: ratios?.priceEarningsRatio ?? 0,
      dividendYield: ratios?.dividendYield ?? 0,
      revenueGrowth: income[0]?.revenueGrowth ?? 0,
      profitMargin: income[0]?.netProfitMargin ?? 0,
      debtToEquity: ratios?.debtEquityRatio ?? 0,
      returnOnEquity: ratios?.returnOnEquity ?? 0,
      beta: profile.beta ?? 0,
      lastEarnings,
      nextEarnings,
    };
  }
}
