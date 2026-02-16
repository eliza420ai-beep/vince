# Kelly: Lifestyle Concierge Agent (VINCE)

Kelly is the **CVO (Chief Vibes Officer)** agent: five-star hotels, fine dining, fine wine, health, fitness, wellness, and travel. She is the **primary interface** so the user can talk to one agent; she pulls in the team (VINCE, Solus, Otaku, Eliza, Sentinel, Oracle, ECHO) via ASK_AGENT and reports back. She does not give trading or market advice. She is the only agent that uses **plugin-personality** (self-modification).

**Use this doc** to brief OpenClaw (or any agent) on what Kelly can and cannot do today, so you can draft a PRD for the next iteration.

---

## Why Kelly Matters

- **One team, one dream:** User chats with Kelly; she orchestrates Vince (data), Solus (insights), Eliza (knowledge), Otaku (DeFi execution) via ASK_AGENT so the user gets one conversation.
- **Lifestyle-only lane:** Hotels, dining, wine, workouts, swimming, surf, itineraries, experiences. No markets, options, or crypto advice from Kelly herself.
- **Discovery and todo:** plugin-discovery for "What can you do?"; plugin-todo (vendored) for todo/reminders; rolodex optional (in-app reminders only without it).
- **Self-modification:** Only Kelly loads plugin-personality; she can evolve bio, style, topics from feedback (see section below).

---

## What Kelly Can Do Today

- **Daily briefing:** KELLY_DAILY_BRIEFING — health, dining, hotels, wellness; scheduled task pushes to channels whose name contains "kelly" or "lifestyle".
- **Recommendations:** KELLY_RECOMMEND_PLACE (hotels, restaurants); KELLY_RECOMMEND_WINE; KELLY_RECOMMEND_WORKOUT; KELLY_SWIMMING_TIPS; KELLY_RECOMMEND_EXPERIENCE; KELLY_SURF_FORECAST.
- **Planning:** KELLY_ITINERARY; KELLY_WEEK_AHEAD.
- **Context and weather:** KELLY_CONTEXT provider; WEATHER provider (when configured).
- **Tasks:** KELLY_LIFESTYLE_DAILY, KELLY_NUDGE_WEDNESDAY, KELLY_WEEKLY_DIGEST, KELLY_WINTER_SWIM_REMINDER (registered in init).
- **Home cooking:** KELLY_RECOMMEND_HOME_COOKING — dinner-at-home ideas: Green Egg BBQ, Thermomix TM7, long oven cooks, local meat, wine pairing.
- **Tea:** KELLY_RECOMMEND_TEA — Dammann Frères by time of day: morning profiles or evening caffeine-free.
- **Entertainment:** KELLY_RECOMMEND_ENTERTAINMENT — books, music, Netflix series, Apple TV movies by taste. Supports "something like X" queries.
- **Creative:** KELLY_RECOMMEND_CREATIVE — oil painting, photography (Hasselblad/Fuji/Capture One), house music (Ableton/Push 3), cinema (Blackmagic/Resolve/IRIX), Blender + Claude MCP.
- **Rowing:** KELLY_RECOMMEND_ROWING — water rowing sessions for surf and swim fitness. Detects surf vs swim focus.
- **Conversation:** KELLY_INTERESTING_QUESTION — thought-provoking questions from lifestyle/interesting-questions, context-fitted.
- **Learning:** LIFESTYLE_FEEDBACK evaluator; plugin-personality (CHARACTER_EVOLUTION, MODIFY_CHARACTER) for gradual character updates from user feedback.
- **Standup:** Kelly is the standup facilitator; STANDUP_FACILITATE via plugin-inter-agent; loop protection via A2A_LOOP_GUARD and A2A_CONTEXT.
- **Multi-agent:** ASK_AGENT to Vince, Solus, Eliza, Otaku, Sentinel, Oracle, ECHO; reports back so user stays in one conversation.

---

## What Kelly Cannot Do Yet / Gaps

