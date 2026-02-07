/**
 * VINCE ML Inference Service
 *
 * Provides ONNX model inference for ML-enhanced trading decisions.
 * Loads pre-trained models and runs inference for:
 * - Signal quality prediction
 * - Position sizing recommendations
 * - Take-profit/Stop-loss optimization
 *
 * Design:
 * - Models are stored as ONNX files in the data directory
 * - Uses onnxruntime-node for efficient inference
 * - Includes caching and fallback to rule-based logic
 * - Models are optional - service degrades gracefully without them
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { PERSISTENCE_DIR } from "../constants/paperTradingDefaults";
import { downloadModelsFromSupabase } from "../utils/supabaseMlModels";
import type {
  MarketFeatures,
  SessionFeatures,
  SignalFeatures,
  RegimeFeatures,
} from "./vinceFeatureStore.service";

// ==========================================
// Types
// ==========================================

/**
 * Input features for signal quality model.
 * Optional fields (hasOICap, news*) are used when the ONNX model was trained with them (see training_metadata.signal_quality_input_dim).
 */
export interface SignalQualityInput {
  // Market features (normalized)
  priceChange24h: number;
  volumeRatio: number;
  fundingPercentile: number;
  longShortRatio: number;

  // Signal features
  strength: number;
  confidence: number;
  sourceCount: number;
  hasCascadeSignal: number; // 0 or 1
  hasFundingExtreme: number; // 0 or 1
  hasWhaleSignal: number; // 0 or 1
  /** 0 or 1; used when model has 17+ inputs (trained with signal_hasOICap). */
  hasOICap?: number;

  /** Nasdaq/index 24h % change (HIP-3); used when model has 20 inputs. Normalized 0–1 in builder. */
  newsNasdaqChange?: number;
  /** 0 or 1; risk_on (crypto outperforming); used when model has 20 inputs. */
  newsMacroRiskOn?: number;
  /** 0 or 1; risk_off (tradfi outperforming); used when model has 20 inputs. */
  newsMacroRiskOff?: number;

  /** Asset symbol for asset dummies (e.g. "BTC", "ETH"); used when model has asset_* features. */
  assetTicker?: string;

  // Session features
  isWeekend: number; // 0 or 1
  isOpenWindow: number; // 0 or 1
  utcHour: number; // Normalized 0-1

  // Regime features
  volatilityRegimeHigh: number; // 0 or 1
  marketRegimeBullish: number; // 0 or 1
  marketRegimeBearish: number; // 0 or 1
}

/**
 * Input features for position sizing model
 */
export interface PositionSizingInput {
  signalQualityScore: number; // From signal quality model
  strength: number;
  confidence: number;
  volatilityRegime: number; // 0-2 (low, normal, high)
  currentDrawdown: number;
  recentWinRate: number;
  streakMultiplier: number;
}

/**
 * Input features for TP/SL optimization
 */
export interface TPSLInput {
  direction: number; // 0 = short, 1 = long
  atrPct: number;
  strength: number;
  confidence: number;
  volatilityRegime: number;
  marketRegime: number; // -1, 0, 1
}

/**
 * Prediction result with confidence
 */
export interface Prediction {
  value: number;
  confidence: number;
  modelVersion: string;
  latencyMs: number;
}

/**
 * Model metadata
 */
interface ModelInfo {
  name: string;
  path: string;
  version: string;
  inputShape: number[];
  outputShape: number[];
  loadedAt: number;
  inferenceCount: number;
  avgLatencyMs: number;
}

/** Platt scaling for signal quality probabilities (from training_metadata improvement_report). */
export interface SignalQualityCalibration {
  scale: number;
  intercept: number;
}

/** TP level performance from improvement report: level key "1"|"2"|"3" -> { win_rate, count }. */
export interface ImprovementReportTuning {
  suggested_signal_quality_threshold?: number;
  tp_level_performance?: Record<string, { win_rate: number; count: number }>;
  suggested_tuning?: { min_strength?: number; min_confidence?: number };
  /** When set, raw signal-quality probability is calibrated: 1/(1+exp(-(scale*raw+intercept))). */
  signal_quality_calibration?: SignalQualityCalibration;
}

