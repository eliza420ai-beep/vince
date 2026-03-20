/**
 * OTAKU_EXECUTE_VINCE_SIGNAL – Execute Vince's latest trade suggestion (cross-agent loop).
 * Validates against portfolio; runs swap or bridge with confirmation.
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import {
  OtakuService,
  type OtakuExecutionVenue,
  type SwapRequest,
} from "../services/otaku.service";
import type { HlSidecarPerpsIntent } from "../lib/hlSidecar";
import {
  enrichSwapRequestForHyperliquid,
  buildHlPerpsMarketFromSwap,
} from "../lib/hlIntentFromText";
import {
  setPending,
  getPending,
  clearPending,
  isConfirmation,
  hasPending,
} from "../utils/pendingCache";
import { VINCE_SIGNAL_CACHE_KEY } from "../providers/vinceSignal.provider";
import { appendNotificationEvent } from "../lib/notificationEvents";

type SwapSignal = {
  action: "swap";
  sellToken: string;
  buyToken: string;
  amount: string;
  chain?: string;
  executionVenue?: OtakuExecutionVenue;
  hlPerps?: HlSidecarPerpsIntent;
  /** Alias: venue "hyperliquid" | "hl" maps to hyperliquid_perps */
  venue?: string;
  hyperliquid?: boolean;
};

type BridgeSignal = {
  action: "bridge";
  token: string;
  amount: string;
  fromChain: string;
  toChain: string;
};

function isSwapSignal(r: unknown): r is SwapSignal {
  return (
    typeof r === "object" &&
    r !== null &&
    (r as any).action === "swap" &&
    typeof (r as any).sellToken === "string" &&
    typeof (r as any).buyToken === "string" &&
    typeof (r as any).amount === "string"
  );
}

function normalizeSwapSignal(raw: SwapSignal): SwapSignal {
  let executionVenue = raw.executionVenue;
  if (!executionVenue) {
    const ven = String(raw.venue ?? "").toLowerCase();
    if (
      ven === "hyperliquid" ||
      ven === "hl" ||
      raw.hyperliquid === true ||
      String(raw.chain ?? "").toLowerCase() === "hyperliquid"
    ) {
      executionVenue = "hyperliquid_perps";
    }
  }
  let hlPerps = raw.hlPerps;
  if (executionVenue === "hyperliquid_perps" && !hlPerps) {
    hlPerps =
      buildHlPerpsMarketFromSwap(
        "vince hyperliquid perp",
        raw.sellToken,
        raw.buyToken,
        raw.amount,
      ) ?? undefined;
  }
  return {
    ...raw,
    chain:
      raw.chain ??
      (executionVenue === "hyperliquid_perps" ? "hyperliquid" : raw.chain),
    executionVenue,
    hlPerps,
  };
}

function swapSignalToSwapRequest(s: SwapSignal): SwapRequest {
  const n = normalizeSwapSignal(s);
  return {
    sellToken: n.sellToken,
    buyToken: n.buyToken,
    amount: n.amount,
    chain: n.chain,
    executionVenue: n.executionVenue,
    hlPerps: n.hlPerps,
  };
}

function isBridgeSignal(r: unknown): r is BridgeSignal {
  return (
    typeof r === "object" &&
    r !== null &&
    (r as any).action === "bridge" &&
    typeof (r as any).token === "string" &&
    typeof (r as any).amount === "string" &&
    typeof (r as any).fromChain === "string" &&
    typeof (r as any).toChain === "string"
  );
}

