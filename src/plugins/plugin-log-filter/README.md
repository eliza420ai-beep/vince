# Log Filter Plugin

Filters verbose logs that clutter terminal output, specifically suppressing MCP tool schema definitions and verbose API documentation.

## What It Does

This plugin (and early bootstrap filter in `src/index.ts`) automatically suppresses:

- MCP tool schema definitions (JSON schemas, response formats)
- Verbose API endpoint documentation
- CoinGecko MCP tool descriptions with `jq_filter` recommendations
- Any message with 2+ `"type":` JSON schema patterns
- Long messages (>300 chars) containing schema indicators
- Multi-line schema dumps

## Usage

The filter is **automatically active** from the very start of the application (patched in `src/index.ts` before any plugins load).

For agents using MCP, the plugin is also added early in the plugin chain:

```typescript
import logFilterPlugin from "../plugins/plugin-log-filter/src/index.ts";

export const myCharacter: Character = {
  plugins: [
    "@elizaos/plugin-sql",
    logFilterPlugin, // Add early to filter logs (redundant but safe)
    "@elizaos/plugin-mcp",
    // ... other plugins
  ],
};
```

## Configuration

### Quiet Mode (default: on)

Routine startup/info logs are suppressed so the terminal stays focused on **boxes** (VINCE banner, MARKET PULSE, HL Crypto dashboard), **warnings**, and **errors**. Set `VINCE_QUIET=false` to see all init logs:

```bash
VINCE_QUIET=false bun start
```

For maximum quiet, also set `LOG_LEVEL=warn` in `.env` to suppress all Info-level logs globally.

### Disable Filtering

To disable the log filter entirely:

```bash
DISABLE_LOG_FILTER=true bun start
```

### Debug Mode

To see what's being filtered:

```bash
LOG_LEVEL=debug bun start
```

Filtered messages will appear as debug logs with `[LogFilter] Suppressed:` prefix.

## What Gets Filtered

The filter suppresses logs matching these patterns:

- `[coingecko] get_*` - All CoinGecko MCP tool messages
- `response schema`, `json schema`, `Response Schema`
- `additionalProperties`, `"type": "object"`, etc.
- `jq_filter` recommendations
- `when using this tool`, `always use jq_filter`
- `this endpoint allows you to query...`
- Schema field definitions (`block_number: integer`, etc.)
- Any message with 2+ `"type":` patterns
- Messages >300 chars with schema indicators
- Multi-line messages with schema patterns

## What Stays

- ✅ **Boxes** (VINCE banner, MARKET PULSE, HL Crypto dashboard) — `console.log`
- ✅ **MLInference** — heartbeat (paper bot, ONNX, signal quality) — never suppressed
- ✅ **Major assets / HIP-3 / Hyperliquid** — market data and insights
- ✅ **Paper trading bot** — trades, signals, vibes for the day
- ✅ **Warnings** and **errors** — never filtered
- ✅ Error messages and stack traces

When `VINCE_QUIET=true` (default): routine init info (SQL migrations, “service started”, etc.) is suppressed. Set `VINCE_QUIET=false` to see it.

## How It Works

1. **Early Bootstrap Filter** (`src/index.ts`): Patches logger and console methods before any code runs
2. **Plugin Filter**: Additional layer that patches logger when plugin initializes (redundant but safe)

Both filters use the same pattern matching logic to ensure consistency.

## Troubleshooting

If you're still seeing verbose logs:

1. **Check if filter is active**: Look for `[LogFilter] ✅ Logger filter active` in startup logs
2. **Verify patterns**: The filter catches messages with 2+ `"type":` patterns - check if your verbose logs match
3. **Check console output**: Some libraries log directly to `console.log` - the filter patches this too
4. **Enable debug mode**: Set `LOG_LEVEL=debug` to see what's being filtered

## Adding New Patterns

To add new suppression patterns, edit both:

- `src/index.ts` - Early bootstrap filter
- `src/plugins/plugin-log-filter/src/index.ts` - Plugin filter

Keep both in sync for consistency.