// ==========================================
// Configuration
// ==========================================

const ML_CONFIG = {
  /** Directory for model files */
  modelsDir: "./.elizadb/vince-paper-bot/models",

  /** Model filenames */
  models: {
    signalQuality: "signal_quality.onnx",
    positionSizing: "position_sizing.onnx",
    tpOptimizer: "tp_optimizer.onnx",
    slOptimizer: "sl_optimizer.onnx",
  },

  /** Fallback thresholds when models unavailable */
  fallback: {
    signalQualityThreshold: 0.6,
    minPositionSizePct: 0.5,
    maxPositionSizePct: 2.0,
    defaultTPMultiplier: 1.5,
    defaultSLMultiplier: 1.0,
  },

  /** Cache settings */
  predictionCacheTTLMs: 5000, // 5 seconds

  /** Feature normalization bounds */
  normalization: {
    priceChange: { min: -20, max: 20 },
    nasdaqChange: { min: -5, max: 5 },
    volumeRatio: { min: 0, max: 5 },
    strength: { min: 0, max: 100 },
    confidence: { min: 0, max: 100 },
    atr: { min: 0, max: 10 },
    drawdown: { min: 0, max: 50 },
    winRate: { min: 0, max: 100 },
  },
};

// ==========================================
// ML Inference Service
// ==========================================

export class VinceMLInferenceService extends Service {
  static serviceType = "VINCE_ML_INFERENCE_SERVICE";
  capabilityDescription = "ONNX model inference for ML-enhanced trading";

  private modelsLoaded = false;
  private modelInfo: Map<string, ModelInfo> = new Map();
  private predictionCache: Map<string, { result: Prediction; expiry: number }> =
    new Map();
  /** Signal quality threshold from improvement report (training_metadata.json); used when no ONNX model. */
  private suggestedSignalQualityThreshold: number | null = null;
  /** Cached improvement report for TP level preference and optional tuning. */
  private improvementReport: ImprovementReportTuning | null = null;
  /** Signal quality model input dimension (from training_metadata); 16 = legacy, 17 = with hasOICap. */
  private signalQualityInputDim: number = 16;
  /** Ordered feature names for signal quality (from training_metadata); when set, feature vector is built from these. */
  private signalQualityFeatureNames: string[] | null = null;
  /** Platt calibration for signal quality score (from improvement_report.signal_quality_calibration). */
  private signalQualityCalibration: SignalQualityCalibration | null = null;

  // ONNX runtime session placeholders
  // These will be populated if onnxruntime-node is available
  private signalQualitySession: any = null;
  private positionSizingSession: any = null;
  private tpOptimizerSession: any = null;
  private slOptimizerSession: any = null;
  private ort: any = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceMLInferenceService> {
    const service = new VinceMLInferenceService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    // On Cloud: if local models dir is empty, pull from Supabase Storage (so redeploys get latest without $15 redeploy)
    const modelsPath = path.resolve(ML_CONFIG.modelsDir);
    const hasLocalOnnx =
      fs.existsSync(modelsPath) &&
      fs.readdirSync(modelsPath).some((f) => f.endsWith(".onnx"));
    if (!hasLocalOnnx) {
      const downloaded = await downloadModelsFromSupabase(
        this.runtime,
        modelsPath,
      );
      if (downloaded) {
        logger.info(
          "[MLInference] Models loaded from Supabase Storage (no redeploy needed).",
        );
      }
    }
    // Load improvement report (threshold, TP level performance, optional tuning)
    this.loadImprovementReport();
    // Try to load ONNX runtime
    try {
      // Dynamic import to handle cases where onnxruntime is not installed
      this.ort = await import("onnxruntime-node");
      logger.info("[MLInference] ONNX runtime loaded successfully");
      // Try to load models
      await this.loadModels();
    } catch (error) {
      logger.info(
        "[MLInference] ONNX runtime not available - using rule-based fallbacks. " +
          "Install 'onnxruntime-node' for ML features.",
      );
    }
  }

