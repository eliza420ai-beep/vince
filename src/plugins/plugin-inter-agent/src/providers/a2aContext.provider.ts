/**
 * A2A Context Provider
 *
 * Injects context about agent-to-agent conversations into the agent's state.
 * This influences the LLM's shouldRespond decision by making it aware of:
 * - Whether the message is from another known agent
 * - How many exchanges have already happened
 * - Whether responding would create a loop
 * - Whether a HUMAN is present (highest priority!)
 *
 * Works WITH the A2A_LOOP_GUARD evaluator for defense in depth.
 */

import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
  logger,
} from "@elizaos/core";
import { isHumanMessage, buildStandupContext, getAgentRole, AGENT_ROLES, type AgentName } from "../standup/standupReports";
import {
  isStandupActive,
  startStandupSession,
  markAgentReported,
  hasAgentReported,
  getNextUnreportedAgent,
  haveAllAgentsReported,
  markWrappingUp,
  isWrappingUp,
  endStandupSession,
  isKellyMessage,
  touchActivity,
  getSessionStats,
} from "../standup/standupState";
import { getStandupResponseDelay, getEssentialStandupQuestion, SHARED_INSIGHTS_SENTINEL, isStandupKickoffRequest, getStandupDiscordMentionId } from "../standup/standup.constants";
import {
  getProgressionMessage,
  checkStandupHealth,
  getAgentDisplayName,
} from "../standup/standupOrchestrator";
import { fetchAgentData } from "../standup/standupDataFetcher";
import { ALOHA_STYLE_BLOCK } from "../standup/standupStyle";
import { loadSharedDailyInsights } from "../standup/dayReportPersistence";

/** Known agent names for A2A detection */
const KNOWN_AGENTS = ["vince", "eliza", "kelly", "solus", "otaku", "sentinel", "echo", "oracle", "clawterm", "naval"];

/** Human names/usernames to recognize (Discord username, co-founders). Env: A2A_KNOWN_HUMANS (comma-separated). Default: livethelifetv,ikigai. */
function getKnownHumans(): string[] {
  const raw = process.env.A2A_KNOWN_HUMANS?.trim();
  if (raw) {
    return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  }
  return ["livethelifetv", "ikigai"];
}

/** 
 * Standup turn order — agents respond ONE AT A TIME in this sequence.
 * Kelly calls each agent by name, others WAIT until called.
 */
const STANDUP_TURN_ORDER = [
  "vince",    // Market data first (best data)
  "eliza",    // Research patterns
  "echo",     // CT sentiment
  "oracle",   // Prediction markets
  "solus",    // Risk/sizing
  "otaku",    // Execution status
  "sentinel", // System health
  "clawterm", // OpenClaw & AI/AGI
  // Kelly wraps up
];

/** Get next agent in standup order */
function getNextAgentInOrder(currentAgent: string): string | null {
  const idx = STANDUP_TURN_ORDER.indexOf(currentAgent.toLowerCase());
  if (idx === -1 || idx === STANDUP_TURN_ORDER.length - 1) {
    return null;
  }
  return STANDUP_TURN_ORDER[idx + 1];
}

/** Check if agent is the last in standup */
function isLastStandupAgent(agentName: string): boolean {
  return agentName.toLowerCase() === STANDUP_TURN_ORDER[STANDUP_TURN_ORDER.length - 1];
}

/** Check if message looks like a standup report */
function looksLikeReport(text: string): boolean {
  const lower = text.toLowerCase();
  const indicators = ["##", "|", "signal", "bull", "bear", "action", "btc", "sol", "funding", "divergence", "report", "standup"];
  return indicators.filter((i) => lower.includes(i)).length >= 2;
}

/**
 * Check if this agent is being directly called/mentioned in the message.
 * Returns true if "@AgentName" or "AgentName," or "AgentName:" appears.
 */
function isDirectlyAddressed(agentName: string, messageText: string): boolean {
  const lower = messageText.toLowerCase();
  const nameLower = agentName.toLowerCase();
  
  // Check for @mention
  if (lower.includes(`@${nameLower}`)) return true;
  
  // Check for "AgentName," or "AgentName:" at word boundary
  const patterns = [
    new RegExp(`\\b${nameLower},`, "i"),
    new RegExp(`\\b${nameLower}:`, "i"),
    new RegExp(`\\b${nameLower} you're up`, "i"),
    new RegExp(`\\b${nameLower}—`, "i"),
    new RegExp(`^${nameLower}\\b`, "i"), // Starts with name
  ];
  
  return patterns.some((p) => p.test(messageText));
}

