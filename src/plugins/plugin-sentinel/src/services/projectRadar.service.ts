/**
 * Project Radar Service
 *
 * Scans and understands the entire project state:
 * - Progress files (what's done, in progress, blocked)
 * - Plugin capabilities (actions, services per plugin)
 * - Knowledge gaps and coverage
 * - Recent activity (commits, changes)
 * - North star alignment
 *
 * Powers intelligent suggestions by knowing WHERE the project is.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

const REPO_ROOT = process.cwd();
const KNOWLEDGE_ROOT = path.join(REPO_ROOT, "knowledge");
const PLUGINS_ROOT = path.join(REPO_ROOT, "src/plugins");
const DOCS_ROOT = path.join(REPO_ROOT, "docs");
const TASKS_ROOT = path.join(REPO_ROOT, "tasks");
const RADAR_CACHE = path.join(
  REPO_ROOT,
  ".openclaw-cache",
  "project-radar.json",
);

// Key docs to always scan for priorities
const KEY_DOCS = [
  "README.md",
  "DEPLOY.md",
  "TREASURY.md",
  "FEATURE-STORE.md",
  "ONNX.md",
  "X-RESEARCH.md",
  "NOTIFICATIONS.md",
  "MULTI_AGENT.md",
  "BRANDING.md",
  "DISCORD.md",
  "PLAN-SLACK-DISCORD-KNOWLEDGE-RESEARCH.md",
];

export interface PluginStatus {
  name: string;
  path: string;
  actionCount: number;
  serviceCount: number;
  hasTests: boolean;
  lastModified: string;
  healthScore: number; // 0-100
}

export interface ProgressItem {
  version: string;
  title: string;
  status: "completed" | "in-progress" | "blocked" | "planned";
  date?: string;
  description?: string;
  plugin?: string;
}

export interface TodoItem {
  text: string;
  source: string;
  priority?: "high" | "medium" | "low";
  checked: boolean;
}

export interface RoadmapItem {
  title: string;
  description: string;
  source: string;
  status?: string;
}

export interface LessonLearned {
  pattern: string;
  action: string;
  source: string;
}

export interface DocInsight {
  doc: string;
  summary: string;
  todos: TodoItem[];
  priorities: string[];
  blockers: string[];
}

export interface ProjectState {
  scannedAt: string;

  // Progress tracking
  completed: ProgressItem[];
  inProgress: ProgressItem[];
  blocked: ProgressItem[];
  planned: ProgressItem[];

  // Plugin health
  plugins: PluginStatus[];
  totalActions: number;
  totalServices: number;

  // Knowledge state
  knowledgeCategories: Array<{
    name: string;
    fileCount: number;
    lastUpdated: string;
  }>;
  knowledgeGaps: string[];

  // North star alignment
  northStarDeliverables: Array<{
    deliverable: string;
    owner: string;
    status: "active" | "stale" | "missing";
    lastOutput?: string;
  }>;

  // Recent activity
  recentChanges: Array<{ file: string; daysAgo: number }>;

  // NEW: Deep doc analysis
  docInsights: DocInsight[];
  allTodos: TodoItem[];
  roadmapItems: RoadmapItem[];
  lessonsLearned: LessonLearned[];
  topPriorities: string[];
  criticalBlockers: string[];
}

/**
 * Parse progress.txt files to extract status items
 */
function parseProgressFile(
  filepath: string,
  pluginName: string,
): ProgressItem[] {
  if (!fs.existsSync(filepath)) return [];

  const content = fs.readFileSync(filepath, "utf-8");
  const items: ProgressItem[] = [];

  // Match version headers like "## V4.35 - Title (date) ✅"
  const completedMatches = content.matchAll(
    /##\s*(V[\d.]+)\s*-\s*([^\n(]+)(?:\(([^)]+)\))?\s*✅/g,
  );
  for (const match of completedMatches) {
    items.push({
      version: match[1],
      title: match[2].trim(),
      status: "completed",
      date: match[3]?.trim(),
      plugin: pluginName,
    });
  }

  // Match in-progress items "## V4.xx - Title (in progress)"
  const inProgressMatches = content.matchAll(
    /##\s*(V[\d.]+)\s*-\s*([^\n(]+)(?:\(([^)]*in.?progress[^)]*)\))?/gi,
  );
  for (const match of inProgressMatches) {
    if (!match[0].includes("✅")) {
      items.push({
        version: match[1],
        title: match[2].trim(),
        status: "in-progress",
        date: match[3]?.trim(),
        plugin: pluginName,
      });
    }
  }

  // Look for BLOCKED or TODO sections
  const blockedSection = content.match(
    /={3,}\s*BLOCKED\s*={3,}([\s\S]*?)(?:={3,}|$)/i,
  );
  if (blockedSection) {
    const blockedItems = blockedSection[1].matchAll(/[-*]\s*(.+)/g);
    for (const match of blockedItems) {
      items.push({
        version: "",
        title: match[1].trim(),
        status: "blocked",
        plugin: pluginName,
      });
    }
  }

  return items;
}

