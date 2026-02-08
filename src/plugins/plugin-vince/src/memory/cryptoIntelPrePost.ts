/**
 * Pre-flight and post-report for crypto intel (Phases 3–4).
 * Pre-flight: load session + intelligence log + open recommendations PnL, build memory context.
 * Post-report: extract findings, append to intelligence_log, update session_state, parse Section 8.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import { getOrCreateXAIService } from "../services/fallbacks";
import { search } from "../utils/webSearch";
import { getOpenRecommendations } from "./recommendations";
import { getTrackedWallets } from "./smartWallets";
import { readIntelligenceLog, appendIntelligenceLog } from "./intelligenceLog";
import { readSessionState, writeSessionState } from "./sessionState";
import type {
  IntelligenceLogEntry,
  SessionState,
  OpenInvestigation,
  RecommendationEntry,
} from "../types/cryptoIntelMemory";
import type { VinceMarketDataService } from "../services/marketData.service";

const GROK_MODEL = "grok-4-1-fast-reasoning";

/**
 * Build memory context string from session state, optional web answers, and open recommendations PnL (Phase 4).
 */
export async function runPreFlight(
  memoryDir: string,
  runtime: IAgentRuntime,
  options: { runWebSearchForQuestions?: boolean } = {},
): Promise<{ memoryContext: string; activeRecommendationsSummary: string }> {
  const session = await readSessionState(memoryDir);
  const logEntries = await readIntelligenceLog(memoryDir);

  const parts: string[] = [];
  if (session) {
    parts.push(`Last run: ${session.last_run || "never"}`);
    if (session.open_investigations?.length > 0) {
      parts.push(
        "Open investigations: " +
          session.open_investigations
            .map(
              (i: OpenInvestigation) =>
                `${i.finding}; next: ${(i.next_steps || []).join(", ")}`,
            )
            .join(" | "),
      );
    }
    if (session.questions_for_next_session?.length > 0) {
      parts.push("Questions for this session: " + session.questions_for_next_session.join("; "));
      if (options.runWebSearchForQuestions) {
        for (const q of session.questions_for_next_session) {
          const snippets = await search(q, runtime, 1);
          if (snippets.length > 0) {
            parts.push(`Answer for "${q.slice(0, 50)}...": ${snippets[0].slice(0, 200)}`);
          }
        }
      }
    }
  }
  if (logEntries.length > 0) {
    const recent = logEntries.slice(-5).map((e) => e.signal_description);
    parts.push("Recent intelligence log (last 5): " + recent.join(" | "));
  }

  let activeRecommendationsSummary = "";
  const openRecs = await getOpenRecommendations(memoryDir);
  if (openRecs.length > 0 && runtime) {
    const marketData = runtime.getService(
      "VINCE_MARKET_DATA_SERVICE",
    ) as VinceMarketDataService | null;
    const recParts: string[] = [];
    for (const rec of openRecs) {
      let pnlStr = "";
      if (marketData?.getEnrichedContext) {
        try {
          const ctx = await marketData.getEnrichedContext(rec.ticker);
          const current = ctx?.currentPrice ?? 0;
          if (current > 0 && rec.price > 0) {
            const pnlPct =
              rec.action === "buy"
                ? ((current - rec.price) / rec.price) * 100
                : ((rec.price - current) / rec.price) * 100;
            pnlStr = ` current $${current.toFixed(2)} PnL ${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`;
          }
        } catch {
          // skip
        }
      }
      recParts.push(
        `${rec.ticker} (${rec.action}) entry $${rec.price}${pnlStr}`,
      );
    }
    activeRecommendationsSummary = "Active recommendations: " + recParts.join("; ");
    parts.push(activeRecommendationsSummary);
  }

  const memoryContext = parts.length > 0 ? parts.join("\n") : "No prior session or log.";
  return { memoryContext, activeRecommendationsSummary };
}

/**
 * Build wallet activity summary for Section 6 (Phase 5). Optionally append convergence to intelligence_log.
 */
