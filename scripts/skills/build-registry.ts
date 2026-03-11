#!/usr/bin/env tsx
/**
 * Build Skill Registry
 *
 * Reads all skills/{name}/SKILL.md files and generates skills/registry.json
 * with metadata for each skill: name, description, location, triggers,
 * owner, riskLevel, lastUpdated.
 *
 * Usage: bun run skills:build-registry
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface SkillRegistryEntry {
  name: string;
  description: string;
  location: string; // relative path to SKILL.md
  triggers: string[]; // keyword phrases extracted from "Use when" section
  owner: string;
  riskLevel: "low" | "medium" | "high";
  lastUpdated: string; // ISO of last file modification
}

const HIGH_RISK_KEYWORDS = [
  "live",
  "execution",
  "wallet",
  "real money",
  "funded",
  "hyperliquid live",
  "live trading",
  "perps execution",
];

const AGENT_NAMES: Record<string, string> = {
  echo: "echo",
  eliza: "eliza",
  vince: "vince",
  sentinel: "sentinel",
  otaku: "otaku",
  solus: "solus",
  kelly: "kelly",
  oracle: "oracle",
  clawterm: "clawterm",
};

/**
 * Extract the front-matter block (between --- delimiters) from a SKILL.md file.
 */
function extractFrontMatter(content: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---/m.exec(content);
  if (!match) return {};
  const block = match[1];
  const result: Record<string, string> = {};
  // Handle multi-line values: name: value or name: >\n  continued
  const lines = block.split("\n");
  let currentKey = "";
  let currentValue = "";
  for (const line of lines) {
    const keyMatch = /^(\w+):\s*(.*)/.exec(line);
    if (keyMatch) {
      if (currentKey) result[currentKey] = currentValue.trim();
      currentKey = keyMatch[1];
      currentValue = keyMatch[2];
    } else if (currentKey && (line.startsWith("  ") || line.startsWith("\t"))) {
      currentValue += " " + line.trim();
    }
  }
  if (currentKey) result[currentKey] = currentValue.trim();
  return result;
}

/**
 * Extract triggers from the "Use when" section of a SKILL.md.
 * Looks for the phrase between "Use when:" and "NOT for:" or end of description.
 */
