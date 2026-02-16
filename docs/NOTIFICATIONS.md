# Notifications — Channel Structure (VINCE, Kelly, Sentinel)

Push notifications go to Discord, Slack, and Telegram when those plugins are connected. **VINCE** (daily, news, lifestyle, alerts), **Kelly** (daily concierge), and **Sentinel** (weekly/daily suggestions) each push to channels whose names contain specific keywords. This doc defines how to name and structure channels for correct push routing.

---

## Recommended Channel Names

### Option A: Purpose-based (recommended)

| Channel Name | Purpose | What gets pushed |
|--------------|---------|------------------|
| `#daily` or `#vince-daily-reports` | Scheduled daily report | ALOHA + OPTIONS + PERPS + HIP-3 summary (once/day at **08:00 UTC** — morning) |
| `#vince-alerts` | High-signal events | Alerts (watchlist, wallet, token), paper trade open/close |
| `#vince-upload-youtube` | Curated YouTube → knowledge | You paste YouTube links; VINCE ingests (transcript + summary). No need to watch — save to knowledge instead. |

### Option B: Single channel

| Channel Name | Purpose |
|--------------|---------|
| `#vince` | All notifications (daily report, alerts, trades) |

### Option C: By asset class

| Channel Name | Purpose |
|--------------|---------|
| `#vince-daily-reports` | Daily report (crypto + TradFi) |
| `#vince-trading` | Paper trades only |
| `#vince-alerts` | Alerts only |

---

## How targeting works