export async function getWalletActivitySummary(
  memoryDir: string,
  runtime: IAgentRuntime,
  options: { maxWallets?: number } = {},
): Promise<string> {
  const wallets = await getTrackedWallets(memoryDir);
  const active = wallets.filter((w) => w.active !== false).slice(0, options.maxWallets ?? 5);
  if (active.length === 0) return "No tracked smart wallets.";

  const parts: string[] = [];
  const tokensSeen = new Map<string, number>();

  for (const w of active) {
    const query = `Arkham ${w.address} recent activity`;
    const snippets = await search(query, runtime, 1);
    const label = w.label || w.address.slice(0, 8) + "…";
    if (snippets.length > 0) {
      parts.push(`Wallet ${label}: ${snippets[0].slice(0, 200)}`);
      const lower = snippets[0].toLowerCase();
      const tokenMatch = lower.match(/\b(btc|eth|sol|hype|[\$]?[a-z]{2,6})\b/g);
      if (tokenMatch) {
        for (const t of tokenMatch) {
          const key = t.replace("$", "").toUpperCase();
          if (key.length >= 2) tokensSeen.set(key, (tokensSeen.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const convergence: string[] = [];
  tokensSeen.forEach((count, token) => {
    if (count >= 2) convergence.push(`${token} (${count} wallets)`);
  });
  if (convergence.length > 0) {
    await appendIntelligenceLog(memoryDir, [{
      date: new Date().toISOString().slice(0, 10),
      category: "convergence",
      signal_description: `Smart wallet convergence: ${convergence.join(", ")}`,
      source: "smart_wallet",
      status: "new",
      tags: ["convergence"],
    }]);
    parts.push("Convergence: " + convergence.join(", "));
  }

  const logEntries = await readIntelligenceLog(memoryDir);
  const convFromLog = logEntries
    .filter((e) => e.source === "smart_wallet" && e.tags?.includes("convergence"))
    .slice(-3)
    .map((e) => e.signal_description);
  if (convFromLog.length > 0) {
    parts.push("Recent convergence from log: " + convFromLog.join(" | "));
  }

  return parts.length > 0 ? parts.join("\n") : "No wallet activity found.";
}

/**
 * Generate Section 1 (Memory Review) with a dedicated Grok call.
 */
export async function runSection1Grok(
  runtime: IAgentRuntime,
  memoryContext: string,
): Promise<string> {
  const xai = getOrCreateXAIService(runtime);
  if (!xai) return "";

  const result = await xai.generateText({
    prompt: `Summarize this memory context and previous session follow-up in 2-4 sentences. Focus on: what we were investigating, what questions we had, and what we know so far. If there is no prior context, say "First run; no prior memory."\n\nMemory context:\n${memoryContext}`,
    system: "You are a crypto intel analyst. Be concise.",
    model: GROK_MODEL,
    temperature: 0.2,
    maxTokens: 300,
  });

  if (result.success && result.text?.trim()) {
    return result.text.trim();
  }
  return "*(Memory review unavailable.)*";
}

/**
 * After report generation: extract findings, append to intelligence_log, update session_state.
 */
export async function runCryptoIntelPostReport(
  runtime: IAgentRuntime,
  memoryDir: string,
  fullReportMarkdown: string,
): Promise<void> {
  const xai = getOrCreateXAIService(runtime);
  const today = new Date().toISOString().slice(0, 10);

  // Extract findings via Grok
  let newEntries: IntelligenceLogEntry[] = [];
  if (xai) {
    try {
      const extractResult = await xai.generateText({
        prompt: `From this crypto intel report, extract 3-5 key findings. Return a JSON array of objects with keys: signal_description (string), category (string, e.g. market_structure, risk, alpha), source (string, use "grok"). No other text.\n\nReport:\n${fullReportMarkdown.slice(0, 12000)}`,
        system: "You output only valid JSON array. No markdown, no explanation.",
        model: GROK_MODEL,
        temperature: 0.1,
        maxTokens: 800,
      });
      if (extractResult.success && extractResult.text) {
        const text = extractResult.text.trim().replace(/^```\w*\n?|\n?```$/g, "").trim();
        const parsed = JSON.parse(text) as Array<{ signal_description?: string; category?: string; source?: string }>;
        if (Array.isArray(parsed)) {
          newEntries = parsed
            .filter((p) => p && p.signal_description)
            .map((p) => ({
              date: today,
              category: p.category || "general",
              signal_description: p.signal_description!,
              source: p.source || "grok",
              status: "new" as const,
            }));
        }
      }
    } catch (e) {
      logger.warn({ err: e }, "[CRYPTO_INTEL] Findings extraction failed");
    }
  }

  if (newEntries.length > 0) {
    await appendIntelligenceLog(memoryDir, newEntries);
  }

  // Phase 4: Extract Section 8
  const section8Match = fullReportMarkdown.match(/##\s*8\.\s*Today'?s?\s*Recommendations[\s\S]*?(?=##\s*9\.|##\s*10\.|$)/i);
  const section8Text = section8Match ? section8Match[0] : "";
  if (section8Text && xai) {
    try {
      const { appendRecommendations } = await import("./recommendations");
      const extractResult = await xai.generateText({
        prompt: `From this Section 8 text, extract all recommendations. Return a JSON array of objects. Each object: ticker (string), action ("buy"|"sell"|"watch"), price (number), thesis (string), target (string optional), invalidation (string optional), ev_bull_pct, ev_base_pct, ev_bear_pct, ev_bull_return, ev_base_return, ev_bear_return (numbers). No other text.\n\n${section8Text.slice(0, 3000)}`,
        system: "You output only a valid JSON array. No markdown, no explanation.",
        model: GROK_MODEL,
        temperature: 0.1,
        maxTokens: 1500,
      });
      if (extractResult.success && extractResult.text) {
        const text = extractResult.text.trim().replace(/^```\w*\n?|\n?```$/g, "").trim();
        const parsed = JSON.parse(text) as Array<Record<string, unknown>>;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const entries: RecommendationEntry[] = parsed
            .filter((p) => p && p.ticker && p.action)
            .map((p) => ({
              date: today,
              ticker: String(p.ticker),
              action: String(p.action).toLowerCase() as "buy" | "sell" | "watch",
              price: Number(p.price) || 0,
              thesis: String(p.thesis ?? ""),
              target: p.target != null ? String(p.target) : undefined,
              invalidation: p.invalidation != null ? String(p.invalidation) : undefined,
              status: "open" as const,
              ev_bull_pct: p.ev_bull_pct != null ? Number(p.ev_bull_pct) : undefined,
              ev_base_pct: p.ev_base_pct != null ? Number(p.ev_base_pct) : undefined,
              ev_bear_pct: p.ev_bear_pct != null ? Number(p.ev_bear_pct) : undefined,
              ev_bull_return: p.ev_bull_return != null ? Number(p.ev_bull_return) : undefined,
              ev_base_return: p.ev_base_return != null ? Number(p.ev_base_return) : undefined,
              ev_bear_return: p.ev_bear_return != null ? Number(p.ev_bear_return) : undefined,
            }));
          if (entries.length > 0) {
            await appendRecommendations(memoryDir, entries);
          }
        }
      }
    } catch (e) {
      logger.warn({ err: e }, "[CRYPTO_INTEL] Section 8 extraction failed");
    }
  }

  const session = await readSessionState(memoryDir);
  const nextState: SessionState = {
    last_run: new Date().toISOString(),
    open_investigations: session?.open_investigations ?? [],
    questions_for_next_session: session?.questions_for_next_session ?? [],
    contrarian_challenges: session?.contrarian_challenges ?? [],
  };
  await writeSessionState(memoryDir, nextState);
}
