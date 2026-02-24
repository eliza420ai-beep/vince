import { ElizaClient } from "@elizaos/api-client";

interface FrontendElizaClient {
  auth: {
    login(params: {
      email: string;
      username: string;
      cdpUserId: string;
    }): Promise<{ token: string; userId: string }>;
    logout(): Promise<void>;
  };

  setAuthToken(token: string): void;
  clearAuthToken(): void;

  agents: {
    listAgents(): Promise<any>;
    getAgent(id: string): Promise<any>;
  };

  entities: {
    getEntity(id: string): Promise<any>;
    createEntity(payload: any): Promise<any>;
    updateEntity(id: string, payload: any): Promise<any>;
  };

  messaging: {
    getCurrentMessageServer(): Promise<any>;
    getServerChannels(serverId: string): Promise<{ channels: any[] }>;
    getChannelMessages(
      channelId: string,
      params?: any,
    ): Promise<{ messages: any[] }>;
    generateChannelTitle(
      userMessage: string,
      agentId: string,
    ): Promise<{ title: string }>;
    createGroupChannel(params: any): Promise<{ id: string } & any>;
  };

  cdp: {
    getOrCreateWallet(name: string): Promise<any>;
    getTokens(chain?: string): Promise<any>;
    syncTokens(chain?: string): Promise<any>;
    getNFTs(chain?: string): Promise<any>;
    syncNFTs(chain?: string): Promise<any>;
    getHistory(): Promise<any>;
    sendToken(request: any): Promise<any>;
    sendNFT(request: any): Promise<any>;
    getSwapPrice(request: any): Promise<any>;
    swap(request: any): Promise<any>;
    searchTokens(request: any): Promise<any>;
    getTopAndTrendingTokens(request: any): Promise<any>;
  };

  server: {
    checkHealth(): Promise<any>;
  };

  gamification: {
    getUserSummary(agentId: string): Promise<any>;
    getLeaderboard(
      agentId: string,
      scope: "weekly" | "all_time",
      limit: number,
    ): Promise<any>;
    getReferralCode(agentId: string): Promise<any>;
  };
}

export const elizaClient = ElizaClient.create({
  baseUrl: window.location.origin,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
  apiKey: localStorage.getItem("eliza-api-key") || undefined,
}) as unknown as FrontendElizaClient;

export function updateApiKey(newKey: string | null) {
  if (newKey) {
    localStorage.setItem("eliza-api-key", newKey);
  } else {
    localStorage.removeItem("eliza-api-key");
  }
}
