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
import concurrent.futures
import hashlib
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
from sklearn.preprocessing import LabelEncoder
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

def _get_train_n_jobs() -> int:
    """Use 1 job when VINCE_TRAIN_NJOBS=1 or CI=true to avoid sandbox/process limits (e.g. in tests)."""
    if os.environ.get("VINCE_TRAIN_NJOBS") == "1":
        return 1
    if os.environ.get("CI") == "true" or os.environ.get("CI") == "1":
        return 1
    return -1


try:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    OPTUNA_AVAILABLE = True
except ImportError:
    OPTUNA_AVAILABLE = False

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

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
        wtt = r.get('wtt')
        if wtt:
            flat['wtt_primary'] = 1 if wtt.get('primary') else 0
            flat['wtt_alignment'] = wtt.get('alignment', 0)
            flat['wtt_edge'] = wtt.get('edge', 0)
            flat['wtt_payoffShape'] = wtt.get('payoffShape', 0)
            flat['wtt_timingForgiveness'] = wtt.get('timingForgiveness', 0)
            flat['wtt_invalidateHit'] = 1 if wtt.get('invalidateHit') else 0

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


# ==========================================
# Lag Feature Engineering
# ==========================================

# Columns eligible for lag features (market conditions from previous trades)
LAG_SOURCE_COLUMNS = [
    "market_priceChange24h", "market_volumeRatio", "market_fundingPercentile",
    "market_longShortRatio", "market_atrPct", "market_rsi14",
    "market_oiChange24h", "market_dvol",
]

# Number of prior trades to look back (per asset)
LAG_WINDOWS = [1, 2, 3]


