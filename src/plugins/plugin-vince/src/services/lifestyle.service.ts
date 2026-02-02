/**
 * VINCE Lifestyle Service
 *
 * Daily suggestions based on:
 * - Day of week (trading rhythm)
 * - Season (pool vs gym)
 * - Knowledge base (the-good-life)
 *
 * Focus areas:
 * - Health (swimming, gym, wellness)
 * - Dining (lunch recommendations)
 * - Hotels (midweek escapes - Wed preferred)
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import type { DayOfWeek, LifestyleSuggestion, DailyBriefing } from "../types/index";

export class VinceLifestyleService extends Service {
  static serviceType = "VINCE_LIFESTYLE_SERVICE";
  capabilityDescription = "Daily lifestyle suggestions: health, dining, hotels";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<VinceLifestyleService> {
    const service = new VinceLifestyleService(runtime);
    logger.debug("[VinceLifestyle] Service initialized");
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[VinceLifestyle] Service stopped");
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private getDayOfWeek(): DayOfWeek {
    const days: DayOfWeek[] = [
      "sunday", "monday", "tuesday", "wednesday", 
      "thursday", "friday", "saturday"
    ];
    return days[new Date().getDay()];
  }

  private getMonth(): number {
    return new Date().getMonth() + 1; // 1-12
  }

  private isPoolSeason(): boolean {
    const month = this.getMonth();
    return month >= 4 && month <= 11; // April to November
  }

  private isGymSeason(): boolean {
    return !this.isPoolSeason();
  }

  // ==========================================
  // Suggestion Generation
  // ==========================================

  private getHealthSuggestions(): LifestyleSuggestion[] {
    const suggestions: LifestyleSuggestion[] = [];
    const day = this.getDayOfWeek();

    // Swimming/gym based on season
    if (this.isPoolSeason()) {
      suggestions.push({
        category: "health",
        suggestion: "Pool session this morning",
        reason: "Pool season (Apr-Nov) - outdoor swimming available",
        priority: 1,
        daySpecific: false,
      });
    } else {
      suggestions.push({
        category: "health",
        suggestion: "Gym session this morning",
        reason: "Gym season (Dec-Mar) - indoor training",
        priority: 1,
        daySpecific: false,
      });
    }

    // Day-specific suggestions
    if (day === "monday") {
      suggestions.push({
        category: "health",
        suggestion: "Start the week with mobility work",
        reason: "Monday reset - ease into the week",
        priority: 2,
        daySpecific: true,
      });
    } else if (day === "saturday" || day === "sunday") {
      suggestions.push({
        category: "health",
        suggestion: "Rest day or light activity",
        reason: "Weekend recovery",
        priority: 2,
        daySpecific: true,
      });
    }

    return suggestions;
  }

  private getDiningSuggestions(): LifestyleSuggestion[] {
    const suggestions: LifestyleSuggestion[] = [];
    const day = this.getDayOfWeek();

    // Gastronomic days (Tuesday, Thursday)
    if (day === "tuesday" || day === "thursday") {
      suggestions.push({
        category: "dining",
        suggestion: "Consider a gastronomic lunch",
        reason: "Gastronomic dining day - Tuesday or Thursday",
        priority: 1,
        daySpecific: true,
      });
    } else if (day === "friday") {
      suggestions.push({
        category: "dining",
        suggestion: "Light lunch - focus on strike selection",
        reason: "Friday sacred - options focus",
        priority: 2,
        daySpecific: true,
      });
    } else {
      suggestions.push({
        category: "dining",
        suggestion: "Simple, healthy lunch",
        reason: "Regular day - keep it light",
        priority: 3,
        daySpecific: false,
      });
    }

    return suggestions;
  }

  private getHotelSuggestions(): LifestyleSuggestion[] {
    const suggestions: LifestyleSuggestion[] = [];
    const day = this.getDayOfWeek();

    // Midweek hotel escape (Wednesday preferred)
    if (day === "wednesday") {
      suggestions.push({
        category: "hotel",
        suggestion: "Perfect day for a midweek 5-star escape",
        reason: "Wednesday is the optimal day for midweek hotel stays",
        priority: 1,
        daySpecific: true,
      });
    } else if (day === "tuesday") {
      suggestions.push({
        category: "hotel",
        suggestion: "Consider booking a midweek stay for tomorrow",
        reason: "Planning ahead for Wednesday escape",
        priority: 2,
        daySpecific: true,
      });
    } else if (day === "saturday" || day === "sunday") {
      suggestions.push({
        category: "hotel",
        suggestion: "Stay home - weekend hotels are crowded and overpriced",
        reason: "Never book weekend stays - midweek only",
        priority: 3,
        daySpecific: true,
      });
    }

    return suggestions;
  }

  private getTradingSuggestions(): LifestyleSuggestion[] {
    const suggestions: LifestyleSuggestion[] = [];
    const day = this.getDayOfWeek();

    if (day === "friday") {
      suggestions.push({
        category: "activity",
        suggestion: "Friday Sacred: Strike selection for covered calls / secured puts",
        reason: "Weekly options expiry - review and roll positions",
        priority: 1,
        daySpecific: true,
      });
    } else if (day === "monday") {
      suggestions.push({
        category: "activity",
        suggestion: "Monday altcoin review: ETH, SOL, HYPE",
        reason: "Weekly altcoin assessment - mostly watch, rarely buy",
        priority: 1,
        daySpecific: true,
      });
    }

    return suggestions;
  }

  // ==========================================
  // Public API
  // ==========================================

  getDailyBriefing(): DailyBriefing {
    const day = this.getDayOfWeek();
    const date = new Date().toISOString().split("T")[0];

    const allSuggestions: LifestyleSuggestion[] = [
      ...this.getTradingSuggestions(),
      ...this.getHealthSuggestions(),
      ...this.getDiningSuggestions(),
      ...this.getHotelSuggestions(),
    ];

    // Sort by priority
    allSuggestions.sort((a, b) => a.priority - b.priority);

    const specialNotes: string[] = [];

    // Add seasonal note
    if (this.isPoolSeason()) {
      specialNotes.push("Pool season active (Apr-Nov)");
    } else {
      specialNotes.push("Gym season active (Dec-Mar)");
    }

    // Add day-specific note
    if (day === "friday") {
      specialNotes.push("FRIDAY SACRED - Options focus");
    } else if (day === "wednesday") {
      specialNotes.push("Optimal midweek escape day");
    }

    return {
      day,
      date,
      suggestions: allSuggestions,
      specialNotes,
    };
  }

  getSuggestionsByCategory(category: LifestyleSuggestion["category"]): LifestyleSuggestion[] {
    const briefing = this.getDailyBriefing();
    return briefing.suggestions.filter(s => s.category === category);
  }

  getTopSuggestions(limit: number = 3): LifestyleSuggestion[] {
    const briefing = this.getDailyBriefing();
    return briefing.suggestions.slice(0, limit);
  }

  isPoolSeason_public(): boolean {
    return this.isPoolSeason();
  }

  getCurrentSeason(): "pool" | "gym" {
    return this.isPoolSeason() ? "pool" : "gym";
  }
}
