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

function getJobIdFromMessageOrState(message: Memory, state?: State): string | null {
  const text = message?.content?.text?.trim() ?? "";
  const match = text.match(/\b([a-zA-Z0-9_-]{8,})\b/);
  if (match) return match[1];
  const params = (state?.data?.actionParams || {}) as Record<string, unknown>;
  const jobId = params.jobId ?? params.job_id;
  return typeof jobId === "string" ? jobId.trim() : null;
}

export const bankrJobStatusAction: Action = {
  name: "BANKR_JOB_STATUS",
  description:
    "Get the status of a Bankr prompt job by jobId. Returns status (pending, processing, completed, failed, cancelled), response text if completed, error if failed, and whether it is cancellable. Use when the user asks what's the status of my Bankr job, check on job X, or similar. jobId can be in the message or in actionParams.jobId.",
  similes: ["BANKR_JOB_STATUS", "BANKR_CHECK_JOB", "BANKR_GET_JOB"],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service?.isConfigured()) return false;
    return !!getJobIdFromMessageOrState(message, state);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const service = runtime.getService<BankrAgentService>(BankrAgentService.serviceType);
    if (!service) {
      const err = "Bankr Agent service not available.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    const jobId = getJobIdFromMessageOrState(message, state);
    if (!jobId) {
      const err = "No jobId found. Provide it in the message or actionParams.jobId.";
      callback?.({ text: err });
      return { success: false, text: err };
    }

    try {
      const status = await service.getJobStatus(jobId);
      const parts: string[] = [`**Job \`${jobId}\`:** ${status.status}`];
      if (status.response) parts.push(`Response: ${status.response}`);
      if (status.error) parts.push(`Error: ${status.error}`);
      if (typeof status.cancellable === "boolean") {
        parts.push(`Cancellable: ${status.cancellable}`);
      }
      if (status.completedAt) parts.push(`Completed: ${status.completedAt}`);
      if (status.processingTime != null) parts.push(`Processing time: ${status.processingTime}ms`);

      const reply = parts.join("\n");
      callback?.({
        text: reply,
        actions: ["BANKR_JOB_STATUS"],
        source: message.content?.source,
      });
      return { success: true, text: reply, data: { job: status } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("[BANKR_JOB_STATUS] " + msg);
      callback?.({ text: `Job status failed: ${msg}`, actions: ["BANKR_JOB_STATUS"] });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      { name: "user", content: { text: "What's the status of my Bankr job abc123?" } },
      { name: "Otaku", content: { text: "Job `abc123`: completed\nResponse: …", actions: ["BANKR_JOB_STATUS"] } },
    ],
  ],
};
