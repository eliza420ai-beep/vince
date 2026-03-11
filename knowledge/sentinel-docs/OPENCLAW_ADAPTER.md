# OpenClaw Adapter — Eliza ↔ OpenClaw Interop

**Give this serious thought and attention.** The [openclaw-adapter](https://github.com/elizaOS/openclaw-adapter) is the bridge between the ElizaOS plugin ecosystem and [OpenClaw](https://github.com/elizaOS/openclaw-adapter): it runs Eliza plugins inside OpenClaw so wallets, connectors, services, and tools written for Eliza can be reused in an OpenClaw agent, and vice versa the two agent ecosystems interoperate.

## Why it matters for VINCE

- **Otaku / Solana / EVM:** We use (or consider) plugin-solana, plugin-evm, and custom wallet/trading logic. OpenClaw is another agent runtime. The adapter means our Eliza plugins (e.g. EVM, Solana, or future wallet/connector plugins) can be exposed as **OpenClaw tools** in a single agent—so one codebase (Eliza plugins) can power both an Eliza agent and an OpenClaw agent.
- **Multi-runtime strategy:** If the team ever runs an OpenClaw-based agent (e.g. for a different product surface or partner), the adapter avoids rewriting wallet/tool logic; we register the same Eliza plugins and get tools + hooks + routes there.
- **Ecosystem alignment:** Staying aware of openclaw-adapter helps architecture decisions (when to keep logic in an Eliza plugin vs when to consider dual-surface via the adapter) and keeps Sentinel’s suggestions aligned with the broader elizaOS/OpenClaw story.

## How to leverage the adapter

**Direction:** The adapter runs **inside OpenClaw** and loads **Eliza plugins** as tools/hooks/services. So:

- **VINCE today:** ElizaOS is the host; we spawn OpenClaw (orchestrator, plugin-openclaw) for research. No adapter in that path.
- **With the adapter:** OpenClaw is the host; it loads our Eliza plugins and exposes them as tools. You leverage the adapter when you have (or add) an **OpenClaw-based** agent and want it to use the same plugin logic.

**Concrete leverage:**

1. **OpenClaw agent with our wallet/connector plugins** — Run any OpenClaw agent (CLI, app, or partner product). Install `@elizaos/openclaw-adapter` and the Eliza plugins you want (e.g. `@elizaos/plugin-evm`, `@elizaos/plugin-solana`, or a path to a local VINCE plugin). Add the adapter to that project’s OpenClaw config; the agent gets tools like `eliza_send_tokens`, `eliza_swap_tokens`, `eliza_transfer_sol`, and providers as prepended context. One plugin codebase powers both Eliza (VINCE) and OpenClaw.
2. **Dual-surface without rewriting** — Keep building wallet/tool logic as Eliza plugins (Otaku, Solana, EVM, custom connectors). In Eliza (VINCE) they run as normal actions/services; in OpenClaw the adapter exposes them as tools. Same code, two runtimes.
3. **Partner or alternate product on OpenClaw** — If a partner or another product uses OpenClaw (different channels, UX), they add the adapter + our plugins (or a subset) so their agent has the same capabilities (wallets, swaps, etc.) without maintaining a separate stack.
4. **Ecosystem and positioning** — For “how does VINCE/Eliza relate to OpenClaw?”: we can run our plugins inside OpenClaw via the official adapter—same tools, different host.

**Constraints to keep in mind:** No LLM in the adapter (`useModel`/`generateText` unavailable); actions that need the model to infer params need explicit params or known schemas. Channel plugins become tools only. DB is in-memory (no persistence across restarts). Best for **tool-style actions** (wallets, swaps, transfers) and **context injection** (providers), not full conversational or heavy persistent-memory flows inside that OpenClaw agent.

## What the adapter does

| Eliza concept | OpenClaw equivalent                   | How it works                                                            |
| ------------- | ------------------------------------- | ----------------------------------------------------------------------- |
| Action        | Tool                                  | Parameters → TypeBox schema; handler wrapped in `execute()`             |
| Provider      | `before_agent_start` hook             | Provider output injected as prepended context                           |
| Service       | Service                               | Started eagerly; injected into RuntimeBridge                            |
| Route         | HTTP route                            | Request/response translated; paths under `/eliza`                       |
| Evaluator     | `message_received` / `agent_end` hook | Pre-evaluators → message hooks; post → agent-end                        |
| Event         | Lifecycle hook                        | Mapped where semantics align (e.g. MESSAGE_RECEIVED → message_received) |

So: Eliza **actions** become OpenClaw **tools** (e.g. `eliza_send_tokens`, `eliza_swap_tokens`, `eliza_transfer_sol`); **providers** become context injected before the agent runs; **services** (e.g. EVM, Solana) start and are available to other components.

## Quick start (for reference)

```bash
npm install @elizaos/openclaw-adapter @elizaos/plugin-evm
```

In OpenClaw config (`openclaw.json` or equivalent):

```json
{
  "plugins": {
    "eliza-adapter": {
      "plugins": ["@elizaos/plugin-evm"],
      "settings": {
        "EVM_PRIVATE_KEY": "${EVM_PRIVATE_KEY}",
        "EVM_PROVIDER_URL": "https://mainnet.infura.io/v3/YOUR_KEY"
      },
      "agentName": "WalletBot"
    }
  }
}
```

Multiple plugins example: `plugins: ["@elizaos/plugin-evm", "@elizaos/plugin-solana"]` with corresponding settings. Local plugins: `plugins: ["./my-custom-eliza-plugin/index.js"]`.

## Config reference (summary)

| Field     | Required | Default | Description                                                                   |
| --------- | -------- | ------- | ----------------------------------------------------------------------------- |
| plugins   | Yes      | —       | Array of Eliza plugin package names or file paths                             |
| settings  | No       | {}      | Key-value passed to plugins via `runtime.getSetting()`; supports `${ENV_VAR}` |
| agentName | No       | "Eliza" | Agent display name in Eliza character context                                 |

## Built-in tool schemas (examples)

- `eliza_send_tokens`: toAddress, amount, token?, chain?
- `eliza_swap_tokens`: inputToken, outputToken, amount, chain?, slippage?
- `eliza_cross_chain_transfer`: token, amount, fromChain, toChain, toAddress?
- `eliza_transfer_sol`: toAddress, amount, mint?
- `eliza_swap_sol`: inputMint, outputMint, amount, slippage?

Actions with explicit params get schemas converted automatically; others get a generic `{ input: string }` fallback.

## Known limitations (from the adapter README)

- **LLM methods** (`useModel`, `generateText`) are not available. Actions that rely on conversational parameter extraction need explicit parameters or known schemas.
- **Channel plugins** (Discord, Telegram) register as tools only, not as native OpenClaw channels.
- **Database** is in-memory with LRU eviction (10K memories/table, 5K logs). No persistence across restarts.
- **Embeddings** are not generated; vector search works only if embeddings are provided.

So: the adapter is ideal for **tool-style actions** (wallets, swaps, transfers) and **context injection** (providers); less so for full conversational or persistent-memory-heavy flows unless OpenClaw side provides them.

## When to suggest it

- **OpenClaw in the stack:** If the team adopts or evaluates OpenClaw for a product, suggest using the adapter to reuse our Eliza plugins (EVM, Solana, or custom) as tools.
- **Dual-surface design:** When discussing “same logic, different agent runtime” or “run our wallet/trading tools in another framework,” point to openclaw-adapter as the official bridge.
- **Architecture and plugins:** When recommending plugin-evm, plugin-solana, or Otaku-related connector work, mention that this logic can also be exposed via openclaw-adapter if an OpenClaw agent is ever in scope.
- **Ecosystem and pitch:** For VC/angel or “how does Eliza relate to other runtimes,” the adapter is the concrete link: Eliza plugins → OpenClaw tools.

## Repo and implementation

- **Repo:** https://github.com/elizaOS/openclaw-adapter
- **Entry:** `index.ts` loads plugins and orchestrates registration.
- **Key modules:** `runtime-bridge.ts` (IAgentRuntime shim + InMemoryStore), `action-to-tool.ts`, `provider-to-hook.ts`, `service-adapter.ts`, `route-adapter.ts`, `evaluator-to-hook.ts`, `schema-converter.ts`, `event-mapper.ts`, `config.ts` (with `${ENV_VAR}` resolution).

Sentinel: treat the openclaw-adapter as a first-class integration to be aware of. When architecture, multi-runtime, wallet tooling, or ecosystem questions come up, consider whether the adapter should be suggested and reference this doc.
