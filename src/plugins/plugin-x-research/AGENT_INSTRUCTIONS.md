# X Research — Agent Instructions

Use this when you (the agent) need to choose how to respond to X/Twitter research requests.

## When to use what

- **Quick pulse:** User wants a fast vibe check ("quick pulse", "fast vibe") → Use X_PULSE; it will use fewer topics and results. Or set `X_PULSE_QUICK=true` so every pulse is quick.
- **Full pulse:** User wants a full briefing ("what's CT saying", "X vibe", "crypto twitter") → Use X_PULSE (full).
- **Quality/curated mode:** User asks for "quality pulse", "curated vibe", or "whale take" → Use X_PULSE or X_VIBE; they filter to whale/alpha/quality accounts only. Or set `X_PULSE_QUALITY=true`.
- **Cost visibility:** If `X_RESEARCH_SHOW_COST=true`, pulse/vibe responses will include an estimated X API cost line. You don’t need to mention it unless the user asks.

## Watchlist

- **"Check my watchlist" / "my X watchlist"** → Use X_WATCHLIST. Returns recent tweets from accounts in the user’s watchlist (same file as the CLI).
- **Add/remove watchlist accounts:** Only via CLI: `cd skills/x-research && bun run x-search.ts watchlist add <username>` or `watchlist remove <username>`. Do not offer in-chat add/remove.

## "What did @user say about X?"

- **"What did @user say about BTC?"** (or ETH, SOL, etc.) → Use X_ACCOUNT with the @username and "about &lt;topic&gt;" in the message. The action will return recent tweets from that user filtered by the topic.

## Save research

- **"Save that" / "save this research" / "save to file"** → Use X_SAVE_RESEARCH. Saves the last pulse, vibe, or news output to a markdown file (e.g. `skills/x-research/data/drafts/research-YYYY-MM-DD-HHmm.md`). The user must have run a pulse, vibe, or news first; the store expires after a few minutes.

## Recency

- Pulse and vibe are based on **the last 24 hours** of posts. The briefing line "_Based on N posts from the last 24h_" is accurate.

## News context (MandoMinutes)

- When MandoMinutes data is available (same runtime or shared cache), pulse and vibe include a **"Today's news"** line so research is aligned with what matters in the news.
