/**
 * OTAKU_YIELD_RECOMMEND - AI-powered risk-adjusted yield recommendations
 *
 * Combines DefiLlama + Morpho APYs (and optional Nansen context) and uses
 * the runtime LLM to produce a short risk-adjusted recommendation.
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  ModelType,
  logger,
} from "@elizaos/core";
import type { MorphoService } from "../types/services";

interface YieldRow {
  protocol: string;
  token: string;
  chain: string;
  apy: number;
  tvl: number;
  risk: string;
}

async function fetchYieldOpportunities(
  runtime: IAgentRuntime,
  tokenFilter?: string,
  chainFilter?: string
): Promise<YieldRow[]> {
  const opportunities: YieldRow[] = [];
  const tokenUpper = tokenFilter?.toUpperCase();
  const chainLower = chainFilter?.toLowerCase();

  try {
    const llamaRes = await fetch("https://yields.llama.fi/pools", {
      signal: AbortSignal.timeout(8000),
    });
    if (llamaRes.ok) {
      const data = await llamaRes.json();
      const pools = data.data || [];
      const filtered = pools
        .filter((p: any) => {
          if (p.apy < 1) return false;
          if (chainLower && p.chain?.toLowerCase() !== chainLower) return false;
          if (tokenUpper && !p.symbol?.toUpperCase().includes(tokenUpper)) return false;
          if (p.tvlUsd < 100000) return false;
          return true;
        })
        .slice(0, 15)
        .map((p: any) => ({
          protocol: p.project || "Unknown",
          token: p.symbol?.split("-")[0] || p.symbol,
          chain: p.chain || "",
          apy: Math.round(p.apy * 100) / 100,
          tvl: Math.round(p.tvlUsd || 0),
          risk: p.ilRisk === "no" && p.apy < 20 ? "low" : p.apy > 50 ? "high" : "medium",
        }));
      opportunities.push(...filtered);
    }
  } catch (err) {
    logger.debug(`[OTAKU] DefiLlama yields fetch failed: ${err}`);
  }

  const morpho = runtime.getService("morpho") as MorphoService | null;
  if (morpho?.getVaultApy) {
    for (const asset of ["USDC", "WETH", "ETH"]) {
      if (tokenUpper && asset !== tokenUpper && !tokenUpper.includes(asset)) continue;
      try {
        const apy = await morpho.getVaultApy(asset);
        if (apy > 0) {
          opportunities.push({
            protocol: "Morpho",
            token: asset,
            chain: "base",
            apy: Math.round(apy * 100) / 100,
            tvl: 0,
            risk: "low",
          });
        }
      } catch {
        // skip
      }
    }
  }

  opportunities.sort((a, b) => b.apy - a.apy);
  return opportunities.slice(0, 12);
}

export const otakuYieldRecommendAction: Action = {
  name: "OTAKU_YIELD_RECOMMEND",
  description:
    "Get AI-powered, risk-adjusted yield recommendations combining DefiLlama and Morpho APYs. Use when the user asks for yield opportunities, where to put stables, or best APY.",
  similes: ["YIELD_OPTIMIZER", "BEST_YIELD", "WHERE_TO_EARN", "YIELD_RECOMMENDATION"],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Where should I put my USDC for yield?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Yield recommendation:** For USDC, Morpho Blue on Base offers ~5% APY with low risk. DefiLlama shows a few other stable pools above 4% with $1M+ TVL. I’d favor Morpho for stability and audited code.",
          actions: ["OTAKU_YIELD_RECOMMEND"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return (
      text.includes("yield") ||
      text.includes("apy") ||
      text.includes("where to put") ||
      text.includes("earn on") ||
      text.includes("best rate") ||
      (text.includes("stables") && text.includes("earn"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";
    const tokenMatch = text.match(/(?:usdc|usdt|eth|weth|stables?)/i);
    const chainMatch = text.match(/(?:base|ethereum|arbitrum|polygon)/i);
    const tokenFilter = tokenMatch ? tokenMatch[0] : undefined;
    const chainFilter = chainMatch ? chainMatch[0] : undefined;

    const opportunities = await fetchYieldOpportunities(runtime, tokenFilter, chainFilter);
    if (opportunities.length === 0) {
      await callback?.({
        text: "I couldn’t load yield data right now (DefiLlama or Morpho may be unavailable). Try again in a moment or ask for “yields” with a token (e.g. USDC) or chain (e.g. Base).",
      });
      return { success: true };
    }

    const summary = opportunities
      .map((o) => `${o.protocol} ${o.token} ${o.chain}: ${o.apy}% APY, ${o.risk} risk${o.tvl ? `, TVL $${(o.tvl / 1e6).toFixed(1)}M` : ""}`)
      .join("\n");

    if (!runtime.useModel) {
      const top = opportunities.slice(0, 5);
      const lines = [
        "**Yield opportunities (risk-adjusted):**",
        "",
        ...top.map((o) => `- **${o.protocol}** ${o.token} on ${o.chain}: ${o.apy}% APY (${o.risk} risk)${o.tvl ? `, TVL $${(o.tvl / 1e6).toFixed(1)}M` : ""}`),
        "",
        "For stability, prefer low-risk options with high TVL. Morpho Blue is often a solid choice for stables.",
      ];
      await callback?.({ text: lines.join("\n") });
      return { success: true };
    }

    try {
      const prompt = `You are a DeFi yield advisor. Given these current yield opportunities (from DefiLlama and Morpho), give a 2–4 sentence risk-adjusted recommendation. Prefer stability and TVL for stables; mention one or two concrete options. No bullet lists—plain prose.

Opportunities:
${summary}

Recommendation:`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
        maxTokens: 220,
        temperature: 0.4,
      });
      const out = typeof response === "string" ? response : String(response ?? "").trim();
      const recommendation = out || "Consider Morpho for stables (low risk) and check DefiLlama for other chains.";
      await callback?.({
        text: `**Yield recommendation:** ${recommendation}`,
      });
      return { success: true };
    } catch (err) {
      logger.warn(`[OTAKU] Yield recommend LLM failed: ${err}`);
      const fallback = opportunities
        .slice(0, 3)
        .map((o) => `${o.protocol} ${o.token}: ${o.apy}% (${o.risk})`)
        .join("; ");
      await callback?.({
        text: `**Yield snapshot:** ${fallback}. For stables, Morpho Blue on Base is usually a low-risk option.`,
      });
      return { success: true };
    }
  },
};

export default otakuYieldRecommendAction;
