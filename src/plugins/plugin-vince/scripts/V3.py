python

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
    pip install xgboost scikit-learn pandas numpy onnx skl2onnx scipy joblib optuna onnxruntime
"""

import argparse
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.model_selection import TimeSeriesSplit, train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    roc_auc_score,
    f1_score,
)

try:
    import xgboost as xgb
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    import onnx
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    ONNX_AVAILABLE = False
    logging.warning("ONNX export/validation not available. Install: pip install xgboost scikit-learn onnx skl2onnx onnxruntime")

try:
    import optuna
    OPTUNA_AVAILABLE = True
except ImportError:
    OPTUNA_AVAILABLE = False
    from sklearn.model_selection import GridSearchCV
    logging.warning("Optuna not available for hyperparameter tuning. Falling back to GridSearchCV. Install: pip install optuna")

# Set up logging
logger = logging.getLogger(__name__)

def setup_logging(output_dir: Path, verbose: bool = False) -> None:
    """Set up logging to console and file."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format='%(asctime)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler(output_dir / 'train.log')
    file_handler.setLevel(level)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)

# ==========================================
# Data Loading and Feature Engineering
# ==========================================

def load_features(filepath: str) -> pd.DataFrame:
    """Load and flatten feature records from JSONL file exported by FeatureStore."""
    records = []
    with open(filepath, 'r') as f:
        for line in f:
            if line.strip():
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    logger.warning(f"Skipping invalid JSON line in {filepath}")

    if not records:
        raise ValueError(f"No valid records found in {filepath}")

    logger.info(f"Loaded {len(records)} records from {filepath}")

    # Use json_normalize for automatic flattening
    df = pd.json_normalize(records, errors='ignore')

    # Compute aggregates for lists
    if 'signal.sources' in df.columns:
        df['signal.source_count'] = df['signal.sources'].apply(lambda x: len(x) if isinstance(x, list) else 0)
        df['signal.avg_sentiment'] = df['signal.sources'].apply(
            lambda x: np.mean([s.get('sentiment', 0) if isinstance(s, dict) else 0 for s in x]) if isinstance(x, list) else 0.0
        )
        # Additional aggregates
        df['signal.max_strength'] = df['signal.sources'].apply(
            lambda x: np.max([s.get('strength', 0) if isinstance(s, dict) else 0 for s in x]) if isinstance(x, list) and x else 0.0
        )
        df['signal.sentiment_variance'] = df['signal.sources'].apply(
            lambda x: np.var([s.get('sentiment', 0) if isinstance(s, dict) else 0 for s in x]) if isinstance(x, list) and len(x) > 1 else 0.0
        )

    if 'news' in df.columns:
        def news_aggregates(news):
            if isinstance(news, list) and news:
                sentiments = [n.get('sentiment', 0) if isinstance(n, dict) else 0 for n in news]
                return np.mean(sentiments), len(news), np.max(sentiments)
            elif isinstance(news, dict):
                return news.get('sentiment', 0), 1, news.get('sentiment', 0)
            return 0.0, 0, 0.0
        
        df[['news.avg_sentiment', 'news.count', 'news.max_sentiment']] = df['news'].apply(news_aggregates).apply(pd.Series)

    # Handle timestamp
    if 'timestamp' in df.columns:
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
        df = df.sort_values('timestamp').reset_index(drop=True)
        df = df.dropna(subset=['timestamp'])  # Drop invalid timestamps

    logger.info(f"DataFrame shape after flattening: {df.shape}")
    return df
def detect_and_handle_outliers(df: pd.DataFrame, z_thresh: float = 3.0, quantile_clip: float = 0.99) -> pd.DataFrame:
    """Detect and clip outliers using z-score and quantile clipping."""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        if df[col].std() == 0:
            continue
        z_scores = np.abs(stats.zscore(df[col].fillna(df[col].median())))
        outliers = z_scores > z_thresh
        if outliers.any():
            logger.debug(f"Clipping {outliers.sum()} outliers in {col}")
            upper = df[col].abs().quantile(quantile_clip)
            df[col] = df[col].clip(-upper, upper)
    return df
