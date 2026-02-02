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
    python train_models.py --data ./features.json --output ./models/
    
Requirements:
    pip install xgboost scikit-learn pandas numpy onnx skl2onnx
"""

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit, cross_val_score
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
    print("Warning: ONNX export not available. Install: pip install xgboost scikit-learn onnx skl2onnx")


# ==========================================
# Feature Engineering
# ==========================================

def load_features(filepath: str) -> pd.DataFrame:
    """Load feature records from JSONL file(s) exported by FeatureStore (one JSON object per line)."""
    records = []
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"Warning: Skipping invalid JSON line: {e}")
    print(f"Loaded {len(records)} records from {filepath}")
    
    # Flatten nested structure
    flat_records = []
    for r in records:
        flat = {
            'id': r['id'],
            'timestamp': r['timestamp'],
            'asset': r['asset'],
        }
        
        # Market features
        if 'market' in r:
            for k, v in r['market'].items():
                flat[f'market_{k}'] = v
        
        # Session features
        if 'session' in r:
            for k, v in r['session'].items():
                flat[f'session_{k}'] = v
        
        # Signal features
        if 'signal' in r:
            for k, v in r['signal'].items():
                if k != 'sources':  # Skip array
                    flat[f'signal_{k}'] = v
            flat['signal_source_count'] = len(r['signal'].get('sources', []))
        
        # Regime features
        if 'regime' in r:
            for k, v in r['regime'].items():
                flat[f'regime_{k}'] = v
        
        # News features
        if 'news' in r:
            for k, v in r['news'].items():
                if not isinstance(v, list):  # Skip arrays
                    flat[f'news_{k}'] = v
        
        # Execution features
        if 'execution' in r and r['execution']:
            for k, v in r['execution'].items():
                if not isinstance(v, list):  # Skip arrays
                    flat[f'exec_{k}'] = v
        
        # Outcome features (labels)
        if 'outcome' in r and r['outcome']:
            for k, v in r['outcome'].items():
                flat[f'outcome_{k}'] = v
        
        # Labels
        if 'labels' in r and r['labels']:
            for k, v in r['labels'].items():
                flat[f'label_{k}'] = v
        
        # ML label: use labels.profitable or outcome.profitable when present
        if 'labels' in r and r['labels'] and 'profitable' in r['labels']:
            flat['label_profitable'] = r['labels']['profitable']
        elif 'outcome' in r and r['outcome'] and 'profitable' in r['outcome']:
            flat['label_profitable'] = r['outcome']['profitable']
        else:
            flat['label_profitable'] = None  # open or pre-close record

        flat_records.append(flat)
    
    df = pd.DataFrame(flat_records)
    print(f"DataFrame shape: {df.shape}")
    return df


def prepare_signal_quality_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for signal quality prediction."""
    # Filter to trades with outcomes
    df_trades = df[df['label_profitable'].notna()].copy()
    
    # Feature columns
    feature_cols = [
        'market_priceChange24h', 'market_volumeRatio', 'market_fundingPercentile',
        'market_longShortRatio', 'signal_strength', 'signal_confidence',
        'signal_source_count', 'signal_hasCascadeSignal', 'signal_hasFundingExtreme',
        'signal_hasWhaleSignal', 'session_isWeekend', 'session_isOpenWindow',
        'session_utcHour',
    ]
    
    # Add regime features if available
    if 'regime_volatilityRegime' in df_trades.columns:
        df_trades['regime_volatility_high'] = (df_trades['regime_volatilityRegime'] == 'high').astype(int)
        feature_cols.append('regime_volatility_high')
    
    if 'regime_marketRegime' in df_trades.columns:
        df_trades['regime_bullish'] = (df_trades['regime_marketRegime'] == 'bullish').astype(int)
        df_trades['regime_bearish'] = (df_trades['regime_marketRegime'] == 'bearish').astype(int)
        feature_cols.extend(['regime_bullish', 'regime_bearish'])
    
    # Keep only available columns
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    
    X = df_trades[available_cols].copy()
    y = df_trades['label_profitable'].astype(int)
    
    # Fill missing values
    X = X.fillna(0)
    
    # Normalize features
    for col in X.columns:
        if X[col].dtype in ['float64', 'float32']:
            X[col] = (X[col] - X[col].mean()) / (X[col].std() + 1e-8)
    
    print(f"Signal quality features: {X.shape}, positive rate: {y.mean():.2%}")
    return X, y


