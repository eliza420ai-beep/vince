/**
 * Skill Routing
 *
 * Deterministic skill routing hints for ASK_AGENT.
 * Pure function — no side effects, no external dependencies.
 * Exported separately so it can be used by both the action handler
 * and the eval script (scripts/skills/eval-skill-routing.ts).
 *
 * PRD: One Dream Phase 9 — Skills OS, Task #50
 */

/**
 * Scans a user message for skill-intent keywords and returns a routing hint
 * string to prepend to the system prompt, or null if no skill matches.
 *
 * Priority order: x-research → trading-agent → registry
 * First match wins.
 */
export function getSkillRoutingHint(message: string): string | null {
  const lower = (message ?? "").toLowerCase();

  // X Research (Echo agent)
  const xResearchKeywords = [
    "x research",
    "twitter research",
    "find tweets",
    "search x",
    "x accounts",
    "run x research",
    "search twitter",
    "x search",
    "x for ",
  ];
  if (xResearchKeywords.some((kw) => lower.includes(kw))) {
    return "Route this to Echo (ECHO agent) who has x-research skill. Relevant skill: skills/x-research/SKILL.md";
  }

  // Trading Agent (Otaku agent)
  const tradingKeywords = [
    "trading agent",
    "evclaw",
    "hyperliquid live",
    "live trading",
    "perps execution",
    "execute trade",
    "evplus",
    "hyperliquid bot",
    "perps bot",
  ];
  if (tradingKeywords.some((kw) => lower.includes(kw))) {
    return "Route this to Otaku (OTAKU agent) who has trading-agent skill. Relevant skill: skills/trading-agent/SKILL.md";
  }

  // Skill Registry (Sentinel)
  const registryKeywords = [
    "what skills",
    "available skills",
    "skill registry",
    "list skills",
    "show me skills",
    "show skills",
    "what skill",
  ];
  if (registryKeywords.some((kw) => lower.includes(kw))) {
    return "Sentinel has the skill registry. Reference skills/registry.json for available skills.";
  }

  return null;
}
