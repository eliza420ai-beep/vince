/**
 * Shared model config: avoid deprecated Anthropic model IDs that cause API errors.
 * Use getAnthropicLargeModel() so env ANTHROPIC_LARGE_MODEL is normalized.
 */

const DEFAULT_ANTHROPIC_LARGE = "claude-sonnet-4-20250514";

/** Model IDs known to fail (deprecated or invalid). Replaced with default. */
const DEPRECATED_ANTHROPIC_MODELS = new Set(["claude-3-5-haiku-20241022"]);

/**
 * Returns the Anthropic model to use for text generation.
 * If ANTHROPIC_LARGE_MODEL is set to a deprecated/invalid model, returns the default instead.
 */
export function getAnthropicLargeModel(): string {
  const env = process.env.ANTHROPIC_LARGE_MODEL?.trim();
  if (!env) return DEFAULT_ANTHROPIC_LARGE;
  if (DEPRECATED_ANTHROPIC_MODELS.has(env)) return DEFAULT_ANTHROPIC_LARGE;
  return env;
}
