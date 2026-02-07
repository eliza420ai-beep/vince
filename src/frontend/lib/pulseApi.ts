/**
 * Dashboard Pulse API – same data as terminal dashboards + LLM insight.
 * ElizaOS server mounts plugin routes at /api/agents/:agentId/plugins + route.path,
 * so path is /api/agents/:agentId/plugins/vince/pulse.
 */

export interface PulseSection {
  label: string;
  summary: string;
  data?: Record<string, unknown>;
}

export interface PulseResponse {
  sections: Record<string, PulseSection>;
  insight: string;
  updatedAt: number;
}

const PULSE_STALE_MS = 2 * 60 * 1000; // 2 minutes

export async function fetchPulse(
  agentId: string,
): Promise<PulseResponse | null> {
  const base = window.location.origin;
  // Server mounts plugin routes at /api/agents/:agentId/plugins/<route.path>
  const url = `${base}/api/agents/${agentId}/plugins/vince/pulse`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      if (res.status === 503) return null;
      throw new Error(`Pulse: ${res.status}`);
    }
    return (await res.json()) as PulseResponse;
  } catch {
    return null;
  }
}

export { PULSE_STALE_MS };
