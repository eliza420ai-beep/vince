# MEMORY — What the Agent Retains Over Time

VINCE’s memory has two layers. Both are loaded by the teammate context provider every session. Structure mirrors **knowledge/** discipline: curated, purposeful content; avoid noise so the agent sees what's relevant (see internal-docs ADDING-KNOWLEDGE and knowledge READMEs for the same "frameworks not raw data" idea).

---

## 1. LONG-TERM.md (curated, persistent)

- **Purpose:** Information that should persist indefinitely: standing decisions, ongoing project context, corrections to agent behavior, rarely-changing preferences.
- **Loaded:** Every session (always, if the file exists).
- **Rule:** Don’t log everything. Only what’s important for future sessions. Noise makes it harder to see what’s relevant and can degrade response quality.
- **Habit:** When something is worth keeping, say in chat: _"Log this to MEMORY"_ or _"Add this to LONG-TERM"_ and state the line; then add it to `LONG-TERM.md` (or use your workflow to append it).

See **LONG-TERM.md** in this folder for the template and examples.

---

## 2. Daily logs (session / short-term)

- **Purpose:** What happened in a session: decisions made, context for next time, constraints or pivots, lifestyle notes. Organized by date.
- **Loaded:** The **2 most recent** `*.md` files (by modification time), excluding README.md and LONG-TERM.md.
- **Naming:** Use descriptive names, e.g. `2026-02-03-aloha-followup.md`, `2026-02-02-treadfi-status.md`, `2026-02-01-strikes-logged.md`, `2026-01-31-bot-status.md`.
- **What to include:** Decisions made (e.g. "Logged BTC $105K CC, ETH $3.1K put"); context for next session ("Friday: check funding first; ALOHA then OPTIONS"); constraints ("Skipping new memes this week; treadfi only"); paper bot ("Bot long BTC; why = funding flip + whale"); lifestyle ("Hotel Wed at Biarritz — skip dining suggestions").
- **Tip:** Keep files small and focused. One topic per file works best.

---

## Usage notes (aligned with knowledge base)

- Focus on **decisions, context, and constraints** that affect future sessions — not every chat line.
- What you log is **illustrative of intent and state**; avoid dumping raw numbers that will be stale (like knowledge: frameworks over current data).
- **High value:** Decisions that affect trades or behavior; corrections to agent behavior; project milestones (treadfi season end, strike rules); standing preferences.
- **Low value:** Casual chit-chat; one-off numbers; things you'll remember anyway.

Same principle as **knowledge/KNOWLEDGE-USAGE-GUIDELINES.md**: provide what the agent needs to _think_ and _anticipate_, not to store every fact.

---

## Scoring what’s important (optional)

If you want the agent to help decide what to log, ask it to use a simple scoring rule, e.g.:

- **High:** Decisions that affect future trades or behavior; corrections; key project milestones.
- **Low:** Casual chit-chat; one-off numbers; things you’ll remember anyway.

Then only high-score items get written to LONG-TERM or a new daily log. That way you don’t log everything (token bloat) and you don’t miss important context.

---

## Order of loading

1. **LONG-TERM.md** (if present) — always.
2. **2 most recent** daily log `*.md` files (by mtime), excluding README.md and LONG-TERM.md.

So every session the agent sees: persistent context (LONG-TERM) + recent session context (last 2 daily logs).
