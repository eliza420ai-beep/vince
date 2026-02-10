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

/** Relais de la Poste and Côté Quillier are closed Mon–Tue (Wed–Sun only). */
export const MON_TUE_CLOSED_LINE =
  "Le Relais de la Poste and Côté Quillier are closed Monday and Tuesday (Wed–Sun only). Do not suggest them for Mon or Tue.";

/** Past lunch: do not suggest lunch or dinner at a restaurant; suggest alternatives. */
export const PAST_LUNCH_INSTRUCTION =
  "We almost NEVER go out for dinner—lunch only. If CURRENT TIME shows past lunch hours (past 14:30, or 15:00 on Sunday), do NOT suggest lunch or dinner at a restaurant. Suggest pool, swim, walk, yoga, wine at home, or afternoon activities instead.";

/** Single line for all recommendation actions: only from context; if nothing, say so and point to MICHELIN/James Edition. */
export const NEVER_INVENT_LINE =
  "Do not invent any names; only recommend from the context above. If the context has nothing for this place or request, say so and suggest MICHELIN Guide or James Edition.";