def prepare_position_sizing_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for position sizing prediction."""
    df_trades = df[df['label_rMultiple'].notna()].copy()
    
    feature_cols = [
        'signal_strength', 'signal_confidence', 'signal_source_count',
        'session_isWeekend', 'exec_streakMultiplier',
    ]
    
    if 'regime_volatilityRegime' in df_trades.columns:
        df_trades['volatility_level'] = df_trades['regime_volatilityRegime'].map(
            {'low': 0, 'normal': 1, 'high': 2}
        ).fillna(1)
        feature_cols.append('volatility_level')
    
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    
    X = df_trades[available_cols].copy()
    
    # Target: optimal position size based on outcome
    # Use R-multiple as proxy - higher R = should have sized bigger
    y = df_trades['label_rMultiple'].clip(-2, 3)  # Clip outliers
    
    X = X.fillna(0)
    
    print(f"Position sizing features: {X.shape}, target mean: {y.mean():.2f}")
    return X, y


def prepare_tp_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """Prepare features for take-profit optimization."""
    df_trades = df[df['label_optimalTpLevel'].notna()].copy()
    
    feature_cols = [
        'signal_direction', 'market_atrPct', 'signal_strength', 'signal_confidence',
    ]
    
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
    
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    
    X = df_trades[available_cols].copy()
    y = df_trades['label_optimalTpLevel'].astype(int)
    
    X = X.fillna(0)
    
    print(f"TP features: {X.shape}, TP level distribution: {y.value_counts().to_dict()}")
    return X, y


# ==========================================
# Model Training
# ==========================================

def train_signal_quality_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBClassifier:
    """Train signal quality classifier."""
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective='binary:logistic',
        eval_metric='auc',
        use_label_encoder=False,
        random_state=42,
    )
    
    # Time series cross-validation
    tscv = TimeSeriesSplit(n_splits=5)
    scores = cross_val_score(model, X, y, cv=tscv, scoring='roc_auc')
    print(f"Signal Quality Model - CV AUC: {scores.mean():.3f} (+/- {scores.std():.3f})")
    
    # Train on full data
    model.fit(X, y)
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print("\nTop 5 features:")
    print(importance.head())
    
    return model


def train_position_sizing_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBRegressor:
    """Train position sizing regressor."""
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective='reg:squarederror',
        random_state=42,
    )
    
    tscv = TimeSeriesSplit(n_splits=5)
    scores = cross_val_score(model, X, y, cv=tscv, scoring='neg_mean_absolute_error')
    print(f"Position Sizing Model - CV MAE: {-scores.mean():.3f} (+/- {scores.std():.3f})")
    
    model.fit(X, y)
    return model


def train_tp_optimizer_model(X: pd.DataFrame, y: pd.Series) -> xgb.XGBClassifier:
    """Train take-profit optimizer (multi-class)."""
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        objective='multi:softprob',
        num_class=4,  # 0, 1, 2, 3 TP levels
        use_label_encoder=False,
        random_state=42,
    )
    
    tscv = TimeSeriesSplit(n_splits=5)
    scores = cross_val_score(model, X, y, cv=tscv, scoring='accuracy')
    print(f"TP Optimizer Model - CV Accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")
    
    model.fit(X, y)
    return model


# ==========================================
# ONNX Export
# ==========================================

def export_to_onnx(model: Any, X_sample: pd.DataFrame, output_path: str, model_name: str) -> bool:
    """Export sklearn/xgboost model to ONNX format."""
    if not ONNX_AVAILABLE:
        print(f"Skipping ONNX export for {model_name} - ONNX not available")
        return False
    
    try:
        initial_type = [('float_input', FloatTensorType([None, X_sample.shape[1]]))]
        
        # For XGBoost, we need special handling
        if hasattr(model, 'get_booster'):
            # XGBoost model - need to use xgboost's own export
            # First convert to sklearn-compatible format
            onnx_model = convert_sklearn(model, initial_types=initial_type)
        else:
            onnx_model = convert_sklearn(model, initial_types=initial_type)
        
        onnx.save_model(onnx_model, output_path)
        print(f"Exported {model_name} to {output_path}")
        return True
    except Exception as e:
        print(f"Failed to export {model_name}: {e}")
        return False


# ==========================================
# Main Training Pipeline
# ==========================================

def main():
    parser = argparse.ArgumentParser(description='Train VINCE ML models')
    parser.add_argument('--data', type=str, required=True, 
                        help='Path to features.json from FeatureStore')
    parser.add_argument('--output', type=str, default='./models',
                        help='Output directory for models')
    parser.add_argument('--min-samples', type=int, default=100,
                        help='Minimum samples required to train')
    args = parser.parse_args()
    
    # Create output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Load data
    print("=" * 60)
    print("VINCE ML Model Training")
    print(f"Data: {args.data}")
    print(f"Output: {args.output}")
    print("=" * 60)
    
    df = load_features(args.data)
    
    # Check minimum samples
    trades_with_outcome = df['label_profitable'].notna().sum()
    if trades_with_outcome < args.min_samples:
        print(f"\nInsufficient data: {trades_with_outcome} trades with outcomes")
        print(f"Need at least {args.min_samples} trades to train models")
        print("Continue collecting data with the paper trading bot")
        return
    
    print(f"\nTraining on {trades_with_outcome} completed trades")
    
    # Train Signal Quality Model
    print("\n" + "=" * 40)
    print("Training Signal Quality Model")
    print("=" * 40)
    X_sq, y_sq = prepare_signal_quality_features(df)
    if len(X_sq) >= args.min_samples:
        model_sq = train_signal_quality_model(X_sq, y_sq)
        export_to_onnx(model_sq, X_sq, str(output_dir / 'signal_quality.onnx'), 'Signal Quality')
    else:
        print("Skipping - insufficient samples")
    
    # Train Position Sizing Model
    print("\n" + "=" * 40)
    print("Training Position Sizing Model")
    print("=" * 40)
    X_ps, y_ps = prepare_position_sizing_features(df)
    if len(X_ps) >= args.min_samples:
        model_ps = train_position_sizing_model(X_ps, y_ps)
        export_to_onnx(model_ps, X_ps, str(output_dir / 'position_sizing.onnx'), 'Position Sizing')
    else:
        print("Skipping - insufficient samples")
    
    # Train TP Optimizer Model
    print("\n" + "=" * 40)
    print("Training TP Optimizer Model")
    print("=" * 40)
    X_tp, y_tp = prepare_tp_features(df)
    if len(X_tp) >= args.min_samples:
        model_tp = train_tp_optimizer_model(X_tp, y_tp)
        export_to_onnx(model_tp, X_tp, str(output_dir / 'tp_optimizer.onnx'), 'TP Optimizer')
    else:
        print("Skipping - insufficient samples")
    
    # Save training metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'data_file': args.data,
        'total_records': len(df),
        'trades_with_outcomes': trades_with_outcome,
        'models_trained': [],
    }
    
    for model_name in ['signal_quality', 'position_sizing', 'tp_optimizer']:
        model_path = output_dir / f'{model_name}.onnx'
        if model_path.exists():
            metadata['models_trained'].append(model_name)
    
    with open(output_dir / 'training_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("\n" + "=" * 60)
    print("Training Complete!")
    print(f"Models exported to: {output_dir}")
    print(f"Models trained: {', '.join(metadata['models_trained'])}")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Copy .onnx files to .elizadb/vince-paper-bot/models/")
    print("2. Restart the agent to load the models")
    print("3. The ML Inference Service will automatically use the trained models")


if __name__ == '__main__':
    main()
