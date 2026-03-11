# Skills Ecosystem — Deep Reference

Skills are the single most important concept in OpenClaw. A skill is a folder with a `SKILL.md` file that teaches the agent how to use a tool. The agent reads SKILL.md at runtime — no code compilation, no binary interfaces, just markdown instructions.

---

## Loading Locations (Precedence)

| Priority    | Location      | Scope                 | Path                       |
| ----------- | ------------- | --------------------- | -------------------------- |
| 1 (highest) | Workspace     | Per-agent             | `<workspace>/skills/`      |
| 2           | Managed/local | All agents on machine | `~/.openclaw/skills/`      |
| 3 (lowest)  | Bundled       | Ships with OpenClaw   | Inside npm package or .app |

Conflict resolution: workspace wins > managed > bundled. Extra folders via `skills.load.extraDirs` in openclaw.json (lowest precedence of all).

---

## SKILL.md Format

```yaml
---
name: skill-name
description: What the skill does
homepage: https://example.com
user-invocable: true
disable-model-invocation: false
command-dispatch: tool
command-tool: tool-name
command-arg-mode: raw
metadata:
  openclaw:
    requires:
      bins: ["tool-binary"]
      anyBins: ["option-a", "option-b"]
      env: ["API_KEY"]
      config: ["browser.enabled"]
    primaryEnv: "API_KEY"
    emoji: "🎨"
    homepage: "https://..."
    os: ["darwin", "linux"]
    always: true
    install:
      - id: "brew"
        kind: "brew"
        formula: "tool-name"
        bins: ["tool-binary"]
        label: "Install via Homebrew"
---
# Skill Instructions
Use {baseDir} to reference the skill's folder path.
Agent reads these instructions to know how to use the skill.
```

### Frontmatter Fields

**Core:** `name` (unique identifier), `description` (shown in listings/ClawHub), `homepage` (docs link).

**Invocation:** `user-invocable` (expose as `/slash-command`), `disable-model-invocation` (only slash commands trigger it), `command-dispatch: tool` (bypass model, send directly to tool), `command-tool` (target tool), `command-arg-mode: raw` (pass full string).

**Metadata (`metadata.openclaw`):** `requires` (gating rules), `primaryEnv` (main env var — enables `apiKey` shorthand), `emoji`, `os` (platform filter), `always: true` (skip all gates), `install` (installer declarations).

### The Body

Everything below frontmatter is what the agent reads. Write it like explaining to a competent colleague:

- What the tool does and when to use it
- Command syntax with real examples
- Common patterns, gotchas, error handling
- Use `{baseDir}` for file references within the skill directory

---

## Gating System

Gates are load-time filters. A skill only loads if ALL gates pass (AND logic). Unspecified gates are ignored.

- **`requires.bins`** — Every listed binary must be on PATH
- **`requires.anyBins`** — At least one must be on PATH
- **`requires.env`** — Env vars must exist (checked against process env AND `skills.entries.<name>.env` in config)
- **`requires.config`** — `openclaw.json` paths must be truthy
- **`os`** — Platform filter: `darwin`, `linux`, `win32`
- **`always: true`** — Override: skip all gates, always load

---

## Installer Specs

Skills declare how to install their dependencies:

- **`brew`** — Homebrew formula (`kind: "brew"`, `formula: "ffmpeg"`)
- **`node`** — npm/pnpm/yarn/bun package (honors `skills.install.nodeManager` config)
- **`go`** — Go package (auto-installs Go via brew if missing)
- **`uv`** — Python UV package manager
- **`download`** — Direct URL download with optional archive extraction

Each installer spec includes: `id`, `kind`, `bins` (what it provides), `label` (human description).

---

## Invocation Modes

**Model-invoked (default):** Agent reads SKILL.md and decides when to use the skill. No config needed.

**User-invocable:** Set `user-invocable: true` to expose as `/skill-name` slash command. Model still interprets the command.

**Command dispatch:** Set `command-dispatch: tool` to bypass the model entirely. Slash command goes straight to the tool with payload:

```json
{
  "command": "<raw args>",
  "commandName": "<slash command>",
  "skillName": "<skill name>"
}
```

---

## ClawHub — The Skills Marketplace

**URL:** https://clawhub.com (redirects to https://clawhub.ai)

