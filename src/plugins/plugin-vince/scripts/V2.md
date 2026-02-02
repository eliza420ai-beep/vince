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
    
Requirements:
    pip install xgboost scikit-learn pandas numpy onnx skl2onnx scipy joblib
"""

import argparse
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    roc_auc_score,
)

try:
    import xgboost as xgb
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    import onnx
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logging.warning("ONNX export not available. Install: pip install xgboost scikit-learn onnx skl2onnx")


# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==========================================
# Feature Engineering
# ==========================================

def load_features(filepath: str) -> pd.DataFrame:
    """Load feature records from JSONL file exported by FeatureStore."""
    records = []
    with open(filepath, 'r') as f:
        for line in f:
            try:
                records.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                logger.warning(f"Skipping invalid JSON line in {filepath}")
    
    logger.info(f"Loaded {len(records)} records from {filepath}")
    
    # Flatten nested structure with robust handling
    flat_records = []
    for r in records:
        flat = {
            'id': r.get('id'),
            'timestamp': r.get('timestamp'),
            'asset': r.get('asset'),
        }
        
        # Market features
        for k, v in r.get('market', {}).items():
            flat[f'market_{k}'] = v
        
        # Session features
        for k, v in r.get('session', {}).items():
            flat[f'session_{k}'] = v
        
        # Signal features
        signal = r.get('signal', {})
        for k, v in signal.items():
            if k != 'sources':
                flat[f'signal_{k}'] = v
        sources = signal.get('sources', [])
        flat['signal_source_count'] = len(sources)
        # Extract more from sources if possible (assume sources have 'sentiment' or 'strength')
        if sources and isinstance(sources[0], dict):
            sentiments = [s.get('sentiment', 0) for s in sources if 'sentiment' in s]
            flat['signal_avg_sentiment'] = np.mean(sentiments) if sentiments else 0.0
        
        # Regime features
        for k, v in r.get('regime', {}).items():
            flat[f'regime_{k}'] = v
        
        # News features
        news = r.get('news', {})
        for k, v in news.items():
            if not isinstance(v, list):
                flat[f'news_{k}'] = v
        # If news is list, extract aggregates
        if isinstance(news, list) and news:
            sentiments = [n.get('sentiment', 0) for n in news if isinstance(n, dict) and 'sentiment' in n]
            flat['news_avg_sentiment'] = np.mean(sentiments) if sentiments else 0.0
        
        # Execution features
        execution = r.get('execution', {})
        if execution:
            for k, v in execution.items():
                if not isinstance(v, list):
                    flat[f'exec_{k}'] = v
        
        # Outcome features (labels)
        outcome = r.get('outcome', {})
        if outcome:
            for k, v in outcome.items():
                flat[f'outcome_{k}'] = v
        
        # Labels
        labels = r.get('labels', {})
        if labels:
            for k, v in labels.items():
                flat[f'label_{k}'] = v
        
        flat_records.append(flat)
    
    df = pd.DataFrame(flat_records)
    logger.info(f"DataFrame shape: {df.shape}")
    
    # Sort by timestamp to ensure time order
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        df = df.sort_values('timestamp').reset_index(drop=True)
    
    return df


def detect_and_handle_outliers(df: pd.DataFrame, z_thresh: float = 3.0) -> pd.DataFrame:
    """Detect and clip outliers using z-score."""
    numeric_cols = df.select_dtypes(include=['float64', 'float32']).columns
    for col in numeric_cols:
        z_scores = np.abs(stats.zscore(df[col].fillna(0)))
        outliers = z_scores > z_thresh
        if outliers.any():
            logger.info(f"Clipping {outliers.sum()} outliers in {col}")
            df.loc[outliers, col] = np.sign(df.loc[outliers, col]) * df[col].abs().quantile(0.99)
    return df


def prepare_signal_quality_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for signal quality prediction."""
    df_trades = df[df['label_profitable'].notna()].copy()
    df_trades = detect_and_handle_outliers(df_trades)
    
    # Feature columns (added signal_avg_sentiment if available)
    feature_cols = [
        'market_priceChange24h', 'market_volumeRatio', 'market_fundingPercentile',
        'market_longShortRatio', 'signal_strength', 'signal_confidence',
        'signal_source_count', 'signal_hasCascadeSignal', 'signal_hasFundingExtreme',
        'signal_hasWhaleSignal', 'session_isWeekend', 'session_isOpenWindow',
        'session_utcHour',
    ]
    if 'signal_avg_sentiment' in df_trades.columns:
        feature_cols.append('signal_avg_sentiment')
    
    # Add regime features if available
    if 'regime_volatilityRegime' in df_trades.columns:
        df_trades['regime_volatility_high'] = (df_trades['regime_volatilityRegime'] == 'high').astype(int)
        feature_cols.append('regime_volatility_high')
    
    if 'regime_marketRegime' in df_trades.columns:
        df_trades['regime_bullish'] = (df_trades['regime_marketRegime'] == 'bullish').astype(int)
        df_trades['regime_bearish'] = (df_trades['regime_marketRegime'] == 'bearish').astype(int)
        feature_cols.extend(['regime_bullish', 'regime_bearish'])
    
    # Add asset encoding if multiple assets
    if 'asset' in df_trades.columns and df_trades['asset'].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades['asset'], prefix='asset')
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns)
    
    # Keep only available columns
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    
    X = df_trades[available_cols].copy()
    y = df_trades['label_profitable'].astype(int)
    
    # Fill missing values
    X = X.fillna(0)
    
    # Normalize features (optional for trees, but can help)
    scaler = StandardScaler()
    X[X.select_dtypes(include=['float64', 'float32']).columns] = scaler.fit_transform(
        X.select_dtypes(include=['float64', 'float32'])
    )
    
    logger.info(f"Signal quality features: {X.shape}, positive rate: {y.mean():.2%}")
    return X, y


