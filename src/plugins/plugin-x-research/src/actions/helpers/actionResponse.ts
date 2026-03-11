import type { HandlerCallback } from "@elizaos/core";

export async function sendActionResponse(
  callback: HandlerCallback | undefined,
  action: string,
  payload: {
    text: string;
    [key: string]: unknown;
  },
): Promise<void> {
  if (!callback) return;
  await callback({
    ...payload,
    action,
  });
}
