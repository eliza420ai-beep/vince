/**
 * Tests for standup.tasks (round-robin order, useRalphLoop).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import type { IAgentRuntime, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import { runStandupRoundRobin, useRalphLoop } from "../standup.tasks";
import { STANDUP_REPORT_ORDER } from "../standup.constants";

function createMockAgentRuntime(agentId: string, name: string) {
  return {
    agentId,
    character: { name, system: "" },
    useModel: async () => "reply",
  };
}

function createMockRuntimeWithElizaOS(
  agentsInWrongOrder: { agentId: string; character: { name: string } }[],
) {
  const agentRuntimes = new Map(
    agentsInWrongOrder.map((a) => [
      a.agentId,
      createMockAgentRuntime(a.agentId, a.character.name),
    ]),
  );
  const getAgent = (agentId: string) => agentRuntimes.get(agentId) ?? null;
  const handleMessage = async (
    _agentId: string,
    _msg: unknown,
    opts?: { onResponse?: (content: unknown) => void },
  ) => {
    opts?.onResponse?.({ text: "reply" });
  };
  const elizaOS = {
    getAgents: () => [...agentsInWrongOrder],
    getAgent,
    handleMessage,
  };
  const runtime = {
    agentId: uuidv4() as UUID,
    character: { name: "Kelly" },
  } as unknown as IAgentRuntime;
  (runtime as { elizaOS?: unknown }).elizaOS = elizaOS;
  return runtime;
}

describe("standup.tasks", () => {
  describe("runStandupRoundRobin", () => {
    it("invokes agents in STANDUP_REPORT_ORDER even when getAgents returns wrong order", async () => {
      const wrongOrder = [
        "Solus",
        "Kelly",
        "VINCE",
        "Eliza",
        "ECHO",
        "Oracle",
        "Otaku",
        "Sentinel",
        "Clawterm",
        "Naval",
      ];
      const agentsInWrongOrder = wrongOrder.map((name) => ({
        agentId: `id-${name.toLowerCase()}`,
        character: { name },
      }));
      const runtime = createMockRuntimeWithElizaOS(agentsInWrongOrder);
      const roomId = uuidv4() as UUID;
      const facilitatorEntityId = uuidv4() as UUID;
      const kickoffText = "Standup 2026-02-13. @VINCE, go.";

      const { replies } = await runStandupRoundRobin(
        runtime,
        roomId,
        facilitatorEntityId,
        kickoffText,
      );

      const replyNames = replies.map((r) => r.agentName);
      const expectedOrder = [...STANDUP_REPORT_ORDER];
      expect(replyNames).toEqual(expectedOrder);
      expect(replies.every((r) => r.text === "reply")).toBe(true);
    });
  });

  describe("useRalphLoop", () => {
    const key = "STANDUP_USE_RALPH_LOOP";

    afterEach(() => {
      delete process.env[key];
    });

    it("returns true when env unset (default)", () => {
      expect(useRalphLoop()).toBe(true);
    });

    it("returns true when env is not 'false'", () => {
      process.env[key] = "true";
      expect(useRalphLoop()).toBe(true);
      process.env[key] = "1";
      expect(useRalphLoop()).toBe(true);
    });

    it("returns false when env is 'false'", () => {
      process.env[key] = "false";
      expect(useRalphLoop()).toBe(false);
    });
  });
});
