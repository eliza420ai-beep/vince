# v3.4.0 — Polymarket edge engine + leaderboard status

## Polymarket edge engine

- **plugin-polymarket-edge**: Multi-strategy edge engine (overreaction, model fair value, Synth forecast) that detects non-latency edge and writes signals to `plugin_polymarket_desk.signals` for the existing Risk → Executor pipeline. Replaces the former latency-arb bot (Polymarket removed the 0.5s delay).
- **GET /edge/status** and **GET /edge/signals** routes for Oracle agent; leaderboard Polymarket tab shows edge engine **Running** / **Paused**, contracts watched, BTC price, per-strategy signal counts, and a recent signals table.
- **Oracle**: edge status/control actions (EDGE_STATUS, EDGE_CONTROL), system prompt and message examples.
- **README**: short section on “Polymarket: paper trading that proves the edge”.
- **.env.example**: `POLYMARKET_EDGE_*` and per-strategy `EDGE_*` config.

## How to publish this as a GitHub Release

1. Open: **https://github.com/IkigaiLabsETH/vince/releases/new**
2. **Choose a tag**: type or select **v3.4.0** (tag already exists).
3. **Release title**: `v3.4.0 — Polymarket edge engine + leaderboard status`
4. **Describe this release**: paste the “Polymarket edge engine” bullets above (or this file’s content).
5. Click **Publish release**.

After that, v3.4.0 will appear as the latest release on the Releases page.
