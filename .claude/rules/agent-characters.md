---
paths: ["src/agents/*.ts"]
---

# Agent Character Conventions

## File Structure

Each agent is a single file in `src/agents/` exporting a `Character` and a `ProjectAgent`. No separate `characters/*.json`.

## Character Definition

Required fields: `name`, `username`, `bio`, `system`, `style`, `plugins`, `settings`, `knowledge`.

### system prompt

- Include "BRAND VOICE" and "NO AI SLOP" references.
- State what the agent CAN and CANNOT do. Be specific.
- Reference the agent's role from the CLAUDE.md agent map (CDO, CFO, COO, etc.).
- Do not repeat information that belongs in knowledge files — reference the knowledge directory instead.

### plugins

- Always include: `@elizaos/plugin-sql`, `@elizaos/plugin-bootstrap`.
- Include model provider based on env: check for `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.
- Agent-specific plugins from `src/plugins/plugin-<name>/`.
- `plugin-inter-agent` for ASK_AGENT capability.

### style

- `style.all`: brand voice rules that apply everywhere. Benefit-led, Porsche OG, zero AI-slop.
- `style.chat`: conversation-specific rules (e.g., "use Discord markdown").
- `style.post`: social post rules (e.g., "no hashtags, no emojis unless earned").
- Keep each style rule to one sentence. Concrete, not abstract.

### knowledge

- Use `{ directory: "teammate", shared: true }` for shared knowledge.
- Use `{ directory: "<agent-name>-docs", shared: false }` for agent-specific knowledge.
- Set `settings.ragKnowledge: true` when the agent has document-based knowledge.

### settings.secrets

- Reference env vars, don't hardcode values.
- Use `process.env.AGENT_NAME_SECRET_NAME` pattern.
- Discord tokens: `AGENT_DISCORD_APPLICATION_ID`, `AGENT_DISCORD_API_TOKEN`.

## Conditional Plugin Loading

Load platform plugins (Discord, Telegram) conditionally based on env vars:

```typescript
const hasOwnDiscord = !!process.env.AGENT_DISCORD_API_TOKEN?.trim();
```

Do not load Discord plugin if the agent doesn't have its own bot token.

## Agent Roles (Do Not Change Without Discussion)

- **VINCE** (CDO): Data, paper trading, signals. No execution.
- **Solus** (CFO): Options, strike ritual. No execution.
- **Otaku** (COO): Only agent with a funded wallet. DeFi execution.
- **Forge**: MLX AutoResearch, self-optimization. Silent by default.
