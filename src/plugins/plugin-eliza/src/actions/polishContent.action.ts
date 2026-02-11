/**
 * Polish Content Action
 *
 * Transforms generic copy into premium, brand-elevating content.
 * Applies Apple/Porsche principles:
 * - Benefit-led (what does the reader get?)
 * - Confident & crafted (no hedging, no filler)
 * - Authentic (not AI-slop)
 *
 * TRIGGERS:
 * - "polish this" / "polish:" — Polish pasted content
 * - "polish <file>" — Polish a specific file
 * - "rewrite this" — Same as polish
 * - "make this premium" — Same as polish
 */

import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";

import { checkStyle, loadStyleGuide } from "../services/styleGuide.service";

const KNOWLEDGE_ROOT = path.resolve(process.cwd(), "knowledge");
const DRAFTS_DIR = path.join(KNOWLEDGE_ROOT, "drafts");

// Transformation patterns: [pattern, description, rewriteHint]
const TRANSFORMATION_RULES: Array<{
  pattern: RegExp;
  issue: string;
  technique: string;
  example?: { before: string; after: string };
}> = [
  // AI-slop intros
  {
    pattern: /in (?:the |today's )?(?:ever-evolving|fast-paced|dynamic|current|modern)\s+(?:landscape|world|market|space|ecosystem)/gi,
    issue: "Generic AI intro",
    technique: "Delete entirely. Start with the point.",
    example: {
      before: "In today's fast-paced crypto market, traders need better tools.",
      after: "Better tools. Better trades.",
    },
  },
  // Weak hedging
  {
    pattern: /(?:it's important to note that|it should be noted that|it's worth mentioning that)/gi,
    issue: "Weak hedging phrase",
    technique: "Delete. Just state the thing.",
    example: {
      before: "It's important to note that fees can vary.",
      after: "Fees vary.",
    },
  },
  // Excited announcements
  {
    pattern: /(?:we're |we are )?(?:excited|thrilled|pleased|proud|happy) to (?:announce|share|introduce|present)/gi,
    issue: "Generic announcement",
    technique: "Skip the preamble. Announce directly.",
    example: {
      before: "We're excited to announce our new feature!",
      after: "Introducing limit orders.",
    },
  },
  // Leverage/utilize
  {
    pattern: /\b(?:leverage|utilize|utilise)\b/gi,
    issue: "Corporate verb",
    technique: "Use 'use' instead. Simpler is stronger.",
    example: {
      before: "Leverage our platform to maximize returns.",
      after: "Use the platform. Make more.",
    },
  },
  // Comprehensive/robust/seamless
  {
    pattern: /\b(?:comprehensive|robust|seamless|holistic|end-to-end)\b/gi,
    issue: "Empty adjective",
    technique: "Be specific about what makes it good.",
    example: {
      before: "A comprehensive trading solution.",
      after: "Trade spot, perps, and options — one account.",
    },
  },
  // Revolutionary/cutting-edge
  {
    pattern: /\b(?:revolutionary|groundbreaking|cutting-edge|innovative|game-changing|next-generation)\b/gi,
    issue: "Self-proclaimed greatness",
    technique: "Show the innovation. Let readers conclude it's revolutionary.",
    example: {
      before: "Our revolutionary algorithm.",
      after: "Settles in 400ms. Other DEXs take minutes.",
    },
  },
  // Unlock/empower
  {
    pattern: /\b(?:unlock|empower|enable|supercharge)\b(?:\s+(?:the\s+)?(?:power|potential|ability))?/gi,
    issue: "Vague promise",
    technique: "State the specific benefit.",
    example: {
      before: "Unlock the power of DeFi.",
      after: "Earn 8% on stables. No lockup.",
    },
  },
  // Take to the next level
  {
    pattern: /take\s+(?:your\s+)?(?:\w+\s+)?to\s+the\s+next\s+level/gi,
    issue: "Meaningless escalation",
    technique: "Describe the actual improvement.",
    example: {
      before: "Take your trading to the next level.",
      after: "Trade faster. Pay less. Sleep better.",
    },
  },
  // Dive in/dive deep/unpack
  {
    pattern: /(?:let's\s+)?(?:dive\s+(?:in|deep)|unpack|explore|delve\s+into)/gi,
    issue: "AI-slop transition",
    technique: "Just start. No throat-clearing.",
    example: {
      before: "Let's dive into how this works.",
      after: "Here's how it works.",
    },
  },
  // Users/customers (impersonal)
  {
    pattern: /\b(?:users|customers|clients)\b(?:\s+can\s+|\s+are\s+able\s+to\s+)/gi,
    issue: "Impersonal language",
    technique: "Speak directly: 'you' not 'users'",
    example: {
      before: "Users can access their dashboard.",
      after: "Your dashboard. Always on.",
    },
  },
  // Provides/offers/allows
  {
    pattern: /(?:this\s+)?(?:platform|product|feature|tool)\s+(?:provides|offers|allows|enables|gives)\s+(?:you\s+)?(?:the\s+ability\s+to|access\s+to)?/gi,
    issue: "Feature-speak instead of benefit",
    technique: "Lead with what the person gets.",
    example: {
      before: "This feature provides you with the ability to set alerts.",
      after: "Set alerts. Never miss a move.",
    },
  },
  // Long sentences (150+ chars without period)
  {
    pattern: /[^.!?]{150,}?(?=[.!?])/g,
    issue: "Sentence too long",
    technique: "Break into shorter punches. Vary rhythm.",
    example: {
      before: "The platform enables traders to access a wide range of markets and execute trades with minimal fees while maintaining full custody of their assets.",
      after: "Access any market. Pay minimal fees. Keep your keys.",
    },
  },
];

// Luxury copy principles for suggestions
const POLISH_PRINCIPLES = [
  "**Shorter is stronger** — Cut every word that doesn't earn its place",
  "**Lead with the payoff** — What does the reader get? Say that first.",
  "**Speak to one person** — 'You' not 'users'. Write like talking to a smart friend.",
  "**Show, don't tell** — Don't say 'revolutionary'. Show what makes it so.",
  "**Confidence without arrogance** — Don't announce quality. Demonstrate it.",
  "**Create rhythm** — Short. Short. Then longer to land the point.",
];

interface PolishSuggestion {
  original: string;
  issue: string;
  technique: string;
  example?: { before: string; after: string };
  line?: number;
}

function analyzeForPolishing(content: string): PolishSuggestion[] {
  const suggestions: PolishSuggestion[] = [];
  const lines = content.split("\n");
  
  for (const rule of TRANSFORMATION_RULES) {
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      // Find line number
      const beforeMatch = content.slice(0, match.index);
      const lineNum = beforeMatch.split("\n").length;
      
      suggestions.push({
        original: match[0],
        issue: rule.issue,
        technique: rule.technique,
        example: rule.example,
        line: lineNum,
      });
    }
  }
  
  return suggestions;
}

function formatPolishReport(content: string, suggestions: PolishSuggestion[]): string {
  let response = `✨ **Polish Report**\n\n`;
  
  if (suggestions.length === 0) {
    response += `🏆 **Premium quality!** No major issues found.\n\n`;
    response += `**Quick check:**\n`;
    response += `• Does every sentence earn its place?\n`;
    response += `• Is the benefit clear in the first line?\n`;
    response += `• Would Apple/Porsche publish this?\n`;
    return response;
  }
  
  response += `Found **${suggestions.length} opportunities** to elevate this copy:\n\n`;
  
  // Group by issue type
  const byIssue = new Map<string, PolishSuggestion[]>();
  for (const s of suggestions) {
    const existing = byIssue.get(s.issue) || [];
    existing.push(s);
    byIssue.set(s.issue, existing);
  }
  
  for (const [issue, items] of byIssue) {
    response += `### ${issue} (${items.length}x)\n\n`;
    
    // Show first instance with full detail
    const first = items[0];
    response += `**Found:** \`${first.original}\``;
    if (first.line) response += ` (line ${first.line})`;
    response += `\n`;
    response += `**Technique:** ${first.technique}\n`;
    
    if (first.example) {
      response += `\n**Example transformation:**\n`;
      response += `> ❌ ${first.example.before}\n`;
      response += `> ✅ ${first.example.after}\n`;
    }
    
    // List other instances briefly
    if (items.length > 1) {
      response += `\n**Also found:** `;
      response += items.slice(1, 4).map(i => `\`${i.original.slice(0, 30)}${i.original.length > 30 ? "..." : ""}\``).join(", ");
      if (items.length > 4) response += ` +${items.length - 4} more`;
      response += `\n`;
    }
    
    response += `\n`;
  }
  
  // Add principles
  response += `---\n\n`;
  response += `**Luxury Copy Principles:**\n`;
  for (const principle of POLISH_PRINCIPLES.slice(0, 4)) {
    response += `• ${principle}\n`;
  }
  
  return response;
}

function findFile(target: string): string | null {
  if (fs.existsSync(target)) return target;
  
  const inKnowledge = path.join(KNOWLEDGE_ROOT, target);
  if (fs.existsSync(inKnowledge)) return inKnowledge;
  
  const inDrafts = path.join(DRAFTS_DIR, target);
  if (fs.existsSync(inDrafts)) return inDrafts;
  
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

export const polishContentAction: Action = {
  name: "POLISH",
  description: `Transform generic copy into premium, brand-elevating content.

TRIGGERS:
- "polish this:" + content — Polish pasted content
- "polish <file>" — Polish a specific file
- "rewrite this" — Same as polish
- "make this premium" — Same as polish

APPLIES:
- Apple principles (simplicity, user focus, benefit-led)
- Porsche principles (confident, crafted, elite)
- Anti-AI-slop (authentic, specific, earned)

OUTPUT:
- Specific issues found with line numbers
- Transformation techniques for each issue
- Before/after examples
- Luxury copy principles to apply

Use this before publishing to ensure premium quality.`,

  similes: [
    "POLISH",
    "POLISH_CONTENT",
    "REWRITE",
    "MAKE_PREMIUM",
    "ELEVATE",
    "UPGRADE_COPY",
  ],

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: `polish this: We're excited to announce our revolutionary new feature that leverages cutting-edge technology to provide users with a comprehensive trading experience.`,
        },
      },
      {
        name: "{{agent}}",
        content: {
          text: `✨ **Polish Report**

Found **4 opportunities** to elevate this copy:

### Generic announcement (1x)

**Found:** \`We're excited to announce\`
**Technique:** Skip the preamble. Announce directly.

**Example transformation:**
> ❌ We're excited to announce our new feature!
> ✅ Introducing limit orders.

### Self-proclaimed greatness (1x)

**Found:** \`revolutionary\`
**Technique:** Show the innovation. Let readers conclude it's revolutionary.

---

**Suggested rewrite:**
> "The new trading engine. Faster fills. Lower fees. Full custody."`,
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    const text = (message.content?.text || "").toLowerCase();
    return (
      text.includes("polish") ||
      text.includes("rewrite") ||
      text.includes("make this premium") ||
      text.includes("elevate") ||
      text.includes("upgrade copy")
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
    
    logger.info("[Polish] Analyzing content for premium transformation");

    let content: string | null = null;
    let filename: string | undefined;
    
    // Check for file reference
    const fileMatch = text.match(/(?:polish|rewrite|elevate)\s+(?:file\s+)?["']?([^\s"']+\.md)["']?/i);
    if (fileMatch) {
      const filePath = findFile(fileMatch[1]);
      if (filePath) {
        content = fs.readFileSync(filePath, "utf-8");
        filename = path.basename(filePath);
      } else {
        callback?.({
          text: `❌ **File not found:** ${fileMatch[1]}\n\nTry:\n• \`polish drafts/my-essay.md\`\n• Or paste content after "polish this:"`,
        });
        return true;
      }
    }
    
    // Check for inline content
    if (!content) {
      const contentMatch = text.match(/(?:polish|rewrite|make\s+(?:this\s+)?premium|elevate)[:\s]+(.+)/is);
      if (contentMatch && contentMatch[1].trim().length > 50) {
        content = contentMatch[1].trim();
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
        text: `✨ **Polish Content**

Transform generic copy into premium, brand-elevating content.

**Usage:**
• \`polish this: <your content>\` — Polish pasted text
• \`polish <filename>\` — Polish a draft file

**What it checks:**
• AI-slop phrases (generic intros, empty adjectives)
• Weak hedging and corporate speak
• Feature-focus instead of benefit-focus
• Impersonal language ("users" vs "you")
• Overly long sentences

**The goal:** Copy that Apple or Porsche would publish.`,
      });
      return true;
    }

    // Analyze content
    const suggestions = analyzeForPolishing(content);
    
    // Also run style check for additional issues
    const styleResult = checkStyle(content);
    
    // Format report
    let response = formatPolishReport(content, suggestions);
    
    // Add style violations summary if significant
    if (styleResult.summary.errors > 0 || styleResult.summary.warnings > 3) {
      response += `\n---\n\n`;
      response += `**Style Check:** ${styleResult.score}/100\n`;
      if (styleResult.summary.errors > 0) {
        response += `• ${styleResult.summary.errors} errors (prohibited phrases)\n`;
      }
      if (styleResult.summary.warnings > 0) {
        response += `• ${styleResult.summary.warnings} warnings (terminology/capitalization)\n`;
      }
      response += `\nRun \`style check\` for full details.\n`;
    }
    
    if (filename) {
      response = response.replace("**Polish Report**", `**Polish Report: ${filename}**`);
    }

    callback?.({ text: response });
    return true;
  },
};

export default polishContentAction;
