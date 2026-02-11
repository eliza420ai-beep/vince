/**
 * OpenClaw Correlation Action
 * 
 * Commands:
 * - correlation <tokens...> - Generate correlation matrix
 * - beta <token> [benchmark] - Calculate beta vs benchmark
 * - sector <tokens...> - Analyze sector exposure
 * - divergence <tokens...> - Detect correlation divergences
 * - pair <tokenA> <tokenB> - Detailed pair analysis
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
  calculateCorrelationMatrix,
  formatCorrelationMatrix,
  calculateBeta,
  formatBetaAnalysis,
  getSectorExposure,
  formatSectorExposure,
  detectDivergences,
  formatDivergences,
  analyzePair,
  formatPairAnalysis,
} from "../services/correlation.service";

const COMMON_TOKENS = ["BTC", "ETH", "SOL", "BONK", "WIF", "RNDR", "LINK", "UNI", "AAVE", "ARB", "OP", "AVAX", "NEAR", "APT", "SUI", "DOGE", "SHIB", "PEPE"];

export const correlationAction: Action = {
  name: "OPENCLAW_CORRELATION",
  description: `Cross-token correlation analysis and portfolio analytics.
Commands:
- "correlation BTC ETH SOL" - Generate correlation matrix
- "beta SOL" - Calculate SOL beta vs BTC
- "beta ETH SOL" - Calculate ETH beta vs SOL
- "sector BTC ETH LINK UNI" - Analyze sector exposure
- "divergence BTC ETH SOL ARB" - Detect correlation divergences
- "pair SOL ETH" - Detailed pair analysis`,
  similes: [
    "correlation",
    "correlations",
    "correlation matrix",
    "corr",
    "beta",
    "beta analysis",
    "sector",
    "sector exposure",
    "divergence",
    "divergences",
    "pair",
    "pair analysis",
    "cross token",
    "cross-token",
  ],
  examples: [
    [
      { user: "user1", content: { text: "correlation BTC ETH SOL AVAX" } },
      { user: "assistant", content: { text: "Generating correlation matrix..." } },
    ],
    [
      { user: "user1", content: { text: "what's the beta of SOL" } },
      { user: "assistant", content: { text: "Calculating SOL beta vs BTC..." } },
    ],
    [
      { user: "user1", content: { text: "pair analysis ETH SOL" } },
      { user: "assistant", content: { text: "Analyzing ETH/SOL pair..." } },
    ],
  ],
  
  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return (
      text.includes("correlation") ||
      text.includes("corr ") ||
      text.includes("beta") ||
      text.includes("sector exposure") ||
      (text.includes("sector") && text.split(/\s+/).some(t => COMMON_TOKENS.includes(t.toUpperCase()))) ||
      text.includes("divergence") ||
      (text.includes("pair") && text.includes("analysis"))
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
      // Extract tokens from message
      const words = originalText.split(/\s+/);
      const tokens = words.filter(w => COMMON_TOKENS.includes(w.toUpperCase())).map(t => t.toUpperCase());
      
      // Beta analysis
      if (text.includes("beta")) {
        const token = tokens[0] || "SOL";
        const benchmark = tokens[1] || "BTC";
        
        const beta = calculateBeta(token, benchmark);
        const response = formatBetaAnalysis(beta);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Pair analysis
      if (text.includes("pair") && text.includes("analysis")) {
        if (tokens.length < 2) {
          if (callback) {
            callback({ text: "⚠️ Please specify two tokens:\n`pair analysis <tokenA> <tokenB>`" });
          }
          return true;
        }
        
        const analysis = analyzePair(tokens[0], tokens[1]);
        const response = formatPairAnalysis(analysis);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Sector exposure
      if (text.includes("sector")) {
        if (tokens.length === 0) {
          if (callback) {
            callback({ text: "⚠️ Please specify tokens to analyze:\n`sector BTC ETH SOL LINK UNI`" });
          }
          return true;
        }
        
        const exposures = getSectorExposure(tokens);
        const response = formatSectorExposure(exposures);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Divergence detection
      if (text.includes("divergence")) {
        const analyzeTokens = tokens.length >= 2 ? tokens : ["BTC", "ETH", "SOL", "AVAX", "ARB"];
        
        const divergences = detectDivergences(analyzeTokens);
        const response = formatDivergences(divergences);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Correlation matrix (default)
      if (text.includes("correlation") || text.includes("corr")) {
        const matrixTokens = tokens.length >= 2 ? tokens : ["BTC", "ETH", "SOL", "AVAX", "ARB"];
        
        if (callback) {
          callback({ text: `🔄 Generating correlation matrix for ${matrixTokens.length} tokens...` });
        }
        
        const matrix = calculateCorrelationMatrix(matrixTokens);
        const response = formatCorrelationMatrix(matrix);
        if (callback) callback({ text: response });
        return true;
      }
      
      // Default help
      const response = `📊 **Correlation Analysis**

**Commands:**
• \`correlation <tokens...>\` - Correlation matrix
• \`beta <token> [benchmark]\` - Beta analysis
• \`sector <tokens...>\` - Sector exposure
• \`divergence <tokens...>\` - Detect divergences
• \`pair analysis <A> <B>\` - Detailed pair analysis

**Examples:**
\`correlation BTC ETH SOL AVAX\`
\`beta SOL\`
\`sector BTC ETH LINK UNI AAVE\`
\`pair analysis ETH SOL\``;
      
      if (callback) callback({ text: response });
      return true;
      
    } catch (error) {
      logger.error("[Correlation] Error:", error);
      if (callback) {
        callback({ text: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}` });
      }
      return false;
    }
  },
};

export default correlationAction;
