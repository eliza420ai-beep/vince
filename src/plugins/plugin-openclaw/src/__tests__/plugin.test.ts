/**
 * Plugin shape and exports tests for plugin-openclaw.
 */

import { describe, it, expect } from "bun:test";
import {
  openclawPlugin,
  shouldOpenclawPluginBeInContext,
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

const EXPECTED_ACTION_NAMES = [
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

describe("openclawPlugin", () => {
  it("should be defined", () => {
    expect(openclawPlugin).toBeDefined();
  });

  it("should have name plugin-openclaw", () => {
    expect(openclawPlugin.name).toBe("plugin-openclaw");
  });

  it("should have non-empty description", () => {
    expect(openclawPlugin.description).toBeDefined();
    expect(openclawPlugin.description!.length).toBeGreaterThan(0);
  });

  it("should have exactly 10 actions", () => {
    expect(openclawPlugin.actions).toBeDefined();
    expect(openclawPlugin.actions!.length).toBe(10);
  });

  it("should have all expected action names", () => {
    const names = openclawPlugin.actions!.map((a) => a.name);
    for (const name of EXPECTED_ACTION_NAMES) {
      expect(names).toContain(name);
    }
  });

  it("should have exactly one provider", () => {
    expect(openclawPlugin.providers).toBeDefined();
    expect(openclawPlugin.providers!.length).toBe(1);
  });

  it("should have provider named openclawContext", () => {
    expect(openclawPlugin.providers![0].name).toBe("openclawContext");
  });

  it("should have no evaluators", () => {
    expect(openclawPlugin.evaluators).toBeDefined();
    expect(openclawPlugin.evaluators!.length).toBe(0);
  });
});

describe("plugin exports", () => {
  it("should export shouldOpenclawPluginBeInContext", () => {
    expect(shouldOpenclawPluginBeInContext).toBeDefined();
    expect(typeof shouldOpenclawPluginBeInContext).toBe("function");
  });

  it("should export all 10 actions", () => {
    expect(openclawGatewayStatusAction).toBeDefined();
    expect(openclawSecurityGuideAction).toBeDefined();
    expect(openclawSetupGuideAction).toBeDefined();
    expect(openclawAgentsGuideAction).toBeDefined();
    expect(openclawTipsAction).toBeDefined();
    expect(openclawUseCasesAction).toBeDefined();
    expect(openclawWorkspaceSyncAction).toBeDefined();
    expect(openclawAi2027Action).toBeDefined();
    expect(openclawAiResearchAgentsAction).toBeDefined();
    expect(openclawHip3AiAssetsAction).toBeDefined();
  });

  it("exported action names match plugin actions", () => {
    const exported = [
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
    const names = exported.map((a) => a.name);
    expect(names).toEqual(EXPECTED_ACTION_NAMES);
  });
});
