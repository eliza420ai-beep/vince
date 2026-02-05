/**
 * Gated access for VINCE 4.20 MVP.
 * MVP: invite-code gate (localStorage). Hackathon: Supabase Auth or CDP.
 */

const INVITE_STORAGE_KEY = "vince_invite";

export function setInviteCode(code: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INVITE_STORAGE_KEY, code.trim());
}

export function getStoredInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(INVITE_STORAGE_KEY);
}

export function clearInviteCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(INVITE_STORAGE_KEY);
}

/** For MVP we accept any non-empty code; later validate against env or API. */
export function isGatedAccessAllowed(): boolean {
  const code = getStoredInviteCode();
  return Boolean(code && code.length > 0);
}
