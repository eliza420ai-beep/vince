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

## Dependency: curated-open-schedule structure

The service parses `knowledge/the-good-life/curated-open-schedule.md` from the project root. Expected sections:

- `## Restaurants by Day` then `### Monday` … `### Sunday` with lines like `- **Name** | Location | Hours | ...`
- `## Hotels by Season` then `### Winter (January–February)` and `### March–November` with hotel lines
- `## Fitness / Health` for pool/gym season note

If the file is missing or empty, the service logs a warning and returns null for curated context.

## Testing

Run tests from the repo root:

```bash
bun test src/plugins/plugin-kelly
```

Coverage includes:

- **Actions:** dailyBriefing, recommendPlace, recommendWine, itinerary, recommendWorkout, weekAhead, swimmingTips, surfForecast (validate + handler with mocks).
- **Providers:** kellyContext (winter swimming line), weather (mocked fetch).
- **Service:** KellyLifestyleService (briefing shape, season).
- **Evaluator:** lifestyleFeedback (validate for Kelly, feedback signals).
- **Voice/jargon:** BANNED_JARGON and formatInterpretation-style strings; surf handler output checked for no banned jargon.
- **Integration:** one flow (kellyContext + one action with mocked useModel) to assert callback and content.

## Future: KELLY_DISPATCH (optional router)

If many more actions are added, consider a single **KELLY_DISPATCH** (or router) action that picks the right sub-action from the message, to reduce prompt complexity. Document here when implemented.
