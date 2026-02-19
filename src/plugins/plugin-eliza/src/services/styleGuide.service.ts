/**
 * Style Guide Service
 *
 * Enforces brand consistency by checking content against style rules:
 * - Terminology (preferred vs avoided terms)
 * - Capitalization (brand names, acronyms)
 * - Formatting (headers, lists, links)
 * - Tone markers (formal/casual indicators)
 * - Prohibited phrases
 * - Required elements
 *
 * Style guide is loaded from knowledge/brand/style-guide.md
 * or can be configured programmatically.
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

import { STYLE_GUIDE_PATH, getCacheRoot } from "../config/paths";
const STYLE_CACHE_PATH = path.join(getCacheRoot(), "style-guide.json");

export interface TerminologyRule {
  preferred: string;
  avoid: string[];
  context?: string; // when this rule applies
  caseSensitive?: boolean;
}

export interface CapitalizationRule {
  term: string;
  correct: string;
  type: "brand" | "acronym" | "product" | "general";
}

export interface ToneMarker {
  pattern: string;
  tone: "formal" | "casual" | "technical" | "promotional";
  suggestion?: string;
}

export interface ProhibitedPhrase {
  phrase: string;
  reason: string;
  suggestion?: string;
}

export interface RequiredElement {
  name: string;
  pattern: string; // regex pattern to detect presence
  description: string;
  severity: "error" | "warning";
}

export interface FormattingRule {
  name: string;
  check: "headers" | "lists" | "links" | "code" | "quotes" | "custom";
  pattern?: string;
  correct?: string;
  description: string;
}

export interface StyleGuide {
  name: string;
  version: string;
  lastUpdated: string;

  // Voice & Tone
  voiceDescription: string;
  targetTone: (
    | "authoritative"
    | "conversational"
    | "educational"
    | "provocative"
  )[];

  // Rules
  terminology: TerminologyRule[];
  capitalization: CapitalizationRule[];
  toneMarkers: ToneMarker[];
  prohibited: ProhibitedPhrase[];
  required: RequiredElement[];
  formatting: FormattingRule[];

  // Custom patterns
  customRules: Array<{
    name: string;
    pattern: string;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
}

export interface StyleViolation {
  rule: string;
  type:
    | "terminology"
    | "capitalization"
    | "tone"
    | "prohibited"
    | "required"
    | "formatting"
    | "custom";
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
  column?: number;
  found?: string;
  suggestion?: string;
}

export interface StyleCheckResult {
  passed: boolean;
  score: number; // 0-100
  violations: StyleViolation[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  suggestions: string[];
}

/**
 * Default style guide for Ikigai Studios
 */
