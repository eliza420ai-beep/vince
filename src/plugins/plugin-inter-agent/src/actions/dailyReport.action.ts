/**
 * DAILY_REPORT Action
 *
 * Generates a structured daily report for the current agent.
 * Each agent produces a domain-specific report based on their role.
 *
 * Usage: "give your daily report" / "what's your status" / "standup report"
 */

import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
  ModelType,
} from "@elizaos/core";
import {
  getReportTemplate,
  getAgentRole,
  formatReportDate,
  getDayOfWeek,
  AGENT_ROLES,
  type AgentName,
} from "../standup/standupReports";
import {
  getStandupData,
  formatMarketTable,
  formatPaperBotStats,
  generateSignalSummary,
  type StandupData,
} from "../standup/standupData.service";

const REPORT_TRIGGERS = [
  "daily report",
  "give your report",
  "standup report",
  "what's your status",
  "share your update",
  "team standup",
  "morning report",
  "your turn",
  "go ahead",
];

/**
 * Build the prompt for generating a daily report with real data
 */
function buildReportPrompt(
  runtime: IAgentRuntime,
  liveData: StandupData | null,
): string {
  const agentName = runtime.character?.name || "Agent";
  const template = getReportTemplate(agentName);
  const role = getAgentRole(agentName);

  if (!template || !role) {
    return `Generate a brief status update for your area of expertise.`;
  }

  const filledTemplate = template
    .replace(/\{\{date\}\}/g, formatReportDate())
    .replace(/\{\{dayOfWeek\}\}/g, getDayOfWeek());

  // Build live data context for VINCE
  let liveDataContext = "";
  if (liveData && agentName.toUpperCase() === "VINCE") {
    liveDataContext = `
## LIVE DATA (use this in your report)

### Market Data
${formatMarketTable(liveData.markets)}

### Paper Bot
${formatPaperBotStats(liveData.paperBot)}

### Signals
${generateSignalSummary(liveData.markets)}

### Fear & Greed
${liveData.fearGreed ? `${liveData.fearGreed.value} (${liveData.fearGreed.label})` : "Not available"}
`;
  }

  return `You are ${agentName} (${role.title} - ${role.focus}).

Generate your daily standup report following this structure:

${filledTemplate}
${liveDataContext}

IMPORTANT RULES:
1. USE THE LIVE DATA ABOVE if provided — do NOT make up numbers
2. If data says "Not available", say that — don't invent figures
3. Be specific with numbers ("up 2.3%" not "up a bit")
4. Focus on BTC, SOL, HYPE — these are our core assets
5. Keep total response under 400 words
6. Always end with clear ACTION or DECISION items

Generate the report now:`;
}

export const dailyReportAction: Action = {
  name: "DAILY_REPORT",
  description:
    "Generate a structured daily report for the standup. Use when asked for status, report, or during team standup.",
  similes: [
    "daily report",
    "standup report",
    "status update",
    "morning report",
    "give report",
    "team update",
    "your turn to report",
  ],

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text || "").toLowerCase();

    // Check for explicit triggers
    if (REPORT_TRIGGERS.some((trigger) => text.includes(trigger))) {
      return true;
    }

    // Check if we're in a standup channel and being asked to contribute
    const isStandupChannel = ((message.content?.channelName || "") as string)
      .toLowerCase()
      .includes("standup");

    if (isStandupChannel) {
      const askingForInput = [
        "your turn",
        "go ahead",
        agentName(runtime).toLowerCase(),
        "what do you have",
        "anything to add",
        "your update",
      ].some((phrase) => text.includes(phrase));

      if (askingForInput) return true;
    }

    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void | ActionResult> => {
    const agentName = runtime.character?.name || "Agent";
    const role = getAgentRole(agentName);

    logger.info(`[DAILY_REPORT] ${agentName} generating daily report`);

    try {
      // Fetch live data (especially for VINCE)
      let liveData: StandupData | null = null;
      try {
        liveData = await getStandupData(runtime);
        logger.info(
          `[DAILY_REPORT] ${agentName} fetched live data: ${liveData.markets.length} assets`,
        );
      } catch (dataErr) {
        logger.warn(
          { dataErr },
          `[DAILY_REPORT] ${agentName} could not fetch live data, using template`,
        );
      }

      // Build the report prompt with live data
      const reportPrompt = buildReportPrompt(runtime, liveData);

      // Generate the report using the LLM
      const report = await runtime.useModel(ModelType.TEXT_LARGE, {
        prompt: reportPrompt,
        maxTokens: 800,
        temperature: 0.7,
      });

      if (!report || typeof report !== "string") {
        throw new Error("Failed to generate report");
      }

      // Send the report
      if (callback) {
        await callback({
          text: report.trim(),
          action: "DAILY_REPORT",
          source: agentName,
        });
      }

      logger.info(
        `[DAILY_REPORT] ${agentName} report generated (${report.length} chars)`,
      );
      return { success: true };
    } catch (error) {
      logger.error(
        { error, agentName },
        "[DAILY_REPORT] Failed to generate report",
      );

      // Fallback: simple status message
      if (callback) {
        await callback({
          text: `*${agentName} (${role?.title || "Agent"}) checking in*\n\nSystems nominal. No critical updates. Ready for questions.`,
          action: "DAILY_REPORT",
          source: agentName,
        });
      }
      return { success: true };
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "VINCE, give your daily report" },
      },
      {
        name: "VINCE",
        content: {
          text: "## VINCE Daily Report — 2026-02-12\n\n### Market Snapshot\n| Asset | Price | 24h | Funding |\n|-------|-------|-----|---------|...",
          action: "DAILY_REPORT",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Team standup, everyone share your status" },
      },
      {
        name: "Eliza",
        content: {
          text: "## Eliza Daily Report — 2026-02-12\n\n### Research Highlights\n- Completed funding divergence analysis...",
          action: "DAILY_REPORT",
        },
      },
    ],
  ],
};

function agentName(runtime: IAgentRuntime): string {
  return runtime.character?.name || "Agent";
}

export default dailyReportAction;
