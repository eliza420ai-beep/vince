---
tags: [trading, options, derivatives]
agents: [solus, eliza]
last_reviewed: 2026-02-15
---

# Hypersurface: How It Works, How We Use It, Why

Single source for Solus: everything about Hypersurface — mechanics summary, why we use it, and how we use it in this project.

---

## How It Works (Summary)

**Hypersurface** (https://hypersurface.io) is the only platform we use for options execution. Assets: HYPE, SOL, WBTC, ETH. Expiry: **Friday 08:00 UTC** (weekly). Hypersurface may exercise ITM options up to ~24 hours before expiry, so Thursday evening matters.

**Covered calls:** You own the asset; you sell a call at a strike; you earn upfront premium. Above strike → assigned (sell at strike); at or below → keep asset + premium. **Cash-secured puts (CSPs):** You hold stablecoins (e.g. USDT0) equal to strike × quantity; you sell a put; you earn upfront premium. Below strike → assigned (buy at strike; premium reduces cost basis); at or above → keep cash + premium. **Wheel:** Own asset → sell covered calls → if assigned, hold cash → sell secured puts → if assigned, own asset again. Premium at every step.

**Strike selection:** For calls — higher strike = lower premium, lower assignment prob; lower strike = higher premium, higher assignment prob. Sweet spot ~20–35% assignment prob, strong APR. For puts — strike at or below where you'd happily buy; consider support, funding, sentiment.

Full mechanics (tables, workflow, Deribit vs Hypersurface, perps data for strikes): see [hypersurface-reference.md](./hypersurface-reference.md) in this directory.

---

## Why We Use Hypersurface

- **Only execution venue.** We execute all options (covered calls, secured puts) on Hypersurface. Deribit is for IV/volatility data only, not trading.
- **Right-curve income.** Primary income and edge live on the right curve: options income on Hypersurface plus ship code (Sentinel). Left curve = Vince perps (Hyperliquid); mid curve = HIP-3 spot + stack sats; right curve = options + ship code.
- **Target: $3K/week minimum.** Hypersurface options are pillar 1 of the $100K stack; options carry the target, the rest compounds.
- **Solus's edge.** Solus makes money only when (1) he picks a good strike, and (2) there is good bull or bear sentiment for the next week. Weekly expiry (Friday 08:00 UTC) — the bet is on the week, not hours or days. Same four assets (BTC, ETH, SOL, HYPE) as Vince; different product and timeframe (weekly options vs perps).

---

## How We Use It in This Project

**Solus owns:** Hypersurface mechanics, how covered calls and secured puts work, optimal strike brainstorming, $100K plan, how to run strike ritual, size/skip/watch when the user pastes context, invalidation, Echo DD process, rebalance. Any request for plan, process, decision, or options execution → Solus answers.

**VINCE owns:** Live options chain, IV/DVOL, Deribit briefing, funding, CT vibe ("What's CT saying about BTC?"), aloha, perps, memes, news, X research, paper bot status, yield. Any request for live data or daily options data → "That's VINCE. Say 'options' to him, paste his answer here, and I'll give you the strike call and invalidation."

**Strike ritual (Friday):** (1) User says "options" to VINCE and gets IV/DVOL and strike suggestions. (2) If they want CT vibe, they ask VINCE "What's CT saying about BTC" (or ticker). (3) User pastes that (or summarizes) to Solus; Solus gives size/skip/watch, optimal strike (OTM %, asset), and invalidation. Solus can also use the latest Grok daily from internal-docs if the user hasn't pasted live data.

**Seven pillars:** (1) HYPERSURFACE options — $3K/week minimum. (2) Yield (USDC/USDT0). (3) Stack sats. (4) Echo seed DD. (5) Paper perps bot. (6) HIP-3 spot. (7) Airdrop farming. Options carry the target; the rest compounds.

**Agents suggest only; they never execute.** Solus gives one clear call (size/skip/watch) and invalidation; the user executes on Hypersurface.

**Collateral:** Secured puts use stablecoins (e.g. USDT0) equal to strike × quantity. Position descriptions (e.g. "$70K secured puts, $3,800 premium, $150K USDT0, expiry next Friday") are interpreted by Solus for assessment and hold/roll/adjust.

**Standup:** In autonomous standups, Solus answers the essential question (e.g. "Based on current market sentiment, do you think BTC will be above $70K by next Friday?") using prior reports and data; options settle Friday 08:00 UTC on Hypersurface.

---

## References

- Full mechanics and workflow: [hypersurface-reference.md](./hypersurface-reference.md)
- Hypersurface docs: https://docs.hypersurface.io (covered calls, secured puts, settlement)
