/**
 * Sub-agent orchestration for Grok Expert (Phase 2).
 * Runs six Grok calls (Alpha Hunter = 3 merged), optional web verification,
 * and a final synthesis for Section 10. Used by both the action and the task.
 */

import type { IAgentRuntime } from "@elizaos/core";
import { logger } from "@elizaos/core";
import {
  GROK_SUB_AGENTS,
  buildSubAgentUserPrompt,
} from "../config/grokSubAgents";
import {
  getWalletActivitySummary,
  runPreFlight,
  runSection1Grok,
} from "../memory/cryptoIntelPrePost";
import { getOrCreateXAIService } from "../services/fallbacks";
import { search } from "../utils/webSearch";

const GROK_MODEL = "grok-4-1-fast-reasoning";
const GROK_TEMPERATURE = 0.3;

/** Section-specific search query hints for optional web verification */
const SECTION_SEARCH_QUERIES: Record<string, string> = {
  market_structure: "BTC funding rates open interest today",
  ecosystem_defi: "DeFi TVL crypto ecosystem today",
  solana_trenches: "Solana memecoin pump.fun today",
  alpha_hunter: "crypto airdrop farming early alpha",
  risk_scanner: "crypto exploit vulnerability today",
  contrarian: "crypto market consensus narrative",
};

export interface RunSubAgentOptions {
  date?: string;
  runWebSearch?: boolean;
  /** When set, run pre-flight (load memory), generate Section 1 (Memory Review), and prepend to report. */
  memoryDir?: string;
}

/**
 * Run all sub-agents, optionally add web snippets per section, then synthesize Section 10.
 * Returns full markdown report (intro + sections 2–10).
 */
