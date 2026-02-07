/**
 * Dashboard Upload API – ingest text or YouTube URL into knowledge base.
 * POST /api/agents/:agentId/plugins/plugin-vince/vince/upload
 * Body: { type: 'text' | 'youtube', content: string }
 * Invokes VINCE_UPLOAD action handler with synthetic message.
 */

import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import { vinceUploadAction } from "../actions/upload.action";

/** Dashboard upload entity ID (system user for dashboard-initiated uploads) */
const DASHBOARD_ENTITY_ID = "00000000-0000-0000-0000-000000000001" as UUID;
const DASHBOARD_ROOM_ID = "00000000-0000-0000-0000-000000000002" as UUID;

export interface UploadRequest {
  type: "text" | "youtube";
  content: string;
}

export interface UploadResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Process upload from dashboard: text or YouTube URL.
 * Creates a synthetic Memory and invokes VINCE_UPLOAD handler.
 */
export async function processDashboardUpload(
  runtime: IAgentRuntime,
  body: UploadRequest,
): Promise<UploadResponse> {
  const { type, content } = body;
  const trimmed = content?.trim();
  if (!trimmed) {
    return { success: false, error: "Content is required" };
  }

  let messageText: string;
  if (type === "youtube") {
    messageText = trimmed;
  } else {
    messageText = `upload: ${trimmed}`;
  }

  const memory: Memory = {
    id: uuidv4() as UUID,
    entityId: DASHBOARD_ENTITY_ID,
    agentId: runtime.agentId,
    roomId: DASHBOARD_ROOM_ID,
    content: { text: messageText },
    createdAt: Date.now(),
  };

  let callbackMessage = "";
  const callback = async (c: { text?: string }) => {
    if (c?.text) callbackMessage = c.text;
  };

  try {
    await vinceUploadAction.handler(runtime, memory, undefined, undefined, callback);
    const isSuccess =
      callbackMessage.includes("✅") ||
      callbackMessage.includes("saved to knowledge");
    return {
      success: isSuccess,
      message: callbackMessage || (isSuccess ? "Uploaded successfully" : "Upload may have failed"),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
