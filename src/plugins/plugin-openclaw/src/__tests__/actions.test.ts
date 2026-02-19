/**
 * Action tests: validate (Clawterm bypass, positive, negative) and handler (callback, return, key content).
 */

import { describe, it, expect } from "bun:test";
import {
  openclawGatewayStatusAction,
  openclawSecurityGuideAction,
  openclawSetupGuideAction,
  openclawAgentsGuideAction,
  openclawTipsAction,
  openclawUseCasesAction,
  openclawWorkspaceSyncAction,
  openclawAi2027Action,
  openclawAiResearchAgentsAction,
  openclawHip3AiAssetsAction,
} from "../index";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
  createMockCallback,
} from "./test-utils";

const CLAWTERM_RUNTIME = createMockRuntime({ character: { name: "Clawterm" } });
const OTHER_RUNTIME = createMockRuntime({ character: { name: "OtherAgent" } });

type ActionUnderTest = {
  name: string;
  validate: (runtime: any, message: any, state?: any) => Promise<boolean>;
  handler: (
    runtime: any,
    message: any,
    state: any,
    options: any,
    callback?: any,
  ) => Promise<any>;
};

const TRIGGERS: Record<string, string[]> = {
  OPENCLAW_GATEWAY_STATUS: [
    "gateway status",
    "is the gateway up",
    "openclaw status",
    "openclaw health",
  ],
  OPENCLAW_SECURITY_GUIDE: [
    "openclaw security",
    "secure openclaw",
    "openclaw hardening",
    "prompt injection openclaw",
  ],
  OPENCLAW_SETUP_GUIDE: [
    "openclaw setup",
    "how to install openclaw",
    "gateway setup",
    "install openclaw",
    "claw setup",
  ],
  OPENCLAW_AGENTS_GUIDE: [
    "openclaw agents",
    "orchestrator",
    "brain muscles bones",
    "8 pillars",
    "how to run openclaw",
  ],
  OPENCLAW_TIPS: [
    "openclaw tips",
    "tips for openclaw",
    "fresh mac setup",
    "best skills",
  ],
  OPENCLAW_USE_CASES: [
    "openclaw use case",
    "best for openclaw",
    "what can openclaw do",
    "use case",
  ],
  OPENCLAW_WORKSPACE_SYNC: [
    "workspace sync",
    "sync workspace",
    "openclaw sync",
  ],
  OPENCLAW_AI_2027: [
    "what's AI 2027?",
    "agi timeline",
    "kokotajlo",
    "openbrain",
    "agent-1",
  ],
  OPENCLAW_AI_RESEARCH_AGENTS: [
    "research agents?",
    "coding agent",
    "automate research",
    "research agent that scour",
  ],
  OPENCLAW_HIP3_AI_ASSETS: [
    "hip3 ai assets",
    "NVDA perps",
    "openai anthropic hyperliquid",
    "ai perps on Hyperliquid",
  ],
};

const CONTENT_SUBSTRINGS: Record<string, string[]> = {
  OPENCLAW_GATEWAY_STATUS: ["Gateway"],
  OPENCLAW_SECURITY_GUIDE: [
    "prompt injection",
    "MEMORY.md",
    "ACIP",
    "PromptGuard",
    "SkillGuard",
    "security audit",
  ],
  OPENCLAW_SETUP_GUIDE: ["docs.openclaw.ai", "18789", "openclaw onboard"],
  OPENCLAW_AGENTS_GUIDE: [
    "orchestrator",
    "Brain",
    "Muscles",
    "Bones",
    "HOW-TO-RUN",
    "last-briefing",
  ],
  OPENCLAW_TIPS: ["OpenClaw tips", "MacBook", "Brain first"],
  OPENCLAW_USE_CASES: [
    "use cases",
    "research agents",
    "VINCE",
    "openclaw-adapter",
  ],
  OPENCLAW_WORKSPACE_SYNC: [
    "workspace",
    "knowledge/teammate",
    "~/.openclaw/workspace",
  ],
  OPENCLAW_AI_2027: [
    "2027",
    "superhuman",
    "research agents",
    "OpenClaw",
    "Kokotajlo",
    "timeline",
  ],
  OPENCLAW_AI_RESEARCH_AGENTS: [
    "research agents",
    "OpenClaw",
    "orchestrator",
    "openclaw-agents",
  ],
  OPENCLAW_HIP3_AI_ASSETS: [
    "NVDA",
    "vntl",
    "xyz",
    "Hyperliquid",
    "OPENAI",
    "ANTHROPIC",
  ],
};

