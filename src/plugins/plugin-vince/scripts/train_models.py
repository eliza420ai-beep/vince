#!/usr/bin/env python3
"""
VINCE ML Model Training Script

Trains XGBoost models on historical trading data and exports to ONNX format
for use with the ML Inference Service in ElizaOS.

Models trained:
1. Signal Quality Predictor - Binary classification (profitable: yes/no)
2. Position Sizing Model - Regression (optimal size multiplier)
3. TP Optimizer - Multi-class classification (best TP level)
4. SL Optimizer - Quantile regression (max adverse excursion)

Usage:
    python train_models.py --data ./features.jsonl --output ./models/
    python train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models
    python train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models --min-samples 90
    python train_models.py --data .elizadb/vince-paper-bot/features --output .elizadb/vince-paper-bot/models --real-only   # production: exclude synthetic

  --data can be a single JSONL file or a directory (loads all features_*.jsonl, synthetic_*.jsonl, and combined.jsonl).
  --real-only: load only features_*.jsonl and combined.jsonl (exclude synthetic_*.jsonl); use when you have enough real trades.
  When the feature store has 90+ complete trades (with outcome), the plugin can run this automatically
  via the TRAIN_ONNX_WHEN_READY task (max once per 24h).

  With more signal sources (Hyperliquid OI cap/funding, Binance L/S, News NASDAQ/macro, etc.), the script
  uses optional columns when present: news_nasdaqChange, news_macro_risk_on/off, signal_hasOICap, and
  OPTIONAL_FEATURE_COLUMNS. TP/SL models now share the same news and signal-source features as signal quality
  and position sizing. Add new columns to OPTIONAL_FEATURE_COLUMNS and CANDIDATE_SIGNAL_FACTORS when the
  feature store adds new sources.

Requirements:
    pip3 install -r requirements.txt  (xgboost scikit-learn pandas numpy onnx onnxmltools joblib; scipy optional)
"""

import argparse
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import TimeSeriesSplit, cross_val_score, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score,
    log_loss,
    mean_absolute_error,
    mean_squared_error,
    roc_auc_score,
)

try:
    import xgboost as xgb
    import onnx
    from onnxmltools.convert.xgboost import convert as convert_xgboost
    from onnxmltools.convert.common.data_types import FloatTensorType
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    convert_xgboost = None  # type: ignore
    FloatTensorType = None  # type: ignore

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

if not ONNX_AVAILABLE:
    logger.warning("ONNX export not available. Install: pip3 install onnx onnxmltools")


def setup_logging_to_file(output_dir: Path, verbose: bool = False) -> None:
    """Add a file handler writing to output_dir/train.log."""
    log_path = output_dir / "train.log"
    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setLevel(logging.DEBUG if verbose else logging.INFO)
    fh.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
    logger.addHandler(fh)
    logger.info("Logging to %s", log_path)


# ==========================================
# Feature Engineering
# ==========================================

def _jsonl_paths(data_path: str, real_only: bool = False) -> List[str]:
    """Resolve --data to a list of JSONL file paths (single file or directory of features_*.jsonl).
    When real_only=True, only features_*.jsonl and combined.jsonl are loaded; synthetic_*.jsonl are excluded (for production)."""
    p = Path(data_path)
    if p.is_file():
        return [str(p)]
    if p.is_dir():
        files = sorted(p.glob("features_*.jsonl"))
        if not real_only:
            files = files + sorted(p.glob("synthetic_*.jsonl"))
        if (p / "combined.jsonl").exists():
            files = files + [p / "combined.jsonl"]
        return [str(f) for f in files]
    return []


