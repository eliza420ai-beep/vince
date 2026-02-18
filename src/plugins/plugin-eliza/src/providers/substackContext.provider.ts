/**
 * SubstackContextProvider — injects recent Ikigai Studio Substack posts (from RSS)
 * and optional profile stats (from official Substack Developer API) into Eliza's state.
 *
 * - RSS: SUBSTACK_FEED_URL (default https://ikigaistudio.substack.com/feed), cached 20 min.
 * - Profile: ELIZA_SUBSTACK_LINKEDIN_HANDLE optional; calls official API, cached 1 hour.
 * - Never throws; on errors returns empty or fallback text.
 */

import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
} from "@elizaos/core";
import { logger } from "@elizaos/core";

const DEFAULT_FEED_URL = "https://ikigaistudio.substack.com/feed";
const SUBSTACK_PROFILE_API_BASE = "https://substack.com/profile/search/linkedin";
const RSS_CACHE_KEY = "plugin-eliza:substack:rss";
const PROFILE_CACHE_KEY = "plugin-eliza:substack:profile";
const RSS_CACHE_TTL_MS = 20 * 60 * 1000; // 20 min
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_POSTS = 8;

interface RssPost {
  title: string;
  link: string;
  date: string;
  snippet?: string;
}

interface SubstackProfileResult {
  identityHandle?: string;
  profileUrl?: string;
  leaderboardStatus?: {
    rank?: number;
    publicationName?: string;
    label?: string;
    ranking?: string;
  };
  bestsellerTier?: string;
  roughNumFreeSubscribers?: number;
  followerCount?: number;
}

interface CachedRss {
  posts: RssPost[];
  expiresAt: number;
}

interface CachedProfile {
  summary: string;
  data: SubstackProfileResult | null;
  expiresAt: number;
}

function getFeedUrl(): string | null {
  const raw = process.env.SUBSTACK_FEED_URL;
  if (raw === undefined) return DEFAULT_FEED_URL;
  const url = raw.trim();
  return url || null; // empty string => disable RSS
}

function getLinkedInHandle(): string | null {
  const handle = process.env.ELIZA_SUBSTACK_LINKEDIN_HANDLE?.trim();
  return handle || null;
}

/** Parse RSS 2.0 or Atom feed without external deps. Returns up to MAX_POSTS entries. */
function parseRssFeed(xml: string): RssPost[] {
  const posts: RssPost[] = [];
  try {
    // RSS 2.0: <item>...</item>
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    // Atom: <entry>...</entry>
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;

    const extractOne = (tag: string, blob: string): string => {
      const open = `<${tag}[^>]*>`;
      const close = `</${tag}>`;
      const re = new RegExp(`${open}([\\s\\S]*?)${close}`, "i");
      const m = blob.match(re);
      if (m) return m[1].replace(/<[^>]+>/g, "").trim();
      return "";
    };

    const extractLink = (blob: string): string => {
      const href = blob.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (href) return href[1];
      const linkContent = extractOne("link", blob);
      if (linkContent) return linkContent.trim();
      return "";
    };

    let chunks: string[] = [];
    const rssMatches = xml.matchAll(itemRegex);
    for (const m of rssMatches) chunks.push(m[1]);
    if (chunks.length === 0) {
      const atomMatches = xml.matchAll(entryRegex);
      for (const m of atomMatches) chunks.push(m[1]);
    }

    for (let i = 0; i < Math.min(chunks.length, MAX_POSTS); i++) {
      const blob = chunks[i];
      const title = extractOne("title", blob);
      const link = extractLink(blob);
      const date =
        extractOne("pubDate", blob) ||
        extractOne("updated", blob) ||
        extractOne("published", blob) ||
        "";
      const desc = extractOne("description", blob) || extractOne("summary", blob);
      const snippet = desc ? desc.slice(0, 120).replace(/\s+/g, " ") + (desc.length > 120 ? "…" : "") : undefined;
      if (title && link) {
        posts.push({ title, link, date, snippet });
      }
    }
  } catch (e) {
    logger.debug(`[SubstackContext] RSS parse error: ${e}`);
  }
  return posts;
}