def split_data(df_trades: pd.DataFrame, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Split data into train and test sets preserving time order."""
    n = len(df_trades)
    train_idx = int(n * (1 - test_size))
    df_train = df_trades.iloc[:train_idx]
    df_test = df_trades.iloc[train_idx:]
    logger.info(f"Train shape: {df_train.shape}, Test shape: {df_test.shape}")
    return df_train, df_test
def prepare_features(df: pd.DataFrame, label_col: str, feature_cols: List[str], 
                     categorical_cols: Optional[List[str]] = None, 
                     clip_targets: Optional[Tuple[float, float]] = None) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """Generic feature preparation with outlier handling and splitting."""
    df_trades = df[df[label_col].notna()].copy()
    if len(df_trades) == 0:
        raise ValueError(f"No data with label '{label_col}'")

    df_trades = detect_and_handle_outliers(df_trades)

    # Add regime encodings if available
    if 'regime.volatilityRegime' in df_trades.columns:
        df_trades['regime.volatility_high'] = (df_trades['regime.volatilityRegime'] == 'high').astype(int)
        feature_cols.append('regime.volatility_high')
    if 'regime.marketRegime' in df_trades.columns:
        df_trades['regime.bullish'] = (df_trades['regime.marketRegime'] == 'bullish').astype(int)
        df_trades['regime.bearish'] = (df_trades['regime.marketRegime'] == 'bearish').astype(int)
        feature_cols.extend(['regime.bullish', 'regime.bearish'])

    # Add asset dummies if multiple assets
    if 'asset' in df_trades.columns and df_trades['asset'].nunique() > 1:
        asset_dummies = pd.get_dummies(df_trades['asset'], prefix='asset')
        df_trades = pd.concat([df_trades, asset_dummies], axis=1)
        feature_cols.extend(asset_dummies.columns.tolist())

    # Filter available columns
    available_cols = [c for c in feature_cols if c in df_trades.columns]
    if not available_cols:
        raise ValueError("No available feature columns")

    df_train, df_test = split_data(df_trades)

    X_train = df_train[available_cols].fillna(0)
    y_train = df_train[label_col]
    X_test = df_test[available_cols].fillna(0)
    y_test = df_test[label_col]

    # Clip targets if specified
    if clip_targets:
        y_train = y_train.clip(*clip_targets)
        y_test = y_test.clip(*clip_targets)

    # Handle categoricals
    if categorical_cols:
        for col in [c for c in categorical_cols if c in X_train.columns]:
            le = LabelEncoder()
            X_train[col] = le.fit_transform(X_train[col])
            X_test[col] = le.transform(X_test[col])  # Assume same categories

    logger.info(f"Features shape: train {X_train.shape}, test {X_test.shape}")
    return X_train, y_train, X_test, y_test
def prepare_signal_quality_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """Prepare features for signal quality prediction."""
    feature_cols = [
        'market.priceChange24h', 'market.volumeRatio', 'market.fundingPercentile',
        'market.longShortRatio', 'signal.strength', 'signal.confidence',
        'signal.source_count', 'signal.hasCascadeSignal', 'signal.hasFundingExtreme',
        'signal.hasWhaleSignal', 'session.isWeekend', 'session.isOpenWindow',
        'session.utcHour', 'signal.avg_sentiment', 'signal.max_strength',
        'signal.sentiment_variance', 'news.avg_sentiment', 'news.count',
        'news.max_sentiment',
    ]
    return prepare_features(df, 'label_profitable', feature_cols, clip_targets=(0, 1))
def prepare_position_sizing_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """Prepare features for position sizing prediction."""
    feature_cols = [
        'signal.strength', 'signal.confidence', 'signal.source_count',
        'session.isWeekend', 'exec.streakMultiplier', 'signal.avg_sentiment',
        'signal.max_strength', 'signal.sentiment_variance', 'news.avg_sentiment',
    ]
    # Add volatility level
    if 'regime.volatilityRegime' in df.columns:
        df['regime.volatility_level'] = df['regime.volatilityRegime'].map({'low': 0, 'normal': 1, 'high': 2}).fillna(1)
        feature_cols.append('regime.volatility_level')
    return prepare_features(df, 'label_rMultiple', feature_cols, clip_targets=(-2, 3))
def prepare_tp_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """Prepare features for take-profit optimization."""
    feature_cols = [
        'signal.direction', 'market.atrPct', 'signal.strength', 'signal.confidence',
        'signal.avg_sentiment', 'signal.max_strength', 'news.avg_sentiment',
    ]
    categorical_cols = ['signal.direction']
    # Add encodings
    if 'regime.volatilityRegime' in df.columns:
        df['regime.volatility_level'] = df['regime.volatilityRegime'].map({'low': 0, 'normal': 1, 'high': 2}).fillna(1)
        feature_cols.append('regime.volatility_level')
    if 'regime.marketRegime' in df.columns:
        df['regime.market_regime_num'] = df['regime.marketRegime'].map({'bearish': -1, 'neutral': 0, 'bullish': 1}).fillna(0)
        feature_cols.append('regime.market_regime_num')
    X_train, y_train, X_test, y_test = prepare_features(df, 'label_optimalTpLevel', feature_cols, categorical_cols)
    # Encode y to consecutive ints
    le = LabelEncoder()
    y_train = le.fit_transform(y_train.astype(int))
    y_test = le.transform(y_test.astype(int))
    return X_train, y_train, X_test, y_test
def prepare_sl_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """Prepare features for stop-loss optimization."""
    feature_cols = [
        'signal.direction', 'market.atrPct', 'signal.strength', 'signal.confidence',
        'signal.avg_sentiment', 'market.volatility', 'news.avg_sentiment',
    ]
    categorical_cols = ['signal.direction']
    # Add encodings
    if 'regime.volatilityRegime' in df.columns:
        df['regime.volatility_level'] = df['regime.volatilityRegime'].map({'low': 0, 'normal': 1, 'high': 2}).fillna(1)
        feature_cols.append('regime.volatility_level')
    if 'regime.marketRegime' in df.columns:
        df['regime.market_regime_num'] = df['regime.marketRegime'].map({'bearish': -1, 'neutral': 0, 'bullish': 1}).fillna(0)
        feature_cols.append('regime.market_regime_num')
    return prepare_features(df, 'label_maxAdverseExcursion', feature_cols, categorical_cols, clip_targets=(0, 5))
# ==========================================
# Model Training and Evaluation
# ==========================================

def tune_hyperparams(model: Any, X: pd.DataFrame, y: pd.Series, param_dist: Dict, tscv: TimeSeriesSplit) -> Dict:
    """Tune hyperparameters using Optuna if available, else GridSearchCV."""
    if OPTUNA_AVAILABLE:
        def objective(trial):
            params = {}
            for key, dist in param_dist.items():
                if isinstance(dist, list):
                    params[key] = trial.suggest_categorical(key, dist)
                elif len(dist) == 3 and dist[2] == 'int':
                    params[key] = trial.suggest_int(key, dist[0], dist[1])
                elif len(dist) == 3 and dist[2] == 'float':
                    params[key] = trial.suggest_float(key, dist[0], dist[1])
            model.set_params(**params)
            scores = []
            for train_idx, val_idx in tscv.split(X):
                X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
                y_tr, y_val = y.iloc[train_idx], y.iloc[val_idx]
                model.fit(X_tr, y_tr)
                score = model.score(X_val, y_val)  # Uses eval_metric
                scores.append(score)
            return np.mean(scores)
        
        study = optuna.create_study(direction='maximize')
        study.optimize(objective, n_trials=50)
        return study.best_params
    else:
        grid = GridSearchCV(model, param_dist, cv=tscv, n_jobs=-1)
        grid.fit(X, y)
        return grid.best_params_
def evaluate_binary_model(model: Any, X_test: pd.DataFrame, y_test: pd.Series) -> Dict:
    """Evaluate binary classification model."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'auc': roc_auc_score(y_test, y_prob),
        'report': classification_report(y_test, y_pred, output_dict=True),
    }
    logger.info(f"Test Accuracy: {metrics['accuracy']:.3f}, AUC: {metrics['auc']:.3f}")
    logger.info(f"Classification Report:\n{classification_report(y_test, y_pred)}")
    return metrics
