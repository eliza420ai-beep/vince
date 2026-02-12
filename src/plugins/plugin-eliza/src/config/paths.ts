/**
 * Centralized knowledge root and derived paths for plugin-eliza.
 * Env is read at call time so KNOWLEDGE_ROOT / ELIZA_CACHE_DIR can be set after module load (e.g. in tests).
 * Override with env KNOWLEDGE_ROOT (relative to cwd or absolute). Cache root: ELIZA_CACHE_DIR or under knowledge/.eliza/cache or .openclaw-cache.
 */

import * as path from "path";

/** Knowledge base root directory (resolved). Reads process.env.KNOWLEDGE_ROOT at call time. */
export function getKnowledgeRoot(): string {
  return path.resolve(
    process.cwd(),
    process.env.KNOWLEDGE_ROOT ?? "knowledge",
  );
}

/** Cache root for plugin state (monitor, agenda, graph, etc.). Uses ELIZA_CACHE_DIR or defaults to .openclaw-cache under cwd. */
export function getCacheRoot(): string {
  const env = process.env.ELIZA_CACHE_DIR?.trim();
  if (env) return path.isAbsolute(env) ? env : path.resolve(process.cwd(), env);
  return path.join(process.cwd(), ".openclaw-cache");
}

const _root = () => getKnowledgeRoot();
export const DRAFTS_DIR = path.join(_root(), "drafts");
export const DRAFTS_TWEETS_DIR = path.join(_root(), "drafts", "tweets");
export const BRIEFS_DIR = path.join(_root(), "briefs");
export const DATA_DIR = path.join(_root(), ".eliza");
export const SUBSTACK_DIR = path.join(_root(), "substack-essays");
export const MARKETING_DIR = path.join(_root(), "marketing-gtm");
export const VOICE_CACHE_FILE = path.join(_root(), ".eliza", "voice-profile.json");
export const STYLE_GUIDE_PATH = path.join(_root(), "brand", "style-guide.md");
export const ARCHIVE_DIR = path.join(_root(), ".archive");
