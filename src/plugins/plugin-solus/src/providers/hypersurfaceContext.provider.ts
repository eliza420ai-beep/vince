/**
 * SOLUS_HYPERSURFACE_CONTEXT — Injects Hypersurface mechanics into state on every Solus reply.
 * Ensures mechanics are always in context even when RAG doesn't retrieve the right chunk.
 * When portfolio/open positions are set (file or SOLUS_PORTFOLIO_CONTEXT), appends [Portfolio context].
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { getPortfolioContextBlock } from "../utils/weeklyOptionsContext";

const HYPERSURFACE_CHEAT_SHEET = `
Hypersurface (execution only): hypersurface.io. Deribit = IV/data only, not trading.
Expiry: Friday 08:00 UTC weekly. Early exercise: Hypersurface may exercise ITM up to ~24h before — Thursday evening matters.
Assets: HYPE, SOL, WBTC, ETH.
Covered calls: You own the asset; sell a call at strike; earn upfront premium. Above strike = assigned (sell at strike); at or below = keep asset + premium.
Cash-secured puts (CSP): Hold stablecoins (e.g. USDT0) = strike × quantity; sell a put; earn upfront premium. Below strike = assigned (buy at strike; premium reduces cost basis); at or above = keep cash + premium.
Wheel: Own asset → sell CC → if assigned, hold cash → sell CSP → if assigned, own asset again. Premium at every step. After assignment: bullish = buy back and restart calls; bearish = sell puts at lower strike; neutral = sell puts same strike, collect premium while waiting.
Strike selection: Calls — higher strike = lower premium, lower assignment prob; sweet spot ~20–35% assignment prob, strong APR. Puts — strike at or below where you'd happily buy; consider support, funding, sentiment. Hypersurface UI shows strike, APR, and sell probability (assignment probability).
Funding → strike: Crowded longs (high positive funding) → wider calls. Crowded shorts (high negative funding) → tighter CSPs or higher call strikes. Neutral funding → standard 20–25 delta. HYPE often more crowded; consider 1.5× strike width.
Workflow: Mon–Thu monitor; Thu night review (early exercise possible); Friday 08:00 UTC expiry; Friday open new week.
Solus makes money only when: (1) good strike, (2) good weekly bull or bear sentiment for the asset. Weekly expiry = bet on the week (not 1h/1d like perps).
Data boundary: Solus does not have live funding, IV, or sentiment feeds; he has spot + mechanics only. Where price lands by Friday comes from pasted context (e.g. VINCE options view) or the user's view. Strike calls are structure/strike-focused; for direction, user gets VINCE's output and pastes here.
`.trim();

export const hypersurfaceContextProvider: Provider = {
  name: "SOLUS_HYPERSURFACE_CONTEXT",
  description:
    "Hypersurface mechanics cheat sheet: expiry, assets, covered calls, CSP, wheel, strike selection. Injected into every Solus reply.",
  position: -5,

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const portfolioBlock = getPortfolioContextBlock();
    const portfolioText = portfolioBlock
      ? `\n\n[Portfolio context]\n${portfolioBlock}`
      : "";
    const text = `[Hypersurface context]\n${HYPERSURFACE_CHEAT_SHEET}${portfolioText}`;
    return {
      text,
      values: {
        hypersurfaceCheatSheet: HYPERSURFACE_CHEAT_SHEET,
        portfolioContext: portfolioBlock || undefined,
      },
    };
  },
};