const DEFAULT_STYLE_GUIDE: StyleGuide = {
  name: "Ikigai Studios Style Guide",
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),

  voiceDescription:
    "Authoritative yet accessible. We explain complex crypto concepts clearly without dumbing them down. Confident but not arrogant. Forward-thinking but grounded in fundamentals.",

  targetTone: ["authoritative", "educational", "conversational"],

  terminology: [
    {
      preferred: "crypto",
      avoid: ["cryptocurrency", "cryptocurrencies"],
      context: "general use",
    },
    { preferred: "DeFi", avoid: ["defi", "DEFI", "Defi"], caseSensitive: true },
    {
      preferred: "NFT",
      avoid: ["nft", "Nft", "Non-fungible token"],
      caseSensitive: true,
    },
    {
      preferred: "web3",
      avoid: ["Web3", "WEB3", "Web 3", "web 3"],
      caseSensitive: true,
    },
    {
      preferred: "onchain",
      avoid: ["on-chain", "on chain", "On-chain"],
      caseSensitive: true,
    },
    {
      preferred: "Bitcoin",
      avoid: ["bitcoin", "BTC"],
      context: "when referring to the network",
      caseSensitive: true,
    },
    {
      preferred: "Ethereum",
      avoid: ["ethereum", "ETH"],
      context: "when referring to the network",
      caseSensitive: true,
    },
    {
      preferred: "Layer 2",
      avoid: ["L2", "layer 2", "layer-2"],
      context: "first mention",
    },
    { preferred: "smart contract", avoid: ["smartcontract", "smart-contract"] },
    { preferred: "decentralized", avoid: ["de-centralized", "de centralized"] },
    { preferred: "tokenomics", avoid: ["token economics", "token-economics"] },
    { preferred: "airdrop", avoid: ["air drop", "air-drop"] },
    { preferred: "whitepaper", avoid: ["white paper", "white-paper"] },
    { preferred: "blockchain", avoid: ["block chain", "block-chain"] },
    { preferred: "stablecoin", avoid: ["stable coin", "stable-coin"] },
  ],

  capitalization: [
    { term: "Ethereum", correct: "Ethereum", type: "brand" },
    { term: "Bitcoin", correct: "Bitcoin", type: "brand" },
    { term: "Solana", correct: "Solana", type: "brand" },
    { term: "Uniswap", correct: "Uniswap", type: "brand" },
    { term: "OpenSea", correct: "OpenSea", type: "brand" },
    { term: "Coinbase", correct: "Coinbase", type: "brand" },
    { term: "MetaMask", correct: "MetaMask", type: "brand" },
    { term: "DeFi", correct: "DeFi", type: "acronym" },
    { term: "NFT", correct: "NFT", type: "acronym" },
    { term: "DAO", correct: "DAO", type: "acronym" },
    { term: "DEX", correct: "DEX", type: "acronym" },
    { term: "CEX", correct: "CEX", type: "acronym" },
    { term: "TVL", correct: "TVL", type: "acronym" },
    { term: "APY", correct: "APY", type: "acronym" },
    { term: "APR", correct: "APR", type: "acronym" },
    { term: "AMM", correct: "AMM", type: "acronym" },
    { term: "EVM", correct: "EVM", type: "acronym" },
    { term: "RWA", correct: "RWA", type: "acronym" },
    { term: "AI", correct: "AI", type: "acronym" },
  ],

  toneMarkers: [
    // Casual/weak markers
    {
      pattern: "obviously",
      tone: "casual",
      suggestion: "Remove - can sound condescending",
    },
    {
      pattern: "simply",
      tone: "casual",
      suggestion: "Remove - nothing is 'simple' to everyone",
    },
    {
      pattern: "just",
      tone: "casual",
      suggestion: "Consider removing - often unnecessary",
    },
    {
      pattern: "basically",
      tone: "casual",
      suggestion: "Remove - weakens authority",
    },
    {
      pattern: "actually",
      tone: "casual",
      suggestion: "Remove - often unnecessary",
    },
    {
      pattern: "I think",
      tone: "casual",
      suggestion: "Be more assertive: state the opinion directly",
    },
    {
      pattern: "I believe",
      tone: "casual",
      suggestion: "Be more assertive: state the opinion directly",
    },
    {
      pattern: "In my opinion",
      tone: "casual",
      suggestion: "Be more assertive: state the opinion directly",
    },
    {
      pattern: "hopefully",
      tone: "casual",
      suggestion: "Be confident - state what it does, not what you hope",
    },
    {
      pattern: "might help",
      tone: "casual",
      suggestion: "Be confident - state the benefit directly",
    },
    // Promotional/hype markers
    {
      pattern: "!!",
      tone: "promotional",
      suggestion: "Single exclamation max",
    },
    {
      pattern: "🚀",
      tone: "promotional",
      suggestion: "Avoid rocket emoji - too promotional",
    },
    {
      pattern: "WAGMI",
      tone: "promotional",
      suggestion: "Avoid crypto slang in essays",
    },
    {
      pattern: "NGMI",
      tone: "promotional",
      suggestion: "Avoid crypto slang in essays",
    },
    {
      pattern: "moonshot",
      tone: "promotional",
      suggestion: "Avoid hype language",
    },
    {
      pattern: "to the moon",
      tone: "promotional",
      suggestion: "Avoid hype language",
    },
    {
      pattern: "guaranteed",
      tone: "promotional",
      suggestion: "Never guarantee outcomes",
    },
    // AI-slop markers (corporate filler)
    {
      pattern: "in the ever-evolving",
      tone: "formal",
      suggestion: "AI-slop: delete this phrase entirely",
    },
    {
      pattern: "it's important to note",
      tone: "formal",
      suggestion: "AI-slop: just state the thing",
    },
    {
      pattern: "let's dive in",
      tone: "formal",
      suggestion: "AI-slop: just start",
    },
    {
      pattern: "dive deep",
      tone: "formal",
      suggestion: "AI-slop: use 'explore' or 'examine' or just do it",
    },
    {
      pattern: "unpack",
      tone: "formal",
      suggestion: "AI-slop: use 'explain' or 'break down'",
    },
    {
      pattern: "game-changer",
      tone: "formal",
      suggestion: "AI-slop: show don't tell - explain the actual impact",
    },
    {
      pattern: "game changer",
      tone: "formal",
      suggestion: "AI-slop: show don't tell - explain the actual impact",
    },
    {
      pattern: "revolutionary",
      tone: "formal",
      suggestion: "AI-slop: be specific about what's new",
    },
    {
      pattern: "cutting-edge",
      tone: "formal",
      suggestion: "AI-slop: be specific about the technology",
    },
    {
      pattern: "cutting edge",
      tone: "formal",
      suggestion: "AI-slop: be specific about the technology",
    },
    {
      pattern: "leverage",
      tone: "formal",
      suggestion: "AI-slop: use 'use' instead",
    },
    {
      pattern: "synergy",
      tone: "formal",
      suggestion: "AI-slop: describe the actual benefit",
    },
    {
      pattern: "holistic",
      tone: "formal",
      suggestion: "AI-slop: be specific about what's included",
    },
    {
      pattern: "unlock the power",
      tone: "formal",
      suggestion: "AI-slop: state the benefit directly",
    },
    {
      pattern: "take .* to the next level",
      tone: "formal",
      suggestion: "AI-slop: be specific about the improvement",
    },
    {
      pattern: "in today's fast-paced",
      tone: "formal",
      suggestion: "AI-slop: delete this phrase entirely",
    },
    {
      pattern: "without further ado",
      tone: "formal",
      suggestion: "AI-slop: just start",
    },
    {
      pattern: "first and foremost",
      tone: "formal",
      suggestion: "AI-slop: just say 'first' or remove",
    },
    {
      pattern: "at the end of the day",
      tone: "formal",
      suggestion: "AI-slop: state your conclusion directly",
    },
    {
      pattern: "moving forward",
      tone: "formal",
      suggestion: "AI-slop: be specific about what's next",
    },
    {
      pattern: "robust",
      tone: "formal",
      suggestion: "AI-slop: be specific about what makes it strong",
    },
    {
      pattern: "seamless",
      tone: "formal",
      suggestion: "AI-slop: describe the actual experience",
    },
    {
      pattern: "comprehensive",
      tone: "formal",
      suggestion: "AI-slop: be specific about what's covered",
    },
    {
      pattern: "excited to announce",
      tone: "formal",
      suggestion: "AI-slop: just announce it",
    },
    {
      pattern: "thrilled to share",
      tone: "formal",
      suggestion: "AI-slop: just share it",
    },
    {
      pattern: "passionate about",
      tone: "formal",
      suggestion: "AI-slop: show passion through substance",
    },
    {
      pattern: "ecosystem",
      tone: "formal",
      suggestion: "AI-slop: be specific - protocol? community? tooling?",
    },
    {
      pattern: "empower",
      tone: "formal",
      suggestion: "AI-slop: state what users can actually do",
    },
    {
      pattern: "streamline",
      tone: "formal",
      suggestion: "AI-slop: be specific about what's faster/easier",
    },
    {
      pattern: "optimize",
      tone: "formal",
      suggestion: "AI-slop: be specific about the improvement",
    },
  ],

  prohibited: [
    {
      phrase: "financial advice",
      reason: "Legal liability",
      suggestion:
        "Add 'not financial advice' disclaimer if discussing investments",
    },
    {
      phrase: "get rich",
      reason: "Hype language",
      suggestion: "Focus on education, not wealth promises",
    },
    {
      phrase: "easy money",
      reason: "Hype language",
      suggestion: "Nothing in crypto is easy money",
    },
    {
      phrase: "can't lose",
      reason: "Misleading",
      suggestion: "All investments carry risk",
    },
    {
      phrase: "100x",
      reason: "Hype language",
      suggestion: "Avoid specific return predictions",
    },
    {
      phrase: "shill",
      reason: "Negative connotation",
      suggestion: "Use 'recommend' or 'highlight'",
    },
    {
      phrase: "ponzi",
      reason: "Legal/defamation risk",
      suggestion: "Use 'unsustainable model' if needed",
    },
    {
      phrase: "scam",
      reason: "Legal/defamation risk",
      suggestion: "Use 'concerning' or 'questionable' unless proven",
    },
  ],

  required: [
    {
      name: "TL;DR",
      pattern: "(?:TL;DR|TLDR|tl;dr|Summary|Key Takeaways)",
      description: "Long-form content should have a summary section",
      severity: "warning",
    },
  ],

  formatting: [
    {
      name: "Header hierarchy",
      check: "headers",
      description: "Use proper header hierarchy (H1 → H2 → H3)",
    },
    {
      name: "Link text",
      check: "links",
      pattern: "\\[(?:click here|here|link)\\]",
      description: "Avoid generic link text like 'click here'",
    },
    {
      name: "Code blocks",
      check: "code",
      description: "Use fenced code blocks with language specification",
    },
  ],

  customRules: [
    {
      name: "Sentence length",
      pattern: "[^.!?]{200,}[.!?]",
      message: "Sentence may be too long (200+ chars). Consider breaking up.",
      severity: "info",
    },
    {
      name: "Passive voice",
      pattern: "\\b(?:was|were|been|being|is|are|am)\\s+(?:\\w+ed|\\w+en)\\b",
      message:
        "Possible passive voice. Consider active voice for stronger writing.",
      severity: "info",
    },
    {
      name: "Weasel words",
      pattern:
        "\\b(?:some|many|most|often|usually|generally|probably|possibly)\\b",
      message: "Weasel word detected. Consider being more specific.",
      severity: "info",
    },
  ],
};

