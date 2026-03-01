# ElizaOS upgrade test: alpha (v2.0.0-alpha.27)

Branch `upgrade-elizaos-latest` tests upgrading to the latest ElizaOS release from [GitHub Releases](https://github.com/elizaOS/eliza/releases). The **alpha** dist-tag was used (`bun add @elizaos/core@alpha`); exact version `2.0.0-alpha.27` is not published for all packages, so `package.json` uses the `alpha` tag.

## Result

- **Install:** Succeeds. Resolved versions (after `bun install`): `@elizaos/core@2.0.0-alpha.27`, `@elizaos/plugin-sql@2.0.0-alpha.7`, others at `1.7.3-alpha.4`.
- **Type-check:** Agent and plugin migrations (below) are done. Full type-check still reports errors in vendored plugins (`plugin-bootstrap`, `plugin-biconomy`, `plugin-cdp`, etc.) due to additional alpha API changes (ActionParameter shape, Handler return type, ProviderValue, etc.). Those can be addressed in a follow-up pass.

## Migration completed (this branch)

1. **Knowledge:** Added `src/utils/knowledge.ts` with `dir()` and `path()` helpers. All 10 agents now use `KnowledgeSourceItem` (alpha shape): `dir("name")` / `path("file.md")` instead of `{ directory, shared }` / `{ path, shared }`.
2. **Style:** Added `$typeName: "eliza.v1.StyleGuides" as const` to every agent that has `style` (clawterm, echo, eliza, kelly, naval, oracle, sentinel, solus, vince, otaku). Otaku also has `post: []` for full `StyleGuides`.
3. **Message examples:** All 10 agents now use `MessageExampleGroup[]`: each group is `{ examples: [ { name, content }, … ] }` instead of a bare array of pairs.
4. **Handler options:** Action handlers that typed the 4th parameter as `Record<string, unknown>` now use `_options?: unknown` in plugin-x-research (all actions), plugin-eliza (contentAudit), and plugin-otaku (rebalance.tasks).

## Breaking changes (alpha vs 1.7.2)

### 1. `KnowledgeSourceItem` (character `knowledge` array)

- **Before (1.7.2):** `{ directory: string, shared?: boolean }` or `{ path: string, shared?: boolean }`.
- **After (alpha):** Type no longer has `directory` or `path`. New shape must be taken from `@elizaos/core` (e.g. from exported types or `.d.ts`).
- **Affected:** All agents that set `knowledge: [{ directory: "…", shared: true }, …]` — e.g. `src/agents/eliza.ts`, `echo.ts`, `clawterm.ts`, `kelly.ts`, `naval.ts`, `oracle.ts`, and any other agent using `knowledge`.

### 2. `StyleGuides` / `style`

- **Before:** `style: { all: string[], chat: string[], post: string[] }`.
- **After:** Type expects `Message<"eliza.v1.StyleGuides">` and requires a `$typeName` property.
- **Affected:** All agents that set `style` (e.g. `clawterm.ts`, `echo.ts`, `eliza.ts`, `kelly.ts`, `naval.ts`, `oracle.ts`, plus others).

### 3. `MessageExampleGroup` (character `messageExamples`)

- **Before:** Array of `{ name: string, content: { text: string, … } }[]` (no nested `examples`).
- **After:** Each group must include an `examples` property.
- **Affected:** All agents that set `messageExamples` (e.g. `clawterm.ts`, `echo.ts`, `eliza.ts`, `kelly.ts`, `naval.ts`, `oracle.ts`, `solus.ts`, `vince.ts`, etc.).

### 4. Action `Handler` signature

- **Before:** `(runtime, message, state, options: Record<string, unknown>, callback) => …`.
- **After:** `options` is typed as `HandlerOptions | Record<string, JsonValue | undefined> | undefined`; assignability to `Record<string, unknown>` fails.
- **Affected:** Plugin action handlers that type `_options` as `Record<string, unknown>`, e.g. in `plugin-x-research` (`xPulse`, `xSearch`, `xThread`, `xVibe`, `xWatchlist`, `xSaveResearch`, etc.) and any other plugin using the same pattern.

## Recommended next steps

1. **Stay on 1.7.2** until you’re ready to adopt alpha breaking changes, or  
2. **Adopt alpha** by:  
   - Inspecting `node_modules/@elizaos/core` for the new `KnowledgeSourceItem`, `StyleGuides`, and `MessageExampleGroup` shapes.  
   - Updating all agent `knowledge`, `style`, and `messageExamples` to match.  
   - Updating action handlers to use the new `Handler` options type (e.g. `HandlerOptions` or a type that accepts `undefined`).

## Remaining type-check errors (vendored plugins)

After the migration above, `bun run type-check` may still report errors in:

- **plugin-bootstrap** — `MessageExampleGroup` now has `.examples` (fixed in character provider); other alpha breakage (Handler return type, ProviderValue, LogBody, ActionParameter[], etc.) may remain.
- **plugin-biconomy**, **plugin-cdp** — Action parameter and provider types differ in alpha.
- **plugin-bankr-trading-engine** — Handler options and return type updated in this branch.

Addressing every remaining error in vendored plugins is optional for merge; the agent and handler migrations above are sufficient for the alpha character and action APIs.

## Reverting to stable

To go back to the latest stable release:

```bash
# In package.json, set:
"@elizaos/cli": "1.7.2",
"@elizaos/client": "1.7.2",
"@elizaos/core": "1.7.2",
"@elizaos/plugin-bootstrap": "1.7.2",
"@elizaos/plugin-sql": "1.7.2",
"@elizaos/server": "1.7.2",

bun install
```