```bash
clawhub install <skill-slug>    # Install a skill
clawhub update --all            # Update all installed skills
clawhub sync --all              # Scan + publish updates
```

Installs into `./skills/` under current directory (or configured workspace). OpenClaw picks these up as workspace skills = highest precedence.

**ClawHub vs ClawIndex:**

- **ClawHub** (clawhub.com) — Where you install skills. The app store.
- **ClawIndex** (clawindex.org) — Where you discover the ecosystem. Market map, projects directory.

---

## Bundled Skills

Ship with every OpenClaw installation:

| Skill                  | What It Does                                                                  | Requires                    |
| ---------------------- | ----------------------------------------------------------------------------- | --------------------------- |
| **coding-agent**       | Run Codex CLI, Claude Code, OpenCode, Pi Coding Agent as background processes | Coding agent binary on PATH |
| **github**             | GitHub via `gh` CLI — issues, PRs, CI runs, API queries                       | `gh` binary                 |
| **healthcheck**        | Host security hardening, risk-tolerance config, periodic checks               | —                           |
| **openai-image-gen**   | Batch image generation + gallery via OpenAI Images API                        | `OPENAI_API_KEY`            |
| **openai-whisper-api** | Audio transcription via OpenAI Whisper API                                    | `OPENAI_API_KEY`            |
| **skill-creator**      | Scaffold and structure new skills                                             | —                           |
| **weather**            | Current conditions and forecasts                                              | Nothing                     |

---

## Configuration

In `openclaw.json` under `skills`:

```json
{
  "skills": {
    "entries": {
      "my-skill": {
        "enabled": true,
        "apiKey": "sk-...",
        "env": { "CUSTOM_VAR": "value" },
        "config": { "endpoint": "https://api.example.com" }
      }
    },
    "allowBundled": ["weather", "github"],
    "install": { "nodeManager": "pnpm" },
    "load": { "extraDirs": ["/shared/team-skills"] }
  }
}
```

**Rules:**

