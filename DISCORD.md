# Discord & Slack Structure — VINCE + Eliza

Recommended channel structure for IKIGAI LABS, LiveTheLifeTV, and Slack. Designed to fit VINCE (trading, lifestyle, news) and Eliza (research, knowledge, UPLOAD) agents.

---

## Multi-Agent Discord (Same Server, No Conflict)

**If you see `Send handler not found (handlerSource=discord)`:** VINCE and Eliza are using the **same** Discord Application ID. Create a **second** Discord app for VINCE at [Discord Developer Portal](https://discord.com/developers/applications), then set `VINCE_DISCORD_APPLICATION_ID` and `VINCE_DISCORD_API_TOKEN` to the new app’s values (different from Eliza’s). Restart the app.

To run **both VINCE and Eliza in the same Discord server** without errors (like [the-org](https://github.com/elizaOS/the-org)):

1. **Two Discord applications (two bots)**  
   Create two apps in the [Discord Developer Portal](https://discord.com/developers/applications): one for VINCE, one for Eliza. Each has its own **Application ID** and **Bot token**.

2. **Invite both bots to the same server**  
   Use each app’s OAuth2 URL to invite its bot. You’ll have two bots in the server (e.g. `Vince` and `Eliza`).

3. **Env per agent (same key names, different values)**  
   Each agent’s character uses `DISCORD_APPLICATION_ID` and `DISCORD_API_TOKEN` in `settings.secrets`. The plugin reads those from the runtime, so each runtime gets its own bot:

   - **VINCE:** `VINCE_DISCORD_APPLICATION_ID` + `VINCE_DISCORD_API_TOKEN` → copied into character as `DISCORD_APPLICATION_ID` / `DISCORD_API_TOKEN`.
   - **Eliza:** `ELIZA_DISCORD_APPLICATION_ID` + `ELIZA_DISCORD_API_TOKEN` (or fallback `DISCORD_*`) → same keys in her character.

4. **When both load Discord**  
   VINCE only loads the Discord plugin when he has his own bot (and it’s not the same app as Eliza). So set:

   - `VINCE_DISCORD_ENABLED=true`
   - `VINCE_DISCORD_APPLICATION_ID` and `VINCE_DISCORD_API_TOKEN` (Vince’s app)
   - `ELIZA_DISCORD_APPLICATION_ID` and `ELIZA_DISCORD_API_TOKEN` (Eliza’s app)

   With **different** application IDs, both agents load Discord; each runtime gets its own send handler and no conflict.

5. **Why “Send handler not found” happened before**  
   If only one Discord app was used for both agents (or only Eliza’s env was set), VINCE’s character didn’t load the Discord plugin, so his runtime had no `discord` send handler. Messages or pushes that tried to send from VINCE’s runtime then failed with `Send handler not found (handlerSource=discord)`.

**Current split (VINCE in IKIGAI LABS, Eliza in LiveTheLifeTV)** is valid: two servers, two bots, no conflict. To move both into one server later, use the same two-app setup and invite both bots to that server.

## Quick Reference: Channel Name → Push Type

| Channel name contains | Receives |
|-----------------------|----------|
| `daily` | Market report (18:00 UTC) |
| `news` | MandoMinutes (07:00 UTC) |
| `lifestyle` | Dining, hotel, health (08:00 UTC) |
| `alerts` | Alerts, paper trades (real-time) |

**Knowledge ingestion (you post, bot ingests):**

| Channel | Purpose |
|---------|---------|
| `#vince-upload-youtube` or `#youtube-knowledge` | Paste curated YouTube links; VINCE ingests to knowledge (transcript + summary). No need to watch — save to knowledge instead. Say `upload:` or just paste the URL. |

---

## Agent Capabilities

| Agent | Role | Key Commands / Actions |
|-------|------|------------------------|
| **VINCE** | Unified data intelligence — trading, markets, lifestyle | GM, ALOHA, OPTIONS, PERPS, HIP3, NEWS, LIFESTYLE, INTEL, MEMES, AIRDROPS, NFT, BOT, UPLOAD |
| **Eliza** | 24/7 research & knowledge expansion | UPLOAD (same as VINCE), web search, brainstorm, ingest URLs/YouTube |

VINCE handles live data and execution. Eliza expands the knowledge corpus. Both can UPLOAD; VINCE also runs the paper bot and scheduled pushes.

---

## Push Routing (Channel Name Keywords)

VINCE sends scheduled and event-driven pushes. **Channel names must contain these keywords** (case-insensitive) to receive each type:

| Keyword | What gets pushed | Schedule |
|---------|------------------|----------|
| `daily` | Market report (ALOHA, OPTIONS, PERPS, HIP-3) | 18:00 UTC |
| `news` | MandoMinutes briefing | 07:00 UTC (only when Mando has updated) |
| `lifestyle` | Dining, hotel, health, fitness (curated) | 08:00 UTC |
| `alerts` | Alerts, paper trades, watchlist events | Real-time |

**Examples:** `#vince-daily-reports`, `#ikigai-daily`, `#news-briefing`, `#vince-lifestyle`, `#vince-alerts`

> **Note:** Alerts and paper trades currently broadcast to *all* connected channels. To avoid noise, invite VINCE only to channels where you want alerts, or use a dedicated `#vince-alerts` and limit bot access.

---

## IKIGAI LABS Discord — Recommended Structure

### Category: VINCE Command Center

All VINCE automated feeds in one place. Invite VINCE to these channels.

| Channel | Purpose | Contains | Receives |
|---------|---------|----------|----------|
| `#vince-daily-reports` | Market pulse | "daily" | Daily report 18:00 UTC |
| `#vince-news` | News briefing | "news" | MandoMinutes 07:00 UTC |
| `#vince-lifestyle` | Lifestyle suggestions | "lifestyle" | Dining, hotel, health 08:00 UTC |
| `#vince-alerts` | High-signal events | "alerts" | Alerts, paper trades |
| `#vince-upload-youtube` | Curated YouTube → knowledge | — | You paste YouTube links; VINCE ingests (transcript + summary). No watching. |
| `#general-gm` | General chat with VINCE | — | On-demand: GM, ALOHA, OPTIONS, etc. |

**Channel purpose (copy-paste):**
```
#vince-daily-reports: ALOHA + OPTIONS + PERPS + HIP-3. Ask: ALOHA, OPTIONS, PERPS, BOT
#vince-news: MandoMinutes. Ask: NEWS, MANDO
#vince-lifestyle: Dining, hotels, health, fitness. Ask: LIFESTYLE
#vince-alerts: Watchlist alerts, paper trades. Ask: ALERTS, BOT
#vince-upload-youtube: Paste curated YouTube links; VINCE ingests to knowledge (transcript + summary). No need to watch.
#general-gm: Chat with VINCE. GM, ALOHA, OPTIONS, PERPS, NEWS, LIFESTYLE, BOT, UPLOAD
```

### Category: Find Your Ikigai

| Channel | Purpose |
|---------|---------|
| `#aloha-anon` | Anonymous / aloha |
| `#ikigai-labs-eth` | ETH / project focus |
| `#proof-of-human` | Identity / verification |
| `#unlock-channels` | How to unlock |
| `lofi-radio` | Voice |

### Category: LTL NewsFeeds (optional)

Human-curated feeds. Distinct from VINCE’s automated news.

| Channel | Purpose |
|---------|---------|
| `#cinemamemes` | Cinema memes |
| `#soundtracks` | Soundtracks |
| `#bitcoin` | Bitcoin |
| `#twitter-feed` | Twitter feed |
| `#ox-instagram` | Instagram feed |

### Categories: Tiers & Community

- **The Founders Club** — Founder channels
- **Collectors Bar** — Collectors
- **Curators Pool** — Curators
- **Creators Studio** — Creators
- **Collabs w/ Ikigai** — Collabs
- **Community 420** — Community
- **Links & Resources** — `#links-updates`, `#openai-ama`

---

## LiveTheLifeTV Discord — LIFESTYLE Focus

### Category: LIFESTYLE

Primary focus. Invite VINCE for lifestyle briefing.

| Channel | Purpose | Contains | Receives |
|---------|---------|----------|----------|
| `#vince-lifestyle` | Daily lifestyle briefing | "lifestyle" | Dining, hotel, health, fitness 08:00 UTC |
| `#the-good-life` | Manual shares, recommendations | — | Community posts |
| `#culture_code` | Culture & wellness | — | On-demand |
| `#general` | General chat | — | On-demand |

**Channel purpose:**
```
#vince-lifestyle: Daily curated suggestions — dining, hotels, health, fitness. Ask: LIFESTYLE
#the-good-life: Share recommendations, photos, spots
#culture_code: Culture, wellness, frameworks
```

### Category: VOICE

- TONIGHT IS TONIGHT. LFG
- WDYGDTW
- LiveTheLifeTV
- ELIZA_RADIO
- backroom

### Category: CREATORS & TOOLS

- `#livethelifetv`
- `#creators-toolbox`
- `#moderator-only`

### Category: BOTS

- `#dyno_faq`, `#guildxyz_agora`, `#invitations`, `#craig-recording`, `#welcohm_bot`

### Category: FEEDS (optional)

- `#ai16z_updates`, `#cookie_updates`

---

## Slack — Same Logic

Use the same naming so VINCE’s filters work.

### Channels

| Channel | Purpose |
|---------|---------|
| `#vince-daily-reports` | Market report 18:00 UTC |
| `#vince-news` | News 07:00 UTC |
| `#vince-lifestyle` | Lifestyle 08:00 UTC |
| `#vince-alerts` | Alerts, paper trades |
| `#general` | General chat |
| `#random` | Optional |

---

## Eliza-Specific Channels

Eliza handles research and UPLOAD. She does not run scheduled pushes.

| Channel | Purpose |
|---------|---------|
| `#eliza-research` | Brainstorm, ask Eliza to ingest URLs/YouTube |
| `#upload` | Paste URLs/YouTube for knowledge ingestion |

Or use the same `#general` as VINCE; both respond to UPLOAD. Topic separation helps if you want research vs trading in different channels.

---

## On-Demand vs Push

| Type | Channels | Behavior |
|------|----------|----------|
| **Scheduled push** | `daily`, `news`, `lifestyle` | VINCE posts at fixed times |
| **Event push** | `alerts` | VINCE posts on alerts / paper trades |
| **On-demand** | Any | User @mentions or asks; VINCE/Eliza reply |

---

## Topic-Specific Channels (Optional)

For better context, you can split by topic:

| Channel | Best for | Commands |
|---------|----------|----------|
| `#options` | Options flow | OPTIONS |
| `#perps` | Perps / paper trading | PERPS, BOT |
| `#news` | News | NEWS |
| `#lifestyle` | Lifestyle | LIFESTYLE |
| `#intel` | Intel | INTEL |

VINCE infers intent from the message. A channel named `#options` with "what's the skew?" gives extra signal. Not required, but useful for noisy servers.

---

## Channel Purpose Templates (Discord)

Copy into channel descriptions.

### VINCE Command Center

```
📊 vince-daily-reports
ALOHA + OPTIONS + PERPS + HIP-3 at 18:00 UTC. Ask: ALOHA, OPTIONS, PERPS, BOT, HIP3

📰 vince-news
MandoMinutes at 07:00 UTC (when Mando updates). Ask: NEWS, MANDO

🌿 vince-lifestyle
Dining, hotels, health, fitness at 08:00 UTC. Ask: LIFESTYLE

🔔 vince-alerts
Watchlist alerts, paper trades. Ask: ALERTS, BOT

💬 general-gm
Chat with VINCE. GM, ALOHA, OPTIONS, PERPS, NEWS, LIFESTYLE, INTEL, BOT, UPLOAD
```

### LiveTheLifeTV LIFESTYLE

```
🌿 vince-lifestyle
Daily curated suggestions — restaurants open today, hotels, health, fitness. Ask: LIFESTYLE

✨ the-good-life
Share recommendations, spots, photos
```

---

## Platform Notes

### Discord

- Pin a message in `#general-gm` with: `GM | ALOHA | OPTIONS | PERPS | NEWS | LIFESTYLE | BOT | UPLOAD`
- Use channel categories to group VINCE vs community vs tiers
- Lock VINCE channels if you want read-only feeds and chat elsewhere

### Slack

- Same channel names for push routing
- Use Slack threads for follow-ups
- Consider `#vince-bot` for all VINCE output if you want a single channel

---

## Setup Checklist

- [ ] Create VINCE Command Center category (IKIGAI) or LIFESTYLE category (LiveTheLifeTV)
- [ ] Create `#vince-daily-reports`, `#vince-news`, `#vince-lifestyle`, `#vince-alerts`
- [ ] Invite VINCE to those channels
- [ ] Add channel purposes/descriptions
- [ ] Pin command list in general chat
- [ ] Mirror structure in Slack if used

---

## Configuration Reference

| Env var | Default | Description |
|---------|---------|-------------|
| `VINCE_DAILY_REPORT_ENABLED` | `true` | Daily market report |
| `VINCE_DAILY_REPORT_HOUR` | `18` | UTC hour |
| `VINCE_NEWS_DAILY_ENABLED` | `true` | News briefing |
| `VINCE_NEWS_HOUR` | `7` | UTC hour |
| `VINCE_NEWS_PUSH_REQUIRE_FRESH` | `true` | Only push when Mando updated |
| `VINCE_LIFESTYLE_DAILY_ENABLED` | `true` | Lifestyle briefing |
| `VINCE_LIFESTYLE_HOUR` | `8` | UTC hour |

See [NOTIFICATIONS.md](NOTIFICATIONS.md) for full config.

---

## Future Improvements

- **Alerts filtering:** Alerts and paper trades currently broadcast to all connected channels. A future change could add `roomNameContains: "alerts"` so they only go to channels with "alerts" in the name, matching the daily/news/lifestyle pattern.
- **Eliza push channels:** If Eliza gains scheduled pushes (e.g. digest of new knowledge), add an `eliza` or `research` keyword and corresponding channels.
