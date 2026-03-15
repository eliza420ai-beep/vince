---
paths: [".env", ".env.example", "src/**/environment.ts"]
---

# Environment Configuration Rules

## .env.example

- `.env.example` is the canonical reference. It is version-controlled and grouped by section.
- Sections: CORE → DATABASE → SHARED APIs → X/Twitter → per-agent → FALLBACK DISCORD → STANDUP & A2A → OPENCLAW → MISC.
- Every new env var must be added to `.env.example` with a comment explaining its purpose.
- Run `node scripts/reorder-env.js` after adding vars to keep `.env` aligned with `.env.example`.

## Naming Convention

- Shared keys: `COINGLASS_API_KEY`, `OPENAI_API_KEY` (no agent prefix).
- Agent-scoped keys: `VINCE_DISCORD_API_TOKEN`, `OTAKU_CDP_API_KEY` (agent prefix).
- Boolean flags: `SENTINEL_WEEKLY_ENABLED=true` (use "true"/"false" strings).
- Feature flags: `FORGE_ENABLED=true`, `ELIZA_ENABLED=true`.

## Security

- Never commit `.env` — it is gitignored.
- Never hardcode API keys in source files. Use `runtime.getSetting("KEY_NAME")` or `process.env.KEY_NAME`.
- Do not log API keys, even partially. Log "API key present: true/false" if needed.
- Secrets in character files go in `settings.secrets`, not top-level `settings`.

## Validation

- Services should check for required keys at startup and log a clear warning (not error) if missing.
- Use pattern: `const key = runtime.getSetting("KEY") || process.env.KEY; if (!key) logger.warn("[Service] KEY not set — feature disabled");`
- Never crash the app because an optional API key is missing. Degrade gracefully.
