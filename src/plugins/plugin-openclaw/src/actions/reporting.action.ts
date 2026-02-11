/**
 * OpenClaw Report Generation Action
 * 
 * Commands:
 * - report <token> [quick|standard|deep] - Generate research report
 * - report history - View past reports
 * - report load <id> - Load a saved report
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
  generateReport,
  formatReport,
  getReportHistory,
  loadReport,
  formatReportHistory,
  type ReportConfig,
} from "../services/reporting.service";

const COMMON_TOKENS = ["BTC", "ETH", "SOL", "BONK", "WIF", "RNDR", "LINK", "UNI", "AAVE", "ARB", "OP", "AVAX", "NEAR", "APT", "SUI"];
const DEPTHS = ["quick", "standard", "deep"] as const;

export const reportingAction: Action = {
  name: "OPENCLAW_REPORT",
  description: `Generate professional research reports with multi-agent analysis.
Commands:
- "report SOL" - Generate standard research report
- "report ETH deep" - Generate comprehensive deep-dive report
- "report BTC quick" - Generate quick summary report
- "report history" - View past reports
- "report load rpt_xxx" - Load a saved report`,
  similes: [
    "report",
    "research report",
    "generate report",
    "full report",
    "deep dive",
    "analysis report",
    "report history",
    "load report",
    "view report",
  ],
  examples: [
    [
      { user: "user1", content: { text: "generate a report on SOL" } },
      { user: "assistant", content: { text: "Generating comprehensive SOL research report..." } },
    ],
    [
      { user: "user1", content: { text: "deep dive report on ETH" } },
      { user: "assistant", content: { text: "Generating deep-dive ETH report..." } },
    ],
    [
      { user: "user1", content: { text: "show report history" } },
      { user: "assistant", content: { text: "Here are your past reports..." } },
    ],
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("report") ||
      text.includes("deep dive") ||
      text.includes("analysis report")
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
      const words = originalText.split(/\s+/);
      
      // Report history
      if (text.includes("report") && text.includes("history")) {
        const history = getReportHistory(10);
        const response = formatReportHistory(history);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Load report
      if (text.includes("report") && (text.includes("load") || text.includes("view"))) {
        const idMatch = words.find(w => w.startsWith("rpt_"));
        if (!idMatch) {
          if (callback) {
            callback({ text: "⚠️ Please specify report ID:\n`report load <report_id>`\n\nView past reports: `report history`" });
          }
          return true;
        }
        
        const report = loadReport(idMatch);
        if (!report) {
          if (callback) callback({ text: `❌ Report not found: ${idMatch}` });
          return true;
        }
        
        const response = formatReport(report);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Generate report
      const tokens = words.filter(w => COMMON_TOKENS.includes(w.toUpperCase())).map(t => t.toUpperCase());
      const token = tokens[0];
      
      if (!token) {
        // Show help
        const response = `📊 **Research Reports**

Generate institutional-grade research reports with multi-agent analysis.

**Commands:**
• \`report <token>\` - Standard report
• \`report <token> quick\` - Quick summary (2 sections)
• \`report <token> deep\` - Deep dive (9 sections)
• \`report history\` - View past reports
• \`report load <id>\` - Load saved report

**Report Sections:**
• Executive Summary • Fundamentals • Technicals
• Sentiment • On-Chain • Risk Assessment
• Competitive • Catalysts • Recommendation

**Examples:**
\`report SOL\`
\`report ETH deep\`
\`report BTC quick\``;
        
        if (callback) callback({ text: response });
        return true;
      }
      
      // Determine depth
      let depth: typeof DEPTHS[number] = "standard";
      if (text.includes("quick") || text.includes("summary")) {
        depth = "quick";
      } else if (text.includes("deep") || text.includes("comprehensive") || text.includes("full")) {
        depth = "deep";
      }
      
      // Generate progress message
      const depthLabels = {
        quick: "Quick (2 sections)",
        standard: "Standard (6 sections)",
        deep: "Deep Dive (9 sections)",
      };
      
      if (callback) {
        callback({ text: `📝 Generating ${token} research report...\n\n**Depth:** ${depthLabels[depth]}\n\n_Multi-agent analysis in progress..._` });
      }
      
      const config: ReportConfig = {
        token,
        depth,
        sections: [],
        format: "markdown",
        includeCharts: true,
      };
      
      const report = generateReport(config);
      const response = formatReport(report);
      
      // Split if too long (Discord/Telegram limits)
      if (response.length > 4000) {
        const parts = response.match(/[\s\S]{1,3900}/g) || [response];
        for (let i = 0; i < parts.length; i++) {
          const partText = i === 0 ? parts[i] : `*(continued ${i + 1}/${parts.length})*\n\n${parts[i]}`;
          if (callback) callback({ text: partText });
        }
      } else {
        if (callback) callback({ text: response });
      }
      
      return true;
      
    } catch (error) {
      logger.error("[Report] Error:", error);
      if (callback) {
        callback({ text: `❌ Error generating report: ${error instanceof Error ? error.message : "Unknown error"}` });
      }
      return false;
    }
  },
};

export default reportingAction;
