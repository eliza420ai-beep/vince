/**
 * Content and data integrity: key substrings in guide/action output and canonical URLs.
 */

import { describe, it, expect } from "bun:test";
import {
  openclawSetupGuideAction,
  openclawSecurityGuideAction,
  openclawAi2027Action,
  openclawHip3AiAssetsAction,
  openclawAgentsGuideAction,
  openclawWorkspaceSyncAction,
} from "../index";
import { openclawContextProvider } from "../providers/openclawContext.provider";
import {
  createMockRuntime,
  createMockMessage,
  createMockState,
} from "./test-utils";

const runtime = createMockRuntime();

async function getActionText(action: {
  handler: (r: any, m: any, s: any, o: any, cb?: any) => Promise<any>;
}): Promise<string> {
  const result = await action.handler(
    runtime,
    createMockMessage("x"),
    createMockState(),
    undefined,
  );
  return result.text ?? "";
}

describe("content-quality", () => {
  it("setup guide contains Security, loopback, 18789, docs.openclaw.ai, openclaw onboard", async () => {
    const text = await getActionText(openclawSetupGuideAction);
    expect(text).toContain("Security");
    expect(text).toContain("loopback");
    expect(text).toContain("18789");
    expect(text).toContain("docs.openclaw.ai");
    expect(text).toContain("openclaw onboard");
  });

  it("security guide contains prompt injection, MEMORY.md, ACIP, PromptGuard, SkillGuard, security audit", async () => {
    const text = await getActionText(openclawSecurityGuideAction);
    const lower = text.toLowerCase();
    expect(lower).toContain("prompt injection");
    expect(text).toContain("MEMORY.md");
    expect(text).toContain("ACIP");
    expect(text).toContain("PromptGuard");
    expect(text).toContain("SkillGuard");
    expect(lower).toContain("security audit");
  });

  it("AI 2027 contains 2027, superhuman, research agents, OpenClaw or openclaw-agents", async () => {
    const text = await getActionText(openclawAi2027Action);
    expect(text).toContain("2027");
    expect(text).toContain("superhuman");
    expect(text).toContain("research agents");
    expect(text.includes("OpenClaw") || text.includes("openclaw-agents")).toBe(
      true,
    );
  });

  it("HIP-3 contains NVDA, GOOGL, OPENAI, ANTHROPIC, vntl, xyz, Hyperliquid", async () => {
    const text = await getActionText(openclawHip3AiAssetsAction);
    expect(text).toContain("NVDA");
    expect(text).toContain("GOOGL");
    expect(text).toContain("OPENAI");
    expect(text).toContain("ANTHROPIC");
    expect(text).toContain("vntl");
    expect(text).toContain("xyz");
    expect(text).toContain("Hyperliquid");
  });

  it("agents guide contains orchestrator, Brain, Muscles, Bones, HOW-TO-RUN, last-briefing", async () => {
    const text = await getActionText(openclawAgentsGuideAction);
    expect(text).toContain("orchestrator");
    expect(text).toContain("Brain");
    expect(text).toContain("Muscles");
    expect(text).toContain("Bones");
    expect(text).toContain("HOW-TO-RUN");
    expect(text).toContain("last-briefing");
  });

  it("workspace sync contains workspace, knowledge/teammate, ~/.openclaw/workspace", async () => {
    const text = await getActionText(openclawWorkspaceSyncAction);
    expect(text).toContain("workspace");
    expect(text).toContain("knowledge/teammate");
    expect(text).toContain("~/.openclaw/workspace");
  });

  it("at least one action or provider text points to releases, clawindex, steipete", async () => {
    const setupText = await getActionText(openclawSetupGuideAction);
    const providerResult = await openclawContextProvider.get(
      runtime,
      createMockMessage("openclaw"),
      createMockState(),
    );
    const providerText = providerResult.text ?? "";
    const combined = setupText + " " + providerText;
    expect(combined).toContain("github.com/openclaw/openclaw/releases");
    expect(combined).toContain("clawindex.org");
    expect(combined).toContain("github.com/steipete");
  });
});
