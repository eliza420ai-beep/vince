/**
 * PRD Generator Service — World-Class Product Requirement Documents
 *
 * Generates enterprise-grade PRDs that Claude Code/Cursor can execute perfectly.
 * Follows Apple's benefit-led + Porsche's craft-focused approach.
 *
 * PRD structure:
 * 1. North Star (what we're building toward)
 * 2. Goal & Scope (what this specific PRD delivers)
 * 3. User Story (who benefits, how)
 * 4. Success Criteria (measurable outcomes)
 * 5. Technical Spec (architecture rules, constraints)
 * 6. Implementation Guide (step-by-step for Claude)
 * 7. Testing & Validation
 * 8. Out of Scope (explicit boundaries)
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";
import { scanProject, type ProjectState } from "./projectRadar.service";

const PRD_OUTPUT_DIR = path.join(process.cwd(), "standup-deliverables", "prds");

export interface PRDInput {
  title: string;
  description: string;
  plugin?: string;
  priority?: "P0" | "P1" | "P2" | "P3";
  estimatedEffort?: "XS" | "S" | "M" | "L" | "XL";
  requestedBy?: string;
  dependencies?: string[];
}

export interface PRDSection {
  heading: string;
  content: string;
}

export interface PRD {
  id: string;
  title: string;
  version: string;
  createdAt: string;
  priority: string;
  effort: string;
  sections: PRDSection[];
  markdown: string;
}

// Architecture rules we enforce
const ARCHITECTURE_RULES = [
  "**Plugin boundaries:** Logic lives in plugins, not agents. Agents are thin orchestrators.",
  "**No duplicate lanes:** Each agent owns a clear domain. No overlapping responsibilities.",
  "**Services over actions:** Complex logic goes in services; actions are thin wrappers.",
  "**Type safety:** All parameters have TypeScript types. No `any` unless absolutely necessary.",
  "**Testability:** New services include unit tests. Mocked external deps.",
  "**Error handling:** Graceful degradation. Never crash the agent on external failures.",
  "**Cache-first:** Expensive operations cache results. Use `.openclaw-cache/` or memory.",
  "**No AI slop:** Code comments and logs use clear, human language. No 'leverage', 'utilize', 'robust'.",
];

// Project context we always include
const PROJECT_CONTEXT = {
  northStar:
    "Push, not pull. 24/7 market research. Self-improving paper trading bot. One team, one dream.",
  techStack: "ElizaOS + TypeScript + Bun + Supabase + ONNX",
  agents: [
    { name: "Eliza", lane: "Knowledge, research, content (CEO)" },
    { name: "VINCE", lane: "Data, signals, paper trading (CDO)" },
    { name: "Solus", lane: "Execution, sizing, risk (CFO)" },
    { name: "Otaku", lane: "DeFi, wallet, onchain ops (COO)" },
    { name: "Kelly", lane: "Lifestyle, touch grass (CVO)" },
    { name: "Sentinel", lane: "Ops, code, PRDs, infra (CTO)" },
  ],
  keyDirs: {
    plugins: "src/plugins/",
    knowledge: "knowledge/",
    deliverables: "standup-deliverables/",
    docs: "docs/",
  },
};

/**
 * Generate a PRD ID
 */
function generatePRDId(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PRD-${date}-${rand}`;
}

/**
 * Get current project context for PRD
 */
function getProjectContext(): string {
  try {
    const state = scanProject();

    const activePlugins = state.plugins
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 5)
      .map(
        (p) =>
          `• ${p.name}: ${p.actionCount} actions, ${p.serviceCount} services`,
      )
      .join("\n");

    const inProgressWork =
      state.inProgress
        .slice(0, 3)
        .map((i) => `• ${i.title}`)
        .join("\n") || "None tracked";

    const blockers =
      state.criticalBlockers
        .slice(0, 3)
        .map((b) => `• ${b}`)
        .join("\n") || "None identified";

    return `**Active Plugins:**
${activePlugins}

**In Progress:**
${inProgressWork}

**Current Blockers:**
${blockers}`;
  } catch (e) {
    return "*Project scan unavailable*";
  }
}

/**
 * Generate the North Star section
 */
function generateNorthStarSection(input: PRDInput): PRDSection {
  return {
    heading: "🎯 North Star",
    content: `${PROJECT_CONTEXT.northStar}

This PRD advances the mission by: **${input.description.slice(0, 100)}...**

**Agent Lanes (never overlap):**
${PROJECT_CONTEXT.agents.map((a) => `• **${a.name}:** ${a.lane}`).join("\n")}`,
  };
}

/**
 * Generate Goal & Scope section
 */
function generateGoalSection(input: PRDInput): PRDSection {
  const plugin = input.plugin ? `\n**Target Plugin:** \`${input.plugin}\`` : "";

  return {
    heading: "📋 Goal & Scope",
    content: `**Title:** ${input.title}
**Priority:** ${input.priority || "P1"} | **Effort:** ${input.estimatedEffort || "M"}${plugin}

**What we're building:**
${input.description}

**Why it matters:**
- Advances 24/7 market research capability
- Reduces manual intervention
- Improves system reliability or user experience`,
  };
}

