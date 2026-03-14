/** Must run first: load .env from project root so X_BEARER_TOKEN etc. are set before any plugin. */
import "./load-env.ts";

import "./log-suppress";

import { type Project, type ProjectAgent, logger } from "@elizaos/core";
import type { Plugin } from "@elizaos/core";

// Suppress noisy warnings at the process level — intercept stdout/stderr writes
(function suppressNoisyLogs() {
  const suppress = (chunk: Buffer | string): boolean => {
    const s = typeof chunk === "string" ? chunk : chunk.toString();
    return (
      /Send handler not found/i.test(s) ||
      /AI SDK Warning System.*turn off warning logging/i.test(s) ||
      /\[PLUGIN:SQL\].*Database operation failed, retrying/i.test(s) ||
      /\[PLUGIN:BOOTSTRAP:PROVIDER:ROLES\].*No ownership data found/i.test(s) ||
      /\[PLUGIN:BOOTSTRAP:PROVIDER:SETTINGS\].*No settings state found/i.test(
        s,
      ) ||
      /\[CORE:UTILS\].*No entity found for message/i.test(s) ||
      /\[PLUGIN:BOOTSTRAP:PROVIDER:ROLES\].*User has no name or username, skipping/i.test(
        s,
      )
    );
  };
  for (const stream of ["stderr", "stdout"] as const) {
    const writable = process[stream];
    const original = writable.write.bind(writable);
    writable.write = function (chunk: any, ...args: any[]): boolean {
      if (suppress(chunk)) return true;
      return original(chunk, ...args);
    };
  }
})();

// =============================================================================
// v2 CORE — always running
// =============================================================================
// VINCE (data agent): OI, funding, L/S ratios, liquidations, portfolio drift,
//   Mando Minutes news feed. The eyes of the system.
// Solus: weekly Hypersurface options — strike ritual, assignment probability
//   (GBM + ML Brier calibration), tail risk, portfolio copula.
// Otaku: on-chain identity (ERC-8004), reputation from Solus Brier scores,
//   x402 skill endpoints. Only agent with a funded wallet.
// Forge: MLX autoresearcher — runs overnight, mutates policy thresholds /
//   prompts / ML weights, commits winners (ΔComposite ≥ +0.5%), reverts losers.
//   Optimization target: causal_uplift × Sharpe × brier_calibration.
//   Silent by default — reports via Telegram push.
// =============================================================================
import { vinceAgent } from "./agents/vince.ts";
import { solusAgent } from "./agents/solus.ts";
import { otakuAgent } from "./agents/otaku.ts";
import { forgeAgent } from "./agents/forge.ts";

// =============================================================================
// v1 AGENTS — moving to other machines in v2.
// Each is gated behind <NAME>_ENABLED=false to drop without code changes.
// Default: true (all load unless explicitly disabled).
//
//   Eliza    → Perplexity Computer research skill + AIHF Substack writing
//   Kelly    → OpenClaw / Nemoclaw portable lifestyle skill
//   Echo     → Dexter thesis-layer skill (X alpha feeds conviction, not perps)
//   Sentinel → Claude Code agent skill
//   Clawterm → Claude Code agent skill
//   Oracle   → stub only; Polymarket never produced real edge
//   Naval    → evaluate → possible Dexter SOUL.md review layer
// =============================================================================
import { elizaAgent } from "./agents/eliza.ts";
import { kellyAgent } from "./agents/kelly.ts";
import { echoAgent } from "./agents/echo.ts";
import { sentinelAgent } from "./agents/sentinel.ts";
import { clawtermAgent } from "./agents/clawterm.ts";
import { oracleAgent } from "./agents/oracle.ts";
import { navalAgent } from "./agents/naval.ts";

import logFilterPlugin from "./plugins/plugin-log-filter/src/index.ts";
import { interAgentPlugin } from "./plugins/plugin-inter-agent/src/index.ts";

// =============================================================================
// Agent gating — returns false when <NAME>_ENABLED=false in env.
// All agents default to enabled for backward compatibility.
// Set e.g. KELLY_ENABLED=false to drop Kelly without touching code.
// =============================================================================
function isEnabled(name: string): boolean {
  const val = process.env[`${name}_ENABLED`];
  return val === undefined || val.toLowerCase() !== "false";
}

// Helper: inject shared plugins into every agent.
function wrap(
  agent: ProjectAgent & { plugins?: Plugin[] },
): ProjectAgent & { plugins: Plugin[] } {
  return {
    ...agent,
    plugins: [logFilterPlugin, interAgentPlugin, ...(agent.plugins ?? [])],
  };
}

