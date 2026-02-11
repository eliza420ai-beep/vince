/**
 * OpenClaw Governance Action
 * 
 * Commands:
 * - governance active - View active proposals
 * - governance <protocol> - View protocol proposals
 * - governance proposal <id> - View proposal details
 * - governance watch <protocol> - Add to watchlist
 * - governance unwatch <protocol> - Remove from watchlist
 * - governance watchlist - View watched protocols
 * - governance delegates <protocol> - View top delegates
 * - governance stats <protocol> - Protocol governance stats
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from "@elizaos/core";
import {
  getActiveProposals,
  getProposalHistory,
  formatProposal,
  formatActiveProposals,
  getWatchedProtocols,
  watchProtocol,
  unwatchProtocol,
  formatWatchedProtocols,
  getTopDelegates,
  formatDelegates,
  getGovernanceStats,
  formatGovernanceStats,
  checkGovernanceAlerts,
  formatGovernanceAlerts,
} from "../services/governance.service";

const KNOWN_PROTOCOLS = ["uniswap", "aave", "compound", "makerdao", "maker", "arbitrum", "optimism", "ens", "lido", "curve", "jito"];

export const governanceAction: Action = {
  name: "OPENCLAW_GOVERNANCE",
  description: `DAO governance tracking and proposal monitoring.
Commands:
- "governance active" - View all active proposals
- "governance uniswap" - View Uniswap proposals
- "governance watch arbitrum" - Watch Arbitrum governance
- "governance unwatch arbitrum" - Stop watching
- "governance watchlist" - View watched protocols
- "governance delegates aave" - View top Aave delegates
- "governance stats optimism" - Optimism governance stats`,
  similes: [
    "governance",
    "gov",
    "proposals",
    "proposal",
    "dao",
    "voting",
    "delegates",
    "delegate",
    "governance watch",
    "governance stats",
  ],
  examples: [
    [
      { user: "user1", content: { text: "show active governance proposals" } },
      { user: "assistant", content: { text: "Here are the active governance proposals..." } },
    ],
    [
      { user: "user1", content: { text: "governance watch arbitrum" } },
      { user: "assistant", content: { text: "Added Arbitrum to governance watchlist..." } },
    ],
    [
      { user: "user1", content: { text: "top delegates on aave" } },
      { user: "assistant", content: { text: "Here are the top Aave delegates..." } },
    ],
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("governance") ||
      text.includes("proposal") ||
      text.includes("dao") ||
      text.includes("delegate") ||
      (text.includes("voting") && KNOWN_PROTOCOLS.some(p => text.includes(p)))
    );
  },
  
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    const originalText = message.content?.text || "";
    
    try {
      const words = originalText.toLowerCase().split(/\s+/);
      
      // Find protocol in message
      const protocol = words.find(w => KNOWN_PROTOCOLS.includes(w));
      
      // Watch/unwatch
      if (text.includes("watch") && !text.includes("watchlist")) {
        if (text.includes("unwatch")) {
          if (!protocol) {
            if (callback) callback({ text: "⚠️ Specify protocol: `governance unwatch <protocol>`" });
            return true;
          }
          const removed = unwatchProtocol(protocol);
          if (callback) {
            callback({ text: removed 
              ? `✅ Removed **${protocol.charAt(0).toUpperCase() + protocol.slice(1)}** from governance watchlist`
              : `⚠️ Protocol not in watchlist` 
            });
          }
          return true;
        } else {
          if (!protocol) {
            if (callback) callback({ text: "⚠️ Specify protocol: `governance watch <protocol>`\n\nAvailable: " + KNOWN_PROTOCOLS.join(", ") });
            return true;
          }
          const watched = watchProtocol(protocol);
          if (callback) {
            callback({ text: `✅ Now watching **${watched.protocol}** governance\n\nYou'll receive alerts for new proposals and votes.` });
          }
          return true;
        }
      }
      
      // Watchlist
      if (text.includes("watchlist")) {
        const watched = getWatchedProtocols();
        const response = formatWatchedProtocols(watched);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Delegates
      if (text.includes("delegate")) {
        if (!protocol) {
          if (callback) callback({ text: "⚠️ Specify protocol: `governance delegates <protocol>`" });
          return true;
        }
        const delegates = getTopDelegates(protocol);
        const response = formatDelegates(delegates, protocol.charAt(0).toUpperCase() + protocol.slice(1));
        if (callback) callback({ text: response });
        return true;
      }
      
      // Stats
      if (text.includes("stats")) {
        if (!protocol) {
          if (callback) callback({ text: "⚠️ Specify protocol: `governance stats <protocol>`" });
          return true;
        }
        const stats = getGovernanceStats(protocol);
        const response = formatGovernanceStats(stats);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Specific proposal
      if (text.includes("proposal") && words.some(w => w.includes("-") && /\d/.test(w))) {
        const proposalId = words.find(w => w.includes("-") && /\d/.test(w));
        // For now, generate a mock proposal
        if (protocol) {
          const proposals = getProposalHistory(protocol, 1);
          if (proposals.length > 0) {
            const response = formatProposal(proposals[0]);
            if (callback) callback({ text: response });
            return true;
          }
        }
        if (callback) callback({ text: `⚠️ Proposal not found: ${proposalId}` });
        return true;
      }
      
      // Alerts check
      if (text.includes("alert")) {
        const alerts = checkGovernanceAlerts();
        const response = formatGovernanceAlerts(alerts);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Active proposals (with or without protocol filter)
      if (text.includes("active") || (text.includes("governance") && !text.includes("help"))) {
        const proposals = getActiveProposals(protocol);
        const response = formatActiveProposals(proposals);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Protocol-specific proposals
      if (protocol && !text.includes("help")) {
        const proposals = getActiveProposals(protocol);
        const response = formatActiveProposals(proposals);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Default help
      const response = `🏛️ **Governance Tracking**

**Commands:**
• \`governance active\` - All active proposals
• \`governance <protocol>\` - Protocol proposals
• \`governance watch <protocol>\` - Add to watchlist
• \`governance unwatch <protocol>\` - Remove
• \`governance watchlist\` - View watched
• \`governance delegates <protocol>\` - Top delegates
• \`governance stats <protocol>\` - Protocol stats

**Supported Protocols:**
${KNOWN_PROTOCOLS.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ")}

**Examples:**
\`governance active\`
\`governance watch arbitrum\`
\`governance delegates aave\``;
      
      if (callback) callback({ text: response });
      return true;
      
    } catch (error) {
      logger.error("[Governance] Error:", error);
      if (callback) {
        callback({ text: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}` });
      }
      return false;
    }
  },
};

export default governanceAction;
