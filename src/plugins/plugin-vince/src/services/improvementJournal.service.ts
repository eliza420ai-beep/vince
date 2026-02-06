/**
 * VINCE Improvement Journal Service
 *
 * Generates structured improvement entries for ClawdBot to process:
 * - Bug reports (API failures, exceptions)
 * - Performance issues (signal sources underperforming)
 * - Enhancement suggestions (new patterns discovered)
 * - Code change requests (specific patches with diffs)
 *
 * This is the bridge between ElizaOS learning and ClawdBot code execution.
 * ClawdBot monitors the journal file and applies changes autonomously.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import { dynamicConfig } from "../config/dynamicConfig";

// ==========================================
// Types
// ==========================================

type EntryType =
  | "BUG_REPORT"
  | "PERFORMANCE_ISSUE"
  | "ENHANCEMENT_SUGGESTION"
  | "CODE_CHANGE_REQUEST";

type EntryStatus =
  | "PENDING_CLAWDBOT"
  | "APPLIED"
  | "FAILED"
  | "HUMAN_REVIEW_REQUIRED"
  | "REJECTED";

interface ImprovementEntry {
  id: string;
  timestamp: number;
  type: EntryType;
  status: EntryStatus;
  issue: string;
  analysis: string[];
  suggestedFix?: string;
  codeLocation?: string;
  patch?: string;
  confidence: "low" | "medium" | "high";
  metadata?: Record<string, any>;
  resolution?: {
    timestamp: number;
    status: EntryStatus;
    message?: string;
  };
}

// ==========================================
// Configuration
// ==========================================

const CONFIG = {
  journalFileName: "improvement-journal.md",
  maxEntriesInMemory: 100,
  rateLimitMs: 5 * 60 * 1000, // Max 1 entry per 5 minutes per type
};

// ==========================================
// Service Implementation
// ==========================================

export class VinceImprovementJournalService extends Service {
  static serviceType = "VINCE_IMPROVEMENT_JOURNAL_SERVICE";
  capabilityDescription =
    "Generates structured improvement entries for ClawdBot";

  private journalPath: string | null = null;
  private entries: ImprovementEntry[] = [];
  private lastEntryTime: Map<EntryType, number> = new Map();
  private initialized = false;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<VinceImprovementJournalService> {
    const service = new VinceImprovementJournalService(runtime);
    await service.initialize();
    logger.info("[VinceImprovementJournal] ✅ Service started");
    return service;
  }

  async stop(): Promise<void> {
    await this.save();
    logger.info("[VinceImprovementJournal] Service stopped");
  }

  private async initialize(): Promise<void> {
    try {
      const elizaDbDir = path.join(process.cwd(), ".elizadb");
      const persistDir = path.join(elizaDbDir, PERSISTENCE_DIR);

      if (!fs.existsSync(persistDir)) {
        fs.mkdirSync(persistDir, { recursive: true });
      }

      this.journalPath = path.join(persistDir, CONFIG.journalFileName);

      // Load existing entries (parse from markdown)
      if (fs.existsSync(this.journalPath)) {
        this.loadFromFile();
      } else {
        // Create initial file with header
        await this.createJournalFile();
      }

      this.initialized = true;
    } catch (error) {
      logger.warn(`[VinceImprovementJournal] Could not initialize: ${error}`);
      this.initialized = true; // Continue without persistence
    }
  }

  private async createJournalFile(): Promise<void> {
    if (!this.journalPath) return;

    const header = `# VINCE Improvement Journal

This file contains structured improvement entries for ClawdBot to process.
ClawdBot monitors this file and applies patches with status \`PENDING_CLAWDBOT\`.

## Status Definitions

- \`PENDING_CLAWDBOT\`: Ready for ClawdBot to process
- \`APPLIED\`: Successfully applied by ClawdBot
- \`FAILED\`: ClawdBot attempted but failed (tests failed)
- \`HUMAN_REVIEW_REQUIRED\`: Needs human attention
- \`REJECTED\`: Rejected by human or system

---

`;
    fs.writeFileSync(this.journalPath, header);
  }

  private loadFromFile(): void {
    if (!this.journalPath) return;

    try {
      const content = fs.readFileSync(this.journalPath, "utf-8");
      // Parse entries from markdown (simplified - just track pending count)
      const pendingCount = (content.match(/Status:\s*PENDING_CLAWDBOT/g) || [])
        .length;
      logger.info(
        `[VinceImprovementJournal] Found ${pendingCount} pending entries`,
      );
    } catch (error) {
      logger.warn(`[VinceImprovementJournal] Could not load journal: ${error}`);
    }
  }

  private async save(): Promise<void> {
    // Journal is appended directly, no need for separate save
  }

  // ==========================================
  // Rate Limiting
  // ==========================================

  private canAddEntry(type: EntryType): boolean {
    const lastTime = this.lastEntryTime.get(type);
    if (!lastTime) return true;
    return Date.now() - lastTime >= CONFIG.rateLimitMs;
  }

  private markEntryAdded(type: EntryType): void {
    this.lastEntryTime.set(type, Date.now());
  }

  // ==========================================
  // Entry Generation
  // ==========================================

  /**
   * Record a bug (API failure, exception, etc.)
   */
  async recordBug(params: {
    service: string;
    error: string;
    context?: string;
    stackTrace?: string;
  }): Promise<boolean> {
    if (!this.canAddEntry("BUG_REPORT")) {
      logger.debug("[VinceImprovementJournal] Rate limited: BUG_REPORT");
      return false;
    }

    const entry: ImprovementEntry = {
      id: `bug_${Date.now()}`,
      timestamp: Date.now(),
      type: "BUG_REPORT",
      status: "HUMAN_REVIEW_REQUIRED", // Bugs need human review
      issue: `Error in ${params.service}: ${params.error}`,
      analysis: [
        `Service: ${params.service}`,
        `Error: ${params.error}`,
        params.context ? `Context: ${params.context}` : "",
      ].filter(Boolean),
      confidence: "high",
      metadata: {
        stackTrace: params.stackTrace,
      },
    };

    await this.appendEntry(entry);
    this.markEntryAdded("BUG_REPORT");

    logger.info(`[VinceImprovementJournal] Bug recorded: ${params.service}`);
    return true;
  }

  /**
   * Record a performance issue (signal source underperforming, etc.)
   */
  async recordPerformanceIssue(params: {
    pattern: string;
    description: string;
    winRate: number;
    sampleSize: number;
    suggestedAction?: string;
    signalSources?: string[];
  }): Promise<boolean> {
    if (!this.canAddEntry("PERFORMANCE_ISSUE")) {
      logger.debug("[VinceImprovementJournal] Rate limited: PERFORMANCE_ISSUE");
      return false;
    }

    const {
      pattern,
      description,
      winRate,
      sampleSize,
      suggestedAction,
      signalSources,
    } = params;
    const confidence =
      sampleSize >= 20 ? "high" : sampleSize >= 10 ? "medium" : "low";

    // Determine if this should be a code change request
    const isCodeChangeWorthy =
      confidence === "high" &&
      signalSources &&
      signalSources.length > 0 &&
      (winRate < 35 || winRate > 70);

    const entry: ImprovementEntry = {
      id: `perf_${Date.now()}`,
      timestamp: Date.now(),
      type: isCodeChangeWorthy ? "CODE_CHANGE_REQUEST" : "PERFORMANCE_ISSUE",
      status: isCodeChangeWorthy ? "PENDING_CLAWDBOT" : "HUMAN_REVIEW_REQUIRED",
      issue: description,
      analysis: [
        `Pattern: ${pattern}`,
        `Win Rate: ${winRate.toFixed(1)}%`,
        `Sample Size: ${sampleSize} trades`,
        signalSources?.length
          ? `Signal Sources: ${signalSources.join(", ")}`
          : "",
      ].filter(Boolean),
      suggestedFix: suggestedAction,
      confidence,
      metadata: {
        winRate,
        sampleSize,
        signalSources,
      },
    };

    // Generate patch for code change requests
    if (isCodeChangeWorthy && signalSources) {
      entry.patch = this.generateWeightPatch(signalSources, winRate);
      entry.codeLocation =
        "src/plugins/plugin-vince/src/config/dynamicConfig.ts";
    }

    await this.appendEntry(entry);
    this.markEntryAdded("PERFORMANCE_ISSUE");

    logger.info(
      `[VinceImprovementJournal] Performance issue recorded: ${pattern} (${winRate.toFixed(1)}% win rate)`,
    );
    return true;
  }

  /**
   * Record an enhancement suggestion
   */
  async recordEnhancement(params: {
    title: string;
    description: string;
    rationale: string;
    implementation?: string;
  }): Promise<boolean> {
    if (!this.canAddEntry("ENHANCEMENT_SUGGESTION")) {
      logger.debug(
        "[VinceImprovementJournal] Rate limited: ENHANCEMENT_SUGGESTION",
      );
      return false;
    }

    const entry: ImprovementEntry = {
      id: `enh_${Date.now()}`,
      timestamp: Date.now(),
      type: "ENHANCEMENT_SUGGESTION",
      status: "HUMAN_REVIEW_REQUIRED",
      issue: params.title,
      analysis: [params.description, `Rationale: ${params.rationale}`],
      suggestedFix: params.implementation,
      confidence: "medium",
    };

    await this.appendEntry(entry);
    this.markEntryAdded("ENHANCEMENT_SUGGESTION");

    logger.info(
      `[VinceImprovementJournal] Enhancement recorded: ${params.title}`,
    );
    return true;
  }

  /**
   * Record a specific code change request
   */
  async recordCodeChange(params: {
    issue: string;
    analysis: string[];
    codeLocation: string;
    patch: string;
    confidence: "low" | "medium" | "high";
    autoApply?: boolean;
  }): Promise<boolean> {
    if (!this.canAddEntry("CODE_CHANGE_REQUEST")) {
      logger.debug(
        "[VinceImprovementJournal] Rate limited: CODE_CHANGE_REQUEST",
      );
      return false;
    }

    const entry: ImprovementEntry = {
      id: `code_${Date.now()}`,
      timestamp: Date.now(),
      type: "CODE_CHANGE_REQUEST",
      status:
        params.autoApply && params.confidence === "high"
          ? "PENDING_CLAWDBOT"
          : "HUMAN_REVIEW_REQUIRED",
      issue: params.issue,
      analysis: params.analysis,
      codeLocation: params.codeLocation,
      patch: params.patch,
      confidence: params.confidence,
    };

    await this.appendEntry(entry);
    this.markEntryAdded("CODE_CHANGE_REQUEST");

    logger.info(
      `[VinceImprovementJournal] Code change recorded: ${params.issue}`,
    );
    return true;
  }

  // ==========================================
  // Patch Generation
  // ==========================================

  /**
   * Generate a patch for adjusting signal source weights
   */
  private generateWeightPatch(sources: string[], winRate: number): string {
    const currentWeights = dynamicConfig.getAllSourceWeights();
    const lines: string[] = [];

    for (const source of sources) {
      const currentWeight = currentWeights[source] ?? 1.0;
      let newWeight: number;

      if (winRate >= 70) {
        // High performer: increase weight
        newWeight = Math.min(3.0, currentWeight + 0.2);
      } else if (winRate < 35) {
        // Low performer: decrease weight
        newWeight = Math.max(0.1, currentWeight - 0.2);
      } else {
        continue; // No change needed
      }

      lines.push(`-  ${source}: ${currentWeight.toFixed(1)},`);
      lines.push(
        `+  ${source}: ${newWeight.toFixed(1)},  // Auto-tuned: ${winRate.toFixed(1)}% win rate`,
      );
    }

    return lines.join("\n");
  }

  // ==========================================
  // File Operations
  // ==========================================

  private async appendEntry(entry: ImprovementEntry): Promise<void> {
    if (!this.journalPath) return;

    this.entries.push(entry);

    // Trim if needed
    if (this.entries.length > CONFIG.maxEntriesInMemory) {
      this.entries = this.entries.slice(-CONFIG.maxEntriesInMemory);
    }

    // Append to file
    const markdown = this.formatEntryAsMarkdown(entry);

    try {
      fs.appendFileSync(this.journalPath, markdown);
    } catch (error) {
      logger.error(`[VinceImprovementJournal] Could not write entry: ${error}`);
    }
  }

  private formatEntryAsMarkdown(entry: ImprovementEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();

    let md = `\n## [${timestamp}] ${entry.type}\n\n`;
    md += `### Issue\n${entry.issue}\n\n`;
    md += `### Analysis\n`;

    for (const line of entry.analysis) {
      md += `- ${line}\n`;
    }
    md += "\n";

    if (entry.suggestedFix) {
      md += `### Suggested Fix\n${entry.suggestedFix}\n\n`;
    }

    if (entry.codeLocation) {
      md += `### Code Location\n\`${entry.codeLocation}\`\n\n`;
    }

    if (entry.patch) {
      md += `### Patch\n\`\`\`diff\n${entry.patch}\n\`\`\`\n\n`;
    }

    md += `### Confidence\n${entry.confidence.toUpperCase()}\n\n`;
    md += `### Status\n${entry.status}\n\n`;
    md += `---\n`;

    return md;
  }

  // ==========================================
  // Public API
  // ==========================================

  /**
   * Get pending entries for ClawdBot
   */
  getPendingEntries(): ImprovementEntry[] {
    return this.entries.filter((e) => e.status === "PENDING_CLAWDBOT");
  }

  /**
   * Get all entries
   */
  getAllEntries(): ImprovementEntry[] {
    return [...this.entries];
  }

  /**
   * Get entry count by type
   */
  getEntryCounts(): Record<EntryType, number> {
    const counts: Record<EntryType, number> = {
      BUG_REPORT: 0,
      PERFORMANCE_ISSUE: 0,
      ENHANCEMENT_SUGGESTION: 0,
      CODE_CHANGE_REQUEST: 0,
    };

    for (const entry of this.entries) {
      counts[entry.type]++;
    }

    return counts;
  }

  /**
   * Get journal file path
   */
  getJournalPath(): string | null {
    return this.journalPath;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
