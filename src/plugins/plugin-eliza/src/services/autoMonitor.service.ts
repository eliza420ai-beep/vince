/**
 * Auto-Monitor Service
 *
 * Monitors the knowledge base for:
 * - Content staleness (files not updated)
 * - Category imbalances
 * - Missing coverage areas
 * - Trending topics not covered
 *
 * Generates suggestions for:
 * - Content to refresh
 * - Topics to research
 * - Essays to write
 * - Tweets to draft
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

import { getKnowledgeRoot } from "../config/paths";

const KNOWLEDGE_ROOT = getKnowledgeRoot();
const MONITOR_STATE_PATH = path.join(process.cwd(), ".openclaw-cache", "monitor-state.json");

export interface ContentHealth {
  category: string;
  fileCount: number;
  totalSize: number;
  avgAge: number; // days
  oldestFile: { name: string; age: number };
  newestFile: { name: string; age: number };
  healthScore: number; // 0-100
  issues: string[];
}

export interface MonitorState {
  lastRun: string;
  lastSuggestions: string;
  categories: Record<string, {
    lastChecked: string;
    fileCount: number;
    lastAlert?: string;
  }>;
  suggestions: Suggestion[];
  dismissed: string[]; // dismissed suggestion IDs
}

export interface Suggestion {
  id: string;
  type: "refresh" | "expand" | "essay" | "tweet" | "research" | "dedupe";
  priority: "high" | "medium" | "low";
  category?: string;
  title: string;
  reason: string;
  action: string;
  createdAt: string;
}

/**
 * Load monitor state
 */
export function loadMonitorState(): MonitorState {
  try {
    if (fs.existsSync(MONITOR_STATE_PATH)) {
      return JSON.parse(fs.readFileSync(MONITOR_STATE_PATH, "utf-8"));
    }
  } catch (e) {
    logger.debug("[AutoMonitor] No existing state, starting fresh");
  }
  
  return {
    lastRun: "",
    lastSuggestions: "",
    categories: {},
    suggestions: [],
    dismissed: [],
  };
}

/**
 * Save monitor state
 */
export function saveMonitorState(state: MonitorState): void {
  const dir = path.dirname(MONITOR_STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(MONITOR_STATE_PATH, JSON.stringify(state, null, 2));
}

/**
 * Analyze category health
 */
export function analyzeCategory(categoryPath: string): ContentHealth | null {
  if (!fs.existsSync(categoryPath)) return null;
  
  const category = path.basename(categoryPath);
  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith(".md"));
  
  if (files.length === 0) {
    return {
      category,
      fileCount: 0,
      totalSize: 0,
      avgAge: 0,
      oldestFile: { name: "", age: 0 },
      newestFile: { name: "", age: 0 },
      healthScore: 0,
      issues: ["Empty category — no content files"],
    };
  }
  
  const now = Date.now();
  let totalSize = 0;
  let totalAge = 0;
  let oldest = { name: "", age: 0 };
  let newest = { name: "", age: Infinity };
  
  for (const file of files) {
    const filePath = path.join(categoryPath, file);
    const stat = fs.statSync(filePath);
    const ageDays = (now - stat.mtimeMs) / 86400000;
    
    totalSize += stat.size;
    totalAge += ageDays;
    
    if (ageDays > oldest.age) {
      oldest = { name: file, age: ageDays };
    }
    if (ageDays < newest.age) {
      newest = { name: file, age: ageDays };
    }
  }
  
  const avgAge = totalAge / files.length;
  const issues: string[] = [];
  
  // Health scoring
  let healthScore = 100;
  
  // Penalize for staleness
  if (avgAge > 30) {
    healthScore -= 30;
    issues.push(`Stale content — average age ${Math.round(avgAge)} days`);
  } else if (avgAge > 14) {
    healthScore -= 15;
    issues.push(`Aging content — average age ${Math.round(avgAge)} days`);
  }
  
  // Penalize for low file count
  if (files.length < 3) {
    healthScore -= 20;
    issues.push(`Sparse coverage — only ${files.length} files`);
  }
  
  // Penalize for very old files
  if (oldest.age > 60) {
    healthScore -= 10;
    issues.push(`Very old file: ${oldest.name} (${Math.round(oldest.age)} days)`);
  }
  
  return {
    category,
    fileCount: files.length,
    totalSize,
    avgAge,
    oldestFile: oldest,
    newestFile: { name: newest.name, age: newest.age === Infinity ? 0 : newest.age },
    healthScore: Math.max(0, healthScore),
    issues,
  };
}

/**
 * Generate suggestions based on health analysis
 */