def prepare_position_sizing_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for position sizing prediction."""
    df_trades = df[df['label_rMultiple'].notna()].copy()
    df_trades = detect_and_handle_outliers(df_trades)
    
    feature_cols = [
        'signal_strength', 'signal_confidence', 'signal_source_count',
        'session_isWeekend', 'exec_streakMultiplier',
    ]
    if 'signal_avg_sentiment' in df_trades.columns:
        feature_cols.append('signal_avg_sentiment')
    
    if 'regime_volatilityRegime' in df_trades.columns:
        df_trades['volatility_level'] = df_trades['regime_volatilityRegime'].map(
            {'low': 0, 'normal': 1, 'high': 2}
        ).fillna(1)
        feature_cols.append('volatility_level')
    
    # Add asset encoding
    if 'asset' in df_trades.columns and df_trades['asset'].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades['asset'], prefix='asset')
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns)
    
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    
    X = df_trades[available_cols].copy()
    y = df_trades['label_rMultiple'].clip(-2, 3)  # Clip outliers
    
    X = X.fillna(0)
    
    scaler = StandardScaler()
    X[X.select_dtypes(include=['float64', 'float32']).columns] = scaler.fit_transform(
        X.select_dtypes(include=['float64', 'float32'])
    )
    
    logger.info(f"Position sizing features: {X.shape}, target mean: {y.mean():.2f}")
    return X, y


def prepare_tp_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for take-profit optimization."""
    df_trades = df[df['label_optimalTpLevel'].notna()].copy()
    df_trades = detect_and_handle_outliers(df_trades)
    
    feature_cols = [
        'signal_direction', 'market_atrPct', 'signal_strength', 'signal_confidence',
    ]
    if 'signal_avg_sentiment' in df_trades.columns:
        feature_cols.append('signal_avg_sentiment')
    
    # Encode direction
    df_trades['signal_direction_num'] = (df_trades['signal_direction'] == 'long').astype(int)
    feature_cols.append('signal_direction_num')
    
    if 'regime_volatilityRegime' in df_trades.columns:
        df_trades['volatility_level'] = df_trades['regime_volatilityRegime'].map(
            {'low': 0, 'normal': 1, 'high': 2}
        ).fillna(1)
        feature_cols.append('volatility_level')
    
    if 'regime_marketRegime' in df_trades.columns:
        df_trades['market_regime_num'] = df_trades['regime_marketRegime'].map(
            {'bearish': -1, 'neutral': 0, 'bullish': 1}
        ).fillna(0)
        feature_cols.append('market_regime_num')
    
    # Add asset encoding
    if 'asset' in df_trades.columns and df_trades['asset'].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades['asset'], prefix='asset')
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns)
    
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    
    X = df_trades[available_cols].copy()
    y = df_trades['label_optimalTpLevel'].astype(int)
    
    X = X.fillna(0)
    
    scaler = StandardScaler()
    X[X.select_dtypes(include=['float64', 'float32']).columns] = scaler.fit_transform(
        X.select_dtypes(include=['float64', 'float32'])
    )
    
    logger.info(f"TP features: {X.shape}, TP level distribution: {y.value_counts().to_dict()}")
    return X, y


