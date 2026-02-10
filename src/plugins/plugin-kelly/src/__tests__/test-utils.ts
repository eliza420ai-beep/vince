/**
 * Test utilities for plugin-kelly.
 * - createMockMessage, createMockState, createMockCallback, createMockRuntime
 * - createMockRuntimeWithService: runtime with full KellyLifestyleService-shaped mock
 * - createMockRuntimeWithComposeState: runtime whose composeState returns kellyContext + weather-shaped values
 * - loadAllowlistFromKnowledge: load allowlist-places.txt or allowlist-wines.txt from fixtures
 */

import type {
  IAgentRuntime,
  Memory,
  State,
  Content,
  UUID,
} from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import * as fs from "fs";

export function createMockMessage(
  text: string,
  options?: { roomId?: UUID; agentId?: UUID },
): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: options?.roomId ?? (uuidv4() as UUID),
    agentId: options?.agentId ?? (uuidv4() as UUID),
    content: { text, source: "test" },
    createdAt: Date.now(),
  };
}

export function createMockState(overrides?: Partial<State>): State {
  return { values: {}, data: {}, text: "", ...overrides };
}

export interface MockCallback {
  (...args: any[]): Promise<void>;
  calls: Content[];
  reset: () => void;
}

export function createMockCallback(): MockCallback {
  const calls: Content[] = [];
  const callback = async (content: Content): Promise<void> => {
    calls.push(content);
  };
  (callback as MockCallback).calls = calls;
  (callback as MockCallback).reset = () => {
    calls.length = 0;
  };
  return callback as MockCallback;
}

/** KellyLifestyleService-shaped mock for handler tests. */
export interface KellyLifestyleServiceMock {
  getCuratedOpenContext: () => {
    restaurants: string[];
    hotels: string[];
    fitnessNote: string;
    rawSection: string;
    palacePoolReopenDates?: Record<string, string>;
  } | null;
  getWellnessTipOfTheDay: () => string;
  getDailyBriefing: () => {
    day: string;
    date: string;
    suggestions: unknown[];
    specialNotes: string[];
  };
  getCurrentSeason?: () => "pool" | "gym";
  getPalacePoolReopenDates?: () => Record<string, string>;
  getPalacePoolStatusLine?: () => string;
  getWineOfTheDay?: () => string;
  getDayTripIdeaOfTheWeek?: () => string;
  getTravelIdeaOfTheWeek?: () => string;
}

const defaultLifestyleServiceMock: KellyLifestyleServiceMock = {
  getCuratedOpenContext: () => ({
    restaurants: ["Maison Devaux | Rion", "Auberge du Lavoir | Garrosse"],
    hotels: ["Relais de la Poste | Magescq"],
    fitnessNote: "Pool Apr-Nov",
    rawSection: "Wed: Maison Devaux",
    palacePoolReopenDates: { Palais: "Feb 12", Caudalie: "Feb 5", Eugenie: "Mar 6" },
  }),
  getWellnessTipOfTheDay: () => "5-min breathwork.",
  getDailyBriefing: () => ({
    day: "wednesday",
    date: "2025-02-05",
    suggestions: [],
    specialNotes: ["Restaurants open today: Maison Devaux."],
  }),
  getCurrentSeason: () => "pool",
  getPalacePoolReopenDates: () => ({ Palais: "Feb 12", Caudalie: "Feb 5", Eugenie: "Mar 6" }),
  getPalacePoolStatusLine: () =>
    "Caudalie: back open (reopened Feb 5), Palais reopens Feb 12, Eugenie reopens Mar 6",
  getWineOfTheDay: () => "Margaux.",
  getDayTripIdeaOfTheWeek: () => "Saint-Émilion for château + lunch.",
  getTravelIdeaOfTheWeek: () => "Saint-Émilion for château + lunch.",
};

/**
 * Create a runtime with a full KellyLifestyleService-shaped mock so handlers get realistic context.
 */
export function createMockRuntimeWithService(
  serviceOverrides?: Partial<KellyLifestyleServiceMock>,
): IAgentRuntime {
  const mock = { ...defaultLifestyleServiceMock, ...serviceOverrides };
  return createMockRuntime({
    getService: (name: string) =>
      name === "KELLY_LIFESTYLE_SERVICE" ? (mock as unknown) : null,
  });
}

/** State values shape from kellyContext + weather (for composeState mocks). */
export interface KellyComposeStateValues {
  kellyDay?: string;
  restaurantsOpenToday?: string[];
  surfBiarritz?: { waveHeight: number; wavePeriod: number; waveDirection: string; seaTemp: number };
  weatherBordeaux?: { condition: string; temp: number };
  weatherBiarritz?: { condition: string; temp: number };
  weatherHome?: { condition: string; temp: number };
  weatherBordeauxBiarritzLine?: string;
  surfBiarritzSummary?: string;
  pastLunch?: boolean;
  [key: string]: unknown;
}

/**
 * Create a runtime whose composeState returns kellyContext + weather-shaped values
 * for tests that assert "recommendation respects open today" or "no beach in storm".
 */
export function createMockRuntimeWithComposeState(
  stateOverrides?: { values?: KellyComposeStateValues; data?: State["data"]; text?: string },
): IAgentRuntime {
  const values: KellyComposeStateValues = {
    kellyDay: "Wednesday",
    restaurantsOpenToday: ["Maison Devaux", "Auberge du Lavoir"],
    weatherBordeaux: { condition: "clear", temp: 18 },
    weatherBiarritz: { condition: "clear", temp: 16 },
    weatherHome: { condition: "clear", temp: 14 },
    weatherBordeauxBiarritzLine: "Bordeaux: clear, 18°C. Biarritz: clear, 16°C.",
    surfBiarritz: { waveHeight: 1.2, wavePeriod: 8, waveDirection: "SW", seaTemp: 15.5 },
    surfBiarritzSummary: "1.2 m, 8 s, SW, sea 15.5 °C.",
    pastLunch: false,
    ...stateOverrides?.values,
  };
  const state: State = {
    values,
    data: stateOverrides?.data ?? {},
    text: stateOverrides?.text ?? "Wednesday. Restaurants open: Maison Devaux. Landes.",
  };
  return createMockRuntime({
    composeState: async () => state,
  });
}

const FIXTURES_DIR = path.join(__dirname, "fixtures");

/**
 * Load allowlist from fixtures for knowledge-grounded tests.
 * category 'places' -> allowlist-places.txt, 'wines' -> allowlist-wines.txt, 'hotels' uses places.
 */
export function loadAllowlistFromKnowledge(
  category: "places" | "wines" | "hotels",
): string[] {
  const file = category === "wines" ? "allowlist-wines.txt" : "allowlist-places.txt";
  const filePath = path.join(FIXTURES_DIR, file);
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function createMockRuntime(overrides?: Partial<IAgentRuntime>): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: { name: "Kelly", bio: "Test" },
    getService: () => null,
    getMemories: async () => [],
    getCache: async () => undefined,
    getConversationLength: () => 10,
    composeState: async () => ({ values: {}, data: {}, text: "" }),
    useModel: async () => "Mock response",
    ...overrides,
  } as unknown as IAgentRuntime;
}
