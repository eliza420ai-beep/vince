/**
 * SOLUS_OPTIMAL_STRIKE — Give strike call from options context (Deribit): asset, OTM %, size/skip, invalidation. Solus is the options expert; uses [Solus options context] and sizing state.
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
import {
  buildCloseEarlyRecommendationFromState,
  formatCloseEarlyRecommendation,
} from "../utils/closeEarlyRecommendation";

const TRIGGERS = [
  "optimal strike",
  "what strike for btc",
  "what strike for sol",
  "what strike for hype",
  "good strike for btc",
  "good strike for sol",
  "good strike for hype",
  "good strike for",
  "best strike this week",
  "strike for covered calls",
  "what's the optimal strike",
  "strike call",
  "which strike",
  "size or skip",
  "size, skip",
  "size skip watch",
  "what's your call",
  "bull or bear this week",
  "weekly view",
  "weekly view for btc",
  "weekly view for eth",
  "weekly view for sol",
  "weekly view for hype",
  "full $100k plan",
  "100k plan",
];

function wantsOptimalStrike(text: string): boolean {
  const lower = text.toLowerCase();
  return TRIGGERS.some((t) => lower.includes(t));
}

export const RECORD_LINE_REGEX =
  /Record:\s*(BTC|ETH|SOL|HYPE)\s+(\d+(?:\.\d+)?)\s*(k?)\s+(\d+(?:\.\d+)?)\s*%/i;

/** Parse "Record: ASSET STRIKE PROB%" from the last line of the response. Returns null if not found or invalid. */
export function parseRecordLine(responseText: string): {
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
      )
        return null;
      return { asset, strike, prob: prob / 100 };
    }
  }
  return null;
}