def prepare_sl_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for stop-loss optimization (max adverse excursion)."""
    # Assume label_maxAdverseExcursion exists (e.g., max drawdown in % or multiples)
    df_trades = df[df['label_maxAdverseExcursion'].notna()].copy()
    df_trades = detect_and_handle_outliers(df_trades)
    
    feature_cols = [
        'signal_direction', 'market_atrPct', 'signal_strength', 'signal_confidence',
        'market_volatility',  # Assume available or similar
    ]
    if 'signal_avg_sentiment' in df_trades.columns:
        feature_cols.append('signal_avg_sentiment')
    
    # Encode direction
    df_trades['signal_direction_num'] = (df_trades['signal_direction'] == 'long').astype(int)
    feature_cols.append('signal_direction_num')
    
    if 'regime_volatilityRegime' in df_trades.columns:
        df_trades['volatility_level'] = df_trades['regime_volatilityRegime'].map(
            {'low': 0, 'normal': 1, 'high': 2}
        ).fillna(1)
        feature_cols.append('volatility_level')
    
    if 'regime_marketRegime' in df_trades.columns:
        df_trades['market_regime_num'] = df_trades['regime_marketRegime'].map(
            {'bearish': -1, 'neutral': 0, 'bullish': 1}
        ).fillna(0)
        feature_cols.append('market_regime_num')
    
    # Add asset encoding
    if 'asset' in df_trades.columns and df_trades['asset'].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades['asset'], prefix='asset')
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns)
    
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    
    X = df_trades[available_cols].copy()
    y = df_trades['label_maxAdverseExcursion'].clip(0, 5)  # Clip to reasonable range, assume positive values
    
    X = X.fillna(0)
    
    scaler = StandardScaler()
    X[X.select_dtypes(include=['float64', 'float32']).columns] = scaler.fit_transform(
        X.select_dtypes(include=['float64', 'float32'])
    )
    
    logger.info(f"SL features: {X.shape}, target mean: {y.mean():.2f}")
    return X, y


# ==========================================
# Model Training
# ==========================================

def train_signal_quality_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBClassifier:
    """Train signal quality classifier with hyperparam tuning."""
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [3, 4, 5],
        'learning_rate': [0.01, 0.1, 0.2],
    }
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='auc',
        random_state=42,
        tree_method='hist',  # Faster, GPU if available
        enable_categorical=True,
    )
    
    tscv = TimeSeriesSplit(n_splits=5)
    grid_search = GridSearchCV(model, param_grid, cv=tscv, scoring='roc_auc', n_jobs=-1)
    grid_search.fit(X, y)
    
    best_model = grid_search.best_estimator_
    logger.info(f"Signal Quality Model - Best params: {grid_search.best_params_}")
    logger.info(f"CV AUC: {grid_search.best_score_:.3f}")
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': X.columns,
        'importance': best_model.feature_importances_
    }).sort_values('importance', ascending=False)
    logger.info("\nTop 5 features:")
    logger.info(importance.head())
    
    return best_model


def train_position_sizing_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBRegressor:
    """Train position sizing regressor with hyperparam tuning."""
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [3, 4, 5],
        'learning_rate': [0.01, 0.1, 0.2],
    }
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        random_state=42,
        tree_method='hist',
        enable_categorical=True,
    )
    
    tscv = TimeSeriesSplit(n_splits=5)
    grid_search = GridSearchCV(model, param_grid, cv=tscv, scoring='neg_mean_absolute_error', n_jobs=-1)
    grid_search.fit(X, y)
    
    best_model = grid_search.best_estimator_
    logger.info(f"Position Sizing Model - Best params: {grid_search.best_params_}")
    logger.info(f"CV MAE: {-grid_search.best_score_:.3f}")
    
    return best_model


def train_tp_optimizer_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBClassifier:
    """Train take-profit optimizer (multi-class) with hyperparam tuning."""
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [3, 4, 5],
        'learning_rate': [0.01, 0.1, 0.2],
    }
    model = xgb.XGBClassifier(
        objective='multi:softprob',
        num_class=4,  # 0, 1, 2, 3 TP levels
        random_state=42,
        tree_method='hist',
        enable_categorical=True,
    )
    
    tscv = TimeSeriesSplit(n_splits=5)
    grid_search = GridSearchCV(model, param_grid, cv=tscv, scoring='accuracy', n_jobs=-1)
    grid_search.fit(X, y)
    
    best_model = grid_search.best_estimator_
    logger.info(f"TP Optimizer Model - Best params: {grid_search.best_params_}")
    logger.info(f"CV Accuracy: {grid_search.best_score_:.3f}")
    
    return best_model


def train_sl_optimizer_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBRegressor:
    """Train stop-loss optimizer using quantile regression."""
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [3, 4, 5],
        'learning_rate': [0.01, 0.1, 0.2],
    }
    model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.95,  # 95th percentile for conservative SL
        random_state=42,
        tree_method='hist',
        enable_categorical=True,
    )
    
    tscv = TimeSeriesSplit(n_splits=5)
    grid_search = GridSearchCV(model, param_grid, cv=tscv, scoring='neg_mean_absolute_error', n_jobs=-1)
    grid_search.fit(X, y)
    
    best_model = grid_search.best_estimator_
    logger.info(f"SL Optimizer Model - Best params: {grid_search.best_params_}")
    logger.info(f"CV MAE: {-grid_search.best_score_:.3f}")
    
    return best_model


# ==========================================
# ONNX Export
# ==========================================

def export_to_onnx(model: Any, X_sample: pd.DataFrame, output_path: str, model_name: str) -> bool:
    """Export xgboost model to ONNX format."""
    if not ONNX_AVAILABLE:
        logger.warning(f"Skipping ONNX export for {model_name} - ONNX not available")
        return False
    
    try:
        initial_type = [('float_input', FloatTensorType([None, X_sample.shape[1]]))]
        onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=12)
        onnx.save_model(onnx_model, output_path)
        logger.info(f"Exported {model_name} to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to export {model_name}: {e}")
        return False


# ==========================================
# Main Training Pipeline
# ==========================================

def main():
    parser = argparse.ArgumentParser(description='Train VINCE ML models')
    parser.add_argument('--data', type=str, required=True, 
                        help='Path to features.jsonl from FeatureStore')
    parser.add_argument('--output', type=str, default='./models',
                        help='Output directory for models')
    parser.add_argument('--min-samples', type=int, default=100,
                        help='Minimum samples required to train')
    args = parser.parse_args()
    
    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load data
    logger.info("=" * 60)
    logger.info("VINCE ML Model Training")
    logger.info(f"Data: {args.data}")
    logger.info(f"Output: {args.output}")
    logger.info("=" * 60)
    
    df = load_features(args.data)
    
    # Check minimum samples (use profitable for general check, but each model has own)
    trades_with_outcome = df['label_profitable'].notna().sum()
    if trades_with_outcome < args.min_samples:
        logger.warning(f"\nInsufficient data: {trades_with_outcome} trades with outcomes")
        logger.warning(f"Need at least {args.min_samples} trades to train models")
        logger.warning("Continue collecting data with the paper trading bot")
        return
    
    logger.info(f"\nTraining on {trades_with_outcome} completed trades")
    
    models_trained = []
    
    # Train Signal Quality Model
    logger.info("\n" + "=" * 40)
    logger.info("Training Signal Quality Model")
    logger.info("=" * 40)
    X_sq, y_sq = prepare_signal_quality_features(df)
    if len(X_sq) >= args.min_samples:
        model_sq = train_signal_quality_model(X_sq, y_sq)
        if export_to_onnx(model_sq, X_sq.iloc[:1], str(output_dir / 'signal_quality.onnx'), 'Signal Quality'):
            models_trained.append('signal_quality')
    else:
        logger.info("Skipping - insufficient samples")
    
    # Train Position Sizing Model
    logger.info("\n" + "=" * 40)
    logger.info("Training Position Sizing Model")
    logger.info("=" * 40)
    X_ps, y_ps = prepare_position_sizing_features(df)
    if len(X_ps) >= args.min_samples:
        model_ps = train_position_sizing_model(X_ps, y_ps)
        if export_to_onnx(model_ps, X_ps.iloc[:1], str(output_dir / 'position_sizing.onnx'), 'Position Sizing'):
            models_trained.append('position_sizing')
    else:
        logger.info("Skipping - insufficient samples")
    
    # Train TP Optimizer Model
    logger.info("\n" + "=" * 40)
    logger.info("Training TP Optimizer Model")
    logger.info("=" * 40)
    X_tp, y_tp = prepare_tp_features(df)
    if len(X_tp) >= args.min_samples:
        model_tp = train_tp_optimizer_model(X_tp, y_tp)
        if export_to_onnx(model_tp, X_tp.iloc[:1], str(output_dir / 'tp_optimizer.onnx'), 'TP Optimizer'):
            models_trained.append('tp_optimizer')
    else:
        logger.info("Skipping - insufficient samples")
    
    # Train SL Optimizer Model
    logger.info("\n" + "=" * 40)
    logger.info("Training SL Optimizer Model")
    logger.info("=" * 40)
    X_sl, y_sl = prepare_sl_features(df)
    if len(X_sl) >= args.min_samples:
        model_sl = train_sl_optimizer_model(X_sl, y_sl)
        if export_to_onnx(model_sl, X_sl.iloc[:1], str(output_dir / 'sl_optimizer.onnx'), 'SL Optimizer'):
            models_trained.append('sl_optimizer')
    else:
        logger.info("Skipping - insufficient samples")
    
    # Save training metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'data_file': args.data,
        'total_records': len(df),
        'trades_with_outcomes': trades_with_outcome,
        'models_trained': models_trained,
    }
    
    with open(output_dir / 'training_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info("\n" + "=" * 60)
    logger.info("Training Complete!")
    logger.info(f"Models exported to: {output_dir}")
    logger.info(f"Models trained: {', '.join(metadata['models_trained'])}")
    logger.info("=" * 60)
    logger.info("\nNext steps:")
    logger.info("1. Copy .onnx files to .elizadb/vince-paper-bot/models/")
    logger.info("2. Restart the agent to load the models")
    logger.info("3. The ML Inference Service will automatically use the trained models")


if __name__ == '__main__':
    main()