/** Check if message is from a known human */
function isFromKnownHuman(memory: Memory, resolvedName?: string): { isHuman: boolean; humanName: string | null } {
  const senderName = resolvedName || String(
    memory.content?.name ?? memory.content?.userName ?? (memory.content as any)?._resolvedSenderName ?? ""
  ).toLowerCase();

  const knownHumans = getKnownHumans();
  for (const human of knownHumans) {
    if (senderName.includes(human)) {
      return { isHuman: true, humanName: human.charAt(0).toUpperCase() + human.slice(1) };
    }
  }

  // Not a known agent = probably human
  if (isHumanMessage(memory)) {
    return { isHuman: true, humanName: senderName || "Human" };
  }

  return { isHuman: false, humanName: null };
}

/** Check if a message is from a known agent. Always returns canonical lowercase name when possible. */
function isFromKnownAgent(memory: Memory, resolvedName?: string): { isAgent: boolean; agentName: string | null } {
  const senderName = resolvedName || String(
    memory.content?.name ?? memory.content?.userName ?? (memory.content as any)?._resolvedSenderName ?? ""
  ).toLowerCase();

  logger.debug(`[A2A_DETECT] senderName="${senderName}", agentId=${memory.agentId ?? "none"}, isBot=${(memory.content?.metadata as Record<string, unknown> | undefined)?.isBot ?? "unset"}`);

  // Check 0: known humans are never agents — so kickoff/priority block can run (standup channel)
  const knownHumans = getKnownHumans();
  const isKnownHumanName = senderName && knownHumans.some((h) => senderName === h || senderName.includes(h));
  console.log(`[A2A_DETECT] senderName="${senderName}", knownHumans=${JSON.stringify(knownHumans)}, match=${isKnownHumanName}, agentId=${memory.agentId ?? "none"}`);
  if (isKnownHumanName) {
    return { isAgent: false, agentName: null };
  }

  // Check 1: substring match against known agents — return canonical name
  for (const agent of KNOWN_AGENTS) {
    if (senderName.includes(agent)) {
      return { isAgent: true, agentName: agent };
    }
  }

  // Check 2: bot flag — try to resolve to a canonical agent name first
  const metadata = memory.content?.metadata as Record<string, unknown> | undefined;
  if (metadata?.isBot === true || metadata?.fromBot === true) {
    for (const agent of KNOWN_AGENTS) {
      if (senderName.includes(agent)) {
        return { isAgent: true, agentName: agent };
      }
    }
    return { isAgent: true, agentName: senderName || "unknown-bot" };
  }

  // Check 3: agentId set — ElizaOS sets this on memories from agent runtimes
  if (memory.agentId) {
    // Try to resolve canonical name from senderName
    for (const agent of KNOWN_AGENTS) {
      if (senderName.includes(agent)) {
        return { isAgent: true, agentName: agent };
      }
    }
    logger.debug(`[A2A_DETECT] agentId present but name unresolved — treating as agent (senderName="${senderName}")`);
    return { isAgent: true, agentName: senderName || "unknown-agent" };
  }

  return { isAgent: false, agentName: null };
}

