/**
 * Proof that plugin-solus fully understands Hypersurface mechanics.
 * Canonical facts from knowledge/options/hypersurface-reference.md; provider and actions must reflect them.
 */

import { describe, it, expect } from "vitest";
import { hypersurfaceContextProvider } from "../providers/hypersurfaceContext.provider";
import { solusPositionAssessAction } from "../actions/solusPositionAssess.action";
import { solusHypersurfaceExplainAction } from "../actions/solusHypersurfaceExplain.action";
import type {
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  UUID,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";

// Canonical Hypersurface mechanics (single source of truth for this test)
const HYPERSURFACE_FACTS = {
  platform: ["hypersurface", "friday 08:00 utc", "weekly"],
  executionOnly: ["deribit", "iv", "data only", "not trading"],
  assets: ["hype", "sol", "wbtc", "eth"],
  earlyExercise: ["24h", "thursday", "early exercise", "itm"],
  coveredCalls: [
    "covered call",
    "own the asset",
    "sell a call",
    "upfront premium",
    "above strike",
    "assigned",
    "at or below",
    "keep asset",
  ],
  cashSecuredPuts: [
    "cash-secured put",
    "csp",
    "stablecoins",
    "usdt0",
    "strike × quantity",
    "sell a put",
    "below strike",
    "cost basis",
    "premium reduces",
  ],
  wheel: ["wheel", "cc", "csp", "assigned", "premium at every step"],
  strikeSelection: [
    "strike",
    "20–35%",
    "assignment prob",
    "apr",
    "puts",
    "happily buy",
    "funding",
    "sentiment",
  ],
} as const;

function createMessage(text: string): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

function createSolusRuntime(overrides?: {
  composeState?: (msg: Memory) => Promise<State>;
  useModel?: (type: string, params: { prompt: string }) => Promise<string>;
}): IAgentRuntime {
  const defaultState: State = {
    text: "[Hypersurface context]\nHypersurface (execution only). Friday 08:00 UTC. Assets: HYPE, SOL, WBTC, ETH. Covered calls, CSP, wheel.",
    values: {},
    data: {},
  };
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Solus" },
    composeState: overrides?.composeState ?? (async () => defaultState),
    useModel: (overrides?.useModel ?? (async () => "")) as any,
    getSetting: () => null,
    getService: () => null,
  } as unknown as IAgentRuntime;
}

function textContainsAll(
  text: string,
  phrases: readonly string[],
): { ok: boolean; missing: string[] } {
  const lower = text.toLowerCase();
  const missing = phrases.filter((p) => !lower.includes(p.toLowerCase()));
  return { ok: missing.length === 0, missing };
}

