/**
 * SENTINEL_PRD — Generate World-Class Product Requirement Documents
 *
 * Creates enterprise-grade PRDs that Claude Code/Cursor can execute perfectly.
 * Follows the north star deliverables spec.
 *
 * Triggers:
 * - "prd for cursor"
 * - "product requirements"
 * - "write a prd"
 * - "spec for <feature>"
 * - "generate prd"
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import {
  generatePRDFromRequest,
  generatePRD,
  savePRD,
  listPRDs,
  type PRDInput,
} from "../services/prdGenerator.service";
import { scanProject } from "../services/projectRadar.service";

const PRD_TRIGGERS = [
  "prd",
  "product requirements",
  "write a prd",
  "generate prd",
  "spec for cursor",
  "requirements document",
  "create prd",
  "prd for",
];

function wantsPRD(text: string): boolean {
  const lower = text.toLowerCase();
  return PRD_TRIGGERS.some(t => lower.includes(t));
}

function wantsListPRDs(text: string): boolean {
  const lower = text.toLowerCase();
  return lower.includes("list prd") || lower.includes("show prd") || lower.includes("recent prd");
}

export const sentinelPrdAction: Action = {
  name: "SENTINEL_PRD",
  similes: ["GENERATE_PRD", "PRODUCT_REQUIREMENTS", "SPEC_FOR_CURSOR", "WRITE_PRD"],
  description:
    "Generates world-class PRDs (Product Requirement Documents) for implementation in Cursor/Claude Code. Includes north star alignment, acceptance criteria, architecture rules, and implementation guide.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = (message.content?.text ?? "").toLowerCase();
    return wantsPRD(text) || wantsListPRDs(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_PRD] Action fired");

    try {
      const userText = (message.content?.text ?? "").trim();

      // Handle list PRDs request
      if (wantsListPRDs(userText)) {
        const prds = listPRDs();
        if (prds.length === 0) {
          const msg = "📋 **No PRDs found**\n\nGenerate one with: *\"PRD for <feature description>\"*";
          await callback({ text: "Quick answer—\n\n" + msg });
          return { success: true };
        }

        const list = prds.slice(0, 10).map((p, i) => 
          `${i + 1}. **${p.filename}** — ${p.created.toISOString().slice(0, 10)}`
        ).join("\n");

        const listText = `📋 **Recent PRDs (${prds.length} total)**\n\n${list}\n\n*Generate a new one with: \"PRD for <feature>\"*`;
        await callback({ text: "Here are recent PRDs—\n\n" + listText });
        return { success: true };
      }

      // Extract the feature request from user text
      // Remove trigger words to get the actual request
      let featureRequest = userText
        .replace(/prd\s*(for)?\s*/gi, "")
        .replace(/product requirements\s*(for|document)?\s*/gi, "")
        .replace(/generate\s*/gi, "")
        .replace(/write\s*a?\s*/gi, "")
        .replace(/spec\s*(for)?\s*/gi, "")
        .replace(/^cursor\s*/gi, "")
        .trim();

      // If no specific request, ask for one
      if (!featureRequest || featureRequest.length < 10) {
        // Get project context for smart suggestions
        const projectState = scanProject();
        
        const suggestions: string[] = [];
        
        // Suggest based on blockers
        if (projectState.criticalBlockers.length > 0) {
          suggestions.push(`Fix: ${projectState.criticalBlockers[0]}`);
        }
        
        // Suggest based on in-progress items
        if (projectState.inProgress.length > 0) {
          suggestions.push(`Complete: ${projectState.inProgress[0].title}`);
        }
        
        // Suggest based on knowledge gaps
        if (projectState.knowledgeGaps.length > 0) {
          suggestions.push(`Address: ${projectState.knowledgeGaps[0]}`);
        }

        const suggestionText = suggestions.length > 0
          ? `\n\n**Suggestions based on project state:**\n${suggestions.map((s, i) => `${i + 1}. "${s}"`).join("\n")}`
          : "";

        const askText = `📋 **What should I write a PRD for?**

Give me a feature description and I'll generate a world-class PRD.

**Examples:**
• "PRD for adding a leaderboard endpoint to plugin-vince"
• "PRD for refactoring the options action"
• "PRD for implementing X sentiment caching"${suggestionText}`;
        await callback({ text: "Here's what I need—\n\n" + askText });
        return { success: true };
      }

      // Get project state for context
      const projectState = scanProject();
      
      // Enhance the request with project context using LLM
      const state = await runtime.composeState(message);
      const contextBlock = typeof state.text === "string" ? state.text : "";
      
      const enhancementPrompt = `You are Sentinel, the core dev. The user wants a PRD for: "${featureRequest}"

Using the project context below, extract:
1. The best title (concise, action-oriented)
2. A clear description (2-3 sentences)
3. Which plugin this affects (plugin-vince, plugin-sentinel, plugin-eliza, plugin-kelly, plugin-otaku, or new)
4. Priority (P0=urgent/blocker, P1=important, P2=nice-to-have, P3=future)
5. Effort (XS=hours, S=1 day, M=2-3 days, L=1 week, XL=2+ weeks)

Project state:
- Plugins: ${projectState.plugins.map(p => p.name).join(", ")}
- In progress: ${projectState.inProgress.map(i => i.title).slice(0, 3).join(", ") || "none"}
- Blockers: ${projectState.criticalBlockers.slice(0, 3).join(", ") || "none"}

Context from knowledge:
${contextBlock.slice(0, 2000)}

Respond in this exact JSON format:
{
  "title": "Feature Title",
  "description": "Clear description...",
  "plugin": "plugin-vince",
  "priority": "P1",
  "effort": "M"
}`;

      const enhancementResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: enhancementPrompt,
      });
      
      const enhancementText = typeof enhancementResponse === "string"
        ? enhancementResponse
        : (enhancementResponse as { text?: string })?.text ?? String(enhancementResponse);

      // Parse the enhanced input
      let prdInput: PRDInput;
      try {
        const jsonMatch = enhancementText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          prdInput = {
            title: parsed.title || featureRequest.slice(0, 50),
            description: parsed.description || featureRequest,
            plugin: parsed.plugin,
            priority: parsed.priority as PRDInput["priority"],
            estimatedEffort: parsed.effort as PRDInput["estimatedEffort"],
            requestedBy: "user",
          };
        } else {
          throw new Error("No JSON found");
        }
      } catch (e) {
        // Fallback: generate PRD from raw request
        const prd = generatePRDFromRequest(featureRequest);
        const savedPath = savePRD(prd);
        const prdBody = `📋 **PRD Generated: ${prd.title}**

**ID:** ${prd.id}
**Priority:** ${prd.priority} | **Effort:** ${prd.effort}
**Saved to:** \`${savedPath}\`

---

${prd.markdown.slice(0, 3000)}${prd.markdown.length > 3000 ? "\n\n*[truncated — see full PRD at path above]*" : ""}`;
        await callback({ text: "Here's your PRD—\n\n" + prdBody });
        return { success: true };
      }

      // Generate the full PRD
      const prd = generatePRD(prdInput);
      const savedPath = savePRD(prd);
      const prdText = `📋 **PRD Generated: ${prd.title}**

**ID:** ${prd.id}
**Priority:** ${prd.priority} | **Effort:** ${prd.effort}
**Target:** ${prdInput.plugin || "TBD"}
**Saved to:** \`${savedPath}\`

---

${prd.markdown.slice(0, 3500)}${prd.markdown.length > 3500 ? "\n\n*[truncated — see full PRD at path above]*" : ""}

---

**Next:** Open the PRD in Cursor and let Claude Code implement it. Keep the architecture as good as it gets.`;
      await callback({ text: "Here's your PRD—\n\n" + prdText });
      
      return { success: true };
    } catch (error) {
      logger.error("[SENTINEL_PRD] Failed:", error);
      await callback({
        text: "Failed to generate PRD. Try again with a clearer feature description, e.g. *\"PRD for adding whale tracking to plugin-vince\"*",
      });
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "PRD for adding a leaderboard endpoint" } },
      {
        name: "{{agent}}",
        content: {
          text: "📋 **PRD Generated: Add Leaderboard Endpoint**\n\n**ID:** PRD-20260211-X7KP\n**Priority:** P1 | **Effort:** M\n**Target:** plugin-vince\n\n[Full PRD content...]",
        },
      },
    ],
    [
      { name: "{{user}}", content: { text: "List recent PRDs" } },
      {
        name: "{{agent}}",
        content: {
          text: "📋 **Recent PRDs (3 total)**\n\n1. **2026-02-11-prd-leaderboard-endpoint.md** — 2026-02-11\n2. **2026-02-10-prd-whale-tracking.md** — 2026-02-10",
        },
      },
    ],
  ],
};
