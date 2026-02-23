# Post-mortems (losing trades)

When the paper bot closes a position at a loss, Vince automatically runs a **post-mortem**: he asks Echo (CT sentiment), Oracle (Polymarket regime), and Solus (options/mechanics) for feedback and writes a markdown file here.

- **Auto:** Triggered from `closeTrade()` when `realizedPnl < 0`.
- **Manual:** Use the Vince quick action **Post-mortem (last loss)** or say "Post-mortem on the last losing trade" to run the same flow for the most recent closed losing trade.

Files are named: `YYYY-MM-DD-{ASSET}-post-mortem.md`.
