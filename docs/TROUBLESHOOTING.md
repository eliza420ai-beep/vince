# Troubleshooting

Quick fixes for common issues.

---

## Database migration failed

If you see:

```
Failed query: CREATE SCHEMA IF NOT EXISTS migrations
```

**Verify first:** `bun run db:check` — if it succeeds, migrations are fine; if it fails, it prints the real error (e.g. SSL, wrong port).

**Fix:** `POSTGRES_URL` must use the **direct** connection (port 5432, not 6543). Add `?sslmode=verify-full` if needed. With Supabase: use the **direct** connection string from Dashboard → Settings → Database (port 5432), not the pooler (6543). Then `bun start` (runs bootstrap).

**Local-only:** Leave `POSTGRES_URL` empty → PGLite.

**SSL error:** `POSTGRES_SSL_REJECT_UNAUTHORIZED=false` (opt-in).

→ [DEPLOY.md](DEPLOY.md)

---

## Discord "Cannot access audit logs"

If the bot logs `Cannot access audit logs - permission change alerts will not include executor info (error=Missing Permissions)`, grant the bot **View Audit Log** in your Discord server (Server Settings → Integrations → [bot]). See [DEPLOY.md § Discord: audit log warning](DEPLOY.md#discord-audit-log-warning).

---

## Known limitations

| Limitation | Notes |
|:---|:---|
| XAI/Grok | API key required |
| Nansen | 100 credits/month |
| Sanbase | 1K calls/month |
| Binance 451 | Use `VINCE_BINANCE_BASE_URL` proxy |
| ONNX | Active when `.onnx` present; run `train_models.py` |
| Circuit breakers | Not validated with live trading |