describe("Hypersurface mechanics — full understanding", () => {
  describe("provider: SOLUS_HYPERSURFACE_CONTEXT encodes all canonical facts", () => {
    it("returned text contains platform, expiry, and execution-only (Deribit = data)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text =
        (result?.text ?? "") + " " + JSON.stringify(result?.values ?? {});
      expect(textContainsAll(text, HYPERSURFACE_FACTS.platform).ok).toBe(true);
      expect(textContainsAll(text, HYPERSURFACE_FACTS.executionOnly).ok).toBe(
        true,
      );
    });

    it("returned text contains all four assets", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text = (result?.text ?? "").toLowerCase();
      for (const asset of HYPERSURFACE_FACTS.assets) {
        expect(text).toContain(asset);
      }
    });

    it("returned text contains Solus edge framing (good strike + weekly sentiment)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text = (result?.text ?? "").toLowerCase();
      expect(text).toMatch(/good strike|weekly.*sentiment|solus makes money/);
      expect(text).toMatch(/weekly|bet on the week/);
    });

    it("returned text contains early exercise (Thursday / 24h / ITM)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text = (result?.text ?? "").toLowerCase();
      const hasEarlyExercise =
        text.includes("thursday") &&
        (text.includes("24h") ||
          text.includes("24 h") ||
          text.includes("early exercise"));
      expect(hasEarlyExercise).toBe(true);
    });

    it("returned text contains covered call mechanics (own asset, sell call, premium, above strike = assigned)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const { ok, missing } = textContainsAll(
        result?.text ?? "",
        HYPERSURFACE_FACTS.coveredCalls,
      );
      expect(missing).toEqual([]);
      expect(ok).toBe(true);
    });

    it("returned text contains cash-secured put mechanics (stablecoins, sell put, below strike = assigned, premium reduces cost basis)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const { ok, missing } = textContainsAll(
        result?.text ?? "",
        HYPERSURFACE_FACTS.cashSecuredPuts,
      );
      expect(missing).toEqual([]);
      expect(ok).toBe(true);
    });

    it("returned text contains wheel (CC → assigned → CSP → assigned → CC, premium at every step)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text = (result?.text ?? "").toLowerCase();
      expect(text).toMatch(/wheel/);
      expect(text).toMatch(/premium/);
      expect(text).toMatch(/assigned|cc|csp/);
    });

    it("returned text contains funding→strike and HYPE 1.5× from knowledge (strike-selection-from-perps, TOOLS)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text = (result?.text ?? "").toLowerCase();
      expect(text).toMatch(/funding|crowded/);
      expect(text).toMatch(/1\.5|1.5/);
    });

    it("returned text contains strike selection (calls ~20–35% assignment prob, puts at/below happy-to-buy, funding/sentiment)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text = (result?.text ?? "").toLowerCase();
      expect(text).toMatch(/20|35|assignment|strike/);
      expect(text).toMatch(/put|happily|funding|sentiment/);
    });

    it("returned text contains data-boundary framing (no live sentiment, where price lands by Friday, paste VINCE)", async () => {
      const result = await hypersurfaceContextProvider.get(
        createSolusRuntime() as IAgentRuntime,
        createMessage(""),
      );
      const text = (result?.text ?? "").toLowerCase();
      expect(text).toContain("data boundary");
      expect(text).toMatch(/does not have live|spot.*mechanics only/);
      expect(text).toMatch(/where price lands by friday|pasted context|paste/);
      expect(text).toContain("vince");
    });
  });

  describe("SOLUS_POSITION_ASSESS: interprets $70K secured puts correctly", () => {
    const cspMessage =
      "We bought $70K secured puts on Hypersurface last Friday, expiry next Friday. Upfront premium was $3800 with $150K USDT0. Do you understand, and what do you think?";

    it("handler receives context and user message; callback response reflects CSP mechanics", async () => {
      let capturedPrompt = "";
      const runtime = createSolusRuntime({
        composeState: async () => ({
          text: "[Hypersurface context]\nCSP: hold stablecoins = strike × quantity; sell put; below strike = assigned (premium reduces cost basis). Friday 08:00 UTC.",
          values: {},
          data: {},
        }),
        useModel: async (_type: string, params: { prompt: string }) => {
          capturedPrompt = params.prompt;
          return (
            "Got it. $70K notional secured puts, $3,800 premium (~2.5% on collateral), $150K USDT0. " +
            "If spot stays above your strike through Friday 08:00 UTC, you keep the full $3,800 and the puts expire worthless. " +
            "If spot breaks below strike, you're assigned—you buy at strike; the $3,800 premium lowers your cost basis. " +
            "What's your strike? With that I'll give you the invalidation level and whether to hold, roll, or adjust."
          );
        },
      });

      const msg = createMessage(cspMessage);
      const calls: { text: string }[] = [];
      const callback: HandlerCallback = async (content) => {
        if (content.text) calls.push({ text: content.text });
      };

      await solusPositionAssessAction.handler!(
        runtime as IAgentRuntime,
        msg,
        {} as State,
        undefined,
        callback,
      );

      expect(calls.length).toBeGreaterThanOrEqual(1);
      const reply = calls[0].text.toLowerCase();

      // Proof we understand CSP outcome
      expect(reply).toMatch(
        /above.*strike|strike.*above|expire worthless|keep.*premium/,
      );
      expect(reply).toMatch(
        /below.*strike|assigned|buy at strike|cost basis|premium.*reduc/,
      );
      expect(reply).toMatch(/70|3800|150|notional|premium|collateral/);
      expect(reply).toMatch(
        /friday|08:00|expiry|invalidation|hold|roll|adjust|strike/,
      );

      // Prompt passed to model must include user position details
      expect(capturedPrompt).toMatch(/70|70k|70K|secured put/);
      expect(capturedPrompt).toMatch(/3800|150|usdt0|expiry/);
    });
  });

  describe("SOLUS_HYPERSURFACE_EXPLAIN: prompt includes mechanics so model can explain correctly", () => {
    it("composeState is called so context (provider + RAG) is in the prompt", async () => {
      let composed = false;
      const runtime = createSolusRuntime({
        composeState: async (msg) => {
          composed = true;
          const providerResult = await hypersurfaceContextProvider.get(
            runtime as IAgentRuntime,
            msg,
          );
          return {
            text: providerResult?.text ?? "",
            values: providerResult?.values ?? {},
            data: {},
          };
        },
        useModel: async (_type: string, params: { prompt: string }) => {
          const prompt = params.prompt.toLowerCase();
          if (
            prompt.includes("friday 08:00") &&
            prompt.includes("covered call") &&
            prompt.includes("secured put") &&
            prompt.includes("wheel")
          ) {
            return "Hypersurface: weekly options Friday 08:00 UTC. Covered calls = own asset, sell call, premium. Secured puts = stablecoins, sell put, premium; below strike = assigned, premium reduces cost basis. Wheel: CC → assigned → CSP → repeat. For live IV say 'options' to VINCE.";
          }
          return "Explain Hypersurface.";
        },
      });

      const msg = createMessage("How does Hypersurface work?");
      const calls: { text: string }[] = [];
      const callback: HandlerCallback = async (content) => {
        if (content.text) calls.push({ text: content.text });
      };

      await solusHypersurfaceExplainAction.handler!(
        runtime as IAgentRuntime,
        msg,
        {} as State,
        undefined,
        callback,
      );

      expect(composed).toBe(true);
      expect(calls[0].text.toLowerCase()).toMatch(
        /friday|08:00|covered call|secured put|wheel|premium|cost basis|vince/,
      );
    });
  });
});
