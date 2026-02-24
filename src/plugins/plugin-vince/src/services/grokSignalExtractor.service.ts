/**
 * Grok Signal Extractor Service (#25)
 *
 * After each daily Grok intel run, extracts structured recommendations
 * from the generated report and registers them as a signal source
 * (GrokIntelligence) in the signal aggregator.
 *
 * The extracted signals are tracked via Thompson Sampling so
 * Grok-sourced signals earn their weight through accuracy.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";

// ==========================================
// Types
// ==========================================

export interface GrokRecommendation {
  asset: string;
  direction: "long" | "short";
  confidence: number;
  thesis: string;
  source: string;
  extractedAt: number;
}

export interface GrokSignal {
  source: "GrokIntelligence";
  asset: string;
  direction: "long" | "short";
  strength: number;
  confidence: number;
  details: string;
  timestamp: number;
}

const GROK_REPORTS_DIR = "docs/standup/daily-insights";
const SIGNAL_CACHE_KEY = "vince:grok_intelligence_signals";
const SIGNAL_TTL_MS = 24 * 60 * 60 * 1000;

// ==========================================
// Service
// ==========================================

export class GrokSignalExtractorService extends Service {
  static serviceType = "VINCE_GROK_SIGNAL_EXTRACTOR";
  capabilityDescription =
    "Extracts structured trading signals from daily Grok intelligence reports";

  private lastExtraction: number = 0;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<GrokSignalExtractorService> {
    return new GrokSignalExtractorService(runtime);
  }

  async stop(): Promise<void> {}

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Extract recommendations from the latest daily Grok report.
   * Returns structured signals ready for the aggregator.
   */
  async extractFromLatest(): Promise<GrokSignal[]> {
    const reportContent = await this.loadLatestReport();
    if (!reportContent) {
      logger.debug("[GrokExtractor] No report found");
      return [];
    }

    const recs = this.parseRecommendations(reportContent);
    const signals = recs.map((r) => this.toSignal(r));

    // Cache for aggregator consumption
    if (signals.length > 0) {
      await this.runtime.setCache(SIGNAL_CACHE_KEY, {
        signals,
        extractedAt: Date.now(),
      });
      this.lastExtraction = Date.now();
    }

    logger.info(
      `[GrokExtractor] Extracted ${signals.length} signals from daily report`,
    );
    return signals;
  }

  /**
   * Get cached signals (for aggregator to consume).
   */
  async getCachedSignals(): Promise<GrokSignal[]> {
    const cached = await this.runtime.getCache<{
      signals: GrokSignal[];
      extractedAt: number;
    }>(SIGNAL_CACHE_KEY);

    if (!cached) return [];
    if (Date.now() - cached.extractedAt > SIGNAL_TTL_MS) return [];

    return cached.signals;
  }

  // ==========================================
  // Parsing
  // ==========================================

  private parseRecommendations(content: string): GrokRecommendation[] {
    const recs: GrokRecommendation[] = [];

    // Pattern 1: "Today's Recommendations" section
    const recSection = this.extractSection(content, "recommendation");

    // Pattern 2: "Research Ideas" or "Top Picks"
    const researchSection = this.extractSection(content, "research idea");

    const sections = [recSection, researchSection].filter(Boolean);

    for (const section of sections) {
      if (!section) continue;
      const parsed = this.parseSection(section);
      recs.push(...parsed);
    }

    return recs;
  }

  private extractSection(content: string, keyword: string): string | null {
    const lines = content.split("\n");
    let capturing = false;
    let captured: string[] = [];

    for (const line of lines) {
      if (line.toLowerCase().includes(keyword) && line.startsWith("#")) {
        capturing = true;
        captured = [];
        continue;
      }
      if (capturing) {
        if (line.startsWith("#") && !line.startsWith("###")) {
          break;
        }
        captured.push(line);
      }
    }

    return captured.length > 0 ? captured.join("\n") : null;
  }

  private parseSection(section: string): GrokRecommendation[] {
    const recs: GrokRecommendation[] = [];
    const lines = section.split("\n");

    // Look for bullet points or numbered items with asset mentions
    const assetPattern =
      /\b(BTC|ETH|SOL|AVAX|DOGE|PEPE|WIF|BONK|JUP|ONDO|SUI|APT|ARB|OP|LINK|AAVE|UNI|MKR|SNX|CRV|INJ|TIA|NEAR|FTM|MATIC|ATOM|DOT|ADA|XRP|BNB|HYPE)\b/gi;
    const directionPattern = /\b(long|short|buy|sell|bullish|bearish)\b/gi;

    let currentAsset: string | null = null;
    let currentDirection: "long" | "short" = "long";
    let currentThesis: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (currentAsset && currentThesis.length > 0) {
          recs.push({
            asset: currentAsset.toUpperCase(),
            direction: currentDirection,
            confidence: 60,
            thesis: currentThesis.join(" ").slice(0, 200),
            source: "grok-daily-report",
            extractedAt: Date.now(),
          });
          currentAsset = null;
          currentThesis = [];
        }
        continue;
      }

      const assets = trimmed.match(assetPattern);
      const directions = trimmed.match(directionPattern);

      if (assets && assets.length > 0) {
        // Emit previous if any
        if (currentAsset && currentThesis.length > 0) {
          recs.push({
            asset: currentAsset.toUpperCase(),
            direction: currentDirection,
            confidence: 60,
            thesis: currentThesis.join(" ").slice(0, 200),
            source: "grok-daily-report",
            extractedAt: Date.now(),
          });
        }

        currentAsset = assets[0].toUpperCase();
        currentDirection = "long";
        currentThesis = [trimmed];

        if (directions) {
          const dir = directions[0].toLowerCase();
          if (dir === "short" || dir === "sell" || dir === "bearish") {
            currentDirection = "short";
          }
        }
      } else if (currentAsset) {
        currentThesis.push(trimmed);
      }
    }

    // Flush last
    if (currentAsset && currentThesis.length > 0) {
      recs.push({
        asset: currentAsset.toUpperCase(),
        direction: currentDirection,
        confidence: 60,
        thesis: currentThesis.join(" ").slice(0, 200),
        source: "grok-daily-report",
        extractedAt: Date.now(),
      });
    }

    return recs;
  }

  private toSignal(rec: GrokRecommendation): GrokSignal {
    return {
      source: "GrokIntelligence",
      asset: rec.asset,
      direction: rec.direction,
      strength: Math.min(80, rec.confidence + 10),
      confidence: rec.confidence,
      details: rec.thesis,
      timestamp: rec.extractedAt,
    };
  }

  // ==========================================
  // Report Loading
  // ==========================================

  private async loadLatestReport(): Promise<string | null> {
    try {
      const dir = path.join(process.cwd(), GROK_REPORTS_DIR);
      if (!fs.existsSync(dir)) return null;

      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse();

      if (files.length === 0) return null;

      const latest = files[0];
      const content = fs.readFileSync(path.join(dir, latest), "utf-8");

      // Only use if from today or yesterday
      const fileDate = latest.slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .slice(0, 10);

      if (fileDate !== today && fileDate !== yesterday) {
        logger.debug(`[GrokExtractor] Latest report (${fileDate}) is stale`);
        return null;
      }

      return content;
    } catch (e) {
      logger.warn(`[GrokExtractor] Failed to load report: ${e}`);
      return null;
    }
  }
}
