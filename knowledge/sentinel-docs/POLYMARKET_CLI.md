# Polymarket CLI and exit-code behavior

One-shot Polymarket discovery script and monitoring behavior. See [ELIZAOS_EXAMPLES_PRIORITIES.md](ELIZAOS_EXAMPLES_PRIORITIES.md) (Priority 2) for context and the [polymarket example](https://github.com/elizaOS/examples/blob/main/polymarket/README.md).

## Script: `polymarket:once`

Runs one discovery "tick" using **plugin-polymarket-discovery**: fetches active markets (Gamma API) and prints a short summary. No wallet or CLOB order execution.

**Usage:**

```bash
bun run polymarket:once
# or
bun run scripts/polymarket-once.ts
```

**Optional env:** `POLYMARKET_GAMMA_API_URL`, `POLYMARKET_CLOB_API_URL` (defaults in plugin). `.env` is loaded from project root when run from repo root.

## Exit codes and monitoring

| Exit code | Meaning                                                        |
| --------- | -------------------------------------------------------------- |
| **0**     | Success: active markets fetched and summary printed to stdout. |
| **1**     | Failure: error message written to **stderr**.                  |

**Supervision:** Use exit codes for cron, systemd, or Kubernetes: exit 0 = healthy tick; exit 1 = fail (e.g. network, API down). Capture stderr in logs and alert on non-zero exit.

**Example (cron):**

```bash
# Run every 15 minutes; log to file; exit 1 will trigger cron mail if MAILTO set
*/15 * * * * cd /path/to/vince && bun run polymarket:once >> /var/log/polymarket-once.log 2>> /var/log/polymarket-once.err
```

## Plugin vs example

- **plugin-polymarket-discovery** (this repo): read-only discovery and portfolio tracking (actions: get active markets, search, detail, price, categories, user positions, orderbooks, etc.). No CLOB order placement.
- **elizaOS/examples/polymarket**: demo agent with `verify` / `once` / `run` and **plugin-evm** + **plugin-polymarket** for CLOB; `--execute` required for real orders.

When to use which: use **plugin-polymarket-discovery** for discovery, search, and positions in VINCE/Solus/Otaku. Use the official **plugin-polymarket** + example when you need CLOB order execution (and document `--execute` and wallet safety per the example README).
