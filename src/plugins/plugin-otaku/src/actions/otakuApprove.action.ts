/**
 * OTAKU_APPROVE - Token approval management
 *
 * Manage ERC20 token approvals for DeFi protocols:
 * - Approve: Grant spending permission
 * - Revoke: Remove approval (set to 0)
 * - Check: View current approvals
 *
 * Essential for security — revoke unused approvals!
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

interface ApproveRequest {
  intent: "approve" | "revoke" | "check";
  token: string;
  spender?: string;
  amount?: string;
  chain?: string;
}

// Known spender addresses (protocols)
const KNOWN_SPENDERS: Record<string, { name: string; address: string }> = {
  uniswap: { name: "Uniswap V3 Router", address: "0x2626664c2603336E57B271c5C0b26F421741e481" },
  morpho: { name: "Morpho Blue", address: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" },
  "1inch": { name: "1inch Router", address: "0x1111111254EEB25477B68fb85Ed929f73A960582" },
  aave: { name: "Aave V3 Pool", address: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" },
  compound: { name: "Compound Comet", address: "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf" },
};

/**
 * Parse approval request from natural language
 */
function parseApproveRequest(text: string): ApproveRequest | null {
  const lower = text.toLowerCase();

  // Determine intent
  let intent: "approve" | "revoke" | "check";
  if (lower.includes("revoke") || lower.includes("remove approval") || lower.includes("cancel")) {
    intent = "revoke";
  } else if (lower.includes("check") || lower.includes("view") || lower.includes("show approval")) {
    intent = "check";
  } else if (lower.includes("approve") || lower.includes("allow")) {
    intent = "approve";
  } else {
    return null;
  }

  // Extract token
  const tokenMatch = text.match(/(?:approve|revoke|check)\s+(\w+)/i);
  const token = tokenMatch ? tokenMatch[1].toUpperCase() : null;
  if (!token) return null;

  // Extract spender
  let spender: string | undefined;
  const spenderMatch = text.match(/(?:for|to|on|from)\s+(\w+)/i);
  if (spenderMatch) {
    const spenderKey = spenderMatch[1].toLowerCase();
    if (KNOWN_SPENDERS[spenderKey]) {
      spender = KNOWN_SPENDERS[spenderKey].address;
    } else if (spenderMatch[1].startsWith("0x")) {
      spender = spenderMatch[1];
    }
  }

  // Extract amount (for approve)
  let amount: string | undefined;
  if (intent === "approve") {
    const amountMatch = text.match(/(\d+\.?\d*)\s*\w*\s*(?:tokens?)?/i);
    if (amountMatch) {
      amount = amountMatch[1];
    } else if (lower.includes("max") || lower.includes("unlimited")) {
      amount = "unlimited";
    }
  }

  // Chain
  const chainMatch = text.match(/on\s+(base|ethereum|arbitrum|polygon)/i);
  const chain = chainMatch ? chainMatch[1].toLowerCase() : "base";

  return { intent, token, spender, amount, chain };
}

