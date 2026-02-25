/**
 * Tests for getSkillRoutingHint — deterministic skill routing in ASK_AGENT.
 */

import { describe, it, expect } from "vitest";
import { getSkillRoutingHint } from "../skillRouting";

describe("getSkillRoutingHint", () => {
  // ---------------------------------------------------------------------------
  // X Research routing
  // ---------------------------------------------------------------------------
  describe("x-research routing", () => {
    it("routes 'x research' to Echo", () => {
      const hint = getSkillRoutingHint("run x research on BTC narrative");
      expect(hint).toContain("Echo");
      expect(hint).toContain("x-research");
    });

    it("routes 'search x for' to Echo", () => {
      const hint = getSkillRoutingHint("search x for BTC bullish accounts");
      expect(hint).toContain("Echo");
      expect(hint).toContain("x-research");
    });

    it("routes 'twitter research' to Echo", () => {
      const hint = getSkillRoutingHint("twitter research on SOL");
      expect(hint).toContain("Echo");
    });

    it("routes 'find tweets' to Echo", () => {
      const hint = getSkillRoutingHint("find tweets about ETH merge");
      expect(hint).toContain("Echo");
    });

    it("routes 'x accounts' to Echo", () => {
      const hint = getSkillRoutingHint("show me top x accounts for DeFi");
      expect(hint).toContain("Echo");
    });

    it("includes the SKILL.md path for x-research", () => {
      const hint = getSkillRoutingHint("x research on HYPE");
      expect(hint).toContain("skills/x-research/SKILL.md");
    });

    it("is case-insensitive for X Research", () => {
      const hint = getSkillRoutingHint("X RESEARCH on crypto trends");
      expect(hint).toContain("Echo");
    });
  });

  // ---------------------------------------------------------------------------
  // Trading Agent routing
  // ---------------------------------------------------------------------------
  describe("trading-agent routing", () => {
    it("routes 'trading agent' to Otaku", () => {
      const hint = getSkillRoutingHint("what's the trading agent EVClaw setup");
      expect(hint).toContain("Otaku");
      expect(hint).toContain("trading-agent");
    });

    it("routes 'evclaw' to Otaku", () => {
      const hint = getSkillRoutingHint("how do I set up evclaw on my VPS");
      expect(hint).toContain("Otaku");
    });

    it("routes 'hyperliquid live' to Otaku", () => {
      const hint = getSkillRoutingHint("hyperliquid live perps execution guide");
      expect(hint).toContain("Otaku");
    });

    it("routes 'live trading' to Otaku", () => {
      const hint = getSkillRoutingHint("how do I start live trading on Hyperliquid");
      expect(hint).toContain("Otaku");
    });

    it("routes 'perps execution' to Otaku", () => {
      const hint = getSkillRoutingHint("perps execution setup for Hyperliquid");
      expect(hint).toContain("Otaku");
    });

    it("routes 'execute trade' to Otaku", () => {
      const hint = getSkillRoutingHint("can you execute trade on my behalf");
      expect(hint).toContain("Otaku");
    });

    it("includes the SKILL.md path for trading-agent", () => {
      const hint = getSkillRoutingHint("trading agent setup for hyperliquid live");
      expect(hint).toContain("skills/trading-agent/SKILL.md");
    });
  });

  // ---------------------------------------------------------------------------
  // Skill Registry routing
  // ---------------------------------------------------------------------------
  describe("skill registry routing", () => {
    it("routes 'what skills are available' to Sentinel", () => {
      const hint = getSkillRoutingHint("what skills are available");
      expect(hint).toContain("Sentinel");
      expect(hint).toContain("registry.json");
    });

    it("routes 'available skills' to Sentinel", () => {
      const hint = getSkillRoutingHint("show me available skills");
      expect(hint).toContain("Sentinel");
    });

    it("routes 'skill registry' to Sentinel", () => {
      const hint = getSkillRoutingHint("show me the skill registry");
      expect(hint).toContain("Sentinel");
    });

    it("routes 'what skill' to Sentinel", () => {
      // "what skill" alone (without x-research context) should route to Sentinel
      const hint = getSkillRoutingHint("what skill should I use for this task?");
      expect(hint).toContain("Sentinel");
    });
  });

  // ---------------------------------------------------------------------------
  // No routing (null)
  // ---------------------------------------------------------------------------
  describe("no routing (returns null)", () => {
    it("returns null for unrelated messages", () => {
      expect(getSkillRoutingHint("what's the weather today")).toBeNull();
      expect(getSkillRoutingHint("summarize this article")).toBeNull();
      expect(getSkillRoutingHint("help me write a poem")).toBeNull();
    });

    it("returns null for empty message", () => {
      expect(getSkillRoutingHint("")).toBeNull();
    });

    it("returns null for generic trading questions (not live)", () => {
      expect(getSkillRoutingHint("how does paper trading work")).toBeNull();
    });

    it("returns null for generic research without X/Twitter context", () => {
      expect(getSkillRoutingHint("research BTC sentiment")).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Priority (first match wins)
  // ---------------------------------------------------------------------------
  describe("priority", () => {
    it("x-research takes priority over registry when both match", () => {
      const hint = getSkillRoutingHint("what skills for x research");
      // x-research is checked first, should route to Echo
      expect(hint).toContain("Echo");
    });
  });
});
