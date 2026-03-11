---
title: "VINCE North Star — Push, Don't Pull"
category: internal-docs
tags:
  - vince
  - product
  - north-star
  - discord
  - slack
  - day-report
  - paper-bot
last_reviewed: 2026-02-15
---

# VINCE North Star: Push, Don't Pull

**You never have to "chat" with VINCE. He pings you.**

The north star is that VINCE is **proactive**. He sends you what you need on **Discord or Slack**—no need to open a thread and ask.

## What VINCE pushes

| What               | When                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Day report**     | Once per day (e.g. morning): vibe check, PERPS posture, OPTIONS stance, "should we trade today?"                                                             |
| **His trades**     | When he opens a position: asset, direction, size, entry.                                                                                                     |
| **His reasoning**  | With the trade or right after: why this trade (signal factors, thesis in plain language).                                                                    |
| **Close result**   | When he closes a position: realized P&L, exit reason (TP/SL/manual), duration.                                                                               |
| **Overall PnL**    | In the day report and/or on close: portfolio P&L, daily/monthly, win rate.                                                                                   |
| **Thin-floor NFT** | Optional, low frequency: ping when a tracked collection has a very thin floor. NFTs are lifestyle/curation (Eliza territory), not core investment for VINCE. |

## What this implies

- **Chat is optional.** Use it for deep dives (OPTIONS, PERPS, "why", UPLOAD). The default experience is: VINCE pushes, you read.
- **Day report = ALOHA, scheduled.** Run ALOHA (or equivalent) on a schedule (e.g. 8am) and **send** the output to a Discord channel or Slack channel/DM—not wait for the user to say "aloha."
- **Trade open:** When the paper bot opens a position, push a message with: position (asset, direction, size, entry), and **reasoning** (the trigger signals / thesis—same content as "why trade").
- **Trade close:** When a position closes, push: result (realized P&L, exit reason), and update overall PnL in the day report or in a short summary.
- **NFT:** Thin-floor alerts are nice-to-have; lifestyle/Eliza fit. VINCE doesn't spend much time on NFTs as investment.

## Gap vs today

- **Today:** ALOHA and bot status are **pull** (user says "aloha" or "bot status"). Trade open/close is logged to **console** (detailed banner with reasoning).
- **Partial:** ✅ **Trade open/close and alerts now push** to Discord/Slack/Telegram. ✅ **Scheduled daily report** (ALOHA + OPTIONS + PERPS + HIP-3) at 18:00 UTC to channels with "daily" in name. See NOTIFICATIONS.md for channel structure.
- **Remaining:** Optional: thin-floor NFT check and ping.

Source of truth for this vision: README § North star; teammate context (USER/SOUL) can reference "VINCE pings you" so the agent stays aligned with the intended experience.
