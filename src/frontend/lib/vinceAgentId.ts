/** Minimal agent shape from GET /api/agents. */
export type AgentLike = {
  id?: string;
  name?: string | null;
  characterName?: string | null;
  /** Present on Eliza list API: only `active` runtimes register plugin routes (paste.trade, pulse, …). */
  status?: string | null;
};

function isVinceName(a: AgentLike): boolean {
  const n = (a.name ?? "").trim().toUpperCase();
  const c = (a.characterName ?? "").trim().toUpperCase();
  return n === "VINCE" || c === "VINCE";
}

/**
 * Resolve the VINCE runtime id for plugin-vince / paste-trade URLs.
 * Prefers an **active** agent so URLs hit a running runtime (inactive DB-only rows 404 on plugin routes).
 */
export function findVinceAgentId(
  agents: AgentLike[] | undefined,
  fallbackAgentId?: string | null,
): string | null {
  if (!agents?.length) return fallbackAgentId?.trim() || null;
  const matches = agents.filter(isVinceName);
  if (!matches.length) return fallbackAgentId?.trim() || null;

  const active = matches.filter(
    (a) => (a.status ?? "").toLowerCase() === "active",
  );
  if (active.length) {
    const id = active[0]?.id?.trim();
    if (id) return id;
  }

  const unknownStatus = matches.filter((a) => !(a.status ?? "").trim());
  if (unknownStatus.length) {
    const id = unknownStatus[0]?.id?.trim();
    if (id) return id;
  }

  return null;
}
