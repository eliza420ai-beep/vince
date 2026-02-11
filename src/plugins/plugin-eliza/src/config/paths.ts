/**
 * Centralized knowledge root and derived paths for plugin-eliza.
 * Uses process.cwd() so behavior is consistent regardless of where the process is started.
 * Override with env KNOWLEDGE_ROOT (relative to cwd or absolute) if needed.
 */

import * as path from "path";

const KNOWLEDGE_ROOT = path.resolve(
  process.cwd(),
  process.env.KNOWLEDGE_ROOT ?? "knowledge",
);

/** Knowledge base root directory (resolved, cwd-independent). */
export function getKnowledgeRoot(): string {
  return KNOWLEDGE_ROOT;
}

export const DRAFTS_DIR = path.join(KNOWLEDGE_ROOT, "drafts");
export const DRAFTS_TWEETS_DIR = path.join(KNOWLEDGE_ROOT, "drafts", "tweets");
export const BRIEFS_DIR = path.join(KNOWLEDGE_ROOT, "briefs");
export const DATA_DIR = path.join(KNOWLEDGE_ROOT, ".eliza");
export const SUBSTACK_DIR = path.join(KNOWLEDGE_ROOT, "substack-essays");
export const MARKETING_DIR = path.join(KNOWLEDGE_ROOT, "marketing-gtm");
export const VOICE_CACHE_FILE = path.join(KNOWLEDGE_ROOT, ".eliza", "voice-profile.json");
export const STYLE_GUIDE_PATH = path.join(KNOWLEDGE_ROOT, "brand", "style-guide.md");
export const ARCHIVE_DIR = path.join(KNOWLEDGE_ROOT, ".archive");