async function fetchRssPosts(feedUrl: string): Promise<RssPost[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssFeed(xml);
  } catch (e) {
    logger.debug(`[SubstackContext] RSS fetch error: ${e}`);
    return [];
  }
}

async function fetchSubstackProfile(linkedInHandle: string): Promise<SubstackProfileResult | null> {
  try {
    const url = `${SUBSTACK_PROFILE_API_BASE}/${encodeURIComponent(linkedInHandle)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: SubstackProfileResult[] };
    const results = json?.results;
    if (Array.isArray(results) && results.length > 0) return results[0];
    return null;
  } catch (e) {
    logger.debug(`[SubstackContext] Profile API error: ${e}`);
    return null;
  }
}

function formatProfileSummary(profile: SubstackProfileResult | null): string {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.profileUrl) parts.push(`Profile: ${profile.profileUrl}`);
  if (profile.identityHandle) parts.push(`Handle: @${profile.identityHandle}`);
  if (typeof profile.followerCount === "number") parts.push(`Followers: ${profile.followerCount}`);
  if (typeof profile.roughNumFreeSubscribers === "number")
    parts.push(`~Free subscribers: ${profile.roughNumFreeSubscribers}`);
  const ls = profile.leaderboardStatus;
  if (ls?.label) parts.push(`Leaderboard: ${ls.label}${ls.rank != null ? ` (rank ${ls.rank})` : ""}`);
  if (profile.bestsellerTier) parts.push(`Bestseller: ${profile.bestsellerTier}`);
  return parts.join(". ");
}

export const substackContextProvider: Provider = {
  name: "SUBSTACK_CONTEXT",
  description:
    "Recent Ikigai Studio Substack posts (from RSS) and optional profile stats (Substack Developer API). Use when discussing our Substack or recent essays.",
  position: 10,

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
  ): Promise<ProviderResult> => {
    try {
      const textParts: string[] = [];
      const values: Record<string, unknown> = {};

      const feedUrl = getFeedUrl();
      const linkedInHandle = getLinkedInHandle();

      if (feedUrl) {
        const cached = await runtime.getCache<CachedRss>(RSS_CACHE_KEY);
        const now = Date.now();
        let posts: RssPost[] = [];
        if (cached && cached.expiresAt > now && Array.isArray(cached.posts)) {
          posts = cached.posts;
        } else {
          posts = await fetchRssPosts(feedUrl);
          await runtime.setCache(RSS_CACHE_KEY, {
            posts,
            expiresAt: now + RSS_CACHE_TTL_MS,
          } as CachedRss);
        }
        values.substackRecentPosts = posts;
        if (posts.length > 0) {
          const lines = posts.map(
            (p) => `- "${p.title}" ${p.link}${p.date ? ` (${p.date.slice(0, 10)})` : ""}`,
          );
          textParts.push(`Recent Ikigai Studio Substack posts:\n${lines.join("\n")}`);
        }
      }

      if (linkedInHandle) {
        const cached = await runtime.getCache<CachedProfile>(PROFILE_CACHE_KEY);
        const now = Date.now();
        let summary = "";
        let profileData: SubstackProfileResult | null = null;
        if (cached && cached.expiresAt > now) {
          summary = cached.summary;
          profileData = cached.data;
        } else {
          profileData = await fetchSubstackProfile(linkedInHandle);
          summary = formatProfileSummary(profileData);
          await runtime.setCache(PROFILE_CACHE_KEY, {
            summary,
            data: profileData,
            expiresAt: now + PROFILE_CACHE_TTL_MS,
          } as CachedProfile);
        }
        values.substackProfile = profileData;
        if (summary) textParts.push(`Substack profile: ${summary}`);
      }

      const text = textParts.length > 0 ? textParts.join("\n\n") : "";
      return { text, values };
    } catch (err) {
      logger.debug(`[SubstackContext] Provider error: ${err}`);
      return { text: "", values: {} };
    }
  },
};
