/**
 * VINCE News Sentiment Service
 *
 * Tracks news and sentiment from MandoMinutes:
 * - Reads from shared MandoMinutes cache (mando_minutes:latest)
 * - Sentiment analysis with bullish/bearish keyword detection
 * - Risk event detection (hacks, exploits, SEC actions)
 * - Asset-specific news filtering (BTC, ETH, SOL, HYPE)
 *
 * Integrates with plugin-web-search's MANDO_MINUTES action.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import { PuppeteerBrowserService } from "./fallbacks/puppeteer.browser";

// ==========================================
// Sentiment Analysis Constants
// ==========================================

/** Keywords that indicate bullish sentiment */
const BULLISH_KEYWORDS = [
  // Price action
  "rally", "surge", "breakout", "ath", "all-time high", "moon", "pump",
  "gains", "soars", "jumps", "spikes", "climbs", "rises",
  // Institutional
  "etf inflow", "inflows", "accumulation", "accumulating", "buying",
  "institutional", "adoption", "approval", "approved", "launch",
  // Positive news
  "bullish", "optimistic", "upgrade", "partnership", "milestone",
  "record", "expansion", "growth", "success", "breakthrough",
];

/** Keywords that indicate bearish sentiment */
const BEARISH_KEYWORDS = [
  // Price action
  "crash", "dump", "plunge", "selloff", "sell-off", "decline", "drop",
  "falls", "sinks", "tumbles", "slides", "correction", "capitulation",
  // Negative events
  "hack", "hacked", "exploit", "exploited", "rug", "rugged", "scam",
  "sec", "lawsuit", "investigation", "ban", "banned", "crackdown",
  // Outflows
  "etf outflow", "outflows", "distribution", "selling", "liquidation",
  "bearish", "pessimistic", "downgrade", "failure", "collapse",
];

/** Keywords that indicate risk events requiring alerts */
const RISK_EVENT_KEYWORDS = [
  { keyword: "hack", type: "security", severity: "critical" as const },
  { keyword: "hacked", type: "security", severity: "critical" as const },
  { keyword: "exploit", type: "security", severity: "critical" as const },
  { keyword: "exploited", type: "security", severity: "critical" as const },
  { keyword: "rug", type: "scam", severity: "critical" as const },
  { keyword: "rugged", type: "scam", severity: "critical" as const },
  { keyword: "sec", type: "regulatory", severity: "warning" as const },
  { keyword: "lawsuit", type: "legal", severity: "warning" as const },
  { keyword: "investigation", type: "legal", severity: "warning" as const },
  { keyword: "ban", type: "regulatory", severity: "warning" as const },
  { keyword: "banned", type: "regulatory", severity: "warning" as const },
  { keyword: "crackdown", type: "regulatory", severity: "warning" as const },
  { keyword: "delisting", type: "exchange", severity: "warning" as const },
  { keyword: "insolvency", type: "financial", severity: "critical" as const },
  { keyword: "bankruptcy", type: "financial", severity: "critical" as const },
];

/** Assets to track in news headlines */
const TRACKED_ASSETS = ["BTC", "ETH", "SOL", "HYPE", "XRP", "ADA", "AVAX", "LINK", "DOT", "MATIC"];

// ==========================================
// Theme Detection for Human Summaries
// ==========================================

/** News themes for grouping and narrative generation */
type NewsTheme = "regulatory" | "security" | "price" | "institutional" | "macro" | "defi" | "meme" | "other";

/** Keywords that indicate each theme */
const THEME_KEYWORDS: Record<NewsTheme, string[]> = {
  regulatory: [
    "sec", "cftc", "regulation", "regulator", "lawsuit", "legal", "ban", "banned",
    "crackdown", "investigation", "compliance", "license", "licensed", "sanction",
    "enforcement", "court", "ruling", "legislation", "congress", "senate", "bill",
  ],
  security: [
    "hack", "hacked", "exploit", "exploited", "breach", "vulnerability", "attack",
    "drained", "stolen", "theft", "security", "bug", "patch", "audit", "compromised",
  ],
  price: [
    "rally", "surge", "pump", "dump", "crash", "ath", "all-time", "breakout",
    "correction", "dip", "bounce", "resistance", "support", "100k", "50k", "200k",
    "price", "trading", "volume", "market cap", "gains", "losses",
  ],
  institutional: [
    "etf", "blackrock", "fidelity", "grayscale", "institutional", "hedge fund",
    "bank", "jpmorgan", "goldman", "morgan stanley", "custody", "adoption",
    "wall street", "traditional finance", "tradfi", "inflow", "outflow", "approval",
  ],
  macro: [
    "fed", "federal reserve", "interest rate", "inflation", "cpi", "ppi", "gdp",
    "unemployment", "treasury", "bond", "yield", "dollar", "dxy", "economy",
    "recession", "tariff", "trade war", "china", "europe", "japan",
  ],
  defi: [
    "defi", "lending", "borrowing", "yield", "apy", "tvl", "liquidity",
    "aave", "compound", "uniswap", "curve", "pendle", "staking", "restaking",
    "lsd", "liquid staking", "bridge", "cross-chain",
  ],
  meme: [
    "meme", "memecoin", "doge", "shib", "pepe", "bonk", "wif", "trump",
    "ai agent", "ai token", "degen", "ape", "fomo", "100x", "moon",
  ],
  other: [], // Fallback
};

interface ThemedNews {
  theme: NewsTheme;
  articles: NewsItem[];
  topHeadline: string;
}

/** MandoMinutes shared cache keys (plugin-web-search uses both) */
const MANDO_CACHE_KEYS = [
  "mando_minutes:latest:v9",  // Used by dailyNewsDigest.ts and cryptoNews.ts
  "mando_minutes:latest",     // Used by mandoMinutes.ts
];

/** MandoMinutes URL for direct fetching (must match plugin-web-search) */
const MANDO_MINUTES_URL = "https://www.mandominutes.com/Latest";

// ==========================================
// Types
// ==========================================

export interface NewsItem {
  title: string;
  source: string;
  sentiment: "bullish" | "bearish" | "neutral";
  impact: "high" | "medium" | "low";
  assets: string[];
  timestamp: number;
  category?: string;
}

export interface RiskEvent {
  type: string;
  description: string;
  severity: "critical" | "warning" | "info";
  assets: string[];
  timestamp: number;
}

/** MandoMinutes cache format from plugin-web-search */
interface MandoCacheData {
  articles: Array<{
    title: string;
    source?: string;
    url?: string;
    categories?: string[];
    publishedAt?: string;
  }>;
  timestamp: number;
}