def evaluate_multi_model(model: Any, X_test: pd.DataFrame, y_test: pd.Series) -> Dict:
    """Evaluate multi-class classification model."""
    y_pred = model.predict(X_test)
    metrics = {
        'accuracy': accuracy_score(y_test, y_pred),
        'f1_macro': f1_score(y_test, y_pred, average='macro'),
        'report': classification_report(y_test, y_pred, output_dict=True),
    }
    logger.info(f"Test Accuracy: {metrics['accuracy']:.3f}, F1 Macro: {metrics['f1_macro']:.3f}")
    logger.info(f"Classification Report:\n{classification_report(y_test, y_pred)}")
    return metrics
def evaluate_reg_model(model: Any, X_test: pd.DataFrame, y_test: pd.Series) -> Dict:
    """Evaluate regression model."""
    y_pred = model.predict(X_test)
    metrics = {
        'mae': mean_absolute_error(y_test, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_test, y_pred)),
    }
    logger.info(f"Test MAE: {metrics['mae']:.3f}, RMSE: {metrics['rmse']:.3f}")
    return metrics
def train_signal_quality_model(X_train: pd.DataFrame, y_train: pd.Series, 
                               X_test: pd.DataFrame, y_test: pd.Series) -> Tuple[xgb.XGBClassifier, Dict]:
    """Train signal quality classifier with hyperparam tuning."""
    pos_weight = (len(y_train) - np.sum(y_train)) / np.sum(y_train) if np.sum(y_train) > 0 else 1
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        eval_metric='auc',
        random_state=42,
        tree_method='hist',
        enable_categorical=True,
        scale_pos_weight=pos_weight,
        early_stopping_rounds=10,
    )
    param_dist = {
        'n_estimators': [50, 100, 200, 300],
        'max_depth': [2, 3, 4, 5],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'subsample': [0.6, 0.8, 1.0],
        'colsample_bytree': [0.6, 0.8, 1.0],
        'min_child_weight': [1, 3, 5],
    }
    tscv = TimeSeriesSplit(n_splits=5)
    best_params = tune_hyperparams(model, X_train, y_train, param_dist, tscv)
    model.set_params(**best_params)
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    
    logger.info(f"Signal Quality Model - Best params: {best_params}")
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': X_train.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    logger.info("\nTop 10 features:")
    logger.info(importance.head(10))
    
    metrics = evaluate_binary_model(model, X_test, y_test)
    return model, metrics
