/**
 * SENTINEL_FEEDBACK_DELIVERABLE — Triage agent feedback into PRD or Eliza task.
 *
 * Invoked when another agent (e.g. Kelly) sends a structured FEEDBACK_DELIVERABLE_REQUEST
 * after a user said e.g. "FEEDBACK: Kelly should recommend Biarritz restaurants".
 * Produces either a PRD for Cursor (code/behavior fix) or an Eliza task (knowledge gap).
 */

import type {
  Action,
  ActionResult,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { logger, ModelType } from "@elizaos/core";
import {
  generatePRDFromRequest,
  savePRD,
} from "../services/prdGenerator.service";

const FEEDBACK_REQUEST_PREFIX = "[FEEDBACK_DELIVERABLE_REQUEST]";

function isFeedbackDeliverableRequest(text: string): boolean {
  return text.includes(FEEDBACK_REQUEST_PREFIX);
}

function parseRequest(text: string): {
  agentTested: string;
  feedback: string;
  context?: string;
} {
  const agentMatch = text.match(/agentTested:\s*(.+?)(?=\n|$)/i);
  const feedbackMatch = text.match(
    /feedback:\s*([\s\S]+?)(?=\n(?:context:|$)|$)/i,
  );
  const contextMatch = text.match(/context:\s*([\s\S]*?)$/i);
  return {
    agentTested: (agentMatch?.[1] ?? "").trim(),
    feedback: (
      feedbackMatch?.[1] ?? text.replace(FEEDBACK_REQUEST_PREFIX, "").trim()
    ).trim(),
    context: contextMatch?.[1]?.trim(),
  };
}

function getElizaTasksDir(): string {
  const base =
    process.env.STANDUP_DELIVERABLES_DIR?.trim() ||
    path.join(process.cwd(), "docs", "standup");
  const dir = path.isAbsolute(base) ? base : path.join(process.cwd(), base);
  return path.join(dir, "eliza-tasks");
}

export const sentinelFeedbackDeliverableAction: Action = {
  name: "SENTINEL_FEEDBACK_DELIVERABLE",
  similes: ["FEEDBACK_DELIVERABLE", "FEEDBACK_TO_PRD_OR_ELIZA_TASK"],
  description:
    "Generates a deliverable from agent feedback: either a PRD for Cursor (code/behavior fix) or an Eliza task (knowledge gap). Invoked by other agents when user sends FEEDBACK: ...",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = (message.content?.text ?? "").trim();
    return isFeedbackDeliverableRequest(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback: HandlerCallback,
  ): Promise<void | ActionResult> => {
    logger.debug("[SENTINEL_FEEDBACK_DELIVERABLE] Action fired");

    try {
      const text = (message.content?.text ?? "").trim();
      const { agentTested, feedback, context } = parseRequest(text);
      if (!feedback || feedback.length < 5) {
        await callback({
          text: "PRD/Eliza task skipped: feedback text too short or missing.",
          actions: ["SENTINEL_FEEDBACK_DELIVERABLE"],
        });
        return { success: false };
      }

      const triagePrompt = `You are Sentinel. The user gave feedback while testing an agent.

**Agent tested:** ${agentTested || "unknown"}
**Feedback:** ${feedback}
${context ? `**Context:** ${context.slice(0, 800)}` : ""}

Decide the correct deliverable type:
- **prd** = Code or behavior fix (prompts, actions, plugin logic). Use when the fix requires changing code, validation, or plugin behavior.
- **eliza_task** = Knowledge gap. Use when the fix is to add or update content in the knowledge base (e.g. missing Biarritz restaurants, outdated doc). No code change.

Reply with exactly one line: either "prd" or "eliza_task" (nothing else).`;

      const triageResponse = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: triagePrompt,
      });
      const triageText =
        typeof triageResponse === "string"
          ? triageResponse
          : ((triageResponse as { text?: string })?.text ??
            String(triageResponse));
      const deliverableType = triageText.toLowerCase().includes("eliza_task")
        ? "eliza_task"
        : "prd";

      if (deliverableType === "prd") {
        const prd = generatePRDFromRequest(
          `Fix: ${agentTested ? `(${agentTested}) ` : ""}${feedback}`,
        );
        const savedPath = savePRD(prd);
        const reply = `PRD written to \`${savedPath}\`.`;
        await callback({
          text: reply,
          actions: ["SENTINEL_FEEDBACK_DELIVERABLE"],
        });
        return { success: true };
      }

      const elizaTasksDir = getElizaTasksDir();
      if (!fs.existsSync(elizaTasksDir)) {
        fs.mkdirSync(elizaTasksDir, { recursive: true });
      }
      const dateStr = new Date().toISOString().slice(0, 10);
      const slug = feedback
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 40);
      const filename = `${dateStr}-eliza-task-${slug}.md`;
      const filepath = path.join(elizaTasksDir, filename);

      const elizaTaskContent = `# Eliza task (from feedback)

**Agent tested:** ${agentTested || "unknown"}
**Feedback:** ${feedback}

## What to add or update

- [ ] Identify the knowledge gap (e.g. missing file under \`knowledge/\`, outdated section).
- [ ] Add or update content (e.g. \`knowledge/the-good-life/michelin-restaurants/biarritz-region.md\`).
- [ ] Run UPLOAD or relevant knowledge action if applicable.

## Notes

${context ? `Context from conversation:\n${context.slice(0, 500)}` : "No additional context."}
`;

      fs.writeFileSync(filepath, elizaTaskContent);
      logger.info(
        `[SENTINEL_FEEDBACK_DELIVERABLE] Eliza task saved to ${filepath}`,
      );

      const reply = `Eliza task written to \`${filepath}\`.`;
      await callback({
        text: reply,
        actions: ["SENTINEL_FEEDBACK_DELIVERABLE"],
      });
      return { success: true };
    } catch (err) {
      logger.error("[SENTINEL_FEEDBACK_DELIVERABLE] Error:", err);
      await callback({
        text: `Feedback deliverable failed: ${err instanceof Error ? err.message : String(err)}`,
        actions: ["SENTINEL_FEEDBACK_DELIVERABLE"],
      });
      return { success: false };
    }
  },

  examples: [],
};
