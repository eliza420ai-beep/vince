/**
 * Mission Control Integration Service
 *
 * This service connects Satoshi (the agent) to Mission Control for
 * work orchestration, agent lifecycle management, and governance.
 *
 * API Base: http://localhost:8000/api/v1
 * Auth: Bearer token
 */

import { logger, Service, type IAgentRuntime } from "@elizaos/core";

const MC_BASE_URL =
  process.env.MISSION_CONTROL_URL || "http://localhost:8000/api/v1";
const MC_AUTH_TOKEN = process.env.MISSION_CONTROL_TOKEN;

export interface MCAgent {
  id: string;
  board_id: string | null;
  name: string;
  status: "provisioning" | "active" | "paused" | "retired";
  heartbeat_config: {
    interval_seconds: number;
    missing_tolerance: number;
  } | null;
  identity_profile: Record<string, any> | null;
  identity_template: string | null;
  soul_template: string | null;
  created_at: string;
  updated_at: string;
}

export interface MCBoard {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export interface MCGateway {
  id: string;
  name: string;
  url: string;
  token: string;
  status: string;
}

export interface MCTask {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: "inbox" | "in_progress" | "review" | "done";
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

export class MissionControlService extends Service {
  static serviceType = "MISSION_CONTROL_SERVICE" as const;
  capabilityDescription =
    "Connect to Mission Control for work orchestration, agent lifecycle, and governance.";

  private baseUrl = MC_BASE_URL;
  private token = MC_AUTH_TOKEN;

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<MissionControlService> {
    const svc = new MissionControlService(runtime);
    return svc;
  }

  async stop(): Promise<void> {
    // Cleanup if needed
  }

  isConfigured(): boolean {
    return Boolean(this.token);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T | null> {
    if (!this.token) {
      logger.warn("[MissionControl] Not configured - no token");
      return null;
    }

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
          ...options.headers,
        },
      });

      if (!res.ok) {
        logger.warn(
          `[MissionControl] ${res.status} ${res.statusText}: ${endpoint}`,
        );
        return null;
      }

      return (await res.json()) as T;
    } catch (e) {
      logger.warn("[MissionControl] Request failed: " + (e as Error).message);
      return null;
    }
  }

  // ==================== AGENTS ====================

  /** List all agents */
  async listAgents(): Promise<MCAgent[]> {
    const result = await this.request<{ items: MCAgent[] }>("/agents");
    return result?.items || [];
  }

  /** Get agent by ID */
  async getAgent(id: string): Promise<MCAgent | null> {
    return this.request<MCAgent>(`/agents/${id}`);
  }

  /** Create a new agent */
  async createAgent(agent: {
    name: string;
    board_id?: string;
    status?: string;
    identity_template?: string;
    soul_template?: string;
    heartbeat_config?: { interval_seconds: number; missing_tolerance: number };
    identity_profile?: Record<string, any>;
  }): Promise<MCAgent | null> {
    return this.request<MCAgent>("/agents", {
      method: "POST",
      body: JSON.stringify(agent),
    });
  }

  /** Update an agent */
  async updateAgent(
    id: string,
    updates: Partial<MCAgent>,
  ): Promise<MCAgent | null> {
    return this.request<MCAgent>(`/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  /** Delete an agent */
  async deleteAgent(id: string): Promise<boolean> {
    const result = await this.request<{ ok: boolean }>(`/agents/${id}`, {
      method: "DELETE",
    });
    return result?.ok || false;
  }

  // ==================== BOARDS ====================

  /** List all boards */
  async listBoards(): Promise<MCBoard[]> {
    const result = await this.request<{ items: MCBoard[] }>("/boards");
    return result?.items || [];
  }

  /** Create a new board */
  async createBoard(board: {
    name: string;
    description?: string;
  }): Promise<MCBoard | null> {
    return this.request<MCBoard>("/boards", {
      method: "POST",
      body: JSON.stringify(board),
    });
  }

  // ==================== GATEWAYS ====================

  /** List all gateways */
  async listGateways(): Promise<MCGateway[]> {
    const result = await this.request<{ items: MCGateway[] }>("/gateways");
    return result?.items || [];
  }

  /** Register a new gateway */
  async registerGateway(gateway: {
    name: string;
    url: string;
    token: string;
  }): Promise<MCGateway | null> {
    return this.request<MCGateway>("/gateways", {
      method: "POST",
      body: JSON.stringify(gateway),
    });
  }

  // ==================== TASKS ====================

  /** List tasks for a board */
  async listTasks(boardId: string): Promise<MCTask[]> {
    const result = await this.request<{ items: MCTask[] }>(
      `/boards/${boardId}/tasks`,
    );
    return result?.items || [];
  }

  /** Create a task */
  async createTask(
    boardId: string,
    task: {
      title: string;
      description?: string;
      status?: string;
    },
  ): Promise<MCTask | null> {
    return this.request<MCTask>(`/boards/${boardId}/tasks`, {
      method: "POST",
      body: JSON.stringify(task),
    });
  }

  /** Update a task */
  async updateTask(
    boardId: string,
    taskId: string,
    updates: Partial<MCTask>,
  ): Promise<MCTask | null> {
    return this.request<MCTask>(`/boards/${boardId}/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  // ==================== SATOSHI SPECIFIC ====================

  /** Register Satoshi as an agent in Mission Control */
  async registerSatoshi(): Promise<MCAgent | null> {
    return this.createAgent({
      name: "Satoshi",
      status: "active",
      identity_template: `You are Satoshi, an AI research agent specializing in stock analysis and market research. You are sharp, direct, and helpful. Your role is to provide deep research on stocks, analyze markets, and support investment decisions.`,
      soul_template: `Be concise and direct. Focus on facts and data. Provide actionable insights. When unsure, say so. Never make up information.`,
      heartbeat_config: {
        interval_seconds: 60,
        missing_tolerance: 300,
      },
      identity_profile: {
        role: "researcher",
        skills: ["stock-analysis", "market-research", "data-gathering"],
        domains: ["stocks", "crypto", "options"],
      },
    });
  }

  /** Create a Satoshi Research Board */
  async createSatoshiBoard(): Promise<MCBoard | null> {
    return this.createBoard({
      name: "Satoshi Research",
      description:
        "Research tasks for Satoshi agent - stock analysis, market research, and deep dives",
    });
  }

  /** Check if Satoshi is already registered */
  async findSatoshi(): Promise<MCAgent | null> {
    const agents = await this.listAgents();
    return agents.find((a) => a.name === "Satoshi") || null;
  }
}