// ==========================================
// Service Implementation
// ==========================================

export class VinceNewsSentimentService extends Service {
  static serviceType = "VINCE_NEWS_SENTIMENT_SERVICE";
  capabilityDescription = "News sentiment and risk event tracking via MandoMinutes";

  private newsCache: NewsItem[] = [];
  private riskEvents: RiskEvent[] = [];
  private lastUpdate = 0;
  private lastMandoFetch = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MANDO_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (match plugin-web-search)

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceNewsSentimentService> {
    const service = new VinceNewsSentimentService(runtime);
    
    // Try to load initial data from cache first (fast)
    try {
      await service.fetchFromMandoMinutes();
      
      const stats = service.getDebugStats();
      if (stats.hasData) {
        service.printDetailedDashboard();
      } else {
        console.log("");
        console.log("  ┌─────────────────────────────────────────────────────────────────┐");
        console.log("  │  📰 MANDOMINUTES NEWS DASHBOARD                                 │");
        console.log("  ├─────────────────────────────────────────────────────────────────┤");
        console.log("  │  ⏳ No cached data - fetching in background...                  │");
        console.log("  └─────────────────────────────────────────────────────────────────┘");
        console.log("");
        
        // Schedule background fetch after BrowserService has time to initialize
        setTimeout(async () => {
          try {
            logger.info("[VinceNewsSentiment] Background fetch starting...");
            await service.fetchFromMandoMinutes();
            const bgStats = service.getDebugStats();
            if (bgStats.hasData) {
              service.printDetailedDashboard();
            }
          } catch (bgErr) {
            logger.debug(`[VinceNewsSentiment] Background fetch failed: ${bgErr}`);
          }
        }, 10000);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      console.log(`  │  ⚠️  Initial fetch failed: ${err}`);
    }
    
    logger.info("[VinceNewsSentiment] Service initialized (MandoMinutes integration)");
    
    return service;
  }

  /**
   * Print detailed dashboard with headlines and risk events
   */
  private printDetailedDashboard(): void {
    const stats = this.getDebugStats();
    const sentiment = this.getOverallSentiment();
    const topHeadlines = this.getTopHeadlines(5);
    const riskEvents = this.getActiveRiskEvents();
    
    console.log("");
    console.log("  ┌─────────────────────────────────────────────────────────────────┐");
    console.log("  │  📰 MANDOMINUTES NEWS DASHBOARD                                 │");
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    
    // Sentiment summary
    const sentEmoji = sentiment.sentiment === "bullish" ? "🟢" : 
                      sentiment.sentiment === "bearish" ? "🔴" : "⚪";
    const sentStr = `${sentEmoji} ${sentiment.sentiment.toUpperCase()} (${Math.round(sentiment.confidence)}% confidence)`;
    const countStr = `${stats.totalNews} articles (🟢${stats.bullishCount} 🔴${stats.bearishCount} ⚪${stats.neutralCount})`;
    console.log(`  │  ${sentStr.padEnd(32)} │ ${countStr.padEnd(30)}│`);
    
    // Top Headlines
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    console.log("  │  📋 TOP HEADLINES:                                              │");
    
    for (const news of topHeadlines) {
      const emoji = news.sentiment === "bullish" ? "🟢" : 
                    news.sentiment === "bearish" ? "🔴" : "⚪";
      const impactTag = news.impact === "high" ? "❗" : "";
      // Truncate headline to fit
      const headline = news.headline.length > 55 
        ? news.headline.substring(0, 52) + "..." 
        : news.headline;
      console.log(`  │  ${emoji}${impactTag} ${headline}`.padEnd(66) + "│");
    }
    
    // Risk Events (if any)
    if (riskEvents.length > 0) {
      console.log("  ├─────────────────────────────────────────────────────────────────┤");
      console.log("  │  ⚠️  ACTIVE RISK EVENTS:                                        │");
      
      for (const event of riskEvents.slice(0, 3)) {
        const sevEmoji = event.severity === "critical" ? "🚨" : 
                         event.severity === "high" ? "⚠️" : "⚡";
        const desc = event.description.length > 52 
          ? event.description.substring(0, 49) + "..." 
          : event.description;
        console.log(`  │  ${sevEmoji} ${desc}`.padEnd(66) + "│");
        
        // Show affected assets if any
        if (event.affectedAssets.length > 0) {
          const assetsStr = `     Affects: ${event.affectedAssets.slice(0, 5).join(", ")}`;
          console.log(`  │  ${assetsStr}`.padEnd(66) + "│");
        }
      }
    }
    
    // Actionable TLDR
    console.log("  ├─────────────────────────────────────────────────────────────────┤");
    const tldr = this.getTLDR();
    const tldrEmoji = tldr.includes("RISK") || tldr.includes("BEARISH") ? "⚠️" :
                      tldr.includes("BULLISH") || tldr.includes("CATALYST") ? "💡" : "📋";
    console.log(`  │  ${tldrEmoji} ${tldr.padEnd(62)}│`);
    
    console.log("  └─────────────────────────────────────────────────────────────────┘");
    console.log("");
  }

  async stop(): Promise<void> {
    logger.info("[VinceNewsSentiment] Service stopped");
  }

  /**
   * Refresh data from MandoMinutes shared cache
   */
  async refreshData(): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < this.CACHE_TTL_MS) {
      return;
    }

    // Fetch from MandoMinutes cache
    await this.fetchFromMandoMinutes();
    
    // Clear old entries (older than 24 hours)
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    this.newsCache = this.newsCache.filter(n => n.timestamp > oneDayAgo);
    this.riskEvents = this.riskEvents.filter(e => e.timestamp > oneDayAgo);

