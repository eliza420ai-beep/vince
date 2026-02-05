import { type Project, logger } from '@elizaos/core';
import { vinceAgent } from './agents/vince.ts';
import { elizaAgent } from './agents/eliza.ts';
import logFilterPlugin from './plugins/plugin-log-filter/src/index.ts';

// --- Multi-agent Discord: require two different Discord apps ---
// If both agents use the same Application ID, VINCE won't load the Discord plugin → "Send handler not found".
const elizaAppId = (process.env.ELIZA_DISCORD_APPLICATION_ID ?? process.env.DISCORD_APPLICATION_ID)?.trim();
const vinceAppId = process.env.VINCE_DISCORD_APPLICATION_ID?.trim();
const vinceDiscordWanted =
  process.env.VINCE_DISCORD_ENABLED === 'true' &&
  !!process.env.VINCE_DISCORD_API_TOKEN?.trim() &&
  !!vinceAppId;
if (vinceDiscordWanted && elizaAppId && vinceAppId === elizaAppId) {
  logger.error(
    `[DISCORD] VINCE and Eliza are using the same Discord Application ID (${elizaAppId}). ` +
      `Both agents must use different Discord apps to run in one server. ` +
      `Create a second app at https://discord.com/developers/applications → New Application → Bot → copy Application ID and Token, ` +
      `then set VINCE_DISCORD_APPLICATION_ID and VINCE_DISCORD_API_TOKEN to the new app's values. See DISCORD.md.`
  );
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
  ],
};

export { vinceAgent } from './agents/vince.ts';
export { elizaAgent } from './agents/eliza.ts';

export default project;
