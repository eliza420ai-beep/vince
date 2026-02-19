/**
 * Plugin Eliza - Action tests
 *
 * Tests action validators and, where practical, handler behavior
 * without full runtime (mocked IAgentRuntime and Memory).
 */

import { describe, it, expect } from "bun:test";
import type { IAgentRuntime, Memory } from "@elizaos/core";
import { knowledgeStatusAction } from "../actions/knowledgeStatus.action";
import { autoResearchAction } from "../actions/autoResearch.action";
import { uploadAction } from "../actions/upload.action";
import { contentAuditAction } from "../actions/contentAudit.action";
import { addMichelinRestaurantAction } from "../actions/addMichelin.action";
import { elizaPlugin } from "../index";

// Minimal mock runtime: only agentId is needed for validate checks
function mockRuntime(agentId = "agent-eliza-123"): IAgentRuntime {
  return { agentId } as IAgentRuntime;
}

function mockMessage(text: string, entityId: string): Memory {
  return {
    entityId,
    content: { text },
  } as Memory;
}

describe("KNOWLEDGE_STATUS action", () => {
  const runtime = mockRuntime();

  it("validate: returns true for 'knowledge status'", async () => {
    const message = mockMessage("knowledge status", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'how's the knowledge base'", async () => {
    const message = mockMessage("how's the knowledge base?", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'kb status'", async () => {
    const message = mockMessage("kb status", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns false when message is from the agent itself", async () => {
    const message = mockMessage("knowledge status", runtime.agentId);
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(false);
  });

  it("validate: returns false for unrelated text", async () => {
    const message = mockMessage("hello, what's the weather?", "user-1");
    expect(await knowledgeStatusAction.validate!(runtime, message)).toBe(false);
  });
});

describe("AUTO_RESEARCH action", () => {
  const runtime = mockRuntime();

  it("validate: returns true for 'audit knowledge'", async () => {
    const message = mockMessage("audit knowledge", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'research agenda'", async () => {
    const message = mockMessage("research agenda", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'fill gaps'", async () => {
    const message = mockMessage("fill gaps", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'what are the knowledge gaps'", async () => {
    const message = mockMessage("what are the knowledge gaps?", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns false for unrelated text", async () => {
    const message = mockMessage("hello", "user-1");
    expect(await autoResearchAction.validate!(runtime, message)).toBe(false);
  });
});

describe("UPLOAD action", () => {
  const runtime = mockRuntime();

  it("validate: returns true for 'upload: something' (50+ chars)", async () => {
    const message = mockMessage(
      "upload: Bitcoin halving cycle typically creates a supply shock 12-18 months after the event.",
      "user-1",
    );
    expect(await uploadAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'save this: article text' (50+ chars)", async () => {
    const message = mockMessage(
      "save this: Some research content here with enough length to pass the minimum.",
      "user-1",
    );
    expect(await uploadAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns false when message is from the agent", async () => {
    const message = mockMessage("upload: content", runtime.agentId);
    expect(await uploadAction.validate!(runtime, message)).toBe(false);
  });

  it("validate: returns false for unrelated text", async () => {
    const message = mockMessage("hello, how are you?", "user-1");
    expect(await uploadAction.validate!(runtime, message)).toBe(false);
  });
});

describe("CONTENT_AUDIT action", () => {
  const runtime = mockRuntime();

  it("validate: returns true for 'analyze my top posts @myhandle'", async () => {
    const message = mockMessage("analyze my top posts @myhandle", "user-1");
    expect(await contentAuditAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns true for 'content audit for @user'", async () => {
    const message = mockMessage("content audit for @someuser", "user-1");
    expect(await contentAuditAction.validate!(runtime, message)).toBe(true);
  });

  it("validate: returns false when no @handle", async () => {
    const message = mockMessage("analyze my top posts", "user-1");
    expect(await contentAuditAction.validate!(runtime, message)).toBe(false);
  });

  it("validate: returns false for unrelated text", async () => {
    const message = mockMessage("what's the weather?", "user-1");
    expect(await contentAuditAction.validate!(runtime, message)).toBe(false);
  });
});

describe("ADD_MICHELIN_RESTAURANT action", () => {
  it("validate: returns false when message has no Michelin link", async () => {
    const runtime = mockRuntime();
    const message = mockMessage("Check out this restaurant in Paris", "user-1");
    expect(await addMichelinRestaurantAction.validate!(runtime, message)).toBe(
      false,
    );
  });

  it("validate: returns true when message has guide.michelin.com and room is knowledge", async () => {
    const runtime = {
      ...mockRuntime(),
      getRoom: async () => ({ name: "knowledge", id: "room-1" }),
    } as unknown as IAgentRuntime;
    const message = {
      ...mockMessage(
        "https://guide.michelin.com/fr/nouvelle-aquitaine/bordeaux/restaurant/foo",
        "user-1",
      ),
      roomId: "room-1",
    } as Memory;
    expect(await addMichelinRestaurantAction.validate!(runtime, message)).toBe(
      true,
    );
  });
});

describe("Plugin export", () => {
  it("should have 15 actions", () => {
    expect(elizaPlugin.actions).toBeDefined();
    expect(elizaPlugin.actions.length).toBe(15);
  });

  it("should include CONTENT_AUDIT action", () => {
    const names = elizaPlugin.actions.map((a) => a.name);
    expect(names).toContain("CONTENT_AUDIT");
  });
});
