import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IAgentRuntime, Plugin, Action, Provider, Service, UUID, Entity, Component } from '@elizaos/core';
import { DiscoveryService } from '../services/discovery-service.ts';

// Mock component storage
let mockComponentStorage: Map<string, any> = new Map();

// Mock runtime factory
function createMockRuntime(options: {
  plugins?: Plugin[];
  actions?: Action[];
  providers?: Provider[];
  services?: Map<string, Service[]>;
  settings?: Record<string, string>;
  entities?: Entity[];
} = {}): IAgentRuntime {
  const {
    plugins = [],
    actions = [],
    providers = [],
    services = new Map(),
    settings = {},
    entities = [],
  } = options;

  // Reset component storage for each runtime
  mockComponentStorage = new Map();

  return {
    agentId: 'test-agent-id' as UUID,
    character: {
      name: 'TestAgent',
      bio: 'A test agent for unit testing',
    },
    plugins,
    actions,
    providers,
    getAllServices: () => services,
    getService: (name: string) => services.get(name)?.[0] || null,
    getSetting: (key: string) => settings[key] || null,
    getEntitiesForRoom: vi.fn().mockResolvedValue(entities),
    getEntityById: vi.fn().mockImplementation((id: UUID) => {
      return Promise.resolve(entities.find((e) => e.id === id) || null);
    }),
    getComponent: vi.fn().mockImplementation((entityId: UUID, type: string) => {
      const key = `${entityId}:${type}`;
      return Promise.resolve(mockComponentStorage.get(key) || null);
    }),
    createComponent: vi.fn().mockImplementation((component: Component) => {
      const key = `${component.entityId}:${component.type}`;
      mockComponentStorage.set(key, component);
      return Promise.resolve(true);
    }),
    updateComponent: vi.fn().mockImplementation((component: Component) => {
      const key = `${component.entityId}:${component.type}`;
      mockComponentStorage.set(key, component);
      return Promise.resolve();
    }),
  } as unknown as IAgentRuntime;
}

// Helper to create mock entities
function createMockEntity(options: {
  id: UUID;
  agentId: UUID;
  names?: string[];
  components?: Component[];
}): Entity {
  return {
    id: options.id,
    agentId: options.agentId,
    names: options.names || ['Test Entity'],
    metadata: {},
    components: options.components || [],
  };
}

// Helper to create an agent entity (id === agentId)
function createMockAgentEntity(id: UUID, name: string, components?: Component[]): Entity {
  return createMockEntity({
    id,
    agentId: id, // Agent references itself
    names: [name],
    components,
  });
}

// Helper to create a human entity (id !== agentId)
function createMockHumanEntity(id: UUID, agentId: UUID, name: string): Entity {
  return createMockEntity({
    id,
    agentId, // Human references an agent
    names: [name],
  });
}