/**
 * Scan a plugin directory for capabilities
 */
function scanPlugin(pluginPath: string): PluginStatus | null {
  const name = path.basename(pluginPath);
  const srcPath = path.join(pluginPath, "src");

  if (!fs.existsSync(srcPath)) return null;

  let actionCount = 0;
  let serviceCount = 0;
  let hasTests = false;
  let lastModified = new Date(0);

  // Count actions
  const actionsPath = path.join(srcPath, "actions");
  if (fs.existsSync(actionsPath)) {
    const actionFiles = fs
      .readdirSync(actionsPath)
      .filter((f) => f.endsWith(".ts") && !f.includes(".test."));
    actionCount = actionFiles.length;
  }

  // Count services
  const servicesPath = path.join(srcPath, "services");
  if (fs.existsSync(servicesPath)) {
    const serviceFiles = fs
      .readdirSync(servicesPath)
      .filter((f) => f.endsWith(".ts") && !f.includes(".test."));
    serviceCount = serviceFiles.length;
  }

  // Check for tests
  const testsPath = path.join(srcPath, "__tests__");
  hasTests =
    fs.existsSync(testsPath) &&
    fs.readdirSync(testsPath).some((f) => f.includes(".test."));

  // Find last modified
  function findLastModified(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        findLastModified(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const stat = fs.statSync(fullPath);
        if (stat.mtime > lastModified) lastModified = stat.mtime;
      }
    }
  }
  findLastModified(srcPath);

  // Calculate health score
  let healthScore = 50;
  if (actionCount > 0) healthScore += 15;
  if (serviceCount > 0) healthScore += 15;
  if (hasTests) healthScore += 20;
  if (actionCount > 5) healthScore += 5;
  if (serviceCount > 5) healthScore += 5;

  return {
    name,
    path: pluginPath,
    actionCount,
    serviceCount,
    hasTests,
    lastModified: lastModified.toISOString(),
    healthScore: Math.min(100, healthScore),
  };
}

/**
 * Scan knowledge directories
 */
function scanKnowledge(): {
  categories: Array<{ name: string; fileCount: number; lastUpdated: string }>;
  gaps: string[];
} {
  const categories: Array<{
    name: string;
    fileCount: number;
    lastUpdated: string;
  }> = [];
  const gaps: string[] = [];

  if (!fs.existsSync(KNOWLEDGE_ROOT)) {
    return { categories, gaps: ["Knowledge root doesn't exist"] };
  }

  const dirs = fs
    .readdirSync(KNOWLEDGE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."));

  for (const dir of dirs) {
    const dirPath = path.join(KNOWLEDGE_ROOT, dir.name);
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".md"));

    let lastUpdated = new Date(0);
    for (const file of files) {
      const stat = fs.statSync(path.join(dirPath, file));
      if (stat.mtime > lastUpdated) lastUpdated = stat.mtime;
    }

    categories.push({
      name: dir.name,
      fileCount: files.length,
      lastUpdated: lastUpdated.toISOString(),
    });

    // Identify gaps
    if (files.length === 0) {
      gaps.push(`Empty knowledge category: ${dir.name}`);
    } else if (files.length < 3) {
      gaps.push(`Sparse knowledge: ${dir.name} (${files.length} files)`);
    }
  }

  // Check for expected categories that are missing
  const expectedCategories = ["sentinel-docs", "internal-docs", "teammate"];
  for (const expected of expectedCategories) {
    if (!categories.find((c) => c.name === expected)) {
      gaps.push(`Missing expected knowledge: ${expected}`);
    }
  }

  return { categories, gaps };
}

