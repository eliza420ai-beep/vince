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

---

## How to get more paper trades

1. **Enable aggressive mode**  
   Set runtime setting `vince_paper_aggressive = true` (e.g. in character/settings or env). This:
   - Skips the ML **suggested_tuning** gate (strength/confidence from the report).
   - Skips the **HIP-3 news guardrail** (so HIP-3 can trade when news is weak/neutral).
   - Uses 2 confirming for core assets and keeps lower bars for HIP-3.

2. **Ensure policy allows size**  
   Confirm `policies/trading-policy.yaml` has `max-single-trade-usd` condition `tradeSize > 10000` (or higher if you want larger single trades).

3. **Optional: X sentiment**  
   If you want X to contribute more often, set `X_SENTIMENT_CONFIDENCE_FLOOR` lower (default 40) or enable `X_SENTIMENT_SOFT_TIER_ENABLED=true` so 25–40% non-neutral X sentiment can contribute (with a discount). This doesn’t remove other gates but can help strength/confidence clear the risk-manager bar.

4. **Optional: lower base thresholds**  
   In `paperTradingDefaults.ts`, `SIGNAL_THRESHOLDS.MIN_STRENGTH` / `MIN_CONFIDENCE` (40/35) and `HIP3_MIN_*` drive the risk manager. Changing them (or overriding via dynamicConfig) will change how many signals pass the first bar; aggressive mode already avoids the stricter ML report bar.

---

## References

- Policy: `policies/trading-policy.yaml`
- Thresholds: `src/plugins/plugin-vince/src/constants/paperTradingDefaults.ts` (`SIGNAL_THRESHOLDS`)
- Risk manager: `vinceRiskManager.service.ts` (`validateSignal`, `syncFromDynamicConfig`)
- Paper trading gates: `vincePaperTrading.service.ts` (`evaluateAndTrade`: HIP-3 guardrail, ML suggested_tuning, ML quality)
- X sentiment floor: `signalAggregator.service.ts` (`X_SENTIMENT_CONFIDENCE_FLOOR`, default 40)
- Suggested tuning: `models/training_metadata.json` → `suggested_tuning`; read by `mlInference.service.ts` (`getSuggestedMinStrength`, `getSuggestedMinConfidence`)