describe('DiscoveryService', () => {
  describe('collectFeatureFlags', () => {
    it('should collect declared feature flags from plugins', async () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        description: 'Test plugin',
        featureFlags: ['can-trade', 'supports-solana'],
      };

      const runtime = createMockRuntime({ plugins: [mockPlugin] });
      const service = await DiscoveryService.start(runtime);

      const flags = service.collectFeatureFlags();

      expect(flags).toContainEqual(
        expect.objectContaining({ flag: 'can-trade' })
      );
      expect(flags).toContainEqual(
        expect.objectContaining({ flag: 'supports-solana' })
      );
    });

    it('should infer flags from service types', async () => {
      const mockService = {
        capabilityDescription: 'Mock wallet service',
      } as Service;

      const services = new Map<string, Service[]>();
      services.set('wallet', [mockService]);
      services.set('commerce', [mockService]);

      const runtime = createMockRuntime({ services });
      const service = await DiscoveryService.start(runtime);

      const flags = service.collectFeatureFlags();

      expect(flags).toContainEqual(
        expect.objectContaining({ flag: 'has-wallet' })
      );
      expect(flags).toContainEqual(
        expect.objectContaining({ flag: 'accepts-payments' })
      );
    });

    it('should infer flags from action names', async () => {
      const mockActions: Action[] = [
        {
          name: 'SWAP_TOKENS',
          description: 'Swap tokens on DEX',
          validate: async () => true,
          handler: async () => ({ success: true }),
        },
        {
          name: 'POST_TWEET',
          description: 'Post to Twitter',
          validate: async () => true,
          handler: async () => ({ success: true }),
        },
      ];

      const runtime = createMockRuntime({ actions: mockActions });
      const service = await DiscoveryService.start(runtime);

      const flags = service.collectFeatureFlags();

      expect(flags).toContainEqual(
        expect.objectContaining({ flag: 'can-swap' })
      );
      expect(flags).toContainEqual(
        expect.objectContaining({ flag: 'can-post' })
      );
    });

    it('should deduplicate flags', async () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        description: 'Test plugin',
        featureFlags: ['can-trade', 'can-trade'], // Duplicate
      };

      const runtime = createMockRuntime({ plugins: [mockPlugin] });
      const service = await DiscoveryService.start(runtime);

      const flags = service.collectFeatureFlags();
      const tradeFlags = flags.filter((f) => f.flag === 'can-trade');

      expect(tradeFlags.length).toBe(1);
    });
  });

  describe('hasFlag', () => {
    it('should return true for present flags', async () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        description: 'Test plugin',
        featureFlags: ['can-trade'],
      };

      const runtime = createMockRuntime({ plugins: [mockPlugin] });
      const service = await DiscoveryService.start(runtime);

      expect(service.hasFlag('can-trade')).toBe(true);
    });

    it('should return false for absent flags', async () => {
      const runtime = createMockRuntime({ plugins: [] });
      const service = await DiscoveryService.start(runtime);

      expect(service.hasFlag('can-trade')).toBe(false);
    });
  });

  describe('buildManifest', () => {
    it('should include agent identity', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const manifest = service.buildManifest();

      expect(manifest.agentId).toBe('test-agent-id');
      expect(manifest.agentName).toBe('TestAgent');
      expect(manifest.bio).toBe('A test agent for unit testing');
    });

    it('should include capabilities', async () => {
      const mockActions: Action[] = [
        {
          name: 'TEST_ACTION',
          description: 'Test action',
          validate: async () => true,
          handler: async () => ({ success: true }),
        },
      ];

      const mockService = {
        capabilityDescription: 'Test service capability',
      } as Service;
      const services = new Map<string, Service[]>();
      services.set('test', [mockService]);

      const mockProvider: Provider = {
        name: 'TEST_PROVIDER',
        description: 'Test provider',
        get: async () => ({ text: '' }),
      };

      const runtime = createMockRuntime({
        actions: mockActions,
        services,
        providers: [mockProvider],
      });
      const service = await DiscoveryService.start(runtime);

      const manifest = service.buildManifest();

      expect(manifest.capabilities.actions.length).toBeGreaterThan(0);
      expect(manifest.capabilities.services.length).toBeGreaterThan(0);
      expect(manifest.capabilities.providers.length).toBeGreaterThan(0);
    });

    it('should cache manifest', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const manifest1 = service.buildManifest();
      const manifest2 = service.buildManifest();

      // Same reference means cache hit
      expect(manifest1).toBe(manifest2);
    });

    it('should include generatedAt timestamp', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const before = Date.now();
      const manifest = service.buildManifest();
      const after = Date.now();

      expect(manifest.generatedAt).toBeGreaterThanOrEqual(before);
      expect(manifest.generatedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('buildSummary', () => {
    it('should include counts', async () => {
      const mockActions: Action[] = [
        {
          name: 'ACTION_1',
          description: 'Action 1',
          validate: async () => true,
          handler: async () => ({ success: true }),
        },
        {
          name: 'ACTION_2',
          description: 'Action 2',
          validate: async () => true,
          handler: async () => ({ success: true }),
        },
      ];

      const runtime = createMockRuntime({ actions: mockActions });
      const service = await DiscoveryService.start(runtime);

      const summary = service.buildSummary();

      expect(summary.counts.actions).toBe(2);
    });

    it('should include upgrade prompt with price', async () => {
      const runtime = createMockRuntime({
        settings: { DISCOVERY_QUERY_PRICE: '0.50' },
      });
      const service = await DiscoveryService.start(runtime);

      const summary = service.buildSummary();

      expect(summary.upgradePrompt).toContain('$0.50');
      expect(summary.queryPrice).toBe(0.50);
    });
  });

  describe('pending queries', () => {
    it('should create and retrieve pending query', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const entityId = 'entity-1' as UUID;
      const roomId = 'room-1' as UUID;

      const query = service.createPendingQuery(entityId, roomId);

      expect(query.entityId).toBe(entityId);
      expect(query.roomId).toBe(roomId);
      expect(query.price).toBe(0.25); // Default price

      const retrieved = service.getPendingQuery(entityId);
      expect(retrieved).toEqual(query);
    });

    it('should complete pending query', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const entityId = 'entity-1' as UUID;
      const roomId = 'room-1' as UUID;

      service.createPendingQuery(entityId, roomId);
      const manifest = service.completePendingQuery(entityId);

      expect(manifest).not.toBeNull();
      expect(manifest?.agentId).toBe('test-agent-id');

      // Should be removed after completion
      const retrieved = service.getPendingQuery(entityId);
      expect(retrieved).toBeUndefined();
    });

    it('should return null for non-existent query', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const manifest = service.completePendingQuery('unknown' as UUID);
      expect(manifest).toBeNull();
    });
  });

  describe('generateCapabilitySummaryText', () => {
    it('should generate natural language summary', async () => {
      const mockPlugin: Plugin = {
        name: 'test-plugin',
        description: 'Test plugin',
        featureFlags: ['can-trade', 'supports-solana', 'has-memory'],
      };

      const runtime = createMockRuntime({ plugins: [mockPlugin] });
      const service = await DiscoveryService.start(runtime);

      const text = service.generateCapabilitySummaryText();

      expect(text).toContain('trade');
      expect(text).toContain('solana');
      expect(text).toContain('memory');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STRUCTURAL DISCOVERY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isAgent', () => {
    it('should return true when entity.id === entity.agentId', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const agentEntity = createMockAgentEntity('agent-123' as UUID, 'TestAgent');

      expect(service.isAgent(agentEntity)).toBe(true);
    });

    it('should return false when entity.id !== entity.agentId', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const humanEntity = createMockHumanEntity(
        'human-456' as UUID,
        'agent-123' as UUID,
        'TestHuman'
      );

      expect(service.isAgent(humanEntity)).toBe(false);
    });

    it('should return false for entities with missing ids', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const incompleteEntity = {
        names: ['Incomplete'],
        metadata: {},
      } as Entity;

      expect(service.isAgent(incompleteEntity)).toBe(false);
    });
  });

  describe('isHuman', () => {
    it('should return true when entity.id !== entity.agentId', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const humanEntity = createMockHumanEntity(
        'human-456' as UUID,
        'agent-123' as UUID,
        'TestHuman'
      );

      expect(service.isHuman(humanEntity)).toBe(true);
    });

    it('should return false when entity.id === entity.agentId', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const agentEntity = createMockAgentEntity('agent-123' as UUID, 'TestAgent');

      expect(service.isHuman(agentEntity)).toBe(false);
    });
  });

  describe('hasComponent', () => {
    it('should return true if entity has the component', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const entity = createMockAgentEntity('agent-123' as UUID, 'TestAgent', [
        { type: 'homeostasis_state', data: { hunger: 50 } } as Component,
        { type: 'vendor_inventory', data: { items: [] } } as Component,
      ]);

      expect(service.hasComponent(entity, 'homeostasis_state')).toBe(true);
      expect(service.hasComponent(entity, 'vendor_inventory')).toBe(true);
    });

    it('should return false if entity does not have the component', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const entity = createMockAgentEntity('agent-123' as UUID, 'TestAgent', [
        { type: 'homeostasis_state', data: { hunger: 50 } } as Component,
      ]);

      expect(service.hasComponent(entity, 'vendor_inventory')).toBe(false);
      expect(service.hasComponent(entity, 'commerce_state')).toBe(false);
    });

    it('should return false if entity has no components', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      const entity = createMockAgentEntity('agent-123' as UUID, 'TestAgent');

      expect(service.hasComponent(entity, 'homeostasis_state')).toBe(false);
    });
  });

  describe('getAgentsInRoom', () => {
    it('should return only agent entities', async () => {
      const agent1 = createMockAgentEntity('agent-1' as UUID, 'Agent1');
      const agent2 = createMockAgentEntity('agent-2' as UUID, 'Agent2');
      const human1 = createMockHumanEntity('human-1' as UUID, 'agent-1' as UUID, 'Human1');

      const runtime = createMockRuntime({
        entities: [agent1, agent2, human1],
      });
      const service = await DiscoveryService.start(runtime);

      const agents = await service.getAgentsInRoom('room-1' as UUID);

      expect(agents.length).toBe(2);
      expect(agents.map((a) => a.names[0])).toContain('Agent1');
      expect(agents.map((a) => a.names[0])).toContain('Agent2');
      expect(agents.map((a) => a.names[0])).not.toContain('Human1');
    });

    it('should exclude self by default', async () => {
      const selfAgent = createMockAgentEntity('test-agent-id' as UUID, 'Self');
      const otherAgent = createMockAgentEntity('other-agent' as UUID, 'Other');

      const runtime = createMockRuntime({
        entities: [selfAgent, otherAgent],
      });
      const service = await DiscoveryService.start(runtime);

      const agents = await service.getAgentsInRoom('room-1' as UUID);

      expect(agents.length).toBe(1);
      expect(agents[0].names[0]).toBe('Other');
    });

    it('should include self when excludeSelf is false', async () => {
      const selfAgent = createMockAgentEntity('test-agent-id' as UUID, 'Self');
      const otherAgent = createMockAgentEntity('other-agent' as UUID, 'Other');

      const runtime = createMockRuntime({
        entities: [selfAgent, otherAgent],
      });
      const service = await DiscoveryService.start(runtime);

      const agents = await service.getAgentsInRoom('room-1' as UUID, false);

      expect(agents.length).toBe(2);
    });
  });

  describe('getHumansInRoom', () => {
    it('should return only human entities', async () => {
      const agent1 = createMockAgentEntity('agent-1' as UUID, 'Agent1');
      const human1 = createMockHumanEntity('human-1' as UUID, 'agent-1' as UUID, 'Human1');
      const human2 = createMockHumanEntity('human-2' as UUID, 'agent-1' as UUID, 'Human2');

      const runtime = createMockRuntime({
        entities: [agent1, human1, human2],
      });
      const service = await DiscoveryService.start(runtime);

      const humans = await service.getHumansInRoom('room-1' as UUID);

      expect(humans.length).toBe(2);
      expect(humans.map((h) => h.names[0])).toContain('Human1');
      expect(humans.map((h) => h.names[0])).toContain('Human2');
      expect(humans.map((h) => h.names[0])).not.toContain('Agent1');
    });
  });

  describe('getEntitiesWithComponent', () => {
    it('should return entities with the specified component', async () => {
      const agentWithHomeostasis = createMockAgentEntity('agent-1' as UUID, 'AgentWithHS', [
        { type: 'homeostasis_state', data: { hunger: 50 } } as Component,
      ]);
      const agentWithoutHomeostasis = createMockAgentEntity('agent-2' as UUID, 'AgentWithoutHS');
      const agentWithVendor = createMockAgentEntity('agent-3' as UUID, 'AgentVendor', [
        { type: 'vendor_inventory', data: { items: [] } } as Component,
      ]);

      const runtime = createMockRuntime({
        entities: [agentWithHomeostasis, agentWithoutHomeostasis, agentWithVendor],
      });
      const service = await DiscoveryService.start(runtime);

      const withHomeostasis = await service.getEntitiesWithComponent(
        'homeostasis_state',
        'room-1' as UUID
      );

      expect(withHomeostasis.length).toBe(1);
      expect(withHomeostasis[0].names[0]).toBe('AgentWithHS');

      const withVendor = await service.getEntitiesWithComponent(
        'vendor_inventory',
        'room-1' as UUID
      );

      expect(withVendor.length).toBe(1);
      expect(withVendor[0].names[0]).toBe('AgentVendor');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LEARNED DISCOVERY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('recordDiscoveredAgent', () => {
    it('should record a new discovered agent', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'discovered-agent-1' as UUID,
        name: 'DiscoveredAgent',
        capabilities: ['can-trade', 'supports-solana'],
        source: 'conversation',
        roomId: 'room-1' as UUID,
      });

      const record = await service.getDiscoveredAgent('discovered-agent-1' as UUID);

      expect(record).not.toBeNull();
      expect(record?.name).toBe('DiscoveredAgent');
      expect(record?.capabilities).toContain('can-trade');
      expect(record?.capabilities).toContain('supports-solana');
      expect(record?.source).toBe('conversation');
      expect(record?.verificationLevel).toBe('claimed');
    });

    it('should merge capabilities when rediscovering an agent', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      // First discovery
      await service.recordDiscoveredAgent({
        agentId: 'discovered-agent-1' as UUID,
        name: 'DiscoveredAgent',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      // Verify first capability and mark as verified
      await service.updateVerification('discovered-agent-1' as UUID, 'can-trade', true);

      // Second discovery with more capabilities
      await service.recordDiscoveredAgent({
        agentId: 'discovered-agent-1' as UUID,
        name: 'DiscoveredAgent',
        capabilities: ['can-trade', 'can-swap', 'supports-solana'],
        source: 'conversation',
      });

      const record = await service.getDiscoveredAgent('discovered-agent-1' as UUID);

      expect(record?.capabilities).toContain('can-swap');
      expect(record?.capabilities).toContain('supports-solana');
      // Should preserve verified capabilities
      expect(record?.verifiedCapabilities).toContain('can-trade');
      expect(record?.verificationLevel).toBe('verified');
    });
  });

  describe('getDiscoveredAgents', () => {
    it('should return all discovered agents', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Agent1',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      await service.recordDiscoveredAgent({
        agentId: 'agent-2' as UUID,
        name: 'Agent2',
        capabilities: ['can-swap'],
        source: 'observation',
      });

      const agents = await service.getDiscoveredAgents();

      expect(agents.length).toBe(2);
    });

    it('should filter by verifiedOnly', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Agent1',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      await service.recordDiscoveredAgent({
        agentId: 'agent-2' as UUID,
        name: 'Agent2',
        capabilities: ['can-swap'],
        source: 'conversation',
      });

      // Verify only agent-1
      await service.updateVerification('agent-1' as UUID, 'can-trade', true);

      const verifiedAgents = await service.getDiscoveredAgents({ verifiedOnly: true });

      expect(verifiedAgents.length).toBe(1);
      expect(verifiedAgents[0].name).toBe('Agent1');
    });

    it('should filter by source', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Agent1',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      await service.recordDiscoveredAgent({
        agentId: 'agent-2' as UUID,
        name: 'Agent2',
        capabilities: ['can-swap'],
        source: 'observation',
      });

      const conversationAgents = await service.getDiscoveredAgents({ source: 'conversation' });

      expect(conversationAgents.length).toBe(1);
      expect(conversationAgents[0].name).toBe('Agent1');
    });
  });

  describe('hasDiscovered', () => {
    it('should return true for discovered agents', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Agent1',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      expect(await service.hasDiscovered('agent-1' as UUID)).toBe(true);
      expect(await service.hasDiscovered('agent-2' as UUID)).toBe(false);
    });
  });

  describe('findDiscoveredAgentsWithCapability', () => {
    it('should find agents with a specific capability', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Trader',
        capabilities: ['can-trade', 'supports-solana'],
        source: 'conversation',
      });

      await service.recordDiscoveredAgent({
        agentId: 'agent-2' as UUID,
        name: 'Poster',
        capabilities: ['can-post', 'has-twitter'],
        source: 'conversation',
      });

      const traders = await service.findDiscoveredAgentsWithCapability('can-trade');

      expect(traders.length).toBe(1);
      expect(traders[0].name).toBe('Trader');

      const posters = await service.findDiscoveredAgentsWithCapability('can-post');

      expect(posters.length).toBe(1);
      expect(posters[0].name).toBe('Poster');
    });

    it('should exclude failed capabilities', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'FlakyTrader',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      // Mark the capability as failed
      await service.updateVerification('agent-1' as UUID, 'can-trade', false);

      const traders = await service.findDiscoveredAgentsWithCapability('can-trade');

      expect(traders.length).toBe(0);
    });
  });

  describe('updateVerification', () => {
    it('should mark capability as verified', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Agent1',
        capabilities: ['can-trade', 'can-swap'],
        source: 'conversation',
      });

      await service.updateVerification('agent-1' as UUID, 'can-trade', true);

      const record = await service.getDiscoveredAgent('agent-1' as UUID);

      expect(record?.verifiedCapabilities).toContain('can-trade');
      expect(record?.verificationLevel).toBe('verified');
    });

    it('should mark capability as failed', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Agent1',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      await service.updateVerification('agent-1' as UUID, 'can-trade', false);

      const record = await service.getDiscoveredAgent('agent-1' as UUID);

      expect(record?.failedCapabilities).toContain('can-trade');
      expect(record?.verificationLevel).toBe('failed');
    });
  });

  describe('forgetDiscoveredAgent', () => {
    it('should remove an agent from discovered records', async () => {
      const runtime = createMockRuntime();
      const service = await DiscoveryService.start(runtime);

      await service.recordDiscoveredAgent({
        agentId: 'agent-1' as UUID,
        name: 'Agent1',
        capabilities: ['can-trade'],
        source: 'conversation',
      });

      expect(await service.hasDiscovered('agent-1' as UUID)).toBe(true);

      await service.forgetDiscoveredAgent('agent-1' as UUID);

      expect(await service.hasDiscovered('agent-1' as UUID)).toBe(false);
    });
  });
});