- **Daily report**: Only sent to channels whose name contains `"daily"` (case-insensitive).
  - Examples: **#daily**, `#vince-daily-reports`, `#daily-briefing`, `#vince-daily`
  - Create a channel with "daily" in the name (e.g. **#daily**) and invite VINCE to receive the morning report (default 08:00 UTC).

- **Alerts & paper trades**: Sent to all connected Discord/Slack/Telegram channels that don’t use name filtering.
  - If you use Option A, create `#vince-alerts` and invite the bot there. Alerts/trades go to every channel the bot is in unless you add more filtering later.

- **Current behavior**: Alerts and trades are pushed to every room the bot is connected to. The daily report is restricted to rooms with "daily" in the name.

- **Kelly**: Daily concierge briefing (08:00 UTC) is sent to channels whose name contains `kelly` or `lifestyle`. Set `KELLY_LIFESTYLE_DAILY_ENABLED` and `KELLY_LIFESTYLE_HOUR` (see Configuration). **Standup (2×/day):** Kelly runs the agent standup and pushes a summary to channels whose name contains `daily-standup` or `standup`. Create **#daily-standup**, invite Kelly’s bot, and keep all agents in that channel (one team, one dream). Set `STANDUP_ENABLED=true` and `STANDUP_COORDINATOR_AGENT=Kelly` (see [MULTI_AGENT.md](MULTI_AGENT.md)).

- **Sentinel**: Weekly suggestions (and optional daily digest) are sent to channels whose name contains `sentinel` or `ops`. Set `SENTINEL_WEEKLY_ENABLED` and optionally `SENTINEL_DAILY_ENABLED` (see [DISCORD.md](DISCORD.md)).

---

## Setup

### Discord (for VINCE day report / push)

1. Create channels, e.g. `#vince-daily-reports` and `#vince-alerts`. The **day report (ALOHA)** is only sent to channels whose name contains `"daily"`.
2. Create a **separate Discord application** for VINCE at [discord.com/developers/applications](https://discord.com/developers/applications) (so VINCE has his own bot and send handler).
3. Invite **VINCE’s bot** to the server and grant it access to those channels.
4. In `.env` set:
   - `VINCE_DISCORD_APPLICATION_ID=<your VINCE app’s application id>`
   - `VINCE_DISCORD_API_TOKEN=<your VINCE app’s bot token>`
   If you also run Eliza with Discord, use a different app for VINCE (different `VINCE_DISCORD_APPLICATION_ID` from `ELIZA_DISCORD_APPLICATION_ID`), or VINCE will not get a send handler and you’ll see "Send handler not found".

### Slack

1. Create channels, e.g. `#vince-daily-reports` and `#vince-alerts`.
2. Invite the bot to those channels.
3. Set `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` in `.env`.
4. Install the Slack plugin: `bun add github:elizaos-plugins/client-slack`

### Telegram

1. Create a group or channel.
2. Add the bot as a member.
3. Set `TELEGRAM_BOT_TOKEN` in `.env`.

---

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `VINCE_DAILY_REPORT_ENABLED` | `true` | Set to `false` to disable scheduled daily report |
| `VINCE_DAILY_REPORT_HOUR` | `8` | Hour (UTC) to run the daily report (morning) |
| `VINCE_LIFESTYLE_DAILY_ENABLED` | `true` | Set to `false` to disable scheduled lifestyle briefing (or when using Kelly for lifestyle channel) |
| `VINCE_LIFESTYLE_HOUR` | `8` | Hour (UTC) to run the lifestyle briefing |
| `KELLY_LIFESTYLE_DAILY_ENABLED` | `true` | Set to `false` to disable Kelly's scheduled concierge briefing. Runs only when the Kelly agent is run (plugin-kelly loaded). |
| `KELLY_LIFESTYLE_HOUR` | `8` | Hour (UTC) for Kelly's daily briefing. Channels whose name contains "kelly" or "lifestyle" receive the push. |
| `VINCE_NEWS_DAILY_ENABLED` | `true` | Set to `false` to disable scheduled news briefing |
| `VINCE_NEWS_HOUR` | `7` | Hour (UTC) to run the news briefing |
| `VINCE_NEWS_PUSH_REQUIRE_FRESH` | `true` | When `true`, skip push if Mando's publish date can't be inferred or is stale. Mando doesn't update every day. Set `false` to push anyway. |
| `SENTINEL_WEEKLY_ENABLED` | `true` | Set to `false` to disable Sentinel weekly suggestions. Channels whose name contains "sentinel" or "ops" receive the push. |
| `SENTINEL_DAILY_ENABLED` | `false` | Set to `true` to enable Sentinel daily digest (ONNX, clawdbot, ART, task brief) to sentinel/ops channels. |
| `SENTINEL_DAILY_HOUR_UTC` | `8` | Hour (UTC) for daily digest reference. |
| `STANDUP_ENABLED` | — | Set to `true` to enable 2×/day agent standups. Coordinator (default Kelly) pushes summary to channels with "daily-standup" or "standup" in the name. See [MULTI_AGENT.md](MULTI_AGENT.md#standups-autonomous-agent-meetings). |
| `STANDUP_COORDINATOR_AGENT` | `Kelly` | Agent that runs the standup task and pushes to #daily-standup. |

---

## Example layout (Slack/Discord)

```
#daily (or #vince-daily-reports)   ← VINCE daily report at 08:00 UTC
#vince-news            ← VINCE news at 16:00 UTC (MandoMinutes updates ~4:20 PM Paris)
#vince-lifestyle       ← VINCE lifestyle briefing at 08:00 UTC (set VINCE_LIFESTYLE_DAILY_ENABLED=false if using Kelly for this)
#kelly or #lifestyle    ← Kelly concierge briefing at 08:00 UTC (channel name must contain "kelly" or "lifestyle")
#daily-standup         ← Kelly standup summary 2×/day (one team, one dream); channel name must contain "standup" or "daily-standup"
#sentinel_ops or #ops   ← Sentinel weekly suggestions (and optional daily); channel name must contain "sentinel" or "ops"
#vince-alerts          ← Alerts and paper trades
#vince-general         ← Optional: general chat with VINCE
```

## C-suite layout (Option C — six bots, one category per agent)

For the full LiveTheLifeTV layout (one category per agent, sub-channels by focus), see [DISCORD.md](DISCORD.md#livethelifetv-c-suite-layout). Each agent has its own Discord app; channel names for pushes: **VINCE** → `daily`, `news`, `lifestyle`, `alerts`; **Kelly** → `kelly`, `lifestyle`, `daily-standup` (standup 2×/day); **Sentinel** → `sentinel` or `ops`.
