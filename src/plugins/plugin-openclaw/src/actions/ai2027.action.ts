import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";

/**
 * AI 2027 scenario summary. Sourced from ai-2027.com.
 */
const AI_2027_MD = `# AI 2027 Scenario Summary

Source: [ai-2027.com](https://ai-2027.com/) — scenario-type prediction of superhuman AI impact. Authors: Daniel Kokotajlo, Scott Alexander, Thomas Larsen, Eli Lifland, Romeo Dean.

## What is AI 2027?

A concrete scenario representing a best guess about what superhuman AI might look like by 2027. Two endings: "slowdown" and "race." Not a recommendation—predictive accuracy is the goal.

> "Research agents spend half an hour scouring the Internet to answer your question."

## Timeline

**Mid 2025:** Stumbling agents — first AI agents, coding agents, research agents scouring the Internet. Impressive in theory, unreliable in practice.

**Late 2025:** OpenBrain, Agent-1 (10^27 FLOP). Great at AI research. Spec, alignment team.

**2026:** China (DeepCent), compute race, Agent-1-mini. AI takes jobs, creates new ones.

**2027:** Agent-2→4 progression. Neuralese recurrence, IDA, superhuman coder, superhuman AI researcher. Alignment concerns, misalignment.

## Key concepts

- **Spec**: Model specification—goals, rules, principles
- **Alignment**: Debate, model organisms, honeypots
- **Neuralese**: High-dimensional chain of thought
- **IDA**: Iterated distillation and amplification
- **Takeoff**: Pace of capability progression past superhuman coder

## OpenClaw connection

OpenClaw + openclaw-agents enable research agents today—Gateway connects chat apps to AI agents; orchestrator runs alpha, market, onchain, news. The practical bridge to the AI 2027 vision.`;

export const openclawAi2027Action: Action = {
  name: "OPENCLAW_AI_2027",
  similes: ["OPENCLAW_AI_2027", "AI_2027", "AGI_SCENARIO"],
  description:
    "Return AI 2027 scenario summary from ai-2027.com (superhuman AI, AGI timelines, OpenBrain, Agent progression, alignment, takeoff). Use when the user asks about AI 2027, ai-2027, AGI timeline, takeoff, superhuman AI scenario, Kokotajlo, OpenBrain.",
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
  ): Promise<boolean> => {
    if (runtime.character?.name === "Clawterm") return true;
    const text =
      (message?.content?.text ?? "").toLowerCase() +
      (state?.text ?? "").toLowerCase();
    return (
      /ai\s*2027|ai-2027/i.test(text) ||
      /agi\s*timeline|takeoff/i.test(text) ||
      /superhuman\s*ai\s*scenario/i.test(text) ||
      /kokotajlo|openbrain/i.test(text) ||
      /agent-1|agent-2|agent-3|agent-4/i.test(text)
    );
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const intro = "Here's the AI 2027 / AGI timeline view—";
    const out = intro + "\n\n" + AI_2027_MD;
    if (callback) await callback({ text: out, actions: ["OPENCLAW_AI_2027"] });
    return { success: true, text: out };
  },
  examples: [
    [
      { name: "{{user}}", content: { text: "What's AI 2027?" } },
      {
        name: "{{agent}}",
        content: {
          text: AI_2027_MD.slice(0, 500) + "...",
          actions: ["OPENCLAW_AI_2027"],
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "Tell me about the AGI timeline" } },
      {
        name: "{{agent}}",
        content: {
          text: AI_2027_MD.slice(0, 500) + "...",
          actions: ["OPENCLAW_AI_2027"],
        },
      },
    ],
  ],
};
