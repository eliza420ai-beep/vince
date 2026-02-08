/**
 * Lifestyle Feedback Evaluator
 *
 * When the user gives feedback about a place (loved it, didn't work, too loud, etc.),
 * extract it and store as a fact so Kelly can use it in future recommendations.
 */

import type { Evaluator, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";

const FEEDBACK_SIGNALS = [
  "loved it",
  "didn't work",
  "didn't work out",
  "too loud",
  "perfect",
  "wasn't a fan",
  "we'll go back",
  "won't go again",
  "was great",
  "was amazing",
  "not for us",
  "too far",
  "wrong vibe",
  "perfect for",
  "ideal for",
  "recommend that",
  "would skip",
  "can skip",
  "quiet",
  "quieter",
  "noisy",
  "too noisy",
];

function hasFeedbackSignal(text: string): boolean {
  const lower = text.toLowerCase();
  return FEEDBACK_SIGNALS.some((s) => lower.includes(s));
}

function validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
  const name = (runtime.character?.name ?? "").toUpperCase();
  if (name !== "KELLY") return Promise.resolve(false);

  return runtime
    .getMemories({
      tableName: "messages",
      roomId: message.roomId,
      count: 5,
      unique: false,
    })
    .then((messages) => {
      const recentText = messages
        .map((m) => m.content?.text ?? "")
        .join(" ")
        .toLowerCase();
      return hasFeedbackSignal(recentText);
    })
    .catch(() => false);
}

interface ExtractedFeedback {
  placeName?: string;
  category?: "hotel" | "restaurant" | "wine" | "activity";
  sentiment: "positive" | "negative" | "neutral";
  reason?: string;
  /** Preferred cuisine from freeform feedback (e.g. "French", "Japanese"). */
  preferredCuisine?: string | null;
  /** Preferred vibe: quiet vs lively. */
  preferredVibe?: "quiet" | "lively" | null;
  /** Tags for filtering: hotel, restaurant, wine, activity, liked, disliked. */
  tags?: string[] | null;
}

function formatFact(fb: ExtractedFeedback): string {
  const place = fb.placeName?.trim() ? ` ${fb.placeName}` : "";
  const cat = fb.category ? ` (${fb.category})` : "";
  const parts: string[] = [];
  if (fb.sentiment === "positive") {
    parts.push(`User loved${place}${cat}.${fb.reason ? ` ${fb.reason}` : ""}`.trim());
  } else if (fb.sentiment === "negative") {
    const reason = fb.reason ?? "prefer something different next time";
    parts.push(`User said${place}${cat} was not a fit; ${reason}`.trim());
  } else if (fb.reason) {
    parts.push(`User preference: ${fb.reason}`.trim());
  }
  if (fb.preferredCuisine?.trim()) parts.push(`Preferred cuisine: ${fb.preferredCuisine.trim()}.`);
  if (fb.preferredVibe === "quiet") parts.push("User prefers quieter spots.");
  if (fb.preferredVibe === "lively") parts.push("User prefers livelier spots.");
  return parts.join(" ");
}

function getTags(fb: ExtractedFeedback): string[] {
  const tags: string[] = [];
  if (fb.category) tags.push(fb.category);
  if (fb.sentiment === "positive") tags.push("liked");
  if (fb.sentiment === "negative") tags.push("disliked");
  if (fb.tags?.length) tags.push(...fb.tags);
  return [...new Set(tags)];
}

async function handler(
  runtime: IAgentRuntime,
  message: Memory,
  _state?: State,
): Promise<void> {
  const { agentId, roomId } = message;
  if (!agentId || !roomId) return;

  const messages = await runtime.getMemories({
    tableName: "messages",
    roomId,
    count: 5,
    unique: false,
  });

  const conversationText = messages
    .map((m) => {
      const from = m.entityId === agentId ? "Kelly" : "User";
      return `${from}: ${m.content?.text ?? ""}`;
    })
    .join("\n");

  const prompt = `You are extracting lifestyle feedback from a short conversation between User and Kelly (concierge for hotels, restaurants, wine, fitness).

Conversation:
${conversationText}

If the user gave feedback about a place or preference, output a single JSON object. Extract:
- placeName, category (hotel|restaurant|wine|activity), sentiment (positive|negative|neutral), reason
- preferredCuisine: when they mention a cuisine they like (e.g. French, Japanese)
- preferredVibe: "quiet" or "lively" when they say too loud, want quieter, love the energy, etc.
- tags: array of any of hotel, restaurant, wine, activity, liked, disliked

Shape (use null for missing): {"placeName": string|null, "category": "hotel"|"restaurant"|"wine"|"activity"|null, "sentiment": "positive"|"negative"|"neutral", "reason": string|null, "preferredCuisine": string|null, "preferredVibe": "quiet"|"lively"|null, "tags": string[]|null}

If there is no clear feedback, output: {"sentiment": "neutral", "placeName": null, "category": null, "reason": null, "preferredCuisine": null, "preferredVibe": null, "tags": null}

Output only the JSON object, no other text.`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
    const raw = String(response).trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : raw;
    const parsed = JSON.parse(jsonStr) as ExtractedFeedback;

    if (parsed.sentiment === "neutral" && !parsed.placeName && !parsed.reason) {
      logger.debug("[LifestyleFeedback] No extractable feedback");
      return;
    }

    const factText = formatFact(parsed);
    if (!factText) return;

    const tags = getTags(parsed);
    const memory = {
      entityId: agentId,
      agentId,
      content: {
        text: factText,
        ...(tags.length > 0 && { tags }),
        ...(parsed.preferredCuisine?.trim() && { preferredCuisine: parsed.preferredCuisine.trim() }),
        ...(parsed.preferredVibe && { preferredVibe: parsed.preferredVibe }),
      },
      roomId,
      createdAt: Date.now(),
    };

    const id = await runtime.createMemory(memory, "facts", true);
    await runtime.queueEmbeddingGeneration?.(
      { ...memory, id },
      "low",
    ).catch(() => {});

    logger.info(`[LifestyleFeedback] Stored fact: ${factText}`);
  } catch (e) {
    logger.debug(`[LifestyleFeedback] Extract or store failed: ${e}`);
  }
}

export const lifestyleFeedbackEvaluator: Evaluator = {
  name: "LIFESTYLE_FEEDBACK",
  similes: ["LIFESTYLE_PREFERENCE", "RECOMMENDATION_FEEDBACK"],
  description:
    "Extract user feedback about hotels, restaurants, or places and store as facts for future recommendations.",
  validate,
  handler,
  examples: [],
};
