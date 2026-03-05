const DEFAULT_CAUSAL_MIN_EFFECT = 0.015;
const DEFAULT_CAUSAL_MIN_SAMPLES_PER_ARM = 10;
const MIN_EFFECT = 0.005;
const MAX_EFFECT = 0.03;
const MIN_SAMPLES = 6;
const MAX_SAMPLES = 24;

type GetSettingFn = ((key: string) => string | number | undefined) | undefined;

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export type CausalThresholds = {
  minimumEffect: number;
  minimumSamplesPerArm: number;
};

export function resolveCausalThresholds(params?: {
  getSetting?: GetSettingFn;
  fallbackMinimumEffect?: number;
  fallbackMinimumSamplesPerArm?: number;
}): CausalThresholds {
  const getSetting = params?.getSetting;
  const effectFallback =
    params?.fallbackMinimumEffect ?? DEFAULT_CAUSAL_MIN_EFFECT;
  const samplesFallback =
    params?.fallbackMinimumSamplesPerArm ?? DEFAULT_CAUSAL_MIN_SAMPLES_PER_ARM;

  const effectRaw =
    toNumber(getSetting?.("VINCE_SYNERGY_CAUSAL_MIN_EFFECT")) ??
    toNumber(getSetting?.("VINCE_PHASE15_CAUSAL_MIN_EFFECT")) ??
    toNumber(process.env.VINCE_SYNERGY_CAUSAL_MIN_EFFECT) ??
    toNumber(process.env.VINCE_PHASE15_CAUSAL_MIN_EFFECT) ??
    effectFallback;
  const samplesRaw =
    toNumber(getSetting?.("VINCE_SYNERGY_CAUSAL_MIN_SAMPLES_PER_ARM")) ??
    toNumber(getSetting?.("VINCE_PHASE15_CAUSAL_MIN_SAMPLES_PER_ARM")) ??
    toNumber(process.env.VINCE_SYNERGY_CAUSAL_MIN_SAMPLES_PER_ARM) ??
    toNumber(process.env.VINCE_PHASE15_CAUSAL_MIN_SAMPLES_PER_ARM) ??
    samplesFallback;

  return {
    minimumEffect: clamp(effectRaw, MIN_EFFECT, MAX_EFFECT),
    minimumSamplesPerArm: Math.round(
      clamp(samplesRaw, MIN_SAMPLES, MAX_SAMPLES),
    ),
  };
}
