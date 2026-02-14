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
      (p: any) => (p?.name ?? p) === "plugin-openclaw" || p === openclawPlugin
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
    const examples = clawtermCharacter.messageExamples ?? [];
    const actionToExample = new Map<string, boolean>();
    for (const name of OPENCLAW_ACTION_NAMES) {
      actionToExample.set(name, false);
    }
    for (const pair of examples) {
      const assistant = Array.isArray(pair) ? pair[1] : (pair as any).assistant ?? pair[1];
      const actions = assistant?.content?.actions ?? assistant?.actions ?? [];
      for (const a of actions) {
        if (actionToExample.has(a)) {
          actionToExample.set(a, true);
        }
      }
    }
    const missing: string[] = [];
    for (const [name, covered] of actionToExample) {
      if (!covered) missing.push(name);
    }
    expect(missing).toEqual([]);
  });
});
