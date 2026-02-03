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
  python3 train_models.py --data .elizadb/vince-paper-bot/features/synthetic_90plus.jsonl --output .elizadb/vince-paper-bot/models --min-samples 90
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

    sources: list[str] | list[dict] = ["CoinGlass", "BinanceTakerFlow", "MarketRegime"]
    if include_sentiment_sources:
        sources = [
            {"name": "CoinGlass", "sentiment": random.uniform(-0.5, 0.5)},
            {"name": "BinanceTakerFlow", "sentiment": random.uniform(-0.3, 0.3)},
            {"name": "MarketRegime", "sentiment": random.uniform(-0.2, 0.2)},
        ]

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
            "sourceCount": random.randint(2, 8),
            "sources": sources,
            "strategyName": "momentum",
            "openWindowBoost": random.uniform(0, 10),
            "conflictingCount": random.randint(0, 2),
            "hasCascadeSignal": random.random() < 0.1,
            "hasFundingExtreme": random.random() < 0.15,
            "hasWhaleSignal": random.random() < 0.2,
            "highestWeightSource": "CoinGlass",
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
    p.add_argument("--win-rate", type=float, default=0.52, help="Target win rate 0–1 (default 0.52)")
    p.add_argument("--seed", type=int, default=42, help="Random seed")
    p.add_argument("--sentiment-fraction", type=float, default=0.2, help="Fraction of records with signal.sources as list of dicts (sentiment) for signal_avg_sentiment column (default 0.2)")
    args = p.parse_args()

    random.seed(args.seed)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)

    base_ts = 1738000000000  # ms
    records = []
    for i in range(args.count):
        win = random.random() < args.win_rate
        ts = base_ts + i * 3600000
        include_sentiment = random.random() < args.sentiment_fraction
        records.append(one_record(ts, win=win, include_sentiment_sources=include_sentiment))

    with open(out, "w") as f:
        for r in records:
            f.write(json.dumps(r) + "\n")

    wins = sum(1 for r in records if r["labels"]["profitable"])
    logger.info("Wrote %d synthetic records to %s (%.1f%% wins). Next (from repo root): python3 src/plugins/plugin-vince/scripts/train_models.py --data %s --output .elizadb/vince-paper-bot/models --min-samples 90",
                len(records), out, 100 * wins / len(records), out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
