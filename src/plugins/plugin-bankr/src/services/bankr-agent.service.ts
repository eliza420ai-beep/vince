import { type IAgentRuntime, logger, Service } from "@elizaos/core";
import type {
  PromptResponse,
  JobStatusResponse,
  JobStatus,
  UserInfoResponse,
  SignRequest,
  SignResponse,
  SubmitTransactionRequest,
  SubmitTransactionResponse,
} from "../types";

const DEFAULT_AGENT_URL = "https://api.bankr.bot";

export class BankrAgentService extends Service {
  static serviceType = "bankr_agent" as const;

  private apiUrl: string;
  private apiKey: string;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.apiUrl = (runtime.getSetting("BANKR_AGENT_URL") as string) || process.env.BANKR_AGENT_URL || DEFAULT_AGENT_URL;
    this.apiKey = (runtime.getSetting("BANKR_API_KEY") as string)?.trim() || (process.env.BANKR_API_KEY as string)?.trim() || "";
    if (this.apiKey) {
      logger.info("[BANKR AGENT] API key configured (from runtime or env)");
    }
  }

  get capabilityDescription(): string {
    return "Bankr Agent: prompt (submit + poll), user info (wallets, Bankr Club), sign (personal_sign, EIP-712, signTransaction), submit raw tx. Chat, balances, swaps, and synchronous sign/submit.";
  }

  static async start(runtime: IAgentRuntime): Promise<BankrAgentService> {
    logger.info("[BANKR AGENT] Starting Bankr Agent service");
    const service = new BankrAgentService(runtime);
    await service.initialize(runtime);
    return service;
  }

  async stop(): Promise<void> {
    logger.info("[BANKR AGENT] Stopping Bankr Agent service");
  }

  isConfigured(): boolean {
    return !!this.apiKey?.trim();
  }

  async submitPrompt(prompt: string): Promise<{ jobId: string }> {
    if (!this.isConfigured()) {
      throw new Error("BANKR_API_KEY is not set");
    }
    const url = `${this.apiUrl.replace(/\/$/, "")}/agent/prompt`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
    const data = (await res.json()) as PromptResponse & { error?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.error || data.message || "Bankr Agent API error");
    }
    if (!data.jobId) {
      throw new Error("Bankr API did not return a jobId");
    }
    return { jobId: data.jobId };
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    if (!this.isConfigured()) {
      throw new Error("BANKR_API_KEY is not set");
    }
    const url = `${this.apiUrl.replace(/\/$/, "")}/agent/job/${jobId}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "x-api-key": this.apiKey },
    });
    const data = (await res.json()) as JobStatusResponse & { error?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.error || data.message || "Bankr Agent API error");
    }
    return data;
  }

  async getAccountInfo(): Promise<UserInfoResponse> {
    if (!this.isConfigured()) {
      throw new Error("BANKR_API_KEY is not set");
    }
    const url = `${this.apiUrl.replace(/\/$/, "")}/agent/me`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-API-Key": this.apiKey },
    });
    const data = (await res.json()) as UserInfoResponse & { error?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.error || data.message || "Bankr User Info API error");
    }
    return data;
  }

  async sign(request: SignRequest): Promise<SignResponse> {
    if (!this.isConfigured()) {
      throw new Error("BANKR_API_KEY is not set");
    }
    const { signatureType, message, typedData, transaction, payload } = request;
    const body: Record<string, unknown> = { signatureType };
    if (signatureType === "personal_sign") {
      body.message = message ?? (typeof payload === "string" ? payload : undefined);
      if (body.message == null) throw new Error("personal_sign requires message or payload (string)");
    } else if (signatureType === "eth_signTypedData_v4") {
      body.typedData = typedData ?? (typeof payload === "object" && payload && !Array.isArray(payload) ? payload : undefined);
      if (body.typedData == null) throw new Error("eth_signTypedData_v4 requires typedData or payload (object)");
    } else if (signatureType === "eth_signTransaction") {
      body.transaction = transaction ?? (typeof payload === "object" && payload && !Array.isArray(payload) ? payload : undefined);
      if (body.transaction == null) throw new Error("eth_signTransaction requires transaction or payload (object)");
    }
    const url = `${this.apiUrl.replace(/\/$/, "")}/agent/sign`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as SignResponse & { error?: string; message?: string };
    if (!res.ok) {
      throw new Error(data.error || data.message || "Bankr Sign API error");
    }
    return data;
  }

  async submitTransaction(
    request: SubmitTransactionRequest
  ): Promise<SubmitTransactionResponse> {
    if (!this.isConfigured()) {
      throw new Error("BANKR_API_KEY is not set");
    }
    const url = `${this.apiUrl.replace(/\/$/, "")}/agent/submit`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const data = (await res.json()) as SubmitTransactionResponse & {
      error?: string;
      message?: string;
      transactionHash?: string;
    };
    if (!res.ok) {
      throw new Error(data.error || data.message || "Bankr Submit API error");
    }
    const txHash = data.txHash ?? data.transactionHash;
    return { ...data, txHash };
  }

  async cancelJob(jobId: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("BANKR_API_KEY is not set");
    }
    const url = `${this.apiUrl.replace(/\/$/, "")}/agent/job/${jobId}/cancel`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "x-api-key": this.apiKey, "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(data.error || data.message || "Cancel failed");
    }
  }

  async pollJobUntilComplete(
    jobId: string,
    options?: { intervalMs?: number; maxAttempts?: number; onStatus?: (status: JobStatus, message: string) => void }
  ): Promise<JobStatusResponse> {
    const intervalMs = options?.intervalMs ?? 1500;
    const maxAttempts = options?.maxAttempts ?? 120;
    const onStatus = options?.onStatus;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getJobStatus(jobId);
      if (onStatus) {
        const msg = status.status === "pending" ? "Thinking..." : status.status === "processing" ? "Working on it..." : status.status;
        onStatus(status.status, msg);
      }
      if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
        return status;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return this.getJobStatus(jobId);
  }
}
