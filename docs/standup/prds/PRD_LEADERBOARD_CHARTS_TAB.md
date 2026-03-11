# PRD: Leaderboard Charts Tab

**Status:** Implemented  
**Scope:** Add a "Charts" tab to the Leaderboard dashboard that embeds TradingView widgets so users can monitor BTC and core asset pairs (e.g. ETH/BTC, SOL/BTC) without leaving the app.

---

## 1. Goal

Restore a **Charts** experience on the Leaderboard (similar to the [satoshis PriceTicker](https://github.com/IkigaiLabsETH/satoshis/blob/main/src/components/PriceTicker.tsx)) so the team can **monitor BTC performance against core assets** in one place. The Memetics and Digital Art tabs were commented out for good reasons; Charts is a lightweight, read-only addition that fills a real gap.

---

## 2. Problem

- Leaderboard had Trading Bot, News, Markets, Knowledge, Polymarket, Usage (Trading context / More tab was removed) — but **no quick way to glance at BTC vs major pairs**.
- Context switching to TradingView (or another tab) breaks flow when checking perps/paper bot and macro at the same time.
- A simple embedded chart tab keeps “one place” for dashboards without new backend or APIs.

---

## 3. Solution (Implemented)

### 3.1 Leaderboard tab

- **New tab label:** "Charts".
- **Placement:** After Knowledge, before the (commented) Memetics/Digital Art.
- **Header description when selected:** "TradingView charts — BTC and core pairs (ETH/BTC, SOL/BTC, etc.)".

### 3.2 Charts tab content

- **Component:** `src/frontend/components/dashboard/leaderboard/charts-tab.tsx`.
- **Sub-tabs (pair selector):** BTC (COINBASE:BTCUSD), ETH/BTC, SOL/BTC (BINANCE). List is easy to extend in the component.
- **Chart:** TradingView widget embed (`https://s.tradingview.com/widgetembed/...`) with `theme=dark`, `interval` configurable.
- **Timeframes:** 1m, 30m, 1h, 4h, D — buttons update the embed `interval` param.
- **No backend:** Pure frontend; no new API routes or agent actions.

### 3.3 UX

- Yellow accent for selected pair and timeframe (consistent with existing leaderboard/dark UI).
- Optional screenshot-style button (camera icon) for future use.
- Responsive: pair tabs scroll horizontally on small screens.

---

## 4. Out of scope (for this PRD)

- **Memetics / Digital Art:** Remain commented out; not part of this PRD.
- **Custom indicators or studies:** Default TradingView widget; no Pine or custom logic.
- **Alerts or execution:** Read-only charts; no trading or alerts from this tab.

---

## 5. Acceptance

- [x] "Charts" tab appears on Leaderboard between Knowledge and Polymarket (Trading context tab was removed and must not be re-added).
- [x] Selecting Charts shows TradingView embed with pair sub-tabs and timeframe controls.
- [x] Switching pair or timeframe updates the chart without full page reload.
- [x] No new env vars or backend changes required.

---

## 6. References

- [satoshis PriceTicker](https://github.com/IkigaiLabsETH/satoshis/blob/main/src/components/PriceTicker.tsx) — same embed pattern, ticker list, dark theme.
- [TradingView Widget Embed](https://www.tradingview.com/widget/) — widgetembed URL params (`symbol`, `interval`, `theme`, etc.).
- Leaderboard page: `src/frontend/components/dashboard/leaderboard/page.tsx`.
- Charts component: `src/frontend/components/dashboard/leaderboard/charts-tab.tsx`.
