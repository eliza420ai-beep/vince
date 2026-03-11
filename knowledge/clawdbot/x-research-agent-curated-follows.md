---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# X Research Agent: OpenClaw + Curated Follow List (No X API)

**Why this is the key feature:** The X API is too expensive for our use case. X is our biggest source of news, insights, and knowledge. Instead of paying for API access, we run **OpenClaw (Clawdbot) with a dedicated X account** and give it our **curated list of accounts we’ve followed on X/Twitter over the past decade**. OpenClaw + Birdy (or equivalent) uses that account to read the timeline, surface threads and links, and feed them into VINCE’s knowledge pipeline. **No X API cost.**

---

## Role of this agent

| What                      | How                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **X as primary source**   | News, alpha, explainers, and methodology live on X. We don’t want to depend on the paid API.                                                                                                |
| **Curated follows**       | A decade of curation = a follow list that already reflects who we trust. That list is the asset.                                                                                            |
| **Dedicated bot account** | One X account used only for this: follow the curated list, read timeline, surface content. Don’t use personal accounts (see [instructions-clawdbot.md](instructions-clawdbot.md) security). |
| **OpenClaw + Birdy**      | OpenClaw with the Birdy (Twitter/X) plugin: “Twitter automation”, “add follows and RSS”. We use it for **research and knowledge**, not lead gen.                                            |

---

## Setup outline

1. **Dedicated X account**  
   Create (or use) an X account only for the research agent. No personal or main brand account.

2. **Install OpenClaw**  
   Follow [instructions-clawdbot.md](instructions-clawdbot.md) (Hetzner VPS or Raspberry Pi). Use Telegram, Matrix, or Discord to talk to the agent.

3. **Install Birdy**  
   Community plugin for X/Twitter. Example: `openclaw plugin install birdy` (if available). Configure with the dedicated X account credentials.

4. **Load curated follow list**  
   Export or list the accounts you’ve curated over the years. Have OpenClaw (or Birdy) **follow those accounts** on the bot account. The bot’s timeline then becomes a stream of posts from those accounts.

5. **Define the pipeline to VINCE**
   - **Option A:** OpenClaw is prompted (e.g. daily) to “review your timeline, pick the top 3–5 threads or links that are methodology/insight-heavy, and post the URLs here.” It posts those URLs into a Discord channel (or Matrix, or a shared doc) that VINCE or a human can see. Those URLs go into `research-queue.txt` or get UPLOAD’d into VINCE knowledge.
   - **Option B:** OpenClaw has a small script/skill that appends selected thread URLs to a file or webhook that VINCE’s research-queue processor reads.
   - **Option C:** Human reviews OpenClaw’s suggested links in a channel and approves; approved URLs are ingested by VINCE (UPLOAD or queue).

---

## Curated follow list

- **Asset:** The list of X accounts you’ve followed over the past decade = pre-filtered signal. No need to pay for API search or firehose.
- **Maintenance:** Add/remove follows on the bot account as you refine. Keep the list in a doc or export (e.g. `knowledge/internal-docs/x-curated-follows.txt` or a private list) so you can re-apply if the account is recreated.
- **Scope:** Start with a manageable subset (e.g. 50–200 high-value accounts); expand as needed. Birdy/OpenClaw will read from the timeline of the bot account.

---

## Security and safety

- **Dedicated account only.** Do not use your main or personal X account. See [instructions-clawdbot.md](instructions-clawdbot.md): “use dedicated bot accounts (e.g. new email, bot Twitter handle).”
- **No sensitive DMs or credentials** on that account. Use it only for following and reading the curated list.
- **SOUL.MD / CRITICAL:** In OpenClaw’s SOUL.MD, add CRITICAL rules: e.g. never post from this account except when explicitly asked; never follow/unfollow without instruction; never share credentials or API keys.

---

## How this fits the rest of the plan

- **VINCE** stays the central brain: Slack/Discord, daily report, news, lifestyle, paper bot, knowledge RAG.
- **OpenClaw X agent** is a **feeder**: it uses our curated X follow list (no API) and surfaces thread/link URLs. Those URLs flow into VINCE’s knowledge pipeline (research queue → ingest → `knowledge/<category>/`).
- **Result:** X remains our biggest source of news and insights; we don’t pay for the X API; the decade of curation becomes the input to continuous knowledge expansion.

See **PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md** §4 (X pipeline) and §6 (implementation order). This doc is the **key feature** of that plan: Clawdbot as the X layer.

## Related

- [Business Idea Openclaw One Click](business-idea-openclaw-one-click.md)
- [Openclaw Practical Tips](openclaw-practical-tips.md)
- [Plan One Click Install](plan-one-click-install.md)
- [Global Regulatory Map](../regulation/global-regulatory-map.md)
- [Us Regulatory Landscape 2026](../regulation/us-regulatory-landscape-2026.md)
