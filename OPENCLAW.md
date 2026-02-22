# OpenClaw workspace orientation

When you (OpenClaw) work on this repo — including the fork [eliza420ai-beep/vince](https://github.com/eliza420ai-beep/vince) — you're in the right place.

## Four home directories

| Directory            | Purpose |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **openclaw-agents/** | Sub-agents (alpha, market-data, onchain, news), orchestrator, Brain/Muscles/Bones/DNA/Soul/Eyes/Heartbeat/Nerves flows, workspace templates. Run agents here; workspace files sync to `knowledge/teammate/` and `~/.openclaw/workspace/`. See [openclaw-agents/README.md](openclaw-agents/README.md). |
| **vault/**           | Knowledge vault (Claude Code / Obsidian): inbox, todos (01-todos), project context (02-projects/vince/CLAUDE.md), meetings (06-meetings), standup sync. Use for capture, task flow, meeting notes. See [vault/README.md](vault/README.md). |
| **skills/**          | Cursor/Claude skills: **x-research** (X/Twitter search, thread, watchlist; same X token as VINCE in-chat), **whats-the-trade** (belief router — turn opinions into trade expressions), **trading-agent** (EVClaw reference — OpenClaw live trading agent for Hyperliquid perps/HIP3). See [skills/x-research/README.md](skills/x-research/README.md), [skills/trading-agent/README.md](skills/trading-agent/README.md). |
| **tasks/**           | Working notes, lessons, frontend quickstarts, todo. Task backlogs and team notes. See [tasks/README.md](tasks/README.md). |

## Clawterm: OpenClaw Expert

**Clawterm** is the OpenClaw specialist agent. Key knowledge:

### Essential Repos
- [openclaw/openclaw](https://github.com/openclaw/openclaw) — Core framework
- [elizaOS/openclaw-adapter](https://github.com/elizaOS/openclaw-adapter) — Eliza plugins in OpenClaw
- [openclaw/openclaw-ansible](https://github.com/openclaw/openclaw-ansible) — Ansible deployments
- [openclaw/nix-openclaw](https://github.com/openclaw/nix-openclaw) — NixOS deployments
- [openclaw/nix-steipete-tools](https://github.com/openclaw/nix-steipete-tools) — Pete's personal Nix tools
- [openclaw/clawhub](https://github.com/openclaw/clawhub) — Skills/plugins hub
- [openclaw/barnacle](https://github.com/openclaw/barnacle) — Local-first data sync

### Pete's GitHub (the edge!)
- Main: https://github.com/steipete
- [steipete/oracle](https://github.com/steipete/oracle) — Great example of Pete's personal AI agent

### Key X Accounts
- @OpenClawHQ — Official
- @steipete — Founder
- @AlexFinn, @MisbahSy, @aiedge_ — Tips & updates
- @matthewberman, @petergyang, @gmoneyNFT, @kloss_xyz, @frankdegods — AI/Crypto

### Lore
- **Founder:** Pete (Peter Steinberger) — builds in public, streams regularly
- **OpenAI Funding:** Funded a non-profit to keep OpenClaw open source forever
- **Sponsor:** https://github.com/sponsors/openclaw

### Gateway
- Port 18789 by default
- Bind modes: `--bind 0.0.0.0` (LAN), `--bind tailnet` (VPN), `--bind public` (auth)

## Sentinel

For PRDs, where to implement, and OpenClaw integration, ask **Sentinel** (core dev agent); see [src/agents/sentinel.ts](src/agents/sentinel.ts) and [docs/SENTINEL.md](docs/SENTINEL.md).

## Deliverables

Implement PRDs from **docs/standup/prds/**; apply Eliza tasks from **docs/standup/eliza-tasks/**.