export const otakuApproveAction: Action = {
  name: "OTAKU_APPROVE",
  description:
    "Manage ERC20 token approvals. Approve tokens for DeFi protocols, revoke unused approvals, or check current approvals.",
  similes: [
    "APPROVE_TOKEN",
    "REVOKE_APPROVAL",
    "CHECK_APPROVALS",
    "TOKEN_APPROVAL",
    "ALLOWANCE",
    "REVOKE_TOKEN",
  ],
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Approve USDC for Uniswap" },
      },
      {
        name: "Otaku",
        content: {
          text: "**Token Approval:**\n- Token: USDC\n- Spender: Uniswap V3 Router\n- Amount: Unlimited\n\n⚠️ This grants spending permission.\n\nType \"confirm\" to approve.",
          actions: ["OTAKU_APPROVE"],
        },
      },
    ],
    [
      {
        name: "{{name1}}",
        content: { text: "Revoke USDC approval for 1inch" },
      },
      {
        name: "Otaku",
        content: {
          text: "**Revoke Approval:**\n- Token: USDC\n- Spender: 1inch Router\n\nThis will remove spending permission.\n\nType \"confirm\" to revoke.",
          actions: ["OTAKU_APPROVE"],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();

    // Must contain approval-related intent
    const hasApprovalIntent =
      text.includes("approve") ||
      text.includes("revoke") ||
      text.includes("allowance") ||
      (text.includes("check") && text.includes("approval"));

    if (!hasApprovalIntent) return false;

    // Need CDP for wallet operations
    const cdp = runtime.getService("cdp");
    return !!cdp;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<void | ActionResult> => {
    const text = message.content?.text ?? "";

    const request = parseApproveRequest(text);
    if (!request) {
      await callback?.({
        text: [
          "I couldn't parse the approval request. Please specify:",
          "- Action: approve, revoke, or check",
          "- Token (e.g., USDC, ETH)",
          "- Protocol/spender (e.g., Uniswap, Morpho)",
          "",
          "Examples:",
          '- "Approve USDC for Uniswap"',
          '- "Revoke USDC approval for 1inch"',
          '- "Check my USDC approvals"',
        ].join("\n"),
      });
      return { success: false, error: new Error("Could not parse approval request") };
    }

    // Handle "check" intent
    if (request.intent === "check") {
      // Would need to query token contract for allowances
      await callback?.({
        text: [
          `**${request.token} Approvals:**`,
          "",
          "⚠️ Full approval checking requires indexer integration.",
          "For now, check on Etherscan/Basescan:",
          `https://basescan.org/tokenapprovalchecker`,
        ].join("\n"),
      });
      return { success: true };
    }

    // Check if confirmation
    const isConfirmation =
      text.toLowerCase().includes("confirm") ||
      text.toLowerCase() === "yes";

    const pendingApproval = state?.pendingApproval as ApproveRequest | undefined;

    if (isConfirmation && pendingApproval) {
      const cdp = runtime.getService("cdp") as {
        approve?: (token: string, spender: string, amount: string) => Promise<any>;
        revoke?: (token: string, spender: string) => Promise<any>;
        writeContract?: (params: any) => Promise<any>;
      } | null;

      if (!cdp) {
        await callback?.({
          text: "CDP service not available for approval operations.",
        });
        return { success: false, error: new Error("CDP service not available") };
      }

      await callback?.({
        text: `${pendingApproval.intent === "approve" ? "Approving" : "Revoking"} ${pendingApproval.token}...`,
      });

      try {
        let result: any;

        if (pendingApproval.intent === "approve" && cdp.approve) {
          const amount = pendingApproval.amount === "unlimited"
            ? "115792089237316195423570985008687907853269984665640564039457584007913129639935" // max uint256
            : pendingApproval.amount || "0";
          result = await cdp.approve(pendingApproval.token, pendingApproval.spender!, amount);
        } else if (pendingApproval.intent === "revoke" && cdp.revoke) {
          result = await cdp.revoke(pendingApproval.token, pendingApproval.spender!);
        } else if (cdp.writeContract) {
          // Fallback to direct contract call
          result = await cdp.writeContract({
            address: pendingApproval.token, // Would need token address lookup
            abi: ["function approve(address spender, uint256 amount) returns (bool)"],
            functionName: "approve",
            args: [
              pendingApproval.spender,
              pendingApproval.intent === "revoke" ? "0" : pendingApproval.amount,
            ],
          });
        }

        if (result?.success || result?.txHash || result?.hash) {
          const action = pendingApproval.intent === "approve" ? "Approved" : "Revoked";
          await callback?.({
            text: [
              `✅ ${action}!`,
              "",
              `**Token:** ${pendingApproval.token}`,
              `**Spender:** ${pendingApproval.spender?.slice(0, 10)}...`,
              result.txHash || result.hash ? `**TX:** ${(result.txHash || result.hash).slice(0, 20)}...` : "",
            ].join("\n"),
          });
          return { success: true };
        }

        throw new Error("Transaction failed");
      } catch (err) {
        await callback?.({
          text: `❌ ${pendingApproval.intent === "approve" ? "Approval" : "Revocation"} failed: ${err instanceof Error ? err.message : String(err)}`,
        });
        return { success: false, error: err instanceof Error ? err : new Error(String(err)) };
      }
    }

    // Need spender for approve/revoke
    if (!request.spender) {
      const spenderList = Object.entries(KNOWN_SPENDERS)
        .map(([key, val]) => `- ${key}: ${val.name}`)
        .join("\n");

      await callback?.({
        text: [
          `Which protocol should I ${request.intent} ${request.token} for?`,
          "",
          "**Known protocols:**",
          spenderList,
          "",
          `Or provide a contract address (0x...).`,
        ].join("\n"),
      });
      return { success: true };
    }

    // Build confirmation message
    const spenderName =
      Object.values(KNOWN_SPENDERS).find((s) => s.address === request.spender)?.name ||
      request.spender?.slice(0, 20) + "...";

    const lines = [
      `**${request.intent === "approve" ? "Token Approval" : "Revoke Approval"}:**`,
      "",
      `🪙 **Token:** ${request.token}`,
      `📍 **Spender:** ${spenderName}`,
    ];

    if (request.intent === "approve") {
      lines.push(`💰 **Amount:** ${request.amount || "Unlimited"}`);
      lines.push("");
      lines.push("⚠️ This grants the protocol permission to spend your tokens.");
    } else {
      lines.push("");
      lines.push("This will remove the protocol's spending permission.");
    }

    lines.push("");
    lines.push('Type "confirm" to proceed.');

    await callback?.({ text: lines.join("\n") });

    logger.info(`[OTAKU_APPROVE] Pending: ${JSON.stringify(request)}`);

    return { success: true };
  },
};

export default otakuApproveAction;
