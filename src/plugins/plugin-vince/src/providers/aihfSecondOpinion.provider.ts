import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import fs from "node:fs";
import path from "node:path";

type AihfSecondOpinionPayload = Record<string, unknown>;

const CACHE_KEY = "vince:aihf_last_second_opinion";
let lastFetchAt = 0;
let cached: { ts: number; payload: AihfSecondOpinionPayload } | null = null;

// Test helper: provider uses module-level cache for cheap repeated reads.
export function __resetAihfSecondOpinionProviderCacheForTests() {
  lastFetchAt = 0;
  cached = null;
}

function shouldFetchFromMessage(message: Memory): boolean {
  const text = String(message?.content?.text ?? "");
  const lower = text.toLowerCase();
  return (
    /\baihf\b/.test(lower) ||
    /\bcommittee\b/.test(lower) ||
    /second[\s-]*opinion/.test(lower) ||
    /\bagree\b/.test(lower) ||
    /\bdisagree\b/.test(lower)
  );
}

function buildEndpointUrl(): string | null {
  const base = process.env.AIHF_BASE_URL?.trim();
  if (!base) return null;

  const endpoint =
    process.env.AIHF_LAST_SECOND_OPINION_ENDPOINT?.trim() ||
    "/api/v1/second-opinion/last";

  const normalizedBase = base.replace(/\/$/, "");
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  return `${normalizedBase}${normalizedEndpoint}`;
}

function isHttpEnabled(): boolean {
  const raw = process.env.VINCE_AIH_F_SECOND_OPINION_HTTP_ENABLED?.trim();
  if (!raw) return false;
  return raw === "true" || raw === "1";
}

const DEFAULT_LAST_SECOND_OPINION_FILENAME = "last_second_opinion_summary.json";

function resolveAihfSecondOpinionFilePath(): string | null {
  const explicit = process.env.AIHF_LAST_SECOND_OPINION_FILE?.trim();
  const root = process.env.AIHF_ARTIFACT_ROOT?.trim();

  const candidateFromRoot = root
    ? path.join(root, DEFAULT_LAST_SECOND_OPINION_FILENAME)
    : null;

  if (!explicit) return candidateFromRoot;

  // If a relative path is provided, resolve under AIHF_ARTIFACT_ROOT when available.
  if (!path.isAbsolute(explicit)) {
    if (root) return path.join(root, explicit);
    return path.resolve(process.cwd(), explicit);
  }

  return explicit;
}

function getAihfMaxAgeMs(): number {
  const raw = process.env.AIHF_LAST_SECOND_OPINION_MAX_AGE_MS?.trim();
  if (!raw) return 3 * 24 * 60 * 60 * 1000; // 3 days
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 3 * 24 * 60 * 60 * 1000;
}

function getPayloadGeneratedAtMs(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const direct = p.generated_at_ms;
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;

  const iso = p.generated_at;
  if (typeof iso === "string") {
    const t = Date.parse(iso);
    if (Number.isFinite(t)) return t;
  }

  return null;
}

function isPayloadFresh(payload: unknown, fileMtimeMs?: number): boolean {
  const maxAgeMs = getAihfMaxAgeMs();
  const generatedAtMs = getPayloadGeneratedAtMs(payload);
  if (generatedAtMs) return Date.now() - generatedAtMs <= maxAgeMs;
  if (typeof fileMtimeMs === "number" && Number.isFinite(fileMtimeMs)) {
    return Date.now() - fileMtimeMs <= maxAgeMs;
  }
  return true; // If we can't tell, don't hard-fail the provider.
}

function loadAihfSecondOpinionFromFile(
  filePath: string,
): AihfSecondOpinionPayload | null {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as AihfSecondOpinionPayload;
  const { mtimeMs } = fs.statSync(filePath);
  if (!isPayloadFresh(parsed, mtimeMs)) return null;
  return parsed;
}

function stringifyTruncated(obj: unknown, maxLen: number): string {
  try {
    const raw = JSON.stringify(obj, null, 2);
    if (raw.length <= maxLen) return raw;
    return raw.slice(0, maxLen) + "\n... (truncated)";
  } catch {
    return String(obj);
  }
}

async function fetchAihfLastSecondOpinion(url: string, timeoutMs: number) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as AihfSecondOpinionPayload;
}

export const aihfSecondOpinionProvider: Provider = {
  name: "AIHF_SECOND_OPINION",
  description:
    "Reads latest AIHF second-opinion snapshot via local file and/or HTTP (Phase D)",
  position: -7,
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    // Fast path: avoid HTTP calls on unrelated messages.
    if (!shouldFetchFromMessage(message)) return {};

    const ttlMs = parseInt(
      process.env.AIHF_SECOND_OPINION_CACHE_TTL_MS ?? "300000",
      10,
    );

    if (
      cached &&
      Date.now() - cached.ts < ttlMs &&
      cached.payload &&
      typeof cached.payload === "object"
    ) {
      const truncated = stringifyTruncated(cached.payload, 1800);
      return {
        text: `**AIHF second opinion (latest, cached)**\n${truncated}`,
        values: {
          aihfSecondOpinion: cached.payload,
          aihfSecondOpinionFresh: true,
        },
        data: { [CACHE_KEY]: cached.payload },
      };
    }

    // 1) Preferred: local file read (shared artifact path).
    const filePath = resolveAihfSecondOpinionFilePath();
    if (filePath) {
      try {
        if (fs.existsSync(filePath)) {
          const payload = loadAihfSecondOpinionFromFile(filePath);
          if (payload) {
            cached = { ts: Date.now(), payload };
            const truncated = stringifyTruncated(payload, 1800);
            return {
              text: `**AIHF second opinion (file)**\n${truncated}`,
              values: {
                aihfSecondOpinion: payload,
                aihfSecondOpinionFresh: true,
              },
            };
          }
        }
      } catch (error) {
        logger.debug(
          `[AIHF_SECOND_OPINION] file read failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // 2) Fallback: HTTP read.
    if (!isHttpEnabled()) return {};

    const url = buildEndpointUrl();
    if (!url) return {};

    const timeoutMs = parseInt(
      process.env.AIHF_SECOND_OPINION_READ_TIMEOUT_MS ?? "7000",
      10,
    );
    try {
      const payload = await fetchAihfLastSecondOpinion(url, timeoutMs);
      cached = { ts: Date.now(), payload };

      const truncated = stringifyTruncated(payload, 1800);
      return {
        text: `**AIHF second opinion (latest)**\n${truncated}`,
        values: {
          aihfSecondOpinion: payload,
          aihfSecondOpinionFresh: true,
        },
      };
    } catch (error) {
      logger.debug(
        `[AIHF_SECOND_OPINION] fetch failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {};
    }
  },
};
