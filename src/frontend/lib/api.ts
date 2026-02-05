/**
 * Type-safe API client for ElizaOS / VINCE.
 * Align with Otaku-style elizaClient; extend with messages, sessions, etc.
 */

const getConfig = () => ({
  apiBase: typeof window !== "undefined" && (window as any).ELIZA_CONFIG?.apiBase
    ? (window as any).ELIZA_CONFIG.apiBase
    : "",
  agentId: typeof window !== "undefined" && (window as any).ELIZA_CONFIG?.agentId
    ? (window as any).ELIZA_CONFIG.agentId
    : "",
});

export async function listAgents(): Promise<{ agents?: { id: string; name?: string }[] }> {
  const { apiBase } = getConfig();
  const base = apiBase || "";
  const res = await fetch(`${base}/api/agents`);
  if (!res.ok) throw new Error(`agents list failed: ${res.status}`);
  return res.json();
}

export async function sendMessage(params: {
  agentId: string;
  text: string;
  roomId?: string;
  senderId?: string;
}): Promise<{ data?: { message?: { text?: string }; messageId?: string }; success?: boolean }> {
  const { apiBase } = getConfig();
  const base = apiBase || "";
  const res = await fetch(`${base}/api/agents/${params.agentId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: params.text,
      roomId: params.roomId,
      senderId: params.senderId,
    }),
  });
  if (!res.ok) throw new Error(`send message failed: ${res.status}`);
  return res.json();
}
