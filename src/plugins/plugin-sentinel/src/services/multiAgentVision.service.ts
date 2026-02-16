/**
 * Multi-Agent Vision Service
 *
 * Deep knowledge of the VINCE multi-agent architecture:
 * - North star: "Feels genuinely alive — like you're building together"
 * - ASK_AGENT: One agent asks another and relays the answer
 * - Standups: Kelly-coordinated 2×/day autonomous meetings
 * - Option C Discord: Separate bot identity per agent
 * - Deliverables: PRDs, essays, tweets, trades, good_life, integration_instructions
 * - A2A Policy: allowedTargets, allow rules
 * - Feedback flow: Testing → Sentinel triage → PRD or Eliza task
 *
 * Sentinel must be deeply aware of this vision to make good suggestions.
 */

import { logger } from "@elizaos/core";

// The Dream Team
export interface AgentRole {
  name: string;
  role: string;
  lane: string;
  discordEnvPrefix: string;
  standupParticipant: boolean;
  canAsk: string[];
}

export const AGENT_ROLES: AgentRole[] = [
  {
    name: "Eliza",
    role: "CEO",
    lane: "Knowledge, research, content, strategy, GTM/PR, community, Discord #knowledge, Substack",
    discordEnvPrefix: "ELIZA_DISCORD",
    standupParticipant: true,
    canAsk: ["Vince", "Solus", "Kelly", "Sentinel", "Otaku"],
  },
  {
    name: "VINCE",
    role: "CDO",
    lane: "Data: options, perps, memes, news, X/CT, paper bot. Push intel only — no marketing",
    discordEnvPrefix: "VINCE_DISCORD",
    standupParticipant: true,
    canAsk: ["Eliza", "Solus", "Kelly", "Sentinel", "Otaku"],
  },
  {
    name: "Solus",
    role: "CFO",
    lane: "Capital and risk: size/skip/watch, invalidation, rebalance. Execution architect for $100K stack",
    discordEnvPrefix: "SOLUS_DISCORD",
    standupParticipant: true,
    canAsk: ["Vince", "Eliza", "Kelly", "Sentinel", "Otaku"],
  },
  {
    name: "Otaku",
    role: "COO",
    lane: "DeFi ops: token discovery, Morpho, yield, CDP. ONLY agent with funded wallet. Mints NFTs",
    discordEnvPrefix: "OTAKU_DISCORD",
    standupParticipant: true,
    canAsk: ["Vince", "Solus", "Eliza", "Kelly", "Sentinel"],
  },
  {
    name: "Kelly",
    role: "CVO",
    lane: "Touch grass: travel, dining, wine, health, fitness. Standup coordinator. No trading",
    discordEnvPrefix: "KELLY_DISCORD",
    standupParticipant: true,
    canAsk: ["Vince", "Solus", "Eliza", "Sentinel", "Otaku"], // Kelly coordinates, can ask anyone
  },
  {
    name: "Sentinel",
    role: "CTO",
    lane: "Systems, cost, code: PRDs, project radar, ONNX, OpenClaw, task briefs. Core dev",
    discordEnvPrefix: "SENTINEL_DISCORD",
    standupParticipant: true,
    canAsk: ["Vince", "Solus", "Eliza", "Kelly", "Otaku"],
  },
  {
    name: "Clawterm",
    role: "AI Terminal",
    lane: "AI futures, OpenClaw, research agents. X + web search for AI insights. HIP-3 AI assets. Gateway status, setup. For crypto prices/positions—Vince.",
    discordEnvPrefix: "CLAWTERM_DISCORD",
    standupParticipant: false,
    canAsk: ["Vince", "Sentinel", "Eliza"],
  },
];

// North Star Deliverable Types
export interface DeliverableType {
  type: string;
  owner: string;
  outputDir: string;
  description: string;
  format: string;
}

