/**
 * OpenClaw Orchestrator for VINCE
 *
 * Spawns isolated sub-agents for specialized tasks:
 * - Alpha research (X/Twitter sentiment)
 * - Market data (prices, volume, OI)
 * - On-chain (whale flows, smart money)
 * - News aggregation
 *
 * Usage (from VINCE plugin via exec):
 *   node orchestrator.js alpha SOL BTC
 *   node orchestrator.js market ETH
 *   node orchestrator.js onchain BONK
 *   node orchestrator.js all SOL BTC ETH
 *
 * Requirements:
 *   npm install -g openclaw
 *   openclaw gateway start
 */

import { readFileSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname, ".");

const AGENT_SPECS = {
  alpha: readFileSync(path.join(AGENTS_DIR, "alpha-research.md"), "utf-8"),
  market: readFileSync(path.join(AGENTS_DIR, "market-data.md"), "utf-8"),
  onchain: readFileSync(path.join(AGENTS_DIR, "onchain.md"), "utf-8"),
  news: readFileSync(path.join(AGENTS_DIR, "news.md"), "utf-8"),
};

const CLI_TIMEOUT_MS = 120000;
const HEALTH_TIMEOUT_MS = 10000;

/**
 * Run openclaw CLI command (async). Returns stdout string or throws.
 */
function runOpenClawAsync(args, options = {}) {
  const timeoutMs = options.timeout ?? CLI_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const child = spawn("openclaw", args, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf-8");
    child.stderr.setEncoding("utf-8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`OpenClaw CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout || "");
      } else {
        reject(new Error(`Exit code ${code}: ${stderr || signal || "unknown"}`));
      }
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Check if gateway is running
 */
async function checkGateway() {
  try {
    await runOpenClawAsync(["health"], { timeout: HEALTH_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/**
 * Spawn one agent via OpenClaw CLI and return briefing text (async).
 * Tries --agent <name> first, then default agent.
 */
async function runAgentViaCLI(name, query) {
  const spec = AGENT_SPECS[name];
  if (!spec) {
    throw new Error(`Unknown agent: ${name}`);
  }
  const message = `${spec}

QUERY: ${query}

Provide your findings in the format specified above.`;

  const argsWithAgent = ["agent", "--agent", name, "--message", message];
  const argsDefault = ["agent", "--message", message];

  for (const args of [argsWithAgent, argsDefault]) {
    try {
      const out = await runOpenClawAsync(args);
      const trimmed = out.trim();
      if (trimmed) return trimmed;
      return "(No output from agent)";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("not found") || msg.includes("Unknown")) continue;
      throw e;
    }
  }
  return null;
}

/**
 * Run a single agent with timeout and partial-result fallback.
 */
async function runAgentSafe(name, query) {
  try {
    const text = await runAgentViaCLI(name, query);
    return { name, text: text || `(Agent ${name}: not configured or no output. Use VINCE/plugin-openclaw for full research.)` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { name, text: `(Agent ${name} failed: ${msg})` };
  }
}

/**
 * Format VINCE-compatible briefing
 */
function formatBriefing(results) {
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

📰 NEWS
${results.news}

═══════════════════════════════════════
`;
}

/**
 * Main CLI
 */
async function main() {
  const [, , command, ...args] = process.argv;

  if (!(await checkGateway())) {
    console.log(`
❌ OpenClaw gateway is not running.

To start:
  1. npm install -g openclaw
  2. openclaw gateway start

Then try again.
`);
    process.exit(1);
  }

  try {
    let results;

    switch (command) {
      case "alpha":
      case "market":
      case "onchain":
      case "news": {
        const query = args.join(" ") || "general crypto research";
        console.log(`🚀 Running ${command} agent for: ${query}`);
        const out = await runAgentViaCLI(command, query);
        const single = out || `CLI run failed or agent "${command}" not configured. Use VINCE/plugin-openclaw for in-app research, or configure OpenClaw agents (alpha, market, onchain, news).`;
        results = {
          alpha: command === "alpha" ? single : "N/A",
          market: command === "market" ? single : "N/A",
          onchain: command === "onchain" ? single : "N/A",
          news: command === "news" ? single : "N/A",
        };
        break;
      }

      case "all": {
        const tokens = args.join(" ") || "SOL BTC ETH";
        console.log(`🕵️ Running all agents in parallel for: ${tokens}`);
        const agents = ["alpha", "market", "onchain", "news"];
        const resolved = await Promise.all(
          agents.map((name) => runAgentSafe(name, tokens))
        );
        results = { alpha: "N/A", market: "N/A", onchain: "N/A", news: "N/A" };
        for (const { name, text } of resolved) {
          results[name] = text;
        }
        break;
      }

      default:
        console.log(`
VINCE × OPENCLAW ORCHESTRATOR

Usage:
  node orchestrator.js alpha <token1> <token2> ...
  node orchestrator.js market <token>
  node orchestrator.js onchain <token>
  node orchestrator.js news
  node orchestrator.js all <token1> <token2> ...

Prerequisites:
  1. npm install -g openclaw
  2. openclaw gateway start

Note: This orchestrator requires OpenClaw SDK for full functionality.
The CLI-only mode provides basic scaffolding.
`);
        return;
    }

    const briefing = formatBriefing(results);
    console.log(briefing);

    writeFileSync(path.join(AGENTS_DIR, "last-briefing.md"), briefing);
    console.log("\n📁 Briefing saved to openclaw-agents/last-briefing.md");
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();
