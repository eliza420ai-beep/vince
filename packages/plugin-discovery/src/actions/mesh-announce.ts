import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
  UUID,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { DiscoveryService } from '../services/discovery-service.ts';

// Track recent announcements per agent+room to prevent infinite loops
// Map of "agentId:roomId" -> timestamp of last announcement
const recentAnnouncements = new Map<string, number>();
const ANNOUNCEMENT_COOLDOWN_MS = 30_000; // 30 seconds between announcements per room per agent

function getCooldownKey(agentId: UUID, roomId: UUID): string {
  return `${agentId}:${roomId}`;
}

/**
 * MESH_ANNOUNCE Action
 * 
 * Creates a mesh discovery network where agents introduce themselves
 * and respond to other agents' introductions.
 * 
 * TRIGGERS:
 * 1. Human says "roll call" / "who's here" / etc.
 * 2. Another agent announces themselves (we respond back)
 * 
 * LOOP PREVENTION:
 * - 30 second cooldown per room
 * - Only respond once to each "wave" of announcements
 * - Each agent only announces once per cooldown period
 * 
 * BIDIRECTIONAL DISCOVERY:
 * When Agent A announces, Agent B responds with its own announcement.
 * Both agents then persist each other's capabilities via the
 * discoveryPersistenceEvaluator.
 */
export const meshAnnounceAction: Action = {
  name: 'MESH_ANNOUNCE',
  similes: [
    'ROLL_CALL',
    'INTRODUCE_YOURSELVES',
    'WHO_IS_HERE',
    'AGENT_INTRODUCTIONS',
    'ANNOUNCE_CAPABILITIES',
  ],
  description: 'Respond to a roll call or another agent\'s announcement with your own introduction',

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    // Only respond to messages from others (not our own)
    if (message.entityId === runtime.agentId) {
      return false;
    }

    const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
    if (!discoveryService) {
      return false;
    }

    // Check cooldown - don't announce if THIS AGENT recently did in this room
    const cooldownKey = getCooldownKey(runtime.agentId, message.roomId);
    const lastAnnouncement = recentAnnouncements.get(cooldownKey);
    if (lastAnnouncement && Date.now() - lastAnnouncement < ANNOUNCEMENT_COOLDOWN_MS) {
      return false;
    }

    const text = message.content.text || '';

    // TRIGGER 1: Human roll call patterns
    const humanTriggerPatterns = [
      /\b(everyone|all agents?|everybody)\b.*\b(introduce|announce|present)/i,
      /\broll\s*call\b/i,
      /\bwho('s| is) here\b/i,
      /\bwho('s| is) in (this|the) (room|channel)\b/i,
      /\bintroduce yoursel(f|ves)\b/i,
      /\bwhat can (everyone|you all|all of you) do\b/i,
      /\bmesh announce\b/i,
    ];

    if (humanTriggerPatterns.some((p) => p.test(text))) {
      return true;
    }

    // TRIGGER 2: Another agent's mesh announce (respond back)
    // Detect the mesh announce format: **Name** here! ... 🏷️ flags
    const agentAnnouncePatterns = [
      /\*\*\w+\*\*\s*here!/i,           // **AgentName** here!
      /🏷️.*(?:can|has|supports)-/i,    // 🏷️ can-trade, has-wallet
    ];

    const matchesAnnouncePattern = agentAnnouncePatterns.some((p) => p.test(text));

    if (matchesAnnouncePattern) {
      // Pattern matches - respond to this announce
      const senderEntity = await runtime.getEntityById(message.entityId);
      if (senderEntity) {
        return true;
      }
    }

    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
      if (!discoveryService) {
        return { success: false, error: 'Discovery service not available' };
      }

      // Record that we're announcing now (for cooldown - per agent)
      const cooldownKey = getCooldownKey(runtime.agentId, message.roomId);
      recentAnnouncements.set(cooldownKey, Date.now());

      // Check if we're responding to another agent's announce
      let triggerAgentName: string | null = null;
      const senderEntity = await runtime.getEntityById(message.entityId);
      if (senderEntity && discoveryService.isAgent(senderEntity)) {
        triggerAgentName = senderEntity.names?.[0] || null;
      }

      // Get our capability summary
      const summaryText = discoveryService.generateCapabilitySummaryText();
      const summary = discoveryService.buildSummary();

      // Build a brief, non-spammy introduction
      const flagList = summary.featureFlags.slice(0, 5).join(', ');
      const moreFlags = summary.featureFlags.length > 5
        ? ` (+${summary.featureFlags.length - 5} more)`
        : '';

      // Include acknowledgment if responding to another agent
      const greeting = triggerAgentName
        ? `**${runtime.character.name}** here! Nice to meet you, ${triggerAgentName}! ${summaryText}`
        : `**${runtime.character.name}** here! ${summaryText}`;

      const intro = [
        greeting,
        '',
        `🏷️ ${flagList}${moreFlags}`,
        `📦 ${summary.counts.actions} actions, ${summary.counts.services} services`,
      ].join('\n');

      if (callback) {
        await callback({
          text: intro,
          actions: ['MESH_ANNOUNCE'],
          source: message.content.source,
        });
      }

      logger.info(
        { agentId: runtime.agentId, roomId: message.roomId, flagCount: summary.featureFlags.length },
        'Sent mesh announce / roll call response'
      );

      return {
        success: true,
        data: {
          agentName: runtime.character.name,
          featureFlags: summary.featureFlags,
          counts: summary.counts,
        },
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Discovery] Error in MESH_ANNOUNCE action'
      );

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: { text: 'Everyone introduce yourselves' },
      },
      {
        name: 'Agent',
        content: {
          text: '**Maple** here! I can trade, post, and swap. 🏷️ can-trade, can-post, has-homeostasis 📦 12 actions, 3 services',
          actions: ['MESH_ANNOUNCE'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: { text: 'Roll call!' },
      },
      {
        name: 'Agent',
        content: {
          text: '**TradingBot** here! I can execute trades and monitor markets. 🏷️ can-trade, can-swap 📦 8 actions, 2 services',
          actions: ['MESH_ANNOUNCE'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: { text: "Who's here?" },
      },
      {
        name: 'Agent',
        content: {
          text: '**Helper** here! I support various utilities. 🏷️ has-memory, can-search 📦 5 actions, 1 service',
          actions: ['MESH_ANNOUNCE'],
        },
      },
    ],
  ],
};

export default meshAnnounceAction;

