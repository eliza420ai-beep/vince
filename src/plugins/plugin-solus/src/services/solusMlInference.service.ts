/**
 * Solus ML Inference Service
 *
 * Loads the assignment calibrator ONNX model (when present) and returns
 * ML-calibrated P(assigned) for a given (asset, strike, spot, IV, T). If the model
 * is missing or inference fails, returns null so the caller uses GBM-only.
 * Same pattern as Vince's mlInference.service: optional ONNX, graceful fallback.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";

const DEFAULT_MODELS_DIR = ".elizadb/solus/models";
const MODEL_FILENAME = "assignment_calibrator.onnx";
const METADATA_FILENAME = "solus_training_metadata.json";

export interface SolusCalibratorInput {
  asset: string;
  strike: number;
  spot: number;
  atmIv: number;
  TYears: number;
  /** Optional: GBM or LLM probability at record; used when model was trained with it. */
  gbmProb?: number;
}

interface SolusTrainingMetadata {
  assignment_calibrator_feature_names?: string[];
  assignment_calibrator_input_dim?: number;
}

export class SolusMlInferenceService extends Service {
  static serviceType = "SOLUS_ML_INFERENCE_SERVICE";
  capabilityDescription = "ONNX assignment calibrator for Solus strike advice";

  private resolvedModelsDir: string = "";
  private session: unknown = null;
  private ort: unknown = null;
  private featureNames: string[] = [];
  private lazyLoadPromise: Promise<void> | null = null;

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<SolusMlInferenceService> {
    const service = new SolusMlInferenceService(runtime);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    const rawDir =
      (this.runtime.getSetting?.("SOLUS_ML_MODELS_DIR") as string) ??
      process.env.SOLUS_ML_MODELS_DIR ??
      DEFAULT_MODELS_DIR;
    this.resolvedModelsDir = path.resolve(process.cwd(), rawDir);

    try {
      this.ort = await import("onnxruntime-node");
      await this.loadModel();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.debug(
        `[SolusMlInference] ONNX not available: ${msg}. Options context will use GBM-only.`,
      );
    }
  }

  private async loadModel(): Promise<void> {
    if (!this.ort || !this.resolvedModelsDir) return;

    const modelPath = path.join(this.resolvedModelsDir, MODEL_FILENAME);
    const metaPath = path.join(this.resolvedModelsDir, METADATA_FILENAME);

    if (!fs.existsSync(modelPath) || !fs.existsSync(metaPath)) {
      logger.debug(
        "[SolusMlInference] No model or metadata found; using GBM fallback.",
      );
      return;
    }

    try {
      const metaRaw = fs.readFileSync(metaPath, "utf-8");
      const meta = JSON.parse(metaRaw) as SolusTrainingMetadata;
      this.featureNames = meta.assignment_calibrator_feature_names ?? [];
      if (this.featureNames.length === 0) {
        logger.warn(
          "[SolusMlInference] Metadata has no feature names; skipping load.",
        );
        return;
      }

      const Ort = this.ort as {
        InferenceSession: {
          create: (
            p: string,
            o?: { executionProviders?: string[] },
          ) => Promise<unknown>;
        };
      };
      this.session = await Ort.InferenceSession.create(modelPath, {
        executionProviders: ["cpu"],
      });
      logger.info(
        `[SolusMlInference] Loaded assignment_calibrator (${this.featureNames.length} features)`,
      );
    } catch (error) {
      logger.warn("[SolusMlInference] Failed to load model:", error);
      this.session = null;
    }
  }

  /**
   * Build feature vector in the same order as training (assignment_calibrator_feature_names).
   */
  private prepareFeatures(input: SolusCalibratorInput): Float32Array {
    const asset = (input.asset || "BTC").toUpperCase();
    const strikeNorm = input.strike > 0 ? input.strike / 100_000 : 0;
    const moneyness =
      input.spot > 0 && input.strike > 0 ? input.spot / input.strike : 1;
    const atmIv = Math.max(0, Math.min(1, input.atmIv / 100));
    const TYears = Math.max(0, input.TYears);
    const predProb =
      input.gbmProb != null ? Math.max(0, Math.min(1, input.gbmProb)) : 0.5;

    const valueByName: Record<string, number> = {
      asset_BTC: asset === "BTC" ? 1 : 0,
      asset_ETH: asset === "ETH" ? 1 : 0,
      asset_SOL: asset === "SOL" ? 1 : 0,
      asset_HYPE: asset === "HYPE" ? 1 : 0,
      strike_norm: strikeNorm,
      moneyness,
      atm_iv: atmIv,
      T_years: TYears,
      predicted_assign_prob: predProb,
    };

    const arr = new Float32Array(this.featureNames.length);
    for (let i = 0; i < this.featureNames.length; i++) {
      arr[i] = valueByName[this.featureNames[i]] ?? 0;
    }
    return arr;
  }

  /**
   * Predict P(assigned) from the calibrator model. Returns null if no model or inference fails.
   */
  async predictAssignmentProbability(
    input: SolusCalibratorInput,
  ): Promise<number | null> {
    if (!this.session || !this.ort) return null;

    if (this.featureNames.length === 0) return null;

    try {
      const features = this.prepareFeatures(input);
      const Ort = this.ort as {
        Tensor: new (
          type: string,
          data: Float32Array,
          dims: number[],
        ) => unknown;
      };
      const session = this.session as {
        run: (
          arg: Record<string, unknown>,
        ) => Promise<Record<string, { data?: number[]; dims?: number[] }>>;
      };
      const tensor = new Ort.Tensor("float32", features, [1, features.length]);
      const results = await session.run({ input: tensor });

      const output = results.output ?? results.probabilities;
      if (!output?.data || !Array.isArray(output.data)) return null;
      const data = output.data as number[];
      const numOutputs = output.dims?.[1] ?? data.length;
      let prob = data[0] ?? 0.5;
      if (numOutputs > 1 && typeof data[1] === "number") {
        prob = data[1];
      }
      return Math.max(0, Math.min(1, prob));
    } catch (error) {
      logger.debug("[SolusMlInference] Inference error:", error);
      return null;
    }
  }

  /** Whether the calibrator model is loaded and usable. */
  isModelLoaded(): boolean {
    return Boolean(this.session && this.featureNames.length > 0);
  }

  /**
   * Reload model and metadata from disk (e.g. after TRAIN_SOLUS_CALIBRATION_WHEN_READY).
   * Call so new ONNX applies without restart.
   */
  async reloadModels(): Promise<void> {
    this.session = null;
    this.featureNames = [];
    await this.loadModel();
  }

  async stop(): Promise<void> {
    this.session = null;
    this.ort = null;
    this.featureNames = [];
  }
}
