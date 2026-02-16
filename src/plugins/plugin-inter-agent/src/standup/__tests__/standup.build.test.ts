/**
 * Tests for standup build (isNorthStarType, executeBuildActionItem with mocked runtime).
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { IAgentRuntime } from "@elizaos/core";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import {
  isNorthStarType,
  executeBuildActionItem,
  executeNorthStarDeliverable,
  type BuildActionResult,
} from "../standup.build";
import type { StandupActionItem } from "../standup.parse";

const TEST_DELIVERABLES_DIR = path.join(os.tmpdir(), "standup-deliverables-build-test-" + Date.now());

describe("standup.build", () => {
  beforeEach(() => {
    process.env.STANDUP_DELIVERABLES_DIR = TEST_DELIVERABLES_DIR;
    process.env.STANDUP_BUILD_FALLBACK_TO_VINCE = "true";
    process.env.MILAIDY_GATEWAY_URL = "";
    if (fs.existsSync(TEST_DELIVERABLES_DIR)) {
      fs.rmSync(TEST_DELIVERABLES_DIR, { recursive: true });
    }
  });

  describe("isNorthStarType", () => {
    it("returns true for north-star types", () => {
      expect(isNorthStarType("essay")).toBe(true);
      expect(isNorthStarType("tweets")).toBe(true);
      expect(isNorthStarType("x_article")).toBe(true);
      expect(isNorthStarType("trades")).toBe(true);
      expect(isNorthStarType("good_life")).toBe(true);
      expect(isNorthStarType("prd")).toBe(true);
      expect(isNorthStarType("integration_instructions")).toBe(true);
    });

    it("returns false for build and remind", () => {
      expect(isNorthStarType("build")).toBe(false);
      expect(isNorthStarType("remind")).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isNorthStarType(undefined)).toBe(false);
    });
  });

  describe("executeBuildActionItem", () => {
    it("returns null when description is empty", async () => {
      const runtime = {} as unknown as IAgentRuntime;
      const item: StandupActionItem = { assigneeAgentName: "Sentinel", description: "   ", type: "build" };
      const result = await executeBuildActionItem(runtime, item);
      expect(result).toBeNull();
    });

    it("routes north-star type to executeNorthStarDeliverable", async () => {
      const runtime = {
        useModel: mock(() =>
          Promise.resolve("# PRD\n\n## Goal\nTest PRD content for Cursor.")
        ),
      } as unknown as IAgentRuntime;
      const item: StandupActionItem = {
        assigneeAgentName: "Sentinel",
        description: "Add login flow PRD",
        type: "prd",
      };
      const result = await executeBuildActionItem(runtime, item);
      expect(result).not.toBeNull();
      expect(result!.path).toContain("prds");
      expect(result!.path).toContain(".md");
      expect(result!.message).toContain("North-star");
    });
  });

  describe("executeNorthStarDeliverable", () => {
    it("returns null when type is missing or not north-star", async () => {
      const runtime = {} as unknown as IAgentRuntime;
      const itemBuild: StandupActionItem = {
        assigneeAgentName: "Sentinel",
        description: "Build script",
        type: "build",
      };
      const resultBuild = await executeNorthStarDeliverable(runtime, itemBuild);
      expect(resultBuild).toBeNull();

      const itemNoType: StandupActionItem = {
        assigneeAgentName: "Sentinel",
        description: "Something",
      };
      const resultNoType = await executeNorthStarDeliverable(runtime, itemNoType);
      expect(resultNoType).toBeNull();
    });

    it("returns null when description is empty", async () => {
      const runtime = {} as unknown as IAgentRuntime;
      const item: StandupActionItem = {
        assigneeAgentName: "Sentinel",
        description: "",
        type: "essay",
      };
      const result = await executeNorthStarDeliverable(runtime, item);
      expect(result).toBeNull();
    });

    it("writes file and manifest for valid north-star type", async () => {
      const content = "## Essay body\n\nParagraph one.";
      const runtime = {
        useModel: mock(() => Promise.resolve(content)),
      } as unknown as IAgentRuntime;
      const item: StandupActionItem = {
        assigneeAgentName: "Sentinel",
        description: "Write an essay on crypto",
        type: "essay",
      };
      const result = await executeNorthStarDeliverable(runtime, item);
      expect(result).not.toBeNull();
      expect(result!.path).toBeDefined();
      expect(fs.existsSync(result!.path!)).toBe(true);
      expect(fs.readFileSync(result!.path!, "utf-8")).toContain("Essay body");

      const manifestPath = path.join(TEST_DELIVERABLES_DIR, "manifest.md");
      if (fs.existsSync(manifestPath)) {
        const manifest = fs.readFileSync(manifestPath, "utf-8");
        expect(manifest).toContain("essay");
      }
    });
  });
});
