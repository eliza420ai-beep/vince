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

// Import commerce types - using dynamic import pattern for peer dependency
type JobService = {
  createJob: (params: {
    clientEntityId: string;
    jobType: string;
    quotedPrice: number;
    metadata?: Record<string, unknown>;
  }) => Promise<{ id: string }>;
  updateStatus: (jobId: string, status: string) => Promise<void>;
  recordOutcome: (jobId: string, outcome: { rating: string; feedback?: string }) => Promise<void>;
};

type CommerceService = {
  getPaymentMethods: () => Array<{
    id: string;
    displayName: string;
    getAddress: () => string;
  }>;
  getSurvivalContext: () => { hunger: number };
};

/**
 * QUERY_CAPABILITIES Action
 * 
 * Handles the paid capability query flow:
 * 1. User requests detailed capabilities
 * 2. Agent quotes price and shows payment methods
 * 3. User pays (detected by commerce's transaction evaluator)
 * 4. Agent delivers full capability manifest
 * 
 * Uses commerce's JobService to track queries as jobs.
 */
export const queryCapabilitiesAction: Action = {
  name: 'QUERY_CAPABILITIES',
  similes: [
    'SHOW_CAPABILITIES',
    'LIST_CAPABILITIES',
    'DESCRIBE_CAPABILITIES',
    'SHOW_FEATURES',
    'LIST_FEATURES',
    'FULL_CAPABILITY_LIST',
  ],
  description: 'Provide detailed capability information (paid query)',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Need discovery service
    const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
    if (!discoveryService) {
      return false;
    }

    // Check if message is asking for detailed capabilities
    const text = (message.content.text || '').toLowerCase();
    
    const patterns = [
      /\b(full|complete|detailed|all)\b.*\b(capabilit|feature|action)/i,
      /\b(list|show|give|tell).*\b(everything|all)/i,
      /\bmanifest\b/i,
      /\bfull list\b/i,
    ];

    return patterns.some((p) => p.test(text));
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
      const roomId = message.roomId;
      const config = discoveryService.getConfig();

      // Check if payment is required
      if (!config.DISCOVERY_REQUIRE_PAYMENT) {
        // No payment required - deliver manifest directly
        const manifest = discoveryService.buildManifest();
        const formattedManifest = discoveryService.formatManifestForChat(manifest);

        if (callback) {
          await callback({
            text: `Here are my full capabilities:\n\n${formattedManifest}`,
            actions: ['QUERY_CAPABILITIES'],
            source: message.content.source,
          });
        }

        return {
          success: true,
          text: formattedManifest,
          data: { manifest, paid: false },
        };
      }

      // Check if this entity already has a pending query
      const pendingQuery = entityId ? discoveryService.getPendingQuery(entityId) : null;
      
      // Get commerce services for payment
      const commerceService = runtime.getService('commerce') as CommerceService | null;
      const jobService = runtime.getService('commerce-job') as JobService | null;

      if (!commerceService) {
        // No commerce - can't accept payment, give manifest for free
        logger.warn(
          { agentId: runtime.agentId },
          'Commerce service not available, providing capabilities for free'
        );

        const manifest = discoveryService.buildManifest();
        const formattedManifest = discoveryService.formatManifestForChat(manifest);

        if (callback) {
          await callback({
            text: `Here are my full capabilities:\n\n${formattedManifest}`,
            actions: ['QUERY_CAPABILITIES'],
            source: message.content.source,
          });
        }

        return {
          success: true,
          text: formattedManifest,
          data: { manifest, paid: false },
        };
      }

      // Get payment methods
      const paymentMethods = commerceService.getPaymentMethods();

      if (paymentMethods.length === 0) {
        // No payment methods configured - give for free
        const manifest = discoveryService.buildManifest();
        const formattedManifest = discoveryService.formatManifestForChat(manifest);

        if (callback) {
          await callback({
            text: `Here are my full capabilities:\n\n${formattedManifest}`,
            actions: ['QUERY_CAPABILITIES'],
            source: message.content.source,
          });
        }

        return {
          success: true,
          text: formattedManifest,
          data: { manifest, paid: false },
        };
      }

      // Create pending query if not exists
      if (entityId && roomId && !pendingQuery) {
        discoveryService.createPendingQuery(entityId, roomId);
      }

      // Create job if job service available
      if (jobService && entityId) {
        try {
          const job = await jobService.createJob({
            clientEntityId: entityId,
            jobType: 'capability_query',
            quotedPrice: config.DISCOVERY_QUERY_PRICE,
            metadata: {
              roomId,
              requestedAt: Date.now(),
            },
          });

          logger.info(
            { agentId: runtime.agentId, jobId: job.id, entityId },
            'Created capability query job'
          );
        } catch (error) {
          logger.warn(
            { agentId: runtime.agentId, error },
            'Failed to create capability query job'
          );
        }
      }

      // Format payment methods
      const methodsText = paymentMethods
        .slice(0, 5)
        .map((m) => {
          try {
            return `• **${m.displayName}**: ${m.getAddress()}`;
          } catch {
            return `• **${m.displayName}**`;
          }
        })
        .join('\n');

      const responseText = `That'll be $${config.DISCOVERY_QUERY_PRICE.toFixed(2)} for the full capability manifest.

Here's how you can tip me:
${methodsText}

Once I receive the payment, I'll send you the complete list of my capabilities, actions, services, and feature flags.`;

      if (callback) {
        await callback({
          text: responseText,
          actions: ['QUERY_CAPABILITIES'],
          source: message.content.source,
        });
      }

      logger.info(
        { agentId: runtime.agentId, entityId, price: config.DISCOVERY_QUERY_PRICE },
        'Requested payment for capability query'
      );

      return {
        success: true,
        text: responseText,
        data: {
          pendingPayment: true,
          price: config.DISCOVERY_QUERY_PRICE,
          paymentMethods: paymentMethods.map((m) => m.id),
        },
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Discovery] Error in QUERY_CAPABILITIES action'
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
        content: { text: 'Give me your full capability list' },
      },
      {
        name: 'Agent',
        content: {
          text: "That'll be $0.25 for the full capability manifest...",
          actions: ['QUERY_CAPABILITIES'],
        },
      },
    ],
    [
      {
        name: 'User',
        content: { text: 'Show me everything you can do' },
      },
      {
        name: 'Agent',
        content: {
          text: 'Here are my full capabilities: ...',
          actions: ['QUERY_CAPABILITIES'],
        },
      },
    ],
  ],
};

export default queryCapabilitiesAction;

