/**
 * Safety and defaults: single source of truth for prompts and providers.
 * Tests (kelly.defaults-and-safety) assert these lines appear when relevant.
 */

/** When rain or storm: do not recommend beach/surf; suggest indoor alternatives. */
export const RAIN_STORM_SAFETY_LINE =
  "Do not recommend beach walks, surf, outdoor swimming, or outdoor activities; suggest indoor alternatives (yoga, wine bar, Michelin lunch, museum).";

/** Strong wind (no rain): avoid surf/exposed beach; suggest sheltered or indoor. */
export const STRONG_WIND_SAFETY_LINE =
  "Strong wind: avoid surf or exposed beach; suggest sheltered spots or indoor alternatives.";

/** Snow: do not recommend outdoor dining, surf, or pool; suggest indoor activities, Thermomix dinner, or palace spa. */
export const SNOW_SAFETY_LINE =
  "Snow: do not recommend outdoor dining, beach, surf, or pool; suggest indoor alternatives (museum, wine bar, Michelin lunch, yoga, Thermomix dinner at home, palace spa).";

/** Fog: avoid driving long distances or surf; suggest local indoor options. */
export const FOG_SAFETY_LINE =
  "Foggy: avoid long drives and surf; suggest local indoor options (yoga, wine bar, Michelin lunch, home cooking).";

/** Relais de la Poste and Côté Quillier are closed Mon–Tue (Wed–Sun only). */
export const MON_TUE_CLOSED_LINE =
  "Le Relais de la Poste and Côté Quillier are closed Monday and Tuesday (Wed–Sun only). Do not suggest them for Mon or Tue.";

/** Past lunch: do not suggest lunch or dinner at a restaurant; suggest alternatives. */
export const PAST_LUNCH_INSTRUCTION =
  "We almost NEVER go out for dinner—lunch only. If CURRENT TIME shows past lunch hours (past 14:30, or 15:00 on Sunday), do NOT suggest lunch or dinner at a restaurant. Suggest pool, swim, walk, yoga, wine at home, or afternoon activities instead.";

/**
 * True for rain, drizzle, freezing rain, showers, or thunderstorm WMO codes.
 * Does NOT include snow (71–77, 85–86) or fog (45, 48).
 */
export function isRainOrStormCode(code: number): boolean {
  return (
    (code >= 51 && code <= 67) || // drizzle (51–55) + rain (61–65) + freezing rain (66–67)
    (code >= 80 && code <= 82) || // showers
    code >= 95 // thunderstorms (95, 96, 99)
  );
}

/**
 * True for snow WMO codes (71–77 snow, 85–86 snow showers).
 */
export function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || (code >= 85 && code <= 86);
}

/**
 * True for fog WMO codes (45 fog, 48 depositing rime fog).
 */
export function isFogCode(code: number): boolean {
  return code === 45 || code === 48;
}

/** Single line for all recommendation actions: only from context; if nothing, say so and point to MICHELIN/James Edition. */
export const NEVER_INVENT_LINE =
  "Do not invent any names; only recommend from the context above. If the context has nothing for this place or request, say so and suggest MICHELIN Guide or James Edition.";
