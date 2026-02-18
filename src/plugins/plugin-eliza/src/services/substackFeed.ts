/**
 * Shared Substack RSS fetch and parse for SUBSTACK_CONTEXT provider and GET /eliza/substack API.
 * No auth; uses SUBSTACK_FEED_URL (default ikigaistudio.substack.com/feed).
 */

const DEFAULT_FEED_URL = "https://ikigaistudio.substack.com/feed";
const MAX_POSTS = 8;

export interface SubstackPost {
  title: string;
  link: string;
  date: string;
}

/** Returns the Substack RSS feed URL (default: ikigaistudio.substack.com/feed). Never null. */
export function getSubstackFeedUrl(): string {
  const raw = process.env.SUBSTACK_FEED_URL;
  const url = typeof raw === "string" ? raw.trim() : "";
  return url || DEFAULT_FEED_URL;
}

function extractOne(tag: string, blob: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i");
  const m = blob.match(re);
  if (!m) return "";
  let raw = m[1];
  raw = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  raw = raw.replace(/<[^>]+>/g, "").trim();
  return raw;
}

function extractLink(blob: string): string {
  const href = blob.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (href) return href[1].trim();
  const linkContent = extractOne("link", blob);
  return linkContent ? linkContent.trim() : "";
}

function parseRssFeed(xml: string): SubstackPost[] {
  const posts: SubstackPost[] = [];
  try {
    const itemRegex = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi;

    let chunks: string[] = [];
    for (const m of xml.matchAll(itemRegex)) chunks.push(m[1]);
    if (chunks.length === 0) for (const m of xml.matchAll(entryRegex)) chunks.push(m[1]);

    for (let i = 0; i < Math.min(chunks.length, MAX_POSTS); i++) {
      const blob = chunks[i];
      const title = extractOne("title", blob);
      const link = extractLink(blob);
      const date =
        extractOne("pubDate", blob) ||
        extractOne("updated", blob) ||
        extractOne("published", blob) ||
        "";
      if (title && link) posts.push({ title, link, date });
    }
  } catch {
    // no-op
  }
  return posts;
}

/**
 * Fetch and parse Substack RSS. Returns up to MAX_POSTS. Never throws.
 */
export async function fetchSubstackPosts(feedUrl: string): Promise<SubstackPost[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
        "User-Agent": "Vince-Bot/1.0 (Ikigai Studio; +https://github.com/elizaos/eliza)",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssFeed(xml);
  } catch {
    return [];
  }
}