/**
 * Load style guide from file or return default
 */
export function loadStyleGuide(): StyleGuide {
  // Try loading from cache first
  try {
    if (fs.existsSync(STYLE_CACHE_PATH)) {
      const cached = JSON.parse(
        fs.readFileSync(STYLE_CACHE_PATH, "utf-8"),
      ) as StyleGuide;
      // Check if source file is newer
      if (fs.existsSync(STYLE_GUIDE_PATH)) {
        const cacheStat = fs.statSync(STYLE_CACHE_PATH);
        const sourceStat = fs.statSync(STYLE_GUIDE_PATH);
        if (sourceStat.mtimeMs <= cacheStat.mtimeMs) {
          return cached;
        }
      } else {
        return cached;
      }
    }
  } catch (e) {
    logger.debug("[StyleGuide] Cache miss, loading from source");
  }

  // Try loading from markdown file
  if (fs.existsSync(STYLE_GUIDE_PATH)) {
    try {
      const content = fs.readFileSync(STYLE_GUIDE_PATH, "utf-8");
      const guide = parseStyleGuideMarkdown(content);
      saveStyleGuide(guide);
      return guide;
    } catch (e) {
      logger.warn(
        "[StyleGuide] Could not parse style guide markdown, using default",
      );
    }
  }

  // Return and save default
  saveStyleGuide(DEFAULT_STYLE_GUIDE);
  return DEFAULT_STYLE_GUIDE;
}