def add_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lagged market features from prior trades (per asset, time-ordered).

    Creates columns like market_priceChange24h_lag1, market_priceChange24h_lag2, etc.
    Also adds rolling means (lag1-3 average) for key columns.
    Only uses columns that exist in the DataFrame. Fills NaN for early rows.
    """
    if df.empty or "timestamp" not in df.columns:
        return df

    df = df.sort_values("timestamp").reset_index(drop=True)
    available_lag_cols = [c for c in LAG_SOURCE_COLUMNS if c in df.columns]
    if not available_lag_cols:
        return df

    has_asset = "asset" in df.columns and df["asset"].nunique() > 1

    for col in available_lag_cols:
        for lag in LAG_WINDOWS:
            lag_name = f"{col}_lag{lag}"
            if has_asset:
                df[lag_name] = df.groupby("asset")[col].shift(lag)
            else:
                df[lag_name] = df[col].shift(lag)

        # Rolling mean of last 3 trades
        lag_cols_for_roll = [f"{col}_lag{i}" for i in LAG_WINDOWS if f"{col}_lag{i}" in df.columns]
        if lag_cols_for_roll:
            df[f"{col}_roll3"] = df[lag_cols_for_roll].mean(axis=1)

    lag_count = sum(1 for c in df.columns if "_lag" in c or "_roll3" in c)
    logger.info("Added %d lag/rolling features from %d source columns", lag_count, len(available_lag_cols))
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
    "signal_xSentimentScore",  # X (Twitter) sentiment when XSentiment source contributed
    "wtt_primary",
    "wtt_alignment",
    "wtt_edge",
    "wtt_payoffShape",
    "wtt_timingForgiveness",
    "wtt_invalidateHit",
)


def _clip_outliers(df: pd.DataFrame, z_thresh: float = 3.0) -> pd.DataFrame:
    """Clip numeric outliers using z-score (requires scipy). Returns a copy. No-op if scipy missing."""
    try:
        from scipy import stats
    except ImportError:
        return df
    df = df.copy()
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


def _add_common_features(
    df_trades: pd.DataFrame, feature_cols: List[str],
    include_regime_binary: bool = False, include_regime_ordinal: bool = False,
    include_market_regime: bool = False,
) -> Tuple[pd.DataFrame, List[str]]:
    """Shared feature enrichment: optional columns, news, regime, asset dummies, lag features.

    Mutates df_trades (caller passes a copy) and extends feature_cols in-place.
    Returns (df_trades, feature_cols) for chaining.
    """
    # Optional feature columns
    for opt in OPTIONAL_FEATURE_COLUMNS:
        if opt in df_trades.columns:
            feature_cols.append(opt)
    # Sentiment columns
    for col in ("signal_avg_sentiment", "news_avg_sentiment"):
        if col in df_trades.columns:
            feature_cols.append(col)
    # News numeric columns
    for opt in ("news_nasdaqChange", "news_etfFlowBtc", "news_etfFlowEth"):
        if opt in df_trades.columns:
            feature_cols.append(opt)
    # News macro risk one-hot
    if "news_macroRiskEnvironment" in df_trades.columns:
        df_trades["news_macro_risk_on"] = (df_trades["news_macroRiskEnvironment"] == "risk_on").astype(int)
        df_trades["news_macro_risk_off"] = (df_trades["news_macroRiskEnvironment"] == "risk_off").astype(int)
        feature_cols.extend(["news_macro_risk_on", "news_macro_risk_off"])
    # Volatility regime — binary (high) for signal quality
    if include_regime_binary and "regime_volatilityRegime" in df_trades.columns:
        df_trades["regime_volatility_high"] = (df_trades["regime_volatilityRegime"] == "high").astype(int)
        feature_cols.append("regime_volatility_high")
    # Volatility regime — ordinal for position sizing / TP / SL
    if include_regime_ordinal and "regime_volatilityRegime" in df_trades.columns:
        df_trades["volatility_level"] = df_trades["regime_volatilityRegime"].map(
            {"low": 0, "normal": 1, "high": 2}
        ).fillna(1)
        feature_cols.append("volatility_level")
    # Market regime (bullish/bearish) — binary for signal quality
    if include_regime_binary and "regime_marketRegime" in df_trades.columns:
        df_trades["regime_bullish"] = (df_trades["regime_marketRegime"] == "bullish").astype(int)
        df_trades["regime_bearish"] = (df_trades["regime_marketRegime"] == "bearish").astype(int)
        feature_cols.extend(["regime_bullish", "regime_bearish"])
    # Market regime — ordinal for TP/SL
    if include_market_regime and "regime_marketRegime" in df_trades.columns:
        df_trades["market_regime_num"] = df_trades["regime_marketRegime"].map(
            {"bearish": -1, "neutral": 0, "bullish": 1}
        ).fillna(0)
        feature_cols.append("market_regime_num")
    # Asset dummies
    if "asset" in df_trades.columns and df_trades["asset"].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades["asset"], prefix="asset")
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns.tolist())
    # Lag and rolling features
    lag_roll_cols = [c for c in df_trades.columns if ("_lag" in c or "_roll3" in c)]
    feature_cols.extend(lag_roll_cols)
    return df_trades, feature_cols


def _finalize_features(
    df_trades: pd.DataFrame, feature_cols: List[str], label_col: str, label_transform=None,
    model_name: str = "model",
) -> Tuple[pd.DataFrame, pd.Series]:
    """Shared finalization: select available columns, fillna, cast bools, extract y.

    No StandardScaler — XGBoost is tree-based and invariant to monotonic transforms.
    Removing the unfitted scaler also eliminates train/serve skew (scaler was never
    saved alongside ONNX models).
    """
    available_cols = sorted(set(c for c in feature_cols if c in df_trades.columns), key=feature_cols.index)
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for c in available_cols:
        if c not in seen:
            seen.add(c)
            deduped.append(c)
    X = df_trades[deduped].copy()
    y = df_trades[label_col]
    if label_transform is not None:
        y = label_transform(y)

    X = X.fillna(0)
    X = X.select_dtypes(include=[np.number, "bool"])
    for c in X.select_dtypes(include=["bool"]).columns:
        X[c] = X[c].astype(int)

    logger.info("%s features: %s", model_name, X.shape)
    return X, y


def prepare_signal_quality_features(
    df: pd.DataFrame, clip_outliers: bool = True,
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
    df_trades, feature_cols = _add_common_features(
        df_trades, feature_cols, include_regime_binary=True,
    )
    X, y = _finalize_features(
        df_trades, feature_cols, "label_profitable",
        label_transform=lambda s: s.astype(int),
        model_name="Signal quality",
    )
    logger.info("Signal quality positive rate: %.2f%%", y.mean() * 100)
    return X, y


def prepare_position_sizing_features(
    df: pd.DataFrame, clip_outliers: bool = True,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for position sizing prediction."""
    df_trades = df[df["label_rMultiple"].notna()].copy()
    if clip_outliers:
        df_trades = _clip_outliers(df_trades)

    feature_cols = [
        "signal_strength", "signal_confidence", "signal_source_count",
        "session_isWeekend", "exec_streakMultiplier", "market_atrPct",
    ]
    df_trades, feature_cols = _add_common_features(
        df_trades, feature_cols, include_regime_ordinal=True,
    )
    X, y = _finalize_features(
        df_trades, feature_cols, "label_rMultiple",
        label_transform=lambda s: s.clip(-2, 3),
        model_name="Position sizing",
    )
    logger.info("Position sizing target mean: %.2f", y.mean())
    return X, y


