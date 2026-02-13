import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from '@elizaos/core';
import { addHeader, logger } from '@elizaos/core';
import type { DiscoveryService } from '../services/discovery-service.ts';
import { FLAG_CATEGORIES } from '../flags.ts';

/**
 * DiscoveryProvider - Injects capability discovery context into agent prompts
 * 
 * This provider gives the agent self-awareness of its capabilities so it can:
 * - Answer "What can you do?" naturally
 * - Check if it has specific capabilities
 * - Offer paid detailed queries when appropriate
 * 
 * Works alongside plugin-attract's capability collection.
 */
export const discoveryProvider: Provider = {
  name: 'DISCOVERY',
  description: 'Provides capability discovery context for natural conversation',
  position: 55, // After attract (60-80 range), before actions
  dynamic: true,

  get: async (runtime: IAgentRuntime, message: Memory, state: State): Promise<ProviderResult> => {
    try {
      const discoveryService = runtime.getService('discovery') as DiscoveryService | null;

      if (!discoveryService) {
        logger.debug('[Discovery] DiscoveryService not available');
        return {
          text: '',
          values: {},
          data: {},
        };
      }

      // Get summary (lightweight)
      const summary = discoveryService.buildSummary();
      const config = discoveryService.getConfig();

      // Generate natural language summary
      const nlSummary = discoveryService.generateCapabilitySummaryText();

      // Group flags by category for context
      const flagsByCategory: Record<string, string[]> = {};
      for (const category of Object.values(FLAG_CATEGORIES)) {
        const categoryFlags = discoveryService.getFlagsByCategory(category);
        if (categoryFlags.length > 0) {
          flagsByCategory[category] = categoryFlags.map((f) => f.flag);
        }
      }

      // Check if there's a pending query for this entity
      const hasPendingQuery = message.entityId
        ? !!discoveryService.getPendingQuery(message.entityId)
        : false;

      // Build the text section
      const sections = [
        addHeader('# Capability Discovery', ''),
        addHeader('## Your Capabilities (Natural Summary)', nlSummary),
        addHeader('## Feature Flags', summary.featureFlags.join(', ') || 'None declared'),
        addHeader(
          '## Capability Counts',
          [
            `Actions: ${summary.counts.actions}`,
            `Services: ${summary.counts.services}`,
            `Providers: ${summary.counts.providers}`,
            `Plugins: ${summary.counts.plugins}`,
          ].join('\n')
        ),
        addHeader(
          '## Discovery Guidelines',
          [
            'When asked "What can you do?" - give a natural summary of your capabilities',
            'When asked about specific capabilities - check your feature flags and answer honestly',
            `When asked for full/detailed capabilities - this costs $${config.DISCOVERY_QUERY_PRICE.toFixed(2)}`,
            'Be honest about what you can and cannot do',
            "Don't oversell - only claim capabilities you actually have",
          ].join('\n')
        ),
      ];

      // Add pending query context if applicable
      if (hasPendingQuery) {
        sections.push(
          addHeader(
            '## Pending Query',
            `This user has requested detailed capabilities. They need to tip $${config.DISCOVERY_QUERY_PRICE.toFixed(2)} to receive the full manifest.`
          )
        );
      }

      const text = sections.join('\n\n');

      // Build values for template substitution
      const values = {
        capabilitySummary: nlSummary,
        featureFlags: summary.featureFlags.join(', '),
        actionCount: summary.counts.actions,
        serviceCount: summary.counts.services,
        queryPrice: config.DISCOVERY_QUERY_PRICE,
        hasPendingQuery,
      };

      // Build structured data
      const data = {
        summary,
        flagsByCategory,
        config,
        hasPendingQuery,
      };

      return {
        text,
        values,
        data,
      };
    } catch (error) {
      logger.error({ error }, '[Discovery] Error in discoveryProvider');
      return {
        text: 'Error gathering discovery context',
        values: {},
        data: {},
      };
    }
  },
};

export default discoveryProvider;

