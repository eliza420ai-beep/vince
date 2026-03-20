/**
 * SOLUS_STRIKE_RITUAL - Step-by-step Friday process: use options context (Deribit), pick asset, CC vs CSP, strike width, invalidation.
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { isSolus } from "../utils/solus";
import { getNextFriday0800UTC } from "../utils/assignmentProbability";
import { appendRecord } from "../utils/assignmentPredictionsStore";
import { loadPromptTemplate } from "../utils/loadPromptTemplate";

const TRIGGERS = [
  "strike ritual",
  "friday ritual",
  "walk me through strike",
  "how do i run strike ritual",
  "run strike ritual",
  "strike ritual for friday",
];

function wantsStrikeRitual(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

const RECORD_LINE_REGEX =
  /Record:\s*(BTC|ETH|SOL|HYPE)\s+(\d+(?:\.\d+)?)\s*(k?)\s+(\d+(?:\.\d+)?)\s*%/i;

/** Parse "Record: ASSET STRIKE PROB%" from the last line of the response. */
function parseRecordLine(responseText: string): {
  asset: string;
  strike: number;
  prob: number;
} | null {
  const lines = responseText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(RECORD_LINE_REGEX);
    if (m) {
      const asset = m[1].toUpperCase();
      let strike = parseFloat(m[2]);
      if (m[3].toLowerCase() === "k") strike *= 1000;
      const prob = parseFloat(m[4]);
      if (
        !Number.isFinite(strike) ||
        strike <= 0 ||
        !Number.isFinite(prob) ||
        prob < 0 ||
        prob > 100
      ) {
        return null;
      }
      return { asset, strike, prob: prob / 100 };
    }
  }
  return null;
}