/**
 * Check north star deliverables status
 */
function checkNorthStar(): ProjectState["northStarDeliverables"] {
  const deliverables = [
    { deliverable: "Long-form essay", owner: "Eliza, Solus", dir: "essays" },
    { deliverable: "Banger tweets", owner: "Eliza, Solus", dir: "tweets" },
    { deliverable: "X article", owner: "Eliza, Solus", dir: "x-articles" },
    { deliverable: "Suggested trades", owner: "VINCE", dir: "trades" },
    { deliverable: "Good-life suggestions", owner: "Kelly", dir: "good-life" },
    { deliverable: "PRD for Cursor", owner: "Sentinel", dir: "prds" },
    {
      deliverable: "Integration instructions",
      owner: "Sentinel",
      dir: "integration-instructions",
    },
  ];

  const standupDir = path.join(REPO_ROOT, "standup-deliverables");

  return deliverables.map((d) => {
    const fullPath = path.join(standupDir, d.dir);

    if (!fs.existsSync(fullPath)) {
      return { ...d, status: "missing" as const };
    }

    const files = fs.readdirSync(fullPath).filter((f) => f.endsWith(".md"));
    if (files.length === 0) {
      return { ...d, status: "missing" as const };
    }

    // Check if most recent is stale (>7 days)
    const latestFile = files.sort().pop()!;
    const stat = fs.statSync(path.join(fullPath, latestFile));
    const daysSince = (Date.now() - stat.mtimeMs) / 86400000;

    return {
      ...d,
      status: daysSince > 7 ? ("stale" as const) : ("active" as const),
      lastOutput: latestFile,
    };
  });
}

/**
 * Parse a doc for todos, priorities, and insights
 */
