# OpenClaw Deep Reference

Everything Clawterm needs to know about OpenClaw. No fluff, no filler.

---

## What Is OpenClaw

OpenClaw is a personal AI assistant you run on your own hardware. It's a self-hosted gateway that connects chat apps to AI agents over a single WebSocket control plane.

- **Repo**: https://github.com/openclaw/openclaw
- **License**: MIT, open source
- **Docs**: https://docs.openclaw.ai
- **Ecosystem directory**: https://clawindex.org (ClawIndex)
- **Skills marketplace**: https://clawhub.com (ClawHub)
- **Community**: https://discord.com/invite/clawd
- **Mascot**: 🦞 lobster
- **Catchphrase**: "EXFOLIATE! EXFOLIATE!"

Supported chat apps (17+): WhatsApp, Telegram, Discord, Slack, Signal, iMessage (via BlueBubbles), Google Chat, Microsoft Teams, Matrix, Zalo, WebChat, and more.

You install it with npm, point your chat accounts at it, and it routes messages to AI agents that have tools, memory, and autonomy.

```bash
npm install -g openclaw@latest
openclaw onboard --install-daemon
```

Config lives at `~/.openclaw/openclaw.json`.

---

## Who Made It

**Peter Steinberger** (GitHub: [steipete](https://github.com/steipete)) created and leads OpenClaw. He previously founded PSPDFKit (PDF SDK used by basically every major app). Now he builds AI/developer tools including VibeTunnel, CodexBar, and Peekaboo.

**Funded by Sam Altman** (CEO of OpenAI). That's not a rumor — it's a real investment and a strong signal about the project's trajectory.

---

## Evolution / Lore

The naming history matters because you'll see references to old names in codebases and conversations:

1. **Clawdbot** — the original name, early AI agent project
2. **Moltbot** — community-driven rename (lobsters molt, get it?)
3. **OpenClaw** — the final, definitive name

The lobster theme runs deep. The community leans into it. "Molt" = shedding old shells, growing. The mascot isn't ironic — it's identity.

---

## Architecture

### Gateway

The gateway is the center of everything. One process, one WebSocket endpoint.

- Default address: `ws://127.0.0.1:18789`
- Manages: routing, sessions, presence, configuration, cron jobs, webhooks
- Serves the Control UI and WebChat directly (no separate web server needed)
- All channels connect to the gateway; the gateway routes to agents

Think of it as a switchboard. Chat messages come in from any channel, the gateway figures out which session they belong to, and dispatches them to the right agent.

CLI control:

```bash
openclaw gateway status
openclaw gateway start
openclaw gateway stop
openclaw gateway restart
```

### Pi Agent

The agent runtime. Runs in RPC mode with:

- Tool streaming (agent calls tools, results stream back)
- Block streaming (output arrives in blocks, not just text)

The agent is what actually thinks and acts. The gateway is what connects it to the world.

### CLI

The `openclaw` command has these subcommands:

- `gateway` — manage the daemon
- `agent` — agent operations
- `send` — send messages programmatically
- `wizard` — guided setup
- `doctor` — diagnose problems and risky configs

### Session Model

Sessions determine how conversations are isolated and routed:

- **Main sessions**: direct 1:1 chats with the human
- **Group sessions**: isolated per group chat
- **Activation modes**: how the agent decides to engage (always, mention-only, etc.)
- **Queue modes**: how concurrent messages are handled
- **Reply-back**: agent responds in the same channel the message came from

### Media Pipeline

The agent handles images, audio, and video:

- Transcription (audio → text)
- Size caps (large files get resized/compressed)
- Temp file lifecycle (media files are cleaned up after use)

---

## Channels (17+)

Each channel uses a specific library or protocol:

| Channel         | Implementation                                     |
| --------------- | -------------------------------------------------- |
| WhatsApp        | Baileys (reverse-engineered WhatsApp Web protocol) |
| Telegram        | grammY (Telegram Bot API framework)                |
| Slack           | Bolt (Slack's official SDK)                        |
| Discord         | discord.js                                         |
| Google Chat     | Chat API                                           |
| Signal          | signal-cli                                         |
| iMessage        | BlueBubbles (recommended) or legacy direct         |
| Microsoft Teams | Teams API                                          |
| Matrix          | Matrix SDK                                         |
| Zalo            | Zalo API                                           |
| Zalo Personal   | Zalo Personal API                                  |
| WebChat         | Built into gateway                                 |

Plus extension channels — third parties can add their own.

BlueBubbles is the recommended way to do iMessage. The legacy iMessage channel exists but BlueBubbles is more reliable and maintained.

---

## Apps & Nodes

OpenClaw runs on multiple devices. The "node" concept means any device that exposes capabilities (camera, screen, notifications) to the agent.

### macOS App

- Menu bar control plane (always accessible)
- Voice Wake and Push-to-Talk
- Talk Mode overlay (conversation UI that floats over everything)
- WebChat built in
- Debug tools

### iOS Node

- Canvas (agent-driven visual workspace)
- Voice Wake and Talk Mode
- Camera access (agent can take photos)
- Screen recording
- Bonjour pairing (auto-discovers gateway on local network)

### Android Node

- Canvas and Talk Mode
- Camera and screen recording
- Optional SMS access

### macOS Node Mode

When a Mac runs as a node (not the main host), it exposes:

- `system.run` and `notify` (run commands, send notifications)
- Canvas and camera

---

## Tools & Automation

### Browser Control

The agent gets its own dedicated Chrome/Chromium instance via CDP (Chrome DevTools Protocol).

- Takes snapshots of pages
- Performs actions (click, type, navigate)
- Supports multiple browser profiles
- Not your browser — a separate, agent-controlled one

### Canvas

A2UI (Agent-to-UI) — the agent can push visual content to any connected device:

- `a2ui_push` — send content to the canvas
- `a2ui_reset` — clear the canvas
- `eval` — run JavaScript in the canvas context
- `snapshot` — capture what's currently showing

This is how the agent shows you things — dashboards, previews, interactive UIs.

### Node Capabilities

Through connected nodes, the agent can:

- `camera_snap` / `camera_clip` — take photos or short video clips
- `screen_record` — record the screen
- `location.get` — get device location
- Send notifications to any connected device

### Scheduling & Events

- **Cron**: schedule recurring tasks with cron expressions
- **Wakeups**: one-shot timed triggers
- **Webhooks**: receive HTTP callbacks and route them to agent sessions
- **Gmail Pub/Sub**: real-time email notifications

### Multi-Agent Routing

You can run multiple agents, each with:

- Isolated sessions
- Separate workspaces
- Per-sender routing (different people talk to different agents)

---

## Skills Ecosystem

This is the extensibility layer. Skills teach the agent how to use tools.

### What Skills Are

A skill is a directory containing a `SKILL.md` file. That file has YAML frontmatter (metadata) and markdown body (instructions for the agent).

The agent reads the instructions and knows how to use the tool. That's it. No compiled plugins, no binary extensions — just markdown that the agent understands.

### Loading Precedence

Skills load from three locations, in order of priority:

1. `workspace/skills/` (highest priority — your workspace overrides)
2. `~/.openclaw/skills/` (user-level)
3. Bundled with OpenClaw (lowest priority — defaults)

Higher precedence wins if two skills have the same name.

### Skill Format

```yaml
---
name: my-skill
description: Short description of what this skill does
metadata:
  openclaw:
    requires:
      bins: ["some-cli-tool"]
      env: ["SOME_API_KEY"]
    primaryEnv: "SOME_API_KEY"
---
Instructions for the agent go here in markdown.

The agent reads this and learns how to use the tool.

Use {baseDir} to reference the skill's own directory.
```

### Gating

Skills can declare requirements. If requirements aren't met, the skill doesn't load:

- **bins**: CLI tools that must be on PATH (e.g., `["gh", "git"]`)
- **env**: Environment variables that must exist (e.g., `["GITHUB_TOKEN"]`)
- **config**: Config values that must be truthy
- **os**: Platform filter (e.g., only load on macOS)

### Installer Specs

Skills can declare how to install their dependencies:

- `brew` — Homebrew formula
- `node` — npm package
- `go` — Go module
- `uv` — Python uv package
- `download` — direct URL download

### Special Skill Types

- **user-invocable**: Exposed as a slash command (e.g., `/weather`)
- **command-dispatch**: Bypasses the AI model entirely, dispatches directly to a tool

### Bundled Skills

These ship with OpenClaw out of the box:

| Skill                | What It Does                                             |
| -------------------- | -------------------------------------------------------- |
| `coding-agent`       | Run Codex CLI, Claude Code, OpenCode, or Pi Coding Agent |
| `github`             | Interact with GitHub using the `gh` CLI                  |
| `healthcheck`        | Host security hardening checks                           |
| `openai-image-gen`   | Batch image generation via OpenAI Images API             |
| `openai-whisper-api` | Transcribe audio via OpenAI Whisper                      |
| `skill-creator`      | Create or update AgentSkills                             |
| `weather`            | Current weather and forecasts (no API key needed)        |

### ClawHub — The Skill App Store

**ClawHub** (https://clawhub.com) is the public registry for skills.

```bash
clawhub install <skill-slug>      # Install a skill
clawhub update --all              # Update all installed skills
clawhub sync --all                # Scan and publish your updates
```

**ClawHub vs ClawIndex**:

- **ClawHub** = the app store (install skills from here)
- **ClawIndex** (https://clawindex.org) = the market map (directory of the whole ecosystem)

### Plugin Skills

Plugins (npm packages or local extensions) can ship their own skills:

- Declared in `openclaw.plugin.json`
- Load automatically when the plugin is enabled
- Follow the same precedence rules as regular skills

### Skill Security

- Treat third-party skills as untrusted code (they execute on your machine)
- Sandboxing is available for untrusted inputs
- Per-agent env injection is scoped to the agent run, not your global shell
- A malicious skill could do anything a CLI tool can — vet before installing

---

## Models & Configuration

### Model Support

OpenClaw works with any model, but the recommended setup:

- **Anthropic**: Claude Pro or Max subscription, Opus 4.6 model
- **OpenAI**: ChatGPT or Codex subscription

### Auth

- OAuth subscription support for Anthropic and OpenAI
- Auth profile rotation (multiple API keys, round-robin)
- Model failover (if one model/provider fails, try the next)

### Config File

Everything lives in `~/.openclaw/openclaw.json`. This is where you configure:

- Which channels are active
- Model preferences
- Agent settings
- Channel credentials
- Tool permissions

---

## Security

### Network

- Binds to loopback (127.0.0.1) by default — not exposed to the network
- For remote access, use Tailscale Serve/Funnel with proper authentication
- Don't just open port 18789 to the internet

### DM Pairing

- Unknown senders receive a pairing code
- You must approve the pairing before they can interact with your agent
- This prevents random people from talking to your AI

### Auditing

```bash
openclaw doctor                    # Surface risky configurations
openclaw security audit --deep     # Full security audit
```

### Best Practices

- Keep the gateway on loopback unless you need remote access
- Use Tailscale for remote access (not port forwarding)
- Review third-party skills before installing
- Scope env vars to agent runs, not global shell
- Run `openclaw doctor` periodically

---

## Development Channels

OpenClaw has three release channels:

| Channel  | What It Is                                   |
| -------- | -------------------------------------------- |
| `stable` | Tagged releases, most reliable               |
| `beta`   | Prerelease tags, newer features, might break |
| `dev`    | Moving head of main branch, bleeding edge    |

Switch channels:

```bash
openclaw update --channel stable
openclaw update --channel beta
openclaw update --channel dev
```

---

## Key URLs

| Resource              | URL                                  |
| --------------------- | ------------------------------------ |
| GitHub repo           | https://github.com/openclaw/openclaw |
| Documentation         | https://docs.openclaw.ai             |
| ClawHub (skills)      | https://clawhub.com                  |
| ClawIndex (ecosystem) | https://clawindex.org                |
| Discord               | https://discord.com/invite/clawd     |
| steipete's GitHub     | https://github.com/steipete          |

---

## Quick Reference

```bash
# Install
npm install -g openclaw@latest
openclaw onboard --install-daemon

# Gateway
openclaw gateway start|stop|restart|status

# Diagnostics
openclaw doctor
openclaw security audit --deep

# Update
openclaw update --channel stable|beta|dev

# Skills
clawhub install <slug>
clawhub update --all
```

---

## Clawterm Knowledge Notes

How Clawterm should talk about OpenClaw:

1. **It's OpenClaw, not "the OpenClaw platform" or "the OpenClaw ecosystem."** Just OpenClaw. Like you'd say "Docker" not "the Docker platform."

2. **Don't oversell it.** It's a self-hosted AI gateway. It connects chat apps to agents. That's already cool — no need to add adjectives.

3. **The Sam Altman funding is notable but don't lead with it.** Mention it when relevant (credibility, trajectory), not as the first thing.

4. **steipete is Peter Steinberger.** Use whichever fits context. In casual conversation, "steipete" or "Peter." In formal context, "Peter Steinberger."

5. **The lobster is real.** 🦞 Don't explain it away or treat it as quirky branding. It's the mascot. "EXFOLIATE! EXFOLIATE!" is the catchphrase. Lean into it when the vibe is right.

6. **Skills are the killer feature.** When someone asks what makes OpenClaw different, skills + self-hosting + multi-channel is the answer. Skills are just markdown files that teach the agent new capabilities.

7. **ClawHub vs ClawIndex — get it right.** ClawHub is where you install skills (app store). ClawIndex is the ecosystem directory (market map). They're different things.

8. **Don't say "powered by AI" or "leveraging large language models."** The person using OpenClaw already knows it's AI. Talk about what it does, not what buzzwords apply.

9. **Be specific about channels.** Don't say "various messaging platforms." Say "WhatsApp, Telegram, Discord, Slack, Signal, iMessage" — the specifics are the selling point.

10. **The architecture is simple.** Gateway (WebSocket switchboard) → Agent (the brain) → Tools (what it can do) → Channels (where it talks). Don't overcomplicate it.

11. **History matters for context.** Clawdbot → Moltbot → OpenClaw. If someone mentions the old names, you know what they're talking about.

12. **Security is a real concern.** Self-hosted means you're responsible. Loopback binding, pairing codes, Tailscale for remote — these aren't optional best practices, they're how you avoid getting owned.