def train_position_sizing_model(X_train: pd.DataFrame, y_train: pd.Series, 
                                X_test: pd.DataFrame, y_test: pd.Series) -> Tuple[xgb.XGBRegressor, Dict]:
    """Train position sizing regressor with hyperparam tuning."""
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        random_state=42,
        tree_method='hist',
        enable_categorical=True,
        early_stopping_rounds=10,
    )
    param_dist = {
        'n_estimators': [50, 100, 200, 300],
        'max_depth': [2, 3, 4, 5],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'subsample': [0.6, 0.8, 1.0],
        'colsample_bytree': [0.6, 0.8, 1.0],
        'min_child_weight': [1, 3, 5],
    }
    tscv = TimeSeriesSplit(n_splits=5)
    best_params = tune_hyperparams(model, X_train, y_train, param_dist, tscv)
    model.set_params(**best_params)
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    
    logger.info(f"Position Sizing Model - Best params: {best_params}")
    
    metrics = evaluate_reg_model(model, X_test, y_test)
    return model, metrics
def train_tp_optimizer_model(X_train: pd.DataFrame, y_train: pd.Series, 
                             X_test: pd.DataFrame, y_test: pd.Series) -> Tuple[xgb.XGBClassifier, Dict]:
    """Train take-profit optimizer (multi-class) with hyperparam tuning."""
    num_class = len(np.unique(y_train))
    model = xgb.XGBClassifier(
        objective='multi:softprob',
        num_class=num_class,
        eval_metric='mlogloss',
        random_state=42,
        tree_method='hist',
        enable_categorical=True,
        early_stopping_rounds=10,
    )
    param_dist = {
        'n_estimators': [50, 100, 200, 300],
        'max_depth': [2, 3, 4, 5],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'subsample': [0.6, 0.8, 1.0],
        'colsample_bytree': [0.6, 0.8, 1.0],
        'min_child_weight': [1, 3, 5],
    }
    tscv = TimeSeriesSplit(n_splits=5)
    best_params = tune_hyperparams(model, X_train, y_train, param_dist, tscv)
    model.set_params(**best_params)
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    
    logger.info(f"TP Optimizer Model - Best params: {best_params}")
    
    metrics = evaluate_multi_model(model, X_test, y_test)
    return model, metrics
def train_sl_optimizer_model(X_train: pd.DataFrame, y_train: pd.Series, 
                             X_test: pd.DataFrame, y_test: pd.Series) -> Tuple[xgb.XGBRegressor, Dict]:
    """Train stop-loss optimizer using quantile regression."""
    model = xgb.XGBRegressor(
        objective='reg:quantileerror',
        quantile_alpha=0.95,  # Conservative estimate
        random_state=42,
        tree_method='hist',
        enable_categorical=True,
        early_stopping_rounds=10,
    )
    param_dist = {
        'n_estimators': [50, 100, 200, 300],
        'max_depth': [2, 3, 4, 5],
        'learning_rate': [0.01, 0.05, 0.1, 0.2],
        'subsample': [0.6, 0.8, 1.0],
        'colsample_bytree': [0.6, 0.8, 1.0],
        'min_child_weight': [1, 3, 5],
    }
    tscv = TimeSeriesSplit(n_splits=5)
    best_params = tune_hyperparams(model, X_train, y_train, param_dist, tscv)
    model.set_params(**best_params)
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)
    
    logger.info(f"SL Optimizer Model - Best params: {best_params}")
    
    metrics = evaluate_reg_model(model, X_test, y_test)
    return model, metrics