export const otakuExecuteVinceSignalAction: Action = {
  name: "OTAKU_EXECUTE_VINCE_SIGNAL",
  description:
    "Execute the latest trade suggestion from Vince (swap or bridge). Use when the user says 'execute Vince's suggestion' or 'do the swap' after Vince proposed a trade.",
  similes: ["EXECUTE_VINCE_TRADE", "DO_VINCE_SIGNAL", "EXECUTE_SIGNAL"],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Execute Vince's suggestion" },
      },
      {
        name: "{{agent}}",
        content: {
          text: '**Swap (from Vince):** 0.5 ETH → USDC on base. Type "confirm" to proceed.',
          actions: ["OTAKU_EXECUTE_VINCE_SIGNAL"],
        },
      },
    ],
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    if (isConfirmation(text)) {
      return hasPending(runtime, message, "vinceSignal");
    }
    return (
      text.includes("execute vince") ||
      text.includes("execute vince's") ||
      text.includes("do vince's") ||
      text.includes("do the swap") ||
      text.includes("run vince's trade")
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const text = message.content?.text ?? "";
    const pending = await getPending<SwapSignal | BridgeSignal>(
      runtime,
      message,
      "vinceSignal",
    );

    if (isConfirmation(text) && pending) {
      await clearPending(runtime, message, "vinceSignal");
      const otaku = runtime.getService("otaku") as OtakuService | null;
      if (!otaku) {
        await callback?.({ text: "Otaku service not available." });
        return {
          success: false,
          error: new Error("Otaku service not available"),
        };
      }

      if (pending.action === "swap" && otaku.executeSwap) {
        let swapReq = swapSignalToSwapRequest(pending);
        swapReq = enrichSwapRequestForHyperliquid(runtime, "", swapReq);
        const result = await otaku.executeSwap(swapReq);
        if (result.success) {
          const recon = result.reconciliationSummary
            ? `\n\n${result.reconciliationSummary}`
            : "";
          const hlNote =
            swapReq.executionVenue === "hyperliquid_perps"
              ? " (Hyperliquid perps via sidecar)"
              : "";
          await callback?.({
            text: `✅ Vince’s swap done${hlNote}: ${pending.amount} ${pending.sellToken} → ${pending.buyToken}. ${result.txHash ? `Ref: ${String(result.txHash).slice(0, 24)}...` : ""}${recon}`,
          });
          return { success: true };
        }
        await callback?.({ text: `❌ Swap failed: ${result.error}` });
        return {
          success: false,
          error: new Error(result.error ?? "Swap failed"),
        };
      }

      if (pending.action === "bridge") {
        const relay = runtime.getService("relay") as {
          executeBridge?: (p: any) => Promise<any>;
        } | null;
        if (relay?.executeBridge) {
          const result = await relay.executeBridge({
            token: pending.token,
            amount: pending.amount,
            fromChain: pending.fromChain,
            toChain: pending.toChain,
          });
          if (result?.success) {
            await callback?.({
              text: `✅ Vince’s bridge done: ${pending.amount} ${pending.token} ${pending.fromChain} → ${pending.toChain}. ${result.txHash ? `TX: ${result.txHash.slice(0, 24)}...` : ""}`,
            });
            await appendNotificationEvent(
              runtime,
              {
                action: "vince_signal_completed",
                title: "Vince signal: bridge completed",
                subtitle: `${pending.amount} ${pending.token} ${pending.fromChain} → ${pending.toChain}`,
                metadata: { txHash: result.txHash },
              },
              message.entityId,
            );
            return { success: true };
          }
        }
        await callback?.({
          text: `❌ Bridge failed or Relay not available. Try "bridge ${pending.amount} ${pending.token} from ${pending.fromChain} to ${pending.toChain}" manually.`,
        });
        return { success: false };
      }

      await callback?.({ text: "Unknown signal type." });
      return { success: false };
    }

    const signal = await runtime.getCache<unknown>(VINCE_SIGNAL_CACHE_KEY);
    if (!signal || (typeof signal === "object" && !(signal as any).action)) {
      await callback?.({
        text: 'There’s no Vince trade suggestion in the loop right now. Ask Vince for a trade idea first, then say "execute Vince\'s suggestion".',
      });
      return { success: true };
    }

    if (isSwapSignal(signal)) {
      const normalized = normalizeSwapSignal(signal);
      await setPending(runtime, message, "vinceSignal", normalized);
      const swapReq = enrichSwapRequestForHyperliquid(
        runtime,
        "vince",
        swapSignalToSwapRequest(normalized),
      );
      const otaku = runtime.getService("otaku") as OtakuService;
      const summary =
        otaku?.formatSwapConfirmation?.(swapReq) ??
        `**Swap (from Vince):** ${normalized.amount} ${normalized.sellToken} → ${normalized.buyToken}${normalized.chain ? ` on ${normalized.chain}` : ""}. Type "confirm" to proceed.`;
      await callback?.({ text: summary });
      return { success: true };
    }

    if (isBridgeSignal(signal)) {
      await setPending(runtime, message, "vinceSignal", signal);
      await callback?.({
        text: `**Bridge (from Vince):** ${signal.amount} ${signal.token} from ${signal.fromChain} to ${signal.toChain}. Type "confirm" to proceed.`,
      });
      return { success: true };
    }

    await callback?.({
      text: "Vince’s suggestion isn’t a supported swap or bridge. I can only execute swap or bridge signals.",
    });
    return { success: true };
  },
};

export default otakuExecuteVinceSignalAction;
