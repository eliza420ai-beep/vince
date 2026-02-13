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
import { getStandupResponseDelay, getEssentialStandupQuestion } from "../standup/standup.constants";
import {
  getProgressionMessage,
  checkStandupHealth,
  getAgentDisplayName,
} from "../standup/standupOrchestrator";
import { fetchAgentData } from "../standup/standupDataFetcher";

/** Known agent names for A2A detection */
const KNOWN_AGENTS = ["vince", "eliza", "kelly", "solus", "otaku", "sentinel", "echo", "oracle"];

/** Human names to recognize (co-founders, team members) */
const KNOWN_HUMANS = ["yves", "ikigai"];

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
  const indicators = ["##", "|", "signal", "bull", "bear", "action", "btc", "sol"];
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
function isFromKnownHuman(memory: Memory): { isHuman: boolean; humanName: string | null } {
  const senderName = (
    memory.content?.name ||
    memory.content?.userName ||
    ""
  ).toLowerCase();

  for (const human of KNOWN_HUMANS) {
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

/** Check if a message is from a known agent */
function isFromKnownAgent(memory: Memory): { isAgent: boolean; agentName: string | null } {
  const senderName = (
    memory.content?.name ||
    memory.content?.userName ||
    ""
  ).toLowerCase();

  for (const agent of KNOWN_AGENTS) {
    if (senderName.includes(agent)) {
      return { isAgent: true, agentName: agent };
    }
  }

  // Check metadata for bot flag
  const metadata = memory.content?.metadata as Record<string, unknown> | undefined;
  if (metadata?.isBot === true || metadata?.fromBot === true) {
    return { isAgent: true, agentName: senderName || "unknown-bot" };
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
    });

    const myName = (runtime.character?.name || "").toLowerCase();
    let myResponses = 0;

    // Count how many times I've responded in this conversation
    // Each response to the other agent counts as an exchange
    for (const mem of memories) {
      const memSender = (mem.content?.name || mem.content?.userName || "").toLowerCase();
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
  ): Promise<string> => {
    const myName = runtime.character?.name || "Agent";
    const myNameLower = myName.toLowerCase();
    const messageText = message.content?.text || "";
    
    // Check room type
    const room = await runtime.getRoom(message.roomId);
    const roomName = room?.name ?? "";
    const inStandupChannel = isStandupRoom(roomName);
    
    // Check if this is from a HUMAN (highest priority!)
    const { isHuman, humanName } = isFromKnownHuman(message);
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
          return `[SYSTEM OVERRIDE] ${humanName ?? "HUMAN"} is speaking in the standup channel. Only the standup facilitator (${singleResponder}) responds to human messages here. Action: IGNORE. Do not reply.`;
        }
      }
      logger.info(`[A2A_CONTEXT] ⭐ ${myName}: Message from HUMAN (${humanName}) — priority response`);
      const role = getAgentRole(myName);
      return `
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
`;
    }

    const { isAgent, agentName } = isFromKnownAgent(message);
    
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
          return `[SYSTEM OVERRIDE] This is your own message. Do NOT respond to yourself. Wait for an agent to report.`;
        }
        
        // Update activity timestamp
        touchActivity();
        
        // Check if an agent just reported — auto-progress to next
        const reportingAgent = STANDUP_TURN_ORDER.find((a) => 
          agentName?.toLowerCase() === a
        );
        
        if (reportingAgent && looksLikeReport(messageText)) {
          // Check if already reported (prevent duplicates)
          if (hasAgentReported(reportingAgent)) {
            logger.info(`[A2A_CONTEXT] Kelly: ${reportingAgent} already reported — ignoring duplicate`);
            return `[SYSTEM OVERRIDE] ${reportingAgent.toUpperCase()} already reported. Do NOT call them again. Wait for the current agent or proceed.`;
          }
          
          // Mark as reported
          markAgentReported(reportingAgent);
          
          // Check if all done
          if (haveAllAgentsReported()) {
            markWrappingUp();
            logger.info(`[A2A_CONTEXT] Kelly: All agents reported — triggering wrap-up`);
            return `
## AUTO-WRAP: Generate Day Report

All 7 agents have reported. Time to synthesize.

**YOUR ONLY JOB RIGHT NOW:** Generate the Day Report.

Say: "Synthesizing..." then generate a CONCISE Day Report.
- TL;DR = ONE sentence
- Max 3 actions with @owners
- Under 200 words total
`;
          }
          
          // Use orchestrator for actual delay + next agent
          const progression = await getProgressionMessage();
          
          if (progression.action === "call_next" && progression.nextAgent) {
            logger.info(`[A2A_CONTEXT] Kelly: ${reportingAgent} reported — progression: ${progression.message}`);
            
            return `
## AUTO-PROGRESS: Call Next Agent

${reportingAgent.toUpperCase()} just reported. 

**YOUR ONLY RESPONSE:** "${progression.message}"

Copy that EXACTLY. Nothing else.
`;
          }
          
          if (progression.action === "skip" && progression.nextAgent) {
            logger.warn(`[A2A_CONTEXT] Kelly: Skipping stuck agent`);
            
            return `
## SKIP: Agent Timed Out

**YOUR ONLY RESPONSE:** "${progression.message}"

Copy that EXACTLY. The timed-out agent will not report today.
`;
          }
        }
        
        // Check if standup is wrapping up
        if (isWrappingUp()) {
          return `[SYSTEM OVERRIDE] Standup is already wrapping up. Do not interrupt. Wait for the Day Report to complete.`;
        }
        
        logger.info(`[A2A_CONTEXT] ${myName}: Facilitator in standup — may respond`);
        return `
## Standup Facilitator Mode

You are Kelly, facilitating the trading standup. You are coordinator only. Keep every message very short. No commentary, no summaries between agents.

**Turn order:** VINCE → Eliza → ECHO → Oracle → Solus → Otaku → Sentinel → Wrap-up

**Rules:**
- Call agents ONE AT A TIME: "@AgentName, go."
- After each report, immediately call the next agent
- After Sentinel, generate the Day Report
- NO long intros, NO summaries between agents
- NEVER respond to your own messages

**Transitions are 3 words max:** "@Eliza, go."
`;
      }
      
      // Not the facilitator: only respond if directly called
      if (!amDirectlyCalled) {
        logger.info(
          `[A2A_CONTEXT] 🚫 ${myName}: In standup but NOT called — waiting for turn`
        );
        return `[SYSTEM OVERRIDE] This is a turn-based standup. You were NOT called by name. 
Wait for Kelly to call "@${myName}" before responding. 
Action: IGNORE. Do not reply until it's your turn.`;
      }
      
      // I was directly called — it's my turn!
      logger.info(`[A2A_CONTEXT] ✅ ${myName}: Called in standup — responding`);
      const role = getAgentRole(myName);
      
      // Check if this agent is under construction
      const roleKey = Object.keys(AGENT_ROLES).find(
        (k) => k.toLowerCase() === myNameLower
      ) as AgentName | undefined;
      const isUnderConstruction = roleKey ? (AGENT_ROLES[roleKey] as { isUnderConstruction?: boolean }).isUnderConstruction : false;
      
      // Under construction agents give minimal status update
      if (isUnderConstruction) {
        logger.info(`[A2A_CONTEXT] ${myName}: Under construction — minimal response`);
        
        // Oracle: explicit do not overclaim; status can be "Polymarket in progress" or caveated (PRD)
        if (myNameLower === "oracle") {
          return `
## 🚧 YOUR TURN — Status Update (Oracle)

Kelly called on you. You have Polymarket data but it is still unreliable for real-time. Do not overclaim.

**You are:** ${myName} (${role?.title ?? "CPO"})

**YOUR RESPONSE:**
- Status can be "Polymarket in progress" or caveated when citing odds.
- MAX 30 WORDS. NO fake data, NO promises.
`;
        }
        
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
        
        return `
## 🚧 YOUR TURN — Status Update (Under Construction)

Kelly called on you. You are **under construction** — give a BRIEF status.

**You are:** ${myName}${role ? ` (${role.title})` : ""}

**YOUR RESPONSE (copy exactly):**

${statusData || `🚧 **${role?.focus || myName} under construction.**\n\n*No action items.*`}

**RULES:**
- MAX 30 WORDS
- Just acknowledge you're under construction
- NO fake data, NO promises
- DO NOT say "happy to help" or offer to do things you can't do
`;
      }
      
      // Eliza: mostly listening; report = knowledge gaps, essay ideas, research for knowledge/
      if (myNameLower === "eliza") {
        return `
## 🎯 YOUR TURN — Standup Report (Eliza: Listening Mode)

Kelly called on you. You were mostly listening. Your report should focus on what you heard and what it inspires.

**You are:** ${myName}${role ? ` (${role.title})` : ""}

**Your report must include (brief bullets):**
- **Knowledge gaps spotted:** [What we don't know yet that would help]
- **Essay idea (Ikigai Studio Substack):** [One topic worth a long-form piece]
- **Research to upload to knowledge/:** [What to ingest or research and add to knowledge base]

**RULES:**
- MAXIMUM 80 WORDS TOTAL
- You do not lead — you react to what VINCE, ECHO, Oracle, etc. said
- NO fake data; only gaps/ideas inspired by the standup
- NO questions back
`;
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
        return `
## 🎯 YOUR TURN — Standup Report (Solus: Options Lead)

Kelly called on you. You do most of the thinking. Answer the essential question using data from the team.
${priorReportsSnippet}

**Essential question to answer:** ${essentialQ}

**You are:** ${myName}${role ? ` (${role.title})` : ""} — Hypersurface options settle weekly (Friday 08:00 UTC). We do the wheel; we sit in BTC. Use data + sentiment + news to choose optimal strike for BTC covered calls.

**Your answer must include (Grok-style):**
- Current data (price, Fear & Greed)
- X sentiment and Polymarket/options expiry if available
- Macro/volatility (e.g. liquidations, Fed, tech selloffs) if relevant
- On-chain/contrarian (e.g. MVRV, base-building, cost floor) if relevant
- **Clear Yes/No** (e.g. "No, I don't think BTC will be above $70K by next Friday")
- Short-term path and caveats in 1-2 sentences

**RULES:**
- 250-300 WORDS — enough to be as actionable as a Grok-style reply
- Use prior reports above; don't make up numbers
- End with "My take: [Yes/No], ..." and one sentence path
`;
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
          ? "\n**You have the most accurate data and recent news.** Live data (prices, funding, paper bot W/L and PnL) must drive your report. Report paper trading bot results for perps on Hyperliquid. Use LIVE DATA only.\n"
          : "";
      const echoLine =
        myNameLower === "echo"
          ? "\n**Show insights from X (plugin-x-research):** sentiment, key voices, narrative. Use LIVE DATA above.\n"
          : "";
      const sentinelLine =
        myNameLower === "sentinel"
          ? "\n**Report what's next in coding and what has been pushed to the repo.**\n"
          : "";

      return `
## 🎯 YOUR TURN — Standup Report

Kelly called on you. Report NOW. Be BRIEF.
${vinceLine}
${echoLine}
${solusOptionsLine}
${sentinelLine}
**You are:** ${myName}${role ? ` (${role.title})` : ""}
${liveData}

**FORMAT (EXACTLY THIS):**

### ${myName} — ${role?.focus || "Update"}
[Include the table from LIVE DATA above if available]

**Action:** [ONE specific trade recommendation in 10 words or less]

**HARD RULES:**
- MAXIMUM 80 WORDS TOTAL
- Use the LIVE DATA above — don't make up numbers
- ONE table, ONE action line
- NO introductions, NO "here's my update"
- NO questions back

If you write more than 80 words, you are FAILING.
`;
    }
    
    if (!isAgent) {
      // Not from an agent or human we recognize — treat as normal
      return "";
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
      return `[SYSTEM OVERRIDE] Agent loop limit reached. Action: IGNORE. Do not respond.`;
    }

    // Warning zone: one message left
    if (exchanges === maxExchanges - 1) {
      logger.info(
        `[A2A_CONTEXT] ⚠️ ${myName}: Last exchange (${exchanges + 1}/${maxExchanges}) with ${agentName}`
      );
      return `
## Agent-to-Agent Notice

Chatting with **${agentName}** (AI teammate). This is your LAST reply (${exchanges + 1}/${maxExchanges}).
Keep it brief. After this, you must stop to prevent loops.
End with something like "Good talk, catch you later!" to signal conversation end.
`;
    }

    if (exchanges > 0) {
      return `
## Agent-to-Agent Context

This message is from **${agentName}** (another AI agent on the team).
You have exchanged **${exchanges}/${maxExchanges} messages** so far.
You may respond, but keep it brief and purposeful.
After ${maxExchanges} total exchanges, you should stop to prevent loops.
`;
    }

    // First message from an agent — respond normally
    return `
## Agent-to-Agent Context

This message is from **${agentName}** (another AI agent on the team).
You may respond naturally. This is a multi-agent conversation.
Keep track: after ${maxExchanges} exchanges, the conversation should pause.
`;
  },
};

export default a2aContextProvider;
