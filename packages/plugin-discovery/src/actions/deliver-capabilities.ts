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
 * DELIVER_CAPABILITIES Action
 * 
 * Delivers the full capability manifest after payment is received.
 * This action is triggered by the commerce transaction evaluator when
 * a payment is detected for a pending capability query.
 * 
 * Typically called internally, not directly by user messages.
 */
export const deliverCapabilitiesAction: Action = {
  name: 'DELIVER_CAPABILITIES',
  similes: ['COMPLETE_CAPABILITY_QUERY', 'SEND_MANIFEST'],
  description: 'Deliver capability manifest after payment received',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
    if (!discoveryService) {
      return false;
    }

    // Check if there's a pending query for this entity that should be fulfilled
    if (!message.entityId) {
      return false;
    }

    const pendingQuery = discoveryService.getPendingQuery(message.entityId);
    
    // This action is valid when we need to deliver after payment
    // The actual trigger logic would be in the commerce integration
    return !!pendingQuery;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
      if (!discoveryService) {
        return { success: false, error: 'Discovery service not available' };
      }

      const entityId = message.entityId;
      if (!entityId) {
        return { success: false, error: 'No entity ID' };
      }

      // Complete the pending query and get manifest
      const manifest = discoveryService.completePendingQuery(entityId);
      
      if (!manifest) {
        return { success: false, error: 'No pending query to complete' };
      }

      // Format for delivery
      const formattedManifest = discoveryService.formatManifestForChat(manifest);

      const responseText = `Thanks for the tip! Here's my full capability manifest:

${formattedManifest}

Generated at: ${new Date(manifest.generatedAt).toISOString()}`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['DELIVER_CAPABILITIES'],
          source: message.content.source,
        });
      }

      logger.info(
        { agentId: runtime.agentId, entityId },
        'Delivered capability manifest after payment'
      );

      return {
        success: true,
        text: responseText,
        data: { manifest, delivered: true },
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Discovery] Error in DELIVER_CAPABILITIES action'
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
        name: 'System',
        content: { text: 'Payment received for capability query' },
      },
      {
        name: 'Agent',
        content: {
          text: "Thanks for the tip! Here's my full capability manifest...",
          actions: ['DELIVER_CAPABILITIES'],
        },
      },
    ],
  ],
};

export default deliverCapabilitiesAction;

