/**
 * Kelly Lifestyle Service
 *
 * Daily suggestions: health, dining, hotels, wellness.
 * No trading; concierge-only. Uses knowledge/the-good-life curated-open-schedule.
 */

import { Service, type IAgentRuntime, logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import type {
  DayOfWeek,
  LifestyleSuggestion,
  DailyBriefing,
} from "../types.ts";

const CURATED_SCHEDULE_PATH =
  "knowledge/the-good-life/curated-open-schedule.md";

export interface CuratedOpenContext {
  restaurants: string[];
  hotels: string[];
  fitnessNote: string;
  rawSection: string;
  palacePoolReopenDates?: Record<string, string>;
}

export class KellyLifestyleService extends Service {
  static serviceType = "KELLY_LIFESTYLE_SERVICE";
  capabilityDescription =
    "Daily lifestyle suggestions: health, dining, hotels, wellness";

  constructor(protected runtime: IAgentRuntime) {
    super();
  }

  static async start(runtime: IAgentRuntime): Promise<KellyLifestyleService> {
    const service = new KellyLifestyleService(runtime);
    service.validateCuratedScheduleStructure();
    logger.debug("[KellyLifestyle] Service initialized");
    return service;
  }

  /** Optional: validate that curated-open-schedule has required sections; log warning if not. */
  private validateCuratedScheduleStructure(): void {
    const fullPath = path.join(process.cwd(), CURATED_SCHEDULE_PATH);
    if (!fs.existsSync(fullPath)) return;
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const required = ["## Restaurants by Day", "## Hotels by Season", "## Fitness / Health"];
      const missing = required.filter((s) => !content.includes(s));
      if (missing.length > 0) {
        logger.warn("[KellyLifestyle] Curated schedule missing sections: " + missing.join(", "));
      }
    } catch {
      // ignore
    }
  }

  async stop(): Promise<void> {
    logger.info("[KellyLifestyle] Service stopped");
  }

  getCuratedOpenContext(day?: DayOfWeek, monthOverride?: number): CuratedOpenContext | null {
    const d = day ?? this.getDayOfWeek();
    const month = monthOverride ?? this.getMonth();
    const isWinter = month <= 2;

    const fullPath = path.join(process.cwd(), CURATED_SCHEDULE_PATH);
    if (!fs.existsSync(fullPath)) {
      logger.warn("[KellyLifestyle] Curated schedule file missing: " + CURATED_SCHEDULE_PATH);
      return null;
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (!content || !content.trim()) {
        logger.warn("[KellyLifestyle] Curated schedule file is empty: " + CURATED_SCHEDULE_PATH);
        return null;
      }
      // Expected structure: ## Restaurants by Day, ### Monday … ### Sunday; ## Hotels by Season, ### Winter / ### March–November; ## Fitness / Health.
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

      const palacePoolReopenDates = isWinter ? this.parsePalacePoolReopenDates(content) : undefined;

      return {
        restaurants,
        hotels,
        fitnessNote:
          fitnessSection?.split("\n").slice(0, 4).join(" ").trim() || "",
        rawSection: [daySection, hotelSection].filter(Boolean).join("\n\n"),
        palacePoolReopenDates,
      };
    } catch (e) {
      logger.debug(`[KellyLifestyle] Error loading curated schedule: ${e}`);
      return null;
    }
  }

  /** Returns palace indoor pool reopen dates (e.g. Palais Feb 12, Caudalie Feb 5, Eugenie Mar 6). From curated-open-schedule or fallback constant. */
  getPalacePoolReopenDates(): Record<string, string> {
    const fullPath = path.join(process.cwd(), CURATED_SCHEDULE_PATH);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, "utf-8");
        const parsed = this.parsePalacePoolReopenDates(content);
        if (Object.keys(parsed).length > 0) return parsed;
      } catch {
        // fallback
      }
    }
    return { Palais: "Feb 12", Caudalie: "Feb 5", Eugenie: "Mar 6" };
  }

  /** Parse "Feb 5" or "Mar 6" into a Date (current year). Returns null if unparseable. */
  private parseReopenDate(dateStr: string): Date | null {
    const months: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      January: 0, February: 1, March: 2, April: 3, June: 5,
      July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
    };
    const m = dateStr.match(/^(\w+)\s+(\d+)/i);
    if (!m) return null;
    const month = months[m[1]];
    const day = parseInt(m[2], 10);
    if (month === undefined || isNaN(day) || day < 1 || day > 31) return null;
    const year = new Date().getFullYear();
    return new Date(year, month, day);
  }

  /** Returns date-aware palace pool status: "X: back open" when past reopen date, "X reopens [date]" when future. */
  getPalacePoolStatusLine(asOf?: Date): string {
    const dates = this.getPalacePoolReopenDates();
    const now = asOf ?? new Date();
    const parts: string[] = [];
    const labels: Record<string, string> = {
      Palais: "Palais",
      Caudalie: "Caudalie",
      Eugenie: "Eugenie",
    };
    for (const [key, dateStr] of Object.entries(dates)) {
      const label = labels[key] ?? key;
      const d = this.parseReopenDate(dateStr);
      if (d && now >= d) {
        parts.push(`${label}: back open (reopened ${dateStr})`);
      } else {
        parts.push(`${label} reopens ${dateStr}`);
      }
    }
    return parts.length > 0 ? parts.join(", ") : "Palais reopens Feb 12, Caudalie Feb 5, Eugenie Mar 6";
  }

  /** Parse "Palace indoor pools (winter swim)" subsection for "reopens Feb 12" etc. */
  private parsePalacePoolReopenDates(content: string): Record<string, string> {
    const subsection = this.extractSection(content, "**Palace indoor pools (winter swim)**");
    if (!subsection) return {};
    const out: Record<string, string> = {};
    const re = /reopens\s+(\w+\s+\d+)/i;
    const lines = subsection.split("\n");
    for (const line of lines) {
      const match = line.match(re);
      if (match) {
        const dateStr = match[1] ?? match[0].replace(/reopens\s+/i, "").trim();
        if (line.includes("Palais")) out.Palais = dateStr;
        else if (line.includes("Caudalie")) out.Caudalie = dateStr;
        else if (line.includes("Eugénie") || line.includes("Eugenie")) out.Eugenie = dateStr;
      }
    }
    return out;
  }

  /** Restaurants open on the given day (from curated-open-schedule). */
  getRestaurantsOpenToday(day?: DayOfWeek): string[] {
    return this.getCuratedOpenContext(day)?.restaurants ?? [];
  }

  /** Hotels for the given month (winter vs March–November). */
  getHotelsThisSeason(month?: number): string[] {
    return this.getCuratedOpenContext(undefined, month)?.hotels ?? [];
  }

  /** Extract text under a given header until the next ## or ###. Sections are delimited by \n## or \n###. */
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

  /** Parse restaurant lines: each line starts with "- **Name** | Location | Hours | ...". Returns "Name | Location | ..." strings. */
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

  /** Parse hotel lines: bullet lines with "|" that are not bold (format "- Hotel Name | Location | ..."). */
  private parseHotelLines(section: string): string[] {
    const lines = section.split("\n").filter((l) => {
      const t = l.trim();
      return t.startsWith("- ") && t.includes("|") && !t.startsWith("- **");
    });
    return lines.map((l) => l.replace(/^-\s*/, "").trim());
  }

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
    return new Date().getMonth() + 1;
  }

  private isPoolSeason(): boolean {
    const month = this.getMonth();
    return month >= 4 && month <= 11;
  }

  private getHealthSuggestions(): LifestyleSuggestion[] {
    const suggestions: LifestyleSuggestion[] = [];
    const day = this.getDayOfWeek();

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
        suggestion: "Gastronomic lunch to close the week",
        reason: "Friday — we go out for lunch, not dinner; dinner at home",
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

  /** Activity suggestions only (no trading). Wellness and midweek focus. */
  private getActivitySuggestions(): LifestyleSuggestion[] {
    const suggestions: LifestyleSuggestion[] = [];
    const day = this.getDayOfWeek();

    if (day === "friday") {
      suggestions.push({
        category: "activity",
        suggestion: "Focus on wellness and a great lunch to close the week; dinner at home",
        reason: "Friday — wind down, pool or gym, lunch out; we do dinner at home",
        priority: 1,
        daySpecific: true,
      });
    } else if (day === "wednesday") {
      suggestions.push({
        category: "activity",
        suggestion: "Midweek escape day — hotel and lunch (we go out for lunch, not dinner)",
        reason: "Optimal day for a 5-star stay and a restaurant lunch",
        priority: 1,
        daySpecific: true,
      });
    }

    return suggestions;
  }

  getDailyBriefing(): DailyBriefing {
    const day = this.getDayOfWeek();
    const date = new Date().toISOString().split("T")[0];

    const allSuggestions: LifestyleSuggestion[] = [
      ...this.getActivitySuggestions(),
      ...this.getHealthSuggestions(),
      ...this.getDiningSuggestions(),
      ...this.getHotelSuggestions(),
    ];

    allSuggestions.sort((a, b) => a.priority - b.priority);

    const specialNotes: string[] = [];

    if (this.isPoolSeason()) {
      specialNotes.push("Pool season active (Apr-Nov)");
    } else {
      specialNotes.push("Gym season active (Dec-Mar)");
    }

    if (day === "wednesday") {
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

  getCurrentSeason(): "pool" | "gym" {
    return this.isPoolSeason() ? "pool" : "gym";
  }

  /** One short wellness or fitness tip, rotated by day so it varies. */
  getWellnessTipOfTheDay(): string {
    const tips = [
      "5-min journaling: write 3 things that went well today.",
      "Box breathing (4-4-4-4): inhale, hold, exhale, hold—activates calm.",
      "Legs up the wall (5 min): passive inversion for recovery.",
      "No screens 30 min before bed—melatonin needs the break.",
      "10-min Yin: pigeon, thread the needle, seated twist.",
      "Cool room (18–19°C) for sleep—core temp drop triggers rest.",
      "10 deep breaths: simple but effective. Focus only on the breath.",
      "Cat-Cow + Child's Pose (5 min): gentle spinal mobility before bed.",
      "Gratitude moment: name 3 specific good things from today.",
      "Sun Salutation A (3 rounds): full body activation in under 10 minutes.",
      "Warm lemon water first thing—gentle reset after sleep.",
      "Aim for eight hours; a cool, dark room helps the body drop into rest.",
      "Functional fitness: stay mobile, flexible, and strong—not bulky—for the long run.",
      "Stretch daily; it's one of the keys to performing well for decades.",
      "When the day's good, move first—swim or surf—then refuel with a proper breakfast.",
      "Mental health is longevity: a few minutes of reflection or journaling pays off for years.",
      "Recovery is part of the plan: sleep, nutrition, and listening to your body.",
    ];
    const dayOfWeek = new Date().getDay();
    const dayOfMonth = new Date().getDate();
    const index = (dayOfWeek * 7 + dayOfMonth) % tips.length;
    return tips[index] ?? tips[0];
  }

  /** Wine of the day — region or bottle idea, rotated by day of week (the-good-life regions). */
  getWineOfTheDay(): string {
    const wines = [
      "Margaux (Bordeaux) — classic left bank.",
      "Sancerre (Loire) — crisp, mineral.",
      "Chablis (Burgundy) — steely Chardonnay.",
      "Châteauneuf-du-Pape (Rhône) — full-bodied red.",
      "Champagne — any day.",
      "Saint-Émilion (Bordeaux) — right bank elegance.",
      "South African Chenin or Pinotage — discovery.",
    ];
    const dayOfWeek = new Date().getDay();
    return wines[dayOfWeek] ?? wines[0];
  }

  /** Day trip idea of the week. We live in SW France: only suggest day trips within Bordeaux–Biarritz, max 1h north of Bordeaux, or max 1h south of Biarritz. */
  getDayTripIdeaOfTheWeek(): string {
    const ideas = [
      "Saint-Émilion: château visit + Michelin lunch (within 1h Bordeaux).",
      "Arcachon basin: Cap Ferret or Dune du Pilat + lunch (Bordeaux–Biarritz corridor).",
      "Biarritz to Guéthary: coast drive + lunch (south of Biarritz, max 1h).",
      "Pays Basque interior: Espelette or Saint-Jean-Pied-de-Port for lunch (day trip from Biarritz).",
    ];
    const weekOfMonth = Math.min(
      3,
      Math.floor((new Date().getDate() - 1) / 7),
    );
    return ideas[weekOfMonth] ?? ideas[0];
  }

  /** @deprecated Use getDayTripIdeaOfTheWeek. Kept for backward compatibility. */
  getTravelIdeaOfTheWeek(): string {
    return this.getDayTripIdeaOfTheWeek();
  }
}
