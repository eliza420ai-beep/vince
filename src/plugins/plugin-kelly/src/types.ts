/**
 * Plugin-Kelly lifestyle types.
 * DayOfWeek, LifestyleSuggestion, DailyBriefing, CuratedOpenContext.
 * SurfBiarritzValue and WeatherBiarritzValue are shared between the surf action and weather provider.
 */

/** Surf conditions for Biarritz: used by KELLY_SURF_FORECAST and WEATHER provider. */
export interface SurfBiarritzValue {
  waveHeight: number;
  wavePeriod: number;
  waveDirection: string;
  seaTemp: number;
}

/** Weather at Biarritz: condition label, temp °C, Open-Meteo code. Used by WEATHER provider and state. */
export interface WeatherBiarritzValue {
  condition: string;
  temp: number;
  code: number;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface LifestyleSuggestion {
  category: "health" | "dining" | "hotel" | "activity";
  suggestion: string;
  reason: string;
  priority: number;
  daySpecific: boolean;
}

export interface DailyBriefing {
  day: DayOfWeek;
  date: string;
  suggestions: LifestyleSuggestion[];
  specialNotes: string[];
}

export interface CuratedOpenContext {
  restaurants: string[];
  hotels: string[];
  fitnessNote: string;
  rawSection: string;
  /** Winter only: palace indoor pool reopen dates, e.g. { Palais: "Feb 12", Caudalie: "Feb 5", Eugenie: "Mar 6" }. */
  palacePoolReopenDates?: Record<string, string>;
}
