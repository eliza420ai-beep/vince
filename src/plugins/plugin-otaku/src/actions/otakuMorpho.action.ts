/**
 * OTAKU_MORPHO - Supply and withdraw from Morpho vaults
 *
 * High-level wrapper for Morpho vault operations:
 * - Supply: Deposit tokens to earn yield
 * - Withdraw: Remove tokens from vault
 *
 * Uses the underlying MORPHO_VAULT_TRANSFER action.
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

interface MorphoRequest {
  intent: "supply" | "withdraw";
  asset: string;
  amount: string;
  vault?: string;
  chain?: string;
}

// Popular Morpho vaults on Base
const POPULAR_VAULTS: Record<string, { name: string; address: string; asset: string }> = {
  "usdc": { name: "Moonwell USDC", address: "0x...", asset: "USDC" },
  "eth": { name: "Moonwell ETH", address: "0x...", asset: "WETH" },
  "weth": { name: "Moonwell ETH", address: "0x...", asset: "WETH" },
  "cbeth": { name: "Moonwell cbETH", address: "0x...", asset: "cbETH" },
};

/**
 * Parse Morpho request from natural language
 */
function parseMorphoRequest(text: string): MorphoRequest | null {
  const lower = text.toLowerCase();

  // Determine intent
  let intent: "supply" | "withdraw";
  if (
    lower.includes("supply") ||
    lower.includes("deposit") ||
    lower.includes("stake") ||
    lower.includes("lend")
  ) {
    intent = "supply";
  } else if (
    lower.includes("withdraw") ||
    lower.includes("remove") ||
    lower.includes("unstake")
  ) {
    intent = "withdraw";
  } else {
    return null;
  }

  // Extract amount and asset
  const amountMatch = text.match(/(\d+\.?\d*)\s*(\w+)/i);
  if (!amountMatch) return null;

  const amount = amountMatch[1];
  const asset = amountMatch[2].toUpperCase();

  // Check for vault specification
  let vault: string | undefined;
  const vaultMatch = text.match(/(?:to|from|in|into)\s+(\w+(?:\s+\w+)*)\s+vault/i);
  if (vaultMatch) {
    vault = vaultMatch[1];
  } else {
    // Use default vault for asset
    const defaultVault = POPULAR_VAULTS[asset.toLowerCase()];
    if (defaultVault) {
      vault = defaultVault.name;
    }
  }

  // Chain
  const chainMatch = text.match(/on\s+(base|ethereum|mainnet)/i);
  const chain = chainMatch ? chainMatch[1].toLowerCase() : "base";

  return { intent, asset, amount, vault, chain };
}

