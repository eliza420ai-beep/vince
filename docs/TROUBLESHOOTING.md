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

## Duplicate key on `worlds` (worlds_pkey)

If you see:

```
DrizzleQueryError: Failed query: insert into "worlds" ...
cause: error: duplicate key value violates unique constraint "worlds_pkey"
Key (id)=(...) already exists.
```

**Cause:** The ElizaOS runtime calls `ensureWorldExists` and does a plain INSERT. If that world row was already created (e.g. from a previous run or an interrupted start), the insert fails.

**Fix (local PGLite):** Reset the local DB so the next start gets a clean `worlds` table:

- Default data dir: `.eliza/.elizadb` (from repo root). Remove it:  
  `rm -rf .eliza/.elizadb`
- If you set `PGLITE_DATA_DIR`, remove that directory (or use a new path) then run `bun start` again.

**Note:** This wipes all local agent state (worlds, memories, etc.). For production Postgres, the upstream runtime would need to use an upsert or “insert if not exists” instead of a plain insert.

---

## Solus (or any agent): example.map is not a function

If you see:

```
#Solus  [SERVICE:MESSAGE] Error processing message (error=example.map is not a function)
```

**Cause:** In `@elizaos/core`, message/example formatting assumes each item is an array (of messages). When the runtime composes action or message examples, it can receive the new alpha shape (`{ examples: [...] }` per group) or raw arrays; calling `.map()` on a non-array throws. This can happen in `formatSelectedExamples` or in the character provider when formatting `messageExamples`.

**Workaround:** This repo applies a postinstall patch so the core bundle accepts both array and `{ examples }` shapes (formatSelectedExamples inner/outer and both character-provider paths). The same patch also runs **before every** `bun start` and `bun run dev` (via `prestart` / `predev`), so the running process always loads the patched core.

If you still see the error:

1. **Fully stop** the app (kill the terminal or Ctrl+C). Do not rely on hot reload—the process must restart so it loads the patched file.
2. Run **`bun start`** again (or `bun run dev`). You should see `patch-elizaos-core-message-examples: verification passed` in the output before the server starts.
3. If the error persists, clear Bun cache: `bun pm cache rm`, then stop and run `bun start` again.
4. Try Solus again (e.g. "How does Hypersurface work?").

Otherwise track an upstream fix in ElizaOS core.

---

## Destructive migration blocked (plugin-sql)

If you see:

```
[PLUGIN:SQL] Destructive migration blocked - set ELIZA_ALLOW_DESTRUCTIVE_MIGRATIONS=true or use force option
warnings: ["Table \"public.users\" will be dropped with all its data"]
[PLUGIN:SQL] Some migrations failed (failureCount=1, successCount=0)
```

**Cause:** Plugin-sql refuses to run migrations that drop tables (or other destructive changes) unless you explicitly allow it, to avoid wiping production data. After a DB reset or when the DB is out of sync with new migration files, the pending migration may be treated as destructive and is blocked.

**Fix (local PGLite dev only):** If you are okay with the migration (e.g. you just wiped the DB or don't care about local data in the affected tables), set in `.env`:

`ELIZA_ALLOW_DESTRUCTIVE_MIGRATIONS=true`

Then restart (`bun start`).

**Production / shared Postgres:** Do not set this unless you have reviewed the migration and intend the destructive change. Prefer fixing or adjusting the migration so it is not destructive, or run it manually with the force option if your runbook allows.

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
| **[VinceCoinGlass] Connection test exception / failed after retries**                                        | CoinGlass API slow/unreachable at startup.                              | Connection test is retried with backoff (3 attempts). On final failure the runtime falls back to Binance free APIs; no code change required.                                    |
| **Cannot access audit logs (Missing Permissions)**                                                            | Discord bot lacks View Audit Log.                                       | Optional: grant **View Audit Log** in Server Settings → Integrations → [bot] for executor info in alerts. See [Discord: audit log warning](DEPLOY.md#discord-audit-log-warning). |
| **ERC-8004: No contract address configured**                                                                  | Otaku ERC-8004 in limited mode.                                         | Optional: set `ERC8004_CONTRACT_ADDRESS` if you use on-chain identity.                                                                                                           |
| **Discovery plugin … requirePayment=true**                                                                    | ECHO (or other) discovery queries require payment.                      | Intentional if you use paid discovery; set `DISCOVERY_REQUIRE_PAYMENT=false` to disable.                                                                                         |

---

## Polymarket: open paper positions disappeared after refresh

If you saw “Open paper positions” on the Polymarket tab and then after a refresh they were gone:

**Cause:** Otaku’s execute poll runs every 2 min. When Polymarket CLOB credentials are not set, the execute action used to mark the next pending order as `rejected`, so pending orders were removed one by one and no fills were written.

**Fix (in code):** When credentials are missing, the execute action no longer updates the order; it leaves it `pending`. So pending orders stay visible as open paper positions with P&L and “Why this position.” See [POLYMARKET_TRADING_DESK.md § Paper-only mode](POLYMARKET_TRADING_DESK.md#paper-only-mode).

**If you already had orders rejected:** They will not reappear. New approvals from Risk will stay pending until you enable execution or cancel them.

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
