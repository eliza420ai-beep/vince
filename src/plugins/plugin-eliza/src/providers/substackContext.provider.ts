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
import {
  getSubstackFeedUrl,
  fetchSubstackPosts,
  type SubstackPost,
} from "../services/substackFeed";

const SUBSTACK_PROFILE_API_BASE = "https://substack.com/profile/search/linkedin";
const RSS_CACHE_KEY = "plugin-eliza:substack:rss";
const PROFILE_CACHE_KEY = "plugin-eliza:substack:profile";
const RSS_CACHE_TTL_MS = 20 * 60 * 1000; // 20 min
const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

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
  posts: SubstackPost[];
  expiresAt: number;
}

interface CachedProfile {
  summary: string;
  data: SubstackProfileResult | null;
  expiresAt: number;
}

function getLinkedInHandle(): string | null {
  const handle = process.env.ELIZA_SUBSTACK_LINKEDIN_HANDLE?.trim();
  return handle || null;
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

      const feedUrl = getSubstackFeedUrl();
      const linkedInHandle = getLinkedInHandle();

      if (feedUrl) {
        const cached = await runtime.getCache<CachedRss>(RSS_CACHE_KEY);
        const now = Date.now();
        let posts: SubstackPost[] = [];
        if (cached && cached.expiresAt > now && Array.isArray(cached.posts)) {
          posts = cached.posts;
        } else {
          posts = await fetchSubstackPosts(feedUrl);
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