def load_features(filepath: str, real_only: bool = False) -> pd.DataFrame:
    """Load feature records from JSONL file(s) exported by FeatureStore (one JSON object per line).
    If filepath is a directory, loads features_*.jsonl and combined.jsonl; optionally exclude synthetic_*.jsonl when real_only=True."""
    paths = _jsonl_paths(filepath, real_only=real_only)
    if not paths:
        logger.warning("No JSONL files found at %s", filepath)
        return pd.DataFrame()

    records = []
    for path_str in paths:
        with open(path_str, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError as e:
                    logger.warning("Skipping invalid JSON line in %s: %s", path_str, e)
    logger.info("Loaded %d records from %s (%d file(s))", len(records), filepath, len(paths))

    flat_records = []
    for r in records:
        if not isinstance(r, dict):
            continue
        id_ = r.get('id')
        ts = r.get('timestamp')
        asset = r.get('asset')
        if id_ is None or ts is None:
            continue
        flat = {'id': id_, 'timestamp': ts, 'asset': asset or ''}

        for k, v in r.get('market', {}).items():
            flat[f'market_{k}'] = v
        for k, v in r.get('session', {}).items():
            flat[f'session_{k}'] = v
        signal = r.get('signal', {})
        for k, v in signal.items():
            if k != 'sources' and k != 'factors':
                flat[f'signal_{k}'] = v
        sources = signal.get('sources', [])
        drivers = r.get('decisionDrivers') or signal.get('factors') or []
        flat['decision_drivers'] = drivers if isinstance(drivers, list) else []
        flat['signal_source_count'] = len(sources)
        if sources and isinstance(sources[0], dict):
            sents = [s.get('sentiment', 0) for s in sources if isinstance(s.get('sentiment'), (int, float))]
            flat['signal_avg_sentiment'] = float(np.mean(sents)) if sents else 0.0
        elif signal.get('avgSentiment') is not None:
            flat['signal_avg_sentiment'] = float(signal['avgSentiment'])
        for k, v in r.get('regime', {}).items():
            flat[f'regime_{k}'] = v
        news = r.get('news', {})
        if isinstance(news, dict):
            for k, v in news.items():
                if not isinstance(v, list):
                    flat[f'news_{k}'] = v
        elif isinstance(news, list) and news:
            sents = [n.get('sentiment', 0) for n in news if isinstance(n, dict) and isinstance(n.get('sentiment'), (int, float))]
            flat['news_avg_sentiment'] = float(np.mean(sents)) if sents else 0.0
        execution = r.get('execution') or {}
        if execution:
            for k, v in execution.items():
                if not isinstance(v, list):
                    flat[f'exec_{k}'] = v
        outcome = r.get('outcome') or {}
        if outcome:
            for k, v in outcome.items():
                flat[f'outcome_{k}'] = v
        labels = r.get('labels') or {}
        if labels:
            for k, v in labels.items():
                flat[f'label_{k}'] = v
        flat['label_profitable'] = labels.get('profitable') if labels else outcome.get('profitable')
        if 'label_maxAdverseExcursion' not in flat and outcome:
            exc = outcome.get('maxAdverseExcursion')
            if exc is not None:
                flat['label_maxAdverseExcursion'] = float(exc)

        flat_records.append(flat)

    df = pd.DataFrame(flat_records)
    if df.empty:
        logger.warning("No valid records after flattening")
        return df
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_numeric(df['timestamp'], errors='coerce')
        df = df.dropna(subset=['timestamp'])
        df = df.sort_values('timestamp').reset_index(drop=True)
    logger.info("DataFrame shape: %s", df.shape)
    return df


# Optional feature columns used across models when present in data.
# Extend this list when the feature store adds new sources (e.g. ETF flow, per-source flags).
# With more sources, load_features() could also derive per-source booleans from signal.sources.
OPTIONAL_FEATURE_COLUMNS = (
    "market_dvol",
    "market_rsi14",
    "market_oiChange24h",
    "market_fundingDelta",
    "market_bookImbalance",
    "market_bidAskSpread",
    "market_priceVsSma20",
    "signal_hasOICap",
)


def _clip_outliers(df: pd.DataFrame, z_thresh: float = 3.0) -> pd.DataFrame:
    """Optionally clip numeric outliers using z-score (requires scipy). No-op if scipy missing."""
    try:
        from scipy import stats
    except ImportError:
        return df
    numeric = df.select_dtypes(include=[np.number])
    for col in numeric.columns:
        std = df[col].std()
        if std == 0 or (hasattr(std, '__float__') and abs(std) < 1e-10):
            continue
        z = np.abs(stats.zscore(df[col].fillna(df[col].median())))
        mask = z > z_thresh
        if mask.any():
            cap = df[col].abs().quantile(0.99)
            df.loc[mask, col] = df.loc[mask, col].clip(-cap, cap)
    return df


def prepare_signal_quality_features(
    df: pd.DataFrame, clip_outliers: bool = True, use_scaler: bool = True
) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for signal quality prediction."""
    df_trades = df[df["label_profitable"].notna()].copy()
    if clip_outliers:
        df_trades = _clip_outliers(df_trades)

    feature_cols = [
        "market_priceChange24h", "market_volumeRatio", "market_fundingPercentile",
        "market_longShortRatio", "signal_strength", "signal_confidence",
        "signal_source_count", "signal_hasCascadeSignal", "signal_hasFundingExtreme",
        "signal_hasWhaleSignal", "session_isWeekend", "session_isOpenWindow",
        "session_utcHour",
    ]
    for opt in OPTIONAL_FEATURE_COLUMNS:
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "signal_avg_sentiment" in df_trades.columns:
        feature_cols.append("signal_avg_sentiment")
    if "news_avg_sentiment" in df_trades.columns:
        feature_cols.append("news_avg_sentiment")
    for opt in ("news_nasdaqChange", "news_etfFlowBtc", "news_etfFlowEth"):
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "news_macroRiskEnvironment" in df_trades.columns:
        df_trades["news_macro_risk_on"] = (df_trades["news_macroRiskEnvironment"] == "risk_on").astype(int)
        df_trades["news_macro_risk_off"] = (df_trades["news_macroRiskEnvironment"] == "risk_off").astype(int)
        feature_cols.extend(["news_macro_risk_on", "news_macro_risk_off"])

    if "regime_volatilityRegime" in df_trades.columns:
        df_trades["regime_volatility_high"] = (df_trades["regime_volatilityRegime"] == "high").astype(int)
        feature_cols.append("regime_volatility_high")
    if "regime_marketRegime" in df_trades.columns:
        df_trades["regime_bullish"] = (df_trades["regime_marketRegime"] == "bullish").astype(int)
        df_trades["regime_bearish"] = (df_trades["regime_marketRegime"] == "bearish").astype(int)
        feature_cols.extend(["regime_bullish", "regime_bearish"])

    if "asset" in df_trades.columns and df_trades["asset"].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades["asset"], prefix="asset")
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns.tolist())

    available_cols = [c for c in feature_cols if c in df_trades.columns]
    X = df_trades[available_cols].copy()
    y = df_trades["label_profitable"].astype(int)

    X = X.fillna(0)
    X = X.select_dtypes(include=[np.number, "bool"])
    for c in X.select_dtypes(include=["bool"]).columns:
        X[c] = X[c].astype(int)
    if use_scaler:
        float_cols = _safe_float_columns_for_scaler(X)
        if len(float_cols) > 0:
            X[float_cols] = StandardScaler().fit_transform(X[float_cols])

    logger.info("Signal quality features: %s, positive rate: %.2f%%", X.shape, y.mean() * 100)
    return X, y


def prepare_position_sizing_features(
    df: pd.DataFrame, clip_outliers: bool = True, use_scaler: bool = True
) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for position sizing prediction."""
    df_trades = df[df["label_rMultiple"].notna()].copy()
    if clip_outliers:
        df_trades = _clip_outliers(df_trades)

    feature_cols = [
        "signal_strength", "signal_confidence", "signal_source_count",
        "session_isWeekend", "exec_streakMultiplier",
    ]
    for opt in OPTIONAL_FEATURE_COLUMNS + ("market_atrPct",):
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "signal_avg_sentiment" in df_trades.columns:
        feature_cols.append("signal_avg_sentiment")
    if "news_avg_sentiment" in df_trades.columns:
        feature_cols.append("news_avg_sentiment")
    for opt in ("news_nasdaqChange", "news_etfFlowBtc", "news_etfFlowEth"):
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "news_macroRiskEnvironment" in df_trades.columns:
        df_trades["news_macro_risk_on"] = (df_trades["news_macroRiskEnvironment"] == "risk_on").astype(int)
        df_trades["news_macro_risk_off"] = (df_trades["news_macroRiskEnvironment"] == "risk_off").astype(int)
        feature_cols.extend(["news_macro_risk_on", "news_macro_risk_off"])
    if "regime_volatilityRegime" in df_trades.columns:
        df_trades["volatility_level"] = df_trades["regime_volatilityRegime"].map(
            {"low": 0, "normal": 1, "high": 2}
        ).fillna(1)
        feature_cols.append("volatility_level")
    if "asset" in df_trades.columns and df_trades["asset"].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades["asset"], prefix="asset")
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns.tolist())

    available_cols = [c for c in feature_cols if c in df_trades.columns]
    X = df_trades[available_cols].copy()
    y = df_trades["label_rMultiple"].clip(-2, 3)
    X = X.fillna(0)
    X = X.select_dtypes(include=[np.number, "bool"])
    for c in X.select_dtypes(include=["bool"]).columns:
        X[c] = X[c].astype(int)
    if use_scaler:
        float_cols = _safe_float_columns_for_scaler(X)
        if len(float_cols) > 0:
            X[float_cols] = StandardScaler().fit_transform(X[float_cols])

    logger.info("Position sizing features: %s, target mean: %.2f", X.shape, y.mean())
    return X, y