/** Standup channel name substrings (from A2A_STANDUP_CHANNEL_NAMES or default) */
function getStandupChannelParts(): string[] {
  const raw = process.env.A2A_STANDUP_CHANNEL_NAMES ?? "standup,daily-standup";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Check if room is a standup channel by name */
function isStandupRoom(roomName: string | undefined): boolean {
  if (!roomName) return false;
  const normalized = roomName.toLowerCase();
  return getStandupChannelParts().some((part) => normalized.includes(part));
}

/** Knowledge channel name substrings (from A2A_KNOWLEDGE_CHANNEL_NAMES or default) — UPLOAD / knowledge expansion always allowed */
function getKnowledgeChannelParts(): string[] {
  const raw = process.env.A2A_KNOWLEDGE_CHANNEL_NAMES ?? "knowledge";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Check if room is a knowledge channel (no A2A exchange limit — UPLOAD always allowed) */
function isKnowledgeRoom(roomName: string | undefined): boolean {
  if (!roomName) return false;
  const normalized = roomName.toLowerCase();
  return getKnowledgeChannelParts().some((part) => normalized.includes(part));
}

/** Agent name allowed to respond to human messages in standup (single responder) */
function getStandupSingleResponder(): string {
  return (
    process.env.A2A_STANDUP_SINGLE_RESPONDER?.trim() ||
    process.env.STANDUP_COORDINATOR_AGENT?.trim() ||
    "Kelly"
  ).trim();
}

/** Count recent exchanges with a specific sender */
async function countRecentExchanges(
  runtime: IAgentRuntime,
  roomId: string,
  senderName: string,
  lookback: number
): Promise<number> {
  try {
    const memories = await runtime.getMemories({
      roomId: roomId as `${string}-${string}-${string}-${string}-${string}`,
      count: lookback,
      tableName: "messages",
    });

    const myName = String(runtime.character?.name ?? "").toLowerCase();
    let myResponses = 0;

    // Count how many times I've responded in this conversation
    // Each response to the other agent counts as an exchange
    for (const mem of memories) {
      const memSender = String(mem.content?.name ?? mem.content?.userName ?? "").toLowerCase();
      const isMe = memSender.includes(myName) || mem.agentId === runtime.agentId;

      if (isMe) {
        myResponses++;
      }
    }

    return myResponses;
  } catch (err) {
    logger.warn({ err }, "[A2A_CONTEXT] Failed to count exchanges");
    return 0;
  }
}

export const a2aContextProvider: Provider = {
  name: "A2A_CONTEXT",
  description: "Provides context about agent-to-agent and agent-to-human conversations in standups",

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State
  ) => {
    const myName = runtime.character?.name || "Agent";
    const myNameLower = myName.toLowerCase();
    const messageText = message.content?.text || "";
    // Resolve sender name: content.name/userName are often empty for Discord messages.
    // Fall back to looking up the entity by entityId to get the real name.
    let resolvedSenderName = String(message.content?.name ?? message.content?.userName ?? "").toLowerCase();
    if (!resolvedSenderName && message.entityId) {
      try {
        const senderEntity = await runtime.getEntityById(message.entityId);
        if (senderEntity?.names?.length) {
          resolvedSenderName = senderEntity.names[0].toLowerCase();
        }
      } catch { /* non-fatal */ }
    }
    // Inject resolved name into message so isFromKnownAgent/isFromKnownHuman can use it
    if (resolvedSenderName && !message.content?.name) {
      if (!message.content) (message as any).content = {};
      (message.content as any)._resolvedSenderName = resolvedSenderName;
    }
    
    // Check room type
    const room = await runtime.getRoom(message.roomId);
    const roomName = room?.name ?? "";
    const inStandupChannel = isStandupRoom(roomName);
    
    // Check agent FIRST so bot messages don't get swallowed by isFromKnownHuman
    const { isAgent, agentName } = isFromKnownAgent(message, resolvedSenderName);

    // Check if this is from a HUMAN (only when not already identified as an agent)
    if (!isAgent) {
      const { isHuman, humanName } = isFromKnownHuman(message, resolvedSenderName);
      if (isHuman) {
        // In standup channels only the facilitator responds to humans (rate limit)
        if (inStandupChannel) {
          const singleResponder = getStandupSingleResponder();
          const amFacilitator =
            myNameLower === singleResponder.toLowerCase();
          if (!amFacilitator) {
            logger.info(
              `[A2A_CONTEXT] ${myName}: Human in standup channel — single responder is ${singleResponder}, IGNORE`
            );
            return { text: `[SYSTEM OVERRIDE] ${humanName ?? "HUMAN"} is speaking in the standup channel. Only the standup facilitator (${singleResponder}) responds to human messages here. Action: IGNORE. Do not reply.` };
          }
          if (amFacilitator && isStandupKickoffRequest(messageText)) {
            logger.info(`[A2A_CONTEXT] ${myName}: Human asked to start standup — force STANDUP_FACILITATE`);
            return { text: `[STANDUP KICKOFF] The human asked to start the standup. You MUST use action **STANDUP_FACILITATE** and NO other action. Do NOT output conversational text — the action will post the kickoff. Do NOT use REPLY. Output only: <actions>STANDUP_FACILITATE</actions> with minimal or no <text>.` };
          }
        }
        logger.info(`[A2A_CONTEXT] ⭐ ${myName}: Message from HUMAN (${humanName}) — priority response`);
        const role = getAgentRole(myName);
        return { text: `
## ⭐ HUMAN MESSAGE — PRIORITY RESPONSE

**${humanName}** (Co-Founder) is speaking to you directly.

### Your Response Rules:
1. RESPOND IMMEDIATELY — human messages override all loop limits
2. Be helpful and concise
3. If they ask a question, answer it directly
4. If they give feedback, acknowledge and adapt
5. If they make a decision, confirm and note it

You are ${myName}${role ? ` (${role.title} - ${role.focus})` : ""}.
Address ${humanName} directly. Be useful.
` };
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // STANDUP TURN-BASED LOGIC: Only respond when directly called
    // ═══════════════════════════════════════════════════════════════════════
    if (inStandupChannel && isAgent) {
      const amDirectlyCalled = isDirectlyAddressed(myName, messageText);
      const amFacilitator = myNameLower === getStandupSingleResponder().toLowerCase();
      
      // Kelly (facilitator) can always respond to manage the standup
      if (amFacilitator) {
        // PREVENT SELF-LOOP: If this message is from Kelly, don't respond to yourself
        if (isKellyMessage(agentName || "")) {
          logger.info(`[A2A_CONTEXT] Kelly: Ignoring own message to prevent self-loop`);
          return { text: `[SYSTEM OVERRIDE] This is your own message. Do NOT respond to yourself. Wait for an agent to report.` };
        }
        
        // Update activity timestamp
        touchActivity();
        
        // Check if an agent just reported — auto-progress to next
        const agentNameLower = agentName?.toLowerCase() ?? "";
        const reportingAgent = STANDUP_TURN_ORDER.find((a) =>
          a === agentNameLower || agentNameLower.includes(a)
        );
        const isReport =
          looksLikeReport(messageText) || (!!reportingAgent && messageText.trim().length >= 15);

        if (reportingAgent && isReport) {
          // Check if already reported (prevent duplicates)
          if (hasAgentReported(reportingAgent)) {
            logger.info(`[A2A_CONTEXT] Kelly: ${reportingAgent} already reported — ignoring duplicate`);
            return { text: `[SYSTEM OVERRIDE] ${reportingAgent.toUpperCase()} already reported. Do NOT call them again. Wait for the current agent or proceed.` };
          }
          
          // Mark as reported
          markAgentReported(reportingAgent);
          
          // Check if all done
          if (haveAllAgentsReported()) {
            markWrappingUp();
            logger.info(`[A2A_CONTEXT] Kelly: All agents reported — triggering wrap-up`);
            return { text: `
## AUTO-WRAP: Generate Day Report

All ${STANDUP_TURN_ORDER.length} agents have reported. Time to synthesize.

**YOUR ONLY JOB RIGHT NOW:** Generate the Day Report.

Say: "Synthesizing..." then generate a CONCISE Day Report.
- TL;DR = ONE sentence
- Max 3 actions with @owners
- Under 200 words total
` };
          }
          
          // Use orchestrator for actual delay + next agent
          const progression = await getProgressionMessage();
          
          if (progression.action === "call_next" && progression.nextAgent) {
            logger.info(`[A2A_CONTEXT] Kelly: ${reportingAgent} reported — progression: ${progression.message}`);
            
            return { text: `
## AUTO-PROGRESS: Call Next Agent

${reportingAgent.toUpperCase()} just reported. 

**YOUR ONLY RESPONSE:** "${progression.message}"

Copy that EXACTLY. Nothing else. Do NOT add commentary, lifestyle tips, summaries, or "recharge" talk. Just call the next agent.
` };
          }
          
          if (progression.action === "skip" && progression.nextAgent) {
            logger.warn(`[A2A_CONTEXT] Kelly: Skipping stuck agent`);
            
            return { text: `
## SKIP: Agent Timed Out

**YOUR ONLY RESPONSE:** "${progression.message}"

Copy that EXACTLY. The timed-out agent will not report today.
` };
          }
        }

        // Fallback: agent message but couldn't resolve reportingAgent
        // Still force progression to next unreported agent so standup doesn't stall
        if (!reportingAgent && messageText.trim().length >= 15) {
          // Mark the first unreported agent as reported so we make progress
          const currentUnreported = getNextUnreportedAgent();
          if (currentUnreported) {
            markAgentReported(currentUnreported);
            logger.warn(`[A2A_CONTEXT] Kelly: Could not resolve reporting agent from "${agentName}" — marked ${currentUnreported} as reported`);
          }
          const nextAgent = getNextUnreportedAgent();
          if (nextAgent) {
            const displayName = getAgentDisplayName(nextAgent);
            const discordId = getStandupDiscordMentionId(nextAgent);
            const callText = discordId ? `<@${discordId}> go.` : `@${displayName}, go.`;
            logger.warn(`[A2A_CONTEXT] Kelly: Forcing progression to ${displayName}`);
            return { text: `
## AUTO-PROGRESS: Call Next Agent

An agent just reported.

**YOUR ONLY RESPONSE:** "${callText}"

Copy that EXACTLY. Nothing else. Do not summarize, do not comment, do not add lifestyle tips.
` };
          } else if (currentUnreported) {
            // That was the last agent — wrap up
            markWrappingUp();
            logger.info(`[A2A_CONTEXT] Kelly: All agents reported (via fallback) — triggering wrap-up`);
            return { text: `
## AUTO-WRAP: Generate Day Report

All ${STANDUP_TURN_ORDER.length} agents have reported. Time to synthesize.

**YOUR ONLY JOB RIGHT NOW:** Generate the Day Report. No lifestyle, no travel. Trading standup only.
- TL;DR = ONE sentence
- Max 3 actions with @owners
- Under 200 words total
` };
          }
        }

        // Check if standup is wrapping up
        if (isWrappingUp()) {
          return { text: `[SYSTEM OVERRIDE] Standup is already wrapping up. Do not interrupt. Wait for the Day Report to complete.` };
        }
        
        logger.info(`[A2A_CONTEXT] ${myName}: Facilitator in standup — may respond`);
        return { text: `
## Standup Facilitator Mode

You are Kelly, facilitating the **trading standup**. You are coordinator only. Keep every message very short. No commentary, no summaries between agents.

**Turn order:** VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel → Clawterm → Wrap-up

**Rules:**
- Call agents ONE AT A TIME: "@AgentName, go."
- After each report, immediately call the next agent
- After Clawterm, generate the Day Report
- NO long intros, NO summaries between agents
- NEVER respond to your own messages
- Never restate or summarize another agent's report. Your only replies are: call the next agent (e.g. "@Eliza, go.") or wrap up. One short line.
- NO lifestyle, travel, dining, wine, wellness, hotels, or "recharge" talk. This is a TRADING standup.
- Do not echo numbers, execution, or weekend plans already stated.

**Transitions are 3 words max:** "@Eliza, go."
` };
      }
      
      // Not the facilitator: only respond if directly called
      if (!amDirectlyCalled) {
        logger.info(
          `[A2A_CONTEXT] 🚫 ${myName}: In standup but NOT called — waiting for turn`
        );
        return { text: `[SYSTEM OVERRIDE] This is a turn-based standup. You were NOT called by name. 
Wait for Kelly to call "@${myName}" before responding. 
Action: IGNORE. Do not reply until it's your turn.` };
      }
      
      // I was directly called — it's my turn!
      logger.info(`[A2A_CONTEXT] ✅ ${myName}: Called in standup — responding`);
      const role = getAgentRole(myName);
      const msgText = typeof message.content?.text === "string" ? message.content.text : "";
      let hasSharedInsights = msgText.includes(SHARED_INSIGHTS_SENTINEL);
      let sharedInsightsContent = hasSharedInsights ? msgText : "";

      // If sentinel not in current message, check recent room messages (manual Discord flow)
      if (!hasSharedInsights && inStandupChannel) {
        try {
          const recentMemories = await runtime.getMemories({
            roomId: message.roomId,
            tableName: "messages",
            count: 15,
          });
          const sentinelMsg = recentMemories.find((m) =>
            String(m.content?.text || "").includes(SHARED_INSIGHTS_SENTINEL)
          );
          if (sentinelMsg) {
            hasSharedInsights = true;
            sharedInsightsContent = String(sentinelMsg.content?.text || "");
          }
        } catch (err) {
          logger.warn({ err }, "[A2A_CONTEXT] Failed to check recent messages for sentinel");
        }
      }

      // Fallback: load shared insights from file if sentinel found but content is empty
      if (hasSharedInsights && !sharedInsightsContent.trim()) {
        try {
          const fromFile = await loadSharedDailyInsights();
          if (fromFile) sharedInsightsContent = fromFile;
        } catch { /* non-fatal */ }
      }

      // Build shared context block that will be prepended to synthesis prompts
      const sharedContext = sharedInsightsContent.trim()
        ? `\n\n**SHARED DAILY INSIGHTS (read before responding):**\n${sharedInsightsContent.slice(0, 4000)}\n\n`
        : "";
      
      // Check if this agent is under construction
      const roleKey = Object.keys(AGENT_ROLES).find(
        (k) => k.toLowerCase() === myNameLower
      ) as AgentName | undefined;
      const isUnderConstruction = roleKey ? (AGENT_ROLES[roleKey] as { isUnderConstruction?: boolean }).isUnderConstruction : false;
      
      // Under construction agents give minimal status update
      if (isUnderConstruction) {
        logger.info(`[A2A_CONTEXT] ${myName}: Under construction — minimal response`);

        // Fetch the status message for other under-construction agents
        let statusData = "";
        try {
          const data = await fetchAgentData(runtime, myName);
          if (data) {
            statusData = data;
          }
        } catch (err) {
          logger.warn({ err }, `[A2A_CONTEXT] Failed to fetch data for ${myName}`);
        }
        
        if (hasSharedInsights) {
          return { text: `${sharedContext}
## 🚧 YOUR TURN — Synthesis (Under Construction)

Shared daily insights are above. You are **under construction**. Add one link to another agent's insight if relevant; otherwise one short status. Natural prose, MAX 30 words. No lifestyle, travel, or wellness content.
**You are:** ${myName}${role ? ` (${role.title})` : ""}
**Context:** ${statusData || `🚧 ${role?.focus || myName} under construction.`}
` };
        }
        return { text: `
## 🚧 YOUR TURN — Status Update (Under Construction)

Kelly called on you. You are **under construction** — give a brief status in natural prose (no bullet dumps).

**You are:** ${myName}${role ? ` (${role.title})` : ""}

**Context:** ${statusData || `🚧 ${role?.focus || myName} under construction. No action items.`}

**RULES:** MAX 30 words. One short sentence or two. Acknowledge you're under construction. No fake data, no promises. Do not say "happy to help" or offer to do things you can't do. Write like a human, not a template.
` };
      }
      
      // Eliza: mostly listening; report = knowledge gaps, essay ideas, research for knowledge/
      if (myNameLower === "eliza") {
        if (hasSharedInsights) {
          return { text: `${sharedContext}
## 🎯 YOUR TURN — Trading Standup Synthesis (Eliza)

Shared daily insights are above. Do NOT repeat your section. Do NOT echo lifestyle, travel, dining, or wellness content.

Your job: (1) One **knowledge gap** the team should research for better trades. (2) One **content idea** (essay or thread) inspired by today's market data. (3) One **cross-agent link** between what you see and another agent's data. ~80 words, natural prose. No fluff.
**You are:** ${myName}${role ? ` (${role.title})` : ""}
` };
        }
        return { text: `
## 🎯 YOUR TURN — Standup Report (Eliza: Listening Mode)

Kelly called on you. You were mostly listening. Write a short day report in natural prose: what you heard and what it inspires (knowledge gaps, one essay idea for Ikigai Studio Substack, research to add to knowledge/). No bullet lists — flowing sentences.

**You are:** ${myName}${role ? ` (${role.title})` : ""}

**RULES:** MAXIMUM 80 words. Natural prose only — no bullet dumps, no AI-slop (leverage, delve, actionable, etc.). You react to what VINCE, ECHO, Oracle, etc. said. No fake data; only gaps/ideas inspired by the standup. No questions back. Do not repeat what another agent already said.
` };
      }
      
      // Solus: essential question + prior reports + Grok-style synthesis (250-300 words)
      if (myNameLower === "solus") {
        let priorReportsSnippet = "";
        try {
          const recentMemories = await runtime.getMemories({
            roomId: message.roomId,
            tableName: "messages",
            count: 20,
          });
          const reportLike = recentMemories.filter(
            (m) => m.content?.text && /## (VINCE|Eliza|ECHO|Oracle)/i.test(String(m.content.text))
          );
          const texts = reportLike.slice(-6).map((m) => String(m.content?.text || "").trim());
          if (texts.length > 0) {
            priorReportsSnippet = `\n\n**Prior reports (this standup):**\n${texts.join("\n\n---\n\n")}`;
          }
        } catch (err) {
          logger.warn({ err }, "[A2A_CONTEXT] Failed to get prior reports for Solus");
        }
        const essentialQ = getEssentialStandupQuestion();
        if (hasSharedInsights) {
          return { text: `${sharedContext}
## 🎯 YOUR TURN — Trading Standup Synthesis (Solus: Options Lead)

Shared daily insights are above. Answer the essential question **using the shared insights**; link to VINCE's funding/price, Oracle's odds, ECHO's sentiment. Do NOT repeat your section. Do NOT echo lifestyle, travel, or wellness content.
${priorReportsSnippet}

**Essential question:** ${essentialQ}

**You are:** ${myName}${role ? ` (${role.title})` : ""} — Hypersurface options settle weekly (Friday 08:00 UTC). We do the wheel; we sit in BTC.

**Your answer must include:** (1) Strike/position call for this week's Hypersurface options — specific strike, direction, why. (2) One cross-agent link (VINCE data + Oracle odds + ECHO sentiment). (3) Clear Yes/No on the essential question and one sentence path. 250-300 words, ALOHA style. No lifestyle.

${ALOHA_STYLE_BLOCK}
` };
        }
        return { text: `
## 🎯 YOUR TURN — Standup Report (Solus: Options Lead)

Kelly called on you. You do most of the thinking. Answer the essential question using data from the team.
${priorReportsSnippet}

**Essential question to answer:** ${essentialQ}

**You are:** ${myName}${role ? ` (${role.title})` : ""} — Hypersurface options settle weekly (Friday 08:00 UTC). We do the wheel; we sit in BTC. Use data + sentiment + news to choose optimal strike for BTC covered calls.

**Your answer must include (in flowing prose, ALOHA-style):** Current data (price, Fear & Greed); X sentiment and Polymarket/options expiry if available; macro/volatility if relevant; on-chain/contrarian if relevant; a clear Yes/No (e.g. "No, I don't think BTC will be above $70K by next Friday"); short-term path and caveats in 1-2 sentences.

**RULES:** 250-300 words. Write like a smart friend over coffee — narrative, no bullet dumps. Use prior reports above; don't make up numbers. End with "My take: [Yes/No], ..." and one sentence path. Do not repeat what another agent already said. Add only your synthesis and take.

${ALOHA_STYLE_BLOCK}
` };
      }
      
      // Fetch real data for this agent
      let liveData = "";
      try {
        const data = await fetchAgentData(runtime, myName);
        if (data) {
          liveData = `\n\n**📊 LIVE DATA (use this):**\n${data}`;
        }
      } catch (err) {
        logger.warn({ err }, `[A2A_CONTEXT] Failed to fetch data for ${myName}`);
      }
      
      const solusOptionsLine =
        myNameLower === "solus"
          ? "\n**You are the options expert:** Lead with strike/position call or Hypersurface-relevant action; keep coordination chat to a minimum.\n"
          : "";
      const vinceLine =
        myNameLower === "vince"
          ? "\n**You have the most accurate data and recent news.** Live data (prices, funding, paper bot W/L and PnL) must drive your report. Report paper trading bot results for perps on Hyperliquid. Use LIVE DATA only.\n**CRITICAL:** This is a NEW standup. Do NOT say 'already complete' or 'already reported.' Report fresh data NOW.\n"
          : "";
      const echoLine =
        myNameLower === "echo"
          ? "\n**Show insights from X (plugin-x-research):** sentiment, key voices, narrative. Use LIVE DATA above.\n"
          : "";
      const sentinelLine =
        myNameLower === "sentinel"
          ? "\n**Report what's next in coding and what has been pushed to the repo.**\n"
          : "";
      const clawtermLine =
        myNameLower === "clawterm"
          ? "\n**Report OpenClaw/AI/AGI: X and web sentiment, gateway status, one clear take.** Use LIVE DATA above.\n"
          : "";

      if (hasSharedInsights) {
        return { text: `${sharedContext}
## 🎯 YOUR TURN — Trading Standup (Synthesis)

**CRITICAL:** This is a NEW standup. Ignore any prior standup results in your memory. Report fresh data NOW. Do not say "already complete" or "already reported." Every standup is independent.

Shared daily insights are above. Do NOT repeat your section. Do NOT echo lifestyle, travel, dining, wine, or wellness content — this is a TRADING standup.

Your job: (1) **One CROSS-AGENT LINK** — connect your data to another agent's (e.g. "VINCE's funding rates + Oracle's odds suggest X"). (2) **One TRADE IDEA or RISK** — perps on Hyperliquid, options on Hypersurface, or spot. Be specific: asset, direction, why. (3) **One ACTIONABLE TAKE** — what should the team do today?

Focus on: market data, perps (Hyperliquid), options (Hypersurface), HIP-3, funding rates, sentiment, project updates. No fluff, no lifestyle.
${vinceLine}
${echoLine}
${solusOptionsLine}
${sentinelLine}
${clawtermLine}
**You are:** ${myName}${role ? ` (${role.title})` : ""}
${liveData}

Keep it ~100–150 words. ALOHA style, no bullets.
` };
      }

      return { text: `
## 🎯 YOUR TURN — Standup Day Report (ALOHA style)

**CRITICAL:** This is a NEW standup. Ignore any prior standup results in your memory. Report fresh data NOW. Do not say "already complete" or "already reported." Every standup is independent.

Kelly called on you. Write your standup report as a **short day report in ALOHA style**: one flowing narrative, no mandatory tables or bullet lists. Use the LIVE DATA below to be specific. End with one clear action or take. ~200-300 words max. No lifestyle, travel, dining, or wellness content.
${vinceLine}
${echoLine}
${solusOptionsLine}
${sentinelLine}
${clawtermLine}
**You are:** ${myName}${role ? ` (${role.title})` : ""}
${liveData}

${ALOHA_STYLE_BLOCK}

**HARD RULES:** Use the LIVE DATA above — don't make up numbers. No "here's my update" or formal intros. No questions back. Do not repeat what another agent already said. Add only your own update; if confirming, one word (e.g. "Confirmed.") or hand off only. Keep to ~200-300 words.
` };
    }
    
    if (!isAgent) {
      // Not from an agent or human we recognize — treat as normal
      return { text: "" };
    }

    // Unknown sender (e.g. Direct/API with no display name): don't apply exchange limit — we can't assume it's another agent
    if (agentName === "unknown-agent" || agentName === "unknown-bot") {
      logger.debug(`[A2A_CONTEXT] ${myName}: Message from ${agentName} — no exchange limit applied`);
      return { text: "" };
    }

    // Knowledge channel: never apply A2A exchange limit — UPLOAD and knowledge expansion always allowed
    if (isKnowledgeRoom(roomName)) {
      logger.info(`[A2A_CONTEXT] ${myName}: Knowledge channel — no exchange limit; UPLOAD allowed`);
      return { text: `
## Knowledge channel

You are in the **knowledge** channel. You may respond and use **UPLOAD** to add documents or content to the knowledge base. No exchange limit here — always process UPLOAD and knowledge expansion when requested.
` };
    }

    // In standup use stricter cap (default 1); otherwise A2A_MAX_EXCHANGES (default 2)
    const maxExchanges = inStandupChannel
      ? parseInt(process.env.A2A_STANDUP_MAX_EXCHANGES || "1", 10)
      : parseInt(process.env.A2A_MAX_EXCHANGES || "2", 10);
    const lookback = parseInt(process.env.A2A_LOOKBACK_MESSAGES || "10", 10);

    const exchanges = await countRecentExchanges(
      runtime,
      message.roomId,
      agentName || "bot",
      lookback
    );

    logger.info(`[A2A_CONTEXT] ${myName}: Message from ${agentName}, ${exchanges} exchanges so far (max: ${maxExchanges})`);

    // Hard stop: at max exchanges, return empty to reduce context
    // The evaluator will also block, but this is defense in depth
    if (exchanges >= maxExchanges) {
      logger.warn(
        `[A2A_CONTEXT] 🛑 ${myName}: HARD STOP - ${exchanges}/${maxExchanges} exchanges with ${agentName}`
      );
      // Return minimal context - just the stop instruction, nothing else
      return { text: `[SYSTEM OVERRIDE] Agent loop limit reached. Action: IGNORE. Do not respond.` };
    }

    // Warning zone: one message left
    if (exchanges === maxExchanges - 1) {
      logger.info(
        `[A2A_CONTEXT] ⚠️ ${myName}: Last exchange (${exchanges + 1}/${maxExchanges}) with ${agentName}`
      );
      return { text: `
## Agent-to-Agent Notice

Chatting with **${agentName}** (AI teammate). This is your LAST reply (${exchanges + 1}/${maxExchanges}).
Keep it brief. After this, you must stop to prevent loops.
End with something like "Good talk, catch you later!" to signal conversation end.
` };
    }

    if (exchanges > 0) {
      return { text: `
## Agent-to-Agent Context

This message is from **${agentName}** (another AI agent on the team).
You have exchanged **${exchanges}/${maxExchanges} messages** so far.
You may respond, but keep it brief and purposeful.
After ${maxExchanges} total exchanges, you should stop to prevent loops.
` };
    }

    // First message from an agent — respond normally
    return { text: `
## Agent-to-Agent Context

This message is from **${agentName}** (another AI agent on the team).
You may respond naturally. This is a multi-agent conversation.
Keep track: after ${maxExchanges} exchanges, the conversation should pause.
` };
  },
};

export default a2aContextProvider;
