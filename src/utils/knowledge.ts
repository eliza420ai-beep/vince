/**
 * Helpers for building Character.knowledge arrays in ElizaOS.
 * Use dir() and path() so agents stay compatible with @elizaos/core types.
 */
/** Build a directory knowledge source. */
export function dir(
  directory: string,
  shared = true,
): { directory: string; shared?: boolean } {
  return { directory, shared };
}

/** Build a path (file) knowledge source. */
export function path(
  filePath: string,
  shared = true,
): { path: string; shared?: boolean } {
  return { path: filePath, shared };
}