export function generateSuggestions(healthReports: ContentHealth[], state: MonitorState): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const now = new Date().toISOString();
  
  for (const health of healthReports) {
    // Skip dismissed categories (for 7 days)
    const dismissed = state.dismissed.find(d => d.includes(health.category));
    if (dismissed) continue;
    
    // Refresh suggestions
    if (health.avgAge > 14 && health.fileCount > 0) {
      suggestions.push({
        id: `refresh-${health.category}-${Date.now()}`,
        type: "refresh",
        priority: health.avgAge > 30 ? "high" : "medium",
        category: health.category,
        title: `Refresh ${health.category} content`,
        reason: `Average content age is ${Math.round(health.avgAge)} days`,
        action: `Review and update files in knowledge/${health.category}/`,
        createdAt: now,
      });
    }
    
    // Expand suggestions
    if (health.fileCount < 3 && health.fileCount > 0) {
      suggestions.push({
        id: `expand-${health.category}-${Date.now()}`,
        type: "expand",
        priority: "medium",
        category: health.category,
        title: `Expand ${health.category} coverage`,
        reason: `Only ${health.fileCount} files — limited depth`,
        action: `Use UPLOAD to add more ${health.category} content`,
        createdAt: now,
      });
    }
    
    // Essay suggestions for healthy, substantial categories
    if (health.healthScore > 70 && health.fileCount >= 5) {
      suggestions.push({
        id: `essay-${health.category}-${Date.now()}`,
        type: "essay",
        priority: "low",
        category: health.category,
        title: `Write essay on ${health.category}`,
        reason: `Strong knowledge base (${health.fileCount} files, ${health.healthScore}% health)`,
        action: `WRITE_ESSAY ${health.category} deep-dive`,
        createdAt: now,
      });
    }
    
    // Tweet suggestions for fresh content
    if (health.newestFile.age < 3 && health.fileCount > 0) {
      suggestions.push({
        id: `tweet-${health.category}-${Date.now()}`,
        type: "tweet",
        priority: "medium",
        category: health.category,
        title: `Tweet about ${health.category}`,
        reason: `Fresh content added: ${health.newestFile.name}`,
        action: `DRAFT_TWEETS ${health.category}`,
        createdAt: now,
      });
    }
  }
  
  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * Run full monitor scan
 */
export function runMonitorScan(): {
  healthReports: ContentHealth[];
  suggestions: Suggestion[];
  summary: string;
} {
  const state = loadMonitorState();
  const healthReports: ContentHealth[] = [];
  
  if (!fs.existsSync(KNOWLEDGE_ROOT)) {
    return {
      healthReports: [],
      suggestions: [],
      summary: "Knowledge directory not found",
    };
  }
  
  // Scan all categories
  const categories = fs.readdirSync(KNOWLEDGE_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith(".") && !["drafts", "briefs"].includes(d.name));
  
  for (const cat of categories) {
    const health = analyzeCategory(path.join(KNOWLEDGE_ROOT, cat.name));
    if (health) {
      healthReports.push(health);
      
      // Update state
      state.categories[cat.name] = {
        lastChecked: new Date().toISOString(),
        fileCount: health.fileCount,
      };
    }
  }
  
  // Generate suggestions
  const suggestions = generateSuggestions(healthReports, state);
  
  // Update and save state
  state.lastRun = new Date().toISOString();
  state.suggestions = suggestions;
  saveMonitorState(state);
  
  // Generate summary
  const totalFiles = healthReports.reduce((sum, h) => sum + h.fileCount, 0);
  const avgHealth = healthReports.length > 0 
    ? Math.round(healthReports.reduce((sum, h) => sum + h.healthScore, 0) / healthReports.length)
    : 0;
  const highPriority = suggestions.filter(s => s.priority === "high").length;
  
  const summary = `${healthReports.length} categories, ${totalFiles} files, ${avgHealth}% avg health, ${highPriority} high-priority suggestions`;
  
  logger.info(`[AutoMonitor] Scan complete: ${summary}`);
  
  return { healthReports, suggestions, summary };
}

/**
 * Dismiss a suggestion
 */
export function dismissSuggestion(suggestionId: string): void {
  const state = loadMonitorState();
  if (!state.dismissed.includes(suggestionId)) {
    state.dismissed.push(suggestionId);
  }
  // Clean old dismissals (older than 7 days based on ID timestamp)
  const weekAgo = Date.now() - 7 * 86400000;
  state.dismissed = state.dismissed.filter(d => {
    const match = d.match(/(\d{13})/);
    return match ? parseInt(match[1]) > weekAgo : true;
  });
  saveMonitorState(state);
}

/**
 * Get current suggestions without re-scanning
 */
export function getCurrentSuggestions(): Suggestion[] {
  const state = loadMonitorState();
  
  // If last scan was more than 1 hour ago, re-scan
  if (!state.lastRun || Date.now() - new Date(state.lastRun).getTime() > 3600000) {
    const { suggestions } = runMonitorScan();
    return suggestions;
  }
  
  return state.suggestions;
}

export default {
  loadMonitorState,
  saveMonitorState,
  analyzeCategory,
  generateSuggestions,
  runMonitorScan,
  dismissSuggestion,
  getCurrentSuggestions,
};