function parseDocForInsights(filepath: string): DocInsight | null {
  if (!fs.existsSync(filepath)) return null;

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const docName = path.basename(filepath);
    const todos: TodoItem[] = [];
    const priorities: string[] = [];
    const blockers: string[] = [];

    // Extract todos: - [ ] item or - [x] item
    const todoMatches = content.matchAll(/^[\s]*[-*]\s*\[([ x])\]\s*(.+)$/gm);
    for (const match of todoMatches) {
      const checked = match[1] === "x";
      const text = match[2].trim();

      // Determine priority from keywords
      let priority: TodoItem["priority"] = "medium";
      if (/urgent|critical|asap|blocker|top priority/i.test(text)) {
        priority = "high";
      } else if (/nice to have|later|maybe|low priority/i.test(text)) {
        priority = "low";
      }

      todos.push({ text, source: docName, priority, checked });
    }

    // Extract priorities from headers and lists
    const prioritySection = content.match(
      /(?:##?\s*(?:priorities?|top priority|what's next|roadmap|todo))\s*([\s\S]*?)(?=\n##|\n---|\Z)/gi,
    );
    if (prioritySection) {
      for (const section of prioritySection) {
        const items = section.matchAll(
          /^[\s]*[-*\d.]\s*\*?\*?(.+?)\*?\*?\s*$/gm,
        );
        for (const item of items) {
          const text = item[1].trim();
          if (text.length > 5 && text.length < 200 && !text.startsWith("#")) {
            priorities.push(text);
          }
        }
      }
    }

    // Extract blockers
    const blockerPatterns = [
      /blocked(?:\s+by)?[:\s]+(.+)/gi,
      /blocker[:\s]+(.+)/gi,
      /waiting (?:on|for)[:\s]+(.+)/gi,
      /depends on[:\s]+(.+)/gi,
    ];

    for (const pattern of blockerPatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        blockers.push(match[1].trim().slice(0, 100));
      }
    }

    // Generate summary from first meaningful paragraph
    const lines = content
      .split("\n")
      .filter(
        (l) =>
          l.trim() &&
          !l.startsWith("#") &&
          !l.startsWith("-") &&
          !l.startsWith("|"),
      );
    const summary = lines.slice(0, 3).join(" ").slice(0, 200);

    return {
      doc: docName,
      summary,
      todos,
      priorities: priorities.slice(0, 5),
      blockers,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Scan all key docs for insights
 */
function scanAllDocs(): {
  insights: DocInsight[];
  allTodos: TodoItem[];
  roadmapItems: RoadmapItem[];
  lessons: LessonLearned[];
  topPriorities: string[];
  blockers: string[];
} {
  const insights: DocInsight[] = [];
  const allTodos: TodoItem[] = [];
  const roadmapItems: RoadmapItem[] = [];
  const lessons: LessonLearned[] = [];
  const topPriorities: string[] = [];
  const blockers: string[] = [];

  // Scan root-level key docs
  for (const doc of KEY_DOCS) {
    const insight = parseDocForInsights(path.join(REPO_ROOT, doc));
    if (insight) {
      insights.push(insight);
      allTodos.push(...insight.todos);
      topPriorities.push(...insight.priorities);
      blockers.push(...insight.blockers);
    }
  }

  // Scan docs/ folder
  if (fs.existsSync(DOCS_ROOT)) {
    const docFiles = fs.readdirSync(DOCS_ROOT).filter((f) => f.endsWith(".md"));
    for (const doc of docFiles) {
      const insight = parseDocForInsights(path.join(DOCS_ROOT, doc));
      if (insight) {
        insights.push(insight);
        allTodos.push(...insight.todos);
        topPriorities.push(...insight.priorities);
        blockers.push(...insight.blockers);
      }
    }
  }

  // Scan tasks/ folder
  if (fs.existsSync(TASKS_ROOT)) {
    const taskFiles = fs
      .readdirSync(TASKS_ROOT)
      .filter((f) => f.endsWith(".md"));
    for (const task of taskFiles) {
      const insight = parseDocForInsights(path.join(TASKS_ROOT, task));
      if (insight) {
        insights.push(insight);
        allTodos.push(...insight.todos);
        topPriorities.push(...insight.priorities);
        blockers.push(...insight.blockers);
      }
    }
  }

  // Scan sentinel-docs for specific items
  const sentinelDocs = path.join(KNOWLEDGE_ROOT, "sentinel-docs");
  if (fs.existsSync(sentinelDocs)) {
    const priorityDocs = [
      "NORTH_STAR_DELIVERABLES.md",
      "PROGRESS-CONSOLIDATED.md",
      "ELIZAOS_BENCHMARKS.md",
      "WORTH_IT_PROOF.md",
      "RECENT-SHIPMENTS.md",
    ];

    for (const doc of priorityDocs) {
      const insight = parseDocForInsights(path.join(sentinelDocs, doc));
      if (insight) {
        insights.push(insight);
        allTodos.push(...insight.todos);
        topPriorities.push(...insight.priorities);
      }
    }
  }

  // Parse lessons from tasks/lessons.md
  const lessonsFile = path.join(TASKS_ROOT, "lessons.md");
  if (fs.existsSync(lessonsFile)) {
    try {
      const content = fs.readFileSync(lessonsFile, "utf-8");
      const patternMatches = content.matchAll(/\*\*(.+?):\*\*\s*(.+)/g);
      for (const match of patternMatches) {
        lessons.push({
          pattern: match[1].trim(),
          action: match[2].trim().slice(0, 150),
          source: "lessons.md",
        });
      }
    } catch (e) {
      // Skip
    }
  }

  // Parse LESSONS-AND-IMPROVEMENTS.md
  const lessonsImprovements = path.join(
    TASKS_ROOT,
    "LESSONS-AND-IMPROVEMENTS.md",
  );
  if (fs.existsSync(lessonsImprovements)) {
    try {
      const content = fs.readFileSync(lessonsImprovements, "utf-8");

      // Extract "What to improve next" section
      const improveSection = content.match(
        /##\s*What to improve next([\s\S]*?)(?=\n##|\Z)/i,
      );
      if (improveSection) {
        const items = improveSection[1].matchAll(/^\d+\.\s*\*\*(.+?)\*\*/gm);
        for (const item of items) {
          roadmapItems.push({
            title: item[1].trim(),
            description: "",
            source: "LESSONS-AND-IMPROVEMENTS.md",
          });
        }
      }
    } catch (e) {
      // Skip
    }
  }

  // Deduplicate and sort
  const uniquePriorities = [...new Set(topPriorities)].slice(0, 10);
  const uniqueBlockers = [...new Set(blockers)].slice(0, 10);

  return {
    insights,
    allTodos: allTodos.filter((t) => !t.checked).slice(0, 50),
    roadmapItems,
    lessons,
    topPriorities: uniquePriorities,
    blockers: uniqueBlockers,
  };
}

/**
 * Find recently changed files
 */
function findRecentChanges(
  daysBack = 7,
): Array<{ file: string; daysAgo: number }> {
  const changes: Array<{ file: string; daysAgo: number }> = [];
  const cutoff = Date.now() - daysBack * 86400000;

  function scanDir(dir: string, prefix = "") {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        scanDir(fullPath, relativePath);
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".md")) {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs > cutoff) {
          changes.push({
            file: relativePath,
            daysAgo: Math.floor((Date.now() - stat.mtimeMs) / 86400000),
          });
        }
      }
    }
  }

  scanDir(path.join(REPO_ROOT, "src"));
  scanDir(path.join(REPO_ROOT, "knowledge"));

  return changes.sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 20);
}

