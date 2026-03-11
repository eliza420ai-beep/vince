# Security hygiene checklist

Sentinel owns this checklist. When asked about env, secrets, keys, or "who can do what", answer from here and suggest gaps.

## Env and secrets

- No API keys or secrets in repo. Use `.env` (gitignored) or character/agent secrets.
- `.env.example` documents required and optional vars without real values.
- Rotate keys if exposed or on schedule (e.g. after team changes).
- Prefer one key per service per environment (e.g. VINCE*DISCORD*_, ELIZA*DISCORD*_ for multi-agent).

## Who can do what

- **Deploy:** Who can run deploy (Eliza Cloud, scripts). Restrict production deploy credentials.
- **DB:** Who has POSTGRES_URL or DB access. Direct connection (port 5432) for migrations; pooler only if documented.
- **API keys:** Who manages OPENAI, ANTHROPIC, Supabase, Discord, etc. Prefer env over hardcoding; document in .env.example.
- **Secrets in UI:** Leaderboard/Usage and agent settings may show cost or config—ensure only operators see sensitive panels.

## Operational

- Run `scripts/sync-sentinel-docs.sh` to refresh sentinel-docs; TREASURY and cost breakdown live in sentinel-docs.
- For "who has access" questions: refer to this checklist and internal team policy; do not invent names or roles.
