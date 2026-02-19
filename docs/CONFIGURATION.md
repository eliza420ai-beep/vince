# Configuration

Where things live and how push, Discord, and env are set up.

---

## Where config lives

| What                    | Where                                              |
| :---------------------- | :------------------------------------------------- |
| VINCE character & agent | `src/agents/vince.ts`                              |
| Kelly character & agent | `src/agents/kelly.ts`                              |
| Paper bot, ML, actions  | `src/plugins/plugin-vince/`                        |
| Lifestyle-only (Kelly)  | `src/plugins/plugin-kelly/`                        |
| Teammate context        | `knowledge/teammate/` — USER.md, SOUL.md, TOOLS.md |
| Dynamic config          | `dynamicConfig.ts` — tuned via `tuned-config.json` |

---

## Push schedule & Discord

**VINCE = push, not chat.** Daily report (ALOHA + OPTIONS + PERPS + HIP-3), lifestyle, and news are pushed to Discord/Slack on a schedule.

| Push                  | Default (UTC) | Channel name must contain                           |
| :-------------------- | :------------ | :-------------------------------------------------- |
| Daily report (VINCE)  | 18:00         | `daily` (e.g. `#vince-daily-reports`)               |
| Lifestyle (VINCE)     | 08:00         | `lifestyle` (e.g. `#vince-lifestyle`)               |
| **Lifestyle (Kelly)** | 08:00         | `kelly` or `lifestyle` — concierge only, no trading |
| News (MandoMinutes)   | 16:00         | `news` (e.g. `#vince-news`)                         |

Set `VINCE_DAILY_REPORT_ENABLED`, `VINCE_LIFESTYLE_DAILY_ENABLED`, `VINCE_NEWS_DAILY_ENABLED` (default on) and `*_HOUR` in `.env`. For a single lifestyle channel, use Kelly's push and set `VINCE_LIFESTYLE_DAILY_ENABLED=false`. Kelly: `KELLY_LIFESTYLE_DAILY_ENABLED` (default on), `KELLY_LIFESTYLE_HOUR=8`.

**Two bots in one server:** Use separate Discord apps for VINCE and Eliza (`VINCE_DISCORD_*` and `ELIZA_DISCORD_*`). Optional `DELAY_SECOND_DISCORD_MS=3000` if the second bot fails to connect.

→ [DISCORD.md](DISCORD.md) · [NOTIFICATIONS.md](NOTIFICATIONS.md)

---

## Key env vars

| Variable                                                   | Purpose                                                                                                                                                                         |
| :--------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POSTGRES_URL`                                             | Supabase/Postgres. Empty = PGLite                                                                                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`                                | Feature-store dual-write, ML bucket                                                                                                                                             |
| `SUPABASE_URL`                                             | Optional if direct; required if pooler                                                                                                                                          |
| `VINCE_DISCORD_APPLICATION_ID` / `VINCE_DISCORD_API_TOKEN` | VINCE's Discord bot                                                                                                                                                             |
| `VINCE_DAILY_REPORT_ENABLED` / `VINCE_DAILY_REPORT_HOUR`   | Daily report push (default on, 18 UTC)                                                                                                                                          |
| `VINCE_LIFESTYLE_DAILY_ENABLED` / `VINCE_LIFESTYLE_HOUR`   | VINCE lifestyle push. Set false if using Kelly for lifestyle channel.                                                                                                           |
| `KELLY_LIFESTYLE_DAILY_ENABLED` / `KELLY_LIFESTYLE_HOUR`   | Kelly concierge daily push (default on, 8 UTC)                                                                                                                                  |
| `VINCE_NEWS_DAILY_ENABLED` / `VINCE_NEWS_HOUR`             | News push (default on, 7 UTC)                                                                                                                                                   |
| `VINCE_PAPER_AGGRESSIVE`                                   | `true` = higher leverage, $210 TP, 2:1 R:R                                                                                                                                      |
| `VINCE_PAPER_ASSETS`                                       | e.g. `BTC` or `BTC,ETH,SOL`                                                                                                                                                     |
| `VINCE_APPLY_IMPROVEMENT_WEIGHTS`                          | `true` = align weights with training metadata                                                                                                                                   |
| `VINCE_BINANCE_BASE_URL`                                   | Proxy for Binance in 451 regions                                                                                                                                                |
| `VITE_OTAKU_MODE`                                          | Wallet UI: `normies` = simple/Coinbase; unset = DeFi mode. Build-time only.                                                                                                     |
| `SUBSTACK_FEED_URL`                                        | Optional. RSS feed for Ikigai Studio Substack (default: https://ikigaistudio.substack.com/feed). Set empty to disable.                                                          |
| `ELIZA_SUBSTACK_LINKEDIN_HANDLE`                           | Optional. LinkedIn handle linked to Substack (for profile stats via [Substack Developer API](https://support.substack.com/hc/en-us/articles/45099095296916)); requires API ToS. |
| `FINNHUB_API_KEY`                                          | Optional. Solus offchain stock quotes and news (watchlist: Quantum, AI Infra, Nuclear, etc.). Free tier: 60 calls/min. Prefer over Alpha Vantage when both set.                       |
| `ALPHA_VANTAGE_API_KEY`                                    | Optional. Solus stock pulse fallback (quotes + NEWS_SENTIMENT). Free tier: 25 req/day. In Cursor/IDE use the [Alpha Vantage MCP](https://mcp.alphavantage.co/) for ad-hoc research. |
| `SOLUS_DISCORD_APPLICATION_ID` / `SOLUS_DISCORD_API_TOKEN` | Solus Discord bot (CFO, strike ritual, options + stock specialist).                                                                                                              |

See `.env.example` for the full list.
