/**
 * Style Check Action
 *
 * Check content against the brand style guide.
 * Enforces terminology, capitalization, tone, and formatting rules.
 *
 * TRIGGERS:
 * - "style check" — Check content or last draft
 * - "check style of <file>" — Check specific file
 * - "style guide" — Show style guide summary
 * - "auto-fix style" — Automatically fix simple violations
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

import {
  checkStyle,
  getStyleGuideSummary,
  autoFix,
  loadStyleGuide,
  type StyleCheckResult,
  type StyleViolation,
} from "../services/styleGuide.service";

import { getKnowledgeRoot, DRAFTS_DIR } from "../config/paths";

const KNOWLEDGE_ROOT = getKnowledgeRoot();

type SubCommand = "check" | "guide" | "fix" | "rules";

function detectSubCommand(text: string): { command: SubCommand; target?: string } {
  const textLower = text.toLowerCase();
  
  if (textLower.includes("style guide") || textLower.includes("show guide") || textLower.includes("guide summary")) {
    return { command: "guide" };
  }
  
  if (textLower.includes("auto-fix") || textLower.includes("autofix") || textLower.includes("fix style")) {
    const fileMatch = text.match(/(?:fix|autofix|auto-fix)\s+(?:style\s+)?(?:of\s+)?["']?([^"'\n]+\.md)["']?/i);
    return { command: "fix", target: fileMatch?.[1] };
  }
  
  if (textLower.includes("rules") || textLower.includes("terminology") || textLower.includes("capitalization")) {
    return { command: "rules" };
  }
  
  // Default: check
  const fileMatch = text.match(/(?:check|style)\s+(?:style\s+)?(?:of\s+)?["']?([^"'\n]+\.md)["']?/i);
  return { command: "check", target: fileMatch?.[1] };
}

function findFile(target: string): string | null {
  // Try as-is
  if (fs.existsSync(target)) return target;
  
  // Try in knowledge root
  const inKnowledge = path.join(KNOWLEDGE_ROOT, target);
  if (fs.existsSync(inKnowledge)) return inKnowledge;
  
  // Try in drafts
  const inDrafts = path.join(DRAFTS_DIR, target);
  if (fs.existsSync(inDrafts)) return inDrafts;
  
  // Try adding .md
  if (!target.endsWith(".md")) {
    return findFile(target + ".md");
  }
  
  return null;
}

function getLatestDraft(): string | null {
  if (!fs.existsSync(DRAFTS_DIR)) return null;
  
  const files = fs.readdirSync(DRAFTS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => ({
      name: f,
      path: path.join(DRAFTS_DIR, f),
      mtime: fs.statSync(path.join(DRAFTS_DIR, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  
  return files[0]?.path || null;
}

function formatViolation(v: StyleViolation): string {
  const emoji = v.severity === "error" ? "🔴" : v.severity === "warning" ? "🟡" : "🔵";
  let line = `${emoji} **${v.rule}**`;
  if (v.line) line += ` (line ${v.line})`;
  line += `\n   ${v.message}`;
  if (v.found) line += `\n   Found: \`${v.found}\``;
  if (v.suggestion) line += `\n   → ${v.suggestion}`;
  return line;
}

function formatResult(result: StyleCheckResult, filename?: string): string {
  const statusEmoji = result.passed ? "✅" : "❌";
  const scoreEmoji = result.score >= 90 ? "🟢" : result.score >= 70 ? "🟡" : "🔴";
  
  let response = `${statusEmoji} **Style Check${filename ? `: ${filename}` : ""}**\n\n`;
  response += `${scoreEmoji} **Score: ${result.score}/100**\n`;
  response += `• Errors: ${result.summary.errors}\n`;
  response += `• Warnings: ${result.summary.warnings}\n`;
  response += `• Info: ${result.summary.info}\n\n`;
  
  if (result.violations.length === 0) {
    response += `✨ No style violations found!\n`;
  } else {
    // Group by type
    const byType = new Map<string, StyleViolation[]>();
    for (const v of result.violations) {
      const existing = byType.get(v.type) || [];
      existing.push(v);
      byType.set(v.type, existing);
    }
    
    response += `**Violations (${result.violations.length}):**\n\n`;
    
    // Show errors first
    const errors = result.violations.filter(v => v.severity === "error");
    if (errors.length > 0) {
      response += `**Errors:**\n`;
      for (const v of errors.slice(0, 5)) {
        response += formatViolation(v) + "\n\n";
      }
      if (errors.length > 5) {
        response += `... and ${errors.length - 5} more errors\n\n`;
      }
    }
    
    // Show warnings
    const warnings = result.violations.filter(v => v.severity === "warning");
    if (warnings.length > 0) {
      response += `**Warnings:**\n`;
      for (const v of warnings.slice(0, 8)) {
        response += formatViolation(v) + "\n\n";
      }
      if (warnings.length > 8) {
        response += `... and ${warnings.length - 8} more warnings\n\n`;
      }
    }
    
    // Summarize info
    const info = result.violations.filter(v => v.severity === "info");
    if (info.length > 0) {
      response += `**Info (${info.length}):** `;
      const types = [...new Set(info.map(v => v.rule.split(":")[1]?.trim() || v.rule))];
      response += types.slice(0, 5).join(", ");
      if (types.length > 5) response += `, +${types.length - 5} more`;
      response += `\n\n`;
    }
  }
  
  // Suggestions
  if (result.suggestions.length > 0) {
    response += `**Suggestions:**\n`;
    for (const s of result.suggestions) {
      response += `💡 ${s}\n`;
    }
  }
  
  return response;
}

function formatRules(): string {
  const guide = loadStyleGuide();
  
  let response = `📖 **Style Guide Rules**\n\n`;
  
  // Terminology
  response += `**Terminology (${guide.terminology.length} rules):**\n`;
  for (const rule of guide.terminology.slice(0, 10)) {
    response += `• Use **${rule.preferred}**, not: ${rule.avoid.join(", ")}\n`;
  }
  if (guide.terminology.length > 10) {
    response += `• ... and ${guide.terminology.length - 10} more\n`;
  }
  response += `\n`;
  
  // Capitalization
  response += `**Capitalization (${guide.capitalization.length} rules):**\n`;
  const brands = guide.capitalization.filter(c => c.type === "brand").slice(0, 5);
  const acronyms = guide.capitalization.filter(c => c.type === "acronym").slice(0, 5);
  response += `• Brands: ${brands.map(b => b.correct).join(", ")}\n`;
  response += `• Acronyms: ${acronyms.map(a => a.correct).join(", ")}\n\n`;
  
  // Prohibited
  response += `**Prohibited (${guide.prohibited.length} phrases):**\n`;
  for (const p of guide.prohibited.slice(0, 5)) {
    response += `• ~~${p.phrase}~~ — ${p.reason}\n`;
  }
  if (guide.prohibited.length > 5) {
    response += `• ... and ${guide.prohibited.length - 5} more\n`;
  }
  response += `\n`;
  
  // Tone
  response += `**Tone Markers (${guide.toneMarkers.length} patterns):**\n`;
  const promotional = guide.toneMarkers.filter(t => t.tone === "promotional").slice(0, 3);
  const casual = guide.toneMarkers.filter(t => t.tone === "casual").slice(0, 3);
  response += `• Avoid promotional: ${promotional.map(p => `"${p.pattern}"`).join(", ")}\n`;
  response += `• Avoid casual: ${casual.map(p => `"${p.pattern}"`).join(", ")}\n`;
  
  return response;
}

export const styleCheckAction: Action = {
  name: "STYLE_CHECK",
  description: `Check content against brand style guide.

TRIGGERS:
- "style check" — Check last draft or pasted content
- "check style of <file>" — Check specific file
- "style guide" — Show style guide summary
- "style rules" — Show all rules
- "auto-fix style <file>" — Auto-fix simple violations

CHECKS:
- Terminology (preferred terms)
- Capitalization (brands, acronyms)
- Tone markers (casual, promotional)
- Prohibited phrases
- Required elements (TL;DR, etc.)
- Formatting (headers, links)
- Custom rules (sentence length, passive voice)

Returns a score (0-100) and detailed violation report.`,

  similes: [
    "STYLE_CHECK",
    "CHECK_STYLE",
    "STYLE_GUIDE",
    "BRAND_CHECK",
    "GRAMMAR_CHECK",
    "LINT",
  ],

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "style check" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "✅ **Style Check: latest-essay.md**\n\n🟢 **Score: 92/100**\n• Errors: 0\n• Warnings: 3\n• Info: 5\n\n**Warnings:**\n🟡 **Terminology: DeFi** (line 12)\n   Use \"DeFi\" instead of \"defi\"\n   Found: `defi`\n   → DeFi\n\n💡 Address terminology warnings for brand consistency",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "style guide" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "**Ikigai Studios Style Guide** (v1.0.0)\n\n**Voice:** Authoritative yet accessible. We explain complex crypto concepts clearly without dumbing them down.\n\n**Target Tone:** authoritative, educational, conversational\n\n**Rules:**\n• 15 terminology rules\n• 19 capitalization rules\n• 15 tone markers\n• 8 prohibited phrases",
        },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "auto-fix style drafts/my-essay.md" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "🔧 **Auto-Fix Complete: my-essay.md**\n\n**Fixed 7 issues:**\n• Terminology: 4 fixes\n• Capitalization: 3 fixes\n\nFile updated. Run `style check` to verify remaining issues.",
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content?.text || "").toLowerCase();
    return (
      text.includes("style") ||
      text.includes("brand check") ||
      text.includes("lint")
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
    const { command, target } = detectSubCommand(text);

    logger.info(`[Style Check] Command: ${command}, target: ${target || "none"}`);

    switch (command) {
      case "guide": {
        const summary = getStyleGuideSummary();
        callback?.({ text: summary });
        return true;
      }
      
      case "rules": {
        const rules = formatRules();
        callback?.({ text: rules });
        return true;
      }
      
      case "fix": {
        // Find file to fix
        let filePath: string | null = null;
        if (target) {
          filePath = findFile(target);
        } else {
          filePath = getLatestDraft();
        }
        
        if (!filePath) {
          callback?.({
            text: `❌ **Auto-Fix Failed**\n\nCould not find file${target ? `: ${target}` : ""}.\n\nUsage: \`auto-fix style <filename>\``,
          });
          return true;
        }
        
        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const { content: fixed, fixes } = autoFix(content);
          
          if (fixes === 0) {
            callback?.({
              text: `✅ **No auto-fixable issues** in \`${path.basename(filePath)}\`\n\nRun \`style check\` to see other violations.`,
            });
            return true;
          }
          
          // Write fixed content
          fs.writeFileSync(filePath, fixed);
          
          // Check what's left
          const result = checkStyle(fixed);
          
          callback?.({
            text: `🔧 **Auto-Fix Complete: ${path.basename(filePath)}**\n\n**Fixed ${fixes} issues** (terminology + capitalization)\n\n**Remaining:**\n• Errors: ${result.summary.errors}\n• Warnings: ${result.summary.warnings}\n• Info: ${result.summary.info}\n\nRun \`style check\` for details on remaining issues.`,
          });
        } catch (e) {
          callback?.({
            text: `❌ **Auto-Fix Failed**\n\nError reading/writing file: ${e}`,
          });
        }
        return true;
      }
      
      case "check":
      default: {
        // Find content to check
        let content: string | null = null;
        let filename: string | undefined;
        
        // Check for file target
        if (target) {
          const filePath = findFile(target);
          if (filePath) {
            content = fs.readFileSync(filePath, "utf-8");
            filename = path.basename(filePath);
          } else {
            callback?.({
              text: `❌ **File not found:** ${target}\n\nTry:\n• Full path: \`style check knowledge/category/file.md\`\n• Just filename: \`style check file.md\` (searches drafts)`,
            });
            return true;
          }
        }
        
        // Check for content in message (for checking pasted content)
        if (!content) {
          const pastedContent = text.replace(/^.*?style\s+check\s*/i, "").trim();
          if (pastedContent.length > 100) {
            content = pastedContent;
            filename = "pasted content";
          }
        }
        
        // Fall back to latest draft
        if (!content) {
          const latestDraft = getLatestDraft();
          if (latestDraft) {
            content = fs.readFileSync(latestDraft, "utf-8");
            filename = path.basename(latestDraft);
          }
        }
        
        if (!content) {
          callback?.({
            text: `📝 **Style Check**\n\nNo content to check. Options:\n• \`style check <filename>\` — Check specific file\n• Paste content after "style check"\n• Create a draft with WRITE_ESSAY first`,
          });
          return true;
        }
        
        // Run check
        const result = checkStyle(content);
        const response = formatResult(result, filename);
        
        callback?.({ text: response });
        return true;
      }
    }
  },
};

export default styleCheckAction;
