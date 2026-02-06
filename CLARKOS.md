# ClarkOS Reference

> **C**ontinuously **L**earning **A**gentic **R**ealtime **K**nowledgebase **OS**  
> *always on. always learning.*

[ClarkOS](https://docs.clarkos.dev/) is a TypeScript-first agent framework built on **Convex serverless** infrastructure. It targets agents that run continuously, keep **persistent memory**, and evolve via **autonomous tick cycles**. This doc is a concise reference and comparison for the VINCE project (ElizaOS-based).

---

## Overview

| Aspect | Description |
|--------|-------------|
| **Execution** | Continuous tick cycle (configurable interval, default 5 min) |
| **Backend** | Convex serverless (real-time, transactional) |
| **Memory** | 5 types with type-specific deduplication thresholds |
| **State** | Mood, health, routine, volatility |
| **Stack** | Node.js 18+, TypeScript, React Ink (terminal UI), Jest |

**Docs:** [https://docs.clarkos.dev/](https://docs.clarkos.dev/)  
**Live demo:** [clark.wiki](https://clark.wiki) | **Source:** [GitHub – clarkOS/clark](https://github.com/clarkOS/clark)

---

## Execution Model: Tick Cycle

Agents run on a **tick**, not request–response:

1. Load current state and relevant memory context  
2. Process through the configured LLM  
3. Update internal state (mood, health, routine)  
4. Store new memories (embeddings + metadata)  
5. Run plugin hooks  

So the agent keeps “thinking” and updating even when no user message is present.

---

## Memory Architecture

Five memory types with **type-specific deduplication thresholds**:

| Type | Role | Dedup threshold (example) |
|------|------|----------------------------|
| **Episodic** | Specific events and experiences | 0.92 |
| **Semantic** | Facts, concepts, learned information | 0.95 |
| **Emotional** | Affective associations with topics/entities | 0.88 |
| **Procedural** | Learned patterns, triggers, responses | 0.97 |
| **Reflection** | Metacognitive insights about the agent’s own state | 0.90 |

Memories use **vector embeddings** for semantic retrieval and deduplication. The SDK defines schema for **memory linking** (bidirectional, 7 relationship types) and **memory consolidation** (core memory clustering); full implementations exist in the CLARK demo.

---

## ClarkOS vs ElizaOS (VINCE context)

VINCE is built on **ElizaOS**. This table highlights where ClarkOS differs:

| Capability | ElizaOS (VINCE) | ClarkOS |
|------------|-----------------|--------|
| **Execution model** | Request–response | Continuous tick cycle |
| **Memory types** | 1 (conversation-focused) | 5 (episodic, semantic, emotional, procedural, reflection) |
| **Memory deduplication** | Single threshold (e.g. 0.95) | Type-specific thresholds |
| **Memory relationships** | None | Bidirectional linking (7 types) *(schema in SDK)* |
| **Memory consolidation** | None | Core memory clustering *(schema in SDK)* |
| **State model** | Minimal | Mood, health, routine, volatility |
| **Time awareness** | None | Routine-based (morning, day, evening, overnight) |
| **Backend** | Custom adapters (e.g. SQL, Supabase) | Convex serverless |

So ClarkOS emphasizes **always-on cognition**, richer **memory taxonomy**, and **stateful personality** (mood/health/routine). ElizaOS emphasizes **plugin-driven actions**, many integrations, and request–response flows.

---

## SDK vs CLARK Demo

The open repo is the **ClarkOS SDK**. The live app at clark.wiki runs **CLARK**, which adds:

- Full memory linking and consolidation  
- Full consciousness synthesis  
- Daily journals  
- Chat with presence  
- Market analysis  

The SDK gives you the core tick engine, 5 memory types, dedup, plugins, and multi-provider LLM; CLARK adds product features on top.

---

## Technical Stack (from docs)

- **Runtime:** Node.js 18+ with TypeScript  
- **Backend:** Convex serverless (real-time subscriptions, transactional mutations)  
- **Embeddings:** Google Gemini (free tier) or OpenAI  
- **LLM:** OpenRouter, OpenAI, Anthropic, or custom  
- **UI:** React Ink (terminal-based)  
- **Testing:** Jest (179 tests)

---

## Quick start (from ClarkOS docs)

```bash
git clone https://github.com/clarkOS/clark my-agent
cd my-agent/example/convex
npm install
npm run demo   # No API keys needed
```

With API keys:

```bash
cp .env.example .env.local
# Edit .env.local with your API keys
npm run dev
```

---

## Use ClarkOS inside ElizaOS? Recommendation

**Short answer: don't adopt ClarkOS as the framework — too much overlap and a different stack. Do borrow specific ideas on top of ElizaOS where they add value.**

### Why not adopt ClarkOS as the framework

| Issue | Detail |
|--------|--------|
| **Overlap** | Both are full agent runtimes (memory, LLM, plugins). You'd be maintaining or replacing one with the other, not "adding" ClarkOS. |
| **Backend** | ClarkOS is tied to **Convex**. VINCE is on **Postgres/Supabase** (ElizaOS tables + `plugin_vince` feature store). Moving to Convex = redoing all persistence and losing Supabase/Eliza Cloud fit. |
| **Execution model** | ElizaOS is message/event-driven (Discord, Slack, ALOHA triggers, actions). ClarkOS is time-slice tick. Fusing them would mean two runtimes or a full rewrite of how VINCE reacts to events. |
| **Plugin ecosystem** | VINCE relies on ElizaOS plugins (Discord, Slack, bootstrap, SQL, etc.) and a large plugin-vince (paper bot, actions, providers). ClarkOS has its own plugin model; porting is non-trivial and duplicate surface. |
| **Cost/benefit** | Replacing ElizaOS with ClarkOS would rewrite the very thing that already gives you "push not pull" (ALOHA, paper bot, feature store). The unique value of ClarkOS (tick, 5 memory types, Convex) doesn't justify throwing away the current stack. |

So: **using the ClarkOS framework inside or alongside ElizaOS doesn't make sense** — same problem space, different backend and execution, and VINCE is already committed to ElizaOS + Supabase.

### What does make sense: borrow ideas, stay on ElizaOS

You can get most of the benefit without Convex or a second runtime:

1. **Tick-like behavior** — Add a **scheduled job** (cron or ElizaOS task) that runs every N minutes in plugin-vince: load state, optionally call LLM for "proactive reasoning", write to ElizaOS memory or your feature store. That gives you "always-on" style updates without replacing the request–response core.

2. **Richer memory typing** — Use **memory table names or metadata** (e.g. `episodic` vs `semantic`) and different **similarity thresholds** per type when searching. ElizaOS already has `tableName` and embeddings; you can approximate ClarkOS-style typing and dedup in your own layer.

3. **Routine / time-of-day awareness** — In ALOHA or other actions, use **time of day** (morning / day / evening / overnight) to change tone or what's included. No need for ClarkOS; a small provider or state field is enough.

4. **State (mood/health)** — If you ever want "mood" or "volatility" for the agent's persona, store them as **plugin state or DB fields** and feed them into prompts. No need for ClarkOS's state model.

Implementing these **on top of ElizaOS** keeps one stack, one backend, and your existing deployments (Eliza Cloud, Supabase) while still getting the ideas that make ClarkOS interesting.

### Summary

| Question | Answer |
|----------|--------|
| Use ClarkOS as the main framework? | **No** — overlap, Convex lock-in, rewrite cost. |
| Run ClarkOS next to ElizaOS? | **No** — two runtimes and two backends for little gain. |
| Borrow tick / memory / routine ideas in VINCE? | **Yes** — implement via tasks, memory metadata, and providers inside plugin-vince. |

So: **treat ClarkOS as a design reference, not a dependency.** Steal the concepts that help (tick-like scheduling, memory typing, routine); skip the framework and backend.

---

## Why this doc in VINCE

- **Design reference:** Tick-based execution and multi-type memory are useful when evolving VINCE’s paper bot or feature store.  
- **Contrast:** Clarifies “ElizaOS vs continuous cognitive agent” for architecture decisions.  
- **Decision record:** Documents why we don't adopt ClarkOS the framework but do borrow from it (see section above).
- **Future work:** Ideas like type-specific memory, mood/health state, or routine-aware behavior can be tracked here before any implementation in VINCE.

---

## Links

- **Documentation:** [https://docs.clarkos.dev/](https://docs.clarkos.dev/)  
- **Quickstart:** [https://docs.clarkos.dev/quickstart](https://docs.clarkos.dev/quickstart)  
- **GitHub:** [https://github.com/clarkOS/clark](https://github.com/clarkOS/clark)  
- **X / Twitter:** [@clarkwiki](https://twitter.com/clarkwiki)
