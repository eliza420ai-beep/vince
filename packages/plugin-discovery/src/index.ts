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
 * ║      Full detailed manifest costs $0.25 (configurable).                   ║
 * ║                                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════════════════
// PLUGIN
// ═══════════════════════════════════════════════════════════════════════════
import { discoveryPlugin } from './plugin.ts';
export { discoveryPlugin };
export default discoveryPlugin;

// ═══════════════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════════════
export { DiscoveryService } from './services/discovery-service.ts';

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════
export { discoveryProvider } from './providers/discovery-provider.ts';

// ═══════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════
export { queryCapabilitiesAction } from './actions/query-capabilities.ts';
export { deliverCapabilitiesAction } from './actions/deliver-capabilities.ts';
export { meshAnnounceAction } from './actions/mesh-announce.ts';
export { discoveryStatusAction, roomStatusAction } from './actions/discovery-diagnostics.ts';

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATORS
// ═══════════════════════════════════════════════════════════════════════════
export { capabilityQueryEvaluator } from './evaluators/capability-query-evaluator.ts';
export { discoveryPersistenceEvaluator } from './evaluators/discovery-persistence-evaluator.ts';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
export * from './types.ts';

// ═══════════════════════════════════════════════════════════════════════════
// FLAGS
// ═══════════════════════════════════════════════════════════════════════════
export {
  FLAG_CATEGORIES,
  STANDARD_FLAGS,
  getStandardFlagNames,
  getFlagsByCategory,
  isStandardFlag,
  getStandardFlagInfo,
} from './flags.ts';
export type { FlagCategory } from './flags.ts';

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
// These utilities allow other plugins to detect capabilities from text,
// action names, and service types. Useful for skill observation.
export {
  CAPABILITY_RULES,
  checkCapabilityRule,
  detectCapabilitiesFromText,
  inferCapabilitiesFromAction,
  inferCapabilitiesFromService,
  getCapabilityRule,
  getCapabilityRulesByCategory,
  getCapabilityCategories,
} from './detection.ts';
export type { CapabilityDetection, CapabilityRule } from './detection.ts';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════
export { discoveryConfigSchema, getDiscoveryConfig } from './config.ts';
export type { DiscoveryConfigSchema } from './config.ts';