// =============================================================================
// Discord application-ID collision check (one app per agent required).
// Only checks agents that have Discord configured.
// =============================================================================
const discordAppIds: { agent: string; appId: string }[] = [];
function addIfDiscordEnabled(
  agent: string,
  hasToken: boolean,
  appId: string | undefined,
): void {
  if (hasToken && appId?.trim())
    discordAppIds.push({ agent, appId: appId.trim() });
}

addIfDiscordEnabled(
  "Eliza",
  !!(
    process.env.ELIZA_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.ELIZA_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "VINCE",
  !!process.env.VINCE_DISCORD_API_TOKEN?.trim(),
  process.env.VINCE_DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Solus",
  !!(
    process.env.SOLUS_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.SOLUS_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Otaku",
  !!(
    process.env.OTAKU_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.OTAKU_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Kelly",
  !!(
    process.env.KELLY_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.KELLY_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Sentinel",
  !!(
    process.env.SENTINEL_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.SENTINEL_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "ECHO",
  !!(
    process.env.ECHO_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.ECHO_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Oracle",
  !!(
    process.env.ORACLE_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.ORACLE_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Naval",
  !!(
    process.env.NAVAL_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.NAVAL_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Clawterm",
  !!(
    process.env.CLAWTERM_DISCORD_API_TOKEN?.trim() ||
    process.env.DISCORD_API_TOKEN?.trim()
  ),
  process.env.CLAWTERM_DISCORD_APPLICATION_ID ??
    process.env.DISCORD_APPLICATION_ID,
);

const byAppId = new Map<string, string[]>();
for (const { agent, appId } of discordAppIds) {
  const list = byAppId.get(appId) ?? [];
  list.push(agent);
  byAppId.set(appId, list);
}
for (const [appId, agents] of byAppId) {
  if (agents.length > 1) {
    logger.error(
      `[DISCORD] Multiple agents share the same Discord Application ID (${appId}): ${agents.join(", ")}. ` +
        `Each agent must use a different Discord app. Create separate apps at https://discord.com/developers/applications and set ` +
        `${agents.map((a) => a.toUpperCase().replace(/[^A-Z]/g, "") + "_DISCORD_APPLICATION_ID").join(", ")}. See DISCORD.md.`,
    );
  }
}
if (discordAppIds.length >= 2 && byAppId.size === discordAppIds.length) {
  logger.info(
    `[DISCORD] Option C: ${discordAppIds.length} agents each have their own Discord app — all can run in the same server.`,
  );
}

// =============================================================================
// Project — v2 core always runs; v1 agents load unless disabled.
// To run v2 core only: set ELIZA_ENABLED=false KELLY_ENABLED=false
//   ECHO_ENABLED=false SENTINEL_ENABLED=false CLAWTERM_ENABLED=false
//   ORACLE_ENABLED=false NAVAL_ENABLED=false
// =============================================================================

const coreAgents = [
  wrap(vinceAgent),
  wrap(solusAgent),
  wrap(otakuAgent),
  wrap(forgeAgent),
];

const v1Agents: (ProjectAgent & { plugins: Plugin[] })[] = [
  ...(isEnabled("ELIZA") ? [wrap(elizaAgent)] : []),
  ...(isEnabled("KELLY") ? [wrap(kellyAgent)] : []),
  ...(isEnabled("ECHO") ? [wrap(echoAgent)] : []),
  ...(isEnabled("SENTINEL") ? [wrap(sentinelAgent)] : []),
  ...(isEnabled("CLAWTERM") ? [wrap(clawtermAgent)] : []),
  ...(isEnabled("ORACLE") ? [wrap(oracleAgent)] : []),
  ...(isEnabled("NAVAL") ? [wrap(navalAgent)] : []),
];

const v1Names = [
  "eliza",
  "kelly",
  "echo",
  "sentinel",
  "clawterm",
  "oracle",
  "naval",
];
const disabled = v1Names.filter((n) => !isEnabled(n.toUpperCase()));
if (disabled.length > 0) {
  logger.info(`[VINCE] v2 mode — disabled: ${disabled.join(", ")}`);
}
if (v1Agents.length === 0) {
  logger.info("[VINCE] v2 core only — VINCE data, Solus, Otaku, Forge.");
}

const project: Project = {
  agents: [...coreAgents, ...v1Agents],
};

export { vinceAgent } from "./agents/vince.ts";
export { solusAgent } from "./agents/solus.ts";
export { otakuAgent } from "./agents/otaku.ts";
export { forgeAgent } from "./agents/forge.ts";
export { elizaAgent } from "./agents/eliza.ts";
export { kellyAgent } from "./agents/kelly.ts";
export { sentinelAgent } from "./agents/sentinel.ts";
export { echoAgent } from "./agents/echo.ts";
export { oracleAgent } from "./agents/oracle.ts";
export { navalAgent } from "./agents/naval.ts";
export { clawtermAgent } from "./agents/clawterm.ts";
export { character } from "./agents/eliza.ts";
export default project;