def prepare_tp_features(
    df: pd.DataFrame, clip_outliers: bool = True, use_scaler: bool = True
) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for take-profit optimization."""
    df_trades = df[df["label_optimalTpLevel"].notna()].copy()
    if clip_outliers:
        df_trades = _clip_outliers(df_trades)

    df_trades["signal_direction_num"] = (df_trades["signal_direction"] == "long").astype(int)
    feature_cols = [
        "signal_direction_num", "market_atrPct", "signal_strength", "signal_confidence",
    ]
    for opt in OPTIONAL_FEATURE_COLUMNS:
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "signal_avg_sentiment" in df_trades.columns:
        feature_cols.append("signal_avg_sentiment")
    if "news_avg_sentiment" in df_trades.columns:
        feature_cols.append("news_avg_sentiment")
    for opt in ("news_nasdaqChange", "news_etfFlowBtc", "news_etfFlowEth"):
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "news_macroRiskEnvironment" in df_trades.columns:
        df_trades["news_macro_risk_on"] = (df_trades["news_macroRiskEnvironment"] == "risk_on").astype(int)
        df_trades["news_macro_risk_off"] = (df_trades["news_macroRiskEnvironment"] == "risk_off").astype(int)
        feature_cols.extend(["news_macro_risk_on", "news_macro_risk_off"])
    if "regime_volatilityRegime" in df_trades.columns:
        df_trades["volatility_level"] = df_trades["regime_volatilityRegime"].map(
            {"low": 0, "normal": 1, "high": 2}
        ).fillna(1)
        feature_cols.append("volatility_level")
    if "regime_marketRegime" in df_trades.columns:
        df_trades["market_regime_num"] = df_trades["regime_marketRegime"].map(
            {"bearish": -1, "neutral": 0, "bullish": 1}
        ).fillna(0)
        feature_cols.append("market_regime_num")
    if "asset" in df_trades.columns and df_trades["asset"].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades["asset"], prefix="asset")
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns.tolist())

    available_cols = [c for c in feature_cols if c in df_trades.columns]
    X = df_trades[available_cols].copy()
    y = df_trades["label_optimalTpLevel"].astype(int)
    X = X.fillna(0)
    X = X.select_dtypes(include=[np.number, "bool"])
    for c in X.select_dtypes(include=["bool"]).columns:
        X[c] = X[c].astype(int)
    if use_scaler:
        float_cols = _safe_float_columns_for_scaler(X)
        if len(float_cols) > 0:
            X[float_cols] = StandardScaler().fit_transform(X[float_cols])

    logger.info("TP features: %s, TP level distribution: %s", X.shape, y.value_counts().to_dict())
    return X, y


def prepare_sl_features(
    df: pd.DataFrame, clip_outliers: bool = True, use_scaler: bool = True
) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for stop-loss optimization (max adverse excursion)."""
    label_col = "label_maxAdverseExcursion"
    if label_col not in df.columns:
        return pd.DataFrame(), pd.Series(dtype=float)
    df_trades = df[df[label_col].notna()].copy()
    if clip_outliers:
        df_trades = _clip_outliers(df_trades)
    if df_trades.empty:
        return pd.DataFrame(), pd.Series(dtype=float)

    df_trades["signal_direction_num"] = (df_trades["signal_direction"] == "long").astype(int)
    feature_cols = [
        "signal_direction_num", "market_atrPct", "signal_strength", "signal_confidence",
    ]
    for opt in OPTIONAL_FEATURE_COLUMNS:
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "signal_avg_sentiment" in df_trades.columns:
        feature_cols.append("signal_avg_sentiment")
    if "news_avg_sentiment" in df_trades.columns:
        feature_cols.append("news_avg_sentiment")
    for opt in ("news_nasdaqChange", "news_etfFlowBtc", "news_etfFlowEth"):
        if opt in df_trades.columns:
            feature_cols.append(opt)
    if "news_macroRiskEnvironment" in df_trades.columns:
        df_trades["news_macro_risk_on"] = (df_trades["news_macroRiskEnvironment"] == "risk_on").astype(int)
        df_trades["news_macro_risk_off"] = (df_trades["news_macroRiskEnvironment"] == "risk_off").astype(int)
        feature_cols.extend(["news_macro_risk_on", "news_macro_risk_off"])
    if "regime_volatilityRegime" in df_trades.columns:
        df_trades["volatility_level"] = df_trades["regime_volatilityRegime"].map(
            {"low": 0, "normal": 1, "high": 2}
        ).fillna(1)
        feature_cols.append("volatility_level")
    if "regime_marketRegime" in df_trades.columns:
        df_trades["market_regime_num"] = df_trades["regime_marketRegime"].map(
            {"bearish": -1, "neutral": 0, "bullish": 1}
        ).fillna(0)
        feature_cols.append("market_regime_num")
    if "asset" in df_trades.columns and df_trades["asset"].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades["asset"], prefix="asset")
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns.tolist())

    available_cols = [c for c in feature_cols if c in df_trades.columns]
    X = df_trades[available_cols].copy()
    y = df_trades[label_col].clip(0, 5)
    X = X.fillna(0)
    X = X.select_dtypes(include=[np.number, "bool"])
    for c in X.select_dtypes(include=["bool"]).columns:
        X[c] = X[c].astype(int)
    if use_scaler:
        float_cols = _safe_float_columns_for_scaler(X)
        if len(float_cols) > 0:
            X[float_cols] = StandardScaler().fit_transform(X[float_cols])

    logger.info("SL features: %s, target mean: %.2f", X.shape, y.mean())
    return X, y


# ==========================================
# Model Training
# ==========================================

def _compute_sample_weights(
    n: int,
    asset_series: pd.Series | None,
    recency_decay: float,
    balance_assets: bool,
) -> np.ndarray | None:
    """Optional sample weights: recency (recent rows upweighted) and/or per-asset balancing. Returns None if both off."""
    if recency_decay <= 0 and not balance_assets:
        return None
    w = np.ones(n, dtype=np.float64)
    if recency_decay > 0:
        # Recent rows (high index) get weight closer to 1
        w *= np.exp(recency_decay * (np.arange(n) - (n - 1)) / max(1, n))
    if balance_assets and asset_series is not None and len(asset_series) == n:
        counts = asset_series.value_counts()
        inv_freq = asset_series.map(lambda a: 1.0 / max(1, counts.get(a, 1)))
        w *= inv_freq.values
    w /= w.max()
    return w


def _time_split(X: pd.DataFrame, y: pd.Series, test_frac: float = 0.2):
    """Split by time order (last test_frac as validation)."""
    n = len(X)
    split = int(n * (1 - test_frac))
    if split < 10 or n - split < 5:
        return X, y, None, None
    return X.iloc[:split], y.iloc[:split], X.iloc[split:], y.iloc[split:]


def _safe_float_columns_for_scaler(X: pd.DataFrame) -> List[str]:
    """Return float columns that have at least one valid value and non-zero variance to avoid StandardScaler warnings."""
    float_cols = X.select_dtypes(include=["float64", "float32"]).columns.tolist()
    valid = []
    for c in float_cols:
        ser = X[c]
        if not ser.notna().any():
            continue
        v = ser.var(skipna=True)
        if v is None or (hasattr(v, "__float__") and float(v) <= 1e-10):
            continue
        valid.append(c)
    return valid