/**
 * Full project scan
 */
export function scanProject(): ProjectState {
  logger.info("[ProjectRadar] Scanning project state...");

  const state: ProjectState = {
    scannedAt: new Date().toISOString(),
    completed: [],
    inProgress: [],
    blocked: [],
    planned: [],
    plugins: [],
    totalActions: 0,
    totalServices: 0,
    knowledgeCategories: [],
    knowledgeGaps: [],
    northStarDeliverables: [],
    recentChanges: [],
    // NEW
    docInsights: [],
    allTodos: [],
    roadmapItems: [],
    lessonsLearned: [],
    topPriorities: [],
    criticalBlockers: [],
  };

  // Scan plugins
  if (fs.existsSync(PLUGINS_ROOT)) {
    const pluginDirs = fs
      .readdirSync(PLUGINS_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("plugin-"));

    for (const dir of pluginDirs) {
      const pluginStatus = scanPlugin(path.join(PLUGINS_ROOT, dir.name));
      if (pluginStatus) {
        state.plugins.push(pluginStatus);
        state.totalActions += pluginStatus.actionCount;
        state.totalServices += pluginStatus.serviceCount;

        // Parse progress file if exists
        const progressPath = path.join(PLUGINS_ROOT, dir.name, "progress.txt");
        const items = parseProgressFile(progressPath, dir.name);
        for (const item of items) {
          if (item.status === "completed") state.completed.push(item);
          else if (item.status === "in-progress") state.inProgress.push(item);
          else if (item.status === "blocked") state.blocked.push(item);
          else state.planned.push(item);
        }
      }
    }
  }

  // Scan knowledge
  const { categories, gaps } = scanKnowledge();
  state.knowledgeCategories = categories;
  state.knowledgeGaps = gaps;

  // Check north star
  state.northStarDeliverables = checkNorthStar();

  // Find recent changes
  state.recentChanges = findRecentChanges();

  // NEW: Deep doc analysis
  const docAnalysis = scanAllDocs();
  state.docInsights = docAnalysis.insights;
  state.allTodos = docAnalysis.allTodos;
  state.roadmapItems = docAnalysis.roadmapItems;
  state.lessonsLearned = docAnalysis.lessons;
  state.topPriorities = docAnalysis.topPriorities;
  state.criticalBlockers = docAnalysis.blockers;

  // Cache the scan
  try {
    const cacheDir = path.dirname(RADAR_CACHE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(RADAR_CACHE, JSON.stringify(state, null, 2));
  } catch (e) {
    // Ignore cache errors
  }

  logger.info(
    `[ProjectRadar] Scan complete: ${state.plugins.length} plugins, ${state.totalActions} actions, ${state.docInsights.length} docs analyzed, ${state.allTodos.length} open todos`,
  );

  return state;
}

/**
 * Get a summary of the project state
 */
export function getProjectSummary(): string {
  const state = scanProject();

  let summary = `📡 **Project Radar**\n\n`;
  summary += `*Scanned ${state.docInsights.length} docs, ${state.plugins.length} plugins, ${state.knowledgeCategories.length} knowledge categories*\n\n`;

  // Top Priorities (from docs)
  if (state.topPriorities.length > 0) {
    summary += `**🎯 Top Priorities (from docs):**\n`;
    for (const p of state.topPriorities.slice(0, 5)) {
      summary += `• ${p.slice(0, 80)}${p.length > 80 ? "..." : ""}\n`;
    }
    summary += `\n`;
  }

  // Critical blockers
  if (state.criticalBlockers.length > 0) {
    summary += `**🚫 Blockers:**\n`;
    for (const b of state.criticalBlockers.slice(0, 3)) {
      summary += `• ${b}\n`;
    }
    summary += `\n`;
  }

  // Open TODOs
  const highTodos = state.allTodos.filter((t) => t.priority === "high");
  const mediumTodos = state.allTodos.filter((t) => t.priority === "medium");

  summary += `**📋 Open TODOs:** ${state.allTodos.length} total\n`;
  if (highTodos.length > 0) {
    summary += `• 🔴 High: ${highTodos.length}`;
    if (highTodos.length > 0)
      summary += ` — "${highTodos[0].text.slice(0, 40)}..."`;
    summary += `\n`;
  }
  if (mediumTodos.length > 0) {
    summary += `• 🟡 Medium: ${mediumTodos.length}\n`;
  }
  summary += `\n`;

  // Plugin overview
  summary += `**Plugins (${state.plugins.length}):** ${state.totalActions} actions, ${state.totalServices} services\n`;
  const topPlugins = state.plugins
    .sort((a, b) => b.actionCount - a.actionCount)
    .slice(0, 4);
  for (const p of topPlugins) {
    const health =
      p.healthScore >= 80 ? "🟢" : p.healthScore >= 50 ? "🟡" : "🔴";
    summary += `${health} ${p.name}: ${p.actionCount}A/${p.serviceCount}S\n`;
  }
  summary += `\n`;

  // Progress
  summary += `**Progress:**\n`;
  summary += `• ✅ ${state.completed.length} completed\n`;
  summary += `• 🔄 ${state.inProgress.length} in progress\n`;
  if (state.blocked.length > 0)
    summary += `• 🚫 ${state.blocked.length} blocked\n`;
  summary += `\n`;

  // North star
  const activeNS = state.northStarDeliverables.filter(
    (d) => d.status === "active",
  );
  const staleNS = state.northStarDeliverables.filter(
    (d) => d.status === "stale",
  );
  const missingNS = state.northStarDeliverables.filter(
    (d) => d.status === "missing",
  );

  summary += `**North Star:** ${activeNS.length}/${state.northStarDeliverables.length} active\n`;
  if (staleNS.length > 0)
    summary += `• Stale: ${staleNS.map((d) => d.deliverable).join(", ")}\n`;
  if (missingNS.length > 0)
    summary += `• Missing: ${missingNS.map((d) => d.deliverable).join(", ")}\n`;
  summary += `\n`;

  // Lessons learned
  if (state.lessonsLearned.length > 0) {
    summary += `**📚 Lessons (${state.lessonsLearned.length}):**\n`;
    for (const l of state.lessonsLearned.slice(0, 2)) {
      summary += `• ${l.pattern}: ${l.action.slice(0, 60)}...\n`;
    }
    summary += `\n`;
  }

  // Recent activity
  if (state.recentChanges.length > 0) {
    const today = state.recentChanges.filter((c) => c.daysAgo === 0);
    const thisWeek = state.recentChanges.filter((c) => c.daysAgo > 0);
    summary += `**Activity:** ${today.length} files today, ${thisWeek.length} this week\n`;
  }

  return summary;
}

/**
 * Get detailed todos from all docs
 */
export function getAllTodos(): TodoItem[] {
  const state = scanProject();
  return state.allTodos;
}

/**
 * Get lessons learned
 */
export function getLessons(): LessonLearned[] {
  const state = scanProject();
  return state.lessonsLearned;
}

/**
 * Get doc insights for a specific doc
 */
export function getDocInsight(docName: string): DocInsight | undefined {
  const state = scanProject();
  return state.docInsights.find((d) =>
    d.doc.toLowerCase().includes(docName.toLowerCase()),
  );
}

export default {
  scanProject,
  getProjectSummary,
};