  /**
   * Reload models from disk (e.g. after training on Cloud). Call from TRAIN_ONNX_WHEN_READY task.
   */
  async reloadModels(): Promise<void> {
    if (!this.ort) return;
    this.signalQualitySession = null;
    this.positionSizingSession = null;
    this.tpOptimizerSession = null;
    this.slOptimizerSession = null;
    this.modelInfo.clear();
    this.predictionCache.clear();
    this.modelsLoaded = false;
    this.loadImprovementReport();
    await this.loadModels();
  }

  /** Read improvement report from training_metadata.json (threshold, tp_level_performance, suggested_tuning). */
  private loadImprovementReport(): void {
    try {
      const metadataPath = path.join(
        ML_CONFIG.modelsDir,
        "training_metadata.json",
      );
      const resolved = path.resolve(metadataPath);
      if (!fs.existsSync(resolved)) return;
      const raw = fs.readFileSync(resolved, "utf-8");
      const meta = JSON.parse(raw) as {
        improvement_report?: ImprovementReportTuning;
        signal_quality_input_dim?: number;
        signal_quality_feature_names?: string[];
      };
      const report = meta.improvement_report;
      if (report) {
        this.improvementReport = report;
        const cal = report.signal_quality_calibration;
        if (cal && typeof cal.scale === "number" && typeof cal.intercept === "number") {
          this.signalQualityCalibration = { scale: cal.scale, intercept: cal.intercept };
          logger.info(`[MLInference] Signal quality calibration: scale=${cal.scale}, intercept=${cal.intercept}`);
        } else {
          this.signalQualityCalibration = null;
        }
      }
      if (typeof meta.signal_quality_input_dim === "number" && meta.signal_quality_input_dim > 0) {
        this.signalQualityInputDim = meta.signal_quality_input_dim;
        logger.info(
          `[MLInference] Signal quality input dim: ${this.signalQualityInputDim}`,
        );
      }
      if (
        Array.isArray(meta.signal_quality_feature_names) &&
        meta.signal_quality_feature_names.length > 0
      ) {
        this.signalQualityFeatureNames = meta.signal_quality_feature_names;
        logger.info(
          `[MLInference] Signal quality feature names: ${this.signalQualityFeatureNames.length} (dynamic vector)`,
        );
      } else {
        this.signalQualityFeatureNames = null;
      }
      if (!report) return;
      const t = report.suggested_signal_quality_threshold;
      if (typeof t === "number" && t >= 0 && t <= 1) {
        this.suggestedSignalQualityThreshold = t;
        logger.info(
          `[MLInference] Using suggested signal quality threshold from report: ${t}`,
        );
      }
    } catch {
      // Ignore missing or invalid file
    }
  }

  /** Threshold for signal quality (from improvement report or fallback config). Used by aggregator and fallback logic. */
  getSignalQualityThreshold(): number {
    return (
      this.suggestedSignalQualityThreshold ??
      ML_CONFIG.fallback.signalQualityThreshold
    );
  }

  /**
   * TP level indices to use when building takeProfitPrices (0-based).
   * From improvement report: skip the worst-performing level if win_rate < 0.45 and count >= 5.
   * Default [0, 1, 2] when no report or no tp_level_performance.
   */
  getTPLevelIndicesToUse(): number[] {
    const perf = this.improvementReport?.tp_level_performance;
    if (!perf || typeof perf !== "object") return [0, 1, 2];
    const levels = ["1", "2", "3"];
    const minCount = 5;
    const worstWinRateThreshold = 0.45;
    let worstLevel: string | null = null;
    let worstRate = 1;
    for (const key of levels) {
      const stat = perf[key];
      if (!stat || stat.count < minCount) continue;
      const rate = typeof stat.win_rate === "number" ? stat.win_rate : 0;
      if (rate < worstRate && rate < worstWinRateThreshold) {
        worstRate = rate;
        worstLevel = key;
      }
    }
    if (worstLevel == null) return [0, 1, 2];
    const skipIndex = levels.indexOf(worstLevel);
    const indices = [0, 1, 2].filter((i) => i !== skipIndex);
    if (indices.length > 0) {
      logger.info(
        `[MLInference] TP level preference: skip level ${worstLevel} (win_rate ${(worstRate * 100).toFixed(0)}%), use indices [${indices.join(", ")}]`,
      );
    }
    return indices.length > 0 ? indices : [0, 1, 2];
  }

