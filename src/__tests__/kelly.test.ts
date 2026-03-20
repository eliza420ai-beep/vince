/**
 * Full-coverage tests for the Kelly agent (src/agents/kelly.ts).
 * Covers character shape, system prompt content, plugin composition, init, and exports.
 */

import { describe, it, expect } from "bun:test";
import {
  kellyCharacter,
  kellyAgent,
  default as kellyDefaultExport,
} from "../agents/kelly";
import type { Character, IAgentRuntime, Plugin } from "@elizaos/core";

function normalizeConversations(
  messageExamples: unknown,
): Array<
  Array<{ name: string; content: { text?: string; actions?: string[] } }>
> {
  const groups = Array.isArray(messageExamples) ? messageExamples : [];
  const conversations: Array<
    Array<{ name: string; content: { text?: string; actions?: string[] } }>
  > = [];

  for (const group of groups as any[]) {
    if (Array.isArray(group)) {
      conversations.push(group);
      continue;
    }
    const examples = group?.examples;
    if (!Array.isArray(examples)) continue;
    const first = examples[0];
    if (Array.isArray(first)) {
      conversations.push(...(examples as any));
    } else {
      conversations.push(examples as any);
    }
  }

  return conversations;
}

describe("Kelly agent", () => {
  describe("exports", () => {
    it("exports kellyCharacter as Character", () => {
      expect(kellyCharacter).toBeDefined();
      expect(typeof kellyCharacter).toBe("object");
      expect(kellyCharacter).toHaveProperty("name", "Kelly");
    });

    it("exports kellyAgent as ProjectAgent with character, init, plugins", () => {
      expect(kellyAgent).toBeDefined();
      expect(kellyAgent).toHaveProperty("character");
      expect(kellyAgent).toHaveProperty("init");
      expect(kellyAgent).toHaveProperty("plugins");
      expect(kellyAgent.character).toBe(kellyCharacter);
      expect(typeof kellyAgent.init).toBe("function");
      expect(Array.isArray(kellyAgent.plugins)).toBe(true);
    });

    it("default export is kellyCharacter", () => {
      expect(kellyDefaultExport).toBe(kellyCharacter);
    });
  });

  describe("kellyCharacter shape (Character interface)", () => {
    it("has required Character fields", () => {
      expect(kellyCharacter.name).toBe("Kelly");
      expect(kellyCharacter.username).toBe("kelly");
      expect(kellyCharacter).toHaveProperty("bio");
      expect(kellyCharacter).toHaveProperty("plugins");
      expect(kellyCharacter).toHaveProperty("system");
      expect(kellyCharacter).toHaveProperty("messageExamples");
      expect(kellyCharacter).toHaveProperty("settings");
      expect(kellyCharacter).toHaveProperty("topics");
      expect(kellyCharacter).toHaveProperty("style");
      expect(kellyCharacter).toHaveProperty("adjectives");
      expect(kellyCharacter).toHaveProperty("knowledge");
    });

    it("has adjectives array with expected traits", () => {
      const adj = kellyCharacter.adjectives as string[];
      expect(Array.isArray(adj)).toBe(true);
      expect(adj).toContain("discerning");
      expect(adj).toContain("warm");
      expect(adj).toContain("refined");
    });

    it("has knowledge with the-good-life, kelly-btc, teammate, and brand entries", () => {
      const knowledge = kellyCharacter.knowledge as Array<any>;
      expect(Array.isArray(knowledge)).toBe(true);
      const dirs = knowledge
        .map((k) => {
          const item = k?.item;
          if (item?.case === "directory") return item?.value?.directory ?? null;
          if (item?.case === "path") return String(item?.value ?? "");
          return null;
        })
        .filter(Boolean) as string[];

      expect(dirs).toContain("the-good-life");
      expect(dirs).toContain("kelly-btc");
      expect(dirs).toContain("teammate");
      expect(dirs.some((d) => d === "brand" || d.includes("BRANDING"))).toBe(
        true,
      );
    });

    it("has non-empty string system prompt", () => {
      expect(typeof kellyCharacter.system).toBe("string");
      expect(kellyCharacter.system!.length).toBeGreaterThan(500);
    });

    it("has bio as non-empty string array", () => {
      expect(Array.isArray(kellyCharacter.bio)).toBe(true);
      expect((kellyCharacter.bio as string[]).length).toBeGreaterThan(0);
      (kellyCharacter.bio as string[]).forEach((trait) => {
        expect(typeof trait).toBe("string");
        expect(trait.length).toBeGreaterThan(0);
      });
    });

    it("has topics as non-empty string array", () => {
      expect(Array.isArray(kellyCharacter.topics)).toBe(true);
      expect((kellyCharacter.topics as string[]).length).toBeGreaterThan(0);
      (kellyCharacter.topics as string[]).forEach((t) => {
        expect(typeof t).toBe("string");
        expect(t.length).toBeGreaterThan(0);
      });
    });

    it("has plugins as array (Discord conditional)", () => {
      expect(Array.isArray(kellyCharacter.plugins)).toBe(true);
      expect(kellyCharacter.plugins).toContain("@elizaos/plugin-sql");
      expect(kellyCharacter.plugins).toContain("@elizaos/plugin-bootstrap");
      expect(kellyCharacter.plugins).toContain("@elizaos/plugin-personality");
      expect(kellyCharacter.plugins).toContain("@elizaos/plugin-discovery");
      (kellyCharacter.plugins as string[]).forEach((p) => {
        expect(typeof p).toBe("string");
        expect(p.length).toBeGreaterThan(0);
      });
    });

    it("has settings with secrets, discord, model, embeddingModel, ragKnowledge", () => {
      expect(kellyCharacter.settings).toBeDefined();
      expect(typeof kellyCharacter.settings).toBe("object");
      expect(kellyCharacter.settings).toHaveProperty("secrets");
      expect(kellyCharacter.settings).toHaveProperty("discord");
      expect(
        (kellyCharacter.settings as Record<string, unknown>).discord,
      ).toEqual({
        shouldIgnoreBotMessages: false,
      });
      expect(kellyCharacter.settings).toHaveProperty("model");
      expect(kellyCharacter.settings).toHaveProperty("embeddingModel");
      expect(
        (kellyCharacter.settings as Record<string, unknown>).ragKnowledge,
      ).toBe(true);
    });

    it("has style.all, style.chat, style.post arrays", () => {
      expect(kellyCharacter.style).toBeDefined();
      expect(Array.isArray(kellyCharacter.style?.all)).toBe(true);
      expect(Array.isArray(kellyCharacter.style?.chat)).toBe(true);
      expect(Array.isArray(kellyCharacter.style?.post)).toBe(true);
      expect((kellyCharacter.style!.all as string[]).length).toBeGreaterThan(0);
      expect((kellyCharacter.style!.chat as string[]).length).toBeGreaterThan(
        0,
      );
    });

    it("has messageExamples as array of conversation arrays", () => {
      const conversations = normalizeConversations(
        kellyCharacter.messageExamples,
      );
      expect(conversations.length).toBeGreaterThan(0);
      for (const conv of conversations) {
        expect(Array.isArray(conv)).toBe(true);
        expect(conv.length).toBeGreaterThan(0);
        for (const msg of conv) {
          expect(msg).toHaveProperty("name");
          expect(msg).toHaveProperty("content");
          expect(typeof msg.content).toBe("object");
          expect(msg.content).toHaveProperty("text");
        }
      }
    });
  });

  describe("system prompt content", () => {
    const system = kellyCharacter.system!;

    it("identifies Kelly as concierge and lifestyle agent", () => {
      expect(system).toContain("Kelly");
      expect(system).toMatch(/concierge|lifestyle/i);
      expect(system).toMatch(/five-star|hotels|fine dining|wine|wellness/i);
    });

    it("includes LIVETHELIFETV branding", () => {
      expect(system).toContain("LIVETHELIFETV");
      expect(system).toMatch(/IKIGAI|BRANDING|CLAWTERM/i);
    });

    it("includes ONE TEAM ONE DREAM and ASK_AGENT lanes (Vince, Solus, Eliza, Otaku)", () => {
      expect(system).toContain("ONE TEAM, ONE DREAM");
      expect(system).toContain("ASK_AGENT");
      expect(system).toContain("Vince");
      expect(system).toContain("Solus");
      expect(system).toContain("Eliza");
      expect(system).toContain("Otaku");
      expect(system).toMatch(/report back|primary interface/i);
    });

    it("includes default region (Landes, 2h, lunch default)", () => {
      expect(system).toMatch(/Landes|Bordeaux|Biarritz/i);
      expect(system).toMatch(/2h|within 2h|lunch/i);
      expect(system).toMatch(/restaurant.*lunch|dinner.*home/i);
    });

    it("includes allowlist and never-invent rule", () => {
      expect(system).toMatch(/allowlist|the-good-life/i);
      expect(system).toMatch(/Never invent|do not invent|only.*knowledge/i);
      expect(system).toMatch(/MICHELIN Guide|James Edition/i);
    });

    it("includes voice principles (benefit-led, no AI-slop)", () => {
      expect(system).toMatch(/Benefit-led|benefit-led|Apple-style/i);
      expect(system).toMatch(/NO-AI-SLOP|no AI-slop|Zero AI-slop/i);
      expect(system).toMatch(/concrete|human language/i);
    });

    it("lists KELLY_* actions", () => {
      expect(system).toContain("KELLY_DAILY_BRIEFING");
      expect(system).toContain("KELLY_RECOMMEND_PLACE");
      expect(system).toContain("KELLY_RECOMMEND_WINE");
      expect(system).toContain("KELLY_RECOMMEND_EXPERIENCE");
      expect(system).toContain("KELLY_SURF_FORECAST");
      expect(system).toContain("KELLY_ITINERARY");
      expect(system).toContain("KELLY_RECOMMEND_WORKOUT");
      expect(system).toContain("KELLY_WEEK_AHEAD");
      expect(system).toContain("KELLY_SWIMMING_TIPS");
      expect(system).toContain("KELLY_RECOMMEND_HOME_COOKING");
      expect(system).toContain("KELLY_RECOMMEND_TEA");
      expect(system).toContain("KELLY_RECOMMEND_ENTERTAINMENT");
      expect(system).toContain("KELLY_RECOMMEND_CREATIVE");
      expect(system).toContain("KELLY_RECOMMEND_ROWING");
      expect(system).toContain("KELLY_INTERESTING_QUESTION");
    });

    it("states no trading/market advice and touch grass", () => {
      expect(system).toMatch(
        /never give trading|no trading|do not give.*market/i,
      );
      expect(system).toMatch(/touch grass|rebalance|close the laptop/i);
    });

    it("includes surf/ocean voice and winter pool rules", () => {
      expect(system).toMatch(/surf|Biarritz|wave|pool/i);
      expect(system).toMatch(/winter|Palais|Caudalie|reopen|Feb/i);
    });
  });

  describe("messageExamples content", () => {
    const examples = normalizeConversations(kellyCharacter.messageExamples);

    it("includes at least one Kelly response per conversation", () => {
      for (const conv of examples) {
        const hasKelly = conv.some((m) => m.name === "Kelly");
        expect(hasKelly).toBe(true);
      }
    });

    it("covers hotel, restaurant, wine, daily briefing, tea, ASK_AGENT, touch grass", () => {
      const allText = examples
        .flatMap((c) => c.map((m) => m.content?.text ?? ""))
        .join(" ");
      expect(allText).toMatch(
        /hotel|Biarritz|Palais|restaurant|dinner|romantic/i,
      );
      expect(allText).toMatch(/wine|Champagne|Bordeaux|Margaux|pairing/i);
      expect(allText).toMatch(/daily|briefing|today|KELLY_DAILY_BRIEFING/i);
      expect(allText).toMatch(/tea|Dammann|morning|evening/i);
      expect(allText).toMatch(
        /Vince says|Solus says|Eliza says|Otaku says|ASK_AGENT/i,
      );
      expect(allText).toMatch(/touch grass|rebalance|grinding|unplug/i);
    });

    it("some examples include actions array (KELLY_* or ASK_AGENT)", () => {
      const withActions = examples.filter((conv) =>
        conv.some((m) => (m.content?.actions?.length ?? 0) > 0),
      );
      expect(withActions.length).toBeGreaterThan(0);
      const actionNames = withActions.flatMap((conv) =>
        conv.flatMap((m) => m.content?.actions ?? []),
      );
      expect(
        actionNames.some((a) => a.startsWith("KELLY_") || a === "ASK_AGENT"),
      ).toBe(true);
    });
  });

  describe("style instructions", () => {
    const allStyle = (kellyCharacter.style?.all as string[]) ?? [];

    it("includes no AI-slop / NO-AI-SLOP reference", () => {
      expect(
        allStyle.some((s) =>
          /NO-AI-SLOP|no AI-slop|delve|leverage|utilize/.test(s),
        ),
      ).toBe(true);
    });

    it("includes recommendation and allowlist discipline", () => {
      expect(
        allStyle.some((s) =>
          /never invent|allowlist|knowledge|MICHELIN|James Edition/.test(s),
        ),
      ).toBe(true);
    });

    it("includes feedback / learn from what worked", () => {
      expect(
        allStyle.some((s) =>
          /feedback|loved|didn't|adjust|alternative/.test(s),
        ),
      ).toBe(true);
    });
  });

  describe("kellyAgent.plugins (buildPlugins)", () => {
    const plugins = kellyAgent.plugins as (Plugin | string)[];

    it("returns an array of Plugin objects or plugin name strings", () => {
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThanOrEqual(4);
      plugins.forEach((p) => {
        if (typeof p === "string") {
          expect(p.length).toBeGreaterThan(0);
        } else {
          expect(p).toHaveProperty("name");
          expect(typeof (p as Plugin).name).toBe("string");
        }
      });
    });

    it("always includes sql, bootstrap, personality, plugin-kelly, discovery, inter-agent", () => {
      const names = plugins.map((p) =>
        typeof p === "string" ? p : (p as Plugin).name,
      );
      expect(names.some((n) => n?.includes("sql"))).toBe(true);
      expect(names).toContain("bootstrap");
      expect(names.some((n) => n?.includes("personality"))).toBe(true);
      expect(names.some((n) => n?.includes("plugin-kelly"))).toBe(true);
      expect(names.some((n) => n?.includes("discovery"))).toBe(true);
      expect(
        names.some(
          (n) => n?.includes("inter-agent") || n?.includes("interAgent"),
        ),
      ).toBe(true);
    });

    it("plugin order: sql first, bootstrap second", () => {
      const first = (plugins[0] as Plugin).name;
      const second = (plugins[1] as Plugin).name;
      expect(first?.includes("sql")).toBe(true);
      expect(second).toBe("bootstrap");
    });

    it("may include anthropic, openai, web-search, discord when env is set", () => {
      const names = plugins.map((p) => (p as Plugin).name);
      const hasAnthropic = names.includes("anthropic");
      const hasOpenai = names.includes("openai");
      const hasWebSearch =
        names.includes("web-search") ||
        names.some((n) => n?.includes("search"));
      const hasDiscord = names.some((n) => n?.includes("discord"));
      expect(names.length).toBeGreaterThanOrEqual(4);
      expect(
        hasAnthropic ||
          hasOpenai ||
          hasWebSearch ||
          hasDiscord ||
          names.length >= 6,
      ).toBe(true);
    });
  });

  describe("init (initKelly)", () => {
    it("is a function", () => {
      expect(typeof kellyAgent.init).toBe("function");
    });

    it("resolves without throwing when called with mock runtime", async () => {
      const mockRuntime = {
        agentId: "test-kelly-id",
        getService: () => null,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      } as unknown as IAgentRuntime;
      await expect(kellyAgent.init(mockRuntime)).resolves.toBeUndefined();
    });

    it("can be called multiple times without throwing", async () => {
      const mockRuntime = {
        agentId: "test-kelly-id-2",
        getService: () => null,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      } as unknown as IAgentRuntime;
      await kellyAgent.init(mockRuntime);
      await kellyAgent.init(mockRuntime);
    });
  });

  describe("settings.secrets conditional on env", () => {
    it("secrets is an object", () => {
      expect(kellyCharacter.settings?.secrets).toBeDefined();
      expect(typeof kellyCharacter.settings?.secrets).toBe("object");
    });

    it("when Discord env is set, secrets may include DISCORD_* keys", () => {
      const secrets = kellyCharacter.settings?.secrets as
        | Record<string, unknown>
        | undefined;
      if (!secrets) return;
      const keys = Object.keys(secrets);
      if (keys.some((k) => k.startsWith("DISCORD_"))) {
        expect(
          keys.some(
            (k) => k === "DISCORD_APPLICATION_ID" || k === "DISCORD_API_TOKEN",
          ),
        ).toBe(true);
      }
    });
  });

  describe("regression: ASK_AGENT reporting pattern", () => {
    it("system prompt tells Kelly to use ASK_AGENT and report back", () => {
      const system = kellyCharacter.system!;
      expect(system).toContain("ASK_AGENT");
      expect(system).toMatch(/report back|report their answer/i);
    });

    it("system prompt instructs never to tell user to go ask another agent themselves", () => {
      const system = kellyCharacter.system!;
      expect(system).toMatch(
        /Never say.*go ask|do not tell the user to go ask/i,
      );
    });
  });

  describe("regression: no trading advice", () => {
    it("system prompt states Kelly never gives trading or market advice", () => {
      const system = kellyCharacter.system!;
      expect(system).toMatch(
        /never give trading|no trading|do not give.*market/i,
      );
      expect(system).toMatch(/pull in the team|report back/i);
    });
  });

  describe("topics coverage", () => {
    it("includes lifestyle and recommendation topics", () => {
      const topics = kellyCharacter.topics as string[];
      expect(topics).toContain("five-star hotels");
      expect(topics).toContain("fine dining");
      expect(topics).toContain("MICHELIN Guide");
      expect(topics).toContain("fine wine");
      expect(topics).toContain("wellness");
      expect(topics).toContain("touch grass");
      expect(topics).toContain("road trips");
    });
  });
});
