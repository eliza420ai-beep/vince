import { Service, logger, type IAgentRuntime, type UUID, type Entity } from '@elizaos/core';
import type {
  FeatureFlag,
  CapabilityManifest,
  CapabilitySummary,
  ActionCapability,
  ServiceCapability,
  ProviderCapability,
  DiscoveryConfig,
  PendingQuery,
  DiscoveredAgentRecord,
  DiscoveredAgentsData,
  DiscoverAgentInput,
  DiscoveredAgentQueryOptions,
  VerificationLevel,
} from '../types.ts';
import { getStandardFlagInfo, isStandardFlag } from '../flags.ts';
import type { SkillsService, SkillEntry, SkillSource_Provider } from '@elizaos/plugin-skills';

/** Component type for storing discovered agents */
const DISCOVERED_AGENTS_COMPONENT = 'discovered_agents';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DiscoveryConfig = {
  DISCOVERY_QUERY_PRICE: 0.25,
  DISCOVERY_REQUIRE_PAYMENT: true,
  DISCOVERY_QUERY_COOLDOWN_MINS: 60,
};

/**
 * DiscoveryService - Core capability discovery engine
 * 
 * Responsibilities:
 * - Collect feature flags from all loaded plugins
 * - Infer flags from action/service names
 * - Build capability manifests for paid queries
 * - Build capability summaries for free queries
 * - Track pending queries awaiting payment
 */
export class DiscoveryService extends Service {
  static serviceType = 'discovery';

  public readonly capabilityDescription = 'Provides capability discovery and feature flag management';