/**
 * Parse style guide from markdown format
 */
function parseStyleGuideMarkdown(content: string): StyleGuide {
  const guide = { ...DEFAULT_STYLE_GUIDE };
  guide.lastUpdated = new Date().toISOString();

  // Extract terminology rules from markdown tables or lists
  const termSection = content.match(/##\s*Terminology[\s\S]*?(?=##|$)/i);
  if (termSection) {
    const termRules: TerminologyRule[] = [];
    const termMatches = termSection[0].matchAll(
      /[*-]\s*(?:Use\s+)?["']?(\w+)["']?\s*(?:not|instead of|avoid)\s*["']?([^"'\n]+)["']?/gi,
    );
    for (const match of termMatches) {
      termRules.push({
        preferred: match[1],
        avoid: match[2].split(/[,;]/).map((s) => s.trim()),
      });
    }
    if (termRules.length > 0) {
      guide.terminology = [...DEFAULT_STYLE_GUIDE.terminology, ...termRules];
    }
  }

  // Extract prohibited phrases
  const prohibitedSection = content.match(
    /##\s*(?:Prohibited|Never Use|Avoid)[\s\S]*?(?=##|$)/i,
  );
  if (prohibitedSection) {
    const prohibited: ProhibitedPhrase[] = [];
    const matches = prohibitedSection[0].matchAll(
      /[*-]\s*["']?([^"'\n:]+)["']?\s*[-:]\s*(.+)/g,
    );
    for (const match of matches) {
      prohibited.push({
        phrase: match[1].trim(),
        reason: match[2].trim(),
      });
    }
    if (prohibited.length > 0) {
      guide.prohibited = [...DEFAULT_STYLE_GUIDE.prohibited, ...prohibited];
    }
  }

  return guide;
}

/**
 * Save style guide to cache
 */
export function saveStyleGuide(guide: StyleGuide): void {
  const cacheDir = path.dirname(STYLE_CACHE_PATH);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(STYLE_CACHE_PATH, JSON.stringify(guide, null, 2));
}

/**
 * Check content against style guide
 */
export function checkStyle(
  content: string,
  guide?: StyleGuide,
): StyleCheckResult {
  const styleGuide = guide || loadStyleGuide();
  const violations: StyleViolation[] = [];
  const lines = content.split("\n");

  // Check terminology
  for (const rule of styleGuide.terminology) {
    for (const avoid of rule.avoid) {
      const regex = rule.caseSensitive
        ? new RegExp(`\\b${escapeRegex(avoid)}\\b`, "g")
        : new RegExp(`\\b${escapeRegex(avoid)}\\b`, "gi");

      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split("\n").length;
        violations.push({
          rule: `Terminology: ${rule.preferred}`,
          type: "terminology",
          severity: "warning",
          message: `Use "${rule.preferred}" instead of "${avoid}"`,
          line: lineNum,
          found: match[0],
          suggestion: rule.preferred,
        });
      }
    }
  }

  // Check capitalization
  for (const rule of styleGuide.capitalization) {
    const variants = [
      rule.term.toLowerCase(),
      rule.term.toUpperCase(),
      rule.term,
    ].filter((v) => v !== rule.correct);

    for (const variant of variants) {
      const regex = new RegExp(`\\b${escapeRegex(variant)}\\b`, "g");
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (match[0] !== rule.correct) {
          const lineNum = content.slice(0, match.index).split("\n").length;
          violations.push({
            rule: `Capitalization: ${rule.correct}`,
            type: "capitalization",
            severity: "warning",
            message: `"${rule.correct}" should be capitalized as shown (${rule.type})`,
            line: lineNum,
            found: match[0],
            suggestion: rule.correct,
          });
        }
      }
    }
  }

  // Check tone markers
  for (const marker of styleGuide.toneMarkers) {
    const regex = new RegExp(escapeRegex(marker.pattern), "gi");
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      violations.push({
        rule: `Tone: ${marker.tone}`,
        type: "tone",
        severity: "info",
        message:
          marker.suggestion || `"${marker.pattern}" has ${marker.tone} tone`,
        line: lineNum,
        found: match[0],
        suggestion: marker.suggestion,
      });
    }
  }

  // Check prohibited phrases
  for (const phrase of styleGuide.prohibited) {
    const regex = new RegExp(escapeRegex(phrase.phrase), "gi");
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      violations.push({
        rule: `Prohibited: ${phrase.phrase}`,
        type: "prohibited",
        severity: "error",
        message: `"${phrase.phrase}" should not be used: ${phrase.reason}`,
        line: lineNum,
        found: match[0],
        suggestion: phrase.suggestion,
      });
    }
  }

  // Check required elements
  for (const required of styleGuide.required) {
    const regex = new RegExp(required.pattern, "i");
    if (!regex.test(content)) {
      violations.push({
        rule: `Required: ${required.name}`,
        type: "required",
        severity: required.severity,
        message: required.description,
      });
    }
  }

  // Check formatting rules
  for (const rule of styleGuide.formatting) {
    if (rule.pattern) {
      const regex = new RegExp(rule.pattern, "gi");
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split("\n").length;
        violations.push({
          rule: `Formatting: ${rule.name}`,
          type: "formatting",
          severity: "warning",
          message: rule.description,
          line: lineNum,
          found: match[0],
        });
      }
    }
  }

  // Check header hierarchy
  const headerRule = styleGuide.formatting.find((f) => f.check === "headers");
  if (headerRule) {
    let lastLevel = 0;
    for (let i = 0; i < lines.length; i++) {
      const headerMatch = lines[i].match(/^(#{1,6})\s/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        if (level > lastLevel + 1 && lastLevel > 0) {
          violations.push({
            rule: "Formatting: Header hierarchy",
            type: "formatting",
            severity: "warning",
            message: `Skipped header level: H${lastLevel} → H${level}. Use H${lastLevel + 1} instead.`,
            line: i + 1,
            found: lines[i],
          });
        }
        lastLevel = level;
      }
    }
  }

  // Check custom rules
  for (const rule of styleGuide.customRules) {
    try {
      const regex = new RegExp(rule.pattern, "gi");
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split("\n").length;
        violations.push({
          rule: `Custom: ${rule.name}`,
          type: "custom",
          severity: rule.severity,
          message: rule.message,
          line: lineNum,
          found: match[0].slice(0, 50) + (match[0].length > 50 ? "..." : ""),
        });
      }
    } catch (e) {
      logger.debug(`[StyleGuide] Invalid regex in custom rule: ${rule.name}`);
    }
  }

  // Calculate summary
  const summary = {
    errors: violations.filter((v) => v.severity === "error").length,
    warnings: violations.filter((v) => v.severity === "warning").length,
    info: violations.filter((v) => v.severity === "info").length,
  };

  // Calculate score (100 - weighted deductions)
  const score = Math.max(
    0,
    100 - summary.errors * 10 - summary.warnings * 3 - summary.info * 1,
  );

  // Generate suggestions
  const suggestions: string[] = [];
  if (summary.errors > 0) {
    suggestions.push(
      `Fix ${summary.errors} error(s) — these are critical style violations`,
    );
  }
  if (summary.warnings > 5) {
    suggestions.push(
      `Address terminology and capitalization warnings for brand consistency`,
    );
  }
  const toneViolations = violations.filter((v) => v.type === "tone");
  if (toneViolations.length > 3) {
    suggestions.push(
      `Review tone markers — ${toneViolations.length} instances may not match brand voice`,
    );
  }

  return {
    passed: summary.errors === 0,
    score,
    violations,
    summary,
    suggestions,
  };
}