/** Remove the Record: ... segment from text so the user does not see it. */
export function stripRecordLine(text: string): string {
  return text
    .replace(RECORD_LINE_REGEX, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

export const solusOptimalStrikeAction: Action = {
  name: "SOLUS_OPTIMAL_STRIKE",
  similes: ["OPTIMAL_STRIKE", "STRIKE_CALL"],
  description:
    "Gives strike call from [Solus options context] (Deribit) and sizing state: asset, OTM %, size/skip, invalidation. Solus is the options expert; answers from his own data.",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (!isSolus(runtime)) return false;
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsOptimalStrike(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    logger.debug("[SOLUS_OPTIMAL_STRIKE] Action fired");
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
          "VINCE_HYPERSURFACE_WEEKLY_TEMP",
          "ECHO_WTT_SIGNAL",
        ],
        true,
      );
      const contextBlock = typeof state.text === "string" ? state.text : "";
      const userText = (message.content?.text ?? "").trim();
      const closeEarlyRec = buildCloseEarlyRecommendationFromState(
        state,
        userText,
      );
      const closeEarlyBlock = formatCloseEarlyRecommendation(closeEarlyRec);

      const prompt = `You are Solus, the on-chain options expert. The user wants an optimal strike call. You have: (1) [Solus sizing state] (weekly premium targets, assigned wheels, spot stacks), (2) [Solus market context] (spot, 24h move, regime), (3) [Solus options context — Deribit] (spot, DVOL, ATM IV, skew, best CC/CSP strikes for BTC/ETH/SOL), (4) when present [Vince 7-day Hypersurface temp check] (BULL/BEAR/NEUTRAL for BTC and HYPE from VINCE's fused signals — use as weekly strike-width prior), (5) [ECHO WTT signal context] (daily directional signal with freshness + crowding/invalidation hints). Use this data to give one clear call. Never tell the user to go ask VINCE or paste someone else's output — you have the options data.

Use current spot from [Hypersurface spot USD] or [Solus market context]. Frame the call as weekly (next 7 days to expiry). If [Solus sizing state] states we hold the asset (covered calls) or have a CSP wheel, anchor size/skip/watch and strike to that plan. When [Solus options context] is present, use IV and best strikes; when missing, give strike/structure and invalidation from sizing + spot and note you could refine with live IV. When [Solus calibration] is present, use it: if Brier is high or recent outcomes show bias, temper confidence or note it; if well-calibrated, you can say so. When [Vince 7-day Hypersurface temp check] is present, align BTC/HYPE strike width with BULL vs BEAR vs NEUTRAL (wider calls in strong BULL for CCs, etc.). Use [ECHO WTT signal context] as directional prior only when fresh; if stale or contradictory to weekly structure or temp check, downweight it and say so briefly.

Use the deterministic [Close early recommendation] block as hard gating:
- If Action is CLOSE_EARLY_NOW, first call is close now, then redeploy strike guidance for next leg.
- If Action is WATCH_CLOSE_WINDOW with USDT0 insufficient, first call is fund/bridge USDT0 and monitor close window before redeploy.
- If Action is ROLL_NEXT_WEEK, frame strike guidance as a roll (next expiry).

Using the context below, give: (1) asset (BTC/ETH/SOL/HYPE), (2) OTM % and strike guidance, (3) size/skip/watch (or close/redeploy), (4) invalidation in one phrase.
Add one operational caveat when relevant: USDT0 needed for close debit, early exercise in final ~24h, or post-expiry settlement delay (up to ~2h).
If mentioning sell/assignment probability, state it is an estimate, not guaranteed. Be direct; one clear call.

Context:
${contextBlock}

${closeEarlyBlock}

User: ${userText}

Reply with strike call only. Reply in flowing prose; no bullet lists unless listing strike/asset/invalidation.
End your reply with exactly one line in this form (for internal tracking only; use the strike and assignment probability you recommended): Record: ASSET STRIKE PROB% (e.g. Record: BTC 106000 24% or Record: ETH 3500 22%).`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt,
      });
      let text =
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
          appendRecord({
            asset: parsed.asset,
            strike: parsed.strike,
            expiryUtc: new Date(nextFriday).toISOString(),
            predictedAssignProb: parsed.prob,
            ...(ctx && { spotAtRecord: ctx.spot, atmIvAtRecord: ctx.atmIV }),
          });
          logger.debug(
            `[SOLUS_OPTIMAL_STRIKE] Auto-recorded: ${parsed.asset} $${parsed.strike} @ ${(parsed.prob * 100).toFixed(0)}%`,
          );
        } catch (err) {
          logger.warn(
            "[SOLUS_OPTIMAL_STRIKE] Auto-record failed (non-fatal):",
            err,
          );
        }
      }
      text = stripRecordLine(text);
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
      const sections = [
        `**Strike Call** _${dateStr}_`,
        "",
        text.trim(),
        "",
        closeEarlyRec
          ? `*Close-early engine: ${closeEarlyRec.action} (${(
              closeEarlyRec.confidence * 100
            ).toFixed(0)}% confidence)*`
          : "*Close-early engine: no active CC/CSP found in sizing state*",
        "*Operator check: Treat sell probability as estimate; Thu monitor early exercise; Fri 08:00 UTC expiry then settlement may take up to ~2h.*",
        "",
        "*Source: Hypersurface mechanics, CoinGecko spot, Deribit options context*",
        "",
        "---",
        "_Next steps_: `STRIKE RITUAL` (full process) · `POSITION ASSESS` (review position)",
      ];
      await callback({
        text: sections.join("\n"),
        actions: ["SOLUS_OPTIMAL_STRIKE"],
      });
      return { success: true };
    } catch (error) {
      logger.error("[SOLUS_OPTIMAL_STRIKE] Failed:", error);
      await callback({
        text: "We don't have a pulse on where price lands by Friday. Paste VINCE's options view or give me a moment and I'll pull spot and options context for the strike call (asset, OTM %, size/skip, invalidation).",
      });
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: {
          text: "What's the optimal strike for BTC covered calls this week?",
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: "From sizing state and Deribit: OTM %, strike, and invalidation for this week.",
          actions: ["SOLUS_OPTIMAL_STRIKE"],
        },
      },
    ],
  ],
};
