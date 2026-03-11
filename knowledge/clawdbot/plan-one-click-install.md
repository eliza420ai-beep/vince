---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Plan: One-Click OpenClaw Install Flow

A single, repeatable flow that implements the [setup & security guide](instructions-clawdbot.md) and bakes in [practical tips](openclaw-practical-tips.md): private Discord with channels, small/script-like tasks, and safe defaults so OpenClaw is useful from day one without bad loops or overload.

---

## Goals

1. **One entry point**: User chooses target (Hetzner VPS / Raspberry Pi / existing Ubuntu server), then runs one installer (script or wizard).
2. **Security by default**: Tailscale-first access, SSH key-only, firewall, no public ports. On Pi path: Venice AI, Matrix E2E, ACIP/PromptGuard/SkillGuard, file perms, audit.
3. **Practical defaults**: Discord (or chosen channel) with a suggested channel layout; optional starter cron (e.g. “news at 6am”); SOUL.MD template with CRITICAL section; clear “use for small tasks / use CC for complex” in docs.
4. **Minimal manual steps**: Only things that can’t be automated: API keys, one-time Tailscale auth, pairing. Everything else scripted or wizard-driven.

---

## Scope: What “One-Click” Means

| Layer            | Option A (MVP)                                                       | Option B (Full)                                                            |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Infra**        | User creates VPS/Pi manually; installer runs on a fresh Ubuntu/Pi OS | Optional: Terraform/API to create Hetzner server, then run installer       |
| **Install**      | Single bash script (or two: `install-vps.sh`, `install-pi.sh`)       | One wrapper script that detects OS (Ubuntu vs Pi) and branches             |
| **Config**       | Interactive wizard (prompts for API keys, channel choice)            | Non-interactive via env file (e.g. `.env.openclaw`) for CI/repeat installs |
| **Post-install** | Print checklist (Discord setup, pairing, first task)                 | Optional: Discord bot/create-server script; optional cron template install |

**Recommendation**: Start with **Option A** for install and config; add env-file mode and optional infra (Option B) once the single-script flow is stable.

---

## Deployment Targets

### Target 1: Hetzner VPS (or any Ubuntu 22.04/24.04 VPS)

- **Input**: Fresh Ubuntu, root or sudo, public IP (we lock it down with Tailscale).
- **Automated**:
  - System: `apt update/upgrade`, install `curl`, `ufw`, `fail2ban`.
  - Tailscale: install, `tailscale up` (user completes auth in browser once), record Tailscale IP.
  - SSH: restrict to `tailscale0`, disable password auth, UFW allow 22 only on tailscale0. Remind user to add Hetzner firewall rule for 100.64.0.0/10.
  - OpenClaw: run official bootstrap (e.g. `openclaw-onboard` bootstrap.sh), then `openclaw onboard --install-daemon` with defaults or env-driven choices.
  - Channel: default Telegram (simplest) or prompt for Discord bot token and configure Discord.
- **Manual**: Hetzner firewall edit (or document); Tailscale auth URL once; API keys (LLM, Telegram/Discord); pairing after first message.

### Target 2: Raspberry Pi (Raspberry Pi OS 64-bit)

- **Input**: Pi 5 (or 4) with Raspberry Pi OS flashed (SSH + key-based auth enabled via Imager).
- **Automated**:
  - System: `apt update/upgrade`, `unattended-upgrades`.
  - Tailscale: install, `tailscale up`, UFW restrict SSH to tailscale0.
  - Node: nvm + Node 24.
  - OpenClaw: official install.sh, then onboarding with Venice AI + Matrix (or Discord) chosen.
  - Matrix: install plugin, apply `sed` fix for `workspace:*`, remove duplicate global plugin if present; add `channels.matrix` to `openclaw.json` from template (user fills password).
  - Systemd: install `openclaw.service` (hardened: `ProtectSystem`, `ReadWritePaths=~/.openclaw`).
  - Security: chmod 700 `~/.openclaw`, 600 for json/credentials; install SkillGuard + PromptGuard via ClawHub; optional ACIP via “install this repo” instruction in a post-install note; disable Bonjour; run `openclaw security audit --deep`.
- **Manual**: Venice API key, Matrix (or Discord) credentials, Tailscale auth, pairing, optional ACIP install via bot.

### Target 3 (optional): Existing Ubuntu server

- Same as Target 1 but skip “create server” and assume Tailscale (or existing SSH) is already desired. Script idempotent: if Tailscale/OpenClaw already present, skip or upgrade.