/**
 * Generate User Story section
 */
function generateUserStorySection(input: PRDInput): PRDSection {
  const requestedBy = input.requestedBy || "the team";

  return {
    heading: "👤 User Story",
    content: `**As** ${requestedBy}
**I want** ${input.title.toLowerCase()}
**So that** I can ${input.description.split(".")[0].toLowerCase()}

**Primary Actor:** Developer / Claude Code
**Secondary Actors:** Agents (${PROJECT_CONTEXT.agents.map((a) => a.name).join(", ")})`,
  };
}

/**
 * Generate Success Criteria section
 */
function generateSuccessCriteriaSection(input: PRDInput): PRDSection {
  return {
    heading: "✅ Success Criteria",
    content: `**Must Have (P0):**
- [ ] Feature works as described in Goal
- [ ] No regression in existing functionality
- [ ] Tests pass: \`bun test\`
- [ ] TypeScript compiles: \`bun run build\`

**Should Have (P1):**
- [ ] Unit tests for new services
- [ ] Error handling for edge cases
- [ ] Logs at appropriate levels (debug, info, warn, error)

**Nice to Have (P2):**
- [ ] Performance within acceptable bounds
- [ ] Documentation updated if public API changes`,
  };
}

/**
 * Generate Technical Spec section
 */
function generateTechnicalSpecSection(input: PRDInput): PRDSection {
  const plugin = input.plugin || "plugin-vince";
  const deps = input.dependencies?.length
    ? `\n**Dependencies:**\n${input.dependencies.map((d) => `• ${d}`).join("\n")}`
    : "";

  return {
    heading: "🔧 Technical Specification",
    content: `**Tech Stack:** ${PROJECT_CONTEXT.techStack}

**Target Location:** \`src/plugins/${plugin}/src/\`
${deps}

**Architecture Rules (MANDATORY):**
${ARCHITECTURE_RULES.map((r, i) => `${i + 1}. ${r}`).join("\n")}

**Project Context:**
${getProjectContext()}`,
  };
}

/**
 * Generate Implementation Guide section
 */
function generateImplementationGuideSection(input: PRDInput): PRDSection {
  const plugin = input.plugin || "plugin-vince";

  return {
    heading: "🛠 Implementation Guide (for Claude Code)",
    content: `**Step-by-step:**

1. **Read context first:**
   - Check \`src/plugins/${plugin}/\` structure
   - Review related services in \`src/plugins/${plugin}/src/services/\`
   - Understand existing patterns

2. **Create/modify files:**
   - Services go in \`services/*.service.ts\`
   - Actions go in \`actions/*.action.ts\`
   - Export from \`index.ts\`

3. **Follow patterns:**
   - Copy structure from similar existing files
   - Use \`logger\` from \`@elizaos/core\`
   - Add JSDoc comments for public functions

4. **Test:**
   - Add tests in \`__tests__/*.test.ts\`
   - Run \`bun test\` to verify
   - Run \`bun run build\` to check types

5. **Commit:**
   - Clear commit message: \`feat(${plugin}): ${input.title.toLowerCase()}\`
   - Reference this PRD ID in commit

**Mindset:** Coding 24/7. Keep the architecture as good as it gets.`,
  };
}

/**
 * Generate Testing section
 */
function generateTestingSection(input: PRDInput): PRDSection {
  const plugin = input.plugin || "plugin-vince";

  return {
    heading: "🧪 Testing & Validation",
    content: `**Unit Tests:**
- File: \`src/plugins/${plugin}/src/__tests__/${input.title.toLowerCase().replace(/\s+/g, "-")}.test.ts\`
- Mock external dependencies
- Test happy path + error cases

**Integration Tests:**
- Verify action triggers correctly
- Verify service outputs expected data
- Check cache behavior if applicable

**Manual Verification:**
- Run \`elizaos dev\`
- Trigger the action via chat
- Verify output matches expectations

**Commands:**
\`\`\`bash
bun test src/plugins/${plugin}/  # Run plugin tests
bun run build                     # Type check
elizaos dev                       # Manual test
\`\`\``,
  };
}

/**
 * Generate Out of Scope section
 */
function generateOutOfScopeSection(input: PRDInput): PRDSection {
  return {
    heading: "🚫 Out of Scope",
    content: `**NOT included in this PRD:**
- UI changes (unless explicitly stated)
- Database schema changes (unless explicitly stated)
- Changes to other plugins (${input.plugin ? `except ${input.plugin}` : "stay in lane"})
- Performance optimization (unless P0)
- Documentation updates (separate task)

**Future considerations:**
- ${input.title} V2 with expanded capabilities
- Integration with other agents if needed`,
  };
}

