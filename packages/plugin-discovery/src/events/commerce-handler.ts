import type { IAgentRuntime, UUID } from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { DiscoveryService } from '../services/discovery-service.ts';

/**
 * Commerce event payload for support received
 */
interface SupportReceivedPayload {
  runtime: IAgentRuntime;
  agentId: UUID;
  credits: number;
  relief: number;
  hungerBefore: number;
  hungerAfter: number;
  transaction?: {
    fromEntityId?: UUID;
    amount: number;
    source: string;
  };
}

/**
 * Handle COMMERCE_SUPPORT_RECEIVED events
 * 
 * When payment is received, check if there's a pending capability query
 * from this entity and deliver the manifest if so.
 */
export async function handleSupportReceived(payload: SupportReceivedPayload): Promise<void> {
  const { runtime, credits, transaction } = payload;

  try {
    const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
    if (!discoveryService) {
      return;
    }

    // Check if there's a pending query from the sender
    const entityId = transaction?.fromEntityId;
    if (!entityId) {
      return;
    }

    const pendingQuery = discoveryService.getPendingQuery(entityId);
    if (!pendingQuery) {
      return;
    }

    // Check if payment covers the query price
    const config = discoveryService.getConfig();
    const requiredCredits = config.DISCOVERY_QUERY_PRICE;

    // Commerce converts to credits, so compare credits
    // Assuming 1 credit ~= $0.01 or similar (config.COMMERCE_USD_TO_CREDITS)
    // For simplicity, we'll accept any payment >= query price
    if (credits < requiredCredits * 100) {
      // Not enough - could be a regular tip, not for capabilities
      logger.debug(
        { agentId: runtime.agentId, entityId, credits, required: requiredCredits * 100 },
        'Payment received but not enough for capability query'
      );
      return;
    }

    // Payment sufficient - deliver manifest
    const manifest = discoveryService.completePendingQuery(entityId);
    
    if (!manifest) {
      logger.warn(
        { agentId: runtime.agentId, entityId },
        'Pending query disappeared before delivery'
      );
      return;
    }

    // Format for delivery
    const formattedManifest = discoveryService.formatManifestForChat(manifest);

    logger.info(
      { agentId: runtime.agentId, entityId, credits },
      'Delivering capability manifest after payment'
    );

    // Emit an event that the agent can respond to
    await runtime.emitEvent('DISCOVERY_MANIFEST_READY', {
      entityId,
      roomId: pendingQuery.roomId,
      manifest,
      formattedManifest,
    });
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      '[Discovery] Error handling support received event'
    );
  }
}

/**
 * Event handler map for commerce events
 */
export const commerceEventHandlers = {
  COMMERCE_SUPPORT_RECEIVED: [handleSupportReceived],
};

