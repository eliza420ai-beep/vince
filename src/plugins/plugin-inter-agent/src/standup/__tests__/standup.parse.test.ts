/**
 * Tests for standup transcript parsing (countCrossAgentLinks; parseStandupTranscript with mocked LLM).
 */

import { describe, it, expect, mock } from "bun:test";
import type { IAgentRuntime } from "@elizaos/core";
import { countCrossAgentLinks, parseStandupTranscript } from "../standup.parse";

describe("standup.parse", () => {
  describe("countCrossAgentLinks", () => {
    it("returns 0 for empty or whitespace transcript", () => {
      expect(countCrossAgentLinks("")).toBe(0);
      expect(countCrossAgentLinks("   ")).toBe(0);
    });

    it("counts segments with both agent name and linking phrase", () => {
      const transcript = [
        "VINCE said funding is up. This aligns with ECHO's view on sentiment.",
        "Oracle's odds contradict Solus. We should fact-check.",
      ].join("\n\n");
      expect(countCrossAgentLinks(transcript)).toBe(2);
    });

    it("ignores short segments", () => {
      const transcript = "VINCE. Short.";
      expect(countCrossAgentLinks(transcript)).toBe(0);
    });

    it("ignores segments with only agent name (no linking phrase)", () => {
      const transcript = "VINCE reported good data. No link phrase here.";
      expect(countCrossAgentLinks(transcript)).toBe(0);
    });

    it("ignores segments with only linking phrase (no agent)", () => {
      const transcript = "This aligns with the market. No agent name.";
      expect(countCrossAgentLinks(transcript)).toBe(0);
    });
  });

  describe("parseStandupTranscript", () => {
    it("returns empty result on LLM failure", async () => {
      const runtime = {
        useModel: mock(() => {
          throw new Error("LLM error");
        }),
      } as unknown as IAgentRuntime;
      const result = await parseStandupTranscript(runtime, "Some transcript");
      expect(result).toEqual({
        actionItems: [],
        lessonsByAgentName: {},
        disagreements: [],
        suggestions: [],
      });
    });

    it("parses valid JSON and normalizes action item types", async () => {
      const validJson = JSON.stringify({
        actionItems: [
          {
            assigneeAgentName: "Sentinel",
            description: "Write a script",
            type: "build",
          },
          {
            assigneeAgentName: "VINCE",
            description: "Remind me",
            type: "remind",
          },
        ],
        lessonsByAgentName: { VINCE: "Markets were volatile." },
        disagreements: [],
        suggestions: ["Add more crypto context"],
      });
      const runtime = {
        useModel: mock(() => Promise.resolve(validJson)),
      } as unknown as IAgentRuntime;
      const result = await parseStandupTranscript(runtime, "Transcript...");
      expect(result.actionItems).toHaveLength(2);
      expect(result.actionItems[0]).toMatchObject({
        assigneeAgentName: "Sentinel",
        description: "Write a script",
        type: "build",
      });
      expect(result.lessonsByAgentName).toEqual({
        VINCE: "Markets were volatile.",
      });
      expect(result.suggestions).toEqual(["Add more crypto context"]);
    });

    it("extracts JSON from response wrapped in text", async () => {
      const validJson = JSON.stringify({
        actionItems: [],
        lessonsByAgentName: {},
        disagreements: [],
        suggestions: [],
      });
      const wrapped = `Here is the parsed result:\n${validJson}\nEnd.`;
      const runtime = {
        useModel: mock(() => Promise.resolve(wrapped)),
      } as unknown as IAgentRuntime;
      const result = await parseStandupTranscript(runtime, "Transcript...");
      expect(result.actionItems).toEqual([]);
      expect(result.lessonsByAgentName).toEqual({});
    });

    it("defaults missing fields to empty arrays/object", async () => {
      const minimalJson = JSON.stringify({});
      const runtime = {
        useModel: mock(() => Promise.resolve(minimalJson)),
      } as unknown as IAgentRuntime;
      const result = await parseStandupTranscript(runtime, "Transcript...");
      expect(result.actionItems).toEqual([]);
      expect(result.lessonsByAgentName).toEqual({});
      expect(result.disagreements).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it("maps invalid action item type to remind", async () => {
      const json = JSON.stringify({
        actionItems: [
          {
            assigneeAgentName: "Kelly",
            description: "Do something",
            type: "unknown_type",
          },
        ],
        lessonsByAgentName: {},
        disagreements: [],
        suggestions: [],
      });
      const runtime = {
        useModel: mock(() => Promise.resolve(json)),
      } as unknown as IAgentRuntime;
      const result = await parseStandupTranscript(runtime, "Transcript...");
      expect(result.actionItems).toHaveLength(1);
      expect(result.actionItems[0].type).toBe("remind");
    });
  });
});
