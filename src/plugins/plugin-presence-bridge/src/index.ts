import { type IAgentRuntime, type Plugin, logger } from "@elizaos/core";

type PresenceLikeService = {
  registerSource?: (source: {
    domain: string;
    displayName: string;
    getPresence: () => Array<Record<string, unknown>>;
  }) => void;
};

const PRESENCE_DOMAIN = "vince-agent-registry";
const PRESENCE_TTL_MS = 30_000;

export const presenceBridgePlugin: Plugin = {
  name: "plugin-presence-bridge",
  description: "Registers current ElizaOS agent registry as a presence source.",
  init: async (_config: Record<string, unknown>, runtime: IAgentRuntime) => {
    if (process.env.ENABLE_PRESENCE_BRIDGE !== "true") return;

    const presence = runtime.getService("presence") as PresenceLikeService;
    if (!presence?.registerSource) {
      logger.debug(
        "[PresenceBridge] Presence service unavailable, skipping source registration.",
      );
      return;
    }

    presence.registerSource({
      domain: PRESENCE_DOMAIN,
      displayName: "VINCE Agent Registry",
      getPresence: () => {
        const now = Date.now();
        const records = new Map<string, Record<string, unknown>>();
        const selfId = String(runtime.agentId);

        records.set(selfId, {
          entityId: selfId,
          displayName: runtime.character.name,
          domain: PRESENCE_DOMAIN,
          status: "online",
          lastSeen: now,
          ttlMs: PRESENCE_TTL_MS,
          context: { source: "runtime", role: "self" },
        });

        const eliza = (runtime as IAgentRuntime & { elizaOS?: any }).elizaOS;
        if (eliza?.getAgents) {
          for (const agent of eliza.getAgents() as Array<{
            agentId?: string;
            character?: { name?: string };
          }>) {
            const entityId = String(agent.agentId ?? "");
            if (!entityId) continue;
            if (records.has(entityId)) continue;
            records.set(entityId, {
              entityId,
              displayName: agent.character?.name ?? entityId,
              domain: PRESENCE_DOMAIN,
              status: "online",
              lastSeen: now,
              ttlMs: PRESENCE_TTL_MS,
              context: { source: "runtime", role: "peer_agent" },
            });
          }
        }

        return Array.from(records.values());
      },
    });

    logger.info(
      `[PresenceBridge] Registered source '${PRESENCE_DOMAIN}' for ${runtime.character.name}.`,
    );
  },
};

export default presenceBridgePlugin;
