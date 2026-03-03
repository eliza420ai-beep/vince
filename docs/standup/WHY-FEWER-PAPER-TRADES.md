# Why fewer paper trades after the big update

After the policy/ML/guardrails update, the paper bot opens **fewer** trades because several gates were added or tightened. The "Signals evaluated (no trade)" leaderboard shows why each candidate was rejected.

## What’s blocking trades

### 1. **ML suggested_tuning (min strength / min confidence)**

The improvement report in `plugin-vince/models/training_metadata.json` (from the last training run) can set:

- `suggested_tuning.min_strength` (e.g. 54)
- `suggested_tuning.min_confidence` (e.g. 47)

When these are present and **aggressive mode is off**, the bot rejects any signal below these bars. So signals at 45% strength or 35% confidence are blocked even if they pass the base risk-manager thresholds (40% strength, 35% confidence).

- **Where:** `vincePaperTrading.service.ts` (evaluateAndTrade, Phase “Improvement report”).
- **Relax:** Set runtime setting `vince_paper_aggressive = true` so the bot **skips** the suggested_tuning gate and uses only the risk-manager thresholds (and takes more trades for ML data).

### 2. **HIP-3 news guardrail**

For HIP-3 assets, if **NewsSentiment** is in the signal but:

- news sentiment is **neutral** or news confidence **< 65%**, and  
- **confirming count < 3**,

the trade is skipped to avoid BTC/ETH sentiment bleed-through on HIP-3 names.

- **Where:** `vincePaperTrading.service.ts` (evaluateAndTrade, “HIP-3 guardrail”).
- **Relax:** In **aggressive mode** this guardrail is now skipped so more HIP-3 trades can open.

### 3. **X (Twitter) sentiment line in the UI**

The leaderboard shows **“X (Twitter) sentiment: did not meet 40% or neutral”** when X didn’t contribute to the signal. That’s **informational**: the aggregator only adds X when confidence ≥ 40% (or 25–40% non-neutral if soft tier is on). It is **not** a separate gate that blocks the trade; the primary “Why no trade” reason (e.g. confidence below minimum, HIP-3 news guardrail) is the actual blocker.

### 4. **Risk-manager thresholds**

- **Core (BTC/ETH/SOL):** min strength 40%, min confidence 35%, min confirming 3 (or 2 in aggressive).
- **HIP-3:** min strength 40%, min confidence 35%, min confirming 1.

Signals below these fail in the risk manager before any ML or guardrail checks.

### 5. **Policy: max-single-trade-usd**

Previously set to **$500**, which blocked all paper trades (sizes are in the thousands on a $100k book). This was raised to **$10,000** in `policies/trading-policy.yaml` so paper trades can open.

### 6. **ML signal-quality threshold**

When an ONNX signal-quality model is loaded, signals below the trained threshold (e.g. 0.48) are rejected. This applies to core assets only (not HIP-3).

### 7. **Swarm consensus (often the main blocker)**

After a signal passes strength/confidence and other gates, the bot builds **swarm votes** (one per “source” or agent). It then calls `getSwarmConsensus(votes, minAgents, 0.6)`:

- If no direction has **≥ 60%** of the weighted vote, the swarm returns **dir=neutral** and **confidenceLevel = max(longRatio, shortRatio)** (e.g. 29–39%).
- The paper trading service then requires **swarm confidence ≥ VINCE_SWARM_MIN_CONFIDENCE** (default in code **0.5**; often set to **0.4** in env). So when swarm conf is 30–39%, the trade is rejected with **“Swarm consensus below threshold: dir=neutral, conf=32% < 40%”** and counted as **swarm_min_confidence** in the funnel.

**Why swarm stays neutral with low conf:** When **X (Twitter) sentiment** does not contribute (confidence &lt; 40% or not “neutral” per `X_SENTIMENT_CONFIDENCE_FLOOR`), one big vote is missing. The remaining sources often split long/short, so neither side reaches 60% and swarm conf stays just under 40%. So the **“X (Twitter) sentiment: did not meet 40% or neutral”** line in the UI is closely tied to this: weak or missing X keeps swarm conf below the bar.

- **Where:** `vincePaperTrading.service.ts` (evaluateAndTrade, swarm block); `swarmCoordination.service.ts` (`getSwarmConsensus`: consensusThreshold 0.6).
- **Relax (more trades):** Lower **VINCE_SWARM_MIN_CONFIDENCE** (e.g. from 0.4 to **0.35**) so 35–39% swarm conf can pass; and/or enable **X_SENTIMENT_SOFT_TIER_ENABLED=true** so 25–40% X contributes and can push swarm over the threshold.