const ALL_ACTIONS: ActionUnderTest[] = [
  openclawGatewayStatusAction,
  openclawSecurityGuideAction,
  openclawSetupGuideAction,
  openclawAgentsGuideAction,
  openclawTipsAction,
  openclawUseCasesAction,
  openclawWorkspaceSyncAction,
  openclawAi2027Action,
  openclawAiResearchAgentsAction,
  openclawHip3AiAssetsAction,
];

for (const action of ALL_ACTIONS) {
  describe(action.name, () => {
    it("validate returns true for Clawterm for any message", async () => {
      const result = await action.validate!(
        CLAWTERM_RUNTIME,
        createMockMessage("hello"),
      );
      expect(result).toBe(true);
    });

    it("validate returns true for trigger phrases when not Clawterm", async () => {
      const triggers = TRIGGERS[action.name];
      expect(triggers).toBeDefined();
      for (const phrase of triggers) {
        const result = await action.validate!(
          OTHER_RUNTIME,
          createMockMessage(phrase),
        );
        expect(result).toBe(true);
      }
    });

    it("validate returns false for unrelated message when not Clawterm", async () => {
      const result = await action.validate!(
        OTHER_RUNTIME,
        createMockMessage("what's the weather?"),
      );
      expect(result).toBe(false);
      const result2 = await action.validate!(
        OTHER_RUNTIME,
        createMockMessage("hello"),
      );
      expect(result2).toBe(false);
    });

    it("handler calls callback with action name and non-empty text", async () => {
      const callback = createMockCallback();
      const state = createMockState();
      await action.handler!(
        OTHER_RUNTIME,
        createMockMessage("trigger"),
        state,
        undefined,
        callback,
      );
      expect(callback.calls.length).toBeGreaterThanOrEqual(1);
      const content = callback.calls[0];
      expect(content?.actions).toContain(action.name);
      expect(content?.text).toBeDefined();
      expect((content?.text ?? "").length).toBeGreaterThan(0);
    });

    it("handler returns success true and text", async () => {
      const result = await action.handler!(
        OTHER_RUNTIME,
        createMockMessage("x"),
        createMockState(),
        undefined,
      );
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
    });

    it("handler text contains expected key substrings", async () => {
      const callback = createMockCallback();
      await action.handler!(
        OTHER_RUNTIME,
        createMockMessage("x"),
        createMockState(),
        undefined,
        callback,
      );
      const text = (callback.calls[0]?.text ?? "").toLowerCase();
      const subs = CONTENT_SUBSTRINGS[action.name];
      expect(subs).toBeDefined();
      for (const sub of subs) {
        expect(text).toContain(sub.toLowerCase());
      }
    });
  });
}

describe("OPENCLAW_GATEWAY_STATUS handler when gateway not configured", () => {
  it("returns message that Gateway URL is not set", async () => {
    const callback = createMockCallback();
    await openclawGatewayStatusAction.handler!(
      OTHER_RUNTIME,
      createMockMessage("gateway status"),
      createMockState(),
      undefined,
      callback,
    );
    const text = callback.calls[0]?.text ?? "";
    expect(text).toContain("Gateway URL is not set");
    expect(text).toContain("OPENCLAW_GATEWAY_URL");
  });
});

describe("handler with callback undefined", () => {
  it("does not throw and returns success", async () => {
    const result = await openclawSetupGuideAction.handler!(
      OTHER_RUNTIME,
      createMockMessage("setup"),
      createMockState(),
      undefined,
      undefined,
    );
    expect(result.success).toBe(true);
    expect(result.text).toBeDefined();
  });
});