def prepare_tp_features(
    df: pd.DataFrame, clip_outliers: bool = True,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for take-profit optimization."""
    df_trades = df[df["label_optimalTpLevel"].notna()].copy()
    if clip_outliers:
        df_trades = _clip_outliers(df_trades)

    df_trades["signal_direction_num"] = (df_trades["signal_direction"] == "long").astype(int)
    feature_cols = [
        "signal_direction_num", "market_atrPct", "signal_strength", "signal_confidence",
    ]
    df_trades, feature_cols = _add_common_features(
        df_trades, feature_cols, include_regime_ordinal=True, include_market_regime=True,
    )
    X, y = _finalize_features(
        df_trades, feature_cols, "label_optimalTpLevel",
        label_transform=lambda s: s.astype(int),
        model_name="TP",
    )
    logger.info("TP level distribution: %s", y.value_counts().to_dict())
    return X, y


def prepare_sl_features(
    df: pd.DataFrame, clip_outliers: bool = True,
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
    df_trades, feature_cols = _add_common_features(
        df_trades, feature_cols, include_regime_ordinal=True, include_market_regime=True,
    )

    X, y = _finalize_features(
        df_trades, feature_cols, label_col,
        label_transform=lambda s: s.clip(0, 5),
        model_name="SL",
    )
    logger.info("SL target mean: %.2f", y.mean())
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


def _holdout_metrics(
    model_factory, X: pd.DataFrame, y: pd.Series, kind: str,
    sample_weight: np.ndarray | None = None,
) -> Dict[str, float]:
    """Compute metrics on time-based holdout (last 20%) for drift detection.

    Trains a *fresh* model on the train split only to avoid data leakage
    (the deployed model was fit on the full dataset).
    Returns dict for improvement_report.holdout_metrics.
    """
    X_tr, y_tr, X_val, y_val = _time_split(X, y, test_frac=0.2)
    if X_val is None or len(X_val) < 5:
        return {}
    try:
        model = model_factory()
        w_tr = sample_weight[:len(y_tr)] if sample_weight is not None and len(sample_weight) >= len(y_tr) else None
        if w_tr is not None:
            model.fit(X_tr, y_tr, sample_weight=w_tr)
        else:
            model.fit(X_tr, y_tr)

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
            err = np.asarray(y_val) - np.asarray(pred)
            quantile_loss = np.mean(np.where(err >= 0, 0.95 * err, -0.05 * err))
            return {"holdout_mae": float(mean_absolute_error(y_val, pred)), "holdout_quantile_loss": float(quantile_loss)}
    except Exception as e:
        logger.debug("Holdout metrics failed for %s: %s", kind, e)
        return {}
    return {}


def _shap_analysis(model: Any, X: pd.DataFrame, model_name: str, max_samples: int = 200) -> Dict[str, Any]:
    """Compute SHAP values for feature explanation. Returns dict with mean absolute SHAP values per feature and top interactions."""
    if not SHAP_AVAILABLE:
        return {}
    try:
        sample = X.iloc[:max_samples] if len(X) > max_samples else X
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(sample)

        # For binary classification, shap_values may be a list [neg_class, pos_class]
        if isinstance(shap_values, list):
            shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]

        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        feature_shap = dict(zip(X.columns.tolist(), [float(v) for v in mean_abs_shap]))
        sorted_features = sorted(feature_shap.items(), key=lambda x: -x[1])

        result = {
            "shap_importance": {f: round(v, 5) for f, v in sorted_features[:15]},
            "top_features": [f for f, _ in sorted_features[:5]],
        }

        # Interaction: which pairs of features matter most (top 3)
        if shap_values.shape[1] >= 2:
            try:
                interaction_matrix = np.abs(np.corrcoef(shap_values.T))
                np.fill_diagonal(interaction_matrix, 0)
                cols = X.columns.tolist()
                top_interactions = []
                flat_idx = np.argsort(interaction_matrix.flatten())[::-1]
                seen = set()
                for idx in flat_idx[:10]:
                    i, j = divmod(idx, len(cols))
                    if i != j and (j, i) not in seen:
                        seen.add((i, j))
                        top_interactions.append(f"{cols[i]} × {cols[j]}")
                    if len(top_interactions) >= 3:
                        break
                result["top_interactions"] = top_interactions
            except Exception:
                pass

        logger.info("SHAP analysis for %s: top features = %s", model_name, result["top_features"])
        return result
    except Exception as e:
        logger.warning("SHAP analysis failed for %s: %s", model_name, e)
        return {}


def _walk_forward_validation(
    X: pd.DataFrame, y: pd.Series, model_factory, n_splits: int = 5,
    min_train_size: int = 50, purge_gap: int = 2,
) -> Dict[str, Any]:
    """Walk-forward validation with expanding window and purge gap.

    Unlike TimeSeriesSplit, this uses an expanding training window and enforces
    a purge gap (number of rows skipped between train and test) to prevent
    information leakage from sequential trades.

    Returns dict with per-fold metrics and aggregated statistics.
    """
    n = len(X)
    if n < min_train_size + 10:
        return {}

    # Expanding window: folds advance forward through time
    test_region = n - min_train_size - purge_gap
    if test_region < 10:
        return {}
    fold_size = max(10, test_region // n_splits)
    results = []

    for fold in range(n_splits):
        test_start = min_train_size + purge_gap + fold * fold_size
        test_end = min(test_start + fold_size, n)
        train_end = test_start - purge_gap  # purge gap: skip rows between train and test

        X_train = X.iloc[:train_end]
        y_train = y.iloc[:train_end]
        X_test = X.iloc[test_start:test_end]
        y_test = y.iloc[test_start:test_end]

        if len(X_train) < min_train_size or len(X_test) < 5:
            continue

        try:
            model = model_factory()
            model.fit(X_train, y_train)

            fold_metrics = {"fold": fold, "train_size": len(X_train), "test_size": len(X_test)}

            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(X_test)[:, 1]
                try:
                    fold_metrics["auc"] = float(roc_auc_score(y_test, proba))
                except ValueError:
                    # Single class in y_test (e.g. small fold); use neutral AUC
                    fold_metrics["auc"] = 0.5
                fold_metrics["accuracy"] = float(accuracy_score(y_test, (proba >= 0.5).astype(int)))
            else:
                pred = model.predict(X_test)
                fold_metrics["mae"] = float(mean_absolute_error(y_test, pred))

            results.append(fold_metrics)
        except Exception as e:
            logger.debug("Walk-forward fold %d failed: %s", fold, e)

    if not results:
        return {}

    # Aggregate
    agg: Dict[str, Any] = {"n_folds": len(results), "folds": results}
    if "auc" in results[0]:
        aucs = [r["auc"] for r in results]
        agg["mean_auc"] = round(float(np.mean(aucs)), 4)
        agg["std_auc"] = round(float(np.std(aucs)), 4)
    if "mae" in results[0]:
        maes = [r["mae"] for r in results]
        agg["mean_mae"] = round(float(np.mean(maes)), 4)
        agg["std_mae"] = round(float(np.std(maes)), 4)
    if "accuracy" in results[0]:
        accs = [r["accuracy"] for r in results]
        agg["mean_accuracy"] = round(float(np.mean(accs)), 4)

    logger.info("Walk-forward validation: %d folds, %s",
                len(results),
                ", ".join(f"{k}={v}" for k, v in agg.items() if k not in ("folds", "n_folds")))
    return agg


def _tune_signal_quality_optuna(X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None, n_trials: int = 50) -> xgb.XGBClassifier:
    """Bayesian hyperparameter tuning via Optuna with TimeSeriesSplit. Returns best estimator."""
    pos_count = int(np.sum(y))
    scale_pos_weight = (len(y) - pos_count) / pos_count if pos_count > 0 else 1.0
    tscv = TimeSeriesSplit(n_splits=3)

    def objective(trial):
        params = {
            "max_depth": trial.suggest_int("max_depth", 2, 7),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
            "n_estimators": trial.suggest_int("n_estimators", 100, 400, step=50),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "gamma": trial.suggest_float("gamma", 0.0, 5.0),
        }
        model = xgb.XGBClassifier(
            objective="binary:logistic", eval_metric="auc", random_state=42,
            tree_method="hist", scale_pos_weight=scale_pos_weight, **params,
        )
        scores = cross_val_score(model, X, y, cv=tscv, scoring="roc_auc",
                                 fit_params={"sample_weight": sample_weight} if sample_weight is not None else {})
        return scores.mean()

    study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best = study.best_params
    logger.info("Optuna Signal Quality - best CV AUC: %.3f (params: %s)", study.best_value, best)

    final = xgb.XGBClassifier(
        objective="binary:logistic", eval_metric="auc", random_state=42,
        tree_method="hist", scale_pos_weight=scale_pos_weight, **best,
    )
    final.fit(X, y, sample_weight=sample_weight)
    return final


def _tune_signal_quality(X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None) -> xgb.XGBClassifier:
    """Hyperparameter tuning: Optuna (if available) or GridSearchCV fallback."""
    if OPTUNA_AVAILABLE:
        return _tune_signal_quality_optuna(X, y, sample_weight)

    # Fallback: GridSearchCV
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
    search = GridSearchCV(base, param_grid, cv=tscv, scoring="roc_auc", n_jobs=_get_train_n_jobs(), verbose=0)
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
    """Hyperparameter tuning for position sizing: Optuna (if available) or GridSearchCV fallback."""
    if OPTUNA_AVAILABLE:
        tscv = TimeSeriesSplit(n_splits=3)

        def objective(trial):
            params = {
                "max_depth": trial.suggest_int("max_depth", 2, 7),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
                "n_estimators": trial.suggest_int("n_estimators", 100, 400, step=50),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
                "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
                "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            }
            model = xgb.XGBRegressor(objective="reg:squarederror", random_state=42, tree_method="hist", **params)
            scores = cross_val_score(model, X, y, cv=tscv, scoring="neg_mean_absolute_error",
                                     fit_params={"sample_weight": sample_weight} if sample_weight is not None else {})
            return scores.mean()

        study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
        study.optimize(objective, n_trials=50, show_progress_bar=False)
        logger.info("Optuna Position Sizing - best CV MAE: %.3f (params: %s)", -study.best_value, study.best_params)
        final = xgb.XGBRegressor(objective="reg:squarederror", random_state=42, tree_method="hist", **study.best_params)
        final.fit(X, y, sample_weight=sample_weight)
        return final

    # Fallback: GridSearchCV
    param_grid = {"max_depth": [3, 4, 5], "learning_rate": [0.03, 0.05, 0.07], "n_estimators": [150, 200]}
    base = xgb.XGBRegressor(objective="reg:squarederror", random_state=42, tree_method="hist", subsample=0.8, colsample_bytree=0.8)
    search = GridSearchCV(base, param_grid, cv=TimeSeriesSplit(n_splits=3), scoring="neg_mean_absolute_error", n_jobs=_get_train_n_jobs(), verbose=0)
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


def _tune_tp_optimizer(X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None, n_trials: int = 50) -> xgb.XGBClassifier:
    """Bayesian hyperparameter tuning for TP optimizer via Optuna or GridSearchCV fallback."""
    n_class = int(y.nunique())
    if OPTUNA_AVAILABLE:
        tscv = TimeSeriesSplit(n_splits=3)

        def objective(trial):
            params = {
                "max_depth": trial.suggest_int("max_depth", 2, 7),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
                "n_estimators": trial.suggest_int("n_estimators", 100, 400, step=50),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
                "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
                "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            }
            model = xgb.XGBClassifier(
                objective="multi:softprob", num_class=max(n_class, 2), eval_metric="mlogloss",
                random_state=42, tree_method="hist", **params,
            )
            scores = cross_val_score(model, X, y, cv=tscv, scoring="accuracy",
                                     fit_params={"sample_weight": sample_weight} if sample_weight is not None else {})
            return scores.mean()

        study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
        logger.info("Optuna TP Optimizer - best CV accuracy: %.3f (params: %s)", study.best_value, study.best_params)
        final = xgb.XGBClassifier(
            objective="multi:softprob", num_class=max(n_class, 2), eval_metric="mlogloss",
            random_state=42, tree_method="hist", **study.best_params,
        )
        final.fit(X, y, sample_weight=sample_weight)
        return final

    # Fallback: GridSearchCV
    param_grid = {"max_depth": [3, 4, 5], "learning_rate": [0.03, 0.05, 0.07], "n_estimators": [150, 200]}
    base = xgb.XGBClassifier(
        objective="multi:softprob", num_class=max(n_class, 2), eval_metric="mlogloss",
        random_state=42, tree_method="hist", subsample=0.8, colsample_bytree=0.8,
    )
    search = GridSearchCV(base, param_grid, cv=TimeSeriesSplit(n_splits=3), scoring="accuracy", n_jobs=_get_train_n_jobs(), verbose=0)
    if sample_weight is not None:
        search.fit(X, y, sample_weight=sample_weight)
    else:
        search.fit(X, y)
    logger.info("TP Optimizer - best CV accuracy: %.3f (params: %s)", search.best_score_, search.best_params_)
    return search.best_estimator_


def _tune_sl_optimizer(X: pd.DataFrame, y: pd.Series, sample_weight: np.ndarray | None, n_trials: int = 50) -> xgb.XGBRegressor:
    """Bayesian hyperparameter tuning for SL optimizer via Optuna or GridSearchCV fallback."""
    if OPTUNA_AVAILABLE:
        tscv = TimeSeriesSplit(n_splits=3)

        def objective(trial):
            params = {
                "max_depth": trial.suggest_int("max_depth", 2, 7),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.15, log=True),
                "n_estimators": trial.suggest_int("n_estimators", 100, 400, step=50),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
                "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
                "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            }
            model = xgb.XGBRegressor(
                objective="reg:quantileerror", quantile_alpha=0.95,
                random_state=42, tree_method="hist", **params,
            )
            scores = cross_val_score(model, X, y, cv=tscv, scoring="neg_mean_absolute_error",
                                     fit_params={"sample_weight": sample_weight} if sample_weight is not None else {})
            return scores.mean()

        study = optuna.create_study(direction="maximize", sampler=optuna.samplers.TPESampler(seed=42))
        study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
        logger.info("Optuna SL Optimizer - best CV MAE: %.3f (params: %s)", -study.best_value, study.best_params)
        final = xgb.XGBRegressor(
            objective="reg:quantileerror", quantile_alpha=0.95,
            random_state=42, tree_method="hist", **study.best_params,
        )
        final.fit(X, y, sample_weight=sample_weight)
        return final

    # Fallback: GridSearchCV
    param_grid = {"max_depth": [3, 4, 5], "learning_rate": [0.03, 0.05, 0.07], "n_estimators": [150, 200]}
    base = xgb.XGBRegressor(
        objective="reg:quantileerror", quantile_alpha=0.95,
        random_state=42, tree_method="hist", subsample=0.8, colsample_bytree=0.8,
    )
    search = GridSearchCV(base, param_grid, cv=TimeSeriesSplit(n_splits=3), scoring="neg_mean_absolute_error", n_jobs=_get_train_n_jobs(), verbose=0)
    if sample_weight is not None:
        search.fit(X, y, sample_weight=sample_weight)
    else:
        search.fit(X, y)
    logger.info("SL Optimizer - best CV MAE: %.3f (params: %s)", -search.best_score_, search.best_params_)
    return search.best_estimator_


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


def save_feature_manifest(feature_names: List[str], output_path: str, model_name: str) -> None:
    """Save ordered feature name manifest alongside the ONNX model.

    This ensures inference uses the exact same column order as training.
    The manifest maps index → feature name (f0 → market_priceChange24h, etc.).
    """
    manifest = {"model": model_name, "features": feature_names, "n_features": len(feature_names)}
    try:
        with open(output_path, "w") as f:
            json.dump(manifest, f, indent=2)
        logger.info("Saved feature manifest for %s (%d features): %s", model_name, len(feature_names), output_path)
    except Exception as e:
        logger.warning("Failed to save feature manifest for %s: %s", model_name, e)


def compute_onnx_hash(onnx_path: str) -> str | None:
    """Compute SHA-256 hash of an ONNX file for versioning/integrity checks."""
    try:
        h = hashlib.sha256()
        with open(onnx_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None


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
    {"name": "WTT alignment", "description": "Thesis alignment from WTT rubric (1-5).", "hint": "wtt_alignment"},
    {"name": "WTT edge", "description": "Edge level from WTT rubric (1-4).", "hint": "wtt_edge"},
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
    if "wtt_primary" in df.columns:
        wtt_trades = df[df["wtt_primary"] == 1]
        if len(wtt_trades) >= 5:
            wtt_win_rate = wtt_trades["label_profitable"].mean() * 100
            non_wtt = df[df["wtt_primary"] != 1]
            non_wtt_wr = non_wtt["label_profitable"].mean() * 100 if len(non_wtt) > 0 else 0
            report["wtt_performance"] = {
                "wtt_trades": len(wtt_trades),
                "wtt_win_rate": round(wtt_win_rate, 1),
                "non_wtt_win_rate": round(non_wtt_wr, 1),
                "delta": round(wtt_win_rate - non_wtt_wr, 1),
            }
            for dim in ["wtt_alignment", "wtt_edge", "wtt_payoffShape", "wtt_timingForgiveness"]:
                if dim in wtt_trades.columns:
                    corr = wtt_trades[dim].corr(wtt_trades["label_profitable"].astype(float))
                    report["wtt_performance"][f"{dim}_corr"] = round(corr, 3)
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
    lines = [
        "# Parameter Improvement Report",
        "",
        "Use this report to see which parameters and weights to improve.",
        "",
        "**Note:** All PnL and win/loss metrics in this report are **net of round-trip trading fees** (0.05% of notional).",
        "",
    ]
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

    # SHAP analysis
    for model_name, data in (report.get("feature_importances") or {}).items():
        shap_data = data.get("shap") if isinstance(data, dict) else None
        if shap_data and shap_data.get("shap_importance"):
            lines.append(f"## SHAP feature importance ({model_name})")
            lines.append("")
            lines.append("SHAP values show the average impact of each feature on model predictions (more reliable than gain-based importance).")
            lines.append("")
            for feat, score in list(shap_data["shap_importance"].items())[:10]:
                lines.append(f"- `{feat}`: {score:.5f}")
            if shap_data.get("top_interactions"):
                lines.append("")
                lines.append("**Top feature interactions:** " + ", ".join(shap_data["top_interactions"]))
            lines.append("")

    # Walk-forward validation
    for model_name, data in (report.get("feature_importances") or {}).items():
        wf = data.get("walk_forward") if isinstance(data, dict) else None
        if wf:
            lines.append(f"## Walk-forward validation ({model_name})")
            lines.append("")
            lines.append(f"Expanding-window validation with purge gap ({wf.get('n_folds', 0)} folds):")
            lines.append("")
            for k, v in wf.items():
                if k not in ("folds", "n_folds"):
                    lines.append(f"- **{k}**: {v}")
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

def _train_single_model(
    name: str, df: pd.DataFrame, args: argparse.Namespace,
    output_dir: Path,
) -> Tuple[str, Dict[str, Any] | None]:
    """Train a single model (designed to run in parallel). Returns (name, improvement_entry) or (name, None) on skip/error."""
    try:
        # Prepare features
        if name == "signal_quality":
            X, y = prepare_signal_quality_features(df)
            label_filter = "label_profitable"
        elif name == "position_sizing":
            X, y = prepare_position_sizing_features(df)
            label_filter = "label_rMultiple"
        elif name == "tp_optimizer":
            X, y = prepare_tp_features(df)
            label_filter = "label_optimalTpLevel"
        elif name == "sl_optimizer":
            X, y = prepare_sl_features(df)
            label_filter = "label_maxAdverseExcursion"
        else:
            return name, None

        if X.empty or len(X) < args.min_samples:
            logger.info("Skipping %s - insufficient samples (%d)", name, len(X))
            return name, None

        logger.info("=" * 40)
        logger.info("Training %s (%d samples, %d features)", name, len(X), X.shape[1])
        logger.info("=" * 40)

        # Sample weights
        df_sub = df[df[label_filter].notna()].copy()
        w = _compute_sample_weights(
            len(X),
            df_sub["asset"] if "asset" in df_sub.columns else None,
            args.recency_decay,
            args.balance_assets,
        ) if (args.recency_decay > 0 or args.balance_assets) else None

        # Train or tune
        tune = getattr(args, "tune_hyperparams", False)
        if name == "signal_quality":
            model = _tune_signal_quality(X, y, w) if tune else train_signal_quality_model(X, y, sample_weight=w)
        elif name == "position_sizing":
            model = _tune_position_sizing(X, y, w) if tune else train_position_sizing_model(X, y, sample_weight=w)
        elif name == "tp_optimizer":
            model = _tune_tp_optimizer(X, y, w) if tune else train_tp_optimizer_model(X, y, sample_weight=w)
        elif name == "sl_optimizer":
            model = _tune_sl_optimizer(X, y, w) if tune else train_sl_optimizer_model(X, y, sample_weight=w)

        entry: Dict[str, Any] = {
            "feature_importances": dict(zip(X.columns.tolist(), [float(x) for x in model.feature_importances_])),
            "feature_names": X.columns.tolist(),
        }

        # Export ONNX + feature manifest + hash
        onnx_path = str(output_dir / f"{name}.onnx")
        onnx_ok = export_to_onnx(model, X.iloc[:1], onnx_path, name)
        entry["onnx_exported"] = onnx_ok
        if onnx_ok:
            save_feature_manifest(X.columns.tolist(), str(output_dir / f"{name}_features.json"), name)
            onnx_hash = compute_onnx_hash(onnx_path)
            if onnx_hash:
                entry["onnx_sha256"] = onnx_hash
        save_joblib_backup(model, str(output_dir / f"{name}.joblib"), name)

        # Model factory for holdout (trains fresh model on train split — no leakage)
        def _make_model_factory():
            """Create a factory that produces an untrained model with same hyperparams."""
            params = model.get_params()
            cls = type(model)
            def factory():
                return cls(**params)
            return factory

        factory = _make_model_factory()

        # Holdout metrics (fresh model on train split only — no leakage)
        entry["holdout_metrics"] = _holdout_metrics(factory, X, y, name, sample_weight=w)

        # SHAP analysis
        shap_result = _shap_analysis(model, X, name)
        if shap_result:
            entry["shap"] = shap_result

        # Walk-forward validation
        wf = _walk_forward_validation(X, y, factory)
        if wf:
            entry["walk_forward"] = wf

        # Signal quality extras
        if name == "signal_quality":
            entry["suggested_threshold"] = _suggest_signal_quality_threshold(model, X, y)
            calibration = _platt_calibration(model, X, y)
            if calibration:
                entry["signal_quality_calibration"] = calibration
                logger.info("Platt calibration: scale=%.4f, intercept=%.4f", calibration["scale"], calibration["intercept"])

        return name, entry

    except Exception as e:
        logger.error("Error training %s: %s", name, e, exc_info=True)
        return name, None


def main():
    parser = argparse.ArgumentParser(description="Train VINCE ML models")
    parser.add_argument("--data", type=str, required=True, help="Path to features.jsonl or directory of features_*.jsonl (e.g. .elizadb/vince-paper-bot/features)")
    parser.add_argument("--output", type=str, default="./models", help="Output directory for models")
    parser.add_argument("--min-samples", type=int, default=90, help="Minimum trades with outcome required to train (default 90)")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging to train.log")
    parser.add_argument("--recency-decay", type=float, default=0.0, help="Recency sample weight decay (e.g. 0.01 upweights recent rows); 0 = off")
    parser.add_argument("--balance-assets", action="store_true", help="Balance sample weights by asset so one symbol does not dominate")
    parser.add_argument("--tune-hyperparams", action="store_true", help="Run hyperparameter tuning: Optuna (if installed) or GridSearchCV fallback with TimeSeriesSplit (slower)")
    parser.add_argument("--optuna-trials", type=int, default=50, help="Number of Optuna trials when --tune-hyperparams is used (default 50)")
    parser.add_argument("--real-only", dest="real_only", action="store_true", help="Load only features_*.jsonl and combined.jsonl; exclude synthetic_*.jsonl (use for production when you have enough real trades)")
    parser.add_argument("--parallel", action="store_true", help="Train models in parallel using concurrent.futures (faster on multi-core)")
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

    # Add lag features (temporal context from prior trades)
    df = add_lag_features(df)

    model_names = ["signal_quality", "position_sizing", "tp_optimizer", "sl_optimizer"]
    improvement_entries: Dict[str, Dict[str, Any]] = {}

    # Train all 4 models (optionally in parallel)
    if getattr(args, "parallel", False):
        logger.info("Training models in parallel...")
        with concurrent.futures.ProcessPoolExecutor(max_workers=4) as pool:
            futures = {
                pool.submit(_train_single_model, name, df, args, output_dir): name
                for name in model_names
            }
            for future in concurrent.futures.as_completed(futures):
                name, entry = future.result()
                if entry is not None:
                    improvement_entries[name] = entry
    else:
        for name in model_names:
            _, entry = _train_single_model(name, df, args, output_dir)
            if entry is not None:
                improvement_entries[name] = entry

    # Collect results
    models_fit = [n for n in model_names if n in improvement_entries]
    models_trained = [n for n in models_fit if improvement_entries[n].get("onnx_exported")]

    improvement_report = build_improvement_report(df, improvement_entries) if improvement_entries else {}
    if improvement_entries.get("signal_quality", {}).get("signal_quality_calibration"):
        improvement_report["signal_quality_calibration"] = improvement_entries["signal_quality"]["signal_quality_calibration"]

    # Metadata with ONNX hashes for versioning
    onnx_hashes = {n: e["onnx_sha256"] for n, e in improvement_entries.items() if e.get("onnx_sha256")}
    metadata = {
        "trained_at": datetime.now().isoformat(),
        "data_file": args.data,
        "total_records": int(len(df)),
        "trades_with_outcomes": trades_with_outcome,
        "models_trained": models_trained,
        "models_fit": models_fit,
        "onnx_hashes": onnx_hashes,
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
    logger.info("Models fit: %s", ", ".join(models_fit))
    logger.info("Models exported (ONNX): %s", ", ".join(models_trained) or "none")
    if onnx_hashes:
        for n, h in onnx_hashes.items():
            logger.info("  %s.onnx SHA-256: %s", n, h[:16] + "...")
    if improvement_report.get("action_items"):
        logger.info("Improvement report: %s", output_dir / "improvement_report.md")
    logger.info("Log file: %s", output_dir / "train.log")
    logger.info("Next: copy .onnx to .elizadb/vince-paper-bot/models/ and restart the agent")


if __name__ == '__main__':
    main()