---

## How to get more paper trades

1. **Enable aggressive mode**  
   Set runtime setting `vince_paper_aggressive = true` (e.g. in character/settings or env). This:
   - Skips the ML **suggested_tuning** gate (strength/confidence from the report).
   - Skips the **HIP-3 news guardrail** (so HIP-3 can trade when news is weak/neutral).
   - Uses 2 confirming for core assets and keeps lower bars for HIP-3.

2. **Ensure policy allows size**  
   Confirm `policies/trading-policy.yaml` has `max-single-trade-usd` condition `tradeSize > 10000` (or higher if you want larger single trades).

3. **Swarm consensus (most no-trades)**  
   If the funnel shows **other_reasons={"swarm_min_confidence":34,...}** and the UI shows “Swarm consensus below threshold: dir=neutral, conf=32% &lt; 40%”:
   - Lower **VINCE_SWARM_MIN_CONFIDENCE** (e.g. **0.35** or **0.38**) so signals with 35–39% swarm conf can open. Default in code is 0.5; if you use 0.4, try 0.35.
   - Enable **X_SENTIMENT_SOFT_TIER_ENABLED=true** so X sentiment at 25–40% can contribute; that often pushes swarm over the bar.

4. **Optional: X sentiment**  
   If you want X to contribute more often, set `X_SENTIMENT_CONFIDENCE_FLOOR` lower (default 40) or enable `X_SENTIMENT_SOFT_TIER_ENABLED=true` so 25–40% non-neutral X sentiment can contribute (with a discount). This doesn’t remove other gates but can help strength/confidence clear the risk-manager bar.

5. **Optional: lower base thresholds**  
   In `paperTradingDefaults.ts`, `SIGNAL_THRESHOLDS.MIN_STRENGTH` / `MIN_CONFIDENCE` (40/35) and `HIP3_MIN_*` drive the risk manager. Changing them (or overriding via dynamicConfig) will change how many signals pass the first bar; aggressive mode already avoids the stricter ML report bar.

6. **Daily goal / position size**  
   If you get more trades but still miss the daily target ($420 or $690), increase **size per trade** so each win contributes more:
   - **Aggressive preset:** `vince_paper_aggressive = true` uses `AGGRESSIVE_MARGIN_USD` (e.g. $1K) and `AGGRESSIVE_LEVERAGE` (40x) → ~$40K notional per trade; TP ~$280 per trade. Goal is ~2–3 such wins per day.
   - **Larger margin:** Override base margin or increase `AGGRESSIVE_MARGIN_USD` (in code or via a runtime setting if wired) so notional per trade is higher; same R:R then yields more $ per trade.
   - **Goal:** `goalTracker.service.ts` and `paperTradingDefaults.ts` (`DEFAULT_TRADING_GOAL.dailyTarget`). Hitting the goal with “too little size” usually means either more trades (relax swarm/X as above) or larger size per trade (margin/leverage/caps).

---

## References

- Policy: `policies/trading-policy.yaml`
- Thresholds: `src/plugins/plugin-vince/src/constants/paperTradingDefaults.ts` (`SIGNAL_THRESHOLDS`)
- Risk manager: `vinceRiskManager.service.ts` (`validateSignal`, `syncFromDynamicConfig`)
- Paper trading gates: `vincePaperTrading.service.ts` (`evaluateAndTrade`: HIP-3 guardrail, ML suggested_tuning, ML quality, **swarm consensus**)
- Swarm: `vincePaperTrading.service.ts` (swarm block: `VINCE_SWARM_MIN_CONFIDENCE`); `swarmCoordination.service.ts` (`getSwarmConsensus`, consensusThreshold 0.6)
- X sentiment floor: `signalAggregator.service.ts` (`X_SENTIMENT_CONFIDENCE_FLOOR`, default 40; `X_SENTIMENT_SOFT_TIER_ENABLED`)
- Suggested tuning: `models/training_metadata.json` → `suggested_tuning`; read by `mlInference.service.ts` (`getSuggestedMinStrength`, `getSuggestedMinConfidence`)
- Goal and size: `goalTracker.service.ts`, `paperTradingDefaults.ts` (`DEFAULT_TRADING_GOAL`, `AGGRESSIVE_MARGIN_USD`, `AGGRESSIVE_LEVERAGE`)
