/**
 * SENTINEL_MULTI_AGENT — Multi-Agent Architecture Expert
 *
 * Deep knowledge of the VINCE multi-agent vision:
 * - "Feels genuinely alive — like you're building together"
 * - ASK_AGENT, Standups, Option C Discord, Deliverables
 * - A2A Policy, Feedback Flow, Dev Worker Strategy
 *
 * Triggers:
 * - "multi-agent", "multi agent"
 * - "ask agent", "a2a"
 * - "standup", "standups"
 * - "dream team", "agent roles"
 * - "option c", "discord setup"
 * - "feedback flow"
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
import {
  getArchitectureOverview,
  getNorthStarFeeling,
  getAgentRoles,
  getDeliverableTypes,
  getArchitectureConcepts,
  checkArchitectureHealth,
  getMultiAgentSuggestions,
  getA2APolicyTemplate,
  getStandupConfigTemplate,
} from "../services/multiAgentVision.service";

const MULTI_AGENT_TRIGGERS = [
  "multi-agent",
  "multi agent",
  "multiagent",
  "ask agent",
  "a2a policy",
  "standup",
  "standups",
  "dream team",
  "agent roles",
  "option c",
  "discord setup",
  "feedback flow",
  "dev worker",
  "deliverable types",
  "north star feeling",
  "one team one dream",
];

function wantsMultiAgent(text: string): boolean {
  const lower = text.toLowerCase();
  return MULTI_AGENT_TRIGGERS.some((t) => lower.includes(t));
}

export const sentinelMultiAgentAction: Action = {
  name: "SENTINEL_MULTI_AGENT",
  similes: [
    "MULTI_AGENT_ARCHITECTURE",
    "ASK_AGENT_HELP",
    "STANDUP_CONFIG",
    "DREAM_TEAM",
    "A2A_POLICY",
  ],
  description:
    "Deep knowledge of the VINCE multi-agent architecture: ASK_AGENT, standups, Option C Discord, deliverables, A2A policy, feedback flow, and the north star feeling.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsMultiAgent(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_MULTI_AGENT] Action fired");

    try {
      const userText = (message.content?.text ?? "").trim();
      const lower = userText.toLowerCase();

      // Specific queries
      if (lower.includes("a2a policy") || lower.includes("allowedtargets")) {
        // Extract agent name if mentioned
        const agentMatch = userText.match(
          /(?:for|about)\s+(vince|kelly|solus|eliza|otaku|sentinel)/i,
        );
        const agentName = agentMatch?.[1] || "Kelly";

        const template = getA2APolicyTemplate(agentName);
        const roles = getAgentRoles();

        await callback({
          text: `🔗 **A2A Policy (Agent-to-Agent)**

**How it works:** ASK_AGENT lets one agent ask another a question and report the answer.

**Policy Template for ${agentName}:**
\`\`\`typescript
${template}
\`\`\`

**All Agent A2A Relationships:**
${roles.map((r) => `• **${r.name}** can ask: ${r.canAsk.join(", ")}`).join("\n")}

**Key Points:**
• Configure \`settings.interAgent.allowedTargets\` per character
• Optional \`allow\` rules for fine-grained control
• Default: all agents can ask each other (dream team)

*One team, one dream — they talk to each other.*`,
        });
        return { success: true };
      }

      if (
        lower.includes("standup") &&
        (lower.includes("config") ||
          lower.includes("setup") ||
          lower.includes("how"))
      ) {
        const config = getStandupConfigTemplate();

        await callback({
          text: `📅 **Standup Configuration**

${config}

**The North Star:** Agents meet autonomously 2×/day, discuss crypto + code + ideas, produce action items and lessons learned. You see the summary in #daily-standup. *Feels alive.*`,
        });
        return { success: true };
      }

      if (
        lower.includes("dream team") ||
        lower.includes("agent roles") ||
        lower.includes("who does what")
      ) {
        const roles = getAgentRoles();

        await callback({
          text: `👥 **The Dream Team (One Team, One Dream)**

| Agent | Role | Lane |
|-------|------|------|
${roles.map((r) => `| **${r.name}** | ${r.role} | ${r.lane} |`).join("\n")}

**Startup Analogy:**
• **Eliza** = CEO (strategy, knowledge, content)
• **VINCE** = CDO (data, signals, paper trading)
• **Solus** = CFO (capital, risk, execution)
• **Otaku** = COO (DeFi ops, wallet, onchain)
• **Kelly** = CVO (culture, lifestyle, standups)
• **Sentinel** = CTO (systems, code, PRDs)

*Clear lanes, no overlap. One team, one dream.*`,
        });
        return { success: true };
      }

      if (
        lower.includes("deliverable") ||
        lower.includes("north star deliverable")
      ) {
        const deliverables = getDeliverableTypes();

        await callback({
          text: `📦 **North Star Deliverables**

These define **success** for the standup and content pipeline:

| Type | Owner | Output |
|------|-------|--------|
${deliverables.map((d) => `| **${d.type}** | ${d.owner} | \`${d.outputDir}\` |`).join("\n")}

**How they're produced:**
• Standup parses action items by type (essay, tweets, prd, etc.)
• North-star generator runs instead of code-build path
• Output written to \`docs/standup/\` subdirs (or STANDUP_DELIVERABLES_DIR)

*Success = these seven (now eight with eliza_task).*`,
        });
        return { success: true };
      }

      if (lower.includes("option c") || lower.includes("discord setup")) {
        await callback({
          text: `🎭 **Option C: Separate Discord Identities**

**The Goal:** Users see separate bots — Vince, Kelly, Sentinel — each with their own profile and presence. Not one bot multiplexing by session.

**How:**
1. Create separate Discord applications at [Discord Developer Portal](https://discord.com/developers/applications)
2. Each agent gets its own env vars:
   \`\`\`bash
   VINCE_DISCORD_APPLICATION_ID=...
   VINCE_DISCORD_API_TOKEN=...
   
   KELLY_DISCORD_APPLICATION_ID=...
   KELLY_DISCORD_API_TOKEN=...
   
   SENTINEL_DISCORD_APPLICATION_ID=...
   SENTINEL_DISCORD_API_TOKEN=...
   \`\`\`
3. Startup validates: no duplicate app IDs allowed

**Why it matters:** Distinct agent identities. Users know who they're talking to. *Feels genuinely alive.*`,
        });
        return { success: true };
      }

      if (
        lower.includes("feedback flow") ||
        lower.includes("testing feedback")
      ) {
        await callback({
          text: `🔄 **Feedback Flow (Planned)**

**Goal:** User feedback from testing → Sentinel triages → PRD or Eliza task

**Flow:**
1. User: \`FEEDBACK: Kelly should recommend Biarritz restaurants\`
2. Kelly (tested agent) → ASK_AGENT Sentinel with feedback + context
3. Sentinel triages:
   • **Code/behavior fix** → PRD for Cursor (\`docs/standup/prds/\`)
   • **Knowledge gap** → Eliza task (\`docs/standup/eliza-tasks/\`)
4. Sentinel returns confirmation → Kelly relays to user

**Why triage:** Not every feedback is code. Sometimes it's knowledge (Kelly doesn't know Biarritz because corpus is thin). Right fix = task for Eliza to expand knowledge.

**Status:** Documented in MULTI_AGENT.md, ready for implementation.`,
        });
        return { success: true };
      }

      if (
        lower.includes("dev worker") ||
        (lower.includes("milaidy") && lower.includes("implement"))
      ) {
        await callback({
          text: `🤖 **Dev Worker Strategy**

**Problem:** Too many good PRDs, not enough implementation capacity.

**Solution:** Use Milaidy or OpenClaw as autonomous dev worker.

**Milaidy (Preferred):**
• Same ElizaOS stack, existing Gateway hook
• MILAIDY_GATEWAY_URL → POST /api/standup-action
• Extend contract for "implement this PRD"

**OpenClaw (Alternative):**
• Session with repo access + standing instructions
• Session tools (sessions_send, reply-back) for coordination
• Separate stack = more ops

**Flow:**
PRD written → Agent reads it → Implements → Opens PR → Human reviews

**Safety:** Agent opens PR, human merges. Never push to main.

**Recommendation:** Ship feedback flow first. Add dev worker when PRD backlog grows.`,
        });
        return { success: true };
      }

      // General multi-agent overview
      const overview = getArchitectureOverview();
      const healthIssues = checkArchitectureHealth();
      const suggestions = getMultiAgentSuggestions(userText);

      let response = `🏗️ **Multi-Agent Architecture**\n\n`;
      response += `**North Star:** *${getNorthStarFeeling().slice(0, 150)}...*\n\n`;

      // Quick summary
      const roles = getAgentRoles();
      response += `**Dream Team:** ${roles.map((r) => r.name).join(", ")}\n\n`;

      // Architecture concepts
      const concepts = getArchitectureConcepts();
      response += `**Key Concepts:**\n`;
      for (const c of concepts.slice(0, 4)) {
        response += `• **${c.name}:** ${c.description.slice(0, 60)}...\n`;
      }
      response += `\n`;

      // Health check
      if (healthIssues.length > 0) {
        response += `**⚠️ Configuration Issues:**\n`;
        for (const issue of healthIssues.slice(0, 3)) {
          response += `• ${issue}\n`;
        }
        response += `\n`;
      }

      // Suggestions
      if (suggestions.length > 0) {
        response += `**💡 Suggestions:**\n`;
        for (const s of suggestions.slice(0, 3)) {
          response += `• ${s}\n`;
        }
      }

      response += `\n---\n*Ask about specific topics: "a2a policy", "standup config", "dream team", "option c discord", "feedback flow", "dev worker"*`;

      const out = "Here's the multi-agent picture—\n\n" + response;
      await callback({ text: out });
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_MULTI_AGENT] Failed:", error);
      await callback({
        text: "Failed to provide multi-agent guidance. Check MULTI_AGENT.md for the full architecture vision.",
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
        content: { text: "Tell me about the multi-agent architecture" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🏗️ **Multi-Agent Architecture**\n\n**North Star:** *A Discord where your agents talk to you and each other...*\n\n**Dream Team:** Eliza, VINCE, Solus, Otaku, Kelly, Sentinel\n\n**Key Concepts:**\n• ASK_AGENT, Option C Discord, Standups, Feedback Flow...",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "How do I set up standups?" } },
      {
        name: "{{agent}}",
        content: {
          text: "📅 **Standup Configuration**\n\n```bash\nSTANDUP_ENABLED=true\nSTANDUP_COORDINATOR_AGENT=Kelly\n...\n```",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "What's the dream team?" } },
      {
        name: "{{agent}}",
        content: {
          text: "👥 **The Dream Team**\n\n| Agent | Role | Lane |\n|-------|------|------|\n| Eliza | CEO | Knowledge, research... |",
        },
      },
    ],
  ],
};
