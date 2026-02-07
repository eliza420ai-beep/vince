import { type Project, logger } from "@elizaos/core";

// Suppress "Send handler not found (handlerSource=discord)" at the process level — core uses runtime.logger
// (per-agent) and we can't patch it from outside. Filter both stderr and stdout (pino may use either).
(function suppressSendHandlerNotFound() {
  const suppress = (chunk: Buffer | string): boolean => {
    const s = typeof chunk === "string" ? chunk : chunk.toString();
    return /Send handler not found/i.test(s);
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
import logFilterPlugin from "./plugins/plugin-log-filter/src/index.ts";

// --- Multi-agent Discord: require two different Discord apps ---
// Each agent gets Discord from its own character.settings.secrets (VINCE_* → VINCE, ELIZA_* → Eliza).
// If both use the same Application ID, VINCE won't load the Discord plugin → "Send handler not found".
const elizaAppId = (process.env.ELIZA_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID)?.trim();
const vinceAppId = process.env.VINCE_DISCORD_APPLICATION_ID?.trim();
const vinceDiscordWanted = !!process.env.VINCE_DISCORD_API_TOKEN?.trim() && !!vinceAppId;
const elizaHasDiscord = !!(process.env.ELIZA_DISCORD_API_TOKEN?.trim() || process.env.DISCORD_API_TOKEN?.trim());

if (vinceDiscordWanted && elizaAppId && vinceAppId === elizaAppId) {
  logger.error(
    `[DISCORD] VINCE and Eliza are using the same Discord Application ID (${elizaAppId}). ` +
      `Both agents must use different Discord apps to run in one server. ` +
      `Create a second app at https://discord.com/developers/applications → New Application → Bot → copy Application ID and Token, ` +
      `then set VINCE_DISCORD_APPLICATION_ID and VINCE_DISCORD_API_TOKEN to the new app's values. See DISCORD.md.`
  );
} else if (vinceDiscordWanted && elizaHasDiscord && vinceAppId && elizaAppId && vinceAppId !== elizaAppId) {
  logger.info('[DISCORD] Multi-agent: VINCE and Eliza each have their own Discord app — both can run in the same server.');
}

const project: Project = {
  agents: [
    {
      ...vinceAgent,
      plugins: [logFilterPlugin, ...(vinceAgent.plugins ?? [])],
    },
    {
      ...elizaAgent,
      plugins: [logFilterPlugin, ...(elizaAgent.plugins ?? [])],
    },
    {
      ...solusAgent,
      plugins: [logFilterPlugin, ...(solusAgent.plugins ?? [])],
    },
    {
      ...otakuAgent,
      plugins: [logFilterPlugin, ...(otakuAgent.plugins ?? [])],
    },
  ],
};

export { vinceAgent } from "./agents/vince.ts";
export { elizaAgent } from "./agents/eliza.ts";
export { solusAgent } from "./agents/solus.ts";
export { otakuAgent } from "./agents/otaku.ts";
export { character } from "./character.ts";
export default project;
