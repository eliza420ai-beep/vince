/**
 * Vince Trade Signal Provider – cross-agent trade loop.
 * Injects Vince's latest trade suggestion into Otaku context so the user can say "execute it".
 * Vince (or any agent) should set cache key "vince:latest_trade_signal" with shape:
 * { action: 'swap', sellToken, buyToken, amount, chain? } | { action: 'bridge', token, amount, fromChain, toChain }
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";

const VINCE_SIGNAL_CACHE_KEY = "vince:latest_trade_signal";

export const vinceSignalProvider: Provider = {
  name: "OTAKU_VINCE_SIGNAL",
  description: "Latest trade suggestion from Vince for execution loop",
  position: 5,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State
  ) => {
    try {
      const raw = await runtime.getCache<Record<string, unknown>>(VINCE_SIGNAL_CACHE_KEY);
      if (!raw || typeof raw !== "object" || !raw.action) {
        return { text: "" };
      }

      const action = String(raw.action).toLowerCase();
      let line = "**Vince’s latest trade idea:** ";

      if (action === "swap" && raw.sellToken && raw.buyToken && raw.amount) {
        line += `Swap ${raw.amount} ${raw.sellToken} → ${raw.buyToken}${raw.chain ? ` on ${raw.chain}` : ""}. Say "execute Vince's suggestion" or "do the swap" to run it.`;
      } else if (
        action === "bridge" &&
        raw.token &&
        raw.amount &&
        raw.fromChain &&
        raw.toChain
      ) {
        line += `Bridge ${raw.amount} ${raw.token} from ${raw.fromChain} to ${raw.toChain}. Say "execute Vince's suggestion" to run it.`;
      } else {
        line += `${action} (details in cache). Say "execute Vince's suggestion" to run.`;
      }

      return {
        text: `\n${line}\n`,
        values: { vinceLatestSignal: raw },
      };
    } catch (err) {
      logger.debug(`[OTAKU_VINCE_SIGNAL] getCache failed: ${err}`);
      return { text: "" };
    }
  },
};

export { VINCE_SIGNAL_CACHE_KEY };
export default vinceSignalProvider;
