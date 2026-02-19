import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * HIP-3 AI-related assets on Hyperliquid.
 * Sourced from plugin-vince targetAssets.ts.
 */
const HIP3_AI_ASSETS_MD = `# HIP-3 AI-Related Assets on Hyperliquid

HIP-3 assets are synthetic perps. Trade these as perps; xyz for stocks (USDC settled), vntl for AI/tech names. For live prices, funding, or positions, ask Vince.

## xyz DEX (USDC) — AI/Tech Stocks

| Ticker | Company | API |
|--------|---------|-----|
| NVDA | Nvidia | xyz:NVDA |
| GOOGL | Alphabet (Google) | xyz:GOOGL |
| META | Meta Platforms | xyz:META |
| MSFT | Microsoft | xyz:MSFT |
| AAPL | Apple | xyz:AAPL |
| PLTR | Palantir | xyz:PLTR |
| INTC | Intel | xyz:INTC |
| ORCL | Oracle | xyz:ORCL |
| MU | Micron | xyz:MU |
| NFLX | Netflix | xyz:NFLX |
| MSTR | MicroStrategy | xyz:MSTR |
| COIN | Coinbase | xyz:COIN |
| AMZN | Amazon | xyz:AMZN |
| TSLA | Tesla | xyz:TSLA |

## vntl DEX — AI/Tech Pre-IPO and Indices

| Ticker | Company / Index | API |
|--------|-----------------|-----|
| OPENAI | OpenAI | vntl:OPENAI |
| ANTHROPIC | Anthropic | vntl:ANTHROPIC |
| SPACEX | SpaceX | vntl:SPACEX |
| SNDK | SanDisk (Western Digital) | vntl:SNDK |
| AMD | AMD | vntl:AMD |
| MAG7 | Magnificent 7 index | vntl:MAG7 |
| SEMIS | Semiconductors index | vntl:SEMIS |
| INFOTECH | Info tech index | vntl:INFOTECH |
| ROBOT | Robotics index | vntl:ROBOT |

**Summary:** xyz = most stocks. vntl = OPENAI, ANTHROPIC, SPACEX, SNDK, AMD, MAG7, SEMIS, INFOTECH, ROBOT.`;

export const openclawHip3AiAssetsAction: Action = {
  name: "OPENCLAW_HIP3_AI_ASSETS",
  similes: ["OPENCLAW_HIP3_AI_ASSETS", "HIP3_AI", "HIP3_AI_ASSETS"],
  description:
    "Return HIP-3 AI-related assets on Hyperliquid from plugin-vince targetAssets (NVDA, GOOGL, META, OPENAI, ANTHROPIC, SNDK, AMD, MAG7, SEMIS, etc.). Use when the user asks about hip3 ai, hyperliquid ai assets, ai perps on Hyperliquid, NVDA/GOOGL/META/OPENAI/ANTHROPIC/SNDK perps.",
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text =
      (message?.content?.text ?? "").toLowerCase() +
      (state?.text ?? "").toLowerCase();
    return (
      /hip3\s*ai|hyperliquid\s*ai|ai\s*perps|ai\s*assets/i.test(text) ||
      /\b(nvda|googl|meta|openai|anthropic|sndk|sandisk|amd|mag7|semis|infotech|robot|spacex)\b/i.test(
        text,
      )
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const intro = "Here are the HIP-3 AI assets on Hyperliquid—";
    const out = intro + "\n\n" + HIP3_AI_ASSETS_MD;
    if (callback)
      await callback({ text: out, actions: ["OPENCLAW_HIP3_AI_ASSETS"] });
    return { success: true, text: out };
  },
  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "HIP-3 AI assets on Hyperliquid?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: HIP3_AI_ASSETS_MD.slice(0, 400) + "...",
          actions: ["OPENCLAW_HIP3_AI_ASSETS"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Can I trade OPENAI perps?" } },
      {
        name: "{{agent}}",
        content: {
          text: "Yes. OPENAI is on vntl dex as vntl:OPENAI. Full list: ...",
          actions: ["OPENCLAW_HIP3_AI_ASSETS"],
        },
      },
    ],
  ],
};
