/**
 * Plugin Information Providers for Discovery Plugin
 */

import type { IAgentRuntime, Provider, ProviderResult, Memory, State } from '@elizaos/core';

export const discoveryInstructionsProvider: Provider = {
  name: 'discoveryInstructions',
  description: 'Instructions for the plugin discovery plugin',
  dynamic: true,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => {
    const instructions = `
# Discovery Plugin Capabilities

## What This Plugin Does

The discovery plugin helps agents discover and advertise plugin capabilities within the ecosystem.

## Features

- **Capability Discovery**: Find what other agents/plugins can do
- **Feature Flags**: Advertise plugin capabilities
- **Ecosystem Awareness**: Understand available services
- **Integration Guidance**: Help connect with other plugins

## Key Concepts

### Feature Flags
Plugins can declare capability flags like:
- 'can-trade'
- 'supports-solana'
- 'accepts-payments'

### Discovery Protocol
Agents can query for plugins with specific capabilities.

## Best Practices

1. **Accurate Flags**: Only advertise capabilities you have
2. **Clear Descriptions**: Make capabilities easy to understand
3. **Version Awareness**: Note compatibility requirements
`;

    return {
      text: instructions.trim(),
      data: { pluginName: 'discovery' },
    };
  },
};

export const discoverySettingsProvider: Provider = {
  name: 'discoverySettings',
  description: 'Current discovery configuration',
  dynamic: true,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => {
    return {
      text: `# Discovery Plugin Settings\n\n- **Status**: Enabled\n- **Feature Discovery**: Active`,
      data: { pluginEnabled: true },
      values: { pluginEnabled: 'true' },
    };
  },
};

