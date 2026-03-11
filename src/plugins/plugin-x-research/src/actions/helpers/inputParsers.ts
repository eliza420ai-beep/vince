import { TOPIC_BY_ID } from "../../constants/topics";

const HANDLE_RE = /@([A-Za-z0-9_]{1,15})/g;
const STATUS_URL_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/(\d{10,25})/i;
const TWEET_ID_RE = /\b(\d{10,25})\b/g;

export function parseUsernameFromMessage(text: string): string | null {
  const explicit = text.match(HANDLE_RE);
  if (!explicit || explicit.length === 0) return null;
  return explicit[0].replace(/^@/, "");
}

export function parseTweetIdOrUrl(text: string): {
  tweetId: string | null;
  source: "url" | "id" | "none";
} {
  const urlMatch = text.match(STATUS_URL_RE);
  if (urlMatch?.[1]) {
    return { tweetId: urlMatch[1], source: "url" };
  }

  const ids = text.match(TWEET_ID_RE);
  if (ids && ids.length > 0) {
    return { tweetId: ids[0], source: "id" };
  }

  return { tweetId: null, source: "none" };
}

export function parseTopicFromPrompt(text: string): string | null {
  const aboutMatch = text.match(/about\s+([A-Za-z0-9$#_-]+)/i);
  const candidate = aboutMatch?.[1]?.replace(/^[#$]/, "").toLowerCase();
  if (!candidate) return null;

  if (TOPIC_BY_ID[candidate]) return TOPIC_BY_ID[candidate].id;

  const fromTerms = Object.values(TOPIC_BY_ID).find((topic) => {
    if (topic.id === candidate) return true;
    return topic.searchTerms.some((term) => term.toLowerCase() === candidate);
  });
  return fromTerms?.id ?? null;
}
