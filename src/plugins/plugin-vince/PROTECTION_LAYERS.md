# Protection Layers (Paper Trading)

Pre- and post-execution validation so we reject bad symbols, avoid duplicate positions, and handle flips correctly. Inspired by EVClaw’s [PROTECTION_LAYERS](https://github.com/Degenapetrader/EVClaw/blob/main/PROTECTION_LAYERS.md).

**Location:** `VincePaperTradingService.openTrade()` in [vincePaperTrading.service.ts](src/services/vincePaperTrading.service.ts).

---

## Layer 1: Pre-trade symbol validation

- **Where:** `openTrade()`, after fetching `entryPrice` from market data.
- **Checks:** `entryPrice != null` and `entryPrice > 0`.
- **On failure:** Return `null`, log `SYMBOL VALIDATION FAILED: ${asset} (mid price missing or <= 0)` (throttled).
- **Effect:** No order placed, no journal entry for invalid/zero price.

---

## Layer 2: Duplicate position check

- **Where:** `openTrade()`, before fetching price, using `positionManager.getPositionByAsset(asset)`.
- **Same direction:** If an open position already exists in the same asset and direction, reject: log `DUPLICATE POSITION REJECTED`, return `null` (no pyramiding).
- **Opposite direction (flip):** If an open position exists in the opposite direction, close it first via `closeTrade(existing.id, "signal_flip")`, then proceed with the new entry.
- **Effect:** At most one open position per asset; flips are close-then-enter.

---

## Optional (paper): position state and reconciliation

- **Position state:** After a simulated fill, position is stored by `VincePositionManagerService`; no exchange to verify against for paper.
- **Reconciliation:** A deterministic ops task (see [docs/TRADING_RUNTIME_CONTRACT.md](../../../docs/TRADING_RUNTIME_CONTRACT.md)) can compare `positions.json` with last trades for consistency.

---

## Live (Otaku)

For live execution, the same layers apply conceptually: symbol valid → duplicate/flip check → execute → verify on exchange → SL/TP check. Implementation lives in plugin-otaku / execution path.

---

## References

- [HOW.md](HOW.md) — Signal flow, openTrade.
- [docs/TRADING_RUNTIME_CONTRACT.md](../../../docs/TRADING_RUNTIME_CONTRACT.md) — Flow contract, CRON vs MANUAL.
