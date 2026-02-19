# v3.4.0 — Polymarket latency arb + leaderboard status

## Polymarket latency arb bot

- **plugin-polymarket-arb**: Binance spot + Polymarket CLOB WebSockets, edge detection, Kelly sizing, paper-first with optional live execution.
- **GET /arb/status** route for Oracle agent; leaderboard Polymarket tab shows paper trading bot **Running** / **Paused** and stats (mode, trades today, today P&L).
- **Oracle**: arb status/control actions, system prompt and message examples.
- **README**: short section on “Polymarket: paper trading that proves the edge”.
- **.env.example**: `POLYMARKET_ARB_*` config.

## How to publish this as a GitHub Release

1. Open: **https://github.com/IkigaiLabsETH/vince/releases/new**
2. **Choose a tag**: type or select **v3.4.0** (tag already exists).
3. **Release title**: `v3.4.0 — Polymarket latency arb + leaderboard status`
4. **Describe this release**: paste the “Polymarket latency arb bot” bullets above (or this file’s content).
5. Click **Publish release**.

After that, v3.4.0 will appear as the latest release on the Releases page.
