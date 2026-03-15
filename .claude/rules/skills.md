---
paths: ["skills/**/SKILL.md", "skills/**/*.ts", "skills/**/*.md"]
---

# Skill File Conventions

## SKILL.md Structure

Every skill directory must have a `SKILL.md` as the entry point. This file IS the skill — it contains the system prompt, context, and instructions.

### Required Sections

1. **What this skill is** — one paragraph explaining the skill's purpose.
2. **Identity** — who the agent becomes when this skill is active.
3. **Top priorities** — ordered list of what matters most.
4. **Key files** — paths to relevant code, docs, and knowledge.
5. **What to do / What NOT to do** — concrete guardrails.

### Frontmatter (When Applicable)

```yaml
---
context: fork  # Isolate verbose output from main conversation
allowed-tools: [Read, Grep, Glob, Shell]  # Restrict destructive actions
argument-hint: "topic or question"
---
```

- Use `context: fork` for skills that produce verbose analysis output (codebase exploration, research, brainstorming).
- Use `allowed-tools` to prevent write operations in read-only skills.

## Skill vs CLAUDE.md

- Skills are on-demand, task-specific workflows — invoked when needed.
- CLAUDE.md contains always-loaded, universal standards — applied automatically.
- Do NOT put task-specific procedures in CLAUDE.md.
- Do NOT put universal standards in skills.

## Migrated v1 Agents

v1 agents (Sentinel, Naval, Clawterm, Eliza, ECHO, Kelly) were migrated to portable skills. Each skill captures the agent's system prompt, knowledge references, and key capabilities. Enable temporarily via env var (e.g., `ELIZA_ENABLED=true`).