  /** Suggested min strength from improvement report (if present). Otherwise null. */
  getSuggestedMinStrength(): number | null {
    const v = this.improvementReport?.suggested_tuning?.min_strength;
    return typeof v === "number" && v >= 0 && v <= 100 ? v : null;
  }

  /** Suggested min confidence from improvement report (if present). Otherwise null. */
  getSuggestedMinConfidence(): number | null {
    const v = this.improvementReport?.suggested_tuning?.min_confidence;
    return typeof v === "number" && v >= 0 && v <= 100 ? v : null;
  }

  async stop(): Promise<void> {
    // Release model sessions
    this.signalQualitySession = null;
    this.positionSizingSession = null;
    this.tpOptimizerSession = null;
    this.slOptimizerSession = null;
    this.modelInfo.clear();
    this.predictionCache.clear();
    logger.info("[MLInference] Service stopped");
  }

  // ==========================================
  // Model Loading
  // ==========================================

  private async loadModels(): Promise<void> {
    if (!this.ort) return;

    const modelsPath = path.resolve(ML_CONFIG.modelsDir);

    if (!fs.existsSync(modelsPath)) {
      logger.info(`[MLInference] Models directory not found: ${modelsPath}`);
      return;
    }

    // Load each model if available
    await this.loadModel("signalQuality", ML_CONFIG.models.signalQuality);
    await this.loadModel("positionSizing", ML_CONFIG.models.positionSizing);
    await this.loadModel("tpOptimizer", ML_CONFIG.models.tpOptimizer);
    await this.loadModel("slOptimizer", ML_CONFIG.models.slOptimizer);

    const loadedCount = this.modelInfo.size;
    if (loadedCount > 0) {
      this.modelsLoaded = true;
      logger.info(`[MLInference] ✅ Loaded ${loadedCount} ML models`);
    }
  }