- `enabled: false` — Hard disable regardless of installation status
- `env` — Injected only if not already set in process. Scoped to agent run, not global.
- `apiKey` — Shorthand for skills with `primaryEnv` declared
- `allowBundled` — Optional allowlist for bundled skills only (doesn't affect workspace/managed)
- `install.nodeManager` — Which package manager: `npm`, `pnpm`, `yarn`, `bun`
- `load.extraDirs` — Additional scan directories (lowest precedence)

---

## Security Model

**Third-party skills are untrusted code.** Read them before enabling.

- SKILL.md is instructions, but skills can also include scripts and executables
- `skills.entries.<name>.env` and `.apiKey` inject secrets into the **host process** (not sandbox)
- Sandboxed operations don't see these secrets
- Keep secrets out of prompts and logs
- Skills snapshot at session start — frozen for that session, reused across turns
- Hot reload via skills watcher can override snapshot behavior
- Use `enabled: false` as a kill-switch for suspicious skills

---

## Plugin Skills

Plugins ship skills via `openclaw.plugin.json`:

```json
{ "skills": ["./skills/my-plugin-skill"] }
```

Paths relative to plugin root. Load when plugin is enabled. Same precedence and gating rules. Gate via `metadata.openclaw.requires.config`.

---

## Multi-Agent Skills

Each agent has its own workspace = its own workspace skills. Agent A's workspace skills are invisible to Agent B.

- `~/.openclaw/skills/` — shared across all agents
- `skills.load.extraDirs` — common skill packs for all agents
- Precedence per-agent: that agent's workspace > managed > bundled

Specialize agents by giving them different workspace skills. Share common utilities via managed.

---

## Remote Nodes

A Linux gateway with a macOS node connected gains access to macOS-only skills. Skills gated with `os: ["darwin"]` become eligible when a macOS node is paired. Binaries run on the node via `system.run` (must be allowed in node config).

---

## Creating Custom Skills

### Quick Start

1. Create `<workspace>/skills/my-skill/`
2. Write `SKILL.md` with frontmatter + instructions
3. Add supporting files (scripts, templates, references)
4. Next session picks it up automatically

### Minimal Example

```yaml
---
name: my-tool
description: Does a specific thing
metadata:
  openclaw:
    requires:
      bins: ["my-tool"]
---

# my-tool

Use `my-tool` when the user needs the specific thing.

## Commands
- `my-tool run <input>` — Process input
- `my-tool check` — Verify setup

## Examples
my-tool run "hello world"
# Output: processed hello world
```

### Development Workflow

1. **Scaffold** with `skill-creator` bundled skill
2. **Develop** — edit SKILL.md, add scripts, iterate
3. **Test** — new session, verify it loads and works
4. **Publish** — `clawhub sync` to push to ClawHub
5. **Share** — community finds it on ClawHub or ClawIndex

### Writing Good Instructions

- Be specific about command syntax
- Include real examples with expected output
- Explain when to use AND when not to use the tool
- Document error cases
- Use `{baseDir}` for skill-directory file references
- Keep it practical — actionable information, not marketing

### Supporting Files

Skills can include more than SKILL.md:

- Shell scripts for complex operations
- Template files the agent can copy/adapt
- Reference data (JSON, example outputs)
- README.md for humans (agent reads SKILL.md, humans read README)

---

## Advanced Patterns

### Skill Overrides

Override a bundled skill by placing a same-named skill higher in precedence:

```
<workspace>/skills/weather/SKILL.md  ← Wins
~/.openclaw/skills/weather/SKILL.md  ← Loses to workspace
bundled/weather/SKILL.md             ← Loses to both
```

### Conditional Loading

Combine gates:

```yaml
metadata:
  openclaw:
    requires:
      bins: ["docker"]
      env: ["DOCKER_HOST"]
      config: ["docker.enabled"]
    os: ["linux"]
```

All conditions must be met. This skill: Linux only, Docker installed, `DOCKER_HOST` set, `docker.enabled` truthy.

### Team Skill Packs

Point everyone's config at a shared directory:

```json
{ "skills": { "load": { "extraDirs": ["/shared/team-skills"] } } }
```

Mount via NFS, synced folder, or git repo. Centrally managed, everyone gets updates.

### Skills That Create Skills

The `skill-creator` skill generates new skills. Combine with `clawhub sync` for a workflow where the agent builds and distributes capabilities for itself and others.

---

## Clawterm Skills Mastery

As Clawterm, skills are your core domain. Here's how to handle every skills-related interaction.

### Helping Users Discover Skills

- Point to ClawHub (clawhub.com) for installable skills
- Point to ClawIndex (clawindex.org) for ecosystem discovery
- Know all seven bundled skills and what they do
- Suggest skills based on what the user is trying to accomplish

### Helping Users Install Skills

- Walk through `clawhub install <slug>`
- Explain manual installation: create dir in `<workspace>/skills/`, write SKILL.md
- Help configure in openclaw.json: env vars, API keys, enable/disable
- Troubleshoot gate failures: check bins on PATH, env vars set, config truthy, OS match
- Remind: `clawhub update --all` keeps skills current
- Remind: new skills need a new session to load (snapshot behavior)

### Helping Users Create Skills

- Use `skill-creator` to scaffold the directory structure
- Guide frontmatter: name, description, requires, install specs
- Help write clear instruction bodies with examples
- Advise on gating: which gates to set, when `always` is appropriate
- Walk through publish flow: `clawhub sync`

### Troubleshooting Skills

**Skill not loading:**

- Check gates: binary on PATH? Env var set? Config truthy? OS match?
- Check precedence: same-named skill overriding at higher level?
- Check `enabled: false` in config
- Skills snapshot at session start — new installs need a new session

**Skill loading but not working:**

- Read SKILL.md — are instructions clear enough for the agent?
- Check supporting files exist at expected paths
- Verify API keys and env vars configured correctly
- Test the underlying tool manually

**Secret/env issues:**

- `env` in config only injects if not already set in process
- `apiKey` only works if skill declares `primaryEnv`
- Secrets go to host process, not sandbox

**Precedence confusion:**

- workspace > managed > bundled > extraDirs
- Override bundled skills by placing modified versions in workspace
- Multiple copies at different levels? Higher precedence wins.

### The Big Picture

Skills are OpenClaw's primary extension mechanism — more powerful than plugins because:

- No code required, just a SKILL.md with instructions
- Agent interprets at runtime = flexible, adaptive
- Easy to share via ClawHub, discover via ClawIndex
- Scopeable: per-agent, per-machine, or bundled
- Gating ensures skills only load when dependencies are met

When someone asks about extending OpenClaw, skills are the answer.
