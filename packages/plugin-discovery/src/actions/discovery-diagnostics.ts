import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { DiscoveryService } from '../services/discovery-service.ts';

/**
 * DISCOVERY_STATUS Action
 * 
 * Diagnostic action to check what agents have been discovered.
 * Human asks "what agents do you know?" or "list discovered agents"
 */
export const discoveryStatusAction: Action = {
  name: 'DISCOVERY_STATUS',
  similes: [
    'LIST_DISCOVERED_AGENTS',
    'WHO_DO_YOU_KNOW',
    'DISCOVERY_DIAGNOSTICS',
  ],
  description: 'Report what agents have been discovered through conversation',

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    if (message.entityId === runtime.agentId) {
      return false;
    }

    const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
    if (!discoveryService) {
      return false;
    }

    const text = (message.content.text || '').toLowerCase();

    const patterns = [
      /\bwhat agents? do you know\b/i,
      /\blist discovered agents?\b/i,
      /\bwho have you discovered\b/i,
      /\bdiscovery status\b/i,
      /\bdiscovery diagnostics?\b/i,
      /\bshow discovered\b/i,
      /\bwho do you know\b/i,
    ];

    return patterns.some((p) => p.test(text));
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

      const discoveredAgents = await discoveryService.getDiscoveredAgents();
      
      let response: string;
      
      if (discoveredAgents.length === 0) {
        response = `🔍 **Discovery Status**\n\nI haven't discovered any other agents yet. Try "roll call" to have agents introduce themselves.`;
      } else {
        const agentList = discoveredAgents.map((agent) => {
          const caps = agent.capabilities.slice(0, 3).join(', ');
          const more = agent.capabilities.length > 3 ? ` (+${agent.capabilities.length - 3} more)` : '';
          return `• **${agent.name}** (${agent.verificationLevel}): ${caps}${more}`;
        }).join('\n');

        response = [
          `🔍 **Discovery Status**`,
          '',
          `I know about ${discoveredAgents.length} agent(s):`,
          '',
          agentList,
        ].join('\n');
      }

      if (callback) {
        await callback({
          text: response,
          actions: ['DISCOVERY_STATUS'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        data: {
          discoveredCount: discoveredAgents.length,
          agents: discoveredAgents.map((a) => ({ name: a.name, capabilities: a.capabilities })),
        },
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Discovery] Error in DISCOVERY_STATUS action'
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
        content: { text: 'What agents do you know?' },
      },
      {
        name: 'Agent',
        content: {
          text: '🔍 **Discovery Status**\n\nI know about 2 agent(s):\n\n• **Oak** (claimed): can-swap, can-search\n• **Pine** (verified): can-trade',
          actions: ['DISCOVERY_STATUS'],
        },
      },
    ],
  ],
};

/**
 * ROOM_STATUS Action
 * 
 * Diagnostic action to check who's in the current room.
 */
export const roomStatusAction: Action = {
  name: 'ROOM_STATUS',
  similes: [
    'WHO_IS_IN_ROOM',
    'LIST_PARTICIPANTS',
    'ROOM_DIAGNOSTICS',
  ],
  description: 'Report who is in the current room according to the runtime',

  validate: async (runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    if (message.entityId === runtime.agentId) {
      return false;
    }

    const text = (message.content.text || '').toLowerCase();

    const patterns = [
      /\broom status\b/i,
      /\bwho is in (this|the) room\b/i,
      /\blist participants?\b/i,
      /\broom diagnostics?\b/i,
      /\bshow room\b/i,
    ];

    return patterns.some((p) => p.test(text));
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
      
      // Get participants
      const participants = await runtime.getParticipantsForRoom(message.roomId);
      
      // Get entities for each participant
      const entities = await Promise.all(
        participants.map(async (id) => {
          const entity = await runtime.getEntityById(id);
          return {
            id,
            entity,
            isAgent: entity ? (entity.id === entity.agentId) : false,
            isSelf: id === runtime.agentId,
          };
        })
      );

      // Also check discovered agents
      const discoveredAgents = discoveryService ? await discoveryService.getDiscoveredAgents() : [];

      const lines = [
        `🏠 **Room Status** (${message.roomId.substring(0, 8)}...)`,
        '',
        `**Participants:** ${participants.length}`,
        '',
      ];

      for (const { id, entity, isAgent, isSelf } of entities) {
        const name = entity?.names?.[0] || 'Unknown';
        const type = isSelf ? '(me)' : isAgent ? '(agent)' : '(human?)';
        const discovered = discoveredAgents.find((d) => d.agentId === id);
        const knownTag = discovered ? ' ✓ known' : '';
        
        lines.push(`• **${name}** ${type}${knownTag}`);
        lines.push(`  id: ${id.substring(0, 8)}...`);
        if (entity) {
          lines.push(`  agentId: ${entity.agentId?.substring(0, 8) || 'none'}...`);
        }
      }

      lines.push('');
      lines.push(`**Discovered agents in memory:** ${discoveredAgents.length}`);

      const response = lines.join('\n');

      if (callback) {
        await callback({
          text: response,
          actions: ['ROOM_STATUS'],
          source: message.content.source,
        });
      }

      return {
        success: true,
        data: {
          participantCount: participants.length,
          discoveredCount: discoveredAgents.length,
        },
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Discovery] Error in ROOM_STATUS action'
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
        content: { text: 'Room status' },
      },
      {
        name: 'Agent',
        content: {
          text: '🏠 **Room Status**\n\n**Participants:** 3\n\n• **Maple** (me)\n• **Oak** (agent) ✓ known\n• **User** (human?)',
          actions: ['ROOM_STATUS'],
        },
      },
    ],
  ],
};

export default [discoveryStatusAction, roomStatusAction];

