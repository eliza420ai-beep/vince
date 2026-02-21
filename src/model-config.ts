/**
 * Shared model config: avoid deprecated Anthropic model IDs that cause API errors.
 *
 * TEXT_LARGE: used by character.settings.model in each agent.
 * TEXT_SMALL: used by @elizaos/plugin-anthropic for lighter calls (reply, etc.).
 *   The plugin <= 1.5.12 hardcodes "claude-3-5-haiku-20241022" which is deprecated.
 *   load-env.ts sets ANTHROPIC_SMALL_MODEL at startup to override it.
 */

const DEFAULT_ANTHROPIC_LARGE = "claude-sonnet-4-20250514";
const DEFAULT_ANTHROPIC_SMALL = "claude-haiku-4-5-20251001";

/** Model IDs known to 404 on the Anthropic API (deprecated or invalid). */
const DEPRECATED_ANTHROPIC_MODELS = new Set([
  "claude-3-5-haiku-20241022",
  "claude-haiku-4-20250414",
]);

/**
 * Returns the Anthropic model to use for TEXT_LARGE generation.
 * Falls back to default if env is unset or deprecated.
 */
export function getAnthropicLargeModel(): string {
  const env = process.env.ANTHROPIC_LARGE_MODEL?.trim();
  if (!env) return DEFAULT_ANTHROPIC_LARGE;
  if (DEPRECATED_ANTHROPIC_MODELS.has(env)) return DEFAULT_ANTHROPIC_LARGE;
  return env;
}

/**
 * Returns the Anthropic model to use for TEXT_SMALL generation.
 * Falls back to default if env is unset or deprecated.
 */
export function getAnthropicSmallModel(): string {
  const env = process.env.ANTHROPIC_SMALL_MODEL?.trim();
  if (!env) return DEFAULT_ANTHROPIC_SMALL;
  if (DEPRECATED_ANTHROPIC_MODELS.has(env)) return DEFAULT_ANTHROPIC_SMALL;
  return env;
}
