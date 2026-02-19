# Alternatives & Related

How we relate to Honcho, OpenClaw, and Eliza + Pi.

---

## Honcho

We evaluated [Honcho](https://docs.honcho.dev) and **do not use it.**

| Honcho                                    | VINCE / ElizaOS                                       |
| :---------------------------------------- | :---------------------------------------------------- |
| Peers + Sessions                          | Entities, rooms, participants                         |
| Representations (reasoning over messages) | Evaluators (facts, reflection) + memory               |
| Managed or self-hosted memory service     | DB adapter (Postgres/PGLite) + Supabase feature store |

Eliza gives us memories, embeddings, evaluators, entities. The paper bot uses the **feature store** (Supabase); that's the right place for trading state. Adding Honcho would duplicate what we have without filling a clear gap.

**When Honcho could make sense:** (1) Formal reasoning over conversations beyond evaluators, (2) managed memory for a new product, (3) prototyping a separate agent from scratch. → [Honcho agent skills](https://docs.honcho.dev/v3/documentation/introduction/vibecoding#agent-skills)

---

## OpenClaw, Pi, and Eliza + Pi

**OpenClaw** is not an agent framework—it's a wrapper around another agent called **Pi** (a coding agent). It started as a relay for agents before becoming Clawd. The killer combo: Pi + Claude Skills. Most of the rest is adapters.

**Our first use case for OpenClaw** has been to fork this repo and improve what we've built. When we called it **ClawdBot** (later **MoltBot**), we meant the local piece that bridges ElizaOS and analog reality (smart home, biometrics, playlists); OpenClaw is the product that evolved from that vision. Full story: [OPENCLAW_VISION.md](OPENCLAW_VISION.md).

| OpenClaw / Pi                                 | ElizaOS                          |
| :-------------------------------------------- | :------------------------------- |
| Memory, connectors (APIs, chats), personality | Very similar—different packaging |
| Pi: CLI everything                            | MCP + plugin tool-calling        |

**The big difference:** ElizaOS is heavy on **MCP and tool calling from plugins**. Pi leans into "CLI everything"—simpler, less ceremony. Both are valid.

**OpenClaw integration:** We support hybrid mode: VINCE (ElizaOS) for conversation/coordination + OpenClaw sub-agents for parallel deep-dive research. See `openclaw-agents/` in the repo for alpha research, market data, on-chain agent, and orchestrator.

If you're looking for more coding-agent simplicity, the target is **Eliza + Pi patterns**, not Eliza with OpenClaw. OpenClaw-on-ElizaOS (swapping Pi for Eliza) exists and may be published—no huge advantages or disadvantages either way.
