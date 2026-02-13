import type {
  Evaluator,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { DiscoveryService } from '../services/discovery-service.ts';

/**
 * Patterns that indicate someone is asking for detailed capabilities
 */
const DETAILED_QUERY_PATTERNS = [
  /\b(full|complete|detailed|all)\b.*\b(capabilit|feature|action|what.*do)/i,
  /\b(list|show|give|tell).*\b(everything|all).*\b(can|do|capab)/i,
  /\bmanifest\b/i,
  /\bfull list\b/i,
  /\beverything you.*do\b/i,
  /\ball your.*capabilit/i,
  /\bdetailed.*capabilit/i,
];

/**
 * Patterns that indicate someone is asking about capabilities in general (free summary)
 */
const SUMMARY_QUERY_PATTERNS = [
  /\bwhat can you do\b/i,
  /\bwhat.*your.*capabilit/i,
  /\bwhat.*are you.*capable/i,
  /\bwhat.*you.*help.*with/i,
  /\btell me about yourself/i,
  /\bwho are you\b/i,
  /\bintroduce yourself/i,
];

/**
 * Patterns that indicate checking for specific capability
 */
const SPECIFIC_CAPABILITY_PATTERNS = [
  /\bcan you\b.*\b(trade|swap|stake|post|tweet|dm|follow|search|browse)/i,
  /\bdo you.*support\b.*\b(solana|ethereum|base|polygon)/i,
  /\bdo you have\b.*\b(wallet|memory|knowledge|twitter|discord)/i,
  /\bare you able to\b/i,
  /\bdo you.*capab.*of\b/i,
];

/**
 * CapabilityQueryEvaluator - Detects capability-related questions
 * 
 * This evaluator runs after responses to detect if the user asked about
 * capabilities, and helps guide the payment flow for detailed queries.
 * 
 * Query types:
 * - Summary (free): "What can you do?"
 * - Detailed (paid): "Give me your full capability list"
 * - Specific (free): "Can you trade on Solana?"
 */
export const capabilityQueryEvaluator: Evaluator = {
  name: 'CAPABILITY_QUERY',
  description: 'Detects capability-related questions and guides discovery flow',
  alwaysRun: false, // Only run when relevant

  similes: [
    'capability detector',
    'feature query handler',
    'discovery evaluator',
  ],

  examples: [
    {
      prompt: 'User asks what the agent can do',
      messages: [
        {
          name: 'User',
          content: { text: 'What can you do?' },
        },
        {
          name: 'Agent',
          content: { text: 'I can help with trading, posting, and more.' },
        },
      ],
      outcome: 'Detected summary query, no payment needed',
    },
    {
      prompt: 'User asks for detailed capabilities',
      messages: [
        {
          name: 'User',
          content: { text: 'Give me your full capability list' },
        },
        {
          name: 'Agent',
          content: { text: "That's $0.25 - tip me and I'll send it over." },
        },
      ],
      outcome: 'Detected detailed query, pending payment',
    },
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Only evaluate if we have discovery service
    const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
    if (!discoveryService) {
      return false;
    }

    // Check if the message matches any capability query pattern
    const text = message.content.text || '';
    
    const isDetailedQuery = DETAILED_QUERY_PATTERNS.some((p) => p.test(text));
    const isSummaryQuery = SUMMARY_QUERY_PATTERNS.some((p) => p.test(text));
    const isSpecificQuery = SPECIFIC_CAPABILITY_PATTERNS.some((p) => p.test(text));

    return isDetailedQuery || isSummaryQuery || isSpecificQuery;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult | void> => {
    try {
      const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
      if (!discoveryService) {
        return { success: false, error: 'Discovery service not available' };
      }

      const text = message.content.text || '';
      const entityId = message.entityId;
      const roomId = message.roomId;

      // Determine query type
      const isDetailedQuery = DETAILED_QUERY_PATTERNS.some((p) => p.test(text));
      const isSummaryQuery = SUMMARY_QUERY_PATTERNS.some((p) => p.test(text));
      const isSpecificQuery = SPECIFIC_CAPABILITY_PATTERNS.some((p) => p.test(text));

      if (isDetailedQuery) {
        // User wants detailed capabilities - check if payment required
        const config = discoveryService.getConfig();

        if (config.DISCOVERY_REQUIRE_PAYMENT) {
          // Create pending query
          if (entityId && roomId) {
            const existingQuery = discoveryService.getPendingQuery(entityId);
            
            if (!existingQuery) {
              discoveryService.createPendingQuery(entityId, roomId);
            }

            logger.info(
              { agentId: runtime.agentId, entityId },
              'Created pending capability query awaiting payment'
            );
          }

          return {
            success: true,
            data: {
              queryType: 'detailed',
              requiresPayment: true,
              price: config.DISCOVERY_QUERY_PRICE,
            },
          };
        } else {
          // Payment not required, deliver manifest
          const manifest = discoveryService.buildManifest();
          
          return {
            success: true,
            data: {
              queryType: 'detailed',
              requiresPayment: false,
              manifest,
            },
          };
        }
      }

      if (isSummaryQuery) {
        // Free summary query
        const summary = discoveryService.buildSummary();

        logger.debug(
          { agentId: runtime.agentId, entityId },
          'Handled summary capability query'
        );

        return {
          success: true,
          data: {
            queryType: 'summary',
            summary,
          },
        };
      }

      if (isSpecificQuery) {
        // Specific capability check - extract what they're asking about
        const summary = discoveryService.buildSummary();

        logger.debug(
          { agentId: runtime.agentId, entityId },
          'Handled specific capability query'
        );

        return {
          success: true,
          data: {
            queryType: 'specific',
            flags: summary.featureFlags,
          },
        };
      }

      return { success: true };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Discovery] Error in capability query evaluator'
      );

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export default capabilityQueryEvaluator;

