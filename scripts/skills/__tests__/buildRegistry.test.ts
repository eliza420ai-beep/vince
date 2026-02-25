/**
 * Tests for build-registry.ts
 * Verifies that the script reads SKILL.md files and produces valid registry entries.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseSkillFile,
  buildRegistry,
  extractTriggers,
  detectOwner,
  detectRiskLevel,
  type SkillRegistryEntry,
} from "../build-registry";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_SKILL_MD = `---
name: mock-research
description: >
  A mock research skill for testing.
  Use when: (1) user says "mock research", "search mock", "find mock stuff",
  (2) user wants mock data or testing.
  NOT for: production use.
---

# Mock Research Skill

This skill is for testing. Use it to search for mock data.

Owner: Echo agent
`;

const HIGH_RISK_SKILL_MD = `---
name: live-trader
description: >
  Live trading on Hyperliquid with real money and wallet execution.
  Use when: (1) user says "live trading", "execute trade", "hyperliquid live".
  NOT for: paper trading.
---

# Live Trader

Execute live trades with real money using a funded wallet.
`;

let tmpDir: string;
let tmpRepoRoot: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "build-registry-test-"));
  tmpRepoRoot = tmpDir;

  // Create mock skills directory structure
  const mockSkillDir = path.join(tmpDir, "skills", "mock-research");
  fs.mkdirSync(mockSkillDir, { recursive: true });
  fs.writeFileSync(path.join(mockSkillDir, "SKILL.md"), MOCK_SKILL_MD, "utf-8");

  const liveSkillDir = path.join(tmpDir, "skills", "live-trader");
  fs.mkdirSync(liveSkillDir, { recursive: true });
  fs.writeFileSync(path.join(liveSkillDir, "SKILL.md"), HIGH_RISK_SKILL_MD, "utf-8");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests: extractTriggers
// ---------------------------------------------------------------------------

describe("extractTriggers", () => {
  it("extracts quoted phrases from Use when section", () => {
    const triggers = extractTriggers(MOCK_SKILL_MD);
    expect(triggers).toEqual(expect.arrayContaining(["mock research"]));
  });

  it("returns empty array for content with no triggers", () => {
    const triggers = extractTriggers("# Empty\n\nNo triggers here.");
    expect(triggers).toBeInstanceOf(Array);
  });

  it("deduplicates triggers", () => {
    const content = `---\nname: test\ndescription: Use when: "foo" or "foo" again.\n---\n# Test`;
    const triggers = extractTriggers(content);
    const fooCount = triggers.filter((t) => t === "foo").length;
    expect(fooCount).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Tests: detectOwner
// ---------------------------------------------------------------------------

describe("detectOwner", () => {
  it("detects echo agent as owner", () => {
    const content = "# Test\n\nOwner: Echo agent\n";
    expect(detectOwner(content)).toBe("echo");
  });

  it("returns shared when no agent mentioned", () => {
    const content = "# Generic skill\n\nThis is a generic skill.\n";
    expect(detectOwner(content)).toBe("shared");
  });

  it("detects otaku from use context", () => {
    const content = "# DeFi\n\nFor otaku to execute transactions.\n";
    expect(detectOwner(content)).toBe("otaku");
  });
});

// ---------------------------------------------------------------------------
// Tests: detectRiskLevel
// ---------------------------------------------------------------------------

describe("detectRiskLevel", () => {
  it("returns high for live trading content", () => {
    expect(detectRiskLevel(HIGH_RISK_SKILL_MD)).toBe("high");
  });

  it("returns high when content mentions wallet", () => {
    expect(detectRiskLevel("Uses a funded wallet with real money.")).toBe("high");
  });

  it("returns low for basic research content", () => {
    expect(detectRiskLevel("A simple research skill for reading data.")).toBe("low");
  });

  it("returns medium when content mentions paper trading", () => {
    expect(detectRiskLevel("Paper trading simulation only, no orders sent.")).toBe(
      "medium",
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: parseSkillFile
// ---------------------------------------------------------------------------

describe("parseSkillFile", () => {
  it("returns a valid SkillRegistryEntry from a SKILL.md file", () => {
    const skillPath = path.join(tmpDir, "skills", "mock-research", "SKILL.md");
    const entry = parseSkillFile(skillPath, tmpRepoRoot);

    expect(entry).toMatchObject<Partial<SkillRegistryEntry>>({
      name: "mock-research",
      location: expect.stringContaining("SKILL.md"),
      riskLevel: expect.stringMatching(/^(low|medium|high)$/),
      owner: expect.any(String),
    });
    expect(entry.description).toBeTruthy();
    expect(entry.triggers).toBeInstanceOf(Array);
    expect(entry.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("sets riskLevel=high for a high-risk skill", () => {
    const skillPath = path.join(tmpDir, "skills", "live-trader", "SKILL.md");
    const entry = parseSkillFile(skillPath, tmpRepoRoot);
    expect(entry.riskLevel).toBe("high");
  });

  it("sets the location as a relative path from repo root", () => {
    const skillPath = path.join(tmpDir, "skills", "mock-research", "SKILL.md");
    const entry = parseSkillFile(skillPath, tmpRepoRoot);
    expect(entry.location).not.toContain(tmpRepoRoot);
    expect(entry.location).toBe("skills/mock-research/SKILL.md");
  });
});

// ---------------------------------------------------------------------------
// Tests: buildRegistry
// ---------------------------------------------------------------------------

describe("buildRegistry", () => {
  it("returns an array of SkillRegistryEntry objects", () => {
    const skillsDir = path.join(tmpDir, "skills");
    const entries = buildRegistry(skillsDir, tmpRepoRoot);

    expect(entries).toBeInstanceOf(Array);
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it("includes all skills in the directory", () => {
    const skillsDir = path.join(tmpDir, "skills");
    const entries = buildRegistry(skillsDir, tmpRepoRoot);
    const names = entries.map((e) => e.name);

    expect(names).toContain("mock-research");
    expect(names).toContain("live-trader");
  });

  it("each entry has required fields", () => {
    const skillsDir = path.join(tmpDir, "skills");
    const entries = buildRegistry(skillsDir, tmpRepoRoot);

    for (const entry of entries) {
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTypeOf("string");
      expect(entry.location).toContain("SKILL.md");
      expect(entry.triggers).toBeInstanceOf(Array);
      expect(["low", "medium", "high"]).toContain(entry.riskLevel);
      expect(entry.owner).toBeTypeOf("string");
      expect(entry.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("returns empty array when skills dir does not exist", () => {
    const entries = buildRegistry("/nonexistent/skills", "/nonexistent");
    expect(entries).toEqual([]);
  });
});
