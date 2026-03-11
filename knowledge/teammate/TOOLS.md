# TOOLS — External Tools and Workflows

Notes on your external tools and **VINCE actions** so the agent can reference them correctly and avoid re-explaining every time. Plugin: `@elizaos/plugin-vince`. See README and plugin-vince/ for full list.

---

## Primary command and action tiers

- **ALOHA** (⭐ primary): One command for daily vibe + PERPS pulse + OPTIONS posture + "should we trade today?" Triggers: aloha, gm, good morning, briefing. Reply with "details on X" for depth.
- **OPTIONS / PERPS:** Used inside ALOHA; callable directly (strikes, HYPERSURFACE, signals). Friday = strike day; funding → IV → delta, HYPE 1.5× width.
- **Paper bot:** "bot status" (positions, P&L), "why" (reasoning), pause/trade on explicit command only. No live execution; simulation only. Feature store (Supabase) + ONNX models when ML loop is enabled.
- **Rest:** MEMES, TREADFI, LIFESTYLE, NFT, INTEL, NEWS, AIRDROPS, WATCHLIST, UPLOAD, CHAT, GROK_EXPERT — supporting cast. UPLOAD: "upload:", URLs, YouTube → knowledge/ via summarize. **No X API:** we don’t fetch x.com/twitter.com links; for X content user should paste it and say "upload that" so we save most/all of the dumped data.
- **Three curves:** Left = Vince (perps, data). Right = Solus (Hypersurface, strike ritual) + Sentinel (ship code). Mid = HIP-3 spot + stack sats. See THREE-CURVES.md.

---

## Data sources VINCE uses

- **Deribit** — Options chains, IV surface, Greeks, strike selection (FREE).
- **CoinGlass** — L/S ratio, funding, OI, fear/greed (Hobbyist tier).
- **Binance** — Top traders by size, taker flow, OI trend, liquidations (FREE).
- **DexScreener** — Meme scanner, traction (APE/WATCH/AVOID).
- **Meteora** — LP pools for DCA strategy.
- **Hyperliquid** — Perps, paper trading, whale wallets.
- **OpenSea** — NFT floors (e.g. CryptoPunks, Meridian).
- **Nansen / Sanbase** — When configured; smart money and on-chain.
- **treadtools.vercel.app** — Treadfi status, points, bot config. Check before treadfi advice.

## Your own tools (optional)

List dashboards, spreadsheets, or other tools you use so VINCE can refer to them by name and not invent:

- (e.g. "Portfolio in Google Sheet 'Crypto Jan 2026'")
- (e.g. "Strikes logged in Notion 'Options log'")

## Strike selection workflow (from knowledge)

1. **Perps pulse:** Funding for BTC, ETH, SOL, HYPE (Hyperliquid/CoinGlass).
2. **Funding → strike adjustments:** Crowded longs → wider calls (25–30 delta); crowded shorts → tighter CSPs (15–20 delta); neutral → standard 20–25.
3. **Deribit:** IV levels, expiry (weekly Friday), final strikes.
4. **HYPE specifics:** Often more crowded; consider 1.5× strike width. Hypersurface for execution.

## Treadfi (from knowledge)

- **Bots:** MM (market maker) and DN (delta neutral).
- **Optimal DN:** Long Nado (early points) + Short Hyperliquid (2× boost).
- **Season 1 ends:** May 18, 2026.
- **Always check:** treadtools.vercel.app before giving treadfi advice.

## Session cadence (teammate rhythm)

- **Morning:** ALOHA or GM — vibe + PERPS + OPTIONS + bot stance. One shot; then "details on PERPS" / "OPTIONS" / "bot status" / "why" if they want more.
- **Friday:** Strike selection (Deribit + funding framework); VINCE suggests, you log and execute. HYPE 1.5× width; Hypersurface for execution.
- **Midweek (Wed):** Lifestyle — hotels (Southwest France Palaces), dining (Michelin). Never weekends. **Canonical lifestyle websites:** [James Edition](https://www.jamesedition.com/) (luxury real estate, travel) and [MICHELIN Guide](https://guide.michelin.com/) (restaurants, hotels) — the two most important for all lifestyle-related stuff.
- **Lifestyle allowlist:** For hotels and restaurants, suggest only from the allowlist: **knowledge/the-good-life/allowlist-life.md**. Exception: if the user explicitly asks for something off-list (e.g. "suggest somewhere new in Paris"), suggest from MICHELIN Guide / James Edition and note that it's not on the allowlist.
- **Paper bot:** "bot status" (positions, P&L), "why" (entry signals, reasoning). "trade" / "go long" / "execute" only on explicit user command. No live execution.
- **Session timing:** NY mid-session (10am–3pm ET) best for perps; session filters (EU/US overlap 1.1x) in plugin.

## Knowledge base (frameworks, not data)

VINCE (and Eliza) have RAG over 700+ files. Rules from **knowledge/KNOWLEDGE-USAGE-GUIDELINES.md** and **knowledge/README.md**:

**CRITICAL: Knowledge base usage**

- Knowledge provides **thinking frameworks and methodologies** — how to analyze, which metrics matter, analytical approaches. Historical examples illustrate **concepts**, not current conditions.
- Knowledge does **NOT** provide current prices, funding rates, TVL, or real-time metrics. Always use **actions/APIs** for current data.
- ✅ Reference methodologies from knowledge, then apply to live data from actions. ❌ Do not quote numbers from knowledge as if current.

### Directory map (knowledge/)

| Directory                                                                    | Purpose                                                                                                                                          |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **options**                                                                  | HYPE wheel, strike selection, funding→strike, magic number, fear harvest                                                                         |
| **perps-trading**                                                            | Funding interpretation, treadfi, session filters, squeeze patterns                                                                               |
| **grinding-the-trenches**                                                    | Meteora DLMM, pump.fun, memecoins, DexScreener traction (APE/WATCH/AVOID)                                                                        |
| **the-good-life**                                                            | Southwest Palaces, Okerson Protocol, buy-back-time, lifestyle ROI, Wed hotels, UHNW destinations. Canonical sites: James Edition, MICHELIN Guide |
| **art-collections**                                                          | NFT context, CryptoPunks, Meridian, thin floor = opportunity                                                                                     |
| **bitcoin-maxi**                                                             | BTC frameworks, Triptych, cycle narratives                                                                                                       |
| **defi-metrics**                                                             | TVL, yield, protocol analysis (frameworks, not current TVL numbers)                                                                              |
| **substack-essays**                                                          | General essays; cross-domain synthesis                                                                                                           |
| **prompt-templates**                                                         | PROMPT-ENGINEER-MASTER, art-of-prompting, tier templates                                                                                         |
| **internal-docs**                                                            | WORKFLOW-ORCHESTRATION (plan mode, verification, tasks/lessons), ADDING-KNOWLEDGE, config                                                        |
| **airdrops, altcoins, macro-economy, regulation, security, venture-capital** | As needed                                                                                                                                        |

**Related categories:** options ↔ perps-trading; the-good-life ↔ lifestyle; grinding-the-trenches ↔ airdrops. Each category README lists Key Files and Frameworks & Methodologies; **Usage notes** in each: focus on methodologies; numbers may be outdated; use actions for current data.

**Eliza = knowledge only. VINCE = actions + live data.** Do not quote knowledge numbers as live.
