/**
 * OpenClaw Orchestrator for VINCE
 *
 * Spawns isolated sub-agents for specialized tasks:
 * - Alpha research (X/Twitter sentiment)
 * - Market data (prices, volume, OI)
 * - On-chain (whale flows, smart money)
 * - News aggregation
 *
 * This orchestrator is designed to be called from VINCE via exec().
 * For direct OpenClaw integration, use sessions_spawn() directly.
 *
 * Usage:
 *   node orchestrator.js alpha SOL BTC
 *   node orchestrator.js market ETH
 *   node orchestrator.js onchain BONK
 *   node orchestrator.js all SOL BTC ETH
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";

const AGENTS_DIR = "./openclaw-agents";
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789";
const DEFAULT_MODEL = "minimax-portal/MiniMax-M2.1";

// Load agent specs
const AGENT_SPECS = {
  alpha: readFileSync(`${AGENTS_DIR}/alpha-research.md`, "utf-8"),
  market: readFileSync(`${AGENTS_DIR}/market-data.md`, "utf-8"),
  onchain: readFileSync(`${AGENTS_DIR}/onchain.md`, "utf-8"),
  news: readFileSync(`${AGENTS_DIR}/news.md`, "utf-8"),
};

/**
 * Call OpenClaw gateway API
 */
async function callGateway(method: string, params?: Record<string, any>): Promise<any> {
  const fetch = await import("node-fetch");
  const url = GATEWAY_URL.replace("ws://", "http://").replace(":18789", ":18789/api");
  try {
    const response = await fetch(`${url}/sessions/${method.split("/")[1]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params || {}),
    });
    return await response.json();
  } catch (e) {
    throw new Error(`Gateway call failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Spawn a single OpenClaw agent via gateway API
 */
async function spawnAgent(name: string, query: string, options: Record<string, any> = {}): Promise<string> {
  const spec = AGENT_SPECS[name as keyof typeof AGENT_SPECS];
  if (!spec) {
    throw new Error(`Unknown agent: ${name}`);
  }

  const prompt = `${spec}

QUERY: ${query}

${options.context ? `CONTEXT: ${options.context}` : ""}

Provide your findings in the format specified above.`;

  console.log(`🚀 Spawning ${name} agent for: ${query}`);

  try {
    // Try gateway API first
    const result = await callGateway("sessions/spawn", {
      task: prompt,
      label: `vince-${name}-${Date.now()}`,
      model: options.model || DEFAULT_MODEL,
      timeoutSeconds: options.timeout || 120,
    });
    console.log(`✅ Agent spawned: ${result.sessionKey}`);
    return result.sessionKey;
  } catch (e) {
    // Fallback: Use OpenClaw CLI if available
    console.warn(`⚠️ Gateway API failed, falling back to CLI: ${e}`);
    throw e;
  }
}

/**
 * Wait for agent completion and fetch results
 */
async function getAgentResult(sessionKey: string, maxWaitMs = 180000): Promise<string> {
  console.log(`📡 Waiting for ${sessionKey}...`);

  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await callGateway("sessions/status", { sessionKey });
      if (status.state === "done") {
        const history = await callGateway("sessions/history", { sessionKey, includeTools: false, limit: 100 });
        const messages = history.messages || [];
        const lastMsg = messages[messages.length - 1];
        return lastMsg?.content?.text || lastMsg?.content || "No response";
      }
      // Still running, wait
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch {
      // Gateway might not be available
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  throw new Error("Timeout waiting for agent");
}

/**
 * Run all agents in parallel for tokens
 */
async function runAll(tokens: string[]) {
  const query = `Research these tokens: ${tokens.join(", ")}`;

  console.log("\n🕵️ Spawning all agents in parallel...\n");

  try {
    const [alphaKey, marketKey, onchainKey] = await Promise.all([
      spawnAgent("alpha", query, { timeout: 150 }),
      spawnAgent("market", query, { timeout: 120 }),
      spawnAgent("onchain", query, { timeout: 150 }),
    ]);

    console.log("\n📡 Waiting for agents to complete...\n");

    const [alpha, market, onchain] = await Promise.all([
      getAgentResult(alphaKey),
      getAgentResult(marketKey),
      getAgentResult(onchainKey),
    ]);

    return { alpha, market, onchain };
  } catch (e) {
    console.error("❌ Agent spawning failed:", e);
    return {
      alpha: "Agent unavailable - ensure OpenClaw gateway is running",
      market: "Agent unavailable - ensure OpenClaw gateway is running",
      onchain: "Agent unavailable - ensure OpenClaw gateway is running",
    };
  }
}

/**
 * Format VINCE-compatible briefing
 */
function formatBriefing(results: Record<string, string>): string {
  return `
═══════════════════════════════════════
   VINCE × OPENCLAW BRIEFING
═══════════════════════════════════════

🐦 ALPHA RESEARCH
${results.alpha}

📊 MARKET DATA
${results.market}

⛓️ ON-CHAIN
${results.onchain}

═══════════════════════════════════════
`;
}

/**
 * Main CLI
 */
async function main() {
  const [, , command, ...args] = process.argv;

  try {
    let results: Record<string, string>;

    switch (command) {
      case "alpha":
      case "market":
      case "onchain":
      case "news": {
        const query = args.join(" ");
        try {
          const sessionKey = await spawnAgent(command, query);
          const content = await getAgentResult(sessionKey);
          results = {
            alpha: command === "alpha" ? content : "N/A (alpha only)",
            market: command === "market" ? content : "N/A (market only)",
            onchain: command === "onchain" ? content : "N/A (onchain only)",
            news: command === "news" ? content : "N/A (news only)",
          };
        } catch {
          results = {
            alpha: command === "alpha" ? "Agent unavailable - run: openclaw gateway start" : "N/A",
            market: command === "market" ? "Agent unavailable - run: openclaw gateway start" : "N/A",
            onchain: command === "onchain" ? "Agent unavailable - run: openclaw gateway start" : "N/A",
            news: command === "news" ? "Agent unavailable - run: openclaw gateway start" : "N/A",
          };
        }
        break;
      }

      case "all":
        results = await runAll(args);
        break;

      default:
        console.log(`
VINCE × OPENCLAW ORCHESTRATOR

Usage:
  node orchestrator.js alpha <token1> <token2> ...
  node orchestrator.js market <token>
  node orchestrator.js onchain <token>
  node orchestrator.js news
  node orchestrator.js all <token1> <token2> ...

Examples:
  node orchestrator.js alpha SOL BTC ETH
  node orchestrator.js market ETH
  node orchestrator.js onchain BONK
  node orchestrator.js all SOL BTC ETH BONK

Prerequisites:
  1. Install OpenClaw: npm install -g openclaw
  2. Start gateway: openclaw gateway start
  3. Set API keys: export X_BEARER_TOKEN="..."

Note: This orchestrator calls the OpenClaw gateway API.
For direct agent spawning, use sessions_spawn() directly.
`);
        return;
    }

    const briefing = formatBriefing(results);
    console.log(briefing);

    // Save to file for VINCE to pick up
    writeFileSync("./openclaw-agents/last-briefing.md", briefing);
    console.log("\n📁 Briefing saved to openclaw-agents/last-briefing.md");

  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();
