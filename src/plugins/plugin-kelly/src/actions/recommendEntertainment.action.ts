/**
 * KELLY_RECOMMEND_ENTERTAINMENT — books, music, Netflix series, Apple TV movies.
 *
 * Suggests by taste from lifestyle/entertainment-tastes knowledge.
 * One clear pick + one alternative. Supports "something like X" queries
 * via context + WEB_SEARCH fallback note.
 *
 * Music context: Taycan/Burmester/Apple Music or Denon DJ/Bose/Apple Music.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import { NEVER_INVENT_LINE } from "../constants/safety";
import { getVoiceAvoidPromptFragment } from "../constants/voice";

type EntertainmentCategory = "book" | "music" | "series" | "movie" | "general";

const ENTERTAINMENT_TRIGGERS = [
  "recommend a book",
  "book recommendation",
  "what to read",
  "something to read",
  "good book",
  "recommend music",
  "music recommendation",
  "what to listen",
  "something to listen",
  "playlist",
  "recommend a series",
  "series recommendation",
  "what to watch",
  "something to watch",
  "netflix",
  "recommend a movie",
  "movie recommendation",
  "good movie",
  "apple tv",
  "entertainment",
];

const ENTERTAINMENT_KEYWORDS = [
  "book",
  "movie",
  "film",
  "series",
  "show",
  "album",
  "song",
  "watch",
  "read",
  "listen",
  "netflix",
  "tv",
  "music",
  "playlist",
];

function wantsEntertainment(text: string): boolean {
  const lower = text.toLowerCase();
  if (ENTERTAINMENT_TRIGGERS.some((t) => lower.includes(t))) return true;
  // "something like" / "similar to" only with entertainment context
  if (lower.includes("something like") || lower.includes("similar to")) {
    return ENTERTAINMENT_KEYWORDS.some((k) => lower.includes(k));
  }
  return false;
}

function detectCategory(text: string): EntertainmentCategory {
  const lower = text.toLowerCase();
  if (lower.includes("book") || lower.includes("read")) return "book";
  if (
    lower.includes("music") ||
    lower.includes("listen") ||
    lower.includes("playlist") ||
    lower.includes("album") ||
    lower.includes("song") ||
    lower.includes("track")
  )
    return "music";
  if (
    lower.includes("series") ||
    lower.includes("netflix") ||
    lower.includes("show") ||
    lower.includes("tv show")
  )
    return "series";
  if (
    lower.includes("movie") ||
    lower.includes("film") ||
    lower.includes("apple tv")
  )
    return "movie";
  return "general";
}

function getCategoryPromptHint(category: EntertainmentCategory): string {
  switch (category) {
    case "book":
      return "The user wants a **book** recommendation. Suggest by genre and taste from the knowledge.";
    case "music":
      return "The user wants a **music** recommendation. Context: they listen in the **Taycan with Burmester + Apple Music**, or at home with **Denon DJ (Engine DJ) + Bose + Apple Music**. Suggest albums, artists, or playlists that match their taste.";
    case "series":
      return "The user wants a **Netflix series** recommendation. Suggest by genre and taste from the knowledge.";
    case "movie":
      return "The user wants a **movie** (Apple TV or cinema) recommendation. Suggest by genre and taste from the knowledge.";
    case "general":
      return "The user wants an entertainment recommendation. Detect whether they lean book, music, series, or movie from their message, and suggest accordingly.";
  }
}

export const kellyRecommendEntertainmentAction: Action = {
  name: "KELLY_RECOMMEND_ENTERTAINMENT",
  similes: [
    "RECOMMEND_BOOK",
    "RECOMMEND_MUSIC",
    "RECOMMEND_SERIES",
    "RECOMMEND_MOVIE",
    "ENTERTAINMENT",
    "NETFLIX",
    "APPLE_TV",
  ],
  description:
    "Recommend books, music, Netflix series, or Apple TV movies by taste. One pick + one alternative from lifestyle/entertainment-tastes. Supports 'something like X' queries.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsEntertainment(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_ENTERTAINMENT] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const category = detectCategory(userAsk);
      const categoryHint = getCategoryPromptHint(category);
      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 10000);

      // Detect "something like X" pattern
      const likMatch = userAsk.match(
        /(?:something like|similar to|like|more of)\s+["']?([^"'?.]+)/i,
      );
      const likeReference = likMatch?.[1]?.trim() ?? null;
      const likeHint = likeReference
        ? `The user wants something **like "${likeReference}"**. Match the tone, genre, or vibe of that reference. If the knowledge doesn't have enough, note that WEB_SEARCH could help find more options.`
        : "";

      const prompt = `You are Kelly, a concierge. The user wants an entertainment recommendation.

"${userAsk}"

${categoryHint}
${likeHint}

Use ONLY the following context (lifestyle/entertainment-tastes and any preferences). ${NEVER_INVENT_LINE}

<context>
${knowledgeSnippet}
</context>

Rules:
- **Books:** Genres and favorites from entertainment-tastes. Name the book and author.
- **Music:** Listening contexts matter — Taycan + Burmester + Apple Music (driving), Denon DJ + Bose + Apple Music (home). Name album or artist. Genre and vibe.
- **Netflix series:** Name the series, genre, one-line why.
- **Movies (Apple TV / cinema):** Name the film, genre, one-line why.
- For "something like X": match the vibe, genre, or feeling of X. If X is not in the knowledge, give your best match and mention they could search for more.
- One pick + one alternative. Be specific — title, artist/author, one-line why.
- Match their taste: if you have preference data from context, use it.

Output exactly:
1. **Pick:** [Title] by [Author/Artist] — one sentence why. One sentence about the vibe or when to enjoy it.
2. **Alternative:** [Title] by [Author/Artist] — one sentence why.

Output only the recommendation text, no XML or extra commentary.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const categoryLabel =
        category === "general"
          ? "entertainment"
          : category === "series"
            ? "series"
            : `${category}`;
      const out = text
        ? `Here's a ${categoryLabel} pick—\n\n` + text
        : `I don't have a specific ${categoryLabel} pick for that right now. Try being more specific about genre or mood.`;
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_ENTERTAINMENT"],
      });

      logger.info("[KELLY_RECOMMEND_ENTERTAINMENT] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_ENTERTAINMENT] Error: ${error}`);
      await callback({
        text: "Entertainment recommendation failed. Try asking for a specific type — book, music, series, or movie.",
        actions: ["KELLY_RECOMMEND_ENTERTAINMENT"],
      });
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Recommend a book to read" } },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_ENTERTAINMENT for a book pick by taste.",
          actions: ["KELLY_RECOMMEND_ENTERTAINMENT"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Something to watch on Netflix tonight" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_ENTERTAINMENT for a Netflix series pick.",
          actions: ["KELLY_RECOMMEND_ENTERTAINMENT"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Music for the Taycan — something like Bonobo" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_ENTERTAINMENT for a music pick matching that vibe.",
          actions: ["KELLY_RECOMMEND_ENTERTAINMENT"],
        },
      },
    ],
  ],
};
