/**
 * Tests for Standup Reports
 */

import { describe, it, expect } from "bun:test";
import {
  AGENT_ROLES,
  REPORT_TEMPLATES,
  buildStandupPrompt,
  extractAgentSection,
  formatReportDate,
  getAgentRole,
  getDayOfWeek,
  getReportTemplate,
  isHumanMessage,
  buildStandupContext,
  sanitizeStandupReply,
} from "../standupReports";
import {
  getEssentialStandupQuestion,
  ESSENTIAL_STANDUP_QUESTION,
} from "../standup.constants";
import type { Memory, UUID } from "@elizaos/core";

describe("Standup Reports", () => {
  describe("AGENT_ROLES", () => {
    it("defines all 10 agents", () => {
      const agents = Object.keys(AGENT_ROLES);
      expect(agents).toHaveLength(10);
      expect(agents).toContain("Eliza");
      expect(agents).toContain("VINCE");
      expect(agents).toContain("ECHO");
      expect(agents).toContain("Oracle");
      expect(agents).toContain("Solus");
      expect(agents).toContain("Otaku");
      expect(agents).toContain("Kelly");
      expect(agents).toContain("Sentinel");
      expect(agents).toContain("Clawterm");
      expect(agents).toContain("Naval");
    });

    it("each agent has title, focus, and reportSections", () => {
      for (const [name, role] of Object.entries(AGENT_ROLES)) {
        expect(role.title).toBeDefined();
        expect(role.focus).toBeDefined();
        expect(role.reportSections).toBeInstanceOf(Array);
        expect(role.reportSections.length).toBeGreaterThan(0);
      }
    });
  });

  describe("REPORT_TEMPLATES", () => {
    it("has template for each agent", () => {
      for (const agent of Object.keys(AGENT_ROLES)) {
        expect(
          REPORT_TEMPLATES[agent as keyof typeof REPORT_TEMPLATES],
        ).toBeDefined();
      }
    });

    it("templates are non-empty and casual (no date headers)", () => {
      for (const template of Object.values(REPORT_TEMPLATES)) {
        expect(template.length).toBeGreaterThan(0);
        expect(template).not.toContain("Action:");
      }
    });

    it("VINCE template mentions BTC and SOL", () => {
      expect(REPORT_TEMPLATES.VINCE).toContain("BTC");
      expect(REPORT_TEMPLATES.VINCE).toContain("SOL");
    });

    it("Eliza template is short and casual", () => {
      expect(REPORT_TEMPLATES.Eliza).toContain("substack");
      expect(REPORT_TEMPLATES.Eliza).toContain("corpus");
    });

    it("Oracle template mentions odds", () => {
      expect(REPORT_TEMPLATES.Oracle).toContain("95%");
    });

    it("Otaku template mentions wallet setup", () => {
      expect(REPORT_TEMPLATES.Otaku).toContain("wallet");
      expect(REPORT_TEMPLATES.Otaku).toContain("bankr");
    });

    it("Sentinel template mentions shipped", () => {
      expect(REPORT_TEMPLATES.Sentinel).toContain("shipped");
    });

    it("ECHO template mentions CT", () => {
      expect(REPORT_TEMPLATES.ECHO).toContain("ct");
    });

    it("Solus template mentions covered call", () => {
      expect(REPORT_TEMPLATES.Solus).toContain("covered call");
      expect(REPORT_TEMPLATES.Solus).toContain("invalidation");
    });

    it("Kelly template is standup facilitator", () => {
      expect(REPORT_TEMPLATES.Kelly).toContain("standup");
      expect(REPORT_TEMPLATES.Kelly).toContain("@VINCE");
    });
  });

  describe("getReportTemplate", () => {
    it("returns template for known agent", () => {
      expect(getReportTemplate("VINCE")).toBe(REPORT_TEMPLATES.VINCE);
      expect(getReportTemplate("Eliza")).toBe(REPORT_TEMPLATES.Eliza);
    });

    it("is case-insensitive", () => {
      expect(getReportTemplate("vince")).toBe(REPORT_TEMPLATES.VINCE);
      expect(getReportTemplate("ELIZA")).toBe(REPORT_TEMPLATES.Eliza);
    });

    it("returns null for unknown agent", () => {
      expect(getReportTemplate("Unknown")).toBeNull();
    });
  });

  describe("getAgentRole", () => {
    it("returns role for known agent", () => {
      const vinceRole = getAgentRole("VINCE");
      expect(vinceRole?.title).toBe("CDO");
      expect(vinceRole?.focus).toBe("Market Intelligence");
    });

    it("is case-insensitive", () => {
      expect(getAgentRole("kelly")?.title).toBe("CVO");
    });
  });

  describe("isHumanMessage", () => {
    const createMemory = (name: string, isBot?: boolean): Memory => ({
      id: "test" as UUID,
      agentId: "agent" as UUID,
      entityId: "entity" as UUID,
      roomId: "room" as UUID,
      content: {
        text: "test",
        name,
        metadata: isBot !== undefined ? { isBot } : undefined,
      },
      createdAt: Date.now(),
    });

    it("returns false for known agents", () => {
      expect(isHumanMessage(createMemory("VINCE"))).toBe(false);
      expect(isHumanMessage(createMemory("Eliza"))).toBe(false);
      expect(isHumanMessage(createMemory("kelly"))).toBe(false);
    });

    it("returns false for bot metadata", () => {
      expect(isHumanMessage(createMemory("SomeBot", true))).toBe(false);
    });

    it("returns true for unknown non-bot names", () => {
      expect(isHumanMessage(createMemory("Yves"))).toBe(true);
      expect(isHumanMessage(createMemory("RandomUser"))).toBe(true);
    });
  });

  describe("buildStandupContext", () => {
    it("includes agent role info", () => {
      const context = buildStandupContext("VINCE", false);
      expect(context).toContain("VINCE");
      expect(context).toContain("CDO");
      expect(context).toContain("Market Intelligence");
    });

    it("includes human presence context when human is present", () => {
      const context = buildStandupContext("VINCE", true, "Yves");
      expect(context).toContain("HUMAN IN CHANNEL");
      expect(context).toContain("Yves");
      expect(context).toContain("priority");
    });

    it("omits human context when not present", () => {
      const context = buildStandupContext("VINCE", false);
      expect(context).not.toContain("HUMAN IN CHANNEL");
    });
  });

  describe("formatReportDate", () => {
    it("returns date in YYYY-MM-DD format", () => {
      const date = formatReportDate();
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getDayOfWeek", () => {
    it("returns a valid day name", () => {
      const day = getDayOfWeek();
      const validDays = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      expect(validDays).toContain(day);
    });
  });

  describe("Essential standup question", () => {
    it("ESSENTIAL_STANDUP_QUESTION is non-empty and mentions BTC and Friday", () => {
      expect(ESSENTIAL_STANDUP_QUESTION).toBeTruthy();
      expect(ESSENTIAL_STANDUP_QUESTION.length).toBeGreaterThan(10);
      expect(ESSENTIAL_STANDUP_QUESTION).toContain("BTC");
      expect(ESSENTIAL_STANDUP_QUESTION).toContain("Friday");
    });

    it("getEssentialStandupQuestion returns non-empty and mentions BTC", () => {
      const q = getEssentialStandupQuestion();
      expect(q).toBeTruthy();
      expect(q).toContain("BTC");
      expect(q).toContain("Friday");
    });
  });

  describe("extractAgentSection", () => {
    const shared = `## VINCE
BTC 66k, SOL 81. Paper bot: 3W 2L.

## Eliza
Knowledge gaps: none today. Essay: TBD.

## Naval
Conclusion slot.`;

    it("returns section for exact ## AgentName match", () => {
      const vince = extractAgentSection(shared, "VINCE");
      expect(vince).toContain("BTC 66k");
      expect(vince).not.toContain("Eliza");
      expect(vince).not.toContain("Naval");
    });

    it("returns section for case-insensitive match when exact fails", () => {
      const eliza = extractAgentSection(shared, "eliza");
      expect(eliza).toContain("Knowledge gaps");
      expect(eliza).not.toContain("VINCE");
    });

    it("returns fallback when agent section missing", () => {
      const out = extractAgentSection(shared, "Oracle");
      expect(out).toContain("No section for this agent");
    });

    it("returns fallback when shared insights empty", () => {
      expect(extractAgentSection("", "VINCE")).toContain("No shared insights");
      expect(extractAgentSection("   ", "VINCE")).toContain(
        "No shared insights",
      );
    });
  });

  describe("buildStandupPrompt", () => {
    const shared = "## VINCE\nBTC 66k.\n\n## Eliza\nGaps: none.";
    const transcript = "VINCE: done.\nEliza: done.";
    const dateStr = "2026-02-19";

    it("Naval gets full transcript and synthesis instructions", () => {
      const prompt = buildStandupPrompt("Naval", shared, transcript, dateStr);
      expect(prompt).toContain("FULL TRANSCRIPT");
      expect(prompt).toContain(transcript);
      expect(prompt).toContain("2–4 short sentences");
      expect(prompt).not.toContain("TEMPLATE (fill this in)");
    });

    it("non-Naval gets example and only their data section", () => {
      const prompt = buildStandupPrompt("VINCE", shared, transcript, dateStr);
      expect(prompt).toContain("EXAMPLE");
      expect(prompt).toContain("YOUR DATA");
      expect(prompt).toContain("BTC 66k");
      expect(prompt).not.toContain("FULL TRANSCRIPT");
      expect(prompt).not.toContain("Gaps: none"); // Eliza's section
    });

    it("includes role and constraints", () => {
      const prompt = buildStandupPrompt("Eliza", shared, transcript, dateStr);
      expect(prompt).toContain("CEO");
      expect(prompt).toContain("Day Report");
      expect(prompt).toContain("60 words");
    });
  });

  describe("sanitizeStandupReply", () => {
    it("returns null or empty as-is", () => {
      expect(sanitizeStandupReply(null, "VINCE")).toBeNull();
      expect(sanitizeStandupReply("", "Eliza")).toBe("");
    });

    it("returns empty string when reply is only JSON (so raw JSON never leaks)", () => {
      const onlyJson =
        '{"signals":[{"asset":"BTC","direction":"bearish","confidence_pct":58}]}';
      const out = sanitizeStandupReply(onlyJson, "VINCE");
      expect(out).toBe("");
      expect(typeof out).toBe("string");
    });

    it("strips all JSON including canonical signals (already parsed before sanitize)", () => {
      const reply =
        "everything red. btc 66k.\n\n" +
        '```json\n{"signals":[{"asset":"BTC","direction":"bearish","confidence_pct":58}]}\n```\n\n' +
        '```json\n{"system_status":{"overall_health":"GREEN"}}\n```';
      const out = sanitizeStandupReply(reply, "VINCE");
      expect(out).toContain("everything red");
      expect(out).toContain("btc 66k");
      expect(out).not.toContain("signals");
      expect(out).not.toContain("system_status");
    });

    it("strips all fenced blocks for agents without canonical JSON", () => {
      const reply =
        "next up: prd.\n\n" +
        '```json\n{"system_status":{"overall_health":"GREEN"},"cost_tracking":{"monthly_infra_spend":"$1,842"}}\n```';
      const out = sanitizeStandupReply(reply, "Sentinel");
      expect(out).toContain("next up: prd");
      expect(out).not.toContain("system_status");
      expect(out).not.toContain("cost_tracking");
    });

    it("strips multiline raw JSON (steps) for Otaku", () => {
      const reply =
        "status: under construction.\n\n" +
        '{\n  "steps": ["Configure Bankr", "Test balance"],\n  "task": "Generate keys"\n}';
      const out = sanitizeStandupReply(reply, "Otaku");
      expect(out).toContain("under construction");
      expect(out).not.toContain("steps");
      expect(out).not.toContain("Configure Bankr");
    });

    it("strips multiline raw JSON when signals is array of strings (non-canonical)", () => {
      const reply =
        "next up: prd.\n\n" +
        '{\n  "signals": ["infrastructure_optimization", "multi_agent_protocol_design"]\n}';
      const out = sanitizeStandupReply(reply, "Sentinel");
      expect(out).toContain("next up: prd");
      expect(out).not.toContain("infrastructure_optimization");
      expect(out).not.toContain("multi_agent_protocol_design");
    });

    it("strips single-line JSON of any kind", () => {
      const reply =
        "working on yield strategies.\n" +
        '{"signal": "research_expansion", "priority": "high"}';
      const out = sanitizeStandupReply(reply, "Eliza");
      expect(out).toContain("yield strategies");
      expect(out).not.toContain("research_expansion");
      expect(out).not.toContain('"priority"');
    });
  });
});
