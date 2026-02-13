/**
 * @fileoverview Discovery Persistence Evaluator
 * 
 * PURPOSE
 * =======
 * When an agent receives capability information from another agent,
 * this evaluator persists that knowledge to the discovered_agents component.
 * 
 * FLOW
 * ====
 * 1. Agent A asks Agent B "What can you do?" (QUERY_CAPABILITIES)
 * 2. Agent B responds with their manifest (DELIVER_CAPABILITIES)
 * 3. This evaluator detects the capability response
 * 4. Agent A saves Agent B's capabilities to discovered_agents component
 * 
 * DETECTION
 * =========
 * We look for:
 * - Messages containing structured capability data (JSON manifest)
 * - Messages with feature flags patterns
 * - Messages that appear to be capability responses
 */

import type {
  Evaluator,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { DiscoveryService } from '../services/discovery-service.ts';
import type { CapabilityManifest } from '../types.ts';

/**
 * Try to parse a capability manifest from message text.
 * Returns null if the message doesn't contain parseable capability data.
 */
function parseManifestFromMessage(text: string): CapabilityManifest | null {
  // Try to find JSON in the message
  const jsonMatch = text.match(/\{[\s\S]*"featureFlags"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.featureFlags && Array.isArray(parsed.featureFlags)) {
        return parsed as CapabilityManifest;
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  return null;
}

/**
 * Extract feature flags from natural language capability response.
 * Used when we can't find structured JSON but the message describes capabilities.
 */
function extractFlagsFromText(text: string): string[] {
  const flags: string[] = [];
  const lowerText = text.toLowerCase();

  // Map common phrases to flags
  const phraseToFlag: Record<string, string> = {
    'i can trade': 'can-trade',
    'i can swap': 'can-swap',
    'i can stake': 'can-stake',
    'i can post': 'can-post',
    'i can tweet': 'can-post',
    'accept payments': 'accepts-payments',
    'receive payments': 'accepts-payments',
    'i have a wallet': 'has-wallet',
    'wallet integration': 'has-wallet',
    'connected to twitter': 'has-twitter',
    'connected to discord': 'has-discord',
    'connected to telegram': 'has-telegram',
    'search the web': 'can-search-web',
    'browse websites': 'can-browse',
    'generate images': 'can-generate-images',
    'create images': 'can-generate-images',
    'transcribe audio': 'can-transcribe',
    'process video': 'can-process-video',
    'read pdf': 'can-read-pdf',
    'send email': 'can-send-email',
    'solana': 'supports-solana',
    'ethereum': 'supports-ethereum',
    'homeostasis': 'has-homeostasis',
    'internal state': 'has-homeostasis',
  };

  for (const [phrase, flag] of Object.entries(phraseToFlag)) {
    if (lowerText.includes(phrase) && !flags.includes(flag)) {
      flags.push(flag);
    }
  }

  // Also look for explicit flag patterns like "can-trade" or "has-wallet"
  // Handle both word-bounded and comma/space-separated formats
  const flagPattern = /(?:^|[\s,🏷️])((can|has|supports|accepts)-[a-z-]+)/gi;
  let match;
  while ((match = flagPattern.exec(text)) !== null) {
    const flag = match[1].toLowerCase();
    if (!flags.includes(flag)) {
      flags.push(flag);
    }
  }

  return flags;
}

/**
 * Patterns that indicate this is a capability response from another agent
 */
const CAPABILITY_RESPONSE_PATTERNS = [
  /\bhere are my.*capabilit/i,
  /\bmy capabilities include/i,
  /\bi can help with/i,
  /\bfeature flags/i,
  /\bactions.*services/i,
  /\bfull capability manifest/i,
  /\bhere's what i can do/i,
  /\bmy capabilities:/i,
  // Mesh announce patterns
  /\*\*\w+\*\*.*here!/i,           // **AgentName** here!
  /🏷️.*(?:can|has|supports)-/i,    // 🏷️ can-trade, has-wallet
  /📦.*\d+\s*actions/i,             // 📦 12 actions
  /\bhere!.*i can\b/i,              // here! I can trade
];

/**
 * DiscoveryPersistenceEvaluator - Saves learned agent capabilities
 * 
 * Runs after messages to detect capability information from other agents
 * and persist it for future reference.
 */
export const discoveryPersistenceEvaluator: Evaluator = {
  name: 'DISCOVERY_PERSISTENCE',
  description: 'Persists discovered agent capabilities from conversations',
  alwaysRun: true, // Must run on every message to catch capability announcements

  similes: [
    'capability saver',
    'discovery recorder',
    'agent capability learner',
  ],

  examples: [
    {
      prompt: 'Agent receives capabilities from another agent',
      messages: [
        {
          name: 'AgentA',
          content: { text: 'What can you do?' },
        },
        {
          name: 'AgentB',
          content: { 
            text: 'Here are my capabilities: I can trade tokens, search the web, and generate images.',
          },
        },
      ],
      outcome: 'Saved AgentB capabilities: can-trade, can-search-web, can-generate-images',
    },
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Only evaluate messages from OTHER entities (not ourselves)
    if (message.entityId === runtime.agentId) {
      return false;
    }

    // Need discovery service
    const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
    if (!discoveryService) {
      return false;
    }

    const text = message.content.text || '';

    // Check if this looks like a capability response
    const isCapabilityResponse = CAPABILITY_RESPONSE_PATTERNS.some((p) => p.test(text));
    
    // Also check for structured manifest data
    const hasManifest = parseManifestFromMessage(text) !== null;
    
    // Or has detectable capability mentions
    const extractedFlags = extractFlagsFromText(text);
    const hasMentionedCapabilities = extractedFlags.length >= 2; // At least 2 to avoid false positives

    return isCapabilityResponse || hasManifest || hasMentionedCapabilities;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<{ success: boolean; data?: any; error?: Error }> => {
    try {
      const discoveryService = runtime.getService('discovery') as DiscoveryService | null;
      if (!discoveryService) {
        return { success: false, error: new Error('Discovery service not available') };
      }

      const text = message.content.text || '';
      const senderEntityId = message.entityId;
      const roomId = message.roomId;

      if (!senderEntityId) {
        return { success: false, error: new Error('No sender entity ID') };
      }

      // Check if the sender is an agent
      const senderEntity = await runtime.getEntityById(senderEntityId);
      if (!senderEntity) {
        logger.debug(
          { agentId: runtime.agentId, entityId: senderEntityId },
          'Could not find sender entity for discovery persistence'
        );
        return { success: true, data: { skipped: true, reason: 'Entity not found' } };
      }

      // Check if message looks like it's from an agent (mesh announce format)
      const looksLikeAgentAnnounce = /\*\*\w+\*\*\s*here!/i.test(text) || 
                                     /🏷️.*(?:can|has|supports)-/i.test(text);

      // Only skip if it's definitely not an agent AND doesn't look like an agent announce
      if (!discoveryService.isAgent(senderEntity) && !looksLikeAgentAnnounce) {
        return { success: true, data: { skipped: true, reason: 'Sender is not an agent' } };
      }

      // Try to extract capabilities
      let capabilities: string[] = [];
      let agentName = senderEntity.names?.[0] || 'Unknown Agent';

      // First try structured manifest
      const manifest = parseManifestFromMessage(text);
      if (manifest) {
        capabilities = manifest.featureFlags.map((f) => 
          typeof f === 'string' ? f : f.flag
        );
        if (manifest.agentName) {
          agentName = manifest.agentName;
        }
      } else {
        // Fall back to text extraction
        capabilities = extractFlagsFromText(text);
      }

      if (capabilities.length === 0) {
        logger.debug(
          { agentId: runtime.agentId, entityId: senderEntityId },
          'No capabilities extracted from message'
        );
        return { success: true, data: { skipped: true, reason: 'No capabilities found' } };
      }

      // Record the discovered agent
      await discoveryService.recordDiscoveredAgent({
        agentId: senderEntityId,
        name: agentName,
        capabilities,
        source: 'conversation',
        roomId,
      });

      logger.info(
        {
          agentId: runtime.agentId,
          discoveredAgentId: senderEntityId,
          discoveredAgentName: agentName,
          capabilityCount: capabilities.length,
          capabilities,
        },
        'Persisted discovered agent capabilities from conversation'
      );

      return {
        success: true,
        data: {
          discoveredAgentId: senderEntityId,
          discoveredAgentName: agentName,
          capabilities,
          source: manifest ? 'manifest' : 'text_extraction',
        },
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        '[Discovery] Error in discovery persistence evaluator'
      );

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};

export default discoveryPersistenceEvaluator;

