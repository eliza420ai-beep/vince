/**
 * Smoke test for PRD Generator - validates the core PRD generation pipeline
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  generatePRD,
  generatePRDFromRequest,
  savePRD,
  listPRDs,
  generateTaskBrief,
  type PRDInput,
} from "../services/prdGenerator.service";

const TEST_PRD_DIR = path.join(process.cwd(), "standup-deliverables", "prds");

describe("PRD Generator Smoke Test", () => {
  let generatedPRDPath: string | null = null;

  afterAll(() => {
    // Clean up test PRD if created
    if (generatedPRDPath && fs.existsSync(generatedPRDPath)) {
      // Keep it for inspection - just log it
      console.log(`\n📋 PRD saved at: ${generatedPRDPath}`);
    }
  });

  describe("generatePRDFromRequest", () => {
    it("generates a PRD from natural language request", () => {
      const prd = generatePRDFromRequest(
        "Create automated release notes generator for v2.1.0 that scans merged PRs, extracts key changes from plugin-sentinel and plugin-eliza, and outputs a GitHub-ready CHANGELOG entry"
      );

      expect(prd).toBeDefined();
      expect(prd.id).toMatch(/^PRD-\d{8}-[A-Z0-9]{4}$/);
      expect(prd.title).toBeTruthy();
      expect(prd.priority).toMatch(/^P[0-3]$/);
      expect(prd.effort).toMatch(/^(XS|S|M|L|XL)$/);
      expect(prd.sections.length).toBeGreaterThan(5);
      expect(prd.markdown).toContain("North Star");
      expect(prd.markdown).toContain("Success Criteria");
      expect(prd.markdown).toContain("Implementation Guide");

      console.log("\n✅ Generated PRD:");
      console.log(`   ID: ${prd.id}`);
      console.log(`   Title: ${prd.title}`);
      console.log(`   Priority: ${prd.priority} | Effort: ${prd.effort}`);
      console.log(`   Sections: ${prd.sections.length}`);
    });

    it("detects priority keywords", () => {
      const urgentPRD = generatePRDFromRequest("urgent fix for critical bug blocking deployment");
      expect(urgentPRD.priority).toBe("P0");

      const laterPRD = generatePRDFromRequest("nice to have feature for later consideration");
      expect(laterPRD.priority).toBe("P2");
    });

    it("detects effort keywords", () => {
      const smallPRD = generatePRDFromRequest("quick simple fix for typo");
      expect(smallPRD.effort).toBe("S");

      const largePRD = generatePRDFromRequest("large complex rewrite of the entire module");
      expect(largePRD.effort).toBe("L");
    });
  });

  describe("generatePRD", () => {
    it("generates a structured PRD from input", () => {
      const input: PRDInput = {
        title: "v2.1.0 Release Notes Generator",
        description: "Automated changelog generation by scanning merged PRs and extracting key changes from plugin-sentinel and plugin-eliza upgrades",
        plugin: "plugin-sentinel",
        priority: "P1",
        estimatedEffort: "M",
        requestedBy: "Yves",
      };

      const prd = generatePRD(input);

      expect(prd.title).toBe("v2.1.0 Release Notes Generator");
      expect(prd.priority).toBe("P1");
      expect(prd.effort).toBe("M");
      
      // Check all required sections exist
      const sectionHeadings = prd.sections.map(s => s.heading);
      expect(sectionHeadings).toContain("🎯 North Star");
      expect(sectionHeadings).toContain("📋 Goal & Scope");
      expect(sectionHeadings).toContain("👤 User Story");
      expect(sectionHeadings).toContain("✅ Success Criteria");
      expect(sectionHeadings).toContain("🔧 Technical Specification");
      expect(sectionHeadings).toContain("🛠 Implementation Guide (for Claude Code)");
      expect(sectionHeadings).toContain("🧪 Testing & Validation");
      expect(sectionHeadings).toContain("🚫 Out of Scope");

      // Check markdown includes key elements
      expect(prd.markdown).toContain("plugin-sentinel");
      expect(prd.markdown).toContain("Yves");
      expect(prd.markdown).toContain("Architecture Rules");
    });
  });

  describe("savePRD", () => {
    it("saves PRD to standup-deliverables/prds/", () => {
      const prd = generatePRDFromRequest("Test PRD for v2.1.0 release notes smoke test");
      
      generatedPRDPath = savePRD(prd);

      expect(fs.existsSync(generatedPRDPath)).toBe(true);
      expect(generatedPRDPath).toContain("standup-deliverables/prds/");
      expect(generatedPRDPath).toMatch(/\.md$/);

      const content = fs.readFileSync(generatedPRDPath, "utf-8");
      expect(content).toContain(prd.id);
      expect(content).toContain("North Star");
    });
  });

  describe("listPRDs", () => {
    it("lists existing PRDs", () => {
      // First ensure at least one PRD exists
      const prd = generatePRDFromRequest("List test PRD");
      savePRD(prd);

      const prds = listPRDs();
      
      expect(Array.isArray(prds)).toBe(true);
      expect(prds.length).toBeGreaterThan(0);
      expect(prds[0]).toHaveProperty("filename");
      expect(prds[0]).toHaveProperty("path");
      expect(prds[0]).toHaveProperty("created");
    });
  });

  describe("generateTaskBrief", () => {
    it("generates a shorter task brief", () => {
      const brief = generateTaskBrief(
        "Add release notes action",
        "New action to generate changelog from PRs",
        "plugin-sentinel"
      );

      expect(brief).toContain("Add release notes action");
      expect(brief).toContain("plugin-sentinel");
      expect(brief).toContain("Plugin boundaries");
      expect(brief).toContain("Coding 24/7");
    });
  });
});
