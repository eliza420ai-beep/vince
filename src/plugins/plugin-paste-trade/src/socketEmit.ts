import type { IAgentRuntime } from "@elizaos/core";

/**
 * Broadcast paste.trade progress to connected UIs (same pattern as plugin-otaku notifications).
 */
export function emitPasteTradeEvent(
  runtime: IAgentRuntime,
  payload: {
    runId: string;
    agentId: string;
    sourceId?: string;
    event_type: string;
    data?: Record<string, unknown>;
  },
): void {
  try {
    const messageBus = runtime.getService("message-bus-service") as {
      io?: {
        emit?: (ev: string, data: object) => void;
        to?: (room: string) => { emit: (ev: string, data: object) => void };
      };
    } | null;
    if (messageBus?.io?.emit) {
      messageBus.io.emit("paste_trade:event", payload);
    }
  } catch {
    /* non-fatal */
  }
}