export const DELIVERABLE_TYPES: DeliverableType[] = [
  {
    type: "essay",
    owner: "Eliza, Solus",
    outputDir: "docs/standup/essays/",
    description: "Long-form Substack essays — benefit-led, one clear idea, no AI slop",
    format: "Markdown, YYYY-MM-DD-essay-<slug>.md",
  },
  {
    type: "tweets",
    owner: "Eliza, Solus",
    outputDir: "docs/standup/tweets/",
    description: "Banger tweet suggestions with viral potential",
    format: "Numbered list, YYYY-MM-DD-tweets-<topic>.md",
  },
  {
    type: "x_article",
    owner: "Eliza, Solus",
    outputDir: "docs/standup/x-articles/",
    description: "Long-form X article — story, narrative, shareable",
    format: "Markdown, YYYY-MM-DD-x-article-<slug>.md",
  },
  {
    type: "trades",
    owner: "VINCE",
    outputDir: "docs/standup/trades/",
    description: "Suggested perps (Hyperliquid) and options (HypeSurface) for BTC/SOL/ETH/HYPE",
    format: "Structured bullets/table, YYYY-MM-DD-trades-<source>.md",
  },
  {
    type: "good_life",
    owner: "Kelly",
    outputDir: "docs/standup/good-life/",
    description: "Founder good-life suggestions: travel, dining, wine, health, fitness",
    format: "Markdown list, YYYY-MM-DD-good-life-<theme>.md",
  },
  {
    type: "prd",
    owner: "Sentinel",
    outputDir: "docs/standup/prds/",
    description: "PRD for Cursor — goal, acceptance criteria, architecture rules",
    format: "Full PRD markdown, YYYY-MM-DD-prd-<slug>.md",
  },
  {
    type: "integration_instructions",
    owner: "Sentinel",
    outputDir: "docs/standup/integration-instructions/",
    description: "Milaidy/OpenClaw setup and integration instructions",
    format: "Step-by-step markdown, YYYY-MM-DD-integration-<system>.md",
  },
  {
    type: "eliza_task",
    owner: "Sentinel",
    outputDir: "docs/standup/eliza-tasks/",
    description: "Knowledge gap task for Eliza — what to add/update where",
    format: "Task spec markdown, YYYY-MM-DD-eliza-task-<slug>.md",
  },
];

// Multi-Agent Architecture Concepts
export interface ArchitectureConcept {
  name: string;
  description: string;
  implementation: string;
  keyPoints: string[];
}

export const ARCHITECTURE_CONCEPTS: ArchitectureConcept[] = [
  {
    name: "ASK_AGENT",
    description: "One agent asks another a question and reports the answer in the same thread",
    implementation: "plugin-inter-agent → elizaOS.handleMessage(agentId, msg)",
    keyPoints: [
      "In-process when runtime.elizaOS available (standard elizaos start)",
      "Fallback to Job API when elizaOS not attached",
      "Synchronous: requester waits up to ~90s",
      "A2A policy via settings.interAgent.allowedTargets",
    ],
  },
  {
    name: "Option C Discord",
    description: "Each agent has its own Discord Application ID — separate bot identities",
    implementation: "VINCE_DISCORD_APPLICATION_ID, KELLY_DISCORD_APPLICATION_ID, etc.",
    keyPoints: [
      "Users see separate bots (Vince, Kelly, Sentinel) with distinct presence",
      "NOT multiplexing one bot by session",
      "Validation: no duplicate app IDs allowed",
      "Create separate apps at Discord Developer Portal",
    ],
  },
  {
    name: "Standups",
    description: "Kelly-coordinated 2×/day autonomous meetings — agents discuss without you",
    implementation: "plugin-inter-agent/standup/ → STANDUP_ENABLED=true",
    keyPoints: [
      "Coordinator: Kelly (CHRO / Chief Vibes Officer)",
      "Schedule: 2×/day (every 12h) or STANDUP_UTC_HOURS",
      "Produces: action items, lessons learned, relationship opinions",
      "Summary pushed to #daily-standup channel",
      "Build items → Milaidy Gateway or in-VINCE code gen",
    ],
  },
  {
    name: "Feedback Flow",
    description: "User feedback from testing → Sentinel triages → PRD or Eliza task",
    implementation: "PLANNED: FEEDBACK trigger → ASK_AGENT Sentinel → triage → deliverable",
    keyPoints: [
      "Code/behavior fix → PRD for Cursor",
      "Knowledge gap → Eliza task (what to add/update)",
      "Tested agent relays Sentinel's response",
      "Deliverables in docs/standup/prds/ or eliza-tasks/",
    ],
  },
  {
    name: "Dev Worker Strategy",
    description: "Use OpenClaw or Milaidy as autonomous dev worker to implement PRDs",
    implementation: "POST to Milaidy Gateway or OpenClaw session with repo access",
    keyPoints: [
      "Milaidy preferred (same ElizaOS stack, existing Gateway hook)",
      "OpenClaw viable alternative (session tools, reply-back)",
      "Reduces handoffs: PRD → agent implements → human reviews PR",
      "Safety: open PR, human merges (not push to main)",
    ],
  },
];

