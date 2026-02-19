import {
  type Action,
  type IAgentRuntime,
  logger,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
} from "@elizaos/core";
import { BankrAgentService } from "../services/bankr-agent.service";

function getJobIdFromMessageOrState(
  message: Memory,
  state?: State,
): string | null {
  const text = message?.content?.text?.trim() ?? "";
  const match = text.match(/\b([a-zA-Z0-9_-]{8,})\b/);
  if (match) return match[1];
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  const jobId = params.jobId ?? params.job_id;
  return typeof jobId === "string" ? jobId.trim() : null;
}

export const bankrAgentCancelJobAction: Action = {
  name: "BANKR_AGENT_CANCEL_JOB",
  description:
    "Cancel a pending or processing Bankr prompt job by jobId. Use when the user says cancel my Bankr job, cancel job X, or similar. jobId can be in the message or in actionParams.jobId. Cancelling an already completed or cancelled job is idempotent.",
  similes: ["BANKR_CANCEL_JOB", "BANKR_JOB_CANCEL"],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const service = runtime.getService<BankrAgentService>(
      BankrAgentService.serviceType,
    );
    if (!service?.isConfigured()) return false;
    return !!getJobIdFromMessageOrState(message, state);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const service = runtime.getService<BankrAgentService>(
      BankrAgentService.serviceType,
    );
    if (!service) {
      const err = "Bankr Agent service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const jobId = getJobIdFromMessageOrState(message, state);
    if (!jobId) {
      const err =
        "No jobId found. Provide it in the message or actionParams.jobId.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      await service.cancelJob(jobId);
      const reply = `Bankr job \`${jobId}\` cancelled.`;
      callback?.({
        text: reply,
        actions: ["BANKR_AGENT_CANCEL_JOB"],
        source: message.content?.source,
      });
      return { success: true, text: reply };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_AGENT_CANCEL_JOB] " + msg);
      callback?.({
        text: `Cancel job failed: ${msg}`,
        actions: ["BANKR_AGENT_CANCEL_JOB"],
      });
      return {
        success: false,
        text: msg,
        error: err instanceof Error ? err : new Error(msg),
      };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "Cancel my Bankr job abc123" } },
      {
        name: "Otaku",
        content: {
          text: "Bankr job `abc123` cancelled.",
          actions: ["BANKR_AGENT_CANCEL_JOB"],
        },
      },
    ],
  ],
};
