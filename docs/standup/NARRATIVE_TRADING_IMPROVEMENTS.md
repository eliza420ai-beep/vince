# Narrative Trading: WTT Flow & Improvement Roadmap

**Purpose:** Make "What's the Trade" (WTT) the core narrative-trading loop—catching headline catalysts, CT sentiment, and macro shifts—and get better at it over time.

Complements: [PLAYBOOK_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md](prds/PLAYBOOK_WHATS_THE_TRADE_IMPROVEMENT_SYSTEM.md) (ops, quality gates, policy).

---

## 1. Current WTT Flow (Narrative → One Trade)

```
[Inputs]                    [Thesis]                 [Output]
Headlines (Mando)    ──┐
CT summary (X)       ──┼──► suggestThesis / suggestThesisFromX  ──► one sentence thesis
Rotation hint        ──┘         │
                                 ▼
Adapters (Kalshi, Robinhood, HL) ──► generateNarrative  ──► markdown + JSON sidecar
                                 ▼
                         extractStructuredPick  ──► primaryTicker, rubric, invalidate
                                 ▼
                         catalystSources tagged  ──► headlines | ct | generic
```

- **Headlines:** MandoMinutes (via `getMandoContextForX`) injected into thesis prompt so headline-driven catalysts (e.g. "OpenAI wins US government AI deal") can become the thesis.
- **CT:** When `ECHO_WTT_X_DRIVEN=true`, we fetch a short CT narrative from X (high-priority topics), then turn it into one thesis; headlines are still injected when available.
- **Rotation:** Recent WTT primary tickers (last 7 days) are read from JSON sidecars; if one ticker dominated (e.g. PLTR 4/7 days), we append a nudge: "Prefer a different asset today unless the thesis strongly warrants repeating."
- **Contrarian nudge:** In the X-driven path we tell the model: "If CT is overwhelmingly one-sided, consider whether the edge is to fade the crowd."
- **Universe:** Single source of truth is `plugin-vince/constants/targetAssets.ts` (WTT_UNIVERSE_TICKERS, HIP3_STOCKS). WTT and paper bot stay aligned.
- **Camillo / social-arbitrage lens:** When `ECHO_WTT_CAMILLO_STYLE=true`, thesis and narrative prompts inject a **Chris Camillo**–style framing: information imbalance (see the behavioral/social signal before the Street prices it), meaningful trend, pure-play expression, and invalidation = thesis broken or info priced in (not only a price level). See [knowledge/teammate/CAMILLO_TRADING_MINDSET.md](../../knowledge/teammate/CAMILLO_TRADING_MINDSET.md).

---

## 2. Catalyst Tagging (Feedback Loop)

Each WTT pick JSON sidecar now includes **`catalystSources`**: `["headlines"]`, `["ct"]`, `["headlines","ct"]`, or `["generic"]`.

Use this to:

- **Compare performance by catalyst:** e.g. headline-driven vs CT-driven vs generic (win rate, R-multiple, invalidation hit rate).
- **Improvement report:** Feature store / ML pipeline can slice WTT trades by `catalystSources` and report which narrative source is working best.
- **Bias correction:** If "generic" underperforms, invest in more headline/CT coverage; if "ct" is noisy, tighten topic selection or add contrarian logic.

---

## 3. Quality & Ops (Existing)

- **Quality score** (plugin-vince `wttQualityScore`): rubric + invalidation clarity + risk definition → band: auto_eligible / size_capped / blocked.
- **Paper bot:** Reads WTT JSON; applies quality gate; attributes trades with `wtt_report_id`, `wtt_quality_score`, `wtt_primary_or_alt`.
- **Weekly review (Sentinel):** WTT vs non-WTT outcomes, failure modes, policy deltas.

---

## 4. Roadmap: How to Improve Narrative Trading Further

| Improvement | What | Why |
|-------------|------|-----|
| **Polymarket odds in thesis** | When Oracle/Polymarket discovery is available, search markets by thesis keywords (or headline keywords); inject "Prediction markets: [market] at [odds]%" into thesis prompt. | Market-implied probability can reinforce or contradict the narrative (e.g. "OpenAI gov deal" vs Polymarket "Will OpenAI get contract?" at 70%). |
| **Multi-candidate thesis** | Generate 2–3 thesis candidates, score each (rubric + "clear catalyst?"), pick best. | Reduces single-shot bias; we can log runners-up for review. |
| **Broader news search** | Optional Tavily (or similar) search for "biggest market story today" / "OpenAI government" and append to headlines block. | Mando is crypto/macro-focused; policy or single-stock catalysts may need a second source. |
| **WTT in daily digest** | Standup / daily insight: "Yesterday's WTT: long PLTR (headlines). Paper bot: traded, +1.2R." | Surfaces narrative → outcome so we learn which theses work. |
| **Sentiment extremity** | When CT summary is classified "very bullish" or "very bearish" on one asset, explicitly add to prompt: "Sentiment is extreme on X; consider fade." | Makes contrarian path more salient. |
| **Session/timing** | Add to thesis prompt: "US session opens in 2h" or "Asia session." | Narrative trades often have a timing edge (e.g. before open, after headline). |

---

## 5. Adding a New Catalyst Source

To plug in a new input (e.g. Polymarket, Tavily):

1. **Fetch** the raw context in `runWhatsTheTradeReport` (same place we call `getMandoContextForX`).
2. **Format** a short block (e.g. "Prediction markets: …" or "Search: …").
3. **Inject** into both `suggestThesis` and `suggestThesisFromX` (e.g. new optional param `polymarketContext` or append to a generic `extraContext`).
4. **Tag** in `catalystSources` (e.g. add `"polymarket"` to the enum and push when that context was used).
5. **Document** in this file and in the playbook if it affects quality or policy.

---

## 6. Chris Camillo / Social-Arbitrage Lens

Set **`ECHO_WTT_CAMILLO_STYLE=true`** to apply a social-arbitrage mindset to WTT:

- **Thesis:** Frame the edge as an *information imbalance*—a meaningful behavioral or social signal (real-world, headlines, CT) that the market hasn’t fully priced. Prefer *pure play* tickers.
- **Narrative:** Invalidation = *thesis broken* or *info now priced in* (e.g. earnings confirmed the trend, headline is consensus), not only a price level. Prefer the clearest expression of the thesis.

Reference: [knowledge/teammate/CAMILLO_TRADING_MINDSET.md](../../knowledge/teammate/CAMILLO_TRADING_MINDSET.md).

---

## 7. Key Files

| File | Role |
|------|------|
| `plugin-x-research/src/tasks/whatsTheTradeDaily.tasks.ts` | Thesis derivation, narrative, pick extraction, catalyst tagging, rotation, news/CT injection, optional Camillo lens. |
| `plugin-x-research/src/utils/mandoContext.ts` | MandoMinutes headlines for WTT (and pulse/vibe). |
| `plugin-vince/src/constants/targetAssets.ts` | WTT universe (core + HIP-3); single source of truth. |
| `plugin-vince/src/utils/wttContract.ts` | Pick schema, validation. |
| `plugin-vince/src/utils/wttQualityScore.ts` | Quality band (auto_eligible / size_capped / blocked). |
| `docs/standup/whats-the-trade/*.json` | Sidecar: pick + `catalystSources` for feedback. |
| `knowledge/teammate/CAMILLO_TRADING_MINDSET.md` | Chris Camillo / social-arbitrage reference for WTT. |

---

_Expressions, not advice. Narrative trading improves when we measure which catalysts actually pay off._