def _holdout_metrics(
    model: Any, X: pd.DataFrame, y: pd.Series, kind: str
) -> Dict[str, float]:
    """Compute metrics on time-based holdout (last 20%) for drift detection. Returns dict for improvement_report.holdout_metrics."""
    X_tr, y_tr, X_val, y_val = _time_split(X, y, test_frac=0.2)
    if X_val is None or len(X_val) < 5:
        return {}
    try:
        if kind == "signal_quality":
            proba = model.predict_proba(X_val)[:, 1]
            return {
                "holdout_auc": float(roc_auc_score(y_val, proba)),
                "holdout_accuracy": float(accuracy_score(y_val, (proba >= 0.5).astype(int))),
            }
        if kind == "position_sizing":
            pred = model.predict(X_val)
            return {"holdout_mae": float(mean_absolute_error(y_val, pred))}
        if kind == "tp_optimizer":
            pred = model.predict(X_val)
            proba = model.predict_proba(X_val)
            return {
                "holdout_accuracy": float(accuracy_score(y_val, pred)),
                "holdout_log_loss": float(log_loss(y_val, proba)),
            }
        if kind == "sl_optimizer":
            pred = model.predict(X_val)
            # Pinball/quantile loss for alpha=0.95
            err = np.asarray(y_val) - np.asarray(pred)
            quantile_loss = np.mean(np.where(err >= 0, 0.95 * err, -0.05 * err))
            return {"holdout_mae": float(mean_absolute_error(y_val, pred)), "holdout_quantile_loss": float(quantile_loss)}
    except Exception as e:
        logger.debug("Holdout metrics failed for %s: %s", kind, e)
        return {}
    return {}


def _tune_signal_quality(X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None) -> xgb.XGBClassifier:
    """GridSearchCV over key hyperparams with TimeSeriesSplit. Returns best estimator."""
    pos_count = int(np.sum(y))
    scale_pos_weight = (len(y) - pos_count) / pos_count if pos_count > 0 else 1.0
    param_grid = {
        "max_depth": [3, 4, 5],
        "learning_rate": [0.03, 0.05, 0.07],
        "n_estimators": [150, 200],
    }
    base = xgb.XGBClassifier(
        objective="binary:logistic",
        eval_metric="auc",
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
    )
    tscv = TimeSeriesSplit(n_splits=3)
    search = GridSearchCV(base, param_grid, cv=tscv, scoring="roc_auc", n_jobs=-1, verbose=0)
    if sample_weight is not None:
        search.fit(X, y, sample_weight=sample_weight)
    else:
        search.fit(X, y)
    logger.info("Signal Quality Model - best CV AUC: %.3f (params: %s)", search.best_score_, search.best_params_)
    return search.best_estimator_


def train_signal_quality_model(
    X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None = None
) -> xgb.XGBClassifier:
    """Train signal quality classifier with early stopping on a time-based holdout."""
    X_tr, y_tr, X_val, y_val = _time_split(X, y)
    use_early_stop = X_val is not None and len(X_val) >= 5
    pos_count = int(np.sum(y))
    scale_pos_weight = (len(y) - pos_count) / pos_count if pos_count > 0 else 1.0
    w_tr = sample_weight[: len(y_tr)] if sample_weight is not None and len(sample_weight) >= len(y_tr) else None

    cv_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        objective="binary:logistic",
        eval_metric="auc",
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
    )
    tscv = TimeSeriesSplit(n_splits=5)
    scores = cross_val_score(cv_model, X, y, cv=tscv, scoring="roc_auc")
    logger.info("Signal Quality Model - CV AUC: %.3f (+/- %.3f)", scores.mean(), scores.std())

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        objective="binary:logistic",
        eval_metric="auc",
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos_weight,
        early_stopping_rounds=15 if use_early_stop else None,
    )
    if use_early_stop:
        if w_tr is not None:
            model.fit(X_tr, y_tr, sample_weight=w_tr, eval_set=[(X_val, y_val)], verbose=False)
        else:
            model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
    else:
        model.fit(X, y, sample_weight=sample_weight if sample_weight is not None else None)

    importance = pd.DataFrame({
        "feature": X.columns,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)
    logger.info("Top 5 features:\n%s", importance.head().to_string())
    return model


def _tune_position_sizing(X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None) -> xgb.XGBRegressor:
    """GridSearchCV for position sizing (neg MAE). Returns best estimator."""
    param_grid = {"max_depth": [3, 4, 5], "learning_rate": [0.03, 0.05, 0.07], "n_estimators": [150, 200]}
    base = xgb.XGBRegressor(objective="reg:squarederror", random_state=42, tree_method="hist", subsample=0.8, colsample_bytree=0.8)
    search = GridSearchCV(base, param_grid, cv=TimeSeriesSplit(n_splits=3), scoring="neg_mean_absolute_error", n_jobs=-1, verbose=0)
    if sample_weight is not None:
        search.fit(X, y, sample_weight=sample_weight)
    else:
        search.fit(X, y)
    logger.info("Position Sizing Model - best CV MAE: %.3f (params: %s)", -search.best_score_, search.best_params_)
    return search.best_estimator_


def train_position_sizing_model(
    X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None = None
) -> xgb.XGBRegressor:
    """Train position sizing regressor with early stopping."""
    X_tr, y_tr, X_val, y_val = _time_split(X, y)
    use_early_stop = X_val is not None and len(X_val) >= 5
    w_tr = sample_weight[: len(y_tr)] if sample_weight is not None and len(sample_weight) >= len(y_tr) else None

    cv_model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        objective="reg:squarederror",
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
    )
    tscv = TimeSeriesSplit(n_splits=5)
    scores = cross_val_score(cv_model, X, y, cv=tscv, scoring="neg_mean_absolute_error")
    logger.info("Position Sizing Model - CV MAE: %.3f (+/- %.3f)", -scores.mean(), scores.std())

    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        objective="reg:squarederror",
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=15 if use_early_stop else None,
    )
    if use_early_stop:
        if w_tr is not None:
            model.fit(X_tr, y_tr, sample_weight=w_tr, eval_set=[(X_val, y_val)], verbose=False)
        else:
            model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
    else:
        model.fit(X, y, sample_weight=sample_weight if sample_weight is not None else None)
    return model


def train_tp_optimizer_model(
    X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None = None
) -> xgb.XGBClassifier:
    """Train take-profit optimizer (multi-class) with early stopping."""
    n_class = int(y.nunique())
    X_tr, y_tr, X_val, y_val = _time_split(X, y)
    use_early_stop = X_val is not None and len(X_val) >= 5
    w_tr = sample_weight[: len(y_tr)] if sample_weight is not None and len(sample_weight) >= len(y_tr) else None

    cv_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        objective="multi:softprob",
        num_class=max(n_class, 2),
        eval_metric="mlogloss",
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
    )
    tscv = TimeSeriesSplit(n_splits=5)
    scores = cross_val_score(cv_model, X, y, cv=tscv, scoring="accuracy")
    logger.info("TP Optimizer Model - CV Accuracy: %.3f (+/- %.3f)", scores.mean(), scores.std())

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        objective="multi:softprob",
        num_class=max(n_class, 2),
        eval_metric="mlogloss",
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=15 if use_early_stop else None,
    )
    if use_early_stop:
        if w_tr is not None:
            model.fit(X_tr, y_tr, sample_weight=w_tr, eval_set=[(X_val, y_val)], verbose=False)
        else:
            model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
    else:
        model.fit(X, y, sample_weight=sample_weight if sample_weight is not None else None)
    return model


