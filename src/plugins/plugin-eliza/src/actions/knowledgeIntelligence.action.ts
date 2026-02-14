/**
 * Knowledge Intelligence Action
 *
 * Unified access to all knowledge intelligence features:
 * - Auto-Monitor (health, suggestions)
 * - Knowledge Graph (relationships)
 * - Deduplication (duplicates)
 * - Source Quality (provenance, trust)
 *
 * TRIGGERS:
 * - "knowledge intel" — Full intelligence report
 * - "monitor knowledge" — Run auto-monitor scan
 * - "knowledge graph" — Show relationships
 * - "find duplicates" — Run deduplication scan
 * - "source quality" — Show source quality report
 * - "dismiss suggestion <id>" — Dismiss a suggestion
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";

import { runMonitorScan, dismissSuggestion, getCurrentSuggestions } from "../services/autoMonitor.service";
import { loadKnowledgeGraph, findMissingConnections, buildKnowledgeGraph } from "../services/knowledgeGraph.service";
import { runDedupeScan, getDuplicateGroups, archiveFile } from "../services/deduplication.service";
import { getQualityReport, scanAndUpdateQuality } from "../services/sourceQuality.service";

type SubCommand = "full" | "monitor" | "graph" | "duplicates" | "quality" | "dismiss" | "archive";

function detectSubCommand(text: string): { command: SubCommand; arg?: string } {
  const textLower = text.toLowerCase();
  
  if (textLower.includes("dismiss suggestion") || textLower.includes("dismiss")) {
    const match = text.match(/dismiss(?:\s+suggestion)?\s+([^\s]+)/i);
    return { command: "dismiss", arg: match?.[1] };
  }
  
  if (textLower.includes("archive") && textLower.includes("file")) {
    const match = text.match(/archive\s+(?:file\s+)?([^\s]+)/i);
    return { command: "archive", arg: match?.[1] };
  }
  
  if (textLower.includes("monitor") || textLower.includes("health") || textLower.includes("suggestions")) {
    return { command: "monitor" };
  }
  
  if (textLower.includes("graph") || textLower.includes("relationship") || textLower.includes("connections")) {
    return { command: "graph" };
  }
  
  if (textLower.includes("duplicate") || textLower.includes("dedupe") || textLower.includes("dedup")) {
    return { command: "duplicates" };
  }
  
  if (textLower.includes("quality") || textLower.includes("source") || textLower.includes("provenance")) {
    return { command: "quality" };
  }
  
  return { command: "full" };
}

function formatMonitorReport(): string {
  const { healthReports, suggestions, summary } = runMonitorScan();
  
  let response = `📊 **Knowledge Monitor**\n\n`;
  response += `*${summary}*\n\n`;
  
  // Health by category
  if (healthReports.length > 0) {
    response += `**Category Health:**\n`;
    for (const health of healthReports.slice(0, 8)) {
      const emoji = health.healthScore >= 70 ? "🟢" : health.healthScore >= 40 ? "🟡" : "🔴";
      response += `${emoji} **${health.category}** — ${health.healthScore}% (${health.fileCount} files)\n`;
      if (health.issues.length > 0) {
        response += `   └ ${health.issues[0]}\n`;
      }
    }
    response += `\n`;
  }
  
  // Top suggestions
  if (suggestions.length > 0) {
    response += `**Suggestions (${suggestions.length}):**\n`;
    for (const sug of suggestions.slice(0, 5)) {
      const emoji = sug.priority === "high" ? "🔴" : sug.priority === "medium" ? "🟡" : "🟢";
      response += `${emoji} **${sug.title}**\n`;
      response += `   ${sug.reason}\n`;
      response += `   → ${sug.action}\n`;
      response += `   \`dismiss ${sug.id.slice(0, 20)}...\`\n\n`;
    }
  } else {
    response += `✅ No suggestions — knowledge base is healthy!\n`;
  }
  
  return response;
}

function formatGraphReport(): string {
  const graph = loadKnowledgeGraph();
  const missingConnections = findMissingConnections();
  
  let response = `🔗 **Knowledge Graph**\n\n`;
  response += `*${graph.stats.totalNodes} nodes, ${graph.stats.totalEdges} edges, ${graph.stats.avgConnections} avg connections*\n\n`;
  
  // Clusters
  if (graph.clusters.length > 0) {
    response += `**Clusters:**\n`;
    for (const cluster of graph.clusters.slice(0, 6)) {
      const coherence = Math.round(cluster.coherence * 100);
      response += `• **${cluster.name}** — ${cluster.nodeIds.length} nodes, ${coherence}% coherence\n`;
    }
    response += `\n`;
  }
  
  // Isolated nodes
  if (graph.stats.isolatedNodes.length > 0) {
    response += `**Isolated Nodes (${graph.stats.isolatedNodes.length}):**\n`;
    response += `These files have no connections:\n`;
    for (const node of graph.stats.isolatedNodes.slice(0, 5)) {
      response += `• \`${node}\`\n`;
    }
    if (graph.stats.isolatedNodes.length > 5) {
      response += `• ... and ${graph.stats.isolatedNodes.length - 5} more\n`;
    }
    response += `\n`;
  }
  
  // Missing connections
  if (missingConnections.length > 0) {
    response += `**Suggested Connections:**\n`;
    for (const conn of missingConnections.slice(0, 3)) {
      response += `• Link \`${conn.node1}\` ↔ \`${conn.node2}\`\n`;
      response += `  ${conn.reason}\n`;
    }
  }
  
  return response;
}

function formatDuplicatesReport(): string {
  const state = runDedupeScan();
  const { stats, duplicateGroups } = state;
  
  let response = `🔍 **Deduplication Report**\n\n`;
  response += `*${stats.totalFiles} files scanned*\n`;
  response += `• Exact duplicates: ${stats.exactDupes}\n`;
  response += `• Near duplicates: ${stats.nearDupes}\n`;
  response += `• Semantic duplicates: ${stats.semanticDupes}\n`;
  
  if (stats.bytesRecoverable > 0) {
    const kb = Math.round(stats.bytesRecoverable / 1024);
    response += `• Recoverable space: ${kb} KB\n`;
  }
  response += `\n`;
  
  if (duplicateGroups.length === 0) {
    response += `✅ No duplicates found!\n`;
    return response;
  }
  
  // Show duplicate groups
  response += `**Duplicate Groups (${duplicateGroups.length}):**\n\n`;
  
  for (const group of duplicateGroups.slice(0, 5)) {
    const emoji = group.type === "exact" ? "🔴" : group.type === "near" ? "🟡" : "🔵";
    response += `${emoji} **${group.type.toUpperCase()}** (${Math.round(group.similarity * 100)}% similar)\n`;
    response += `Files:\n`;
    for (const file of group.files) {
      response += `  • \`${file}\`\n`;
    }
    response += `Action: ${group.suggestedAction} — ${group.reason}\n`;
    if (group.suggestedAction === "archive" && group.files.length > 1) {
      response += `\`archive file ${group.files[1]}\`\n`;
    }
    response += `\n`;
  }
  
  return response;
}

function formatQualityReport(): string {
  // First scan for new sources
  scanAndUpdateQuality();
  
  const report = getQualityReport();
  
  let response = `📈 **Source Quality Report**\n\n`;
  response += `*${report.summary}*\n\n`;
  
  // Top sources
  if (report.sources.length > 0) {
    response += `**Top Sources by Content:**\n`;
    for (const source of report.sources.slice(0, 8)) {
      const trustEmoji = 
        source.trust === "verified" ? "✅" :
        source.trust === "trusted" ? "🟢" :
        source.trust === "neutral" ? "🟡" :
        source.trust === "cautious" ? "🟠" : "🔴";
      response += `${trustEmoji} **${source.name}** — ${source.score}/100 (${source.contentCount} files)\n`;
    }
    response += `\n`;
  }
  
  // Concerns
  if (report.concerns.length > 0) {
    response += `**⚠️ Concerns:**\n`;
    for (const concern of report.concerns) {
      response += `• ${concern}\n`;
    }
    response += `\n`;
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    response += `**💡 Recommendations:**\n`;
    for (const rec of report.recommendations) {
      response += `• ${rec}\n`;
    }
  }
  
  return response;
}

function formatFullReport(): string {
  let response = `🧠 **Knowledge Intelligence Report**\n\n`;
  response += `---\n\n`;
  
  // Quick stats from each service
  const monitorResult = runMonitorScan();
  const graph = loadKnowledgeGraph();
  const dedupe = runDedupeScan();
  const quality = getQualityReport();
  
  response += `**Overview:**\n`;
  response += `• 📊 Monitor: ${monitorResult.healthReports.length} categories, ${monitorResult.suggestions.filter(s => s.priority === "high").length} high-priority suggestions\n`;
  response += `• 🔗 Graph: ${graph.stats.totalNodes} nodes, ${graph.stats.totalEdges} edges, ${graph.stats.isolatedNodes.length} isolated\n`;
  response += `• 🔍 Dedupe: ${dedupe.stats.exactDupes + dedupe.stats.nearDupes} duplicates found\n`;
  response += `• 📈 Quality: ${quality.summary}\n`;
  response += `\n---\n\n`;
  
  // Top suggestions
  if (monitorResult.suggestions.length > 0) {
    response += `**Top Actions:**\n`;
    for (const sug of monitorResult.suggestions.slice(0, 3)) {
      const emoji = sug.priority === "high" ? "🔴" : "🟡";
      response += `${emoji} ${sug.title}: ${sug.action}\n`;
    }
    response += `\n`;
  }
  
  // Quick concerns
  if (quality.concerns.length > 0) {
    response += `**Concerns:**\n`;
    response += `• ${quality.concerns[0]}\n`;
  }
  
  if (dedupe.duplicateGroups.filter(g => g.type === "exact").length > 0) {
    response += `• ${dedupe.stats.exactDupes} exact duplicates should be archived\n`;
  }
  
  if (graph.stats.isolatedNodes.length > 3) {
    response += `• ${graph.stats.isolatedNodes.length} isolated files need cross-references\n`;
  }
  
  response += `\n---\n`;
  response += `*Use \`monitor knowledge\`, \`knowledge graph\`, \`find duplicates\`, \`source quality\` for details*`;
  
  return response;
}

export const knowledgeIntelligenceAction: Action = {
  name: "KNOWLEDGE_INTEL",
  description: `Unified knowledge base intelligence: monitoring, relationships, deduplication, source quality.

TRIGGERS:
- "knowledge intel" — Full intelligence report
- "monitor knowledge" — Health scan + suggestions
- "knowledge graph" — Relationships and clusters
- "find duplicates" — Deduplication scan
- "source quality" — Source trust and provenance
- "dismiss suggestion <id>" — Dismiss a suggestion
- "archive file <path>" — Archive a duplicate

Combines Auto-Monitor, Knowledge Graph, Deduplication, and Source Quality services.`,

  similes: [
    "KNOWLEDGE_INTEL",
    "KNOWLEDGE_INTELLIGENCE",
    "MONITOR_KNOWLEDGE",
    "KNOWLEDGE_GRAPH",
    "FIND_DUPLICATES",
    "SOURCE_QUALITY",
    "KB_INTEL",
  ],

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "knowledge intel" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🧠 **Knowledge Intelligence Report**\n\n**Overview:**\n• 📊 Monitor: 8 categories, 2 high-priority suggestions\n• 🔗 Graph: 45 nodes, 78 edges, 3 isolated\n• 🔍 Dedupe: 2 duplicates found\n• 📈 Quality: 12 sources tracked | Avg quality: 72/100\n\n**Top Actions:**\n🔴 Refresh crypto content: Review files in knowledge/crypto/\n🟡 Expand ai-agents coverage: Use UPLOAD to add more content",
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "find duplicates" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🔍 **Deduplication Report**\n\n*45 files scanned*\n• Exact duplicates: 1\n• Near duplicates: 2\n• Semantic duplicates: 3\n• Recoverable space: 24 KB\n\n**Duplicate Groups:**\n\n🔴 **EXACT** (100% similar)\nFiles:\n  • `defi/uniswap-v3.md`\n  • `defi/uniswap-v3-copy.md`\nAction: archive — Identical content\n`archive file defi/uniswap-v3-copy.md`",
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content?.text || "").toLowerCase();
    return (
      text.includes("intel") ||
      text.includes("monitor") ||
      text.includes("graph") ||
      text.includes("duplicate") ||
      text.includes("dedupe") ||
      text.includes("quality") ||
      text.includes("provenance") ||
      text.includes("dismiss suggestion") ||
      (text.includes("archive") && text.includes("file"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ) => {
    const text = message.content?.text || "";
    const { command, arg } = detectSubCommand(text);

    logger.info(`[Knowledge Intel] Running command: ${command}${arg ? ` (${arg})` : ""}`);

    let response: string;

    switch (command) {
      case "dismiss":
        if (!arg) {
          response = "Please specify a suggestion ID to dismiss: `dismiss suggestion <id>`";
        } else {
          dismissSuggestion(arg);
          response = `✅ Dismissed suggestion: ${arg}`;
        }
        break;
        
      case "archive":
        if (!arg) {
          response = "Please specify a file to archive: `archive file <path>`";
        } else {
          const result = archiveFile(arg, "User requested via KNOWLEDGE_INTEL");
          if (result.success) {
            response = `✅ Archived \`${arg}\` → \`${result.archivePath}\``;
          } else {
            response = `❌ Could not archive: ${result.error}`;
          }
        }
        break;
        
      case "monitor":
        response = formatMonitorReport();
        break;
        
      case "graph":
        buildKnowledgeGraph(); // rebuild for fresh data
        response = formatGraphReport();
        break;
        
      case "duplicates":
        response = formatDuplicatesReport();
        break;
        
      case "quality":
        response = formatQualityReport();
        break;
        
      case "full":
      default:
        response = formatFullReport();
        break;
    }

    const out = "Here's the knowledge intel—\n\n" + response;
    callback?.({ text: out });
    return true;
  },
};

export default knowledgeIntelligenceAction;
