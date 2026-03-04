import type { WttPick } from "../../../../../shared/wttContract";
import { validateWttPick } from "../../../../../shared/wttContract";

const DEFAULT_INVALIDATION =
  "thesis invalidates on clear regime break against position";
const DEFAULT_KILL = "exit if catalyst invalidates or liquidity deteriorates";

export function ensureContractValidPick(pick: WttPick | null): WttPick | null {
  if (!pick) return null;
  const normalized: WttPick = {
    ...pick,
    thesis: (pick.thesis || "WTT fallback thesis").trim(),
    primaryInstrument: (pick.primaryInstrument || "perp").trim(),
    invalidateCondition: (
      pick.invalidateCondition || DEFAULT_INVALIDATION
    ).trim(),
    killConditions:
      pick.killConditions && pick.killConditions.length > 0
        ? pick.killConditions.filter((k) => !!k?.trim())
        : [DEFAULT_KILL],
  };
  const validated = validateWttPick(normalized);
  if (!validated.ok) return null;
  return validated.value;
}
