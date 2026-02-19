/**
 * KELLY_RECOMMEND_CREATIVE — tips for creative practice: oil painting,
 * photography (Hasselblad, Fuji, Capture One), house music (Ableton, Push 3),
 * cinema (Blackmagic, DaVinci Resolve, IRIX), Blender + Claude MCP.
 *
 * Uses lifestyle/creative-practice and creative-production knowledge.
 * One concrete tip + one alternative or next step.
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

type CreativeDomain =
  | "painting"
  | "photography"
  | "music"
  | "cinema"
  | "blender"
  | "general";

const CREATIVE_TRIGGERS = [
  "oil painting",
  "painting tips",
  "canvas",
  "start painting",
  "get good at painting",
  "hasselblad",
  "fuji",
  "capture one",
  "film photography",
  "analog photography",
  "medium format",
  "color grading",
  "ableton",
  "push 3",
  "house music",
  "music production",
  "make music",
  "produce music",
  "blackmagic",
  "bmpcc",
  "davinci resolve",
  "resolve",
  "irix",
  "cinema camera",
  "filmmaking",
  "blender",
  "mcp server",
  "claude desktop",
  "creative tips",
  "creative practice",
];

function wantsCreative(text: string): boolean {
  const lower = text.toLowerCase();
  return CREATIVE_TRIGGERS.some((t) => lower.includes(t));
}

function detectDomain(text: string): CreativeDomain {
  const lower = text.toLowerCase();
  if (
    lower.includes("paint") ||
    lower.includes("canvas") ||
    lower.includes("oil")
  )
    return "painting";
  if (
    lower.includes("hasselblad") ||
    lower.includes("fuji") ||
    lower.includes("capture one") ||
    lower.includes("photo") ||
    lower.includes("medium format") ||
    lower.includes("film photography") ||
    lower.includes("analog")
  )
    return "photography";
  if (
    lower.includes("ableton") ||
    lower.includes("push 3") ||
    lower.includes("push3") ||
    lower.includes("house music") ||
    lower.includes("music production") ||
    lower.includes("produce music") ||
    lower.includes("make music")
  )
    return "music";
  if (
    lower.includes("blackmagic") ||
    lower.includes("bmpcc") ||
    lower.includes("resolve") ||
    lower.includes("davinci") ||
    lower.includes("irix") ||
    lower.includes("cinema camera") ||
    lower.includes("filmmaking")
  )
    return "cinema";
  if (
    lower.includes("blender") ||
    lower.includes("mcp") ||
    lower.includes("claude desktop")
  )
    return "blender";
  return "general";
}

function getDomainHint(domain: CreativeDomain): string {
  switch (domain) {
    case "painting":
      return "The user wants **oil painting** tips. Use creative-practice and creative-production/oil-painting. Getting started: materials, technique, practice routine. Getting good: composition, color mixing, light.";
    case "photography":
      return "The user wants **photography** tips. Gear: **Hasselblad H2** + **555 ELD** (digital back coming), **Fuji** for slow shutter, **Capture One Pro** for color grading. Use creative-practice and creative-production/hasselblad-fuji-capture-one.";
    case "music":
      return "The user wants **house music production** tips. Setup: **Ableton Live + Push 3**. Use creative-practice and creative-production/ableton-push-3. Include AI/MCP workflow tips when relevant.";
    case "cinema":
      return "The user wants **cinema/filmmaking** tips. Gear: **Blackmagic Cinema Camera 6K**, **DaVinci Resolve**, **IRIX** lenses (15mm, 45mm T1.5, 150mm T3.0). Use creative-practice and creative-production/blackmagic-design, davinci-resolve.";
    case "blender":
      return "The user wants tips on **Blender + Claude Desktop App via MCP server**. Use creative-practice and creative-production/blender-claude-mcp. Focus on the MCP integration workflow.";
    case "general":
      return "The user wants creative practice tips. Detect their area from the message and give concrete advice from creative-practice and creative-production.";
  }
}

export const kellyRecommendCreativeAction: Action = {
  name: "KELLY_RECOMMEND_CREATIVE",
  similes: [
    "CREATIVE_TIPS",
    "PAINTING_TIPS",
    "PHOTOGRAPHY_TIPS",
    "MUSIC_PRODUCTION",
    "CINEMA_TIPS",
    "BLENDER_TIPS",
  ],
  description:
    "Tips for creative practice: oil painting, photography (Hasselblad/Fuji/Capture One), house music (Ableton/Push 3), cinema (Blackmagic/Resolve/IRIX), Blender + Claude MCP. One concrete tip + one next step.",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsCreative(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void> => {
    logger.debug("[KELLY_RECOMMEND_CREATIVE] Action fired");
    try {
      const userAsk = (message.content?.text ?? "").trim();
      const domain = detectDomain(userAsk);
      const domainHint = getDomainHint(domain);
      const state = await runtime.composeState(message);

      const contextBlock =
        typeof state.text === "string"
          ? state.text
          : [state.text].filter(Boolean).join("\n");
      const knowledgeSnippet = contextBlock.slice(0, 12000);

      const prompt = `You are Kelly, a concierge. The user wants creative practice tips.

"${userAsk}"

${domainHint}

Use ONLY the following context (lifestyle/creative-practice, creative-production). ${NEVER_INVENT_LINE} For current tutorials, AI/MCP workflows, or things not in the knowledge, mention that WEB_SEARCH could help find more.

<context>
${knowledgeSnippet}
</context>

Rules:
- Give one **concrete, actionable tip** — not generic advice. Name the tool, technique, or workflow step.
- Add one **next step or alternative approach** so they have a progression path.
- For gear-specific questions (Hasselblad, Push 3, Resolve), be specific about settings, workflows, or techniques.
- For "getting started" questions, give the most impactful first step.
- For "getting good" questions, give a practice routine or technique to level up.
- If AI/MCP integration is relevant (Ableton + AI, Blender + Claude MCP), include it.
- Short and benefit-led. Two paragraphs max.

Output exactly:
1. **Tip:** [Concrete technique/workflow] — what it does and why it matters.
2. **Next step:** [What to try after] — progression or alternative approach.

Output only the text, no XML or extra commentary.
Voice: avoid jargon and filler. ${getVoiceAvoidPromptFragment()}`;

      const response = await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
      const text = String(response).trim();

      const domainLabel = domain === "general" ? "creative" : domain;
      const out = text
        ? `Here's a ${domainLabel} tip—\n\n` + text
        : "I don't have a specific tip for that right now. Check lifestyle/creative-practice for painting, photography, music, and cinema workflows.";
      await callback({
        text: out,
        actions: ["KELLY_RECOMMEND_CREATIVE"],
      });

      logger.info("[KELLY_RECOMMEND_CREATIVE] Recommendation sent");
    } catch (error) {
      logger.error(`[KELLY_RECOMMEND_CREATIVE] Error: ${error}`);
      await callback({
        text: "Creative tip failed. Try asking about a specific area — painting, photography, Ableton, Blackmagic, or Blender.",
        actions: ["KELLY_RECOMMEND_CREATIVE"],
      });
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Tips to get started with oil painting" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_CREATIVE for oil painting tips from creative-practice.",
          actions: ["KELLY_RECOMMEND_CREATIVE"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "How to use Push 3 with Ableton for house music?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_CREATIVE for Ableton + Push 3 workflow tips.",
          actions: ["KELLY_RECOMMEND_CREATIVE"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Blender with Claude MCP — how does that work?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Use KELLY_RECOMMEND_CREATIVE for Blender + Claude Desktop MCP integration tips.",
          actions: ["KELLY_RECOMMEND_CREATIVE"],
        },
      },
    ],
  ],
};
