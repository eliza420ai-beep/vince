import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { getPasteTradeBaseUrl, getPasteTradeKey } from "./config.ts";

export interface CreateSourcePayload {
  url?: string;
  title?: string;
  platform?: string;
  author_handle?: string;
  author_avatar_url?: string;
  source_date?: string;
  source_images?: unknown[];
  body_text?: string;
  word_count?: number;
  duration_seconds?: number;
  speakers_count?: number;
  run_id?: string;
}

export interface CreateSourceResult {
  source_id: string;
  source_url: string;
  status?: string;
  run_id?: string;
}

export class PasteTradeClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  static fromRuntime(runtime: IAgentRuntime): PasteTradeClient | null {
    const key = getPasteTradeKey(runtime);
    if (!key) return null;
    return new PasteTradeClient(getPasteTradeBaseUrl(runtime), key);
  }

  private headers(json = true): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  async createSource(
    payload: CreateSourcePayload,
  ): Promise<CreateSourceResult> {
    const body = { ...payload };
    delete body.word_count;
    delete body.duration_seconds;
    delete body.speakers_count;

    const res = await fetch(`${this.baseUrl}/api/sources`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`createSource ${res.status}: ${text.slice(0, 400)}`);
    }
    return JSON.parse(text) as CreateSourceResult;
  }

  async postSourceEvent(
    sourceId: string,
    eventType: string,
    data: Record<string, unknown>,
    runId?: string,
  ): Promise<boolean> {
    const eventData = runId ? { ...data, run_id: runId } : data;
    try {
      const res = await fetch(
        `${this.baseUrl}/api/sources/${encodeURIComponent(sourceId)}/events`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            event_type: eventType,
            data: eventData,
          }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        logger.warn(
          `[paste-trade] postSourceEvent ${eventType} failed ${res.status}: ${t.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (e) {
      logger.warn(
        `[paste-trade] postSourceEvent ${eventType}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }

  async discover(body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/skill/discover`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`discover ${res.status}: ${text.slice(0, 400)}`);
    }
    return JSON.parse(text) as unknown;
  }

  async routeSkill(body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/skill/route`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`route ${res.status}: ${text.slice(0, 400)}`);
    }
    return JSON.parse(text) as unknown;
  }

  async postTrade(body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/trades`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`postTrade ${res.status}: ${text.slice(0, 400)}`);
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return { raw: text };
    }
  }

  /** Best-effort snapshot for UI polling (backend may differ). */
  async getSourceSnapshot(sourceId: string): Promise<unknown | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/api/sources/${encodeURIComponent(sourceId)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${this.apiKey}` },
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (!res.ok) return null;
      return (await res.json()) as unknown;
    } catch {
      return null;
    }
  }
}
