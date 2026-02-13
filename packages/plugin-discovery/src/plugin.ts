/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                                                                           ║
 * ║                      @elizaos/plugin-discovery                            ║
 * ║                                                                           ║
 * ║      Capability discovery for the elizaOS ecosystem                       ║
 * ║                                                                           ║
 * ║      Discovery happens through conversation - humans and agents ask       ║
 * ║      "What can you do?" and get natural language responses.               ║
 * ║                                                                           ║
 * ║      Basic capability summary is free.                                    ║
 * ║      Full detailed manifest costs $0.25.                                  ║
 * ║                                                                           ║
 * ║      Depends on:                                                          ║
 * ║      - plugin-attract (capability collection)                             ║
 * ║      - plugin-commerce (payment handling)                                 ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { logger, type Plugin, type IAgentRuntime } from '@elizaos/core';
import { printBanner } from './banner.ts';
import { DiscoveryService } from './services/discovery-service.ts';
import { discoveryProvider } from './providers/discovery-provider.ts';
import { discoveryInstructionsProvider, discoverySettingsProvider } from './providers/plugin-info.ts';
import { capabilityQueryEvaluator } from './evaluators/capability-query-evaluator.ts';
import { discoveryPersistenceEvaluator } from './evaluators/discovery-persistence-evaluator.ts';
import { queryCapabilitiesAction } from './actions/query-capabilities.ts';
import { deliverCapabilitiesAction } from './actions/deliver-capabilities.ts';
import { meshAnnounceAction } from './actions/mesh-announce.ts';
import { discoveryStatusAction, roomStatusAction } from './actions/discovery-diagnostics.ts';
import { commerceEventHandlers } from './events/commerce-handler.ts';
import { discoveryConfigSchema } from './config.ts';

export const discoveryPlugin: Plugin = {
  name: '@elizaos/plugin-discovery',
  description:
    'Capability discovery for elizaOS agents. Enables conversational discovery of agent capabilities with paid detailed queries.',

  // Optional: install @elizaos/plugin-attract and @elizaos/plugin-commerce for paid manifest + capability collection.
  // With DISCOVERY_REQUIRE_PAYMENT=false, discovery works without them; core would try to load and warn if missing.
  dependencies: [],

  // Feature flags this plugin provides
  featureFlags: ['has-discovery', 'can-describe-capabilities'],

  // Configuration
  config: {
    DISCOVERY_QUERY_PRICE: process.env.DISCOVERY_QUERY_PRICE,
    DISCOVERY_REQUIRE_PAYMENT: process.env.DISCOVERY_REQUIRE_PAYMENT,
    DISCOVERY_QUERY_COOLDOWN_MINS: process.env.DISCOVERY_QUERY_COOLDOWN_MINS,
  },

  // Plugin initialization
  async init(config: Record<string, string>, runtime: IAgentRuntime): Promise<void> {
    try {
      // Validate config
      const validatedConfig = discoveryConfigSchema.parse(config);

      printBanner({
        runtime,
        settings: [
          { name: 'DISCOVERY_QUERY_PRICE', value: validatedConfig.DISCOVERY_QUERY_PRICE, defaultValue: 0.25 },
          { name: 'DISCOVERY_REQUIRE_PAYMENT', value: validatedConfig.DISCOVERY_REQUIRE_PAYMENT, defaultValue: true },
          { name: 'DISCOVERY_QUERY_COOLDOWN_MINS', value: validatedConfig.DISCOVERY_QUERY_COOLDOWN_MINS, defaultValue: 60 },
        ],
      });

      // Set environment variables
      for (const [key, value] of Object.entries(validatedConfig)) {
        if (value !== undefined) {
          process.env[key] = String(value);
        }
      }

      logger.info(
        {
          agentId: runtime.agentId,
          queryPrice: validatedConfig.DISCOVERY_QUERY_PRICE,
          requirePayment: validatedConfig.DISCOVERY_REQUIRE_PAYMENT,
        },
        'Discovery plugin initialized'
      );
    } catch (error) {
      if (error instanceof Error) {
        logger.error(
          { agentId: runtime.agentId, error: error.message },
          'Failed to initialize discovery plugin'
        );
        throw new Error(`Invalid discovery configuration: ${error.message}`);
      }
      throw error;
    }
  },

  // Services
  services: [DiscoveryService],

  // Providers
  providers: [discoveryProvider, discoveryInstructionsProvider, discoverySettingsProvider],

  // Evaluators
  evaluators: [capabilityQueryEvaluator, discoveryPersistenceEvaluator],

  // Actions
  actions: [
    queryCapabilitiesAction, 
    deliverCapabilitiesAction, 
    meshAnnounceAction,
    discoveryStatusAction,
    roomStatusAction,
  ],

  // Event handlers
  events: {
    ...commerceEventHandlers,
  },

  // Component types for data storage
  componentTypes: [
    {
      name: 'discovered_agents',
      schema: {
        agents: {
          type: 'object',
          description: 'Map of agentId -> DiscoveredAgentRecord',
          additionalProperties: {
            type: 'object',
            properties: {
              agentId: { type: 'string' },
              name: { type: 'string' },
              capabilities: { type: 'array', items: { type: 'string' } },
              verifiedCapabilities: { type: 'array', items: { type: 'string' } },
              failedCapabilities: { type: 'array', items: { type: 'string' } },
              discoveredAt: { type: 'number' },
              lastInteractionAt: { type: 'number' },
              verificationLevel: { type: 'string', enum: ['claimed', 'verified', 'failed'] },
              source: { type: 'string', enum: ['conversation', 'observation', 'referral'] },
              discoveredInRoom: { type: 'string' },
              notes: { type: 'string' },
            },
          },
        },
        updatedAt: { type: 'number' },
      },
    },
  ],
};

export default discoveryPlugin;

