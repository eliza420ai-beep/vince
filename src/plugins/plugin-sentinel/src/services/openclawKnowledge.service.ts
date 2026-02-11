/**
 * OpenClaw Knowledge Service
 *
 * Deep knowledge of OpenClaw (formerly ClawdBot/MoltBot) for intelligent integration guidance.
 * Sentinel treats OpenClaw as a first-class part of the ecosystem.
 *
 * Key areas:
 * - OpenClaw basics (what it is, how it works)
 * - Integration patterns (openclaw-adapter, standup actions)
 * - Milaidy connection (personal AI on ElizaOS)
 * - Skills system (how to create/use skills)
 * - ClawdBot for knowledge research (X follows → threads → knowledge pipeline)
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge", "sentinel-docs");

export interface OpenClawCapability {
  name: string;
  description: string;
  category: "core" | "channel" | "tool" | "integration";
  relevance: "high" | "medium" | "low";
  docsLink?: string;
}

export interface IntegrationPattern {
  name: string;
  description: string;
  whenToUse: string;
  implementation: string;
  example?: string;
}

export interface ClawdbotSetup {
  purpose: string;
  requirements: string[];
  steps: string[];
  benefits: string[];
}

// Core OpenClaw knowledge
const OPENCLAW_OVERVIEW = {
  what: "OpenClaw is a personal AI assistant you run on your own devices. Gateway is the control plane; the product is the assistant.",
  formerly: "Previously known as ClawdBot and MoltBot",
  philosophy: "Local-first, multi-channel, always-on",
  website: "https://openclaw.ai",
  docs: "https://docs.openclaw.ai",
  repo: "https://github.com/openclaw/openclaw",
  discord: "https://discord.gg/clawd",
};

// Key capabilities
const OPENCLAW_CAPABILITIES: OpenClawCapability[] = [
  {
    name: "Multi-channel Inbox",
    description: "WhatsApp, Telegram, Slack, Discord, Signal, iMessage, Teams, Matrix, Google Chat, WebChat",
    category: "channel",
    relevance: "high",
    docsLink: "https://docs.openclaw.ai/channels",
  },
  {
    name: "Gateway Control Plane",
    description: "Sessions, presence, config, cron, webhooks, Canvas host",
    category: "core",
    relevance: "high",
    docsLink: "https://docs.openclaw.ai/gateway",
  },
  {
    name: "Skills System",
    description: "Bundled, managed, and workspace skills for extending capabilities",
    category: "tool",
    relevance: "high",
    docsLink: "https://docs.openclaw.ai/tools/skills",
  },
  {
    name: "Live Canvas",
    description: "Agent-driven visual workspace with A2UI",
    category: "tool",
    relevance: "medium",
    docsLink: "https://docs.openclaw.ai/platforms/mac/canvas",
  },
  {
    name: "Voice Wake + Talk Mode",
    description: "Always-on speech for macOS/iOS/Android with ElevenLabs",
    category: "tool",
    relevance: "medium",
    docsLink: "https://docs.openclaw.ai/nodes/voicewake",
  },
  {
    name: "Cron Jobs",
    description: "Scheduled tasks, heartbeats, proactive actions",
    category: "core",
    relevance: "high",
  },
  {
    name: "Browser Control",
    description: "Puppeteer-based browser automation",
    category: "tool",
    relevance: "medium",
  },
  {
    name: "Node Companion Apps",
    description: "macOS menu bar + iOS/Android nodes",
    category: "core",
    relevance: "medium",
    docsLink: "https://docs.openclaw.ai/nodes",
  },
];

// Integration patterns
const INTEGRATION_PATTERNS: IntegrationPattern[] = [
  {
    name: "OpenClaw Adapter",
    description: "Bridge Eliza plugins to OpenClaw — actions become tools, providers become hooks",
    whenToUse: "When you want to reuse Eliza plugins (wallet, trading, connectors) in an OpenClaw agent",
    implementation: `\`\`\`json
{
  "plugins": {
    "eliza-adapter": {
      "plugins": ["@elizaos/plugin-evm", "@elizaos/plugin-solana"],
      "settings": {
        "EVM_PRIVATE_KEY": "\${EVM_PRIVATE_KEY}",
        "SOLANA_PRIVATE_KEY": "\${SOLANA_PRIVATE_KEY}"
      }
    }
  }
}
\`\`\``,
    example: "Our wallet/trading logic can power both Eliza agents AND OpenClaw agents without rewriting",
  },
  {
    name: "Milaidy Gateway Integration",
    description: "Send standup action items to Milaidy for execution",
    whenToUse: "When standup produces 'build' action items that Milaidy can execute",
    implementation: `Set MILAIDY_GATEWAY_URL (e.g. http://localhost:18789), then POST to /api/standup-action with { description, assigneeAgentName, source: "vince-standup" }`,
    example: "Standup identifies 'refactor options action' → Milaidy receives task → executes → returns deliverable path",
  },
  {
    name: "Clawdbot for Knowledge Research",
    description: "Dedicated X account + curated follows + Birdy → threads/URLs → knowledge pipeline (no X API cost)",
    whenToUse: "When you need continuous knowledge ingestion from X without API quota",
    implementation: `1. Create dedicated X account (e.g. @vince_research_bot)
2. Curate high-quality follows (alpha accounts, researchers, devs)
3. Set up Birdy to scrape home timeline
4. Pipe threads/URLs through VINCE_UPLOAD → knowledge/`,
    example: "Clawdbot follows 50 alpha accounts → Birdy captures threads → summarize → knowledge/crypto-research/",
  },
  {
    name: "Hybrid Agent Mode",
    description: "VINCE (ElizaOS) for conversation + OpenClaw sub-agents for parallel deep-dive research",
    whenToUse: "When you need parallel research sessions that don't block the main conversation",
    implementation: `Main agent delegates to OpenClaw research sessions via Gateway API. Results aggregated and presented.`,
    example: "User asks about $XYZ → spawn 3 research agents (on-chain, social, technical) → aggregate findings",
  },
];

// Clawdbot setup guide
const CLAWDBOT_SETUP: ClawdbotSetup = {
  purpose: "24/7 knowledge research without X API cost — curated follows + scraping → knowledge pipeline",
  requirements: [
    "Dedicated X account for research (e.g. @vince_research_bot)",
    "Birdy or equivalent scraper for home timeline",
    "VINCE_UPLOAD action or scripts/ingest-urls.ts for ingestion",
    "Optional: #vince-research Discord channel for pushes",
  ],
  steps: [
    "1. Create a new X account dedicated to research (keeps follows curated)",
    "2. Follow 30-50 high-signal accounts: researchers, alpha leakers, devs, analysts",
    "3. Set up Birdy to capture home timeline (see github.com/birdy-ai/birdy)",
    "4. Configure pipeline: Birdy output → filter for threads/URLs → VINCE_UPLOAD",
    "5. Schedule: run every 2-4 hours to capture new content",
    "6. Optional: Push summaries to #vince-research Discord channel",
  ],
  benefits: [
    "No X API cost (scraping is free)",
    "Curated feed (you control the follows)",
    "24/7 operation (scheduled runs)",
    "Knowledge compounds over time",
    "Feeds into VINCE's research and content generation",
  ],
};

/**
 * Get OpenClaw overview
 */
