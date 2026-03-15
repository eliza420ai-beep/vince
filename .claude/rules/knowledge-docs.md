---
paths: ["knowledge/**/*.md", "docs/**/*.md"]
---

# Knowledge and Documentation Conventions

## Knowledge Files

Knowledge files in `knowledge/` are RAG-ingested by agents at runtime. They directly shape agent responses.

### Writing Style

- Write for the agent, not for a human reader. The agent will retrieve chunks of this text and use them to answer questions.
- Front-load the most important information. RAG retrieval may only return a chunk, not the full document.
- Use concrete facts, numbers, and names. Avoid vague language.
- No AI-slop: no "leverage", "streamline", "robust", "cutting-edge", "holistic". See `knowledge/teammate/NO-AI-SLOP.md`.

### Structure

- Use clear headers (## level) to separate topics. Each section should be self-contained enough to be useful as a standalone RAG chunk.
- Keep sections under 500 words for optimal chunking.
- Include dates when information is time-sensitive (market data, prices, events).

### Shared vs Agent-Specific

- `knowledge/teammate/`: shared across all agents. Core philosophy, brand voice, user preferences.
- `knowledge/<agent>-docs/`: agent-specific. Only loaded by that agent.
- Use `shared: true` in character knowledge config for `teammate/` directory.

## Docs Files

Files in `docs/` are project documentation for developers, not RAG knowledge for agents.

### When to Update

- Update the relevant doc when adding a new action, service, or agent capability.
- Update `docs/AGENTS_INDEX.md` when an agent's capabilities change.
- Update `.env.example` when adding new environment variables.

### Doc Style

- Benefit-led. State what the feature does for the user/developer, then how.
- Include a "Quick Start" section when the doc describes a workflow.
- Use tables for comparing options, listing env vars, or mapping features to files.