def train_sl_optimizer_model(
    X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None = None
) -> xgb.XGBRegressor:
    """Train stop-loss optimizer (quantile regression for max adverse excursion)."""
    X_tr, y_tr, X_val, y_val = _time_split(X, y)
    use_early_stop = X_val is not None and len(X_val) >= 5
    w_tr = sample_weight[: len(y_tr)] if sample_weight is not None and len(sample_weight) >= len(y_tr) else None

    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        objective="reg:quantileerror",
        quantile_alpha=0.95,
        random_state=42,
        tree_method="hist",
        subsample=0.8,
        colsample_bytree=0.8,
        early_stopping_rounds=15 if use_early_stop else None,
    )
    if use_early_stop:
        if w_tr is not None:
            model.fit(X_tr, y_tr, sample_weight=w_tr, eval_set=[(X_val, y_val)], verbose=False)
        else:
            model.fit(X_tr, y_tr, eval_set=[(X_val, y_val)], verbose=False)
    else:
        model.fit(X, y, sample_weight=sample_weight if sample_weight is not None else None)
    return model


# ==========================================
# ONNX Export
# ==========================================

def _onnx_rename_io_for_runtime(onnx_model: "onnx.ModelProto", input_name: str = "input", output_name: str = "output") -> None:
    """Rename graph input/output to 'input'/'output' for onnxruntime-node compatibility."""
    g = onnx_model.graph
    if g.input:
        g.input[0].name = input_name
    if g.output:
        g.output[0].name = output_name


def verify_onnx_inference(onnx_path: str, X_sample: pd.DataFrame, model_name: str, is_classifier: bool = True) -> bool:
    """Run one inference with onnxruntime to verify shape and value range. Catches dimension/dtype issues before deploy."""
    try:
        import onnxruntime as ort
    except ImportError:
        logger.debug("onnxruntime not installed; skipping ONNX smoke test for %s", model_name)
        return True
    try:
        session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        sample = X_sample.fillna(0).select_dtypes(include=[np.number]).astype(np.float32)
        if sample.shape[0] == 0:
            logger.warning("ONNX smoke test %s: no numeric sample row", model_name)
            return False
        row = np.ascontiguousarray(sample.iloc[:1].values, dtype=np.float32)
        out = session.run({input_name: row}, None)
        if not out or out[0] is None:
            logger.warning("ONNX smoke test %s: no output", model_name)
            return False
        arr = out[0]
        if arr.size == 0:
            logger.warning("ONNX smoke test %s: empty output", model_name)
            return False
        if is_classifier:
            flat = arr.flatten()
            if not np.all(np.isfinite(flat)):
                logger.warning("ONNX smoke test %s: non-finite output", model_name)
                return False
            if np.any(flat < -0.01) or np.any(flat > 1.01):
                logger.debug("ONNX smoke test %s: output outside [0,1] (may be logits): %s", model_name, flat[: min(4, len(flat))].tolist())
        logger.info("ONNX smoke test passed for %s (shape %s)", model_name, arr.shape)
        return True
    except Exception as e:
        logger.warning("ONNX smoke test failed for %s: %s", model_name, e)
        return False


def export_to_onnx(model: Any, X_sample: pd.DataFrame, output_path: str, model_name: str) -> bool:
    """Export XGBoost model to ONNX via onnxmltools. I/O named 'input'/'output' for onnxruntime-node."""
    if not ONNX_AVAILABLE or convert_xgboost is None or FloatTensorType is None:
        logger.warning("Skipping ONNX export for %s - install: pip3 install onnx onnxmltools", model_name)
        return False
    try:
        n_features = X_sample.shape[1]
        # onnxmltools expects feature names f0, f1, ...; XGBoost trained on DataFrame has column names.
        booster = model.get_booster()
        original_names = list(booster.feature_names) if booster.feature_names else []
        try:
            booster.feature_names = [f"f{i}" for i in range(n_features)]
            initial_types = [("input", FloatTensorType([None, n_features]))]
            onnx_model = convert_xgboost(model, initial_types=initial_types, target_opset=12)
            _onnx_rename_io_for_runtime(onnx_model, input_name="input", output_name="output")
            onnx.save_model(onnx_model, output_path)
            logger.info("Exported %s to %s", model_name, output_path)
            is_classifier = "Classifier" in type(model).__name__ or "quality" in model_name.lower() or "optimizer" in model_name.lower()
            if not verify_onnx_inference(output_path, X_sample, model_name, is_classifier=is_classifier):
                logger.warning("ONNX export succeeded but smoke test failed for %s", model_name)
            return True
        finally:
            if original_names:
                booster.feature_names = original_names
    except Exception as e:
        logger.warning("Failed to export %s: %s", model_name, e)
        return False


def save_joblib_backup(model: Any, output_path: str, model_name: str) -> None:
    """Save model as joblib backup for debugging or non-ONNX inference."""
    try:
        joblib.dump(model, output_path)
        logger.info("Saved %s joblib backup to %s", model_name, output_path)
    except Exception as e:
        logger.warning("Failed to save joblib backup for %s: %s", model_name, e)


# ==========================================
# Improvement Report (identify which parameters/weights to improve)
# ==========================================

def _suggest_signal_quality_threshold(model: Any, X: pd.DataFrame, y: pd.Series) -> float:
    """Suggest a probability threshold (e.g. for fallback or tuning) from the trained classifier."""
    try:
        proba = model.predict_proba(X)[:, 1]
        from sklearn.metrics import f1_score
        best_thresh, best_f1 = 0.5, 0.0
        for t in np.linspace(0.3, 0.8, 51):
            pred = (proba >= t).astype(int)
            f1 = f1_score(y, pred, zero_division=0)
            if f1 >= best_f1:
                best_f1, best_thresh = f1, float(t)
        return round(best_thresh, 2)
    except Exception:
        return 0.6


def _platt_calibration(model: Any, X: pd.DataFrame, y: pd.Series) -> Dict[str, float] | None:
    """Fit Platt scaling on validation fold so score bands match historical win rate. Returns {scale, intercept} or None."""
    try:
        from sklearn.linear_model import LogisticRegression
        X_tr, y_tr, X_val, y_val = _time_split(X, y)
        if X_val is None or len(X_val) < 10:
            return None
        raw_proba = model.predict_proba(X_val)[:, 1]
        # Clip to avoid logit extremes
        raw_proba = np.clip(raw_proba, 1e-6, 1 - 1e-6)
        lr = LogisticRegression(C=1e10, max_iter=500)
        lr.fit(raw_proba.reshape(-1, 1), y_val)
        return {"scale": float(lr.coef_[0][0]), "intercept": float(lr.intercept_[0])}
    except Exception as e:
        logger.warning("Platt calibration skipped: %s", e)
        return None