export function extractTriggers(content: string): string[] {
  const triggers: string[] = [];

  // Try extracting from front-matter description field
  const frontMatter = extractFrontMatter(content);
  const description = frontMatter.description ?? "";

  // Find the "Use when:" section
  const useWhenMatch =
    /Use when:\s*(?:\(1\)|1\.)?\s*([\s\S]*?)(?:NOT for:|$)/i.exec(description);
  if (useWhenMatch) {
    const useWhenText = useWhenMatch[1];
    // Extract quoted phrases or parenthetical items
    const quotedPhrases = [...useWhenText.matchAll(/"([^"]+)"/g)].map(
      (m) => m[1],
    );
    triggers.push(...quotedPhrases);

    // Also extract phrases from numbered items e.g. (1) user says "x research"
    const numberedItems = [
      ...useWhenText.matchAll(
        /\(\d+\)\s*(?:user\s+(?:says?|asks?|wants?|is)\s+(?:to\s+)?)?(.+?)(?=\(\d+\)|NOT for:|$)/gi,
      ),
    ];
    for (const item of numberedItems) {
      const text = item[1].trim();
      // Clean up the text
      const cleaned = text
        .replace(/["]/g, "")
        .replace(/,\s*$/, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length > 3 && cleaned.length < 100 && !cleaned.includes("(")) {
        triggers.push(cleaned.toLowerCase());
      }
    }
  }

  // Also try extracting from triggers-like patterns in the body
  const bodyTriggerMatch = /(?:triggers?|use when)[:\s]+([\s\S]*?)(?:\n#|\n\n|$)/i.exec(
    content,
  );
  if (bodyTriggerMatch) {
    const bodyText = bodyTriggerMatch[1];
    const phrases = [...bodyText.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    triggers.push(...phrases);
  }

  // Deduplicate and clean
  const unique = [...new Set(triggers)]
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2 && t.length < 80);

  return unique;
}

/**
 * Detect the owner agent from file content.
 */
export function detectOwner(content: string): string {
  const lower = content.toLowerCase();
  // Check for specific agent mentions
  for (const [keyword, agent] of Object.entries(AGENT_NAMES)) {
    const patterns = [
      new RegExp(`\\b${keyword}\\s+agent\\b`, "i"),
      new RegExp(`owner[:\\s]+${keyword}\\b`, "i"),
      new RegExp(`use\\s+${keyword}\\b`, "i"),
      new RegExp(`for\\s+${keyword}\\b`, "i"),
    ];
    if (patterns.some((p) => p.test(lower))) {
      return agent;
    }
  }
  return "shared";
}

/**
 * Detect risk level from file content.
 */
export function detectRiskLevel(content: string): "low" | "medium" | "high" {
  const lower = content.toLowerCase();
  if (HIGH_RISK_KEYWORDS.some((kw) => lower.includes(kw))) {
    return "high";
  }
  if (lower.includes("paper") || lower.includes("simulation")) {
    return "medium";
  }
  return "low";
}

/**
 * Parse a SKILL.md file and extract registry metadata.
 */
export function parseSkillFile(
  skillFilePath: string,
  repoRoot: string,
): SkillRegistryEntry {
  const content = fs.readFileSync(skillFilePath, "utf-8");
  const stat = fs.statSync(skillFilePath);
  const frontMatter = extractFrontMatter(content);

  const name = frontMatter.name ?? path.basename(path.dirname(skillFilePath));
  const description = (frontMatter.description ?? "")
    .replace(/>\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  const location = path.relative(repoRoot, skillFilePath);
  const triggers = extractTriggers(content);
  const owner = detectOwner(content);
  const riskLevel = detectRiskLevel(content);
  const lastUpdated = stat.mtime.toISOString();

  return {
    name,
    description,
    location,
    triggers,
    owner,
    riskLevel,
    lastUpdated,
  };
}

/**
 * Build the skill registry from all skills/{name}/SKILL.md files.
 */
export function buildRegistry(
  skillsDir: string,
  repoRoot: string,
): SkillRegistryEntry[] {
  if (!fs.existsSync(skillsDir)) {
    console.warn(`[build-registry] Skills directory not found: ${skillsDir}`);
    return [];
  }

  const entries: SkillRegistryEntry[] = [];
  const skillDirs = fs
    .readdirSync(skillsDir)
    .filter((d) => {
      const full = path.join(skillsDir, d);
      return fs.statSync(full).isDirectory() && d !== "__tests__";
    })
    .sort();

  for (const dir of skillDirs) {
    const skillFile = path.join(skillsDir, dir, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      console.warn(`[build-registry] No SKILL.md found in ${dir}, skipping`);
      continue;
    }
    try {
      const entry = parseSkillFile(skillFile, repoRoot);
      entries.push(entry);
      console.log(`  ✓ ${entry.name} (${entry.riskLevel}, owner: ${entry.owner})`);
    } catch (err) {
      console.error(`[build-registry] Failed to parse ${skillFile}:`, err);
    }
  }

  return entries;
}

/**
 * Generate a skills/README.md index of all skills.
 */
export function generateSkillsReadme(
  entries: SkillRegistryEntry[],
  skillsDir: string,
): void {
  const lines = [
    "# Skills Index",
    "",
    "Auto-generated index of all available skills. See individual SKILL.md files for full documentation.",
    "",
    "## Available Skills",
    "",
    "| Name | Description | Owner | Risk | SKILL.md |",
    "|------|-------------|-------|------|----------|",
  ];

  for (const entry of entries) {
    const desc =
      entry.description.length > 80
        ? entry.description.slice(0, 80) + "..."
        : entry.description;
    const riskEmoji =
      entry.riskLevel === "high"
        ? "🔴"
        : entry.riskLevel === "medium"
          ? "🟡"
          : "🟢";
    lines.push(
      `| **${entry.name}** | ${desc} | ${entry.owner} | ${riskEmoji} ${entry.riskLevel} | [SKILL.md](${entry.location}) |`,
    );
  }

  lines.push(
    "",
    "## Adding a New Skill",
    "",
    "1. Create `skills/[name]/SKILL.md` with front-matter (name, description, triggers)",
    "2. Run: `bun run skills:build-registry`",
    "3. Run: `bun run skills:check-drift`",
    "4. Add at least 3 trigger phrases and a decision template",
    "5. Submit PR with skill file + registry update",
    "",
    "See [GOVERNANCE.md](GOVERNANCE.md) for the skill lifecycle and promotion rules.",
    "",
    `_Last generated: ${new Date().toISOString()}_`,
  );

  const readmePath = path.join(skillsDir, "README.md");
  fs.writeFileSync(readmePath, lines.join("\n"), "utf-8");
  console.log(`\n✅ Generated ${readmePath}`);
}

// Main execution (when run directly)
if (
  import.meta.url === new URL(process.argv[1], "file://").href ||
  process.argv[1]?.endsWith("build-registry.ts")
) {
  const repoRoot = process.cwd();
  const skillsDir = path.join(repoRoot, "skills");
  const registryPath = path.join(skillsDir, "registry.json");

  console.log(`[build-registry] Scanning ${skillsDir}...`);
  const entries = buildRegistry(skillsDir, repoRoot);

  if (entries.length === 0) {
    console.warn("[build-registry] No skills found — registry will be empty");
  }

  fs.writeFileSync(registryPath, JSON.stringify(entries, null, 2) + "\n", "utf-8");
  console.log(`✅ Registry written to ${registryPath} (${entries.length} skills)`);

  generateSkillsReadme(entries, skillsDir);
}