    this.lastUpdate = now;
  }

  /**
   * Fetch news from the shared MandoMinutes cache
   * This cache is populated by plugin-web-search's MANDO_MINUTES action
   * Falls back to direct browser fetch if cache is empty
   */
  private async fetchFromMandoMinutes(): Promise<void> {
    try {
      // Try all known cache keys
      let cached: MandoCacheData | null = null;
      
      for (const cacheKey of MANDO_CACHE_KEYS) {
        const result = await this.runtime.getCache<MandoCacheData>(cacheKey);
        if (result && result.articles && result.articles.length > 0) {
          // Check if cache is fresh enough
          if (Date.now() - result.timestamp <= this.MANDO_CACHE_TTL_MS * 2) {
            cached = result;
            const ageMinutes = Math.round((Date.now() - result.timestamp) / 60000);
            logger.info(`[VinceNewsSentiment] Found cache at ${cacheKey} with ${result.articles.length} articles (${ageMinutes}m old)`);
            break;
          }
        }
      }
      
      // If no cache, try direct browser fetch
      if (!cached || !cached.articles || cached.articles.length === 0) {
        logger.debug("[VinceNewsSentiment] MandoMinutes cache empty - attempting direct fetch");
        cached = await this.fetchDirectFromBrowser();
        
        if (!cached) {
          return;
        }
      }

      // Don't re-process if we already have this data
      if (cached.timestamp === this.lastMandoFetch) {
        return;
      }

      // Log confirmation with headline summary
      console.log("");
      console.log("  ┌─────────────────────────────────────────────────────────────┐");
      console.log(`  │  ✅ MANDOMINUTES: ${cached.articles.length} HEADLINES FROM CACHE                  │`);
      console.log("  ├─────────────────────────────────────────────────────────────┤");
      
      // Show all headlines (truncated to fit)
      for (let i = 0; i < cached.articles.length; i++) {
        const title = cached.articles[i].title;
        const truncated = title.length > 55 ? title.substring(0, 52) + "..." : title;
        console.log(`  │  ${(i + 1).toString().padStart(2, " ")}. ${truncated.padEnd(55, " ")} │`);
      }
      console.log("  └─────────────────────────────────────────────────────────────┘");
      console.log("");
      
      logger.info(`[VinceNewsSentiment] ✅ Processing ${cached.articles.length} articles from MandoMinutes cache`);
      this.lastMandoFetch = cached.timestamp;

      // Convert and analyze each article
      for (const article of cached.articles) {
        if (!article.title || article.title.length < 10) continue;

        // Analyze sentiment
        const sentiment = this.analyzeSentiment(article.title);
        
        // Detect assets mentioned
        const assets = this.detectAssets(article.title);
        
        // Determine impact based on keywords and asset mentions
        const impact = this.determineImpact(article.title, assets);
        
        // Extract source from MandoMinutes format
        const source = this.extractSource(article.source || "MandoMinutes");
        
        // Determine category
        const category = article.categories?.[0] || "crypto";

        // Add to cache (avoid duplicates)
        const exists = this.newsCache.some(n => 
          n.title.toLowerCase() === article.title.toLowerCase()
        );
        
        if (!exists) {
          this.newsCache.push({
            title: article.title,
            source,
            sentiment,
            impact,
            assets,
            category,
            timestamp: cached.timestamp,
          });
        }

        // Check for risk events
        this.detectRiskEvents(article.title, assets, cached.timestamp);
      }

      // Keep only last 150 items (MandoMinutes has 30-50 per day)
      if (this.newsCache.length > 150) {
        this.newsCache = this.newsCache.slice(-150);
      }

      const sentimentCounts = {
        bullish: this.newsCache.filter(n => n.sentiment === "bullish").length,
        bearish: this.newsCache.filter(n => n.sentiment === "bearish").length,
        neutral: this.newsCache.filter(n => n.sentiment === "neutral").length,
      };
      logger.info(`[VinceNewsSentiment] Processed: ${sentimentCounts.bullish} bullish, ${sentimentCounts.bearish} bearish, ${sentimentCounts.neutral} neutral`);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.debug(`[VinceNewsSentiment] Failed to fetch from MandoMinutes: ${errMsg}`);
    }
  }

  /**
   * Direct fetch from MandoMinutes using native Puppeteer browser
   * No external plugins required - uses headless Chrome to render JavaScript
   */
  private async fetchDirectFromBrowser(): Promise<MandoCacheData | null> {
    const browser = new PuppeteerBrowserService();
    
    try {
      logger.info("[VinceNewsSentiment] Fetching MandoMinutes via Puppeteer...");
      
      const navResult = await browser.navigate(MANDO_MINUTES_URL, undefined, {
        retries: 2,
        retryDelay: 3000,
        timeout: 45000,
      });
      
      if (!navResult.success) {
        const errMsg = navResult.error?.split('\n')[0] || 'Unknown error';
        logger.warn(`[VinceNewsSentiment] MandoMinutes fetch failed: ${errMsg}`);
        return null;
      }
      
      const pageContent = await browser.getPageContent();
      
      if (!pageContent || pageContent.length < 200) {
        logger.warn(`[VinceNewsSentiment] MandoMinutes content too short (${pageContent?.length || 0} chars)`);
        return null;
      }
      
      logger.debug(`[VinceNewsSentiment] Got MandoMinutes content: ${pageContent.length} chars`);

      // Parse the content to extract headlines
      const articles = this.parseMandoMinutesContent(pageContent);
      
      if (articles.length === 0) {
        logger.warn("[VinceNewsSentiment] No articles parsed from MandoMinutes");
        return null;
      }

      logger.info(`[VinceNewsSentiment] ✅ MandoMinutes SUCCESS: ${articles.length} headlines loaded`);

      // Cache the result for other services
      const cacheData: MandoCacheData = {
        articles,
        timestamp: Date.now(),
      };
      
      await this.runtime.setCache(MANDO_CACHE_KEYS[0], cacheData);
      
      return cacheData;

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`[VinceNewsSentiment] MandoMinutes fetch error: ${errMsg}`);
      return null;
    } finally {
      // Always close browser to free resources
      await browser.close();
    }
  }

  /**
   * Parse MandoMinutes content - handles plain text format from document.body.innerText
   * MandoMinutes typically has 30-50 articles per day across categories
   */
  private parseMandoMinutesContent(content: string): Array<{ title: string; source?: string; categories?: string[] }> {
    const articles: Array<{ title: string; source?: string; categories?: string[] }> = [];
    const seen = new Set<string>();
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let currentCategory: "crypto" | "macro" | "leftcurve" = "crypto";
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect category headers (standalone section names in plain text)
      if (/^Crypto$/i.test(line) || /^Crypto\s*News$/i.test(line)) {
        currentCategory = 'crypto';
        continue;
      }
      if (/^Macro\s*(&|and)?\s*General$/i.test(line) || /^Macro$/i.test(line) || /^General$/i.test(line)) {
        currentCategory = 'macro';
        continue;
      }
      if (/^Left\s*Curve/i.test(line) || /^Degen/i.test(line)) {
        currentCategory = 'leftcurve';
        continue;
      }
      
      // Skip non-content lines
      if (this.isSkippableLine(line)) continue;
      
      // Detect headlines (bullets or substantive lines)
      const headline = this.extractHeadline(line);
      if (headline && headline.length >= 20) {
        // Look ahead for source
        const source = this.lookAheadForSource(lines, i);
        this.addParsedArticle(articles, seen, headline, source, currentCategory);
      }
    }
    
    logger.info(`[VinceNewsSentiment] Parsed ${articles.length} articles (crypto: ${articles.filter(a => a.categories?.[0] === 'crypto').length}, macro: ${articles.filter(a => a.categories?.[0] === 'macro').length}, leftcurve: ${articles.filter(a => a.categories?.[0] === 'leftcurve').length})`);
    
    return articles;
  }
  
  /**
   * Add a parsed article with deduplication
   */
  private addParsedArticle(
    articles: Array<{ title: string; source?: string; categories?: string[] }>,
    seen: Set<string>,
    headline: string,
    source: string,
    category: "crypto" | "macro" | "leftcurve"
  ): void {
    const normalized = headline.toLowerCase().trim();
    
    if (normalized.length >= 15 && 
        normalized.length <= 300 && 
        !seen.has(normalized) &&
        !normalized.includes('cookie') &&
        !normalized.includes('subscribe')) {
      seen.add(normalized);
      articles.push({
        title: headline.trim(),
        source: source || "MandoMinutes",
        categories: [category],
      });
    }
  }
  
  /**
   * Check if a line should be skipped (navigation, footer, etc.)
   */
  private isSkippableLine(line: string): boolean {
    const skipPatterns = [
      /^Subscribe/i, /^Follow/i, /^Cookie/i, /^Disclaimer/i,
      /^Terms$/i, /^Privacy$/i, /^Loading/i, /^Mando\s*Minutes$/i,
      /^@\w+$/, /^https?:\/\//, /^All Minutes$/i, /^Site Logo$/i,
      /^Comic by/i, /^newsletter/i, /^MandoMinutes$/i,
      /^\d+\s*(min|sec|hour|day)s?\s*(ago|read)?$/i,
    ];
    return skipPatterns.some(p => p.test(line)) || line.length < 10;
  }

  /**
   * Extract headline from a line (removes bullets, validates)
   */
  private extractHeadline(line: string): string | null {
    // Remove bullet points and leading punctuation
    let clean = line.replace(/^[•\-\*▸►]\s*/, '').trim();
    
    // Skip if too short
    if (clean.length < 20) return null;
    
    // Skip if it looks like a source name (short, known sources)
    const knownSources = /^(The Block|CoinDesk|Reuters|Bloomberg|Decrypt|DL News|WSJ|CNBC|Cointelegraph|BeInCrypto|Blockworks|Unchained|The Defiant|CryptoSlate|NewsBTC|Bitcoinist|U\.Today|AMBCrypto|Benzinga|MarketWatch|Yahoo Finance|Forbes|Fortune|TechCrunch|Wired|Ars Technica)$/i;
    if (knownSources.test(clean)) return null;
    
    // Skip price-only items like "BTC: 90k" or "ETH: $3,400 (+5%)"
    if (/^[A-Z]{2,5}:\s*\$?[\d,]+[kmb]?\s*(\([+-]?\d+\.?\d*%?\))?$/i.test(clean)) return null;
    
    // Skip navigation/UI elements
    if (/^(Home|About|Contact|Login|Sign up|Register|Menu|Search)$/i.test(clean)) return null;
    
    return clean;
  }

  /**
   * Look ahead in lines array to find source name
   */
  private lookAheadForSource(lines: string[], currentIndex: number): string {
    // Known news source names
    const sourcePatterns = /^(The Block|CoinDesk|Reuters|Bloomberg|Decrypt|DL News|WSJ|CNBC|Cointelegraph|BeInCrypto|Blockworks|Unchained|The Defiant|CryptoSlate|NewsBTC|Bitcoinist|U\.Today|AMBCrypto|Benzinga|MarketWatch|Yahoo Finance|Forbes|Fortune|TechCrunch|Wired|Ars Technica)$/i;
    
    // Check next 1-3 lines for source name
    for (let j = currentIndex + 1; j <= currentIndex + 3 && j < lines.length; j++) {
      const nextLine = lines[j].trim();
      // Stop if we hit another headline (has bullet) or category header
      if (/^[•\-\*▸►]/.test(nextLine)) break;
      if (/^(Crypto|Macro|Left Curve|General|Degen)/i.test(nextLine)) break;
      
      if (sourcePatterns.test(nextLine)) {
        return nextLine;
      }
    }
    return "MandoMinutes";
  }

  /**
   * Analyze sentiment of a headline using keyword matching
   */
  private analyzeSentiment(text: string): "bullish" | "bearish" | "neutral" {
    const lower = text.toLowerCase();
    
    let bullishScore = 0;
    let bearishScore = 0;
    
    for (const keyword of BULLISH_KEYWORDS) {
      if (lower.includes(keyword)) {
        bullishScore++;
      }
    }
    
    for (const keyword of BEARISH_KEYWORDS) {
      if (lower.includes(keyword)) {
        bearishScore++;
      }
    }
    
    // Need a clear signal to classify
    if (bullishScore > bearishScore && bullishScore >= 1) {
      return "bullish";
    }
    if (bearishScore > bullishScore && bearishScore >= 1) {
      return "bearish";
    }
    
    return "neutral";
  }

  /**
   * Detect which assets are mentioned in a headline
   */
  private detectAssets(text: string): string[] {
    const upper = text.toUpperCase();
    const assets: string[] = [];
    
    for (const asset of TRACKED_ASSETS) {
      // Check for exact match (with word boundaries)
      const regex = new RegExp(`\\b${asset}\\b`, "i");
      if (regex.test(upper)) {
        assets.push(asset);
      }
    }
    
    // Also check common names
    if (/\bbitcoin\b/i.test(text)) assets.push("BTC");
    if (/\bethereum\b/i.test(text)) assets.push("ETH");
    if (/\bsolana\b/i.test(text)) assets.push("SOL");
    if (/\bhyperliquid\b/i.test(text)) assets.push("HYPE");
    
    // Deduplicate
    return [...new Set(assets)];
  }

  /**
   * Determine the impact level of a news item
   */
  private determineImpact(text: string, assets: string[]): "high" | "medium" | "low" {
    const lower = text.toLowerCase();
    
    // High impact: Major events, hacks, regulatory, or affects BTC/ETH
    const highImpactKeywords = [
      "hack", "exploit", "sec", "etf", "approval", "ban", "crash", 
      "bankruptcy", "billion", "record", "ath", "all-time",
    ];
    
    for (const keyword of highImpactKeywords) {
      if (lower.includes(keyword)) {
        return "high";
      }
    }
    
    // High impact if it mentions BTC or ETH
    if (assets.includes("BTC") || assets.includes("ETH")) {
      return "medium";
    }
    
    // Medium impact for other tracked assets
    if (assets.length > 0) {
      return "medium";
    }
    
    return "low";
  }

  /**
   * Extract clean source name from MandoMinutes format
   */
  private extractSource(source: string): string {
    // MandoMinutes often formats as "MandoMinutes/SourceName"
    if (source.includes("/")) {
      return source.split("/").pop() || source;
    }
    return source;
  }

  /**
   * Detect and record risk events from headlines
   */
  private detectRiskEvents(text: string, assets: string[], timestamp: number): void {
    const lower = text.toLowerCase();
    
    for (const risk of RISK_EVENT_KEYWORDS) {
      if (lower.includes(risk.keyword)) {
        // Check if we already have this risk event
        const exists = this.riskEvents.some(e => 
          e.description.toLowerCase() === text.toLowerCase()
        );
        
        if (!exists) {
          this.riskEvents.push({
            type: risk.type,
            description: text,
            severity: risk.severity,
            assets: assets.length > 0 ? assets : ["MARKET"],
            timestamp,
          });
          
          logger.info(`[VinceNewsSentiment] Risk event detected: [${risk.severity}] ${text}`);
        }
        break; // Only record once per headline
      }
    }
  }

  /**
   * Add a news item (can be called by other services or actions)
   */
  addNewsItem(item: Omit<NewsItem, "timestamp">): void {
    this.newsCache.push({
      ...item,
      timestamp: Date.now(),
    });

    // Keep only last 150 items (MandoMinutes has 30-50 per day)
    if (this.newsCache.length > 150) {
      this.newsCache = this.newsCache.slice(-150);
    }
  }

  /**
   * Add a risk event
   */
  addRiskEvent(event: Omit<RiskEvent, "timestamp">): void {
    this.riskEvents.push({
      ...event,
      timestamp: Date.now(),
    });

    // Keep only last 50 events
    if (this.riskEvents.length > 50) {
      this.riskEvents = this.riskEvents.slice(-50);
    }
  }

  // ==========================================
  // Public API
  // ==========================================

  getStatus(): { newsCount: number; riskEventCount: number; lastUpdate: number } {
    return {
      newsCount: this.newsCache.length,
      riskEventCount: this.riskEvents.length,
      lastUpdate: this.lastUpdate,
    };
  }

  getRecentNews(limit: number = 10): NewsItem[] {
    return this.newsCache
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get top headlines by impact, with sentiment breakdown
   */
  getTopHeadlines(limit: number = 5): NewsItem[] {
    return this.newsCache
      .sort((a, b) => {
        // Sort by impact first, then recency
        const impactOrder = { high: 3, medium: 2, low: 1 };
        const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
        if (impactDiff !== 0) return impactDiff;
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit);
  }

  getNewsByAsset(asset: string): NewsItem[] {
    return this.newsCache
      .filter(n => n.assets.includes(asset))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get news by category (crypto, macro, leftcurve)
   */
  getNewsByCategory(category: string): NewsItem[] {
    return this.newsCache
      .filter(n => n.category === category)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getActiveRiskEvents(): RiskEvent[] {
    return this.riskEvents
      .filter(e => Date.now() - e.timestamp < 4 * 60 * 60 * 1000) // Last 4 hours
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getCriticalRiskEvents(): RiskEvent[] {
    return this.getActiveRiskEvents()
      .filter(e => e.severity === "critical");
  }

  /**
   * Get overall market sentiment from news
   */
  getOverallSentiment(): { sentiment: "bullish" | "bearish" | "neutral"; confidence: number } {
    if (this.newsCache.length === 0) {
      return { sentiment: "neutral", confidence: 0 };
    }

    // Weight by recency and impact
    let bullishScore = 0;
    let bearishScore = 0;
    const now = Date.now();

    for (const news of this.newsCache) {
      const ageHours = (now - news.timestamp) / (60 * 60 * 1000);
      const recencyWeight = Math.max(0.1, 1 - ageHours / 24); // Decay over 24 hours
      const impactWeight = news.impact === "high" ? 3 : news.impact === "medium" ? 2 : 1;
      const weight = recencyWeight * impactWeight;

      if (news.sentiment === "bullish") {
        bullishScore += weight;
      } else if (news.sentiment === "bearish") {
        bearishScore += weight;
      }
    }

    const totalScore = bullishScore + bearishScore;
    if (totalScore === 0) {
      return { sentiment: "neutral", confidence: 0 };
    }

    const sentiment = bullishScore > bearishScore * 1.2 ? "bullish" 
                    : bearishScore > bullishScore * 1.2 ? "bearish" 
                    : "neutral";
    const confidence = Math.min(100, Math.abs(bullishScore - bearishScore) / totalScore * 100);

    return { sentiment, confidence };
  }

  /**
   * Get sentiment for a specific asset
   */
  getAssetSentiment(asset: string): { sentiment: "bullish" | "bearish" | "neutral"; confidence: number; newsCount: number } {
    const assetNews = this.getNewsByAsset(asset);
    
    if (assetNews.length === 0) {
      return { sentiment: "neutral", confidence: 0, newsCount: 0 };
    }

    let bullishScore = 0;
    let bearishScore = 0;
    const now = Date.now();

    for (const news of assetNews) {
      const ageHours = (now - news.timestamp) / (60 * 60 * 1000);
      const recencyWeight = Math.max(0.1, 1 - ageHours / 24);
      const impactWeight = news.impact === "high" ? 3 : news.impact === "medium" ? 2 : 1;
      const weight = recencyWeight * impactWeight;

      if (news.sentiment === "bullish") {
        bullishScore += weight;
      } else if (news.sentiment === "bearish") {
        bearishScore += weight;
      }
    }

    const totalScore = bullishScore + bearishScore;
    if (totalScore === 0) {
      return { sentiment: "neutral", confidence: 0, newsCount: assetNews.length };
    }

    const sentiment = bullishScore > bearishScore * 1.2 ? "bullish" 
                    : bearishScore > bullishScore * 1.2 ? "bearish" 
                    : "neutral";
    const confidence = Math.min(100, Math.abs(bullishScore - bearishScore) / totalScore * 100);

    return { sentiment, confidence: Math.round(confidence), newsCount: assetNews.length };
  }

  /**
   * Format news for display in GM briefing
   */
  formatForBriefing(limit: number = 5): string[] {
    const lines: string[] = [];
    const topNews = this.getTopHeadlines(limit);
    const sentiment = this.getOverallSentiment();
    const riskEvents = this.getCriticalRiskEvents();
    
    // Overall sentiment
    const sentimentEmoji = sentiment.sentiment === "bullish" ? "📈" 
                         : sentiment.sentiment === "bearish" ? "📉" 
                         : "➡️";
    lines.push(`Sentiment: ${sentimentEmoji} ${sentiment.sentiment} (${Math.round(sentiment.confidence)}% conf)`);
    
    // Risk events warning
    if (riskEvents.length > 0) {
      lines.push(`⚠️ ${riskEvents.length} risk event(s) detected!`);
      for (const event of riskEvents.slice(0, 2)) {
        lines.push(`  • [${event.type}] ${event.description.slice(0, 60)}...`);
      }
    }
    
    // Top headlines
    if (topNews.length > 0) {
      lines.push("Headlines:");
      for (const news of topNews) {
        const emoji = news.sentiment === "bullish" ? "🟢" 
                    : news.sentiment === "bearish" ? "🔴" 
                    : "⚪";
        const title = news.title.length > 70 ? news.title.slice(0, 67) + "..." : news.title;
        lines.push(`  ${emoji} ${title}`);
      }
    }
    
    return lines;
  }

  /**
   * Check if MandoMinutes data is available
   */
  hasData(): boolean {
    return this.newsCache.length > 0;
  }

  /**
   * Get summary stats for debugging
   */
  getDebugStats(): {
    totalNews: number;
    bullishCount: number;
    bearishCount: number;
    neutralCount: number;
    riskEventCount: number;
    lastUpdate: string;
    hasData: boolean;
  } {
    return {
      totalNews: this.newsCache.length,
      bullishCount: this.newsCache.filter(n => n.sentiment === "bullish").length,
      bearishCount: this.newsCache.filter(n => n.sentiment === "bearish").length,
      neutralCount: this.newsCache.filter(n => n.sentiment === "neutral").length,
      riskEventCount: this.riskEvents.length,
      lastUpdate: this.lastUpdate ? new Date(this.lastUpdate).toISOString() : "never",
      hasData: this.hasData(),
    };
  }

  // ==========================================
  // Theme-Based Narrative Generation
  // ==========================================

  /**
   * Detect the primary theme of a news headline
   */
  private detectTheme(text: string): NewsTheme {
    const lower = text.toLowerCase();
    
    // Check each theme's keywords
    const themeScores: Record<NewsTheme, number> = {
      regulatory: 0,
      security: 0,
      price: 0,
      institutional: 0,
      macro: 0,
      defi: 0,
      meme: 0,
      other: 0,
    };
    
    for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          themeScores[theme as NewsTheme]++;
        }
      }
    }
    
    // Find highest scoring theme
    let maxTheme: NewsTheme = "other";
    let maxScore = 0;
    for (const [theme, score] of Object.entries(themeScores)) {
      if (score > maxScore) {
        maxScore = score;
        maxTheme = theme as NewsTheme;
      }
    }
    
    return maxTheme;
  }

  /**
   * Group articles by theme for narrative generation
   */
  private groupByTheme(): ThemedNews[] {
    const groups: Map<NewsTheme, NewsItem[]> = new Map();
    
    for (const article of this.newsCache) {
      const theme = this.detectTheme(article.title);
      if (!groups.has(theme)) {
        groups.set(theme, []);
      }
      groups.get(theme)!.push(article);
    }
    
    // Convert to array and sort by article count
    const themed: ThemedNews[] = [];
    for (const [theme, articles] of groups) {
      if (articles.length > 0) {
        // Sort articles by impact
        articles.sort((a, b) => {
          const impactOrder = { high: 3, medium: 2, low: 1 };
          return impactOrder[b.impact] - impactOrder[a.impact];
        });
        
        themed.push({
          theme,
          articles,
          topHeadline: articles[0].title,
        });
      }
    }
    
    // Sort by number of articles (most coverage first)
    themed.sort((a, b) => b.articles.length - a.articles.length);
    
    return themed;
  }

  /**
   * Extract key entities/numbers from a headline for narrative use
   */
  private extractKeyDetails(title: string): string {
    // Extract percentages
    const pctMatch = title.match(/[+-]?\d+(?:\.\d+)?%/);
    // Extract dollar amounts
    const dollarMatch = title.match(/\$[\d,]+(?:\.\d+)?[BMK]?/i);
    // Extract specific numbers (like "100k")
    const numMatch = title.match(/\b\d+[kmb]\b/i);
    
    const details: string[] = [];
    if (pctMatch) details.push(pctMatch[0]);
    if (dollarMatch) details.push(dollarMatch[0]);
    if (numMatch) details.push(numMatch[0]);
    
    return details.join(", ");
  }

  /**
   * Generate a comprehensive human-style daily news digest
   * Uses ALL articles grouped by theme, writes detailed narrative
   */
  generateDailySummary(): string {
    if (this.newsCache.length === 0) {
      return "No news data available - run MANDO_MINUTES to fetch.";
    }

    const themed = this.groupByTheme();
    const paragraphs: string[] = [];
    const totalArticles = this.newsCache.length;
    
    // Process ALL themes with at least 1 article
    for (const { theme, articles } of themed) {
      if (articles.length === 0 || theme === "other") continue;
      
      const paragraph = this.writeThemeParagraph(theme, articles);
      if (paragraph) {
        paragraphs.push(paragraph);
      }
    }
    
    // Handle "other" category - miscellaneous news worth mentioning
    const otherNews = themed.find(t => t.theme === "other");
    if (otherNews && otherNews.articles.length > 0) {
      const misc = this.writeMiscParagraph(otherNews.articles);
      if (misc) {
        paragraphs.push(misc);
      }
    }
    
    // Add article count context
    const header = `**${totalArticles} stories today** - here's what matters:\n`;
    
    return header + paragraphs.join("\n\n");
  }

  /**
   * Write a full paragraph for a theme - uses multiple headlines
   */
  private writeThemeParagraph(theme: NewsTheme, articles: NewsItem[]): string {
    const count = articles.length;
    const bullish = articles.filter(a => a.sentiment === "bullish").length;
    const bearish = articles.filter(a => a.sentiment === "bearish").length;
    
    // Get top headlines for this theme (up to 5)
    const topHeadlines = articles.slice(0, 5).map(a => a.title);
    
    // Theme emoji and title
    const themeLabels: Record<NewsTheme, { emoji: string; title: string }> = {
      regulatory: { emoji: "⚖️", title: "Regulation" },
      security: { emoji: "🔒", title: "Security" },
      price: { emoji: "📊", title: "Markets" },
      institutional: { emoji: "🏛️", title: "Institutional" },
      macro: { emoji: "🌍", title: "Macro" },
      defi: { emoji: "🔗", title: "DeFi" },
      meme: { emoji: "🐸", title: "Meme Szn" },
      other: { emoji: "📰", title: "Other" },
    };
    
    const { emoji, title } = themeLabels[theme];
    const lines: string[] = [];
    
    // Header with count
    const sentimentNote = bullish > bearish ? "(leaning bullish)" : 
                          bearish > bullish ? "(leaning bearish)" : "";
    lines.push(`${emoji} **${title}** [${count} stories] ${sentimentNote}`);
    
    // Write narrative sentences using actual headlines
    switch (theme) {
      case "regulatory":
        lines.push(this.writeRegulatoryNarrative(topHeadlines, articles));
        break;
      case "security":
        lines.push(this.writeSecurityNarrative(topHeadlines, articles));
        break;
      case "price":
        lines.push(this.writePriceNarrative(topHeadlines, articles));
        break;
      case "institutional":
        lines.push(this.writeInstitutionalNarrative(topHeadlines, articles));
        break;
      case "macro":
        lines.push(this.writeMacroNarrative(topHeadlines, articles));
        break;
      case "defi":
        lines.push(this.writeDefiNarrative(topHeadlines, articles));
        break;
      case "meme":
        lines.push(this.writeMemeNarrative(topHeadlines, articles));
        break;
      default:
        break;
    }
    
    return lines.join("\n");
  }

  /**
   * Write narrative for regulatory news
   */
  private writeRegulatoryNarrative(headlines: string[], articles: NewsItem[]): string {
    const lines: string[] = [];
    
    // Look for specific entities
    const entities = this.extractEntities(headlines, [
      "SEC", "CFTC", "DOJ", "Gensler", "Congress", "Senate", "EU", "MiCA", 
      "Binance", "Coinbase", "Kraken", "Ripple", "XRP"
    ]);
    
    if (entities.length > 0) {
      lines.push(`Key players: ${entities.join(", ")}`);
    }
    
    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 80)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Write narrative for security news
   */
  private writeSecurityNarrative(headlines: string[], articles: NewsItem[]): string {
    const lines: string[] = [];
    const hasCritical = articles.some(a => a.impact === "high");
    
    // Look for affected protocols
    const protocols = this.extractEntities(headlines, [
      "ETH", "Ethereum", "Solana", "BSC", "Arbitrum", "Optimism", 
      "Aave", "Curve", "Uniswap", "bridge"
    ]);
    
    if (protocols.length > 0) {
      lines.push(`Affected: ${protocols.join(", ")}`);
    }
    
    // Each headline on its own line
    for (const headline of headlines.slice(0, 3)) {
      const prefix = hasCritical && headline === headlines[0] ? "  ⚠️ " : "  → ";
      lines.push(`${prefix}${this.cleanHeadline(headline, 75)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Write narrative for price/market news
   */
  private writePriceNarrative(headlines: string[], articles: NewsItem[]): string {
    const lines: string[] = [];
    const bullish = articles.filter(a => a.sentiment === "bullish").length;
    const bearish = articles.filter(a => a.sentiment === "bearish").length;
    
    // Extract assets mentioned
    const assets = this.extractEntities(headlines, [
      "BTC", "Bitcoin", "ETH", "Ethereum", "SOL", "Solana", "XRP", 
      "ADA", "DOGE", "AVAX", "LINK", "DOT"
    ]);
    
    // Mood + assets on one line
    let mood = "Mixed action";
    if (bullish > bearish * 1.5) {
      mood = "🟢 Green across the board";
    } else if (bearish > bullish * 1.5) {
      mood = "🔴 Red dominating";
    }
    
    if (assets.length > 0) {
      lines.push(`${mood} - focus on ${assets.join(", ")}`);
    } else {
      lines.push(mood);
    }
    
    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      const sentiment = articles.find(a => a.title === headline)?.sentiment;
      const dot = sentiment === "bullish" ? "🟢" : sentiment === "bearish" ? "🔴" : "⚪";
      lines.push(`  ${dot} ${this.cleanHeadline(headline, 75)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Write narrative for institutional news
   */
  private writeInstitutionalNarrative(headlines: string[], articles: NewsItem[]): string {
    const lines: string[] = [];
    
    const players = this.extractEntities(headlines, [
      "BlackRock", "Fidelity", "Grayscale", "VanEck", "Ark", "21Shares",
      "JPMorgan", "Goldman", "Morgan Stanley", "Citadel", "ETF"
    ]);
    
    if (players.length > 0) {
      lines.push(`Big names: ${players.join(", ")}`);
    }
    
    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 75)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Write narrative for macro news
   */
  private writeMacroNarrative(headlines: string[], articles: NewsItem[]): string {
    const lines: string[] = [];
    
    const factors = this.extractEntities(headlines, [
      "Fed", "Powell", "CPI", "inflation", "rates", "dollar", "DXY",
      "Treasury", "bonds", "yields", "GDP", "jobs", "unemployment"
    ]);
    
    if (factors.length > 0) {
      lines.push(`Key factors: ${factors.join(", ")}`);
    }
    
    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 75)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Write narrative for DeFi news
   */
  private writeDefiNarrative(headlines: string[], articles: NewsItem[]): string {
    const lines: string[] = [];
    
    const protocols = this.extractEntities(headlines, [
      "Aave", "Uniswap", "Curve", "Pendle", "Lido", "Rocket Pool",
      "Compound", "MakerDAO", "Synthetix", "TVL", "yields", "APY"
    ]);
    
    if (protocols.length > 0) {
      lines.push(`Protocols: ${protocols.join(", ")}`);
    }
    
    // Each headline on its own line
    for (const headline of headlines.slice(0, 4)) {
      lines.push(`  → ${this.cleanHeadline(headline, 75)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Write narrative for meme/degen news
   */
  private writeMemeNarrative(headlines: string[], articles: NewsItem[]): string {
    const lines: string[] = [];
    
    const tokens = this.extractEntities(headlines, [
      "DOGE", "SHIB", "PEPE", "BONK", "WIF", "FLOKI", "TRUMP",
      "AI", "agent", "100x", "moon"
    ]);
    
    if (tokens.length > 0) {
      lines.push(`Tokens: ${tokens.join(", ")}`);
    }
    
    // Each headline on its own line
    for (const headline of headlines.slice(0, 3)) {
      lines.push(`  🐸 ${this.cleanHeadline(headline, 70)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Write paragraph for miscellaneous news
   */
  private writeMiscParagraph(articles: NewsItem[]): string {
    if (articles.length === 0) return "";
    
    const lines: string[] = [];
    lines.push(`📰 **Other Notable** [${articles.length} stories]`);
    
    // List top 5 headlines with proper indentation
    for (const article of articles.slice(0, 5)) {
      const emoji = article.sentiment === "bullish" ? "🟢" : 
                    article.sentiment === "bearish" ? "🔴" : "⚪";
      lines.push(`  ${emoji} ${this.cleanHeadline(article.title, 75)}`);
    }
    
    return lines.join("\n");
  }

  /**
   * Clean a headline for display - remove excess, truncate if needed
   */
  private cleanHeadline(headline: string, maxLen: number = 80): string {
    // Remove common prefixes
    let clean = headline
      .replace(/^BREAKING:\s*/i, "")
      .replace(/^JUST IN:\s*/i, "")
      .replace(/^UPDATE:\s*/i, "")
      .trim();
    
    // Truncate if needed
    if (clean.length > maxLen) {
      clean = clean.slice(0, maxLen - 3) + "...";
    }
    
    return clean;
  }

  /**
   * Extract specific entity names from headlines
   */
  private extractEntities(headlines: string[], lookFor: string[]): string[] {
    const found: string[] = [];
    const combined = headlines.join(" ");
    
    for (const entity of lookFor) {
      if (combined.toLowerCase().includes(entity.toLowerCase())) {
        found.push(entity);
      }
    }
    
    return [...new Set(found)].slice(0, 3); // Max 3 entities
  }

  /**
   * Generate actionable TLDR for dashboard display (max 55 chars)
   */
  getTLDR(): string {
    if (this.newsCache.length === 0) {
      return "NEWS: No data yet - run MANDO_MINUTES to fetch";
    }
    
    const sentiment = this.getOverallSentiment();
    const criticalRisks = this.getCriticalRiskEvents();
    const themed = this.groupByTheme();
    
    // Check for specific themes
    const hasRegulatory = themed.some(t => t.theme === "regulatory" && t.articles.length >= 2);
    const hasSecurity = themed.some(t => t.theme === "security" && t.articles.length >= 1);
    const hasInstitutional = themed.some(t => t.theme === "institutional" && t.articles.length >= 2);
    
    // Priority 1: Critical security/hack events
    if (criticalRisks.length > 0) {
      return "RISK EVENT: Security incident - reduce exposure";
    }
    
    // Priority 2: Heavy regulatory day
    if (hasRegulatory && sentiment.sentiment !== "bullish") {
      return "REGULATORY NOISE: Choppy ahead - trade smaller";
    }
    
    // Priority 3: Bullish with institutional
    if (sentiment.sentiment === "bullish" && hasInstitutional) {
      return "BULLISH CATALYST: Institutional flow - lean long";
    }
    
    // Priority 4: Pure sentiment
    if (sentiment.sentiment === "bullish") {
      return `BULLISH: ${sentiment.confidence.toFixed(0)}% confidence - favor longs`;
    }
    if (sentiment.sentiment === "bearish") {
      return hasSecurity 
        ? "BEARISH + RISK: Protect capital, stay defensive"
        : `BEARISH: ${sentiment.confidence.toFixed(0)}% confidence - favor shorts`;
    }
    
    // Default: Neutral
    return "NEUTRAL: No strong catalyst - trade your plan";
  }

  /**
   * Generate a single-line conclusion that sets the day's trading mood
   */
  getDailyConclusion(): string {
    const sentiment = this.getOverallSentiment();
    const criticalRisks = this.getCriticalRiskEvents();
    const themed = this.groupByTheme();
    
    // Count themes
    const hasRegulatory = themed.some(t => t.theme === "regulatory" && t.articles.length >= 2);
    const hasSecurity = themed.some(t => t.theme === "security" && t.articles.length >= 1);
    const hasInstitutional = themed.some(t => t.theme === "institutional" && t.articles.length >= 2);
    const hasPriceAction = themed.some(t => t.theme === "price" && t.articles.length >= 3);
    
    // Critical security event overrides everything
    if (criticalRisks.length > 0) {
      return "🔴 Risk-off mode - security/hack news dominating, stay defensive and wait for clarity.";
    }
    
    // Heavy regulatory day
    if (hasRegulatory && sentiment.sentiment !== "bullish") {
      return "⚠️ Choppy day ahead - regulatory noise creating uncertainty, watch for dips but don't force it.";
    }
    
    // Bullish with institutional backing
    if (sentiment.sentiment === "bullish" && hasInstitutional) {
      return "🟢 Bullish undertone - institutional flow and positive sentiment, lean long on quality.";
    }
    
    // Bullish without institutional
    if (sentiment.sentiment === "bullish") {
      return "🟢 Positive bias today - sentiment tilting green, but size accordingly.";
    }
    
    // Bearish
    if (sentiment.sentiment === "bearish") {
      if (hasSecurity) {
        return "🔴 Defensive stance - bearish sentiment plus security concerns, protect capital.";
      }
      return "📉 Cautious mode - bearish lean in the news, wait for better entries.";
    }
    
    // Neutral with action
    if (hasPriceAction) {
      return "↔️ Mixed signals - headlines all over, trade the levels not the noise.";
    }
    
    // Default neutral
    return "➡️ Quiet day on the news front - no strong bias, stick to your plan.";
  }

  /**
   * Format news for display in GM briefing - NEW HUMAN STYLE
   * Returns summary + conclusion instead of raw headlines
   */
  formatHumanBriefing(): { summary: string; conclusion: string; riskAlert?: string } {
    const summary = this.generateDailySummary();
    const conclusion = this.getDailyConclusion();
    
    // Only include risk alert if critical
    const criticalRisks = this.getCriticalRiskEvents();
    let riskAlert: string | undefined;
    if (criticalRisks.length > 0) {
      riskAlert = `⚠️ ALERT: ${criticalRisks[0].description.slice(0, 80)}`;
    }
    
    return { summary, conclusion, riskAlert };
  }
}
