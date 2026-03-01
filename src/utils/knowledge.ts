/**
 * Helpers for building Character.knowledge arrays in ElizaOS alpha (KnowledgeSourceItem).
 * Use dir() and path() so agents stay compatible with @elizaos/core alpha types.
 */
import type { KnowledgeSourceItem } from "@elizaos/core";

/** Build a directory knowledge source (alpha shape). */
export function dir(directory: string, shared = true): KnowledgeSourceItem {
  return {
    item: { case: "directory", value: { directory, shared } },
  };
}

/** Build a path (file) knowledge source (alpha shape). */
export function path(filePath: string, shared = true): KnowledgeSourceItem {
  return {
    item: { case: "path", value: filePath },
  };
}
