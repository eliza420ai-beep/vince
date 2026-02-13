import { z } from 'zod';

/**
 * Configuration schema for plugin-discovery
 */
export const discoveryConfigSchema = z.object({
  /**
   * Price for detailed capability query in USD
   * Default: 0.25
   */
  DISCOVERY_QUERY_PRICE: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : 0.25))
    .pipe(z.number().min(0).max(100)),

  /**
   * Whether to require payment for detailed queries
   * Default: true
   */
  DISCOVERY_REQUIRE_PAYMENT: z
    .string()
    .optional()
    .transform((val) => val !== 'false')
    .pipe(z.boolean()),

  /**
   * Cooldown between detailed queries from same entity (minutes)
   * Default: 60
   */
  DISCOVERY_QUERY_COOLDOWN_MINS: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 60))
    .pipe(z.number().min(0).max(1440)),
});

export type DiscoveryConfigSchema = z.infer<typeof discoveryConfigSchema>;

/**
 * Get discovery config from environment/settings
 */
export function getDiscoveryConfig(env: Record<string, string | undefined>): DiscoveryConfigSchema {
  return discoveryConfigSchema.parse({
    DISCOVERY_QUERY_PRICE: env.DISCOVERY_QUERY_PRICE,
    DISCOVERY_REQUIRE_PAYMENT: env.DISCOVERY_REQUIRE_PAYMENT,
    DISCOVERY_QUERY_COOLDOWN_MINS: env.DISCOVERY_QUERY_COOLDOWN_MINS,
  });
}