- **No trading or market advice:** Kelly never gives trading or market advice; she uses ASK_AGENT Vince (or others) and reports. PRD: keep boundary; optional "Kelly summarizes Vince's take" without giving her own price/signal.
- **Discovery require payment:** DISCOVERY_REQUIRE_PAYMENT=false keeps summary and manifest free; set true and add plugin-commerce for paid. PRD: document discovery payment flow if enabled.
- **Todo/reminders:** Without plugin-rolodex only in-app reminders work; no cross-device or calendar sync. PRD: optional rolodex or calendar integration.
- **Michelin/James Edition:** Knowledge from the-good-life (and canonical sources in agent comment); ADD_MICHELIN_RESTAURANT is Eliza's action, not Kelly's. Kelly recommends from knowledge. PRD: clarify who ingests new Michelin entries (Eliza) vs who recommends (Kelly).
- **Curated schedule:** Health check at init warns if "curated schedule missing"; lifestyle daily task depends on it. PRD: document curated schedule format and location.
- **Weather/surf:** Weather provider and surf forecast depend on external APIs; failure modes not fully documented. PRD: graceful degradation and env docs.

---

## Key Files for Code Review

| Area | Path |
|------|------|
| Agent definition | [src/agents/kelly.ts](src/agents/kelly.ts) |
| Plugin entry | [src/plugins/plugin-kelly/src/index.ts](src/plugins/plugin-kelly/src/index.ts) |
| Actions | [src/plugins/plugin-kelly/src/actions/](src/plugins/plugin-kelly/src/actions/) |
| Providers | [src/plugins/plugin-kelly/src/providers/](src/plugins/plugin-kelly/src/providers/) |
| Tasks | [src/plugins/plugin-kelly/src/tasks/lifestyleDaily.tasks.ts](src/plugins/plugin-kelly/src/tasks/lifestyleDaily.tasks.ts) |
| Home cooking action | [src/plugins/plugin-kelly/src/actions/recommendHomeCooking.action.ts](src/plugins/plugin-kelly/src/actions/recommendHomeCooking.action.ts) |
| Tea action | [src/plugins/plugin-kelly/src/actions/recommendTea.action.ts](src/plugins/plugin-kelly/src/actions/recommendTea.action.ts) |
| Entertainment action | [src/plugins/plugin-kelly/src/actions/recommendEntertainment.action.ts](src/plugins/plugin-kelly/src/actions/recommendEntertainment.action.ts) |
| Creative action | [src/plugins/plugin-kelly/src/actions/recommendCreative.action.ts](src/plugins/plugin-kelly/src/actions/recommendCreative.action.ts) |
| Evaluator | [src/plugins/plugin-kelly/src/evaluators/lifestyleFeedback.evaluator.ts](src/plugins/plugin-kelly/src/evaluators/lifestyleFeedback.evaluator.ts) |

---

## For OpenClaw / PRD

Use this doc to draft a next-iteration PRD for Kelly: e.g. discovery payment flow, todo/rolodex scope, curated schedule contract, or weather/surf fallbacks.

---

## Self-Modification (plugin-personality)

**Kelly** is the only agent that loads [**@elizaos/plugin-personality**](https://github.com/elizaos-plugins/plugin-personality/blob/next/README.md) (ElizaOS Self-Modification Plugin). It lets her evolve her character over time through conversation analysis, user feedback, and self-reflection—e.g. adjusting bio, style, or topics when users say what worked or didn't.

**Scope:** Kelly only. VINCE does not use plugin-personality.

**Components:** CHARACTER_EVOLUTION evaluator, MODIFY_CHARACTER action, CHARACTER_EVOLUTION provider, CharacterFileManager (safe file updates + backups).

**Safety:** Backups before changes; validation (gradual change, no harmful edits); optional admin approval and confidence thresholds.

**Config:** Optional env: `ENABLE_AUTO_EVOLUTION`, `EVOLUTION_COOLDOWN_MS`, `REQUIRE_ADMIN_APPROVAL`. Character file must be writable; SQL plugin required.

**Example:** *"You should be more encouraging when suggesting wine"* → Kelly can apply a gradual character update and confirm. *"That place was too loud—anywhere quieter?"* feeds into the same learning loop.

---

## References

- [CLAUDE.md](CLAUDE.md) — Kelly as CVO; plugin-discovery and plugin-todo.
- [docs/MULTI_AGENT.md](MULTI_AGENT.md) — ASK_AGENT and standup.
- [src/plugins/plugin-kelly/README.md](src/plugins/plugin-kelly/README.md) — Plugin config.