  private async loadModel(name: string, filename: string): Promise<void> {
    if (!this.ort) return;
    const modelPath = path.join(ML_CONFIG.modelsDir, filename);

    if (!fs.existsSync(modelPath)) {
      logger.debug(`[MLInference] Model not found: ${filename}`);
      return;
    }

    try {
      // Explicitly use CPU execution provider to avoid "no available backend found"
      // on some platforms (e.g. macOS ARM) where default backend detection can fail.
      const sessionOptions: { executionProviders?: string[] } = {};
      if (typeof this.ort.InferenceSession?.create === "function") {
        sessionOptions.executionProviders = ["cpu"];
      }
      const session = await this.ort.InferenceSession.create(
        modelPath,
        sessionOptions,
      );

      // Store session
      switch (name) {
        case "signalQuality":
          this.signalQualitySession = session;
          break;
        case "positionSizing":
          this.positionSizingSession = session;
          break;
        case "tpOptimizer":
          this.tpOptimizerSession = session;
          break;
        case "slOptimizer":
          this.slOptimizerSession = session;
          break;
      }

      // Store metadata
      this.modelInfo.set(name, {
        name,
        path: modelPath,
        version: "1.0.0", // Would be embedded in model in production
        inputShape: [], // Would extract from model
        outputShape: [],
        loadedAt: Date.now(),
        inferenceCount: 0,
        avgLatencyMs: 0,
      });

      logger.info(`[MLInference] Loaded model: ${name}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("no available backend found")) {
        // ONNX runtime has no usable backend on this platform; disable and use rule-based fallbacks.
        this.ort = null;
        logger.info(
          "[MLInference] ONNX backend not available on this platform - using rule-based fallbacks. " +
            "Install/build onnxruntime-node for your OS/arch for ML inference.",
        );
        return;
      }
      logger.error(`[MLInference] Failed to load ${name}: ${error}`);
    }
  }

  // ==========================================
  // Inference Methods
  // ==========================================

  /**
   * Predict signal quality (probability of profitable trade)
   */
  async predictSignalQuality(input: SignalQualityInput): Promise<Prediction> {
    const startTime = Date.now();

    // Check cache
    const cacheKey = `sq_${JSON.stringify(input)}`;
    const cached = this.predictionCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.result;
    }

    // If model available, run inference
    if (this.signalQualitySession && this.ort) {
      try {
        const features = this.prepareSignalQualityFeatures(input);
        const tensor = new this.ort.Tensor("float32", features, [
          1,
          features.length,
        ]);
        const results = await this.signalQualitySession.run({ input: tensor });

        // Assuming output is probability (binary: index 0 or 1; use positive class)
        let probability = results.output?.data?.[0] ?? 0.5;
        const numOutputs = results.output?.dims?.[1] ?? (results.output?.data?.length ?? 1);
        if (numOutputs > 1 && typeof results.output?.data?.[1] === "number") {
          probability = results.output.data[1];
        }
        if (this.signalQualityCalibration) {
          const { scale, intercept } = this.signalQualityCalibration;
          probability = 1 / (1 + Math.exp(-(scale * probability + intercept)));
        }

        const result: Prediction = {
          value: probability,
          confidence: 0.8, // Would come from model uncertainty estimation
          modelVersion:
            this.modelInfo.get("signalQuality")?.version ?? "unknown",
          latencyMs: Date.now() - startTime,
        };

        // Update stats
        this.updateModelStats("signalQuality", result.latencyMs);

        // Cache result
        this.predictionCache.set(cacheKey, {
          result,
          expiry: Date.now() + ML_CONFIG.predictionCacheTTLMs,
        });

        return result;
      } catch (error) {
        logger.debug(`[MLInference] Signal quality inference error: ${error}`);
      }
    }

    // Fallback: rule-based estimation
    return this.fallbackSignalQuality(input, startTime);
  }

  /**
   * Predict optimal position size (as multiplier of base size)
   */
  async predictPositionSize(input: PositionSizingInput): Promise<Prediction> {
    const startTime = Date.now();

    // If model available, run inference
    if (this.positionSizingSession && this.ort) {
      try {
        const features = this.preparePositionSizingFeatures(input);
        const tensor = new this.ort.Tensor("float32", features, [
          1,
          features.length,
        ]);
        const results = await this.positionSizingSession.run({ input: tensor });

        const sizeMultiplier = results.output?.data?.[0] ?? 1.0;

        const result: Prediction = {
          value: Math.max(
            ML_CONFIG.fallback.minPositionSizePct,
            Math.min(ML_CONFIG.fallback.maxPositionSizePct, sizeMultiplier),
          ),
          confidence: 0.7,
          modelVersion:
            this.modelInfo.get("positionSizing")?.version ?? "unknown",
          latencyMs: Date.now() - startTime,
        };

        this.updateModelStats("positionSizing", result.latencyMs);
        return result;
      } catch (error) {
        logger.debug(`[MLInference] Position sizing inference error: ${error}`);
      }
    }

    // Fallback: rule-based
    return this.fallbackPositionSize(input, startTime);
  }

  /**
   * Predict optimal take-profit level (as multiplier of ATR)
   */
  async predictTakeProfit(input: TPSLInput): Promise<Prediction> {
    const startTime = Date.now();

    if (this.tpOptimizerSession && this.ort) {
      try {
        const features = this.prepareTPSLFeatures(input);
        const tensor = new this.ort.Tensor("float32", features, [
          1,
          features.length,
        ]);
        const results = await this.tpOptimizerSession.run({ input: tensor });

        const tpMultiplier =
          results.output?.data?.[0] ?? ML_CONFIG.fallback.defaultTPMultiplier;

        return {
          value: Math.max(1.0, Math.min(4.0, tpMultiplier)),
          confidence: 0.6,
          modelVersion: this.modelInfo.get("tpOptimizer")?.version ?? "unknown",
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        logger.debug(`[MLInference] TP optimizer inference error: ${error}`);
      }
    }

    // Fallback
    return this.fallbackTakeProfit(input, startTime);
  }

  /**
   * Predict optimal stop-loss level (as multiplier of ATR)
   */
  async predictStopLoss(input: TPSLInput): Promise<Prediction> {
    const startTime = Date.now();

    if (this.slOptimizerSession && this.ort) {
      try {
        const features = this.prepareTPSLFeatures(input);
        const tensor = new this.ort.Tensor("float32", features, [
          1,
          features.length,
        ]);
        const results = await this.slOptimizerSession.run({ input: tensor });

        const slMultiplier =
          results.output?.data?.[0] ?? ML_CONFIG.fallback.defaultSLMultiplier;

        return {
          value: Math.max(0.5, Math.min(2.5, slMultiplier)),
          confidence: 0.6,
          modelVersion: this.modelInfo.get("slOptimizer")?.version ?? "unknown",
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        logger.debug(`[MLInference] SL optimizer inference error: ${error}`);
      }
    }

    // Fallback
    return this.fallbackStopLoss(input, startTime);
  }

  // ==========================================
  // Feature Preparation
  // ==========================================

  /**
   * Returns the normalized value for a single signal-quality feature name (training column name).
   * Used when building the feature vector from signal_quality_feature_names. Unknown names return 0.
   */
  private getSignalQualityFeatureValue(
    name: string,
    input: SignalQualityInput,
  ): number {
    const norm = ML_CONFIG.normalization;
    const n = (v: number, min: number, max: number) =>
      this.normalize(v, min, max);
    switch (name) {
      case "market_priceChange24h":
        return n(
          input.priceChange24h,
          norm.priceChange.min,
          norm.priceChange.max,
        );
      case "market_volumeRatio":
        return n(input.volumeRatio, norm.volumeRatio.min, norm.volumeRatio.max);
      case "market_fundingPercentile":
        return input.fundingPercentile / 100;
      case "market_longShortRatio":
        return n(input.longShortRatio, 0.5, 2.0);
      case "signal_strength":
        return input.strength / 100;
      case "signal_confidence":
        return input.confidence / 100;
      case "signal_source_count":
        return Math.min(1, input.sourceCount / 5);
      case "signal_hasCascadeSignal":
        return input.hasCascadeSignal;
      case "signal_hasFundingExtreme":
        return input.hasFundingExtreme;
      case "signal_hasWhaleSignal":
        return input.hasWhaleSignal;
      case "session_isWeekend":
        return input.isWeekend;
      case "session_isOpenWindow":
        return input.isOpenWindow;
      case "session_utcHour":
        return input.utcHour / 24;
      case "market_dvol":
      case "market_rsi14":
      case "market_oiChange24h":
      case "market_fundingDelta":
      case "market_bookImbalance":
      case "market_bidAskSpread":
      case "market_priceVsSma20":
      case "signal_avg_sentiment":
      case "news_avg_sentiment":
        return 0;
      case "signal_hasOICap":
        return input.hasOICap ?? 0;
      case "news_nasdaqChange":
        return n(
          input.newsNasdaqChange ?? 0,
          norm.nasdaqChange.min,
          norm.nasdaqChange.max,
        );
      case "news_macro_risk_on":
        return input.newsMacroRiskOn ?? 0;
      case "news_macro_risk_off":
        return input.newsMacroRiskOff ?? 0;
      case "regime_volatility_high":
        return input.volatilityRegimeHigh;
      case "regime_bullish":
        return input.marketRegimeBullish;
      case "regime_bearish":
        return input.marketRegimeBearish;
      default:
        if (name.startsWith("asset_")) {
          const ticker = (input.assetTicker ?? "").toUpperCase();
          const asset = name.replace(/^asset_/, "");
          return ticker === asset ? 1 : 0;
        }
        return 0;
    }
  }

  private prepareSignalQualityFeatures(
    input: SignalQualityInput,
  ): Float32Array {
    if (
      this.signalQualityFeatureNames &&
      this.signalQualityFeatureNames.length > 0
    ) {
      const arr = new Float32Array(this.signalQualityFeatureNames.length);
      for (let i = 0; i < this.signalQualityFeatureNames.length; i++) {
        arr[i] = this.getSignalQualityFeatureValue(
          this.signalQualityFeatureNames[i],
          input,
        );
      }
      return arr;
    }
    const norm = ML_CONFIG.normalization;
    const hasOICap = input.hasOICap ?? 0;
    const newsNasdaq = input.newsNasdaqChange ?? 0;
    const newsMacroOn = input.newsMacroRiskOn ?? 0;
    const newsMacroOff = input.newsMacroRiskOff ?? 0;
    // Order must match train_models.py: base 13, optional signal_hasOICap, optional news_nasdaqChange + news_macro_risk_on/off, then regime 3.
    const base = [
      this.normalize(
        input.priceChange24h,
        norm.priceChange.min,
        norm.priceChange.max,
      ),
      this.normalize(
        input.volumeRatio,
        norm.volumeRatio.min,
        norm.volumeRatio.max,
      ),
      input.fundingPercentile / 100,
      this.normalize(input.longShortRatio, 0.5, 2.0),
      input.strength / 100,
      input.confidence / 100,
      Math.min(1, input.sourceCount / 5),
      input.hasCascadeSignal,
      input.hasFundingExtreme,
      input.hasWhaleSignal,
      input.isWeekend,
      input.isOpenWindow,
      input.utcHour / 24,
    ];
    const regime = [
      input.volatilityRegimeHigh,
      input.marketRegimeBullish,
      input.marketRegimeBearish,
    ];
    const dim = this.signalQualityInputDim;
    if (dim >= 20) {
      const nasdaqNorm = this.normalize(
        newsNasdaq,
        norm.nasdaqChange.min,
        norm.nasdaqChange.max,
      );
      return new Float32Array([
        ...base,
        hasOICap,
        nasdaqNorm,
        newsMacroOn,
        newsMacroOff,
        ...regime,
      ]);
    }
    if (dim >= 17) {
      return new Float32Array([...base, hasOICap, ...regime]);
    }
    return new Float32Array([...base, ...regime]);
  }

  private preparePositionSizingFeatures(
    input: PositionSizingInput,
  ): Float32Array {
    const norm = ML_CONFIG.normalization;

    return new Float32Array([
      input.signalQualityScore,
      input.strength / 100,
      input.confidence / 100,
      input.volatilityRegime / 2,
      this.normalize(
        input.currentDrawdown,
        norm.drawdown.min,
        norm.drawdown.max,
      ),
      input.recentWinRate / 100,
      this.normalize(input.streakMultiplier, 0.5, 1.5),
    ]);
  }

  private prepareTPSLFeatures(input: TPSLInput): Float32Array {
    return new Float32Array([
      input.direction,
      this.normalize(input.atrPct, 0, 10),
      input.strength / 100,
      input.confidence / 100,
      input.volatilityRegime / 2,
      (input.marketRegime + 1) / 2, // Normalize -1 to 1 -> 0 to 1
    ]);
  }

  private normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  // ==========================================
  // Fallback Methods (Rule-Based)
  // ==========================================

  private fallbackSignalQuality(
    input: SignalQualityInput,
    startTime: number,
  ): Prediction {
    // Simple rule-based quality score
    let score = 0.5;

    // Strength contribution
    score += (input.strength - 60) * 0.005;

    // Confidence contribution
    score += (input.confidence - 55) * 0.005;

    // Source count bonus
    score += Math.min(0.1, input.sourceCount * 0.02);

    // High-value signal bonuses
    if (input.hasCascadeSignal) score += 0.1;
    if (input.hasFundingExtreme) score += 0.08;
    if (input.hasWhaleSignal) score += 0.05;
    if (input.hasOICap) score += 0.05;
    if (input.newsMacroRiskOn) score += 0.03;
    if (input.newsMacroRiskOff) score -= 0.02;

    // Penalties
    if (input.isWeekend) score -= 0.1;
    if (input.volatilityRegimeHigh) score -= 0.05;

    // Open window bonus
    if (input.isOpenWindow) score += 0.05;

    return {
      value: Math.max(0, Math.min(1, score)),
      confidence: 0.5, // Lower confidence for fallback
      modelVersion: "fallback_v1",
      latencyMs: Date.now() - startTime,
    };
  }

  private fallbackPositionSize(
    input: PositionSizingInput,
    startTime: number,
  ): Prediction {
    let multiplier = 1.0;

    // Quality score influence (use threshold from improvement report when available)
    const threshold = this.getSignalQualityThreshold();
    if (input.signalQualityScore > threshold + 0.2) {
      multiplier *= 1.2;
    } else if (input.signalQualityScore < threshold) {
      multiplier *= 0.8;
    }

    // Volatility adjustment
    if (input.volatilityRegime === 2) {
      multiplier *= 0.7; // Reduce size in high volatility
    }

    // Drawdown adjustment
    if (input.currentDrawdown > 10) {
      multiplier *= 0.8;
    }

    // Win rate adjustment
    if (input.recentWinRate > 60) {
      multiplier *= 1.1;
    } else if (input.recentWinRate < 40) {
      multiplier *= 0.9;
    }

    // Streak adjustment
    multiplier *= input.streakMultiplier;

    return {
      value: Math.max(
        ML_CONFIG.fallback.minPositionSizePct,
        Math.min(ML_CONFIG.fallback.maxPositionSizePct, multiplier),
      ),
      confidence: 0.5,
      modelVersion: "fallback_v1",
      latencyMs: Date.now() - startTime,
    };
  }

  private fallbackTakeProfit(input: TPSLInput, startTime: number): Prediction {
    let multiplier = ML_CONFIG.fallback.defaultTPMultiplier;

    // Adjust based on strength
    if (input.strength > 75) {
      multiplier *= 1.2; // Target more profit for strong signals
    }

    // Adjust for volatility
    if (input.volatilityRegime === 2) {
      multiplier *= 1.3; // Wider TP in high volatility
    } else if (input.volatilityRegime === 0) {
      multiplier *= 0.8; // Tighter TP in low volatility
    }

    // Adjust for market regime alignment
    const aligned =
      (input.direction === 1 && input.marketRegime === 1) ||
      (input.direction === 0 && input.marketRegime === -1);

    if (aligned) {
      multiplier *= 1.1; // Can target more when aligned with trend
    }

    return {
      value: multiplier,
      confidence: 0.5,
      modelVersion: "fallback_v1",
      latencyMs: Date.now() - startTime,
    };
  }

  private fallbackStopLoss(input: TPSLInput, startTime: number): Prediction {
    let multiplier = ML_CONFIG.fallback.defaultSLMultiplier;

    // Wider stops in high volatility
    if (input.volatilityRegime === 2) {
      multiplier *= 1.3;
    }

    // Tighter stops for weaker signals
    if (input.strength < 60 || input.confidence < 55) {
      multiplier *= 0.9;
    }

    return {
      value: multiplier,
      confidence: 0.5,
      modelVersion: "fallback_v1",
      latencyMs: Date.now() - startTime,
    };
  }

  // ==========================================
  // Utilities
  // ==========================================

  private updateModelStats(modelName: string, latencyMs: number): void {
    const info = this.modelInfo.get(modelName);
    if (info) {
      const newCount = info.inferenceCount + 1;
      info.avgLatencyMs =
        (info.avgLatencyMs * info.inferenceCount + latencyMs) / newCount;
      info.inferenceCount = newCount;
    }
  }

  /**
   * Get model status
   */
  getModelStatus(): {
    onnxAvailable: boolean;
    modelsLoaded: boolean;
    models: Array<{
      name: string;
      loaded: boolean;
      inferenceCount: number;
      avgLatencyMs: number;
    }>;
  } {
    const models = [];

    for (const [name, info] of this.modelInfo) {
      models.push({
        name,
        loaded: true,
        inferenceCount: info.inferenceCount,
        avgLatencyMs: Math.round(info.avgLatencyMs * 10) / 10,
      });
    }

    // Add missing models
    for (const modelName of Object.keys(ML_CONFIG.models)) {
      if (!this.modelInfo.has(modelName)) {
        models.push({
          name: modelName,
          loaded: false,
          inferenceCount: 0,
          avgLatencyMs: 0,
        });
      }
    }

    return {
      onnxAvailable: this.ort !== null,
      modelsLoaded: this.modelsLoaded,
      models,
    };
  }

  /**
   * Check if models are available
   */
  isReady(): boolean {
    return this.modelsLoaded || this.ort !== null; // Fallbacks always work
  }

  /**
   * Check if using real models vs fallback
   */
  isUsingModels(): boolean {
    return this.modelsLoaded && this.signalQualitySession !== null;
  }
}

export default VinceMLInferenceService;