# ==========================================
# Model Export and Validation
# ==========================================

def export_to_onnx(model: Any, X_sample: pd.DataFrame, output_path: str, model_name: str) -> bool:
    """Export model to ONNX format."""
    if not ONNX_AVAILABLE:
        logger.warning(f"Skipping ONNX export for {model_name}")
        return False
    
    try:
        # Ensure X_sample is float32
        initial_type = [('input', FloatTensorType([None, X_sample.shape[1]]))]
        onnx_model = convert_sklearn(model, initial_types=initial_type, target_opset=12)
        onnx.save_model(onnx_model, output_path)
        logger.info(f"Exported {model_name} to {output_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to export {model_name} to ONNX: {str(e)}")
        return False
def validate_onnx(model: Any, onnx_path: str, X_sample: pd.DataFrame, is_classifier: bool = False) -> bool:
    """Validate ONNX model against original predictions."""
    if not ONNX_AVAILABLE:
        return False
    
    try:
        sess = ort.InferenceSession(onnx_path)
        input_name = sess.get_inputs()[0].name
        X_array = X_sample.values.astype(np.float32)
        pred_onnx = sess.run(None, {input_name: X_array})[0]
        
        if is_classifier:
            pred_model = model.predict_proba(X_sample)
        else:
            pred_model = model.predict(X_sample)
        
        if not np.allclose(pred_model, pred_onnx, atol=1e-4):
            logger.warning("ONNX predictions do not match original model closely")
            return False
        
        logger.info("ONNX validation passed")
        return True
    except Exception as e:
        logger.error(f"ONNX validation failed: {str(e)}")
        return False
def save_joblib_backup(model: Any, output_path: str, model_name: str) -> None:
    """Save model as joblib backup."""
    try:
        joblib.dump(model, output_path)
        logger.info(f"Saved {model_name} joblib backup to {output_path}")
    except Exception as e:
        logger.warning(f"Failed to save joblib backup: {str(e)}")
# ==========================================
# Main Training Pipeline
# ==========================================