export function getOverview(): typeof OPENCLAW_OVERVIEW {
  return OPENCLAW_OVERVIEW;
}

/**
 * Get all capabilities
 */
export function getCapabilities(): OpenClawCapability[] {
  return OPENCLAW_CAPABILITIES;
}

/**
 * Get capabilities by category
 */
export function getCapabilitiesByCategory(category: OpenClawCapability["category"]): OpenClawCapability[] {
  return OPENCLAW_CAPABILITIES.filter(c => c.category === category);
}

/**
 * Get high-relevance capabilities for VINCE
 */
export function getHighRelevanceCapabilities(): OpenClawCapability[] {
  return OPENCLAW_CAPABILITIES.filter(c => c.relevance === "high");
}

/**
 * Get integration patterns
 */
export function getIntegrationPatterns(): IntegrationPattern[] {
  return INTEGRATION_PATTERNS;
}

/**
 * Get specific integration pattern
 */
export function getIntegrationPattern(name: string): IntegrationPattern | undefined {
  return INTEGRATION_PATTERNS.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
}

/**
 * Get Clawdbot setup guide
 */
export function getClawdbotSetup(): ClawdbotSetup {
  return CLAWDBOT_SETUP;
}

/**
 * Generate OpenClaw quick reference
 */
export function getQuickReference(): string {
  return `# OpenClaw Quick Reference

**What:** ${OPENCLAW_OVERVIEW.what}
**Formerly:** ${OPENCLAW_OVERVIEW.formerly}
**Philosophy:** ${OPENCLAW_OVERVIEW.philosophy}

## Links
- Website: ${OPENCLAW_OVERVIEW.website}
- Docs: ${OPENCLAW_OVERVIEW.docs}
- Repo: ${OPENCLAW_OVERVIEW.repo}
- Discord: ${OPENCLAW_OVERVIEW.discord}

## Install & Run
\`\`\`bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw gateway --port 18789 --verbose
\`\`\`

## Key Capabilities for VINCE Integration
${getHighRelevanceCapabilities().map(c => `• **${c.name}:** ${c.description}`).join("\n")}

## Integration Patterns
${INTEGRATION_PATTERNS.map(p => `### ${p.name}\n${p.whenToUse}`).join("\n\n")}

## Clawdbot for Knowledge Research
${CLAWDBOT_SETUP.purpose}

**Steps:**
${CLAWDBOT_SETUP.steps.join("\n")}
`;
}

/**
 * Generate integration instructions markdown
 */
export function generateIntegrationInstructions(): string {
  const milaidy = INTEGRATION_PATTERNS.find(p => p.name.includes("Milaidy"));
  const adapter = INTEGRATION_PATTERNS.find(p => p.name.includes("Adapter"));
  const clawdbot = INTEGRATION_PATTERNS.find(p => p.name.includes("Clawdbot"));
  
  return `# OpenClaw & Milaidy Integration Instructions

## OpenClaw

**What:** ${OPENCLAW_OVERVIEW.what}

### Install & Run
\`\`\`bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
openclaw gateway --port 18789 --verbose
\`\`\`

### VINCE Integration via openclaw-adapter

${adapter?.description}

**When to use:** ${adapter?.whenToUse}

**Implementation:**
${adapter?.implementation}

**Links:**
- Adapter repo: https://github.com/elizaOS/openclaw-adapter
- OpenClaw docs: ${OPENCLAW_OVERVIEW.docs}

---

## Milaidy

**What:** Personal AI assistant on ElizaOS. Gateway default port 18789.

### Install & Run
\`\`\`bash
npx milaidy
# or
npm install -g milaidy
milaidy start
\`\`\`

### VINCE Integration

${milaidy?.description}

**When to use:** ${milaidy?.whenToUse}

**Implementation:**
${milaidy?.implementation}

**Repo:** https://github.com/milady-ai/milaidy

---

## Clawdbot for Knowledge Research

${clawdbot?.description}

**Purpose:** ${CLAWDBOT_SETUP.purpose}

**Requirements:**
${CLAWDBOT_SETUP.requirements.map(r => `• ${r}`).join("\n")}

**Steps:**
${CLAWDBOT_SETUP.steps.join("\n")}

**Benefits:**
${CLAWDBOT_SETUP.benefits.map(b => `• ${b}`).join("\n")}

---

*Generated by Sentinel. OpenClaw matters A LOT.*
`;
}

