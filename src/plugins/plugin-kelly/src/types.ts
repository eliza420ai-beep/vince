/**
 * Plugin-Kelly lifestyle types.
 * DayOfWeek, LifestyleSuggestion, DailyBriefing, CuratedOpenContext.
 */

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
}
