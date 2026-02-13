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
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname, ".");

// Load agent specs
const AGENT_SPECS = {
  alpha: readFileSync(path.join(AGENTS_DIR, "alpha-research.md"), "utf-8"),
  market: readFileSync(path.join(AGENTS_DIR, "market-data.md"), "utf-8"),
  onchain: readFileSync(path.join(AGENTS_DIR, "onchain.md"), "utf-8"),
  news: readFileSync(path.join(AGENTS_DIR, "news.md"), "utf-8"),
};

/**
 * Run openclaw CLI command
 */
function runOpenClaw(args) {
  try {
    const result = spawnSync("openclaw", args, {
      encoding: "utf-8",
      timeout: 180000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    if (result.status !== 0) {
      throw new Error(`Exit code ${result.status}: ${result.stderr}`);
    }
    return result.stdout || "";
  } catch (e) {
    throw new Error(`OpenClaw CLI failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Check if gateway is running
 */
function checkGateway(): boolean {
  try {
    runOpenClaw(["health"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Spawn agent via OpenClaw CLI and return briefing text.
 * Uses: openclaw agent --agent <name> --message "<spec + query>"
 * If --agent <name> is not configured, tries without --agent (default agent).
 */
function runAgentViaCLI(name, query) {
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
      const result = spawnSync("openclaw", args, {
        encoding: "utf-8",
        timeout: 120000,
        maxBuffer: 4 * 1024 * 1024,
        stdio: ["pipe", "pipe", "pipe"],
      });
      if (result.status === 0 && result.stdout && result.stdout.trim()) {
        return result.stdout.trim();
      }
      if (result.status !== 0 && result.stderr && result.stderr.includes("not found")) {
        continue;
      }
      if (result.status === 0) {
        return result.stdout?.trim() || "(No output from agent)";
      }
    } catch (e) {
      continue;
    }
  }

  return null;
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

  // Check gateway first
  if (!checkGateway()) {
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
        const out = runAgentViaCLI(command, query);
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
        console.log(`🕵️ Running all agents for: ${tokens}`);
        const agents = ["alpha", "market", "onchain", "news"];
        const pairs = agents.map((a) => [a, tokens]);
        const runOne = ([name, q]) => {
          const text = runAgentViaCLI(name, q);
          return { name, text: text || `(Agent ${name}: not configured or no output. Use VINCE/plugin-openclaw for full research.)` };
        };
        const resolved = await Promise.all(pairs.map((p) => Promise.resolve(runOne(p))));
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

    // Save to file for VINCE to pick up
    writeFileSync(path.join(AGENTS_DIR, "last-briefing.md"), briefing);
    console.log("\n📁 Briefing saved to openclaw-agents/last-briefing.md");

  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

main();