/**
 * Generate a complete PRD
 */
export function generatePRD(input: PRDInput): PRD {
  logger.info(`[PRDGenerator] Creating PRD: ${input.title}`);

  const id = generatePRDId();
  const now = new Date().toISOString();

  const sections: PRDSection[] = [
    generateNorthStarSection(input),
    generateGoalSection(input),
    generateUserStorySection(input),
    generateSuccessCriteriaSection(input),
    generateTechnicalSpecSection(input),
    generateImplementationGuideSection(input),
    generateTestingSection(input),
    generateOutOfScopeSection(input),
  ];

  // Build markdown
  const markdown = `# ${input.title}

**PRD ID:** ${id}
**Version:** 1.0
**Created:** ${now.slice(0, 10)}
**Priority:** ${input.priority || "P1"} | **Effort:** ${input.estimatedEffort || "M"}
**Status:** Ready for Implementation

---

${sections.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n---\n\n")}

---

*Generated by Sentinel PRD Generator. Keep the architecture as good as it gets.*
`;

  return {
    id,
    title: input.title,
    version: "1.0",
    createdAt: now,
    priority: input.priority || "P1",
    effort: input.estimatedEffort || "M",
    sections,
    markdown,
  };
}

/**
 * Save PRD to standup-deliverables
 */
export function savePRD(prd: PRD): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = prd.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 50);
  const filename = `${date}-prd-${slug}.md`;
  const filepath = path.join(PRD_OUTPUT_DIR, filename);

  // Ensure directory exists
  if (!fs.existsSync(PRD_OUTPUT_DIR)) {
    fs.mkdirSync(PRD_OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(filepath, prd.markdown);
  logger.info(`[PRDGenerator] Saved PRD to ${filepath}`);

  return filepath;
}

/**
 * Generate a quick task brief (shorter than full PRD)
 */
export function generateTaskBrief(
  title: string,
  description: string,
  plugin?: string,
): string {
  const pluginTarget = plugin || "plugin-vince";

  return `**Task:** ${title}

**Description:** ${description}

**Target:** \`src/plugins/${pluginTarget}/src/\`

**Rules:**
1. Plugin boundaries — logic in plugins, agents stay thin
2. No duplicate lanes — each agent owns its domain
3. Services over actions — complex logic in services
4. Type safety — no \`any\` unless necessary
5. Testable — add unit tests for new services

**Mindset:** Coding 24/7. Keep the architecture as good as it gets.

**After completion:**
- Run \`bun test\`
- Run \`bun run build\`
- Commit with: \`feat(${pluginTarget}): ${title.toLowerCase()}\``;
}

/**
 * List existing PRDs
 */
export function listPRDs(): Array<{
  filename: string;
  path: string;
  created: Date;
}> {
  if (!fs.existsSync(PRD_OUTPUT_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PRD_OUTPUT_DIR)
    .filter((f) => f.endsWith(".md") && f.includes("-prd-"))
    .map((filename) => {
      const filepath = path.join(PRD_OUTPUT_DIR, filename);
      const stat = fs.statSync(filepath);
      return { filename, path: filepath, created: stat.mtime };
    })
    .sort((a, b) => b.created.getTime() - a.created.getTime());
}

/**
 * Generate PRD from natural language request
 */
export function generatePRDFromRequest(request: string): PRD {
  // Parse the request to extract key info
  const titleMatch = request.match(
    /(?:build|create|add|implement|make)\s+(?:a\s+)?(.+?)(?:\s+(?:that|which|for|to|in))/i,
  );
  const title = titleMatch?.[1]?.trim() || request.slice(0, 50);

  const pluginMatch = request.match(/(?:in|for)\s+(plugin-[a-z-]+)/i);
  const plugin = pluginMatch?.[1];

  // Determine priority from keywords
  let priority: PRDInput["priority"] = "P1";
  if (/urgent|critical|asap|blocker/i.test(request)) priority = "P0";
  if (/nice to have|later|low priority/i.test(request)) priority = "P2";

  // Determine effort from keywords
  let effort: PRDInput["estimatedEffort"] = "M";
  if (/small|quick|minor|simple/i.test(request)) effort = "S";
  if (/large|major|complex|rewrite/i.test(request)) effort = "L";
  if (/huge|massive|epic/i.test(request)) effort = "XL";

  return generatePRD({
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description: request,
    plugin,
    priority,
    estimatedEffort: effort,
  });
}

export default {
  generatePRD,
  generatePRDFromRequest,
  generateTaskBrief,
  savePRD,
  listPRDs,
};
