/**
 * Dashboard Upload API — handled by Eliza's agent.
 * POST /api/agents/:elizaAgentId/plugins/plugin-eliza/eliza/upload
 * Body: { type: 'text' | 'youtube', content: string }
 *
 * When the request is sent to Eliza's agent, this route runs with Eliza's runtime.
 */

import type { IAgentRuntime, Memory, UUID } from "@elizaos/core";
import { v4 as uuidv4 } from "uuid";
import { uploadAction } from "../actions/upload.action";

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

export async function handleUploadRequest(
  runtime: IAgentRuntime,
  body: UploadRequest,
): Promise<UploadResponse> {
  const { type, content } = body;
  const trimmed = content?.trim();
  if (!trimmed) {
    return { success: false, error: "Content is required" };
  }

  const messageText = type === "youtube" ? trimmed : `upload: ${trimmed}`;
  const memory: Memory = {
    id: uuidv4() as UUID,
    entityId: DASHBOARD_ENTITY_ID,
    agentId: runtime.agentId,
    roomId: DASHBOARD_ROOM_ID,
    content: { text: messageText },
    createdAt: Date.now(),
  };

  let callbackMessage = "";
  const callback = async (c: { text?: string }): Promise<Memory[]> => {
    if (c?.text) callbackMessage = c.text;
    return [];
  };

  try {
    await uploadAction.handler(runtime, memory, undefined, undefined, callback);
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
