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

## Startup log: what to watch

When you run `bun start` or `bun run dev`, the terminal log is a good health check. Here’s what we learned and what’s been fixed or is optional.

| Log message                                                                                                   | Meaning                                                                 | Action                                                                                                                                                                           |
| :------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MaxListenersExceededWarning … 11 new_message listeners**                                                    | More agents than Node’s default listener limit (10).                    | Already fixed: `scripts/start-with-custom-ui.js` raises `EventEmitter.defaultMaxListeners` to 20. Restart to apply. If you add many more agents, increase further (e.g. 32).     |
| **[PolymarketDesk] createTask analyst/risk/perf: Cannot read properties of undefined (reading 'createTask')** | Plugin called `createTask` during init before the runtime DB was ready. | Fixed: Polymarket desk and Otaku now defer `createTask` with `setImmediate()`. Rebuild and restart.                                                                              |
| **[Otaku] createTask POLYMARKET_EXECUTE_POLL: …**                                                             | Same as above for Otaku’s Polymarket poll task.                         | Same fix (deferred createTask).                                                                                                                                                  |
| **[KellyLifestyle] Curated schedule missing sections: ## Fitness / Health**                                   | Kelly’s curated schedule must include that exact heading.               | Fixed: `knowledge/the-good-life/curated-open-schedule.md` now has `## Fitness / Health` and `### By Season`.                                                                     |
| **[VinceCoinGlass] Connection test exception: TimeoutError**                                                  | CoinGlass API slow/unreachable at startup.                              | Non-blocking: runtime falls back to Binance free APIs. Optional: increase timeout or retry in plugin if needed.                                                                  |
| **Cannot access audit logs (Missing Permissions)**                                                            | Discord bot lacks View Audit Log.                                       | Optional: grant **View Audit Log** in Server Settings → Integrations → [bot] for executor info in alerts. See [Discord: audit log warning](DEPLOY.md#discord-audit-log-warning). |
| **ERC-8004: No contract address configured**                                                                  | Otaku ERC-8004 in limited mode.                                         | Optional: set `ERC8004_CONTRACT_ADDRESS` if you use on-chain identity.                                                                                                           |
| **Discovery plugin … requirePayment=true**                                                                    | ECHO (or other) discovery queries require payment.                      | Intentional if you use paid discovery; set `DISCOVERY_REQUIRE_PAYMENT=false` to disable.                                                                                         |

---

## Known limitations

| Limitation       | Notes                                              |
| :--------------- | :------------------------------------------------- |
| XAI/Grok         | API key required                                   |
| Nansen           | 100 credits/month                                  |
| Sanbase          | 1K calls/month                                     |
| Binance 451      | Use `VINCE_BINANCE_BASE_URL` proxy                 |
| ONNX             | Active when `.onnx` present; run `train_models.py` |
| Circuit breakers | Not validated with live trading                    |
