import type { Top100Category } from "./top100Stocks";

/**
 * Map FD sector + industry to Top100 thematic category.
 * Fallback: Unknown.
 */
export function sectorToCategory(
  sector?: string | null,
  industry?: string | null,
): Top100Category {
  const s = (sector ?? "").toLowerCase();
  const i = (industry ?? "").toLowerCase();

  if (s.includes("technology") || s.includes("tech")) {
    if (
      i.includes("semiconductor") ||
      i.includes("chip") ||
      i.includes("semis")
    )
      return "AI Semiconductors";
    if (i.includes("cloud") || i.includes("software") || i.includes("platform"))
      return "AI Cloud & Compute";
    if (
      i.includes("internet") ||
      i.includes("infrastructure") ||
      i.includes("data center")
    )
      return "AI Platforms & Infrastructure";
    if (i.includes("software") || i.includes("enterprise"))
      return "Enterprise Software";
  }

  if (s.includes("industrials") || s.includes("industrial")) {
    if (
      i.includes("aerospace") ||
      i.includes("defense") ||
      i.includes("military")
    )
      return "Defense & Aerospace";
    return "Industrial & Automation";
  }

  if (
    s.includes("healthcare") ||
    s.includes("health") ||
    s.includes("pharma") ||
    s.includes("biotech")
  )
    return "Healthcare & Biotech";

  if (
    s.includes("energy") ||
    s.includes("utilities") ||
    i.includes("electric") ||
    i.includes("power")
  )
    return "Energy, Power & Utilities";

  if (
    s.includes("consumer") ||
    i.includes("retail") ||
    i.includes("e-commerce") ||
    i.includes("digital commerce")
  )
    return "Consumer & Digital Commerce";

  if (i.includes("semiconductor") || i.includes("chip") || i.includes("semis"))
    return "AI Semiconductors";
  if (i.includes("software") || i.includes("enterprise"))
    return "Enterprise Software";
  if (i.includes("aerospace") || i.includes("defense"))
    return "Defense & Aerospace";

  return "Unknown";
}
