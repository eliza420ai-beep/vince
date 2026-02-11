/**
 * OpenClaw Orchestrator for VINCE
 *
 * Spawns isolated sub-agents for specialized tasks via CLI:
 * - Alpha research (X/Twitter sentiment)
 * - Market data (prices, volume, OI)
 * - On-chain (whale flows, smart money)
 * - News aggregation
 *
 * Usage:
 *   node openclaw-agents/orchestrator.js alpha SOL BTC
 *   node openclaw-agents/orchestrator.js market ETH
 *   node openclaw-agents/orchestrator.js onchain BONK
 *   node openclaw-agents/orchestrator.js all SOL BTC ETH
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

const AGENTS_DIR = './openclaw-agents';
const DEFAULT_MODEL = 'minimax-portal/MiniMax-M2.1';

// Load agent specs
const AGENT_SPECS = {
  'alpha-research': readFileSync(`${AGENTS_DIR}/alpha-research.md`, 'utf-8'),
  'market-data': readFileSync(`${AGENTS_DIR}/market-data.md`, 'utf-8'),
  'onchain': readFileSync(`${AGENTS_DIR}/onchain.md`, 'utf-8'),
  'news': readFileSync(`${AGENTS_DIR}/news.md`, 'utf-8')
};

/**
 * Run OpenClaw CLI command
 */
function runCli(args) {
  const cmd = `openclaw ${args}`;
  try {
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 60000 });
    return result;
  } catch (e) {
    console.error(`CLI Error: ${cmd}`);
    throw e;
  }
}

/**
 * Spawn a single OpenClaw agent
 */
async function spawnAgent(name, query, options = {}) {
  const spec = AGENT_SPECS[name];
  if (!spec) {
    throw new Error(`Unknown agent: ${name}`);
  }

  const prompt = `${spec}

QUERY: ${query}

${options.context ? `CONTEXT: ${options.context}` : ''}

Provide your findings in the format specified above.`;

  console.log(`🚀 Spawning ${name} agent for: ${query}`);

  const model = options.model || DEFAULT_MODEL;
  const timeout = options.timeout || 120;

  const result = JSON.parse(runCli(`sessions spawn --task "${prompt}" --label "vince-${name}" --model "${model}" --timeout ${timeout}`));

  console.log(`✅ Agent spawned: ${result.sessionKey}`);
  return result.sessionKey;
}

/**
 * Wait for agent completion and fetch results
 */
async function getAgentResult(sessionKey, maxWaitMs = 180000) {
  console.log(`📡 Waiting for ${sessionKey}...`);

  // Poll for completion
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const status = JSON.parse(runCli(`sessions status --sessionKey ${sessionKey}`));
    if (status.activeMinutes !== undefined) {
      // Still running, wait
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else if (status.state === 'done') {
      // Fetch history
      const history = runCli(`sessions history ${sessionKey} --limit 50`);
      const messages = JSON.parse(history).messages;
      const lastMsg = messages[messages.length - 1];
      return lastMsg?.content || 'No response';
    }
  }

  throw new Error('Timeout waiting for agent');
}

/**
 * Run all agents in parallel for a token
 */
async function runAll(tokens) {
  const query = `Research these tokens: ${tokens.join(', ')}`;

  console.log('\n🕵️ Spawning all agents in parallel...\n');

  const [alphaKey, marketKey, onchainKey] = await Promise.all([
    spawnAgent('alpha-research', query, { timeout: 150 }),
    spawnAgent('market-data', query, { timeout: 120 }),
    spawnAgent('onchain', query, { timeout: 150 })
  ]);

  console.log('\n📡 Waiting for agents to complete...\n');

  const [alpha, market, onchain] = await Promise.all([
    getAgentResult(alphaKey),
    getAgentResult(marketKey),
    getAgentResult(onchainKey)
  ]);

  return { alpha, market, onchain };
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

═══════════════════════════════════════
`;
}

/**
 * Main CLI
 */
async function main() {
  const [,, command, ...args] = process.argv;

  try {
    let results;

    switch (command) {
      case 'alpha':
        results = {
          alpha: await getAgentResult(await spawnAgent('alpha-research', args.join(' '))),
          market: 'N/A (alpha only)',
          onchain: 'N/A (alpha only)'
        };
        break;

      case 'market':
        results = {
          alpha: 'N/A (market only)',
          market: await getAgentResult(await spawnAgent('market-data', args.join(' '))),
          onchain: 'N/A (market only)'
        };
        break;

      case 'onchain':
        results = {
          alpha: 'N/A (onchain only)',
          market: 'N/A (onchain only)',
          onchain: await getAgentResult(await spawnAgent('onchain', args.join(' ')))
        };
        break;

      case 'news':
        results = {
          alpha: 'N/A (news only)',
          market: 'N/A (news only)',
          onchain: 'N/A (news only)'
        };
        break;

      case 'all':
        results = await runAll(args);
        break;

      default:
        console.log(`
VINCE × OPENCLAW ORCHESTRATOR

Usage:
  node orchestrator.js alpha <token1> <token2> ...
  node orchestrator.js market <token>
  node orchestrator.js onchain <token>
  node orchestrator.js all <token1> <token2> ...

Examples:
  node orchestrator.js alpha SOL BTC ETH
  node orchestrator.js market ETH
  node orchestrator.js onchain BONK
  node orchestrator.js all SOL BTC ETH BONK
`);
        return;
    }

    console.log(formatBriefing(results));

    // Save to file for VINCE to pick up
    writeFileSync('./openclaw-agents/last-briefing.md', formatBriefing(results));
    console.log('\n📁 Briefing saved to openclaw-agents/last-briefing.md');

  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
