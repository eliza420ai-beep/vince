# @elizaos/plugin-discovery

Capability discovery for elizaOS agents. Enables conversational discovery of agent capabilities with paid detailed queries.

## Overview

Discovery happens through **conversation** - humans and agents ask "What can you do?" and get natural language responses. There's no central registry - each agent knows what it can do and can discuss it.

- **Free**: High-level capability summary
- **Paid ($0.25)**: Full detailed manifest with all actions, services, and feature flags

## Features

- **Feature Flags**: Semantic capability tags (`can-trade`, `supports-solana`, `accepts-payments`)
- **Conversational Discovery**: Natural language capability discussion
- **Monetized Queries**: Detailed capability manifests for $0.25
- **Service API**: Other plugins can query capabilities programmatically
- **Capability Manifest**: Structured format for indexers

## Installation

```bash
cd packages/plugin-discovery
bun install
bun run build
```

Add to your agent's plugins:

```typescript
import { discoveryPlugin } from '@elizaos/plugin-discovery';

const character = {
  // ... your character config
  plugins: ['@elizaos/plugin-discovery'],
};
```

## Dependencies

This plugin requires:
- `@elizaos/plugin-attract` - For capability collection
- `@elizaos/plugin-commerce` - For payment handling

### Optional Dependencies (Progressive Enhancement)

When available, these plugins enhance discovery:

- `@elizaos/plugin-skills` - Cross-domain capability visibility

#### Why plugin-skills?

When `plugin-skills` is available, discovered capabilities become skills:

```
Feature flags like:
  - can-trade
  - supports-solana
  - has-wallet

Become skills like:
  - discovery:can-trade
  - discovery:supports-solana
  - discovery:has-wallet
```

This enables:
1. **Cross-domain queries** - Other plugins can ask "can this agent trade?" via skills
2. **Unified capability view** - All capabilities in one queryable system
3. **Capability matching** - Find agents with specific capabilities across the ecosystem

## Configuration

### Environment Variables

```bash
# Price for detailed capability query (default: 0.25)
DISCOVERY_QUERY_PRICE=0.25

# Whether to require payment for detailed queries (default: true)
DISCOVERY_REQUIRE_PAYMENT=true

# Cooldown between detailed queries from same entity in minutes (default: 60)
DISCOVERY_QUERY_COOLDOWN_MINS=60
```

## Conversational Flow

### Free Summary

```
Human: What can you do?
Agent: I can help with trading on Solana, managing payments, and 
       social media. I can swap tokens, check balances, post 
       tweets, and more. Want the full detailed list? That's 
       $0.25 - just tip me.
```

### Paid Detailed Query

```
Human: Give me your full capability list
Agent: That'll be $0.25. You can tip me via:
       - Solana: 7xKX...
       - PayPal: paypal.me/agent