/**
 * Get a quick summary of style guide rules
 */
export function getStyleGuideSummary(): string {
  const guide = loadStyleGuide();
  return `**${guide.name}** (v${guide.version})

**Voice:** ${guide.voiceDescription}

**Target Tone:** ${guide.targetTone.join(", ")}

**Rules:**
• ${guide.terminology.length} terminology rules
• ${guide.capitalization.length} capitalization rules
• ${guide.toneMarkers.length} tone markers
• ${guide.prohibited.length} prohibited phrases
• ${guide.required.length} required elements
• ${guide.formatting.length} formatting rules
• ${guide.customRules.length} custom rules`;
}

/**
 * Auto-fix simple violations (terminology, capitalization)
 */
export function autoFix(
  content: string,
  guide?: StyleGuide,
): { content: string; fixes: number } {
  const styleGuide = guide || loadStyleGuide();
  let fixed = content;
  let fixes = 0;

  // Fix terminology
  for (const rule of styleGuide.terminology) {
    for (const avoid of rule.avoid) {
      const regex = rule.caseSensitive
        ? new RegExp(`\\b${escapeRegex(avoid)}\\b`, "g")
        : new RegExp(`\\b${escapeRegex(avoid)}\\b`, "gi");

      const before = fixed;
      fixed = fixed.replace(regex, rule.preferred);
      if (fixed !== before) {
        fixes += (before.match(regex) || []).length;
      }
    }
  }

  // Fix capitalization
  for (const rule of styleGuide.capitalization) {
    const regex = new RegExp(`\\b${escapeRegex(rule.term)}\\b`, "gi");
    const before = fixed;
    fixed = fixed.replace(regex, (match) => {
      if (match !== rule.correct) {
        fixes++;
        return rule.correct;
      }
      return match;
    });
  }

  return { content: fixed, fixes };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default {
  loadStyleGuide,
  saveStyleGuide,
  checkStyle,
  getStyleGuideSummary,
  autoFix,
  DEFAULT_STYLE_GUIDE,
};