def _tp_level_performance(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute win rate and count per optimal TP level from labeled data."""
    col = "label_optimalTpLevel"
    prof = "label_profitable"
    if col not in df.columns or prof not in df.columns:
        return {}
    subset = df[[col, prof]].dropna()
    if subset.empty:
        return {}
    by_level = subset.groupby(col)[prof].agg(["mean", "count"]).rename(columns={"mean": "win_rate", "count": "count"})
    return {str(int(k)): {"win_rate": round(float(v["win_rate"]), 3), "count": int(v["count"])} for k, v in by_level.iterrows()}


def _decision_drivers_by_direction(df: pd.DataFrame, max_per_direction: int = 8) -> Dict[str, Any]:
    """Summarize which data points (reasons/factors) influenced long vs short opens. Used for explainability and improvement report."""
    out: Dict[str, Any] = {}
    if "decision_drivers" not in df.columns or "signal_direction" not in df.columns:
        return out
    for direction in ["long", "short"]:
        subset = df[df["signal_direction"] == direction]
        if subset.empty:
            continue
        drivers = subset["decision_drivers"].dropna()
        all_factors: List[str] = []
        for d in drivers:
            if isinstance(d, list):
                all_factors.extend(str(x) for x in d)
            elif isinstance(d, str):
                all_factors.append(d)
        if not all_factors:
            continue
        from collections import Counter
        counts = Counter(all_factors)
        most_common = [f for f, _ in counts.most_common(max_per_direction)]
        out[direction] = {
            "sample_drivers": most_common,
            "trade_count": int(len(subset)),
            "total_factor_mentions": len(all_factors),
        }
    return out


# Candidate signal factors we might want to add (name, description, columns/hints we check for presence)
CANDIDATE_SIGNAL_FACTORS = [
    {"name": "Funding 8h delta", "description": "Change in funding rate over last 8h; predicts reversals.", "hint": "market_fundingDelta"},
    {"name": "Order book imbalance", "description": "Bid vs ask depth; short-term direction.", "hint": "market_bookImbalance"},
    {"name": "Bid-ask spread", "description": "Liquidity / slippage proxy.", "hint": "market_bidAskSpread"},
    {"name": "RSI (14)", "description": "Momentum; overbought/oversold.", "hint": "market_rsi14"},
    {"name": "Price vs SMA20", "description": "Trend alignment.", "hint": "market_priceVsSma20"},
    {"name": "DVOL / volatility index", "description": "Options-implied volatility.", "hint": "market_dvol"},
    {"name": "OI change 24h", "description": "Position buildup or flush.", "hint": "market_oiChange24h"},
    {"name": "NASDAQ 24h change", "description": "Risk-on/risk-off macro.", "hint": "news_nasdaqChange"},
    {"name": "ETF flow (BTC/ETH)", "description": "Institutional flow.", "hint": "news_etfFlowBtc"},
    {"name": "Macro risk environment", "description": "risk_on / risk_off / neutral.", "hint": "news_macroRiskEnvironment"},
    {"name": "Signal source sentiment", "description": "Per-source sentiment from aggregator.", "hint": "signal_avg_sentiment"},
    {"name": "Recent win/loss streak", "description": "Cold/hot streak for position sizing.", "hint": "exec_streakMultiplier"},
    {"name": "Hyperliquid OI cap", "description": "Perps at open interest cap (contrarian).", "hint": "signal_hasOICap"},
    {"name": "Hyperliquid funding extreme", "description": "Extreme funding regime (mean reversion).", "hint": "signal_hasFundingExtreme"},
    {"name": "Binance L/S ratio", "description": "Long/short ratio signal.", "hint": "market_longShortRatio"},
    {"name": "Binance OI flush", "description": "Open interest flush signal.", "hint": "market_oiChange24h"},
]


def _suggest_signal_factors(df: pd.DataFrame) -> List[Dict[str, str]]:
    """Suggest signal factors we do not yet have (or have but are mostly null). Helps prioritize what to add to the feature store."""
    suggested = []
    for cand in CANDIDATE_SIGNAL_FACTORS:
        hint = cand.get("hint")
        if not hint:
            continue
        if hint not in df.columns:
            suggested.append({"name": cand["name"], "reason": "not in data", "description": cand["description"]})
            continue
        non_null = df[hint].notna().sum()
        pct = (non_null / len(df) * 100) if len(df) > 0 else 0
        if pct < 20:
            suggested.append({
                "name": cand["name"],
                "reason": f"present but {pct:.0f}% non-null — consider populating",
                "description": cand["description"],
            })
    return suggested


def build_improvement_report(
    df: pd.DataFrame,
    report_entries: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    """Build a report that identifies which parameters and weights can/must be improved."""
    report = {
        "feature_importances": report_entries,
        "tp_level_performance": _tp_level_performance(df),
        "decision_drivers_by_direction": _decision_drivers_by_direction(df),
        "suggested_signal_factors": _suggest_signal_factors(df),
        "action_items": [],
    }
    holdout = {k: v.get("holdout_metrics") for k, v in report_entries.items() if v.get("holdout_metrics")}
    if holdout:
        report["holdout_metrics"] = holdout
    # Suggested min strength/confidence from 25th percentile of profitable trades (for bot to consume)
    if "label_profitable" in df.columns and "signal_strength" in df.columns and "signal_confidence" in df.columns:
        prof = df[df["label_profitable"] == True]
        if len(prof) >= 20:
            try:
                q_str = prof["signal_strength"].quantile(0.25)
                q_conf = prof["signal_confidence"].quantile(0.25)
                report["suggested_tuning"] = {
                    "min_strength": int(max(0, min(100, round(float(q_str))))),
                    "min_confidence": int(max(0, min(100, round(float(q_conf))))),
                }
            except (TypeError, ValueError):
                pass
    if "signal_quality" in report_entries and "suggested_threshold" in report_entries["signal_quality"]:
        t = report_entries["signal_quality"]["suggested_threshold"]
        report["suggested_signal_quality_threshold"] = t
        report["action_items"].append(
            f"Consider setting ML fallback signalQualityThreshold to {t} (or use in Parameter Tuner bounds)."
        )
    if "signal_quality" in report_entries and "feature_importances" in report_entries["signal_quality"]:
        imp = report_entries["signal_quality"]["feature_importances"]
        top = sorted(imp.items(), key=lambda x: -x[1])[:3]
        names = ", ".join(f[0] for f in top)
        report["action_items"].append(
            f"Signal quality is most driven by: {names}. Tune corresponding thresholds (e.g. minStrength, minConfidence) in dynamicConfig."
        )
    tp_perf = report.get("tp_level_performance") or {}
    if tp_perf:
        worst = min(tp_perf.items(), key=lambda x: (x[1]["win_rate"], -x[1]["count"]))
        report["action_items"].append(
            f"TP level {worst[0]} has win_rate {worst[1]['win_rate']:.2%} ({worst[1]['count']} trades). Review whether to reduce weight or tighten conditions."
        )
    if report.get("decision_drivers_by_direction"):
        report["action_items"].append(
            "Review 'Decision drivers that influenced opens' below: those data points drove long/short opens and feed the same features the ML models use."
        )
    if report.get("suggested_signal_factors"):
        report["action_items"].append(
            "Consider adding the 'Suggested signal factors' below to the feature store and signal aggregator to improve future training."
        )
    return report


def write_improvement_report_md(report: Dict[str, Any], output_path: Path) -> None:
    """Write human-readable improvement report to a markdown file."""
    lines = ["# Parameter Improvement Report", "", "Use this report to see which parameters and weights to improve.", ""]
    data_summary = report.get("data_summary")
    if data_summary:
        lines.append("## Data summary")
        lines.append("")
        for k, v in data_summary.items():
            lines.append(f"- {k}: {v}")
        lines.append("")
    drivers_by_dir = report.get("decision_drivers_by_direction") or {}
    if drivers_by_dir:
        lines.append("## Decision drivers that influenced opens (long / short)")
        lines.append("")
        lines.append("These are the data points (reasons/factors) that influenced the paper trading bot to open each long or short. They are the same inputs that feed the ML models and train_models; improving the algo means tuning how these drivers map to outcomes.")
        lines.append("")
        for direction in ["long", "short"]:
            if direction not in drivers_by_dir:
                continue
            info = drivers_by_dir[direction]
            lines.append(f"### {direction.upper()} opens (n={info.get('trade_count', 0)} trades)")
            for f in info.get("sample_drivers", [])[:8]:
                lines.append(f"- {f}")
            lines.append("")
        lines.append("---")
        lines.append("")
    if report.get("suggested_signal_quality_threshold") is not None:
        lines.append(f"- **Suggested signal quality threshold:** `{report['suggested_signal_quality_threshold']}`")
        lines.append("")
    lines.append("## Feature importances (top features per model)")
    lines.append("")
    for model_name, data in (report.get("feature_importances") or {}).items():
        imp = data.get("feature_importances") or data
        if isinstance(imp, dict):
            top = sorted(imp.items(), key=lambda x: -float(x[1]))[:8]
            lines.append(f"### {model_name}")
            for feat, score in top:
                lines.append(f"- `{feat}`: {float(score):.4f}")
            lines.append("")
    if report.get("tp_level_performance"):
        lines.append("## TP level performance (win rate, count)")
        lines.append("")
        for level, stats in report["tp_level_performance"].items():
            lines.append(f"- TP level {level}: win_rate={stats['win_rate']:.2%}, count={stats['count']}")
        lines.append("")
    if report.get("holdout_metrics"):
        lines.append("## Holdout metrics (actual vs predicted, for drift detection)")
        lines.append("")
        for model_name, metrics in report["holdout_metrics"].items():
            lines.append(f"- **{model_name}**: " + ", ".join(f"{k}={v:.4f}" for k, v in metrics.items()))
        lines.append("")
    sug = report.get("suggested_signal_factors") or []
    if sug:
        lines.append("## Suggested signal factors (consider adding)")
        lines.append("")
        lines.append("These factors are often predictive but missing or mostly null in your data. Adding them to the feature store can improve future models.")
        lines.append("")
        for s in sug:
            lines.append(f"- **{s.get('name', '')}**: {s.get('description', '')} — *{s.get('reason', '')}*")
        lines.append("")
    lines.append("## Action items")
    lines.append("")
    for item in report.get("action_items") or []:
        lines.append(f"- {item}")
    output_path.write_text("\n".join(lines), encoding="utf-8")
    logger.info("Wrote improvement report: %s", output_path)


# ==========================================
# Main Training Pipeline
# ==========================================

def main():
    parser = argparse.ArgumentParser(description="Train VINCE ML models")
    parser.add_argument("--data", type=str, required=True, help="Path to features.jsonl or directory of features_*.jsonl (e.g. .elizadb/vince-paper-bot/features)")
    parser.add_argument("--output", type=str, default="./models", help="Output directory for models")
    parser.add_argument("--min-samples", type=int, default=90, help="Minimum trades with outcome required to train (default 90)")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging to train.log")
    parser.add_argument("--recency-decay", type=float, default=0.0, help="Recency sample weight decay (e.g. 0.01 upweights recent rows); 0 = off")
    parser.add_argument("--balance-assets", action="store_true", help="Balance sample weights by asset so one symbol does not dominate")
    parser.add_argument("--tune-hyperparams", action="store_true", help="Run GridSearchCV over max_depth, learning_rate, n_estimators with TimeSeriesSplit (slower)")
    parser.add_argument("--real-only", dest="real_only", action="store_true", help="Load only features_*.jsonl and combined.jsonl; exclude synthetic_*.jsonl (use for production when you have enough real trades)")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    setup_logging_to_file(output_dir, verbose=args.verbose)

    logger.info("=" * 60)
    logger.info("VINCE ML Model Training")
    logger.info("Data: %s", args.data)
    logger.info("Output: %s", args.output)
    if getattr(args, "real_only", False):
        logger.info("Real-only: excluding synthetic_*.jsonl (production mode)")
    logger.info("=" * 60)

    df = load_features(args.data, real_only=getattr(args, "real_only", False))
    if df.empty:
        logger.warning("No data loaded. Exiting.")
        return

    trades_with_outcome = int(df["label_profitable"].notna().sum())
    if trades_with_outcome < args.min_samples:
        logger.warning(
            "Insufficient data: %d trades with outcomes (need at least %d). Continue collecting with the paper trading bot.",
            trades_with_outcome, args.min_samples,
        )
        # Still write a minimal report: data summary + suggested signal factors (so we learn what to add)
        minimal_report = {
            "data_summary": {
                "total_records": int(len(df)),
                "trades_with_outcomes": trades_with_outcome,
                "min_samples_required": args.min_samples,
            },
            "suggested_signal_factors": _suggest_signal_factors(df),
            "action_items": [
                f"Collect at least {args.min_samples} completed trades (with outcome/labels), then re-run training.",
                "Consider adding the suggested signal factors above to the feature store.",
            ],
        }
        metadata = {
            "trained_at": datetime.now().isoformat(),
            "data_file": args.data,
            "total_records": int(len(df)),
            "trades_with_outcomes": trades_with_outcome,
            "models_trained": [],
            "models_fit": [],
            "improvement_report": minimal_report,
        }
        with open(output_dir / "training_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)
        write_improvement_report_md(minimal_report, output_dir / "improvement_report.md")
        logger.info("Wrote minimal report (data summary + suggested signal factors): %s", output_dir / "improvement_report.md")
        return

    logger.info("Training on %d completed trades", trades_with_outcome)
    models_trained = []
    models_fit = []
    improvement_entries = {}

    # Signal Quality
    try:
        logger.info("=" * 40)
        logger.info("Training Signal Quality Model")
        logger.info("=" * 40)
        X_sq, y_sq = prepare_signal_quality_features(df)
        if len(X_sq) >= args.min_samples:
            df_sq = df[df["label_profitable"].notna()].copy()
            w_sq = _compute_sample_weights(
                len(X_sq),
                df_sq["asset"] if "asset" in df_sq.columns else None,
                args.recency_decay,
                args.balance_assets,
            ) if (args.recency_decay > 0 or args.balance_assets) else None
            model_sq = (
                _tune_signal_quality(X_sq, y_sq, w_sq)
                if getattr(args, "tune_hyperparams", False)
                else train_signal_quality_model(X_sq, y_sq, sample_weight=w_sq)
            )
            models_fit.append("signal_quality")
            if export_to_onnx(model_sq, X_sq.iloc[:1], str(output_dir / "signal_quality.onnx"), "Signal Quality"):
                models_trained.append("signal_quality")
            save_joblib_backup(model_sq, str(output_dir / "signal_quality.joblib"), "Signal Quality")
            imp = dict(zip(X_sq.columns.tolist(), [float(x) for x in model_sq.feature_importances_]))
            calibration = _platt_calibration(model_sq, X_sq, y_sq)
            improvement_entries["signal_quality"] = {
                "feature_importances": imp,
                "suggested_threshold": _suggest_signal_quality_threshold(model_sq, X_sq, y_sq),
                "feature_names": X_sq.columns.tolist(),
            }
            if calibration:
                improvement_entries["signal_quality"]["signal_quality_calibration"] = calibration
                logger.info("Signal quality Platt calibration: scale=%.4f, intercept=%.4f", calibration["scale"], calibration["intercept"])
            improvement_entries["signal_quality"]["holdout_metrics"] = _holdout_metrics(model_sq, X_sq, y_sq, "signal_quality")
        else:
            logger.info("Skipping Signal Quality - insufficient samples")
    except Exception as e:
        logger.error("Error training Signal Quality Model: %s", e)

    # Position Sizing
    try:
        logger.info("=" * 40)
        logger.info("Training Position Sizing Model")
        logger.info("=" * 40)
        X_ps, y_ps = prepare_position_sizing_features(df)
        if len(X_ps) >= args.min_samples:
            df_ps = df[df["label_rMultiple"].notna()].copy()
            w_ps = _compute_sample_weights(
                len(X_ps),
                df_ps["asset"] if "asset" in df_ps.columns else None,
                args.recency_decay,
                args.balance_assets,
            ) if (args.recency_decay > 0 or args.balance_assets) else None
            model_ps = (
                _tune_position_sizing(X_ps, y_ps, w_ps)
                if getattr(args, "tune_hyperparams", False)
                else train_position_sizing_model(X_ps, y_ps, sample_weight=w_ps)
            )
            models_fit.append("position_sizing")
            if export_to_onnx(model_ps, X_ps.iloc[:1], str(output_dir / "position_sizing.onnx"), "Position Sizing"):
                models_trained.append("position_sizing")
            save_joblib_backup(model_ps, str(output_dir / "position_sizing.joblib"), "Position Sizing")
            improvement_entries["position_sizing"] = {
                "feature_importances": dict(zip(X_ps.columns.tolist(), [float(x) for x in model_ps.feature_importances_])),
                "holdout_metrics": _holdout_metrics(model_ps, X_ps, y_ps, "position_sizing"),
            }
        else:
            logger.info("Skipping Position Sizing - insufficient samples")
    except Exception as e:
        logger.error("Error training Position Sizing Model: %s", e)

    # TP Optimizer
    try:
        logger.info("=" * 40)
        logger.info("Training TP Optimizer Model")
        logger.info("=" * 40)
        X_tp, y_tp = prepare_tp_features(df)
        if len(X_tp) >= args.min_samples:
            df_tp = df[df["label_optimalTpLevel"].notna()].copy()
            w_tp = _compute_sample_weights(
                len(X_tp),
                df_tp["asset"] if "asset" in df_tp.columns else None,
                args.recency_decay,
                args.balance_assets,
            ) if (args.recency_decay > 0 or args.balance_assets) else None
            model_tp = train_tp_optimizer_model(X_tp, y_tp, sample_weight=w_tp)
            models_fit.append("tp_optimizer")
            if export_to_onnx(model_tp, X_tp.iloc[:1], str(output_dir / "tp_optimizer.onnx"), "TP Optimizer"):
                models_trained.append("tp_optimizer")
            save_joblib_backup(model_tp, str(output_dir / "tp_optimizer.joblib"), "TP Optimizer")
            improvement_entries["tp_optimizer"] = {
                "feature_importances": dict(zip(X_tp.columns.tolist(), [float(x) for x in model_tp.feature_importances_])),
                "holdout_metrics": _holdout_metrics(model_tp, X_tp, y_tp, "tp_optimizer"),
            }
        else:
            logger.info("Skipping TP Optimizer - insufficient samples")
    except Exception as e:
        logger.error("Error training TP Optimizer Model: %s", e)

    # SL Optimizer (only if label_maxAdverseExcursion present and enough samples)
    try:
        logger.info("=" * 40)
        logger.info("Training SL Optimizer Model")
        logger.info("=" * 40)
        X_sl, y_sl = prepare_sl_features(df)
        if not X_sl.empty and len(X_sl) >= args.min_samples:
            label_col = "label_maxAdverseExcursion"
            df_sl = df[df[label_col].notna()].copy()
            w_sl = _compute_sample_weights(
                len(X_sl),
                df_sl["asset"] if "asset" in df_sl.columns else None,
                args.recency_decay,
                args.balance_assets,
            ) if (args.recency_decay > 0 or args.balance_assets) else None
            model_sl = train_sl_optimizer_model(X_sl, y_sl, sample_weight=w_sl)
            models_fit.append("sl_optimizer")
            if export_to_onnx(model_sl, X_sl.iloc[:1], str(output_dir / "sl_optimizer.onnx"), "SL Optimizer"):
                models_trained.append("sl_optimizer")
            save_joblib_backup(model_sl, str(output_dir / "sl_optimizer.joblib"), "SL Optimizer")
            improvement_entries["sl_optimizer"] = {
                "feature_importances": dict(zip(X_sl.columns.tolist(), [float(x) for x in model_sl.feature_importances_])),
                "holdout_metrics": _holdout_metrics(model_sl, X_sl, y_sl, "sl_optimizer"),
            }
        else:
            logger.info("Skipping SL Optimizer - no label_maxAdverseExcursion or insufficient samples")
    except Exception as e:
        logger.error("Error training SL Optimizer Model: %s", e)

    improvement_report = build_improvement_report(df, improvement_entries) if improvement_entries else {}
    if improvement_entries.get("signal_quality", {}).get("signal_quality_calibration"):
        improvement_report["signal_quality_calibration"] = improvement_entries["signal_quality"]["signal_quality_calibration"]
    metadata = {
        "trained_at": datetime.now().isoformat(),
        "data_file": args.data,
        "total_records": int(len(df)),
        "trades_with_outcomes": trades_with_outcome,
        "models_trained": models_trained,
        "models_fit": models_fit,
        "improvement_report": improvement_report,
    }
    if improvement_entries.get("signal_quality", {}).get("feature_importances"):
        metadata["signal_quality_input_dim"] = len(improvement_entries["signal_quality"]["feature_importances"])
    if improvement_entries.get("signal_quality", {}).get("feature_names"):
        metadata["signal_quality_feature_names"] = improvement_entries["signal_quality"]["feature_names"]
    with open(output_dir / "training_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    if improvement_report:
        write_improvement_report_md(improvement_report, output_dir / "improvement_report.md")

    logger.info("=" * 60)
    logger.info("Training complete. Output: %s", output_dir)
    logger.info("Models fit: %s", ", ".join(metadata["models_fit"]))
    logger.info("Models exported (ONNX): %s", ", ".join(metadata["models_trained"]) or "none")
    if improvement_report.get("action_items"):
        logger.info("Improvement report: %s", output_dir / "improvement_report.md")
    logger.info("Log file: %s", output_dir / "train.log")
    logger.info("Next: copy .onnx to .elizadb/vince-paper-bot/models/ and restart the agent")


if __name__ == '__main__':
    main()