---

## What the Flow Must Incorporate

### From the setup guide

- **Part I (VPS)**: Tailscale, UFW, Fail2Ban, bootstrap script, `openclaw onboard --install-daemon`, Telegram (or Discord) config, pairing command printed at end.
- **Part II (Pi)**: Tailscale, Venice AI, Node 24, OpenClaw, Matrix plugin + dependency fix, systemd unit, file permissions, SkillGuard + PromptGuard, security audit, pairing (matrix), ACIP instructions in post-install.

### From the practical tips

- **Discord with channels**: Either (1) document “create private server + channels (e.g. #news, #scripts, #projects)” in post-install, or (2) provide a small script that uses Discord API to create a server and channels (user supplies bot token with `manage server`). Prefer (1) for MVP; (2) as optional add-on.
- **Small tasks**: Post-install message + optional cron: e.g. “Example: ask your bot to get the news every day at 6am and summarize. We’ve added a cron template in `~/.openclaw/cron-examples/` (or similar).”
- **SOUL.MD**: Installer writes a default `SOUL.MD` (or `SOUL.md`) with a **CRITICAL** section and a short note: “Add CRITICAL rules for things the bot must never do.”
- **What to use when**: In post-install README or printed summary: “Use OpenClaw for small automations and scripts; use Claude Code (or similar) for complex projects where you need full control over structure and output.”

---

## Implementation Phases

### Phase 1: Single script per target (MVP)

1. **`install-openclaw-vps.sh`** (runs as root on Ubuntu 22.04/24.04)
   - Steps: system packages → Tailscale (install + `up`, pause for user to auth) → SSH + UFW lock down → OpenClaw bootstrap → `openclaw onboard` (interactive or with env vars).
   - Output: Tailscale IP, “SSH only via tailscale”, pairing command, link to tips doc.
   - Config: LLM (Anthropic/OpenAI/Venice), channel (Telegram or Discord). Prompt for API keys or read from env.

2. **`install-openclaw-pi.sh`** (runs as `pi` or first sudo user on Raspberry Pi OS)
   - Steps: system + unattended-upgrades → Tailscale → UFW → nvm + Node 24 → OpenClaw install → onboarding (Venice, Matrix or Discord) → Matrix plugin + sed fix → systemd → chmod → SkillGuard + PromptGuard → security audit.
   - Output: Tailscale IP, “pairing: openclaw pairing approve matrix <CODE>”, ACIP install instruction, SOUL.MD path, cron example path, link to tips.

3. **Post-install artifact**
   - `~/.openclaw/POST-INSTALL.md` (or similar) generated by installer:
     - Discord: “Create a private server and channels (#news, #scripts, #projects). Invite your bot. Use one channel per topic.”
     - Example task: “Try: ‘Get the news every day at 6am and summarize it for me.’”
     - SOUL.MD: “Add CRITICAL rules for things the bot must never do.”
     - “Use OpenClaw for automations; use Claude Code for complex, structure-sensitive work.”
     - Links: instructions-clawdbot.md, openclaw-practical-tips.md (or hosted URLs).

### Phase 2: Unify and add env-file mode

4. **`install-openclaw.sh`** (single entry point)
   - Detects OS (e.g. `lsb_release`, or check for `/proc/device-tree/model` for Pi). Calls `install-openclaw-vps.sh` or `install-openclaw-pi.sh` (or inlines both flows).
   - Optional: `--env .env.openclaw` to drive non-interactive install (API keys, channel type, LLM provider). Required for “real” one-click in automation.

5. **`.env.openclaw.example`**
   - `OPENCLAW_LLM_PROVIDER=venice|anthropic|openai`
   - `OPENCLAW_LLM_API_KEY=...`
   - `OPENCLAW_CHANNEL=matrix|discord|telegram`
   - `OPENCLAW_MATRIX_*` or `OPENCLAW_DISCORD_*` or `OPENCLAW_TELEGRAM_*` (homeserver, user, password, etc.).
   - Installer reads these and pre-fills or non-interactively configures onboarding.

### Phase 3: Optional extras

6. **Discord server + channels helper**
   - Script or OpenClaw skill: given a Discord bot token with the right scopes, create a private server and channels (e.g. `#news`, `#scripts`, `#general`). Document in POST-INSTALL.md as optional.

7. **Cron template**
   - Installer drops a file like `~/.openclaw/cron-examples/daily-news-6am.txt` with a one-liner or description: “Add to crontab or use OpenClaw scheduling: get news at 6am and summarize.” No actual crontab write without user consent.

8. **Hetzner infra (optional)**
   - Terraform (or Pulumi) module: create CX33, Ubuntu 24.04, firewall, SSH key. Output: public IP. User then runs `install-openclaw-vps.sh` over SSH (or use cloud-init to run installer on first boot). Fully optional; keeps “one-click” doable without cloud APIs.

---

## Manual Steps That Stay Manual

- **API keys**: User must obtain and paste (or set in env). Installer can validate format (e.g. key present, length) but not create keys.
- **Tailscale auth**: `tailscale up` prints a URL; user must open and approve device once. Script can pause and prompt “Press Enter after authorizing in browser.”
- **Pairing**: After first message in Telegram/Discord/Matrix, user runs `openclaw pairing approve <channel> <CODE>`. Installer prints this clearly.
- **Discord server**: Unless we add the optional “create server via API” helper, user creates server and channels and invites the bot; installer only documents the pattern.
- **ACIP (Pi path)**: User tells the bot “Install this: https://github.com/.../acip”. Installer can print this; optional: script that appends to SOUL.MD “Reminder: install ACIP for prompt-injection hardening (see POST-INSTALL.md).”

---

## File Layout (Suggested)

```
knowledge/clawdbot/
├── instructions-clawdbot.md      # Full manual guide (existing)
├── openclaw-practical-tips.md   # Tips doc (existing)
├── plan-one-click-install.md    # This plan
├── install/
│   ├── install-openclaw.sh      # Entry point (Phase 2)
│   ├── install-openclaw-vps.sh  # VPS flow (Phase 1)
│   ├── install-openclaw-pi.sh   # Pi flow (Phase 1)
│   ├── .env.openclaw.example    # Example env (Phase 2)
│   ├── templates/
│   │   ├── openclaw.json.matrix   # Channels block for Matrix
│   │   ├── openclaw.service       # Systemd unit
│   │   └── SOUL.MD.example        # CRITICAL section + short guidance
│   └── post-install/
│       ├── POST-INSTALL.md.tpl   # Template for generated POST-INSTALL
│       └── cron-examples/
│           └── daily-news-6am.txt
```

Repo root could have a single “one-click” entry that points at `knowledge/clawdbot/install/install-openclaw.sh` and documents prerequisites (e.g. “Fresh Ubuntu or Pi, SSH key, API keys ready”).

---

## Success Criteria

- **VPS**: From a fresh Ubuntu VPS (or Hetzner-created), user runs one script, completes Tailscale auth and API key prompts (or env file), and ends with OpenClaw running as a daemon, reachable only via Tailscale, with pairing command and POST-INSTALL printed.
- **Pi**: From a flashed Pi (SSH + key), user runs one script, completes Tailscale auth and Venice/Matrix (or Discord) credentials, and ends with OpenClaw running under systemd, Matrix E2E (or Discord), security skills and audit done, POST-INSTALL with Discord channel advice, SOUL.MD template, and “small tasks vs CC” guidance.
- **Docs**: POST-INSTALL references the full guide and the practical tips so the one-click flow stays aligned with “what actually works.”

---

## Next Steps

1. Create `knowledge/clawdbot/install/` and add `install-openclaw-vps.sh` (extract and automate steps from Part I of the guide).
2. Add `install-openclaw-pi.sh` (extract and automate Part II), including Matrix plugin fix and security hardening.
3. Add template files (systemd, SOUL.MD.example, POST-INSTALL.md.tpl, cron example).
4. Test on fresh Ubuntu 24.04 and Raspberry Pi OS; document any manual overrides.
5. Add `install-openclaw.sh` detector and optional `.env.openclaw.example` for Phase 2.
6. Optionally add Discord server-creation helper and/or Hetzner Terraform in Phase 3.

This plan ties the one-click flow directly to the security guide and the practical tips so the installed system is both secure and set up for success (channels, small tasks, clear boundaries).

## Related

- [Instructions Clawdbot](instructions-clawdbot.md)
- [Openclaw Practical Tips](openclaw-practical-tips.md)
- [X Research Agent Curated Follows](x-research-agent-curated-follows.md)
- [Etf Landscape](../regulation/etf-landscape.md)
- [Regulation Frameworks](../regulation/regulation-frameworks.md)
