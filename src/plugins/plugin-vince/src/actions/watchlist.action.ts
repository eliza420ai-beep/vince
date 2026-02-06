/**
 * VINCE Watchlist Action
 *
 * Manages the token watchlist for early detection:
 * - Display current watchlist with status
 * - Add tokens to watch: "watch $MOLT on solana"
 * - Remove tokens: "unwatch $MOLT"
 * - Show status relative to entry/exit targets
 *
 * Triggers: "watchlist", "watching", "my tokens", "tracked tokens", "watch", "unwatch"
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import type {
  VinceWatchlistService,
  WatchlistToken,
} from "../services/watchlist.service";
import type { VinceDexScreenerService } from "../services/dexscreener.service";

// ==========================================
// Parse Commands
// ==========================================

interface WatchCommand {
  action: "list" | "add" | "remove" | "status";
  symbol?: string;
  chain?: "solana" | "base" | "hyperliquid" | "ethereum";
  entryTarget?: number;
  takeProfit?: number;
  notes?: string;
}

function parseWatchCommand(text: string): WatchCommand {
  const lowerText = text.toLowerCase().trim();

  // Remove command: "unwatch $MOLT" or "remove MOLT"
  const unwatchMatch = lowerText.match(/(?:unwatch|remove|delete)\s+\$?(\w+)/i);
  if (unwatchMatch) {
    return { action: "remove", symbol: unwatchMatch[1].toUpperCase() };
  }

  // Add command: "watch $MOLT on solana" or "add MOLT solana entry 2M"
  const watchMatch = lowerText.match(
    /(?:watch|add|track)\s+\$?(\w+)(?:\s+(?:on\s+)?(\w+))?(?:\s+entry\s+(\d+(?:\.\d+)?[mk]?))?(?:\s+tp\s+(\d+(?:\.\d+)?[mk]?))?/i,
  );
  if (watchMatch) {
    const symbol = watchMatch[1].toUpperCase();
    const chainRaw = watchMatch[2]?.toLowerCase();
    const entryRaw = watchMatch[3];
    const tpRaw = watchMatch[4];

    let chain: WatchCommand["chain"];
    if (chainRaw === "sol" || chainRaw === "solana") chain = "solana";
    else if (chainRaw === "base") chain = "base";
    else if (
      chainRaw === "hyper" ||
      chainRaw === "hyperliquid" ||
      chainRaw === "hl"
    )
      chain = "hyperliquid";
    else if (chainRaw === "eth" || chainRaw === "ethereum") chain = "ethereum";

    const parseAmount = (s: string | undefined): number | undefined => {
      if (!s) return undefined;
      const num = parseFloat(s);
      if (s.toLowerCase().endsWith("m")) return num * 1_000_000;
      if (s.toLowerCase().endsWith("k")) return num * 1_000;
      return num;
    };

    return {
      action: "add",
      symbol,
      chain,
      entryTarget: parseAmount(entryRaw),
      takeProfit: parseAmount(tpRaw),
    };
  }

  // Status of specific token: "status MOLT" or "MOLT status"
  const statusMatch = lowerText.match(
    /(?:status|check)\s+\$?(\w+)|(\w+)\s+status/i,
  );
  if (statusMatch) {
    return {
      action: "status",
      symbol: (statusMatch[1] || statusMatch[2]).toUpperCase(),
    };
  }

  // Default: list watchlist
  return { action: "list" };
}

// ==========================================
// Format Helpers
// ==========================================

function formatMcap(mcap: number | undefined): string {
  if (!mcap) return "???";
  if (mcap >= 1_000_000) return `$${(mcap / 1_000_000).toFixed(2)}M`;
  if (mcap >= 1_000) return `$${(mcap / 1_000).toFixed(0)}K`;
  return `$${mcap.toFixed(0)}`;
}

function formatDistance(current: number, target: number): string {
  const pctDiff = ((current - target) / target) * 100;
  if (pctDiff >= -5 && pctDiff <= 5) return "📍 AT TARGET";
  if (pctDiff > 0) return `↑ ${pctDiff.toFixed(0)}% above`;
  return `↓ ${Math.abs(pctDiff).toFixed(0)}% below`;
}

// ==========================================
// Action
// ==========================================

export const vinceWatchlistAction: Action = {
  name: "VINCE_WATCHLIST",
  similes: ["WATCHLIST", "MY_TOKENS", "TRACKED_TOKENS", "WATCH", "UNWATCH"],
  description:
    "Manage token watchlist: view, add, remove tokens with entry/exit targets",

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || "";
    return (
      text.includes("watchlist") ||
      text.includes("watching") ||
      text.includes("my tokens") ||
      text.includes("tracked") ||
      text.match(/\b(watch|unwatch|track)\s+\$?\w+/i) !== null
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
  ): Promise<void> => {
    try {
      const watchlistService = runtime.getService(
        "VINCE_WATCHLIST_SERVICE",
      ) as VinceWatchlistService | null;
      const dexService = runtime.getService(
        "VINCE_DEXSCREENER_SERVICE",
      ) as VinceDexScreenerService | null;

      if (!watchlistService) {
        await callback({
          text: "Watchlist service not available. Make sure it's registered in the plugin.",
          actions: ["VINCE_WATCHLIST"],
        });
        return;
      }

      const text = message.content.text || "";
      const command = parseWatchCommand(text);
      logger.info(
        `[VINCE_WATCHLIST] Command: ${command.action} ${command.symbol || ""}`,
      );

      // Handle different commands
      switch (command.action) {
        case "add": {
          if (!command.symbol) {
            await callback({
              text: "Need a token symbol. Try: 'watch $MOLT on solana entry 2M'",
              actions: ["VINCE_WATCHLIST"],
            });
            return;
          }

          // Try to detect chain from DexScreener if not provided
          let chain = command.chain;
          if (!chain && dexService) {
            const searchResults = await dexService.searchToken(command.symbol);
            if (searchResults) {
              chain = searchResults.chain as WatchCommand["chain"];
            }
          }

          if (!chain) {
            await callback({
              text: `Couldn't detect chain for ${command.symbol}. Try: 'watch $${command.symbol} on solana'`,
              actions: ["VINCE_WATCHLIST"],
            });
            return;
          }

          const newToken: WatchlistToken = {
            symbol: command.symbol,
            chain,
            address: "",
            entryTarget: command.entryTarget,
            takeProfit: command.takeProfit,
            addedDate: new Date().toISOString().split("T")[0],
            priority: "medium",
            source: "manual",
          };

          const added = await watchlistService.addToken(newToken);
          if (added) {
            const entryStr = command.entryTarget
              ? ` Entry: ${formatMcap(command.entryTarget)}`
              : "";
            const tpStr = command.takeProfit
              ? ` TP: ${formatMcap(command.takeProfit)}`
              : "";
            await callback({
              text: `✅ Added ${command.symbol} (${chain}) to watchlist.${entryStr}${tpStr}\n\nEdit targets in knowledge/trading/watchlist.json`,
              actions: ["VINCE_WATCHLIST"],
            });
          } else {
            await callback({
              text: `${command.symbol} is already on the watchlist.`,
              actions: ["VINCE_WATCHLIST"],
            });
          }
          break;
        }

        case "remove": {
          if (!command.symbol) {
            await callback({
              text: "Need a token symbol. Try: 'unwatch MOLT'",
              actions: ["VINCE_WATCHLIST"],
            });
            return;
          }

          const removed = await watchlistService.removeToken(command.symbol);
          if (removed) {
            await callback({
              text: `❌ Removed ${command.symbol} from watchlist.`,
              actions: ["VINCE_WATCHLIST"],
            });
          } else {
            await callback({
              text: `${command.symbol} was not on the watchlist.`,
              actions: ["VINCE_WATCHLIST"],
            });
          }
          break;
        }

        case "status": {
          if (!command.symbol) {
            await callback({
              text: "Need a token symbol. Try: 'status MOLT'",
              actions: ["VINCE_WATCHLIST"],
            });
            return;
          }

          const token = watchlistService.getWatchedToken(command.symbol);
          if (!token) {
            await callback({
              text: `${command.symbol} is not on your watchlist.`,
              actions: ["VINCE_WATCHLIST"],
            });
            return;
          }

          let currentMcap: number | undefined;
          let priceChange: number | undefined;
          if (dexService) {
            const results = await dexService.searchToken(command.symbol);
            if (results) {
              currentMcap = results.marketCap;
              priceChange = results.priceChange24h;
            }
          }

          const lines: string[] = [
            `**${token.symbol}** (${token.chain})`,
            `Priority: ${token.priority}`,
          ];

          if (currentMcap) {
            lines.push(`Current: ${formatMcap(currentMcap)}`);
            if (priceChange !== undefined) {
              const sign = priceChange >= 0 ? "+" : "";
              lines.push(`24h: ${sign}${priceChange.toFixed(1)}%`);
            }
          }

          if (token.entryTarget) {
            lines.push(`Entry Target: ${formatMcap(token.entryTarget)}`);
            if (currentMcap) {
              lines.push(`  ${formatDistance(currentMcap, token.entryTarget)}`);
            }
          }
          if (token.takeProfit) {
            lines.push(`Take Profit: ${formatMcap(token.takeProfit)}`);
            if (currentMcap) {
              lines.push(`  ${formatDistance(currentMcap, token.takeProfit)}`);
            }
          }
          if (token.stopLoss) {
            lines.push(`Stop Loss: ${formatMcap(token.stopLoss)}`);
          }
          if (token.notes) {
            lines.push(`Notes: ${token.notes}`);
          }

          await callback({
            text: lines.join("\n"),
            actions: ["VINCE_WATCHLIST"],
          });
          break;
        }

        case "list":
        default: {
          const status = watchlistService.getStatus();
          const tokens = watchlistService.getWatchedTokens();

          if (tokens.length === 0) {
            await callback({
              text: "📋 **Watchlist Empty**\n\nAdd tokens with: 'watch $MOLT on solana entry 2M'\nOr edit knowledge/trading/watchlist.json directly.",
              actions: ["VINCE_WATCHLIST"],
            });
            return;
          }

          const lines: string[] = [
            `📋 **Watchlist** (${tokens.length} tokens)`,
            "",
          ];

          // Group by priority
          const highPriority = tokens.filter((t) => t.priority === "high");
          const mediumPriority = tokens.filter((t) => t.priority === "medium");
          const lowPriority = tokens.filter((t) => t.priority === "low");

          const formatToken = async (t: WatchlistToken): Promise<string> => {
            let line = `• **${t.symbol}** (${t.chain})`;

            // Get current price if available
            if (dexService) {
              try {
                const results = await dexService.searchToken(t.symbol);
                if (results && results.marketCap) {
                  const currentMcap = results.marketCap;
                  line += ` - ${formatMcap(currentMcap)}`;

                  if (t.entryTarget) {
                    line += ` [${formatDistance(currentMcap, t.entryTarget)} entry]`;
                  }
                }
              } catch {
                // Skip price lookup errors
              }
            }

            return line;
          };

          if (highPriority.length > 0) {
            lines.push("🔴 **High Priority**");
            for (const t of highPriority) {
              lines.push(await formatToken(t));
            }
            lines.push("");
          }

          if (mediumPriority.length > 0) {
            lines.push("🟡 **Medium Priority**");
            for (const t of mediumPriority) {
              lines.push(await formatToken(t));
            }
            lines.push("");
          }

          if (lowPriority.length > 0) {
            lines.push("⚪ **Low Priority**");
            for (const t of lowPriority) {
              lines.push(await formatToken(t));
            }
            lines.push("");
          }

          // Add status
          lines.push(`Last updated: ${status.lastUpdated}`);
          if (status.isStale) {
            lines.push(
              `⚠️ Watchlist is ${status.staleDays} days old - consider updating`,
            );
          }

          lines.push("");
          lines.push(
            "*Commands: 'watch $TOKEN on chain', 'unwatch TOKEN', 'status TOKEN'*",
          );

          await callback({
            text: lines.join("\n"),
            actions: ["VINCE_WATCHLIST"],
          });
          break;
        }
      }
    } catch (error) {
      logger.error(`[VINCE_WATCHLIST] Error: ${error}`);
      await callback({
        text: "Failed to process watchlist command. Try again.",
        actions: ["VINCE_WATCHLIST"],
      });
    }
  },

  examples: [
    [
      { name: "{{user1}}", content: { text: "show me my watchlist" } },
      {
        name: "VINCE",
        content: {
          text: "📋 **Watchlist** (2 tokens)\n\n🔴 **High Priority**\n• **MOLT** (solana) - $3.2M [↑ 60% above entry]\n\n🟡 **Medium Priority**\n• **AGENT** (solana) - $1.8M [↓ 20% below entry]\n\nLast updated: 2026-01-30\n\n*Commands: 'watch $TOKEN on chain', 'unwatch TOKEN', 'status TOKEN'*",
          actions: ["VINCE_WATCHLIST"],
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "watch $MOLT on solana entry 2M" },
      },
      {
        name: "VINCE",
        content: {
          text: "✅ Added MOLT (solana) to watchlist. Entry: $2.00M\n\nEdit targets in knowledge/trading/watchlist.json",
          actions: ["VINCE_WATCHLIST"],
        },
      },
    ],
    [
      { name: "{{user1}}", content: { text: "unwatch MOLT" } },
      {
        name: "VINCE",
        content: {
          text: "❌ Removed MOLT from watchlist.",
          actions: ["VINCE_WATCHLIST"],
        },
      },
    ],
  ],
};
