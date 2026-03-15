/**
 * Research Autopilot Service — orchestrate Watchlist Radar → dossiers → X enrichment → synthesis → essay draft.
 * PRD: Watchlist-to-Substack Autopilot.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";
import type {
  ResearchAutopilotRunConfig,
  ResearchAutopilotSelectionMode,
  ResearchAutopilotRunStatus,
  ResearchAutopilotRunLedgerEntry,
} from "../research-autopilot/types";
import { RESEARCH_AUTOPILOT_MAX_TICKERS_DEFAULT } from "../research-autopilot/types";
import {
  loadWatchlistCandidates,
  selectSymbols,
  buildDossiersFromCandidates,
} from "../research-autopilot/dossierBuilder";
import { enrichTickers } from "../research-autopilot/xEnrichment";
import { buildSynthesisMarkdown } from "../research-autopilot/synthesisBuilder";
import { generateDraftFromSynthesis } from "../research-autopilot/draftFromSynthesis";
import {
  getArtifactPaths,
  ensureDir,
  appendRunLedger,
} from "../research-autopilot/artifactPaths";

const PROJECT_ROOT = process.cwd();

export class ResearchAutopilotService extends Service {
  static serviceType = "RESEARCH_AUTOPILOT_SERVICE";
  capabilityDescription =
    "Watchlist-to-Substack autopilot: selection → dossiers → X enrichment → synthesis → essay draft";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(
    runtime: IAgentRuntime,
  ): Promise<ResearchAutopilotService> {
    const service = new ResearchAutopilotService(runtime);
    logger.info("[ResearchAutopilot] Service started");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[ResearchAutopilot] Service stopped");
  }

  /**
   * Run the full pipeline: select tickers → dossiers → enrich → synthesis → draft.
   * Writes all artifacts and appends to run ledger.
   */
  async run(config: ResearchAutopilotRunConfig): Promise<{
    runId: string;
    status: ResearchAutopilotRunStatus;
    symbols: string[];
    artifactPaths: Record<string, string>;
    essayTitle?: string;
    errors: string[];
  }> {
    const runId = uuidv4();
    const runDate = new Date().toISOString().slice(0, 10);
    const maxCount =
      config.maxTickerCount ?? RESEARCH_AUTOPILOT_MAX_TICKERS_DEFAULT;
    const errors: string[] = [];
    const artifactPaths: Record<string, string> = {};

    const paths = getArtifactPaths(PROJECT_ROOT, runDate);
    if (!ensureDir(path.dirname(paths.selectionPath))) {
      errors.push("Failed to create artifact directory");
      this.appendLedger(
        runId,
        config.selectionMode,
        [],
        "failed",
        paths,
        errors,
      );
      return { runId, status: "failed", symbols: [], artifactPaths, errors };
    }
    ensureDir(paths.dossiersDir);

    // 1. Load candidates and select symbols
    const candidates = loadWatchlistCandidates(PROJECT_ROOT);
    if (!candidates) {
      errors.push("portfolio_watchlist_candidates.json not found or invalid");
      this.appendLedger(
        runId,
        config.selectionMode,
        [],
        "failed",
        paths,
        errors,
      );
      return { runId, status: "failed", symbols: [], artifactPaths, errors };
    }

    const symbols = selectSymbols(
      candidates,
      config.selectionMode,
      maxCount,
      config.customSymbols,
    );
    if (symbols.length === 0) {
      errors.push("No symbols selected for this mode");
      this.appendLedger(
        runId,
        config.selectionMode,
        [],
        "failed",
        paths,
        errors,
      );
      return { runId, status: "failed", symbols: [], artifactPaths, errors };
    }

    fs.writeFileSync(
      paths.selectionPath,
      JSON.stringify(
        { runId, runDate, selectionMode: config.selectionMode, symbols },
        null,
        2,
      ),
      "utf-8",
    );
    artifactPaths.selection = paths.selectionPath;

    // 2. Build dossiers
    const dossiers = buildDossiersFromCandidates(candidates, symbols);
    for (const d of dossiers) {
      const md = `# ${d.symbol}\n\n**Source**: ${d.sourceBucket}\n**Reason**: ${d.discoveryReason}\n`;
      const p = path.join(paths.dossiersDir, `${d.symbol}.md`);
      fs.writeFileSync(p, md, "utf-8");
    }
    artifactPaths.dossiersDir = paths.dossiersDir;

    // 3. X enrichment (placeholder if no fetcher)
    const enrichments = await enrichTickers(symbols);
    fs.writeFileSync(
      paths.xEnrichmentPath,
      JSON.stringify(enrichments, null, 2),
      "utf-8",
    );
    artifactPaths.xEnrichment = paths.xEnrichmentPath;

    // 4. Synthesis
    const synthesisMarkdown = buildSynthesisMarkdown(dossiers, enrichments);
    fs.writeFileSync(paths.synthesisPath, synthesisMarkdown, "utf-8");
    artifactPaths.synthesis = paths.synthesisPath;

    // 5. Draft
    let essayTitle: string | undefined;
    try {
      const draft = await generateDraftFromSynthesis(
        this.runtime,
        synthesisMarkdown,
      );
      if (draft) {
        fs.writeFileSync(paths.essayDraftPath, draft, "utf-8");
        artifactPaths.essayDraft = paths.essayDraftPath;
        const titleMatch = draft.match(/^#\s+(.+)$/m);
        essayTitle = titleMatch?.[1]?.trim();
      } else {
        errors.push("Draft generation returned empty or too short");
      }
    } catch (e) {
      errors.push(String(e));
    }

    const status: ResearchAutopilotRunStatus =
      errors.length === 0 ? "completed" : "failed";
    this.appendLedger(
      runId,
      config.selectionMode,
      symbols,
      status,
      paths,
      errors,
      essayTitle,
    );

    return {
      runId,
      status,
      symbols,
      artifactPaths,
      essayTitle,
      errors,
    };
  }

  private appendLedger(
    runId: string,
    selectionMode: ResearchAutopilotSelectionMode,
    symbols: string[],
    status: ResearchAutopilotRunStatus,
    paths: ReturnType<typeof getArtifactPaths>,
    errors: string[],
    essayTitle?: string,
  ): void {
    const entry: ResearchAutopilotRunLedgerEntry = {
      runId,
      createdAt: Date.now(),
      selectionMode,
      symbols,
      status,
      artifactPaths: {
        runDate: paths.runDate,
        selectionPath: paths.selectionPath,
        dossiersDir: paths.dossiersDir,
        xEnrichmentPath: paths.xEnrichmentPath,
        synthesisPath: paths.synthesisPath,
        essayDraftPath: paths.essayDraftPath,
      },
      essayTitle,
      errors: errors.length ? errors : undefined,
    };
    appendRunLedger(PROJECT_ROOT, entry);
  }
}
