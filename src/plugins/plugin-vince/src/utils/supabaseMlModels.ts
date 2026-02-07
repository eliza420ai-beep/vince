/**
 * Supabase Storage for ML models (vince-ml-models bucket).
 * - After training on Cloud, upload .onnx + training_metadata.json so they persist across redeploys.
 * - On startup, if local models dir is empty, download from Storage so no redeploy is needed.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";

const BUCKET = "vince-ml-models";
const MODEL_FILES = [
  "signal_quality.onnx",
  "position_sizing.onnx",
  "tp_optimizer.onnx",
  "sl_optimizer.onnx",
  "training_metadata.json",
];

function getSupabaseUrl(postgresUrl: string | null): string | null {
  if (!postgresUrl || typeof postgresUrl !== "string") return null;
  const match = postgresUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/);
  if (!match) return null;
  return `https://${match[1]}.supabase.co`;
}

export function getSupabaseClient(
  runtime: IAgentRuntime,
): SupabaseClient | null {
  const supabaseUrl =
    (runtime.getSetting("SUPABASE_URL") as string) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL) ||
    getSupabaseUrl(
      (runtime.getSetting("POSTGRES_URL") as string) ||
        (typeof process !== "undefined"
          ? (process.env?.POSTGRES_URL ?? null)
          : null),
    );
  const supabaseKey =
    (runtime.getSetting("SUPABASE_SERVICE_ROLE_KEY") as string) ||
    (typeof process !== "undefined" &&
      process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    (runtime.getSetting("SUPABASE_ANON_KEY") as string) ||
    (typeof process !== "undefined" ? process.env?.SUPABASE_ANON_KEY : null);
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Upload model files from local dir to Supabase Storage (bucket: vince-ml-models).
 * Call after training so models persist across redeploys.
 */
export async function uploadModelsToSupabase(
  runtime: IAgentRuntime,
  modelsDir: string,
): Promise<boolean> {
  const supabase = getSupabaseClient(runtime);
  if (!supabase) {
    logger.debug("[SupabaseMLModels] No Supabase config - skip upload");
    return false;
  }
  const resolved = path.resolve(modelsDir);
  if (!fs.existsSync(resolved)) {
    logger.warn(`[SupabaseMLModels] Models dir not found: ${resolved}`);
    return false;
  }
  let uploaded = 0;
  for (const name of MODEL_FILES) {
    const filePath = path.join(resolved, name);
    if (!fs.existsSync(filePath)) continue;
    try {
      const buf = fs.readFileSync(filePath);
      const { error } = await supabase.storage.from(BUCKET).upload(name, buf, {
        contentType: name.endsWith(".json")
          ? "application/json"
          : "application/octet-stream",
        upsert: true,
      });
      if (error) {
        logger.warn(
          `[SupabaseMLModels] Upload ${name} failed: ${error.message}`,
        );
        continue;
      }
      uploaded++;
    } catch (e) {
      logger.warn(`[SupabaseMLModels] Upload ${name} error: ${e}`);
    }
  }
  if (uploaded > 0) {
    logger.info(
      `[SupabaseMLModels] Uploaded ${uploaded} model file(s) to ${BUCKET}`,
    );
    return true;
  }
  return false;
}

/**
 * Download model files from Supabase Storage into local dir.
 * Call on startup when local dir is empty so Cloud gets latest models without redeploy.
 */
export async function downloadModelsFromSupabase(
  runtime: IAgentRuntime,
  modelsDir: string,
): Promise<boolean> {
  const supabase = getSupabaseClient(runtime);
  if (!supabase) return false;
  const resolved = path.resolve(modelsDir);
  if (!fs.existsSync(resolved)) {
    try {
      fs.mkdirSync(resolved, { recursive: true });
    } catch {
      return false;
    }
  }
  let downloaded = 0;
  for (const name of MODEL_FILES) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(name);
      if (error || !data) continue;
      const filePath = path.join(resolved, name);
      const buf = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(filePath, buf);
      downloaded++;
    } catch {
      // skip
    }
  }
  if (downloaded > 0) {
    logger.info(
      `[SupabaseMLModels] Downloaded ${downloaded} model file(s) from ${BUCKET}`,
    );
    return true;
  }
  return false;
}
