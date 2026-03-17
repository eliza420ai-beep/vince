import type { KnowledgeSourceItem } from "@elizaos/core";

/**
 * Helpers for building Character.knowledge arrays in ElizaOS.
 * Use dir() and path() so agents stay compatible with @elizaos/core types.
 */

/** Build a directory knowledge source. */
export function dir(directory: string, shared = true): KnowledgeSourceItem {
  return {
    item: { case: "directory", value: { directory, shared } },
  } as KnowledgeSourceItem;
}

/** Build a path (file) knowledge source. */
export function path(filePath: string, shared = true): KnowledgeSourceItem {
  return {
    item: { case: "path", value: filePath },
  } as KnowledgeSourceItem;
}