  private config: DiscoveryConfig;
  private cachedManifest: CapabilityManifest | null = null;
  private manifestCacheTime: number = 0;
  private readonly CACHE_TTL_MS = 60000; // 1 minute cache
  private pendingQueries: Map<UUID, PendingQuery> = new Map();

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.config = this.loadConfig();
  }

  static async start(runtime: IAgentRuntime): Promise<DiscoveryService> {
    logger.info({ agentId: runtime.agentId }, 'Starting DiscoveryService');
    const service = new DiscoveryService(runtime);

    // Progressive enhancement: Register with plugin-skills if available
    // This makes discovered capabilities visible cross-domain as skills
    service.registerWithSkillsPlugin();

    return service;
  }

  /**
   * Register discovered capabilities with plugin-skills (progressive enhancement)
   *
   * WHY REGISTER WITH PLUGIN-SKILLS?
   * ================================
   * When plugin-skills is available, discovered capabilities become skills:
   *
   * 1. UNIFIED NAMESPACE: Feature flags like 'can-trade' become 'discovery:can-trade'
   *    in the global skill registry. This prevents confusion across domains.
   *
   * 2. CROSS-DOMAIN VISIBILITY: Other plugins can query "what can this agent do?"
   *    and see capabilities discovered from conversation.
   *
   * 3. CAPABILITY MATCHING: When looking for an agent that can trade, we can
   *    search skills for 'discovery:can-trade'.
   *
   * WHY PROGRESSIVE ENHANCEMENT?
   * ============================
   * Discovery works perfectly fine without plugin-skills - it has its own
   * manifest and summary system. But when plugin-skills IS available,
   * capabilities become queryable cross-domain.
   */
  private registerWithSkillsPlugin(): void {
    // WHY 'as unknown as': TypeScript's Service base type doesn't include
    // our specific methods. This is safe because we check for undefined.
    const skillsService = this.runtime.getService('skills') as unknown as SkillsService | undefined;

    if (!skillsService) {
      logger.debug(
        { agentId: this.runtime.agentId },
        '[DiscoveryService] plugin-skills not available, capabilities remain local'
      );
      return;
    }

    const discoveryService = this;

    skillsService.registerSource({
      domain: 'discovery',
      displayName: 'Agent Capabilities',

      /**
       * Get all discovered feature flags as skills.
       *
       * WHY THIS APPROACH:
       * - Feature flags represent capabilities (can-trade, has-wallet, etc.)
       * - They're already semantic and well-defined
       * - Converting to skills makes them queryable cross-domain
       */
      getSkills(): SkillEntry[] {
        const flags = discoveryService.collectFeatureFlags();

        return flags.map((flag) => ({
          // WHY NAMESPACED ID: 'discovery:can-trade' is unambiguous
          // Different from 'hyperscape:trading' or 'jobsearch:can-trade'
          id: `discovery:${flag.flag}`,
          domain: 'discovery',
          name: flag.flag,
          displayName: flag.flag
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          description: flag.description,
          level: {
            // For capabilities, they're binary (you have it or you don't)
            // We use 'expert' to indicate full capability
            category: 'expert' as const,
            numeric: 100,
          },
          active: true, // Active capabilities
          metadata: {
            category: flag.category,
            source: flag.source,
            isCapability: true, // Marker that this is a capability flag
          },
        }));
      },

      /**
       * Get a specific capability by flag name.
       */
      getSkill(skillName: string): SkillEntry | null {
        const flags = discoveryService.collectFeatureFlags();
        const flag = flags.find((f) => f.flag === skillName);

        if (!flag) return null;

        return {
          id: `discovery:${flag.flag}`,
          domain: 'discovery',
          name: flag.flag,
          displayName: flag.flag
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          description: flag.description,
          level: {
            category: 'expert',
            numeric: 100,
          },
          active: true,
          metadata: {
            category: flag.category,
            source: flag.source,
            isCapability: true,
          },
        };
      },

      /**
       * Check if a capability exists.
       */
      hasSkill(skillName: string, _minLevel?: number): boolean {
        return discoveryService.hasFlag(skillName);
      },
    });

    logger.info(
      { agentId: this.runtime.agentId },
      '[DiscoveryService] Progressive enhancement: registered capabilities with plugin-skills'
    );
  }

  async stop(): Promise<void> {
    logger.info({ agentId: this.runtime.agentId }, 'Stopping DiscoveryService');
    this.pendingQueries.clear();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  private loadConfig(): DiscoveryConfig {
    return {
      DISCOVERY_QUERY_PRICE: parseFloat(
        this.runtime.getSetting('DISCOVERY_QUERY_PRICE') || String(DEFAULT_CONFIG.DISCOVERY_QUERY_PRICE)
      ),
      DISCOVERY_REQUIRE_PAYMENT:
        this.runtime.getSetting('DISCOVERY_REQUIRE_PAYMENT') !== 'false',
      DISCOVERY_QUERY_COOLDOWN_MINS: parseInt(
        this.runtime.getSetting('DISCOVERY_QUERY_COOLDOWN_MINS') ||
        String(DEFAULT_CONFIG.DISCOVERY_QUERY_COOLDOWN_MINS),
        10
      ),
    };
  }

  getConfig(): DiscoveryConfig {
    return { ...this.config };
  }

  getQueryPrice(): number {
    return this.config.DISCOVERY_QUERY_PRICE;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURE FLAG COLLECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Collect all feature flags from loaded plugins.
   * Combines declared flags with inferred flags from action/service names.
   */
  collectFeatureFlags(): FeatureFlag[] {
    const flags: Map<string, FeatureFlag> = new Map();

    // 1. Collect declared flags from plugins
    for (const plugin of this.runtime.plugins) {
      if (plugin.featureFlags && Array.isArray(plugin.featureFlags)) {
        for (const flag of plugin.featureFlags) {
          const flagName = typeof flag === 'string' ? flag : flag;
          const standardInfo = getStandardFlagInfo(flagName);

          flags.set(flagName, {
            flag: flagName,
            description: standardInfo?.description || `Capability from ${plugin.name}`,
            category: standardInfo?.category,
            source: plugin.name,
          });
        }
      }
    }

    // 2. Infer flags from loaded services
    const services = this.runtime.getAllServices();
    for (const [serviceType] of services) {
      const inferredFlags = this.inferFlagsFromServiceType(serviceType);
      for (const flag of inferredFlags) {
        if (!flags.has(flag.flag)) {
          flags.set(flag.flag, flag);
        }
      }
    }

    // 3. Infer flags from registered actions
    for (const action of this.runtime.actions) {
      const inferredFlags = this.inferFlagsFromAction(action.name);
      for (const flag of inferredFlags) {
        if (!flags.has(flag.flag)) {
          flags.set(flag.flag, flag);
        }
      }
    }

    return Array.from(flags.values());
  }

  /**
   * Infer feature flags from service type
   */
  private inferFlagsFromServiceType(serviceType: string): FeatureFlag[] {
    const flags: FeatureFlag[] = [];
    const type = serviceType.toLowerCase();

    // Map service types to flags
    const serviceToFlags: Record<string, string[]> = {
      commerce: ['accepts-payments', 'has-commerce'],
      wallet: ['has-wallet'],
      transcription: ['can-transcribe'],
      video: ['can-process-video'],
      browser: ['can-browse'],
      pdf: ['can-read-pdf'],
      web_search: ['can-search-web'],
      email: ['can-send-email'],
      tee: ['has-tee'],
      twitter: ['has-twitter'],
      discord: ['has-discord'],
      telegram: ['has-telegram'],
    };

    const matchedFlags = serviceToFlags[type] || [];
    for (const flagName of matchedFlags) {
      const standardInfo = getStandardFlagInfo(flagName);
      flags.push({
        flag: flagName,
        description: standardInfo?.description || `Inferred from ${serviceType} service`,
        category: standardInfo?.category,
        source: `service:${serviceType}`,
      });
    }

    return flags;
  }

  /**
   * Infer feature flags from action name
   */
  private inferFlagsFromAction(actionName: string): FeatureFlag[] {
    const flags: FeatureFlag[] = [];
    const name = actionName.toLowerCase();

    // Map action patterns to flags
    const actionPatterns: { pattern: RegExp; flags: string[] }[] = [
      { pattern: /swap|trade|exchange/i, flags: ['can-swap', 'can-trade'] },
      { pattern: /stake|unstake/i, flags: ['can-stake'] },
      { pattern: /post|tweet/i, flags: ['can-post'] },
      { pattern: /dm|message/i, flags: ['can-dm'] },
      { pattern: /follow/i, flags: ['can-follow'] },
      { pattern: /generate.*image|image.*generate/i, flags: ['can-generate-images'] },
      { pattern: /search.*web|web.*search/i, flags: ['can-search-web'] },
      { pattern: /send.*email|email/i, flags: ['can-send-email'] },
      { pattern: /quote|pricing/i, flags: ['can-quote'] },
      { pattern: /invoice/i, flags: ['can-invoice'] },
    ];

    for (const { pattern, flags: flagNames } of actionPatterns) {
      if (pattern.test(name)) {
        for (const flagName of flagNames) {
          const standardInfo = getStandardFlagInfo(flagName);
          flags.push({
            flag: flagName,
            description: standardInfo?.description || `Inferred from ${actionName} action`,
            category: standardInfo?.category,
            source: `action:${actionName}`,
          });
        }
      }
    }

    return flags;
  }

  /**
   * Check if the agent has a specific feature flag
   */
  hasFlag(flag: string): boolean {
    const flags = this.collectFeatureFlags();
    return flags.some((f) => f.flag === flag);
  }

  /**
   * Get all flags in a category
   */
  getFlagsByCategory(category: string): FeatureFlag[] {
    const flags = this.collectFeatureFlags();
    return flags.filter((f) => f.category === category);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY COLLECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Collect action capabilities
   */
  private collectActions(): ActionCapability[] {
    const actions: ActionCapability[] = [];

    for (const action of this.runtime.actions) {
      // Skip internal/meta actions
      if (
        action.name.startsWith('ATTRACT') ||
        action.name === 'IGNORE' ||
        action.name === 'NONE' ||
        action.name === 'CONTINUE'
      ) {
        continue;
      }

      actions.push({
        name: action.name,
        description: action.description || `Action: ${action.name}`,
        similes: action.similes,
      });
    }

    return actions;
  }

  /**
   * Collect service capabilities
   */
  private collectServices(): ServiceCapability[] {
    const services: ServiceCapability[] = [];
    const allServices = this.runtime.getAllServices();

    for (const [serviceType, serviceArray] of allServices) {
      if (serviceArray && serviceArray.length > 0) {
        const service = serviceArray[0];
        services.push({
          type: serviceType,
          description: service.capabilityDescription || `Service: ${serviceType}`,
        });
      }
    }

    return services;
  }

  /**
   * Collect provider capabilities
   */
  private collectProviders(): ProviderCapability[] {
    const providers: ProviderCapability[] = [];

    for (const provider of this.runtime.providers) {
      // Skip private/internal providers
      if (provider.private) {
        continue;
      }

      providers.push({
        name: provider.name,
        description: provider.description,
      });
    }

    return providers;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANIFEST BUILDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build full capability manifest (paid query)
   */
  buildManifest(): CapabilityManifest {
    const now = Date.now();

    // Return cached manifest if still valid
    if (this.cachedManifest && now - this.manifestCacheTime < this.CACHE_TTL_MS) {
      return this.cachedManifest;
    }

    const bio = this.runtime.character.bio;
    const bioString = Array.isArray(bio) ? bio.join(' ') : bio;

    const manifest: CapabilityManifest = {
      agentId: this.runtime.agentId,
      agentName: this.runtime.character.name,
      bio: bioString,
      featureFlags: this.collectFeatureFlags(),
      capabilities: {
        actions: this.collectActions(),
        services: this.collectServices(),
        providers: this.collectProviders(),
      },
      plugins: this.runtime.plugins.map((p) => p.name),
      generatedAt: now,
    };

    // Cache the manifest
    this.cachedManifest = manifest;
    this.manifestCacheTime = now;

    logger.debug(
      {
        agentId: this.runtime.agentId,
        flagCount: manifest.featureFlags.length,
        actionCount: manifest.capabilities.actions.length,
        serviceCount: manifest.capabilities.services.length,
      },
      'Built capability manifest'
    );

    return manifest;
  }

  /**
   * Build capability summary (free query)
   */
  buildSummary(): CapabilitySummary {
    const manifest = this.buildManifest();

    return {
      agentId: manifest.agentId,
      agentName: manifest.agentName,
      bio: manifest.bio,
      featureFlags: manifest.featureFlags.map((f) => f.flag),
      counts: {
        actions: manifest.capabilities.actions.length,
        services: manifest.capabilities.services.length,
        providers: manifest.capabilities.providers.length,
        plugins: manifest.plugins.length,
      },
      upgradePrompt: `Want the full detailed list? That's $${this.config.DISCOVERY_QUERY_PRICE.toFixed(2)} - just tip me.`,
      queryPrice: this.config.DISCOVERY_QUERY_PRICE,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING QUERY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a pending query awaiting payment
   */
  createPendingQuery(entityId: UUID, roomId: UUID): PendingQuery {
    const query: PendingQuery = {
      id: crypto.randomUUID() as UUID,
      entityId,
      roomId,
      requestedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      price: this.config.DISCOVERY_QUERY_PRICE,
    };

    this.pendingQueries.set(query.id, query);

    // Also store by entityId for easy lookup
    this.pendingQueries.set(entityId, query);

    logger.info(
      { agentId: this.runtime.agentId, queryId: query.id, entityId },
      'Created pending capability query'
    );

    return query;
  }

  /**
   * Get pending query for an entity
   */
  getPendingQuery(entityId: UUID): PendingQuery | undefined {
    const query = this.pendingQueries.get(entityId);

    // Check if expired
    if (query && query.expiresAt < Date.now()) {
      this.pendingQueries.delete(entityId);
      this.pendingQueries.delete(query.id);
      return undefined;
    }

    return query;
  }

  /**
   * Complete a pending query (after payment)
   */
  completePendingQuery(entityId: UUID): CapabilityManifest | null {
    const query = this.getPendingQuery(entityId);

    if (!query) {
      return null;
    }

    // Remove the pending query
    this.pendingQueries.delete(entityId);
    this.pendingQueries.delete(query.id);

    logger.info(
      { agentId: this.runtime.agentId, queryId: query.id, entityId },
      'Completed capability query'
    );

    return this.buildManifest();
  }

  /**
   * Clean up expired pending queries
   */
  cleanupExpiredQueries(): void {
    const now = Date.now();
    const toDelete: UUID[] = [];

    for (const [id, query] of this.pendingQueries) {
      if (query.expiresAt < now) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.pendingQueries.delete(id);
    }

    if (toDelete.length > 0) {
      logger.debug(
        { agentId: this.runtime.agentId, count: toDelete.length },
        'Cleaned up expired pending queries'
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NATURAL LANGUAGE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Generate a natural language summary of capabilities
   */
  generateCapabilitySummaryText(): string {
    const summary = this.buildSummary();
    const flags = summary.featureFlags;

    // Group flags by common prefixes for natural language
    const canDo = flags.filter((f) => f.startsWith('can-')).map((f) => f.replace('can-', ''));
    const supports = flags.filter((f) => f.startsWith('supports-')).map((f) => f.replace('supports-', ''));
    const has = flags.filter((f) => f.startsWith('has-')).map((f) => f.replace('has-', ''));

    const parts: string[] = [];

    if (canDo.length > 0) {
      parts.push(`I can ${canDo.slice(0, 5).join(', ')}${canDo.length > 5 ? ', and more' : ''}`);
    }

    if (supports.length > 0) {
      parts.push(`I support ${supports.join(', ')}`);
    }

    if (has.length > 0) {
      parts.push(`I have ${has.join(', ')}`);
    }

    if (parts.length === 0) {
      return "I'm a helpful agent with various capabilities.";
    }

    return parts.join('. ') + '.';
  }

  /**
   * Format manifest for display in chat
   */
  formatManifestForChat(manifest: CapabilityManifest): string {
    const sections: string[] = [];

    // Feature flags
    if (manifest.featureFlags.length > 0) {
      const flagList = manifest.featureFlags.map((f) => f.flag).join(', ');
      sections.push(`**Feature Flags:** ${flagList}`);
    }

    // Actions
    if (manifest.capabilities.actions.length > 0) {
      const actionLines = manifest.capabilities.actions
        .slice(0, 15) // Limit to avoid spam
        .map((a) => `• ${a.name} - ${a.description}`);
      if (manifest.capabilities.actions.length > 15) {
        actionLines.push(`• ... and ${manifest.capabilities.actions.length - 15} more`);
      }
      sections.push(`**Actions:**\n${actionLines.join('\n')}`);
    }

    // Services
    if (manifest.capabilities.services.length > 0) {
      const serviceLines = manifest.capabilities.services
        .map((s) => `• ${s.type} - ${s.description}`);
      sections.push(`**Services:**\n${serviceLines.join('\n')}`);
    }

    // Plugins
    if (manifest.plugins.length > 0) {
      sections.push(`**Plugins:** ${manifest.plugins.join(', ')}`);
    }

    return sections.join('\n\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURAL DISCOVERY - Entity Classification
  // ═══════════════════════════════════════════════════════════════════════════
  // These methods help identify WHO is in a room and WHAT type of entity they are.
  // No database calls for classification - just data inspection.

  /**
   * Check if an entity is an agent.
   * 
   * In elizaOS, agents have entity.id === entity.agentId (they reference themselves).
   * Humans have entity.agentId pointing to the agent they're associated with.
   * 
   * @param entity - The entity to check
   * @returns true if the entity is an agent
   */
  isAgent(entity: Entity): boolean {
    return Boolean(entity.id && entity.agentId && entity.id === entity.agentId);
  }

  /**
   * Check if an entity is a human (not an agent).
   * 
   * @param entity - The entity to check
   * @returns true if the entity is a human
   */
  isHuman(entity: Entity): boolean {
    return Boolean(entity.id && entity.agentId && entity.id !== entity.agentId);
  }

  /**
   * Check if an entity has a specific component type.
   * 
   * @param entity - The entity to check (must have components loaded)
   * @param componentType - The component type to look for
   * @returns true if the entity has the component
   */
  hasComponent(entity: Entity, componentType: string): boolean {
    return entity.components?.some((c) => c.type === componentType) ?? false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURAL DISCOVERY - Room Queries
  // ═══════════════════════════════════════════════════════════════════════════
  // These methods query entities in a room and filter by criteria.

  /**
   * Get all entities in a room with their components.
   * 
   * @param roomId - The room to query
   * @returns Array of entities in the room
   */
  async getEntitiesInRoom(roomId: UUID): Promise<Entity[]> {
    return this.runtime.getEntitiesForRoom(roomId, true);
  }

  /**
   * Get all agent entities in a room.
   * 
   * Uses a multi-strategy approach:
   * 1. Structural discovery via getEntitiesForRoom
   * 2. If that fails, checks room participants against discovered agents
   * 
   * @param roomId - The room to query
   * @param excludeSelf - Whether to exclude this agent (default: true)
   * @returns Array of agent entities (or pseudo-entities from discovered data)
   */
  async getAgentsInRoom(roomId: UUID, excludeSelf = true): Promise<Entity[]> {
    // Strategy 1: Structural discovery
    const entities = await this.getEntitiesInRoom(roomId);

    let agents = entities.filter((e) =>
      this.isAgent(e) && (!excludeSelf || e.id !== this.runtime.agentId)
    );

    if (agents.length > 0) {
      return agents;
    }

    // Strategy 2: Check room participants against discovered agents
    const participants = await this.runtime.getParticipantsForRoom(roomId);
    const discoveredAgents = await this.getDiscoveredAgents();

    // Build pseudo-entities from discovered agent data for participants we know about
    const knownAgents: Entity[] = [];

    for (const participantId of participants) {
      if (excludeSelf && participantId === this.runtime.agentId) {
        continue;
      }

      // Check if this participant is in our discovered agents
      const discovered = discoveredAgents.find(d => d.agentId === participantId);
      if (discovered) {
        // Create a pseudo-entity from discovered data
        knownAgents.push({
          id: discovered.agentId,
          agentId: discovered.agentId, // This makes isAgent() return true
          names: [discovered.name],
        } as Entity);

        logger.debug(
          { participantId, name: discovered.name },
          'Found participant in discovered agents'
        );
      }
    }

    if (knownAgents.length > 0) {
      logger.info(
        { roomId, agentCount: knownAgents.length, names: knownAgents.map(a => a.names?.[0]) },
        'Found agents via learned discovery'
      );
    } else {
      logger.debug(
        {
          roomId,
          participantCount: participants.length,
          discoveredCount: discoveredAgents.length,
        },
        'No agents found via structural or learned discovery'
      );
    }

    return knownAgents;
  }

  /**
   * Get all human entities in a room.
   * 
   * @param roomId - The room to query
   * @returns Array of human entities
   */
  async getHumansInRoom(roomId: UUID): Promise<Entity[]> {
    const entities = await this.getEntitiesInRoom(roomId);
    return entities.filter((e) => this.isHuman(e));
  }

  /**
   * Get entities that have a specific component type.
   * 
   * This is the foundation for capability-based queries.
   * Example: Find all entities with 'vendor_inventory' component.
   * 
   * @param componentType - The component type to filter by
   * @param roomId - The room to query
   * @param excludeSelf - Whether to exclude this agent (default: true)
   * @returns Array of entities with the component
   */
  async getEntitiesWithComponent(
    componentType: string,
    roomId: UUID,
    excludeSelf = true
  ): Promise<Entity[]> {
    const entities = await this.getEntitiesInRoom(roomId);
    return entities.filter((e) =>
      this.hasComponent(e, componentType) &&
      (!excludeSelf || e.id !== this.runtime.agentId)
    );
  }

  /**
   * Get agents that have a specific component type.
   * 
   * @param componentType - The component type to filter by
   * @param roomId - The room to query
   * @param excludeSelf - Whether to exclude this agent (default: true)
   * @returns Array of agent entities with the component
   */
  async getAgentsWithComponent(
    componentType: string,
    roomId: UUID,
    excludeSelf = true
  ): Promise<Entity[]> {
    const entities = await this.getEntitiesWithComponent(componentType, roomId, excludeSelf);
    return entities.filter((e) => this.isAgent(e));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNED DISCOVERY - Persistence
  // ═══════════════════════════════════════════════════════════════════════════
  // These methods manage the discovered_agents component, which stores
  // what this agent has learned about other agents through conversation.

  /**
   * Get the discovered agents component data.
   * Returns null if no agents have been discovered yet.
   */
  private async getDiscoveredAgentsComponent(): Promise<DiscoveredAgentsData | null> {
    try {
      const component = await this.runtime.getComponent(
        this.runtime.agentId,
        DISCOVERED_AGENTS_COMPONENT
      );

      if (!component) {
        return null;
      }

      return component.data as DiscoveredAgentsData;
    } catch (error) {
      logger.error(
        { agentId: this.runtime.agentId, error },
        'Error getting discovered agents component'
      );
      return null;
    }
  }

  /**
   * Save the discovered agents component data.
   */
  private async saveDiscoveredAgentsComponent(data: DiscoveredAgentsData): Promise<void> {
    try {
      const existingComponent = await this.runtime.getComponent(
        this.runtime.agentId,
        DISCOVERED_AGENTS_COMPONENT
      );

      if (existingComponent) {
        // Update existing component
        await this.runtime.updateComponent({
          ...existingComponent,
          data,
        });
        logger.debug(
          { agentId: this.runtime.agentId, agentCount: Object.keys(data.agents).length },
          'Updated discovered agents component'
        );
      } else {
        // Create new component
        await this.runtime.createComponent({
          entityId: this.runtime.agentId,
          agentId: this.runtime.agentId,
          type: DISCOVERED_AGENTS_COMPONENT,
          data,
        });
        logger.info(
          { agentId: this.runtime.agentId, agentCount: Object.keys(data.agents).length },
          'Created new discovered agents component'
        );
      }
    } catch (error) {
      logger.error(
        { agentId: this.runtime.agentId, error },
        'Error saving discovered agents component'
      );
      throw error;
    }
  }

  /**
   * Record a newly discovered agent.
   * 
   * Call this after receiving capabilities from another agent via
   * QUERY_CAPABILITIES / DELIVER_CAPABILITIES conversation.
   * 
   * @param input - The discovery input
   */
  async recordDiscoveredAgent(input: DiscoverAgentInput): Promise<void> {
    const existingData = await this.getDiscoveredAgentsComponent();
    const now = Date.now();

    const record: DiscoveredAgentRecord = {
      agentId: input.agentId,
      name: input.name,
      capabilities: input.capabilities,
      verifiedCapabilities: [],
      failedCapabilities: [],
      discoveredAt: now,
      lastInteractionAt: now,
      verificationLevel: 'claimed',
      source: input.source,
      discoveredInRoom: input.roomId,
      notes: input.notes,
    };

    const data: DiscoveredAgentsData = existingData || {
      agents: {},
      updatedAt: now,
    };

    // If we already know this agent, merge the data
    const existing = data.agents[input.agentId];
    if (existing) {
      record.discoveredAt = existing.discoveredAt;
      record.verifiedCapabilities = existing.verifiedCapabilities;
      record.failedCapabilities = existing.failedCapabilities;
      // Keep verified status if we've verified before
      if (existing.verificationLevel === 'verified') {
        record.verificationLevel = 'verified';
      }
    }

    data.agents[input.agentId] = record;
    data.updatedAt = now;

    await this.saveDiscoveredAgentsComponent(data);

    logger.info(
      {
        agentId: this.runtime.agentId,
        discoveredAgentId: input.agentId,
        name: input.name,
        capabilities: input.capabilities.length,
      },
      'Recorded discovered agent'
    );
  }

  /**
   * Get all agents this agent has discovered.
   * 
   * @param options - Optional query filters
   * @returns Array of discovered agent records
   */
  async getDiscoveredAgents(options?: DiscoveredAgentQueryOptions): Promise<DiscoveredAgentRecord[]> {
    const data = await this.getDiscoveredAgentsComponent();
    if (!data) {
      return [];
    }

    let agents = Object.values(data.agents);

    // Apply filters
    if (options?.verifiedOnly) {
      agents = agents.filter((a) => a.verificationLevel === 'verified');
    }
    if (options?.source) {
      agents = agents.filter((a) => a.source === options.source);
    }
    if (options?.roomId) {
      agents = agents.filter((a) => a.discoveredInRoom === options.roomId);
    }

    return agents;
  }

  /**
   * Get what we know about a specific agent.
   * 
   * @param agentId - The agent to look up
   * @returns The discovered agent record, or null if not discovered
   */
  async getDiscoveredAgent(agentId: UUID): Promise<DiscoveredAgentRecord | null> {
    const data = await this.getDiscoveredAgentsComponent();
    if (!data) {
      return null;
    }

    return data.agents[agentId] || null;
  }

  /**
   * Check if we've already discovered an agent.
   * 
   * Use this before asking "what can you do?" to avoid repeat queries.
   * 
   * @param agentId - The agent to check
   * @returns true if we've discovered this agent before
   */
  async hasDiscovered(agentId: UUID): Promise<boolean> {
    const record = await this.getDiscoveredAgent(agentId);
    return record !== null;
  }

  /**
   * Find discovered agents that claim a specific capability.
   * 
   * @param capability - The capability flag to search for
   * @param options - Optional query filters
   * @returns Array of discovered agent records with the capability
   */
  async findDiscoveredAgentsWithCapability(
    capability: string,
    options?: DiscoveredAgentQueryOptions
  ): Promise<DiscoveredAgentRecord[]> {
    const agents = await this.getDiscoveredAgents(options);

    return agents.filter((agent) => {
      // Check if capability is in their list
      const hasCap = agent.capabilities.includes(capability);

      // If verifiedOnly, also check verifiedCapabilities
      if (options?.verifiedOnly) {
        return agent.verifiedCapabilities.includes(capability);
      }

      // Exclude if this capability has failed
      if (agent.failedCapabilities.includes(capability)) {
        return false;
      }

      return hasCap;
    });
  }

  /**
   * Update verification status for a capability after testing it.
   * 
   * Call this after you've seen an agent successfully or unsuccessfully
   * perform an action related to a capability.
   * 
   * @param agentId - The agent whose capability was tested
   * @param capability - The capability that was tested
   * @param verified - true if it worked, false if it failed
   */
  async updateVerification(
    agentId: UUID,
    capability: string,
    verified: boolean
  ): Promise<void> {
    const data = await this.getDiscoveredAgentsComponent();
    if (!data || !data.agents[agentId]) {
      logger.warn(
        { agentId: this.runtime.agentId, targetAgentId: agentId },
        'Cannot update verification - agent not discovered'
      );
      return;
    }

    const record = data.agents[agentId];
    const now = Date.now();

    if (verified) {
      // Add to verified, remove from failed
      if (!record.verifiedCapabilities.includes(capability)) {
        record.verifiedCapabilities.push(capability);
      }
      record.failedCapabilities = record.failedCapabilities.filter((c) => c !== capability);

      // Upgrade verification level if any capabilities are verified
      if (record.verifiedCapabilities.length > 0) {
        record.verificationLevel = 'verified';
      }
    } else {
      // Add to failed, remove from verified
      if (!record.failedCapabilities.includes(capability)) {
        record.failedCapabilities.push(capability);
      }
      record.verifiedCapabilities = record.verifiedCapabilities.filter((c) => c !== capability);

      // Downgrade if all verified capabilities have failed
      if (record.verifiedCapabilities.length === 0 && record.failedCapabilities.length > 0) {
        record.verificationLevel = 'failed';
      }
    }

    record.lastInteractionAt = now;
    data.updatedAt = now;

    await this.saveDiscoveredAgentsComponent(data);

    logger.info(
      {
        agentId: this.runtime.agentId,
        targetAgentId: agentId,
        capability,
        verified,
        newLevel: record.verificationLevel,
      },
      'Updated capability verification'
    );
  }

  /**
   * Update the last interaction time for a discovered agent.
   * 
   * @param agentId - The agent we interacted with
   */
  async touchDiscoveredAgent(agentId: UUID): Promise<void> {
    const data = await this.getDiscoveredAgentsComponent();
    if (!data || !data.agents[agentId]) {
      return;
    }

    const now = Date.now();
    data.agents[agentId].lastInteractionAt = now;
    data.updatedAt = now;

    await this.saveDiscoveredAgentsComponent(data);
  }

  /**
   * Remove a discovered agent from our records.
   * 
   * @param agentId - The agent to forget
   */
  async forgetDiscoveredAgent(agentId: UUID): Promise<void> {
    const data = await this.getDiscoveredAgentsComponent();
    if (!data || !data.agents[agentId]) {
      return;
    }

    delete data.agents[agentId];
    data.updatedAt = Date.now();

    await this.saveDiscoveredAgentsComponent(data);

    logger.info(
      { agentId: this.runtime.agentId, forgottenAgentId: agentId },
      'Removed discovered agent from records'
    );
  }
}