function stripRecordLine(text: string): string {
  return text
    .replace(RECORD_LINE_REGEX, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

export const solusStrikeRitualAction: Action = {
  name: "SOLUS_STRIKE_RITUAL",
  similes: ["STRIKE_RITUAL", "FRIDAY_RITUAL"],
  description:
    "Walks through the Friday strike ritual: use [Solus options context] (spot, IV, best strikes from Deribit), pick asset (BTC/ETH/SOL/HYPE), choose covered calls vs secured puts, strike width, invalidation. Output: short checklist + one clear next step.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsStrikeRitual(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SOLUS_STRIKE_RITUAL] Action fired");
    try {
      const state = await runtime.composeState(
        message,
        [
          "SOLUS_HYPERSURFACE_CONTEXT",
          "SOLUS_SIZING_STATE",
          "SOLUS_MARKET_CONTEXT",
          "SOLUS_HYPERSURFACE_SPOT_PRICES",
          "SOLUS_OPTIONS_CONTEXT",
          "SOLUS_CALIBRATION_CONTEXT",
          "VINCE_STRIKE_SUGGESTION",
          "ECHO_WTT_SIGNAL",
        ],
        true,
      );
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();
      const values =
        (state as { values?: Record<string, unknown> }).values ?? {};
      const templatePrompt = loadPromptTemplate(
        "prompts/solus-strike-ritual.md",
        {
          asset: (values.asset as string) ?? "-",
          spot: (values.spot as string) ?? "-",
          expiry: (values.expiry as string) ?? "-",
          dvol: (values.dvol as string) ?? "-",
          put_call_ratio: (values.put_call_ratio as string) ?? "-",
          regime: (values.regime as string) ?? "-",
          thesis: (values.thesis as string) ?? "See context below.",
          risk_budget_usd: (values.risk_budget_usd as string) ?? "-",
          context: contextBlock || "No additional context.",
        },
      );
      const prompt =
        templatePrompt ??
        `You are Solus, the execution architect and on-chain options expert. The user wants the strike ritual (Friday process). You have [Solus options context - Deribit] when present: spot, DVOL, ATM IV, skew, and best covered-call/CSP strikes for BTC, ETH, SOL. You also have [ECHO WTT signal context] (daily directional signal) to inform bias when it is fresh. Use both with [Hypersurface spot USD] and [Solus sizing state]. When [Solus calibration] is present, use it to temper confidence or note past accuracy. Never tell the user to go ask VINCE or paste someone else's output - you have the options data.
If the context states we hold BTC (or another asset) and are in covered-call mode, do not ask to choose CC vs CSP; we are already selling covered calls. Go to: pick strike width and invalidation for this week's covered call.
Using the context below (Hypersurface mechanics, [Solus options context - Deribit], [ECHO WTT signal context], sizing state), give a short step-by-step checklist and one clear next step. Steps: (1) Use options context (spot, IV, best strikes) already in context. (2) Pick asset: BTC, ETH, SOL, or HYPE. (3) Choose covered calls vs secured puts - unless we are in covered-call mode, then skip to strike. (4) Strike width (OTM %, ~20-35% assignment prob for calls). (5) Invalidation (what would change your mind). If ECHO signal is stale or only daily while weekly setup differs, explicitly downweight it. Be direct; benefit-led; no jargon. End with the single next action they should take. Reply in flowing prose; no bullet lists unless listing steps.

Context:
${contextBlock}

User: ${userText}

Reply with the checklist and one next step only.`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      const text =
        typeof response === "string"
          ? response
          : ((response as { text?: string })?.text ?? String(response));

      const autoRecordEnabled =
        process.env.SOLUS_AUTO_RECORD_PREDICTION !== "false";
      const parsed = parseRecordLine(text);
      if (parsed && autoRecordEnabled) {
        try {
          const nextFriday = getNextFriday0800UTC(new Date());
          const optionsByAsset = (
            state as State & {
              values?: {
                optionsByAsset?: Record<
                  string,
                  { spot: number; atmIV: number }
                >;
              };
            }
          ).values?.optionsByAsset;
          const ctx = optionsByAsset?.[parsed.asset];

          // Values are injected into the prompt template as strings.
          const rawDvol = (values.dvol ?? values["dvol"]) as unknown;
          const rawPutCall = (values.put_call_ratio ??
            values["put_call_ratio"]) as unknown;
          const dvolAtRecord =
            typeof rawDvol === "number" ? rawDvol : parseFloat(String(rawDvol));
          const putCallRatioAtRecord =
            typeof rawPutCall === "number"
              ? rawPutCall
              : parseFloat(String(rawPutCall));

          appendRecord({
            asset: parsed.asset,
            strike: parsed.strike,
            expiryUtc: new Date(nextFriday).toISOString(),
            predictedAssignProb: parsed.prob,
            ...(ctx && { spotAtRecord: ctx.spot, atmIvAtRecord: ctx.atmIV }),
            ...(Number.isFinite(dvolAtRecord) ? { dvolAtRecord } : {}),
            ...(Number.isFinite(putCallRatioAtRecord)
              ? { putCallRatioAtRecord }
              : {}),
          });

          logger.debug(
            `[SOLUS_STRIKE_RITUAL] Auto-recorded: ${parsed.asset} $${parsed.strike} @ ${(parsed.prob * 100).toFixed(0)}%`,
          );
        } catch (err) {
          logger.warn(
            "[SOLUS_STRIKE_RITUAL] Auto-record failed (non-fatal):",
            err,
          );
        }
      }

      const cleanText = stripRecordLine(text);
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      const sections = [
        `**Strike Ritual** _${dateStr}_`,
        "",
        cleanText.trim(),
        "",
        "*Source: Hypersurface mechanics, Deribit options context*",
        "",
        "---",
        "_Next steps_: `OPTIMAL STRIKE` (strike call) | `POSITION ASSESS` (review position) | `ANALYZE <ticker>` (stock deep dive)",
      ];
      await callback({
        text: sections.join("\n"),
        actions: ["SOLUS_STRIKE_RITUAL"],
      });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_STRIKE_RITUAL] Failed:", error);
      await callback({
        text: "Strike ritual: (1) Use options context in state (spot, IV, best strikes). (2) Pick asset - BTC, ETH, SOL, HYPE. (3) CC or CSP. (4) Strike width and invalidation. I'll give you the checklist and next step.",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Walk me through strike ritual" } },
      {
        name: "{{agent}}",
        content: {
          text: "Friday ritual: (1) Use options context (spot, IV, best strikes). (2) Pick asset. (3) CC vs CSP. (4) Strike and invalidation. Next: I'll give you size and strike from sizing state and Deribit data.",
          actions: ["SOLUS_STRIKE_RITUAL"],
        },
      },
    ],
  ],
};