export async function runSubAgentOrchestration(
  runtime: IAgentRuntime,
  dataContextText: string,
  xVibeSummary: string,
  options: RunSubAgentOptions = {},
): Promise<string> {
  const xaiService = getOrCreateXAIService(runtime);
  if (!xaiService) {
    throw new Error("XAI service not available");
  }

  const runWebSearch = options.runWebSearch ?? true;
  const dateLabel = options.date ?? new Date().toLocaleDateString("en-US");
  const memoryDir = options.memoryDir;

  let section1Block = "";
  let activeRecommendationsSummary = "";
  if (memoryDir) {
    try {
      const pre = await runPreFlight(memoryDir, runtime, {
        runWebSearchForQuestions: true,
      });
      section1Block = await runSection1Grok(runtime, pre.memoryContext);
      activeRecommendationsSummary = pre.activeRecommendationsSummary || "";
    } catch (e) {
      logger.warn({ err: e }, "[GROK_SUB] Pre-flight / Section 1 failed");
      section1Block = "*(Memory review unavailable.)*";
    }
  }

  const systemPrefix = `Use this data context:\n${dataContextText}`;
  const sections: { number: number; title: string; body: string }[] = [];

  for (const config of GROK_SUB_AGENTS) {
    const sectionBodies: string[] = [];

    if (config.queryTemplates) {
      for (let i = 0; i < config.queryTemplates.length; i++) {
        const userPrompt = buildSubAgentUserPrompt(
          config,
          dataContextText,
          xVibeSummary,
          i,
        );
        const system = `${config.systemPrompt}\n\n${systemPrefix}`;
        try {
          const result = await xaiService.generateText({
            prompt: userPrompt,
            system,
            model: GROK_MODEL,
            temperature: GROK_TEMPERATURE,
            maxTokens: 2500,
          });
          if (result.success && result.text?.trim()) {
            sectionBodies.push(result.text.trim());
          }
        } catch (e) {
          logger.warn(
            { err: e, subAgent: config.id },
            "[GROK_SUB] Sub-agent call failed",
          );
        }
      }
    } else if (config.queryTemplate) {
      const userPrompt = buildSubAgentUserPrompt(
        config,
        dataContextText,
        xVibeSummary,
      );
      const system = `${config.systemPrompt}\n\n${systemPrefix}`;
      try {
        const result = await xaiService.generateText({
          prompt: userPrompt,
          system,
          model: GROK_MODEL,
          temperature: GROK_TEMPERATURE,
          maxTokens: 2500,
        });
        if (result.success && result.text?.trim()) {
          sectionBodies.push(result.text.trim());
        }
      } catch (e) {
        logger.warn(
          { err: e, subAgent: config.id },
          "[GROK_SUB] Sub-agent call failed",
        );
      }
    }

    let body = sectionBodies.join("\n\n---\n\n");
    if (runWebSearch) {
      const searchQuery = SECTION_SEARCH_QUERIES[config.id];
      if (searchQuery) {
        const snippets = await search(searchQuery, runtime, 2);
        if (snippets.length > 0) {
          body += "\n\nWeb check: " + snippets.join(" | ").slice(0, 500);
        }
      }
    }

    if (body) {
      sections.push({
        number: config.sectionNumber,
        title: config.sectionTitle,
        body,
      });
    }
  }

  // Section 6: wallet activity (Phase 5). Section 8: Grok call with EV format (Phase 4).
  let section6Body =
    "## 6. Smart Wallet Activity\n\n*(No tracked wallets or data.)*";
  if (memoryDir && xaiService) {
    try {
      const walletSummary = await getWalletActivitySummary(memoryDir, runtime, {
        maxWallets: 5,
      });
      const s6Result = await xaiService.generateText({
        prompt: `Summarize this smart wallet activity into Section 6: Smart Wallet Activity. Write 2-4 sentences. Focus on notable moves and any convergence (same token across wallets).\n\n${walletSummary}`,
        system:
          "You are a crypto intel analyst. Output only the section content (no ## 6 header).",
        model: GROK_MODEL,
        temperature: 0.2,
        maxTokens: 400,
      });
      if (s6Result.success && s6Result.text?.trim()) {
        section6Body = "## 6. Smart Wallet Activity\n\n" + s6Result.text.trim();
      }
    } catch (e) {
      logger.warn({ err: e }, "[GROK_SUB] Section 6 generation failed");
    }
  }
  let section8Body =
    "## 8. Today's Recommendations\n\n*(No recommendations generated.)*";
  if (xaiService) {
    try {
      const section8Prompt = `Generate Section 8: Today's Recommendations in this exact format.

Use the data context below. ${activeRecommendationsSummary ? `Lead with updates on open positions: ${activeRecommendationsSummary}` : ""}

Format:
## 8. Today's Recommendations

### BUYS
- TOKEN at $X.XX (mcap). Thesis: ... Target: ... Invalidation: ... Bull 30% +150%, Base 45% +20%, Bear 25% -60%. EV: +24.5%.

### SELLS
- (same format)

### WATCHLIST
- (same format)

Output only the section (## 8. ...) with 1-3 items per subsection. Use three-scenario EV (bull/base/bear probabilities and returns, then EV %).`;

      const s8Result = await xaiService.generateText({
        prompt:
          section8Prompt +
          "\n\nData context:\n" +
          dataContextText.slice(0, 4000),
        system:
          "You are a crypto intel analyst. Output only the Section 8 markdown.",
        model: GROK_MODEL,
        temperature: 0.3,
        maxTokens: 1500,
      });
      if (s8Result.success && s8Result.text?.trim()) {
        section8Body = s8Result.text.trim();
        if (!section8Body.startsWith("##"))
          section8Body = "## 8. Today's Recommendations\n\n" + section8Body;
      }
    } catch (e) {
      logger.warn({ err: e }, "[GROK_SUB] Section 8 generation failed");
    }
  }

  const ordered: { number: number; title: string; body: string }[] = [];
  const byNum = new Map(sections.map((s) => [s.number, s]));
  for (const num of [2, 3, 4, 5]) {
    const s = byNum.get(num);
    if (s) ordered.push(s);
  }
  ordered.push({
    number: 6,
    title: "Smart Wallet Activity",
    body: section6Body,
  });
  const s7 = byNum.get(7);
  if (s7) ordered.push(s7);
  ordered.push({
    number: 8,
    title: "Today's Recommendations",
    body: section8Body,
  });
  const s9 = byNum.get(9);
  if (s9) ordered.push(s9);

  let reportSoFar = ordered
    .map((s) =>
      s.body.startsWith("##")
        ? s.body
        : `## ${s.number}. ${s.title}\n\n${s.body}`,
    )
    .join("\n\n");

  // Section 10: synthesis
  try {
    const synthResult = await xaiService.generateText({
      prompt: `Synthesize this crypto intel report into Section 10: Summary. In 3-5 sentences, state the dominant themes, what changed if relevant, and the top 3-5 takeaways (what to buy, sell, or watch). Someone reading only this section should know the main conclusions.\n\n---\n\n${reportSoFar}`,
      system: "You are a crypto intel summarizer. Be concise and actionable.",
      model: GROK_MODEL,
      temperature: 0.2,
      maxTokens: 500,
    });
    if (synthResult.success && synthResult.text?.trim()) {
      reportSoFar += "\n\n## 10. Summary\n\n" + synthResult.text.trim();
    } else {
      reportSoFar += "\n\n## 10. Summary\n\n*(Synthesis skipped.)*";
    }
  } catch (e) {
    logger.warn({ err: e }, "[GROK_SUB] Section 10 synthesis failed");
    reportSoFar += "\n\n## 10. Summary\n\n*(Synthesis failed.)*";
  }

  let intro = `# Crypto Intel Daily Report (Sub-agents)

**Generated**: ${new Date().toISOString()}
**Date**: ${dateLabel}
**Mode**: Grok sub-agents (6 specialists + synthesis)

---

`;
  if (section1Block) {
    intro += `## 1. Memory Review and Previous Session Follow-Up

${section1Block}

---

`;
  }

  return intro + reportSoFar;
}
