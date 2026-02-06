# VINCE Notifications – Channel Structure

Push notifications go to Discord, Slack, and Telegram when those plugins are connected. This doc suggests how to name and structure channels.

---

## Recommended Channel Names

### Option A: Purpose-based (recommended)

| Channel Name | Purpose | What gets pushed |
|--------------|---------|------------------|
| `#vince-daily-reports` | Scheduled daily report | ALOHA + OPTIONS + PERPS + HIP-3 summary (once/day at 18:00 UTC) |
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
  - Examples: `#vince-daily-reports`, `#daily-briefing`, `#vince-daily`
  - Create a channel with "daily" in the name to receive the scheduled report.

- **Alerts & paper trades**: Sent to all connected Discord/Slack/Telegram channels that don’t use name filtering.
  - If you use Option A, create `#vince-alerts` and invite the bot there. Alerts/trades go to every channel the bot is in unless you add more filtering later.

- **Current behavior**: Alerts and trades are pushed to every room the bot is connected to. The daily report is restricted to rooms with "daily" in the name.

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
| `VINCE_DAILY_REPORT_HOUR` | `18` | Hour (UTC) to run the daily report |
| `VINCE_LIFESTYLE_DAILY_ENABLED` | `true` | Set to `false` to disable scheduled lifestyle briefing |
| `VINCE_LIFESTYLE_HOUR` | `8` | Hour (UTC) to run the lifestyle briefing |
| `VINCE_NEWS_DAILY_ENABLED` | `true` | Set to `false` to disable scheduled news briefing |
| `VINCE_NEWS_HOUR` | `7` | Hour (UTC) to run the news briefing |
| `VINCE_NEWS_PUSH_REQUIRE_FRESH` | `true` | When `true`, skip push if Mando's publish date can't be inferred or is stale. Mando doesn't update every day. Set `false` to push anyway. |

---

## Example layout (Slack/Discord)

```
#vince-daily-reports   ← Daily report at 18:00 UTC
#vince-news            ← News briefing at 07:00 UTC (MandoMinutes - only when Mando has updated)
#vince-lifestyle       ← Lifestyle briefing at 08:00 UTC (dining, hotel, health, fitness)
#vince-alerts          ← Alerts and paper trades
#vince-general         ← Optional: general chat with VINCE
```
