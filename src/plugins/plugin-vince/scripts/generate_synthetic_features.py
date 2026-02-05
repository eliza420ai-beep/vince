#!/usr/bin/env python3
"""
Generate synthetic feature-store records for ML pipeline testing.

Use when you don't have 90+ real trades yet: generate N fake records with
the same shape as the feature store so you can:
  - Run train_models.py and produce ONNX models for testing
  - Validate the training script and inference service
  - Run test_train_models.py integration test (generate -> train -> assert)

Output: one JSONL file that train_models.py can load with --data <path>.
Records include outcome.maxAdverseExcursion so the SL optimizer can train.

Usage:
  python3 generate_synthetic_features.py --count 150 --output .elizadb/vince-paper-bot/features/synthetic_90plus.jsonl
  python3 generate_synthetic_features.py --count 400 --output .elizadb/vince-paper-bot/features/synthetic_400.jsonl
  python3 generate_synthetic_features.py --count 200 --output features.jsonl --append
  python3 train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models --min-samples 90

Optional train_models flags you can use with this data: --recency-decay, --balance-assets,
--tune-hyperparams (GridSearchCV + TimeSeriesSplit). Holdout metrics (MAE/AUC/quantile) are written
to improvement_report.holdout_metrics and improvement_report.md.
"""

import argparse
import json
import logging
import random
import uuid
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

ASSETS = ["BTC", "ETH", "SOL", "HYPE"]
DIRECTIONS = ["long", "short"]
REGIMES_VOL = ["low", "normal", "high"]
REGIMES_MKT = ["bullish", "bearish", "neutral", "volatile"]
SESSIONS = ["asia", "europe", "us", "eu_us_overlap", "off_hours"]
EXIT_REASONS = ["take_profit", "stop_loss", "trailing_stop", "max_age", "partial_tp"]


def one_record(
    ts: int,
    win: bool,
    asset: str | None = None,
    *,
    include_sentiment_sources: bool = False,
) -> dict:
    asset = asset or random.choice(ASSETS)
    direction = random.choice(DIRECTIONS)
    strength = random.randint(40, 95)
    confidence = random.randint(35, 90)
    entry = 50000 + random.uniform(-10000, 10000) if asset == "BTC" else 3000 + random.uniform(-500, 500)
    exit_pct = random.uniform(0.5, 3.0) if win else random.uniform(-2.5, -0.3)
    exit_price = entry * (1 + exit_pct / 100) if direction == "long" else entry * (1 - exit_pct / 100)
    pnl_pct = (exit_price - entry) / entry * 100 if direction == "long" else (entry - exit_price) / entry * 100
    pnl_usd = 1000 * (pnl_pct / 100) * random.uniform(3, 10)  # rough
    mfe = max(0, pnl_pct + random.uniform(0, 1)) if win else random.uniform(-3, 0)
    mae = min(0, pnl_pct - random.uniform(0, 1)) if not win else random.uniform(0, 2)
    # SL optimizer needs outcome.maxAdverseExcursion (train_models maps it to label_maxAdverseExcursion)
    mae_abs = abs(mae)

    SOURCE_POOL = [
        "CoinGlass",
        "BinanceTakerFlow",
        "MarketRegime",
        "BinanceFundingExtreme",
        "HyperliquidFundingExtreme",
        "HyperliquidOICap",
        "HyperliquidBias",
        "HyperliquidCrowding",
        "BinanceOIFlush",
        "BinanceLongShort",
    ]
    n_sources = random.randint(2, 6)
    chosen = random.sample(SOURCE_POOL, min(n_sources, len(SOURCE_POOL)))
    sources = chosen if not include_sentiment_sources else [
        {"name": n, "sentiment": random.uniform(-0.3, 0.3)} for n in chosen
    ]
    source_names = chosen if isinstance(sources[0], str) else [s["name"] for s in sources]
    has_funding_extreme = "BinanceFundingExtreme" in source_names or "HyperliquidFundingExtreme" in source_names
    has_oi_cap = "HyperliquidOICap" in source_names
    has_cascade = any(s in source_names for s in ("LiquidationCascade", "LiquidationPressure"))
    has_whale = any(s in source_names for s in ("BinanceTopTraders", "SanbaseExchangeFlows"))

    return {
        "id": str(uuid.uuid4()),
        "timestamp": ts,
        "asset": asset,
        "market": {
            "price": entry,
            "priceChange1h": random.uniform(-2, 2),
            "priceChange24h": random.uniform(-5, 5),
            "volume24h": 1e9 * random.uniform(0.5, 2),
            "volumeRatio": random.uniform(0.7, 1.5),
            "fundingRate": random.uniform(-0.0003, 0.0003),
            "fundingPercentile": random.uniform(20, 80),
            "openInterest": 1e9 * random.uniform(0.5, 2),
            "oiChange24h": random.uniform(-5, 5),
            "longShortRatio": random.uniform(0.8, 1.4),
            "fearGreedIndex": random.uniform(25, 75),
            "atrPct": random.uniform(1.5, 4),
            "rsi14": random.uniform(30, 70),
        },
        "session": {
            "session": random.choice(SESSIONS),
            "utcHour": random.randint(0, 23),
            "dayOfWeek": random.randint(0, 6),
            "isWeekend": False,
            "isOpenWindow": random.random() < 0.2,
            "minutesSinceSessionStart": random.randint(0, 480),
        },
        "signal": {
            "direction": direction,
            "strength": strength,
            "confidence": confidence,
            "sourceCount": len(source_names),
            "sources": sources,
            "strategyName": "momentum",
            "openWindowBoost": random.uniform(0, 10),
            "conflictingCount": random.randint(0, 2),
            "hasCascadeSignal": has_cascade,
            "hasFundingExtreme": has_funding_extreme,
            "hasWhaleSignal": has_whale,
            "hasOICap": has_oi_cap,
            "highestWeightSource": source_names[0] if source_names else "CoinGlass",
        },
        "regime": {
            "volatilityRegime": random.choice(REGIMES_VOL),
            "marketRegime": random.choice(REGIMES_MKT),
            "fundingTrend": "neutral",
            "volumeSpike": random.random() < 0.1,
            "oiCapRisk": "low",
            "sentiment": "neutral",
        },
        "news": {
            "sentimentScore": random.uniform(-30, 30),
            "sentimentDirection": random.choice(["bullish", "bearish", "neutral"]),
            "hasActiveRiskEvents": random.random() < 0.2,
            "nasdaqChange": random.uniform(-3, 3),
            "macroRiskEnvironment": random.choice(["risk_on", "risk_off", "neutral"]),
        },
        "decisionDrivers": ["Funding neutral", "Session overlap", "Strength > 50"],
        "execution": {
            "executed": True,
            "entryPrice": entry,
            "leverage": random.choice([3, 5, 10]),
            "positionSizeUsd": 5000 * random.uniform(0.5, 2),
            "positionSizePct": random.uniform(3, 10),
            "stopLossPrice": entry * (0.98 if direction == "long" else 1.02),
            "stopLossDistancePct": 2.0,
            "takeProfitPrices": [entry * 1.015, entry * 1.03],
            "takeProfitDistancesPct": [1.5, 3.0],
            "entryAtrPct": 2.5,
            "streakMultiplier": random.uniform(0.9, 1.2),
        },
        "outcome": {
            "exitPrice": exit_price,
            "realizedPnl": pnl_usd,
            "realizedPnlPct": pnl_pct,
            "holdingPeriodMinutes": random.randint(30, 1440),
            "exitReason": random.choice(EXIT_REASONS),
            "maxFavorableExcursion": mfe,
            # train_models uses outcome.maxAdverseExcursion for SL optimizer (positive magnitude, clipped 0..5)
            "maxAdverseExcursion": min(5.0, mae_abs),
            "partialProfitsTaken": 1 if win and random.random() < 0.5 else 0,
            "trailingStopActivated": False,
            "trailingStopPrice": None,
        },
        "labels": {
            "profitable": win,
            "winAmount": pnl_usd if win else 0,
            "lossAmount": -pnl_usd if not win else 0,
            "rMultiple": pnl_usd / 100 if pnl_usd != 0 else 0,
            "optimalTpLevel": random.randint(0, 3),
            "betterEntryAvailable": False,
            "stopTooTight": not win and random.random() < 0.2,
        },
    }


