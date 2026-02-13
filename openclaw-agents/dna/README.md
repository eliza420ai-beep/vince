# OpenClaw DNA — Behavioral Architect

DNA is the **behavioral architect** pillar: it defines how the AI thinks, decides, learns, and operates. Brain captured who the operator is and what they want; DNA defines the **operating logic** that makes the AI act intelligently.

## What DNA does

DNA drives a conversation that captures:

- **Decision protocols** — Think first vs act first; how to handle ambiguity; when to ask vs proceed; prioritization; initiative; when to push back.
- **Risk framework** — What counts as risky; reversible vs irreversible; cost thresholds; data sensitivity; what needs approval.
- **Security configuration** — Environment, network, credentials, skill governance, sandbox, session isolation, blast radius, self-modification rules.
- **Escalation paths** — What gets flagged immediately; urgency vs non-urgent; channels by severity.
- **Uncertainty handling** — Surface uncertainty vs proceed; confidence thresholds; when to say "I don't know" vs research.
- **Memory architecture** — What to remember long-term; retention and pruning; how daily logs become curated knowledge.
- **Learning protocols** — How feedback is incorporated; what counts as a mistake; how to avoid repeating errors.
- **Communication during work** — Progress reports; blockers; verbosity; when to explain reasoning vs deliver results.
- **Autonomy calibration** — Full autonomy vs supervised; check-ins; approval before start vs before complete; evolution over time.

Outputs are **updates** to AGENTS.md, MEMORY.md, and a **workspace/memory/** daily log template (e.g. `DAILY_LOG_TEMPLATE.md` or `memory/README.md`).

## When to run

Run **after Brain, then Muscles, then Bones.** DNA references prior step output when present and does not re-ask what's already documented.

## How to run

Requires `ANTHROPIC_API_KEY` (in `.env` or environment).

```bash
bun run openclaw-agents/dna/run-dna.ts
```

- **Optional prior context:** If `workspace/USER.md` or `knowledge/teammate/USER.md` exists, the runner injects a short summary into the first user message so the model does not re-ask what's already in Brain/Muscles/Bones.
- **Conversation loop:** Same as other runners: readline, Anthropic Messages API. Type your answers; DNA asks follow-ups in batches.

## Commands

| Command | Effect |
|--------|--------|
| `/done` or `/generate` | Finish the conversation and write AGENTS.md, MEMORY.md, and the memory/ daily log template to `workspace/` and `workspace/memory/`. |
| `/quit` | Exit without writing any files. |

## Output

- **workspace/AGENTS.md** — Decision protocols, risk framework, security config, escalation rules, uncertainty protocols, autonomy levels, communication during work, learning protocols.
- **workspace/MEMORY.md** — Memory architecture, retention rules, how daily notes compound into long-term knowledge.
- **workspace/memory/DAILY_LOG_TEMPLATE.md** (or **workspace/memory/README.md**) — Daily log template with sections that feed long-term memory.

After running, sync to `knowledge/teammate/` or `~/.openclaw/workspace/` if needed. See [ARCHITECTURE.md](../ARCHITECTURE.md#sync).
