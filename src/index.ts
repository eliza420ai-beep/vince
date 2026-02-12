/** Must run first: load .env from project root so X_BEARER_TOKEN etc. are set before any plugin. */
import "./load-env.ts";

import "./log-suppress";

import { type Project, logger } from "@elizaos/core";

// Suppress noisy warnings at the process level — intercept stdout/stderr writes
(function suppressNoisyLogs() {
  const suppress = (chunk: Buffer | string): boolean => {
    const s = typeof chunk === "string" ? chunk : chunk.toString();
    return (
      /Send handler not found/i.test(s) ||
      /AI SDK Warning System.*turn off warning logging/i.test(s) ||
      /\[PLUGIN:SQL\].*Database operation failed, retrying/i.test(s) ||
      /\[PLUGIN:BOOTSTRAP:PROVIDER:ROLES\].*No ownership data found/i.test(s) ||
      /\[PLUGIN:BOOTSTRAP:PROVIDER:SETTINGS\].*No settings state found/i.test(s) ||
      /\[CORE:UTILS\].*No entity found for message/i.test(s) ||
      /\[PLUGIN:BOOTSTRAP:PROVIDER:ROLES\].*User has no name or username, skipping/i.test(s)
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

import { vinceAgent } from "./agents/vince.ts";
import { elizaAgent } from "./agents/eliza.ts";
import { solusAgent } from "./agents/solus.ts";
import { otakuAgent } from "./agents/otaku.ts";
import { kellyAgent } from "./agents/kelly.ts";
import { sentinelAgent } from "./agents/sentinel.ts";
import { echoAgent } from "./agents/echo.ts";
import logFilterPlugin from "./plugins/plugin-log-filter/src/index.ts";
import { interAgentPlugin } from "./plugins/plugin-inter-agent/src/index.ts";

// --- Multi-agent Discord (Option C): one app per agent — no shared Application IDs ---
// Each agent uses its own DISCORD_APPLICATION_ID / DISCORD_API_TOKEN from character.settings.secrets.
// If two agents share the same Application ID, one will not get a send handler → "Send handler not found".
const discordAppIds: { agent: string; appId: string }[] = [];
function addIfDiscordEnabled(
  agent: string,
  hasToken: boolean,
  appId: string | undefined,
): void {
  if (hasToken && appId?.trim()) discordAppIds.push({ agent, appId: appId.trim() });
}
addIfDiscordEnabled(
  "Eliza",
  !!(process.env.ELIZA_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim()),
  process.env.ELIZA_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "VINCE",
  !!process.env.VINCE_DISCORD_API_TOKEN?.trim(),
  process.env.VINCE_DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Solus",
  !!(process.env.SOLUS_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim()),
  process.env.SOLUS_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Otaku",
  !!(process.env.OTAKU_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim()),
  process.env.OTAKU_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Kelly",
  !!(process.env.KELLY_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim()),
  process.env.KELLY_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "Sentinel",
  !!(process.env.SENTINEL_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim()),
  process.env.SENTINEL_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
);
addIfDiscordEnabled(
  "ECHO",
  !!(process.env.ECHO_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim()),
  process.env.ECHO_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID,
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
        `${agents.map((a) => a.toUpperCase().replace(/[^A-Z]/g, "") + "_DISCORD_APPLICATION_ID").join(", ")}. See DISCORD.md.`
    );
  }
}
if (discordAppIds.length >= 2 && byAppId.size === discordAppIds.length) {
  logger.info(`[DISCORD] Option C: ${discordAppIds.length} agents each have their own Discord app — all can run in the same server.`);
}

const project: Project = {
  agents: [
    {
      ...vinceAgent,
      plugins: [logFilterPlugin, interAgentPlugin, ...(vinceAgent.plugins ?? [])],
    },
    {
      ...elizaAgent,
      plugins: [logFilterPlugin, interAgentPlugin, ...(elizaAgent.plugins ?? [])],
    },
    {
      ...solusAgent,
      plugins: [logFilterPlugin, interAgentPlugin, ...(solusAgent.plugins ?? [])],
    },
    {
      ...otakuAgent,
      plugins: [logFilterPlugin, interAgentPlugin, ...(otakuAgent.plugins ?? [])],
    },
    {
      ...kellyAgent,
      plugins: [logFilterPlugin, interAgentPlugin, ...(kellyAgent.plugins ?? [])],
    },
    {
      ...sentinelAgent,
      plugins: [logFilterPlugin, interAgentPlugin, ...(sentinelAgent.plugins ?? [])],
    },
    {
      ...echoAgent,
      plugins: [logFilterPlugin, interAgentPlugin, ...(echoAgent.plugins ?? [])],
    },
  ],
};

export { vinceAgent } from "./agents/vince.ts";
export { elizaAgent } from "./agents/eliza.ts";
export { solusAgent } from "./agents/solus.ts";
export { otakuAgent } from "./agents/otaku.ts";
export { kellyAgent } from "./agents/kelly.ts";
export { sentinelAgent } from "./agents/sentinel.ts";
export { echoAgent } from "./agents/echo.ts";
export { character } from "./agents/eliza.ts";
export default project;
