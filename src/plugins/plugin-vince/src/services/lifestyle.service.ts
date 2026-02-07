/**
 * VINCE Lifestyle Service
 *
 * Daily suggestions based on:
 * - Day of week (trading rhythm)
 * - Season (pool vs gym)
 * - Knowledge base (the-good-life) — curated restaurants open today, hotels by season
 *
 * Focus areas:
 * - Health (swimming, gym, wellness)
 * - Dining (lunch — ONLY curated places open today)
 * - Hotels (midweek escapes — ONLY those open this season)
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type {
  DayOfWeek,
  LifestyleSuggestion,
  DailyBriefing,
} from "../types/index";

const CURATED_SCHEDULE_PATH =
  "knowledge/the-good-life/curated-open-schedule.md";

export interface CuratedOpenContext {
  restaurants: string[];
  hotels: string[];
  fitnessNote: string;
  rawSection: string;
}

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

  /**
   * Load curated restaurants and hotels open today from knowledge base.
   * Source: knowledge/the-good-life/curated-open-schedule.md
   */
  getCuratedOpenContext(day?: DayOfWeek): CuratedOpenContext | null {
    const d = day ?? this.getDayOfWeek();
    const month = this.getMonth();
    const isWinter = month <= 2;

    const fullPath = path.join(process.cwd(), CURATED_SCHEDULE_PATH);
    if (!fs.existsSync(fullPath)) {
      logger.debug("[VinceLifestyle] Curated schedule not found");
      return null;
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const dayCapitalized = d.charAt(0).toUpperCase() + d.slice(1);
      const daySection = this.extractSection(content, `### ${dayCapitalized}`);
      const hotelSection = isWinter
        ? this.extractSection(content, "### Winter (January–February)")
        : this.extractSection(content, "### March–November");
      const fitnessSection = this.extractSection(
        content,
        "## Fitness / Health",
      );

      const restaurants = this.parseRestaurantLines(daySection);
      const hotels = this.parseHotelLines(hotelSection);

      return {
        restaurants,
        hotels,
        fitnessNote:
          fitnessSection?.split("\n").slice(0, 4).join(" ").trim() || "",
        rawSection: [daySection, hotelSection].filter(Boolean).join("\n\n"),
      };
    } catch (e) {
      logger.debug(`[VinceLifestyle] Error loading curated schedule: ${e}`);
      return null;
    }
  }

  private extractSection(content: string, header: string): string {
    const start = content.indexOf(header);
    if (start === -1) return "";
    const afterHeader = content.slice(start + header.length);
    const nextH2 = afterHeader.search(/\n## /);
    const nextH3 = afterHeader.search(/\n### /);
    const end =
      nextH2 === -1 && nextH3 === -1
        ? afterHeader.length
        : Math.min(
            nextH2 === -1 ? Infinity : nextH2,
            nextH3 === -1 ? Infinity : nextH3,
          );
    return afterHeader.slice(0, end).trim();
  }

  private parseRestaurantLines(section: string): string[] {
    const lines = section
      .split("\n")
      .filter((l) => l.trim().startsWith("- **"));
    return lines.map((l) => {
      const match = l.match(/^- \*\*([^*]+)\*\* \| (.+)$/);
      return match
        ? `${match[1]} | ${match[2]}`
        : l.replace(/^-\s*\*\*|\*\*/g, "").trim();
    });
  }

  private parseHotelLines(section: string): string[] {
    const lines = section.split("\n").filter((l) => {
      const t = l.trim();
      return t.startsWith("- ") && t.includes("|") && !t.startsWith("- **");
    });
    return lines.map((l) => l.replace(/^-\s*/, "").trim());
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  private getDayOfWeek(): DayOfWeek {
    const days: DayOfWeek[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
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
        suggestion:
          "Friday Sacred: Strike selection for covered calls / secured puts",
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

  getSuggestionsByCategory(
    category: LifestyleSuggestion["category"],
  ): LifestyleSuggestion[] {
    const briefing = this.getDailyBriefing();
    return briefing.suggestions.filter((s) => s.category === category);
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
