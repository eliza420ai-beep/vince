/**
 * Clawterm–OpenClaw alignment: plugin in character, action names in system prompt,
 * messageExamples coverage for each OpenClaw action.
 */

import { describe, it, expect } from "bun:test";
import { clawtermCharacter, clawtermAgent } from "../../../../agents/clawterm";
import { openclawPlugin } from "../index";

const OPENCLAW_ACTION_NAMES = [
  "OPENCLAW_GATEWAY_STATUS",
  "OPENCLAW_SECURITY_GUIDE",
  "OPENCLAW_SETUP_GUIDE",
  "OPENCLAW_AGENTS_GUIDE",
  "OPENCLAW_TIPS",
  "OPENCLAW_USE_CASES",
  "OPENCLAW_WORKSPACE_SYNC",
  "OPENCLAW_AI_2027",
  "OPENCLAW_AI_RESEARCH_AGENTS",
  "OPENCLAW_HIP3_AI_ASSETS",
];

describe("Clawterm–OpenClaw alignment", () => {
  it("Clawterm agent plugins include openclaw plugin", () => {
    const plugins = clawtermAgent.plugins ?? [];
    const hasOpenclaw = plugins.some(
      (p: any) => (p?.name ?? p) === "plugin-openclaw" || p === openclawPlugin,
    );
    expect(hasOpenclaw).toBe(true);
  });

  it("system prompt contains each OpenClaw action name", () => {
    const system = clawtermCharacter.system ?? "";
    for (const name of OPENCLAW_ACTION_NAMES) {
      expect(system).toContain(name);
    }
  });

  it("messageExamples include at least one example per OpenClaw action", () => {
    const actionToExample = new Map<string, boolean>();
    for (const name of OPENCLAW_ACTION_NAMES) {
      actionToExample.set(name, false);
    }

    const groups = clawtermCharacter.messageExamples ?? [];
    // `messageExamples` are often created via `messageExamplesGroups()`, which
    // yields objects like `{ examples: MessageExample[][] }`.
    const conversations: any[] = [];
    for (const group of groups as any[]) {
      if (Array.isArray(group)) {
        conversations.push(group);
        continue;
      }
      if (Array.isArray(group?.examples)) {
        // `messageExamplesGroups()` sometimes yields:
        // - `group.examples` = MessageExample[] (single conversation)
        // - `group.examples` = MessageExample[][] (list of conversations)
        const first = group.examples[0];
        if (Array.isArray(first)) {
          conversations.push(...group.examples);
        } else {
          conversations.push(group.examples);
        }
      } else if (Array.isArray(group?.content)) {
        conversations.push(group.content);
      }
    }

    for (const pair of conversations) {
      const assistant = Array.isArray(pair) ? pair[1] : undefined;
      const actions = assistant?.content?.actions ?? assistant?.actions ?? [];
      for (const a of actions) {
        if (actionToExample.has(a)) actionToExample.set(a, true);
      }
    }
    const missing: string[] = [];
    for (const [name, covered] of actionToExample) {
      if (!covered) missing.push(name);
    }
    expect(missing).toEqual([]);
  });
});
