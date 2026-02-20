# Leaderboard Page

One dashboard: market pulse and "who's doing best" **without chatting.** Open the page and see live leaderboards; no need to ask VINCE for perps or memes.

---

## Tabs

| Tab             | What you get                                                                                                                                    |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Markets**     | HIP-3 (commodities, indices, stocks, AI/Tech) + Hyperliquid crypto — top movers, volume leaders, OI leaders, crowded longs/shorts               |
| **Memetics**    | Memes (Solana), Memes (BASE) — hot / ape / watch / avoid; Meteora LP (top pools, meme pools, by APY); Leftcurve headlines; watchlist            |
| **News**        | MandoMinutes headlines + sentiment + one-liner                                                                                                  |
| **Digital Art** | Curated NFT collections — floor prices, thin-floor opportunities, volume leaders                                                                |
| **More**        | Fear & Greed, Options (BTC/ETH DVOL + TLDR), funding, OI cap, regime, Binance intel, CoinGlass, Deribit skew                                    |
| **Trading Bot** | Paper portfolio and open positions from the self-improving bot                                                                                  |
| **Knowledge**   | Knowledge base summary, quality test results, text/YouTube upload                                                                               |
| **Usage**       | Session token usage (TREASURY), AI token spend actual (~$3K in 3 weeks), Cursor usage, data APIs (high tier ~$50K/yr), **Pitch alignment (Option A $750K)** matching [DRAGONFLY_PITCH.md](DRAGONFLY_PITCH.md), cost if we go PRO ($199/mo), hardware savings |
| **Polymarket**  | Priority markets from Gamma/CLOB; refetch when tab is open every 60s                                                                            |

---

## How it works

Backend: `plugin-vince` route `GET …/vince/leaderboards` aggregates HIP-3, HL, DexScreener, Meteora, News, NFT floor, and "More" in parallel with **per-section timeouts** (`safe()`) so one slow source doesn’t kill the response.

Frontend: React Query (stale time, refetch per tab), reusable **MarketLeaderboardSection**, 503/404 handling with hints. Gamification "Rebels" ranking appears when the gamification plugin is available.

**Where it lives:** `src/frontend/components/dashboard/leaderboard/page.tsx`, `market-leaderboard-section.tsx`, `src/frontend/lib/leaderboardsApi.ts`, `src/plugins/plugin-vince/src/routes/dashboardLeaderboards.ts`.
