/**
 * Tests for Standup Reports
 */

import { describe, it, expect } from "bun:test";
import {
  AGENT_ROLES,
  REPORT_TEMPLATES,
  getReportTemplate,
  getAgentRole,
  isHumanMessage,
  buildStandupContext,
  formatReportDate,
  getDayOfWeek,
} from "../standupReports";
import type { Memory, UUID } from "@elizaos/core";

describe("Standup Reports", () => {
  describe("AGENT_ROLES", () => {
    it("defines all 8 agents", () => {
      const agents = Object.keys(AGENT_ROLES);
      expect(agents).toHaveLength(8);
      expect(agents).toContain("Eliza");
      expect(agents).toContain("VINCE");
      expect(agents).toContain("ECHO");
      expect(agents).toContain("Oracle");
      expect(agents).toContain("Solus");
      expect(agents).toContain("Otaku");
      expect(agents).toContain("Kelly");
      expect(agents).toContain("Sentinel");
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
        expect(REPORT_TEMPLATES[agent as keyof typeof REPORT_TEMPLATES]).toBeDefined();
      }
    });

    it("templates include {{date}} placeholder", () => {
      for (const template of Object.values(REPORT_TEMPLATES)) {
        expect(template).toContain("{{date}}");
      }
    });

    it("VINCE template has market sections", () => {
      expect(REPORT_TEMPLATES.VINCE).toContain("Market Snapshot");
      expect(REPORT_TEMPLATES.VINCE).toContain("Paper Bot");
      expect(REPORT_TEMPLATES.VINCE).toContain("Options Context");
    });

    it("Eliza template has research sections", () => {
      expect(REPORT_TEMPLATES.Eliza).toContain("Research Highlights");
      expect(REPORT_TEMPLATES.Eliza).toContain("Knowledge Gaps");
    });

    it("Kelly template has lifestyle sections", () => {
      expect(REPORT_TEMPLATES.Kelly).toContain("Daily Rhythm");
      expect(REPORT_TEMPLATES.Kelly).toContain("{{dayOfWeek}}");
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
      const validDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      expect(validDays).toContain(day);
    });
  });
});