export const otakuMorphoAction: Action = {
  name: "OTAKU_MORPHO",
  description:
    "Supply tokens to Morpho vaults to earn yield, or withdraw your deposits. Wraps Morpho Blue protocol.",
  similes: [
    "MORPHO_SUPPLY",
    "MORPHO_DEPOSIT",
    "MORPHO_WITHDRAW",
    "SUPPLY_MORPHO",
    "LEND_MORPHO",
    "MORPHO_YIELD",
  ],
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Supply 100 USDC to Morpho" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Morpho Supply:**\n- Deposit: 100 USDC\n- Vault: Moonwell USDC\n- Est. APY: ~5.2%\n\nType \"confirm\" to deposit.",
          actions: ["OTAKU_MORPHO"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Withdraw 50 USDC from Morpho" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Morpho Withdrawal:**\n- Withdraw: 50 USDC\n- From: Moonwell USDC vault\n\nType \"confirm\" to withdraw.",
          actions: ["OTAKU_MORPHO"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain Morpho-related intent
    const hasMorphoIntent =
      text.includes("morpho") ||
      ((text.includes("supply") || text.includes("lend") || text.includes("deposit")) &&
        (text.includes("vault") || text.includes("yield")));

    if (!hasMorphoIntent) return false;

    // Check if Morpho service is available
    const morpho = runtime.getService("morpho");
    return !!morpho;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";

    const request = parseMorphoRequest(text);
    if (!request) {
      await callback?.({
        text: [
          "I couldn't parse the Morpho request. Please specify:",
          "- Intent: supply/deposit or withdraw",
          "- Amount and token (e.g., 100 USDC)",
          "",
          "Examples:",
          '- "Supply 100 USDC to Morpho"',
          '- "Withdraw 50 USDC from Morpho vault"',
        ].join("\n"),
      });
      return { success: false, error: new Error("Could not parse Morpho request") };
    }

    // Check if confirmation
    const isConfirmation =
      text.toLowerCase().includes("confirm") ||
      text.toLowerCase() === "yes";

    const pendingMorpho = state?.pendingMorpho as MorphoRequest | undefined;

    if (isConfirmation && pendingMorpho) {
      // Get Morpho service
      const morphoService = runtime.getService("morpho") as {
        deposit?: (params: any) => Promise<any>;
        withdraw?: (params: any) => Promise<any>;
        getVaultByAsset?: (asset: string) => Promise<any>;
      } | null;

      if (!morphoService) {
        await callback?.({
          text: "Morpho service not available. Check plugin configuration.",
        });
        return { success: false, error: new Error("Morpho service not available") };
      }

      await callback?.({
        text: `${pendingMorpho.intent === "supply" ? "Depositing" : "Withdrawing"} ${pendingMorpho.amount} ${pendingMorpho.asset}...`,
      });

      try {
        // Get vault info
        let vaultAddress = pendingMorpho.vault;
        if (morphoService.getVaultByAsset && !vaultAddress?.startsWith("0x")) {
          const vault = await morphoService.getVaultByAsset(pendingMorpho.asset);
          vaultAddress = vault?.address || pendingMorpho.vault;
        }

        // Execute via Morpho action
        const morphoAction =
          pendingMorpho.intent === "supply"
            ? morphoService.deposit
            : morphoService.withdraw;

        if (morphoAction) {
          const result = await morphoAction({
            vault: vaultAddress,
            assets: pendingMorpho.amount,
            chain: pendingMorpho.chain,
          });

          if (result?.success || result?.txHash) {
            const morphoLines = [
              `✅ ${pendingMorpho.intent === "supply" ? "Deposit" : "Withdrawal"} complete!`,
              "",
              `**Amount:** ${pendingMorpho.amount} ${pendingMorpho.asset}`,
              `**Vault:** ${pendingMorpho.vault}`,
              result.txHash ? `**TX:** ${result.txHash.slice(0, 20)}...` : "",
            ].join("\n");
            await callback?.({
              text: "Here's the Morpho result—\n\n" + morphoLines,
            });
            return { success: true };
          }
        }

        // Fallback: try via runtime action execution
        const actionResult = await runtime.executeAction(
          pendingMorpho.intent === "supply" ? "MORPHO_VAULT_TRANSFER" : "MORPHO_VAULT_TRANSFER",
          {
            intent: pendingMorpho.intent === "supply" ? "deposit" : "withdraw",
            vault: vaultAddress,
            assets: pendingMorpho.amount,
            chain: pendingMorpho.chain,
          }
        );

        if (actionResult) {
          const fallbackText = `✅ ${pendingMorpho.intent === "supply" ? "Deposit" : "Withdrawal"} submitted to Morpho!`;
          await callback?.({
            text: "Here's the Morpho result—\n\n" + fallbackText,
          });
          return { success: true };
        }

        throw new Error("No response from Morpho");
      } catch (err) {
        await callback?.({
          text: `❌ Morpho ${pendingMorpho.intent} failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    }

    // Get APY estimate if available
    let apyEstimate = "~5%"; // Default
    const morphoService = runtime.getService("morpho") as {
      getVaultApy?: (asset: string) => Promise<number>;
    } | null;

    if (morphoService?.getVaultApy) {
      try {
        const apy = await morphoService.getVaultApy(request.asset);
        if (apy) apyEstimate = `${apy.toFixed(2)}%`;
      } catch {
        // Use default
      }
    }

    // Build confirmation message
    const lines = [
      `**Morpho ${request.intent === "supply" ? "Supply" : "Withdrawal"}:**`,
      "",
      `💰 **${request.intent === "supply" ? "Deposit" : "Withdraw"}:** ${request.amount} ${request.asset}`,
      `🏦 **Vault:** ${request.vault || "Auto-select best vault"}`,
      `⛓️ **Chain:** ${request.chain || "Base"}`,
    ];

    if (request.intent === "supply") {
      lines.push(`📈 **Est. APY:** ${apyEstimate}`);
    }

    lines.push("");
    lines.push(`⚠️ This will ${request.intent === "supply" ? "lock your tokens in the vault" : "remove tokens from the vault"}.`);
    lines.push("");
    lines.push('Type "confirm" to proceed.');

    await callback?.({ text: lines.join("\n") });

    logger.info(`[OTAKU_MORPHO] Pending: ${JSON.stringify(request)}`);

    return { success: true };
  },
};

export default otakuMorphoAction;
