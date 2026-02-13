/**
 * Honcho client for optional memory context and write-back.
 * No Eliza Service class; plain module. Used when HONCHO_API_KEY is set.
 */

import { logger } from "@elizaos/core";

const DEFAULT_WORKSPACE_ID = "vince-openclaw";
const DEFAULT_BASE_URL = "https://api.honcho.dev";

let honchoInstance: import("@honcho-ai/sdk").Honcho | null = null;

function getApiKey(): string | undefined {
  return process.env.HONCHO_API_KEY?.trim() || undefined;
}

function getBaseUrl(): string {
  return process.env.HONCHO_BASE_URL?.trim() || DEFAULT_BASE_URL;
}

function getWorkspaceId(): string {
  return process.env.HONCHO_WORKSPACE_ID?.trim() || DEFAULT_WORKSPACE_ID;
}

/**
 * Whether Honcho is configured (plugin can offer Honcho context and write-back).
 */
export function isHonchoConfigured(): boolean {
  return !!getApiKey();
}

/**
 * Get or create Honcho client instance. Returns null if HONCHO_API_KEY is not set.
 */
async function getClient(): Promise<import("@honcho-ai/sdk").Honcho | null> {
  if (!getApiKey()) return null;
  if (honchoInstance) return honchoInstance;
  try {
    const { Honcho } = await import("@honcho-ai/sdk");
    honchoInstance = new Honcho({
      apiKey: getApiKey(),
      baseURL: getBaseUrl(),
      workspaceId: getWorkspaceId(),
    });
    return honchoInstance;
  } catch (err) {
    logger?.warn?.({ err }, "[HonchoClient] Failed to create Honcho client");
    return null;
  }
}

export interface GetContextOptions {
  tokens?: number;
}

/**
 * Get formatted context for a peer in a session (recent conversation + representation).
 * Returns empty string on failure or if Honcho is not configured.
 */
export async function getContextForPeer(
  sessionId: string,
  peerId: string,
  options: GetContextOptions = {},
): Promise<string> {
  const client = await getClient();
  if (!client) return "";

  try {
    const session = await client.session(sessionId);
    const context = await session.context({
      tokens: options.tokens ?? 800,
      peerTarget: peerId,
      summary: true,
    });

    const parts: string[] = [];
    if (context.peerRepresentation) parts.push(context.peerRepresentation);
    if (context.summary?.content) parts.push(context.summary.content);
    if (context.messages?.length) {
      const recent = context.messages.slice(-5);
      parts.push(recent.map((m) => `${m.peerId}: ${m.content}`).join("\n"));
    }
    return parts.filter(Boolean).join("\n\n").slice(0, 3000) || "";
  } catch (err) {
    logger?.debug?.({ err, sessionId, peerId }, "[HonchoClient] getContextForPeer failed");
    return "";
  }
}

export interface AppendMessagesParams {
  sessionId: string;
  userPeerId: string;
  assistantPeerId: string;
  userContent?: string;
  assistantContent?: string;
}

/**
 * Append user and/or assistant messages to a Honcho session so reasoning can run.
 */
export async function appendMessages(params: AppendMessagesParams): Promise<boolean> {
  const client = await getClient();
  if (!client) return false;

  const { sessionId, userPeerId, assistantPeerId, userContent, assistantContent } = params;
  const toAdd: { peerId: string; content: string }[] = [];
  if (userContent) toAdd.push({ peerId: userPeerId, content: userContent });
  if (assistantContent) toAdd.push({ peerId: assistantPeerId, content: assistantContent });
  if (toAdd.length === 0) return true;

  try {
    const session = await client.session(sessionId);
    const userPeer = await client.peer(userPeerId);
    const assistantPeer = await client.peer(assistantPeerId);
    const messages = toAdd.map((m) =>
      m.peerId === userPeerId ? userPeer.message(m.content) : assistantPeer.message(m.content),
    );
    await session.addMessages(messages);
    return true;
  } catch (err) {
    logger?.debug?.({ err, sessionId }, "[HonchoClient] appendMessages failed");
    return false;
  }
}
