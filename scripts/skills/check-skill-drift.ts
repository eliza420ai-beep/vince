#!/usr/bin/env tsx
/**
 * Check Skill Drift
 *
 * Checks for drift between SKILL.md files and actual referenced scripts/files.
 * 1. Reads skills/registry.json
 * 2. For each skill, verifies its SKILL.md location file exists
 * 3. For each SKILL.md, scans for file references (paths like skills/... or scripts/...)
 *    and verifies those files exist on disk
 * 4. Outputs list of drifted references
 * 5. Exit code 1 if any drift, 0 if clean
 *
 * Usage: bun run skills:check-drift
 */

import * as fs from "node:fs";
import * as path from "node:path";

const REPO_ROOT = process.cwd();

interface RegistryEntry {
  name: string;
  location: string;
  [key: string]: unknown;
}

interface DriftReport {
  skill: string;
  type: "missing_skill_md" | "missing_reference";
  path: string;
  line?: string;
}

/**
 * Extract file path references from a SKILL.md body.
 * Looks for paths like:
 *   - skills/x-research/...
 *   - scripts/...
 *   - src/plugins/...
 * Excludes URLs (http/https), anchors (#...), and bare filenames without slashes.
 */
export function extractFileReferences(content: string): string[] {
  const refs: string[] = [];

  // Match paths that look like relative file paths (contain a / and don't start with http)
  const pathPattern =
    /(?:^|[\s`(["'])((skills|scripts|src|data|docs|knowledge)\/[^\s`)"'\]#>]+)/gm;
  let match: RegExpExecArray | null;
  while ((match = pathPattern.exec(content)) !== null) {
    const ref = match[1].trim();
    // Skip URLs
    if (ref.startsWith("http")) continue;
    // Skip if it ends with common non-file chars
    const cleaned = ref.replace(/[),;'"]+$/, "");
    if (cleaned.length > 2 && cleaned.includes("/")) {
      refs.push(cleaned);
    }
  }

  // Deduplicate
  return [...new Set(refs)];
}

/**
 * Check if a file exists relative to the repo root.
 */
function fileExists(relativePath: string): boolean {
  const fullPath = path.join(REPO_ROOT, relativePath);
  return fs.existsSync(fullPath);
}

/**
 * Run the drift check.
 */
function checkDrift(): { drifted: DriftReport[]; clean: boolean } {
  const drifted: DriftReport[] = [];
  const registryPath = path.join(REPO_ROOT, "skills", "registry.json");

  // Step 1: Load registry
  if (!fs.existsSync(registryPath)) {
    console.error(
      `[check-drift] ❌ skills/registry.json not found. Run: bun run skills:build-registry`,
    );
    process.exitCode = 1;
    return { drifted, clean: false };
  }

  let registry: RegistryEntry[];
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, "utf-8")) as RegistryEntry[];
  } catch (err) {
    console.error(`[check-drift] ❌ Failed to parse skills/registry.json:`, err);
    process.exitCode = 1;
    return { drifted, clean: false };
  }

  console.log(`[check-drift] Checking ${registry.length} skill(s) from registry...`);

  // Step 2: Verify each skill's SKILL.md exists
  for (const entry of registry) {
    if (!entry.location) {
      console.warn(`[check-drift] ⚠️  Skill "${entry.name}" has no location in registry`);
      continue;
    }
    if (!fileExists(entry.location)) {
      drifted.push({
        skill: entry.name,
        type: "missing_skill_md",
        path: entry.location,
        line: `(registry entry location: ${entry.location})`,
      });
      console.log(`  ❌ ${entry.name}: SKILL.md not found at ${entry.location}`);
    } else {
      console.log(`  ✓ ${entry.name}: ${entry.location} exists`);
    }
  }

  // Step 3: For each SKILL.md, check referenced files
  const skillsDir = path.join(REPO_ROOT, "skills");
  if (!fs.existsSync(skillsDir)) {
    console.warn(`[check-drift] Skills directory not found: ${skillsDir}`);
    return { drifted, clean: drifted.length === 0 };
  }

  const skillDirs = fs
    .readdirSync(skillsDir)
    .filter((d) => {
      const full = path.join(skillsDir, d);
      return fs.statSync(full).isDirectory() && d !== "__tests__";
    });

  for (const dir of skillDirs) {
    const skillMdPath = path.join(skillsDir, dir, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;

    const content = fs.readFileSync(skillMdPath, "utf-8");
    const refs = extractFileReferences(content);
    const skillDir = path.join(skillsDir, dir);

    for (const ref of refs) {
      // Skip references that look like example/placeholder paths
      if (ref.includes("{") || ref.includes("[") || ref.includes("...")) continue;
      // Skip if it's a directory-only reference (no extension or ends with /)
      if (ref.endsWith("/")) continue;

      // Check both from repo root and relative to skill directory
      const existsFromRoot = fileExists(ref);
      const existsFromSkillDir = fs.existsSync(path.join(skillDir, ref));
      // For data/ paths, also check under skills/[dir]/data/
      const existsFromSkillData = ref.startsWith("data/")
        ? fs.existsSync(path.join(skillDir, ref))
        : false;

      if (!existsFromRoot && !existsFromSkillDir && !existsFromSkillData) {
        drifted.push({
          skill: dir,
          type: "missing_reference",
          path: ref,
          line: `(referenced in skills/${dir}/SKILL.md)`,
        });
        console.log(`  ⚠️  ${dir}: reference not found: ${ref}`);
      }
    }
  }

  return { drifted, clean: drifted.length === 0 };
}

// Main execution
const { drifted, clean } = checkDrift();

console.log("");
if (clean) {
  console.log("✅ No drift detected — all SKILL.md files and references are in sync.");
  process.exit(0);
} else {
  console.log(`❌ Drift detected: ${drifted.length} issue(s) found:`);
  for (const report of drifted) {
    console.log(
      `  [${report.type}] ${report.skill}: ${report.path}${report.line ? " " + report.line : ""}`,
    );
  }
  process.exit(1);
}