def main():
    p = argparse.ArgumentParser(description="Generate synthetic feature-store JSONL for ML testing")
    p.add_argument("--count", type=int, default=150, help="Number of records to generate (default 150, use >=90 for train_models --min-samples 90)")
    p.add_argument("--output", type=str, default="synthetic_features.jsonl", help="Output JSONL path")
    p.add_argument("--append", action="store_true", help="Append to existing file (timestamps continue after last record)")
    p.add_argument("--win-rate", type=float, default=0.52, help="Target win rate 0–1 (default 0.52)")
    p.add_argument("--seed", type=int, default=42, help="Random seed")
    p.add_argument("--sentiment-fraction", type=float, default=0.2, help="Fraction of records with signal.sources as list of dicts (sentiment) for signal_avg_sentiment column (default 0.2)")
    args = p.parse_args()

    random.seed(args.seed)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)

    base_ts = 1738000000000  # ms
    if args.append and out.exists() and out.stat().st_size > 0:
        last_line = None
        with open(out, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    last_line = line
        if last_line:
            try:
                last = json.loads(last_line)
                base_ts = int(last.get("timestamp", base_ts)) + 3600000
            except json.JSONDecodeError:
                pass

    records = []
    for i in range(args.count):
        win = random.random() < args.win_rate
        ts = base_ts + i * 3600000
        include_sentiment = random.random() < args.sentiment_fraction
        records.append(one_record(ts, win=win, include_sentiment_sources=include_sentiment))

    mode = "a" if args.append else "w"
    with open(out, mode) as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    wins = sum(1 for r in records if r["labels"]["profitable"])
    action = "Appended" if args.append else "Wrote"
    logger.info("%s %d synthetic records to %s (%.1f%% wins). Next (from repo root): python3 src/plugins/plugin-vince/scripts/train_models.py --data %s --output .elizadb/vince-paper-bot/models --min-samples 90",
                action, len(records), out, 100 * wins / len(records), out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