// The North Star Feeling
export const NORTH_STAR_FEELING = `A Discord where your agents have names and profile images, talk to you and to each other, and run heartbeat-style check-ins that sometimes spark small conversations between them. When you're all collaborating, it can feel genuinely *alive* — like you're building together. You have to remind yourself it's you and a bunch of AIs. That feeling is what we're optimizing for.`;

/**
 * Get all agent roles
 */
export function getAgentRoles(): AgentRole[] {
  return AGENT_ROLES;
}

/**
 * Get agent by name
 */
export function getAgentRole(name: string): AgentRole | undefined {
  return AGENT_ROLES.find(a => a.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get all deliverable types
 */
export function getDeliverableTypes(): DeliverableType[] {
  return DELIVERABLE_TYPES;
}

/**
 * Get deliverable type by name
 */
export function getDeliverableType(type: string): DeliverableType | undefined {
  return DELIVERABLE_TYPES.find(d => d.type === type);
}

/**
 * Get architecture concepts
 */
export function getArchitectureConcepts(): ArchitectureConcept[] {
  return ARCHITECTURE_CONCEPTS;
}

/**
 * Get the north star feeling
 */
export function getNorthStarFeeling(): string {
  return NORTH_STAR_FEELING;
}

/**
 * Generate multi-agent architecture overview
 */
export function getArchitectureOverview(): string {
  return `# Multi-Agent Architecture Overview

## North Star
${NORTH_STAR_FEELING}

## The Dream Team (One Team, One Dream)

| Agent | Role | Lane |
|-------|------|------|
${AGENT_ROLES.map(a => `| **${a.name}** | ${a.role} | ${a.lane} |`).join("\n")}

## Key Architecture Concepts

${ARCHITECTURE_CONCEPTS.map(c => `### ${c.name}
${c.description}

**Implementation:** ${c.implementation}

**Key Points:**
${c.keyPoints.map(p => `• ${p}`).join("\n")}
`).join("\n")}

## North Star Deliverables

| Type | Owner | Output |
|------|-------|--------|
${DELIVERABLE_TYPES.map(d => `| ${d.type} | ${d.owner} | ${d.outputDir} |`).join("\n")}

---
*One team, one dream. That feeling is what we're optimizing for.*
`;
}

/**
 * Check for multi-agent architecture issues
 */
export function checkArchitectureHealth(): string[] {
  const issues: string[] = [];
  
  // Check for common misconfigurations
  if (!process.env.STANDUP_ENABLED) {
    issues.push("STANDUP_ENABLED not set — autonomous standups disabled");
  }
  
  // Check for duplicate Discord app IDs (would need actual env values)
  const discordAppIds = new Set<string>();
  for (const agent of AGENT_ROLES) {
    const appId = process.env[`${agent.discordEnvPrefix}_APPLICATION_ID`];
    if (appId) {
      if (discordAppIds.has(appId)) {
        issues.push(`Duplicate Discord Application ID for ${agent.name} — each agent needs its own`);
      }
      discordAppIds.add(appId);
    }
  }
  
  // Check for Milaidy Gateway
  if (!process.env.MILAIDY_GATEWAY_URL) {
    issues.push("MILAIDY_GATEWAY_URL not set — standup build items will use fallback in-VINCE code gen");
  }
  
  return issues;
}

/**
 * Get suggestions for improving multi-agent setup
 */
export function getMultiAgentSuggestions(context: string): string[] {
  const suggestions: string[] = [];
  const lower = context.toLowerCase();
  
  if (lower.includes("discord") || lower.includes("channel")) {
    suggestions.push("Ensure Option C: each agent has its own Discord Application ID for distinct bot identities");
    suggestions.push("Create #daily-standup channel and invite coordinator bot (Kelly) for standup summaries");
  }
  
  if (lower.includes("standup") || lower.includes("meeting")) {
    suggestions.push("Enable STANDUP_ENABLED=true for Kelly-coordinated 2×/day autonomous standups");
    suggestions.push("Configure STANDUP_UTC_HOURS for exact standup times (e.g. 8,20)");
  }
  
  if (lower.includes("feedback") || lower.includes("testing")) {
    suggestions.push("Implement feedback flow: tested agent → ASK_AGENT Sentinel → triage → PRD or Eliza task");
  }
  
  if (lower.includes("dev worker") || lower.includes("implement") || lower.includes("prd")) {
    suggestions.push("Consider Milaidy as dev worker: extend standup-action contract for PRD implementation");
    suggestions.push("Set MILAIDY_GATEWAY_URL for standup build items to be processed automatically");
  }
  
  if (lower.includes("a2a") || lower.includes("ask agent") || lower.includes("inter-agent")) {
    suggestions.push("Configure settings.interAgent.allowedTargets per character for A2A policy");
    suggestions.push("Use optional allow rules for fine-grained control: { source: 'Kelly', target: '*' }");
  }
  
  if (suggestions.length === 0) {
    suggestions.push("Review MULTI_AGENT.md for the full multi-agent architecture vision");
    suggestions.push("North star: 'Feels genuinely alive — like you're building together'");
  }
  
  return suggestions;
}

/**
 * Get agent-specific A2A policy template
 */
export function getA2APolicyTemplate(agentName: string): string {
  const agent = getAgentRole(agentName);
  if (!agent) {
    return `// Agent "${agentName}" not found in dream team`;
  }
  
  return `// A2A Policy for ${agent.name} (${agent.role})
settings: {
  interAgent: {
    allowedTargets: ${JSON.stringify(agent.canAsk)},
    // Optional fine-grained rules:
    // allow: [
    //   { source: "${agent.name}", target: "*" }, // ${agent.name} can ask anyone
    //   { source: "Kelly", target: "${agent.name}" }, // Kelly can ask ${agent.name}
    // ],
  },
}`;
}

/**
 * Get standup configuration template
 */
export function getStandupConfigTemplate(): string {
  return `# Standup Configuration

## Environment Variables
\`\`\`bash
# Enable standups
STANDUP_ENABLED=true

# Coordinator (default: Kelly)
STANDUP_COORDINATOR_AGENT=Kelly

# Schedule: specific UTC hours (e.g. 8am and 8pm)
STANDUP_UTC_HOURS=8,20
# OR interval in ms (default: 12 hours)
# STANDUP_INTERVAL_MS=43200000

# Deliverables directory
STANDUP_DELIVERABLES_DIR=./docs/standup

# Milaidy Gateway for build items
MILAIDY_GATEWAY_URL=http://localhost:18789

# Fallback to in-VINCE code gen if Milaidy unavailable
STANDUP_BUILD_FALLBACK_TO_VINCE=true
\`\`\`

## Discord Setup
1. Create #daily-standup channel
2. Invite coordinator bot (Kelly)
3. Invite all agent bots for visibility

## What Standups Produce
- Action items (remind or build)
- Lessons learned (stored per agent)
- Relationship opinions (updated on disagreements)
- Summary pushed to #daily-standup
`;
}

export default {
  getAgentRoles,
  getAgentRole,
  getDeliverableTypes,
  getDeliverableType,
  getArchitectureConcepts,
  getNorthStarFeeling,
  getArchitectureOverview,
  checkArchitectureHealth,
  getMultiAgentSuggestions,
  getA2APolicyTemplate,
  getStandupConfigTemplate,
};
