/**
 * ASK_AGENT routing tests (Option A: unit on character / fixtures).
 * Kelly must use ASK_AGENT and report back; never say "go ask X yourself."
 */

import { describe, it, expect } from "bun:test";
import * as path from "path";
import * as fs from "fs";

const FIXTURE_PATH = path.join(
  __dirname,
  "fixtures",
  "kelly-ask-agent-examples.json",
);

interface AskAgentExample {
  userPrompt: string;
  kellyText: string;
  actions: string[];
}

const NEVER_DEFLECT_PATTERNS = [
  "go ask vince",
  "go ask solus",
  "go ask eliza",
  "go ask otaku",
  "you should ask vince",
  "you should ask solus",
  "you should ask eliza",
  "you should ask otaku",
  "ask vince yourself",
  "ask solus yourself",
  "ask eliza yourself",
  "ask otaku yourself",
];

function loadAskAgentExamples(): AskAgentExample[] {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
  return JSON.parse(raw) as AskAgentExample[];
}

describe("Kelly ASK_AGENT routing", () => {
  it("fixture has at least one ASK_AGENT example", () => {
    const examples = loadAskAgentExamples();
    expect(examples.length).toBeGreaterThanOrEqual(1);
    const withAskAgent = examples.filter((ex) =>
      ex.actions?.includes("ASK_AGENT"),
    );
    expect(withAskAgent.length).toBe(examples.length);
  });

  it("each ASK_AGENT example reply contains reporting pattern (says or says:)", () => {
    const examples = loadAskAgentExamples();
    for (const ex of examples) {
      const text = (ex.kellyText ?? "").toLowerCase();
      expect(
        text.includes("says:") || text.includes("says "),
        `Example for "${ex.userPrompt}" should contain "says:" or "says " for reporting`,
      ).toBe(true);
    }
  });

  it("no ASK_AGENT example contains deflect phrasing (go ask / you should ask)", () => {
    const examples = loadAskAgentExamples();
    const lowerTexts = examples.map((ex) => (ex.kellyText ?? "").toLowerCase());
    for (const pattern of NEVER_DEFLECT_PATTERNS) {
      for (let i = 0; i < lowerTexts.length; i++) {
        expect(
          !lowerTexts[i].includes(pattern),
          `Example ${i + 1} must not contain "${pattern}"`,
        ).toBe(true);
      }
    }
  });
});
