---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# OpenClaw: What’s Actually Working (Practical Tips)

Lots of posts make wild claims about OpenClaw. In practice it’s powerful but finicky—great at some things, bad at others. Here’s what’s been working for me so far, and what hasn’t.

---

## Tips that have worked

### 1. Use a private Discord with channels

- Create a **private Discord server** and use **channels** for different topics (e.g. news, scripts, projects).
- Much better than one long thread. Clearer context, easier to find things, and the bot can stay on-topic per channel.

### 2. Keep tasks small and script-like

- OpenClaw is strong for **smaller, repeatable tasks** and **running scripts**.
- Example that works well: _“Get the news every day at 6am and summarize it for me.”_
- **Complex, multi-step systems** are harder—it tends to get stuck in bad loops or overcomplicate things. If you need full control over a workflow, see #3.

### 3. Use Claude Code (or similar) for full control over a project

- For **full control** over structure, size, and behavior, a focused coding session (e.g. **Claude Code**) works better.
- Example: I was downloading a dataset over the weekend. OpenClaw downloaded **~500 GB** and the file layout was a mess. I redid it with Claude Code: **~50 GB**, more of the data I actually need, and a clean, structured layout.
- Use OpenClaw for automation and small tasks; use CC (or your preferred coding assistant) when the outcome and structure really matter.

### 4. Context and memory are still inconsistent

- Sometimes OpenClaw is **brilliant**; sometimes it feels like it’s in a bad loop or forgot context.
- Still figuring out how to make context and memory more reliable (SOUL.MD, MEMORY.md, channel discipline, etc.). When you find something that works, document it.

### 5. Integrate OpenClaw into existing apps (especially with threads)

- I’m **moving my productivity web apps** to use OpenClaw as the backend/source.
- With **threads (Discord channels)** it’s much more viable: each app or workflow can have its own channel.
- Good part: I can build on **existing git repos**—no rewrite, just integration. So no extra “new project” work, only wiring OpenClaw in.

---

## Summary

- **Use it for**: Small automations, scheduled scripts, summaries, and as a backend for apps where you control the UI and logic.
- **Don’t expect**: Reliable performance on very complex, multi-step systems or when you need precise control over outputs (size, structure, format). For those, use a coding assistant (e.g. Claude Code) or your own code.
- **Infra**: Private Discord + channels > one thread. Integrate into what you already have (repos, apps) instead of building everything around OpenClaw.

It shows a ton of promise. I’m still learning and tuning. If you like having more control over the process, you’ll probably prefer Claude Code (or similar) for “project-shaped” work and OpenClaw for automation and glue.

---

## Another operator's setup (Discord, heartbeats, config, RAG)

A second perspective from someone running OpenClaw day to day—aligned with the tips above, with extra emphasis on Discord as the org layer, cheap heartbeats, config-not-code, and RAG.

### #1 Discord is the best tool for organizing and communicating with the models

- Use **channels** for system prompts and cron outputs.
- In channels, use **threads as sessions** (one thread = one conversation or task flow).
- Set up a **statusline in Voice groups**—they can update dynamically so you see state at a glance.

### #2 For heartbeats, use a cheap–fast model to avoid ridiculous bills

- Heartbeats are automated cron workflows; define them well.
- They don't need high intelligence—pick a good instruction-follower (e.g. MiniMax-M2.5, Haiku, GLM).
- Don't spam them: every heartbeat is an opportunity to get wrecked if the model is interacting with the outside world.

### #3 Don't use it directly for coding—use it for config and chat

- Use something like **Codex** (or another coding agent) for actual code; it's more efficient and functional.
- You need a way to **track all code and config** that OpenClaw and its subagents change—**git**.
- Give it **TTS and STT** (e.g. ElevenLabs + Parakeet); typing is wasteful most of the time.

### #4 RAG your data

- Ingest data from X, GitHub, etc. and **build a RAG** on top.
- Ask things like: "What did I tweet about 3 days ago?", "How much did I spend in January?", etc.
- Keep track of **side projects**; it helps you prioritize.

### What I do with it

- **Support with shopping** — Would usually use something like GPT's agent mode, but can get farther with OpenClaw.
- **Research, GitHub, content trackers** — Keep up with news and interests.
- **Debug and change app UI** while using it from another device.
- **Chat, ask questions, customize, play, learn, have fun.**

---

## Share your tips

If you’ve found patterns that work (or don’t)—context, memory, channels, scripts, or integration—please share. Still trying to learn as much as possible from people who are actually running it day to day.

## Related

- [Business Idea Openclaw One Click](business-idea-openclaw-one-click.md)
- [Instructions Clawdbot](instructions-clawdbot.md)
- [X Research Agent Curated Follows](x-research-agent-curated-follows.md)
- [Crypto Tax Frameworks](../regulation/crypto-tax-frameworks.md)
- [Us Regulatory Landscape 2026](../regulation/us-regulatory-landscape-2026.md)
