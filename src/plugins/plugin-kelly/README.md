# Plugin-Kelly

Lifestyle-only concierge for the Kelly agent: daily briefing, health, dining, hotels, wellness, surf. No trading.

## Actions (when to use)

| Action | Triggers | What it does |
|--------|----------|--------------|
| **KELLY_DAILY_BRIEFING** | "what should I do today", "daily suggestions", "lifestyle", "health", "dining", "hotel", "swim", "gym", "lunch", "wellness" | Day-aware picks: restaurants open today, hotels this season, fitness/health line from the-good-life and curated-open-schedule. |
| **KELLY_RECOMMEND_PLACE** | "recommend a hotel in X", "where to stay in X", "where to eat in X", "best restaurant in X" | One best pick + one alternative from the-good-life. For SW France/Landes, only suggests places open today and prefers landes-locals. |
| **KELLY_RECOMMEND_WINE** | "recommend a wine", "what wine with X", "bottle for tonight", "pairing for dinner" | One pick + one alternative, SW France/Bordeaux default, tasting note and service. |
| **KELLY_SURF_FORECAST** | "surf forecast", "how's the surf in Biarritz", "waves Biarritz", "surf conditions", "can I surf today" | Wave height, period, direction, sea temp for Biarritz; interpretation in surf-ocean voice; suggests indoor/surfer yoga in rain or storm. |
| **KELLY_ITINERARY** | "plan me 2 days in Bordeaux", "weekend in Paris with great food" | Multi-day itinerary (Day 1 — hotel, lunch, dinner; Day 2 — …) from the-good-life only. |
| **KELLY_RECOMMEND_WORKOUT** | "recommend a workout", "today's workout", "workout of the day" | One concrete workout (pool, gym, surfer yoga, swim) from pool/gym season and swimming context. |
| **KELLY_WEEK_AHEAD** | "week ahead", "this week's picks", "plan for the week" | 3–5 suggestions for the week (dining, hotels, wellness) from the-good-life and curated schedule. |
| **KELLY_SWIMMING_TIPS** | "tips for my daily 1000m", "swimming tips", "winter swimming" | Tips for lap swim, winter indoor pools, swimmer yoga from swimming-daily-winter-pools and yoga docs. |
| **KELLY_RECOMMEND_EXPERIENCE** | "wine tasting experience", "spa day", "cooking class", "guided tour", "something special to do" | One best pick + one alternative for one-off experiences from the-good-life (wine-tasting, luxury spas, experience-prioritization-framework). |

## Providers

| Provider | What it injects |
|----------|-----------------|
| **KELLY_CONTEXT** | Today's wellness tip, day of week, season (pool Apr–Nov / gym Dec–Mar), restaurants open today (SW France/Landes), location context (Bordeaux/Biarritz), yoga line, winter swimming line in gym season, known preferences from facts. |
| **WEATHER** | Bordeaux + Biarritz conditions; Biarritz surf (wave height, period, direction, sea temp). High-wind and rain/storm caution; no beach/surf/outdoor dining in bad weather. |

## Knowledge (the-good-life)

The plugin and Kelly character rely on knowledge under `knowledge/the-good-life/`:

- **curated-open-schedule.md** — Restaurants by day (Mon–Sun), hotels by season (Winter Jan–Feb, March–November), palace indoor pools close/reopen, fitness/health (pool season, gym season). Required structure: `## Restaurants by Day`, `### Monday` … `### Sunday`, `## Hotels by Season`, `### Winter (January–February)`, `### March–November`, `## Fitness / Health`. Optional: `**Palace indoor pools (winter swim)**` subsection with close/reopen dates.
- **lifestyle/** — swimming-daily-winter-pools.md, surf-ocean-voice.md, wellness-reminders, yoga-practice, daily-yoga-surfers-vinyasa, yoga-vinyasa-surfers-swimmers, creative-practice.md, etc.
- **creative-production/** — Deep-knowledge docs for technique and workflow: oil-painting, hasselblad-fuji-capture-one, ableton-push-3, blackmagic-design, capture-one-pro, davinci-resolve, blender-claude-mcp. Used when the user asks about painting, photography, music, cinema, or Blender + Claude Desktop + MCP. creative-practice.md has a "Deep knowledge:" line per section pointing to these.

Add or edit markdown under `knowledge/the-good-life/` (and `lifestyle/`, `creative-production/` subdirs) so RAG and the lifestyle service can use it. The character must have `knowledge: [{ directory: "the-good-life", shared: true }]` and `ragKnowledge: true` for RAG retrieval.

## Env vars

- **KELLY_LIFESTYLE_DAILY_ENABLED** — Set to `false` to disable the daily briefing task. Default: enabled.
- **KELLY_LIFESTYLE_HOUR** — Hour (UTC) to run the daily briefing (default `8`).
- **KELLY_NUDGE_ENABLED** — Set to `true` or `1` to enable the midweek nudge task. Nudge is sent only to channels whose name contains **lifestyle** (not just "kelly"). Default: disabled.
- **KELLY_NUDGE_DAY** — Day of week for nudge (default `wednesday`).
- **KELLY_NUDGE_HOUR** — Hour (UTC) for nudge (default `9`).
- **KELLY_WEEKLY_DIGEST_ENABLED** — Set to `true` to enable the optional weekly digest task (Sunday, week-ahead summary). Default: `false`.
- **KELLY_WEEKLY_DIGEST_HOUR** — Hour (UTC) for weekly digest (default `8`).
- **KELLY_WINTER_SWIM_REMINDER_ENABLED** — Set to `true` to enable a one-off winter swim reminder (Jan/Feb) with Palais/Caudalie reopen dates. Default: `false`.
- **KELLY_WINTER_SWIM_REMINDER_WEEK** — Week of year to send (e.g. `5` = first week of February). Default: `5`.

## Dependency: curated-open-schedule structure

The service parses `knowledge/the-good-life/curated-open-schedule.md` from the project root. Expected sections:

- `## Restaurants by Day` then `### Monday` … `### Sunday` with lines like `- **Name** | Location | Hours | ...`
- `## Hotels by Season` then `### Winter (January–February)` and `### March–November` with hotel lines
- `## Fitness / Health` for pool/gym season note

If the file is missing or empty, the service logs a warning and returns null for curated context.

## Testing

Run the full Kelly test suite from the repo root:

```bash
bun test src/plugins/plugin-kelly
```

For slower integration tests, use a longer timeout:

```bash
bun test src/plugins/plugin-kelly --timeout 30000
```

### Test files and what they cover

| File | Coverage |
|------|----------|
| **test-utils.ts** | Mock runtime with service/composeState, allowlist loading from fixtures. |
| **kelly.voice-quality.test.ts** | No BANNED_JARGON or filler phrases on every action and provider output; benefit-led/concrete assertions. |
| **kelly.knowledge-grounded.test.ts** | Recommendations only from allowlist/curated; never-invent places; “open today” for Landes. |
| **kelly.defaults-and-safety.test.ts** | Lunch default (no dinner out past lunch); Mon/Tue closed; rain/storm = no beach/surf; local weather never names town; winter pool reopen dates. |
| **kelly.ask-agent-routing.test.ts** | ASK_AGENT examples use reporting pattern (“says”); no “go ask X yourself” deflect phrasing. |
| **kelly.integration.test.ts** | Flows: “what should I do today” → dailyBriefing (no jargon); “where to eat Landes” → recommendPlace from curated; “that place was too loud” → lifestyleFeedback validate; surf + bad weather → indoor/caution. |
| **kelly.messageExamples-regression.test.ts** | Fixture-based regression: no jargon/filler on example replies; recommendation examples have concrete picks; ASK_AGENT replies contain “says”. |
| **lifestyleDaily.tasks.test.ts** | Task registration: KELLY_LIFESTYLE_DAILY and KELLY_NUDGE_WEDNESDAY createTask name/metadata; disabled when env says so. |
| **health.test.ts** | getKellyHealth: ok when curated schedule present; ok false and message mentions schedule when missing or service absent. |
| **dailyBriefing.action.test.ts** … **weekAhead.action.test.ts** | Per-action validate + handler; callback shape; edge cases (empty curated, dangerous surf, pool vs gym season, etc.). |
| **kellyContext.provider.test.ts**, **weather.provider.test.ts** | Provider values and text; Wednesday/January branches; storm and marine API failure. |
| **lifestyleFeedback.evaluator.test.ts** | Validate (feedback signals); handler createMemory with fact-like payload when useModel returns structured feedback. |
| **lifestyle.service.test.ts**, **jargon.test.ts** | Service methods; voice/jargon list. |

### 10x definition

The suite locks in: **voice and quality** on every output (no jargon/filler), **knowledge-grounded** recommendations (allowlist/curated only), **safety and defaults** (lunch not dinner, rain/storm no beach, Mon/Tue closed, local weather no town name, winter pool dates), **full action/provider/evaluator** coverage, **conversation flows**, and **messageExamples regression** so character examples stay on-brand. Every change is validated; regressions are caught before deploy.

### What the 10x suite improved in Kelly (not just tests)

- **Voice in prompts:** `getVoiceAvoidPromptFragment()` in `constants/voice.ts` builds the exact AVOID list (BANNED_JARGON + FILLER_PHRASES) for action prompts. The **daily briefing**, **recommendPlace**, **recommendWine**, and **itinerary** prompts all inject this so the model sees the same list the tests enforce; no more duplicated jargon list in prompts.
- **Safety constants:** `constants/safety.ts` defines `RAIN_STORM_SAFETY_LINE`, `STRONG_WIND_SAFETY_LINE`, `MON_TUE_CLOSED_LINE`, `PAST_LUNCH_INSTRUCTION`, and `NEVER_INVENT_LINE`. The weather provider and recommendPlace action use these; recommendPlace also injects `PAST_LUNCH_INSTRUCTION` when suggesting “open today” restaurants so the model avoids lunch/dinner past 14:30. One change in `safety.ts` updates prompts and provider text together.
- **Never-invent line:** `NEVER_INVENT_LINE` is used in recommendPlace, recommendWine, and itinerary so “only from context; if nothing, say so and point to MICHELIN/James Edition” is consistent and single-sourced.
- **Single source of truth:** Adding a new banned word or filler phrase only requires updating `voice.ts`; the prompt fragment and all voice-quality tests stay in sync. Adding or tweaking a safety rule only requires updating `safety.ts`.
- **Response guard (recommendPlace):** After the model returns, the action checks that any recommended place names are on the allowlist (`knowledge/the-good-life/allowlist-places.txt`). If the model returns an off-allowlist name, the callback text is replaced with the safe fallback so Kelly never surfaces an invented venue. See `utils/recommendationGuards.ts` and the test "response guard replaces callback when useModel returns off-allowlist name".
- **Personalization:** When recommendPlace or recommendWine sends a recommendation, the action stores a short cache entry keyed by room (`kelly:lastRecommend:${roomId}`) with type, query, and pick. The kellyContext provider reads this and injects a line like "Last time you asked for X, I suggested Y" so Kelly can reference the last recommendation in follow-up replies.

### Improvement roadmap

Phases are tracked in [progress.txt](progress.txt) (Progress vs Recommendations). Implemented: Phase 1 (voice fragment + response guard), Phase 2 (last-recommendation cache + messageExamples), Phase 3 (KELLY_RECOMMEND_EXPERIENCE), Phase 4 (daily retry, optional weekly digest and winter swim reminder, observability logging), Phase 5 (plugin-todo and KELLY_DISPATCH docs below), Phase 6 (progress.txt, README roadmap, service comments).

### CI

If the project uses GitHub Actions (or similar), ensure a job runs:

```bash
bun test src/plugins/plugin-kelly
```

so the suite runs on every PR. No new workflow is required if a generic “test” job already exists; include `src/plugins/plugin-kelly` in the test path.

## Optional: plugin-todo and KELLY_DISPATCH

- **plugin-todo:** Kelly’s character does not include plugin-todo by default. If you want in-app reminders (e.g. “remind me to book Palais for Feb 12”), add plugin-todo to Kelly’s plugins and configure it; otherwise discovery + actions are enough for “what can you do?” and recommendations.
- **KELLY_DISPATCH (when to add):** If the action count grows further (e.g. after adding several more specialized actions), consider a single **KELLY_DISPATCH** action that (a) validates on generic lifestyle/daily/recommend triggers and (b) uses a small LLM or rule-based pick to select one of the existing actions, then invokes it. This keeps the character’s “YOUR ACTIONS” list from getting too long. Defer until you have 12+ actions or notice the model struggling to choose; document here when implemented.