/**
 * Check if OpenClaw adapter docs exist
 */
export function hasAdapterDocs(): boolean {
  const adapterDoc = path.join(KNOWLEDGE_ROOT, "OPENCLAW_ADAPTER.md");
  return fs.existsSync(adapterDoc);
}

/**
 * Read adapter docs if available
 */
export function getAdapterDocs(): string | null {
  const adapterDoc = path.join(KNOWLEDGE_ROOT, "OPENCLAW_ADAPTER.md");
  if (fs.existsSync(adapterDoc)) {
    return fs.readFileSync(adapterDoc, "utf-8");
  }
  return null;
}

/**
 * Get suggestion for OpenClaw usage based on context
 */
export function suggestOpenClawUsage(context: string): string[] {
  const suggestions: string[] = [];
  const lower = context.toLowerCase();
  
  if (lower.includes("wallet") || lower.includes("evm") || lower.includes("solana") || lower.includes("otaku")) {
    suggestions.push("Consider openclaw-adapter to expose Eliza wallet plugins as OpenClaw tools — same logic, two runtimes");
  }
  
  if (lower.includes("knowledge") || lower.includes("research") || lower.includes("x ") || lower.includes("twitter")) {
    suggestions.push("Set up Clawdbot: dedicated X account + curated follows + Birdy → knowledge pipeline (no X API cost)");
  }
  
  if (lower.includes("parallel") || lower.includes("deep dive") || lower.includes("research session")) {
    suggestions.push("Use hybrid mode: VINCE for conversation + OpenClaw sub-agents for parallel research");
  }
  
  if (lower.includes("standup") || lower.includes("build") || lower.includes("task")) {
    suggestions.push("Connect standup build items to Milaidy Gateway via POST /api/standup-action");
  }
  
  if (lower.includes("channel") || lower.includes("discord") || lower.includes("telegram") || lower.includes("whatsapp")) {
    suggestions.push("OpenClaw excels at multi-channel: WhatsApp, Telegram, Discord, Slack, Signal, iMessage all supported");
  }
  
  if (suggestions.length === 0) {
    suggestions.push("OpenClaw is a powerful integration point — consider the adapter for tool sharing or Clawdbot for knowledge research");
  }
  
  return suggestions;
}

export default {
  getOverview,
  getCapabilities,
  getCapabilitiesByCategory,
  getHighRelevanceCapabilities,
  getIntegrationPatterns,
  getIntegrationPattern,
  getClawdbotSetup,
  getQuickReference,
  generateIntegrationInstructions,
  hasAdapterDocs,
  getAdapterDocs,
  suggestOpenClawUsage,
};
