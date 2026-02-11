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
  knowledgeCategories: Array<{ name: string; fileCount: number; lastUpdated: string }>;
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
}

/**
 * Parse progress.txt files to extract status items
 */
function parseProgressFile(filepath: string, pluginName: string): ProgressItem[] {
  if (!fs.existsSync(filepath)) return [];
  
  const content = fs.readFileSync(filepath, "utf-8");
  const items: ProgressItem[] = [];
  
  // Match version headers like "## V4.35 - Title (date) ✅"
  const completedMatches = content.matchAll(/##\s*(V[\d.]+)\s*-\s*([^\n(]+)(?:\(([^)]+)\))?\s*✅/g);
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
  const inProgressMatches = content.matchAll(/##\s*(V[\d.]+)\s*-\s*([^\n(]+)(?:\(([^)]*in.?progress[^)]*)\))?/gi);
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
  const blockedSection = content.match(/={3,}\s*BLOCKED\s*={3,}([\s\S]*?)(?:={3,}|$)/i);
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
    const actionFiles = fs.readdirSync(actionsPath).filter(f => f.endsWith(".ts") && !f.includes(".test."));
    actionCount = actionFiles.length;
  }
  
  // Count services
  const servicesPath = path.join(srcPath, "services");
  if (fs.existsSync(servicesPath)) {
    const serviceFiles = fs.readdirSync(servicesPath).filter(f => f.endsWith(".ts") && !f.includes(".test."));
    serviceCount = serviceFiles.length;
  }
  
  // Check for tests
  const testsPath = path.join(srcPath, "__tests__");
  hasTests = fs.existsSync(testsPath) && fs.readdirSync(testsPath).some(f => f.includes(".test."));
  
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
function scanKnowledge(): { categories: Array<{ name: string; fileCount: number; lastUpdated: string }>; gaps: string[] } {
  const categories: Array<{ name: string; fileCount: number; lastUpdated: string }> = [];
  const gaps: string[] = [];
  
  if (!fs.existsSync(KNOWLEDGE_ROOT)) {
    return { categories, gaps: ["Knowledge root doesn't exist"] };
  }
  
  const dirs = fs.readdirSync(KNOWLEDGE_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith("."));
  
  for (const dir of dirs) {
    const dirPath = path.join(KNOWLEDGE_ROOT, dir.name);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".md"));
    
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
    if (!categories.find(c => c.name === expected)) {
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
    { deliverable: "Integration instructions", owner: "Sentinel", dir: "integration-instructions" },
  ];
  
  const standupDir = path.join(REPO_ROOT, "standup-deliverables");
  
  return deliverables.map(d => {
    const fullPath = path.join(standupDir, d.dir);
    
    if (!fs.existsSync(fullPath)) {
      return { ...d, status: "missing" as const };
    }
    
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith(".md"));
    if (files.length === 0) {
      return { ...d, status: "missing" as const };
    }
    
    // Check if most recent is stale (>7 days)
    const latestFile = files.sort().pop()!;
    const stat = fs.statSync(path.join(fullPath, latestFile));
    const daysSince = (Date.now() - stat.mtimeMs) / 86400000;
    
    return {
      ...d,
      status: daysSince > 7 ? "stale" as const : "active" as const,
      lastOutput: latestFile,
    };
  });
}

/**
 * Find recently changed files
 */
function findRecentChanges(daysBack = 7): Array<{ file: string; daysAgo: number }> {
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
  };
  
  // Scan plugins
  if (fs.existsSync(PLUGINS_ROOT)) {
    const pluginDirs = fs.readdirSync(PLUGINS_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith("plugin-"));
    
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
  
  logger.info(`[ProjectRadar] Scan complete: ${state.plugins.length} plugins, ${state.totalActions} actions, ${state.completed.length} completed items`);
  
  return state;
}

/**
 * Get a summary of the project state
 */
export function getProjectSummary(): string {
  const state = scanProject();
  
  let summary = `📡 **Project Radar**\n\n`;
  summary += `*Scanned: ${new Date(state.scannedAt).toLocaleString()}*\n\n`;
  
  // Plugin overview
  summary += `**Plugins (${state.plugins.length}):** ${state.totalActions} actions, ${state.totalServices} services\n`;
  const topPlugins = state.plugins.sort((a, b) => b.actionCount - a.actionCount).slice(0, 5);
  for (const p of topPlugins) {
    const health = p.healthScore >= 80 ? "🟢" : p.healthScore >= 50 ? "🟡" : "🔴";
    summary += `${health} ${p.name}: ${p.actionCount} actions, ${p.serviceCount} services\n`;
  }
  summary += `\n`;
  
  // Progress
  summary += `**Progress:**\n`;
  summary += `• ✅ ${state.completed.length} completed\n`;
  summary += `• 🔄 ${state.inProgress.length} in progress\n`;
  summary += `• 🚫 ${state.blocked.length} blocked\n`;
  summary += `\n`;
  
  // North star
  const activeNS = state.northStarDeliverables.filter(d => d.status === "active");
  const staleNS = state.northStarDeliverables.filter(d => d.status === "stale");
  const missingNS = state.northStarDeliverables.filter(d => d.status === "missing");
  
  summary += `**North Star Deliverables:**\n`;
  if (activeNS.length > 0) summary += `• 🟢 Active: ${activeNS.map(d => d.deliverable).join(", ")}\n`;
  if (staleNS.length > 0) summary += `• 🟡 Stale: ${staleNS.map(d => d.deliverable).join(", ")}\n`;
  if (missingNS.length > 0) summary += `• 🔴 Missing: ${missingNS.map(d => d.deliverable).join(", ")}\n`;
  summary += `\n`;
  
  // Knowledge gaps
  if (state.knowledgeGaps.length > 0) {
    summary += `**Knowledge Gaps:**\n`;
    for (const gap of state.knowledgeGaps.slice(0, 3)) {
      summary += `• ${gap}\n`;
    }
    summary += `\n`;
  }
  
  // Recent activity
  if (state.recentChanges.length > 0) {
    summary += `**Recent Changes (${state.recentChanges.length}):**\n`;
    const today = state.recentChanges.filter(c => c.daysAgo === 0);
    const thisWeek = state.recentChanges.filter(c => c.daysAgo > 0);
    if (today.length > 0) summary += `• Today: ${today.length} files\n`;
    if (thisWeek.length > 0) summary += `• This week: ${thisWeek.length} files\n`;
  }
  
  return summary;
}

export default {
  scanProject,
  getProjectSummary,
};