def main():
    parser = argparse.ArgumentParser(description='Train VINCE ML models')
    parser.add_argument('--data', type=str, required=True, help='Path to features.jsonl from FeatureStore')
    parser.add_argument('--output', type=str, default='./models', help='Output directory for models')
    parser.add_argument('--min-samples', type=int, default=100, help='Minimum samples required to train each model')
    parser.add_argument('--verbose', action='store_true', help='Enable debug logging')
    args = parser.parse_args()
    
    # Create timestamped output directory
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_dir = Path(args.output) / timestamp
    output_dir.mkdir(parents=True, exist_ok=True)
    
    setup_logging(output_dir, args.verbose)
    
    logger.info("=" * 60)
    logger.info("VINCE ML Model Training")
    logger.info(f"Data: {args.data}")
    logger.info(f"Output: {output_dir}")
    logger.info(f"Optuna available: {OPTUNA_AVAILABLE}")
    logger.info(f"ONNX available: {ONNX_AVAILABLE}")
    logger.info("=" * 60)
    
    df = load_features(args.data)
    
    # Overall data stats
    trades_with_outcome = df['label_profitable'].notna().sum()  # Using profitable as proxy
    logger.info(f"\nTotal records: {len(df)}, Completed trades: {trades_with_outcome}")
    
    if trades_with_outcome < args.min_samples:
        logger.warning(f"Insufficient data: {trades_with_outcome} trades with outcomes")
        logger.warning(f"Need at least {args.min_samples} trades to train models")
        return
    
    models_info = {}
    models_trained = []
    
    # Train Signal Quality Model
    try:
        logger.info("\n" + "=" * 40)
        logger.info("Training Signal Quality Model")
        logger.info("=" * 40)
        X_train, y_train, X_test, y_test = prepare_signal_quality_features(df)
        if len(X_train) >= args.min_samples:
            model, metrics = train_signal_quality_model(X_train, y_train, X_test, y_test)
            onnx_path = str(output_dir / 'signal_quality.onnx')
            exported = export_to_onnx(model, X_train.iloc[:1], onnx_path, 'Signal Quality')
            if exported:
                validate_onnx(model, onnx_path, X_train.iloc[:5], is_classifier=True)
                models_trained.append('signal_quality')
            save_joblib_backup(model, str(output_dir / 'signal_quality.joblib'), 'Signal Quality')
            models_info['signal_quality'] = {'metrics': metrics}
        else:
            logger.info("Skipping - insufficient samples")
    except Exception as e:
        logger.error(f"Error training Signal Quality Model: {str(e)}")
    
    # Train Position Sizing Model
    try:
        logger.info("\n" + "=" * 40)
        logger.info("Training Position Sizing Model")
        logger.info("=" * 40)
        X_train, y_train, X_test, y_test = prepare_position_sizing_features(df)
        if len(X_train) >= args.min_samples:
            model, metrics = train_position_sizing_model(X_train, y_train, X_test, y_test)
            onnx_path = str(output_dir / 'position_sizing.onnx')
            exported = export_to_onnx(model, X_train.iloc[:1], onnx_path, 'Position Sizing')
            if exported:
                validate_onnx(model, onnx_path, X_train.iloc[:5])
                models_trained.append('position_sizing')
            save_joblib_backup(model, str(output_dir / 'position_sizing.joblib'), 'Position Sizing')
            models_info['position_sizing'] = {'metrics': metrics}
        else:
            logger.info("Skipping - insufficient samples")
    except Exception as e:
        logger.error(f"Error training Position Sizing Model: {str(e)}")
    
    # Train TP Optimizer Model
    try:
        logger.info("\n" + "=" * 40)
        logger.info("Training TP Optimizer Model")
        logger.info("=" * 40)
        X_train, y_train, X_test, y_test = prepare_tp_features(df)
        if len(X_train) >= args.min_samples:
            model, metrics = train_tp_optimizer_model(X_train, y_train, X_test, y_test)
            onnx_path = str(output_dir / 'tp_optimizer.onnx')
            exported = export_to_onnx(model, X_train.iloc[:1], onnx_path, 'TP Optimizer')
            if exported:
                validate_onnx(model, onnx_path, X_train.iloc[:5], is_classifier=True)
                models_trained.append('tp_optimizer')
            save_joblib_backup(model, str(output_dir / 'tp_optimizer.joblib'), 'TP Optimizer')
            models_info['tp_optimizer'] = {'metrics': metrics}
        else:
            logger.info("Skipping - insufficient samples")
    except Exception as e:
        logger.error(f"Error training TP Optimizer Model: {str(e)}")
    
    # Train SL Optimizer Model
    try:
        logger.info("\n" + "=" * 40)
        logger.info("Training SL Optimizer Model")
        logger.info("=" * 40)
        X_train, y_train, X_test, y_test = prepare_sl_features(df)
        if len(X_train) >= args.min_samples:
            model, metrics = train_sl_optimizer_model(X_train, y_train, X_test, y_test)
            onnx_path = str(output_dir / 'sl_optimizer.onnx')
            exported = export_to_onnx(model, X_train.iloc[:1], onnx_path, 'SL Optimizer')
            if exported:
                validate_onnx(model, onnx_path, X_train.iloc[:5])
                models_trained.append('sl_optimizer')
            save_joblib_backup(model, str(output_dir / 'sl_optimizer.joblib'), 'SL Optimizer')
            models_info['sl_optimizer'] = {'metrics': metrics}
        else:
            logger.info("Skipping - insufficient samples")
    except Exception as e:
        logger.error(f"Error training SL Optimizer Model: {str(e)}")
    
    # Save training metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'data_file': args.data,
        'total_records': len(df),
        'trades_with_outcomes': trades_with_outcome,
        'models_trained': models_trained,
        'models_info': models_info,
    }
    
    with open(output_dir / 'training_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2, default=str)
    
    logger.info("\n" + "=" * 60)
    logger.info("Training Complete!")
    logger.info(f"Models exported to: {output_dir}")
    logger.info(f"Models trained: {', '.join(models_trained)}")
    logger.info("=" * 60)
    logger.info("\nNext steps:")
    logger.info("1. Review train.log and training_metadata.json")
    logger.info("2. Copy .onnx files to .elizadb/vince-paper-bot/models/")
    logger.info("3. Restart the agent to load the models")
if __name__ == '__main__':
    main()

