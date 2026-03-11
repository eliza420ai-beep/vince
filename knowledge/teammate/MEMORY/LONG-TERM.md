# LONG-TERM MEMORY — Curated Persistent Context

> **Teammate memory note**
>
> This file is the **curated long-term store** for information that should persist indefinitely. It is loaded every session (with the most recent daily logs).
>
> - **Use for:** Standing decisions, ongoing project context, corrections to agent behavior, rarely-changing preferences
> - **Do NOT use for:** Every chat detail, raw numbers that go stale, one-off facts
> - **Principle:** Same as knowledge base — provide **frameworks and intent** so the agent can think and anticipate; avoid noise. See knowledge/KNOWLEDGE-USAGE-GUIDELINES.md (methodology vs current data) and MEMORY/README.md (usage notes).

Use it for:

- **Decisions that still matter:** e.g. "No naked options ever; HYPE 1.5× width is the rule."
- **Ongoing project context:** e.g. "Season 1 treadfi ends May 18, 2026; keep farming."
- **Corrections:** When the agent got something wrong or you don’t like a behavior, add it here in a short, structured line so it won’t repeat.
- **Preferences that rarely change:** e.g. "Always lead with TL;DR; never suggest lifestyle on Sunday."

**Do not** dump everything here. If you log every small detail, the agent burns more tokens and response quality can drop. Prefer: only what’s important for future sessions.

**Habit:** When something is worth remembering, say in chat: _"Log this to MEMORY"_ (or _"Add this to LONG-TERM"_) and state the line. Then add it below (or ask the agent to append it if you have that workflow).

---

## Standing decisions

- No naked options. HYPE strike width 1.5×. Treadfi: Long Nado + Short HL until Season 1 ends May 18, 2026. Paper bot: suggest only; no paper trade without explicit "trade" / "go long".
- **Perps vs options:** Perps are hard and swing fast (e.g. paper PnL +$88 → next check SOL hammered, shorts mixed). We make most of our money from Hypersurface covered calls and secured puts—weekly upfront premium—not from perps. Paper bot is for learning/signals; real edge is options premium. **Big difference:** VINCE = perps on Hyperliquid, short timeframes (1h/1d/2d), paper bot; Solus = weekly options, good strike + good weekly bull/bear sentiment.
- **Solus data boundary:** Solus doesn't have Vince-level data for weekly sentiment or where price lands by Friday; strike calls use spot + mechanics + pasted context (VINCE options view or user view).
- **Three curves:** Left = max leverage perps on Hyperliquid with Vince (casino). Mid = stack HIP-3 spot on Hyperliquid + stack sats (accumulation). Right = Hypersurface options income + ship code (Solus + Sentinel). Primary edge and income = right curve; left = signals/learning; mid = steady stack. Full doc: knowledge/teammate/THREE-CURVES.md.

## Corrections (agent got wrong / don’t repeat)

- (e.g. Don’t suggest hotels on Sunday. Don’t quote knowledge numbers as live — always say "from framework" or "live from API". ALOHA first in the morning; don't dump PERPS/OPTIONS/bot in separate messages when they said "aloha".)

## Ongoing context

- (e.g. Treadfi Season 1 ends May 18, 2026. MOLT LP on Meteora — waiting for pullback to DCA. Feature store / ONNX: Supabase + vince-ml-models bucket when ML loop enabled.)

## Rarely-changing preferences

- TL;DR first. ALOHA = primary daily command. Strikes on Friday only. Wed = lifestyle day. Eliza = knowledge; VINCE = live data + actions.
- Primary income from options (Hypersurface: covered calls, secured puts, weekly premium). Perps = volatile; paper bot for learning, not the main edge.
