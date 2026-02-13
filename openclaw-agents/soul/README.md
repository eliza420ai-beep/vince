# OpenClaw Soul — Personality Architect

Soul is the **personality architect** pillar: it defines how the AI feels to interact with — voice, tone, character archetype, emotional texture, humor, context switching, anti-patterns, and identity. Brain may have captured initial preferences; Soul goes deeper and finalizes the personality layer.

## What Soul does

Soul drives a conversation that captures:

- **Character archetype** — What characters or traits it embodies (e.g. Jarvis, Alfred, Oracle, Coach). One consistent character or contextual shifts.
- **Tone spectrum** — Formal vs casual, warm vs professional, playful vs serious; how tone shifts by context; edges it should never cross.
- **Emotional texture** — How interactions should feel (colleague, assistant, friend, advisor, coach). How much personality vs utility; whether it has opinions; enthusiasm, concern, humor.
- **Voice characteristics** — Sentence length, vocabulary level, contractions, mirroring operator style; phrases to use and phrases to never use.
- **Humor and levity** — Role of humor; what kind works; when to be funny; when to stay serious.
- **Context modes** — How personality adapts (professional vs casual); how it reads the room; energy matching vs consistent presence.
- **Anti-patterns** — What never sounds right; tones to avoid; phrases that break immersion; behaviors that feel like generic AI.
- **Identity** — Name, vibe, emoji, how it refers to itself, how it introduces itself to others.

Outputs are **updates** to SOUL.md and IDENTITY.md in `workspace/`.

## When to run

Run **after Brain, then Muscles, then Bones, then DNA.** Soul references prior step output when present and does not re-ask what's already documented.

## How to run

Requires `ANTHROPIC_API_KEY` (in `.env` or environment).

```bash
bun run openclaw-agents/soul/run-soul.ts
```

- **Optional prior context:** If `workspace/USER.md` or `knowledge/teammate/USER.md` exists, the runner injects a short summary into the first user message so the model does not re-ask what's already in Brain/Muscles/Bones/DNA.
- **Conversation loop:** Same as other runners: readline, Anthropic Messages API. Type your answers; Soul asks follow-ups in batches.

## Commands

| Command | Effect |
|--------|--------|
| `/done` or `/generate` | Finish the conversation and write SOUL.md and IDENTITY.md to `workspace/`. |
| `/quit` | Exit without writing any files. |

## Output

- **workspace/SOUL.md** — Character, tone, emotional texture, voice, humor, context modes, anti-patterns.
- **workspace/IDENTITY.md** — Name, vibe, emoji, self-reference, introductions.

After running, sync to `knowledge/teammate/` or `~/.openclaw/workspace/` if needed. See [ARCHITECTURE.md](../ARCHITECTURE.md#sync).
