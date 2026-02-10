/**
 * Extensive tests for the Otaku agent (src/agents/otaku.ts).
 * Covers character shape, system prompt content, plugin composition, init, and exports.
 */

import { describe, it, expect } from "bun:test";
import {
  otakuCharacter,
  otakuAgent,
  character,
} from "../agents/otaku";
import type { Character, IAgentRuntime, Plugin } from "@elizaos/core";

describe("Otaku agent", () => {
  describe("exports", () => {
    it("exports otakuCharacter as Character", () => {
      expect(otakuCharacter).toBeDefined();
      expect(typeof otakuCharacter).toBe("object");
      expect(otakuCharacter).toHaveProperty("name", "Otaku");
    });

    it("exports otakuAgent as ProjectAgent with character, init, plugins", () => {
      expect(otakuAgent).toBeDefined();
      expect(otakuAgent).toHaveProperty("character");
      expect(otakuAgent).toHaveProperty("init");
      expect(otakuAgent).toHaveProperty("plugins");
      expect(otakuAgent.character).toBe(otakuCharacter);
      expect(typeof otakuAgent.init).toBe("function");
      expect(Array.isArray(otakuAgent.plugins)).toBe(true);
    });

    it("exports character as alias of otakuCharacter", () => {
      expect(character).toBe(otakuCharacter);
    });
  });

  describe("otakuCharacter shape (Character interface)", () => {
    it("has required Character fields", () => {
      expect(otakuCharacter.name).toBe("Otaku");
      expect(otakuCharacter).toHaveProperty("bio");
      expect(otakuCharacter).toHaveProperty("plugins");
      expect(otakuCharacter).toHaveProperty("system");
      expect(otakuCharacter).toHaveProperty("messageExamples");
      expect(otakuCharacter).toHaveProperty("settings");
      expect(otakuCharacter).toHaveProperty("topics");
      expect(otakuCharacter).toHaveProperty("style");
    });

    it("has Bankr knowledge directory for RAG", () => {
      expect(otakuCharacter).toHaveProperty("knowledge");
      const knowledge = otakuCharacter.knowledge as Array<{ directory?: string; path?: string }>;
      expect(Array.isArray(knowledge)).toBe(true);
      const bankrEntry = knowledge?.find((k) => k.directory === "bankr" || k.path?.includes("bankr"));
      expect(bankrEntry).toBeDefined();
    });

    it("has non-empty string system prompt", () => {
      expect(typeof otakuCharacter.system).toBe("string");
      expect(otakuCharacter.system!.length).toBeGreaterThan(100);
    });

    it("has bio as non-empty string array", () => {
      expect(Array.isArray(otakuCharacter.bio)).toBe(true);
      expect((otakuCharacter.bio as string[]).length).toBeGreaterThan(0);
      (otakuCharacter.bio as string[]).forEach((trait) => {
        expect(typeof trait).toBe("string");
        expect(trait.length).toBeGreaterThan(0);
      });
    });

    it("has topics as non-empty string array", () => {
      expect(Array.isArray(otakuCharacter.topics)).toBe(true);
      expect((otakuCharacter.topics as string[]).length).toBeGreaterThan(0);
    });

    it("has plugins as array (Discord conditional)", () => {
      expect(Array.isArray(otakuCharacter.plugins)).toBe(true);
      // With or without Discord, may be [] or ["@elizaos/plugin-discord"]
      (otakuCharacter.plugins as string[]).forEach((p) => {
        expect(typeof p).toBe("string");
        expect(p.length).toBeGreaterThan(0);
      });
    });

    it("has settings with secrets and mcp", () => {
      expect(otakuCharacter.settings).toBeDefined();
      expect(typeof otakuCharacter.settings).toBe("object");
      expect(otakuCharacter.settings).toHaveProperty("secrets");
      expect(otakuCharacter.settings).toHaveProperty("avatar", "/avatars/otaku.png");
      expect(otakuCharacter.settings).toHaveProperty("mcp");
      const mcp = (otakuCharacter.settings as Record<string, unknown>).mcp as Record<string, unknown>;
      expect(mcp).toHaveProperty("servers");
      expect((mcp.servers as Record<string, unknown>)["nansen-ai"]).toBeDefined();
    });

    it("has style.all and style.chat arrays", () => {
      expect(otakuCharacter.style).toBeDefined();
      expect(Array.isArray(otakuCharacter.style?.all)).toBe(true);
      expect(Array.isArray(otakuCharacter.style?.chat)).toBe(true);
      expect((otakuCharacter.style!.all as string[]).length).toBeGreaterThan(0);
      expect((otakuCharacter.style!.chat as string[]).length).toBeGreaterThan(0);
    });

    it("has messageExamples as array of conversation arrays", () => {
      expect(Array.isArray(otakuCharacter.messageExamples)).toBe(true);
      expect(otakuCharacter.messageExamples!.length).toBeGreaterThan(0);
      for (const conv of otakuCharacter.messageExamples as Array<Array<{ name: string; content: { text?: string } }>>) {
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
    const system = otakuCharacter.system!;

    it("identifies Otaku as DeFi analyst", () => {
      expect(system).toContain("Otaku");
      expect(system).toContain("DeFi");
      expect(system).toContain("ElizaOS");
    });

    it("includes wallet/onchain and transaction protocol", () => {
      expect(system).toMatch(/wallet|onchain|ONCHAIN/i);
      expect(system).toContain("Transaction Execution Protocol");
      expect(system).toContain("Questions = Guidance Only");
      expect(system).toContain("Direct Commands");
    });

    it("includes transfer confirmation requirements", () => {
      expect(system).toContain("MANDATORY CONFIRMATION");
      expect(system).toContain("confirm");
      expect(system).toContain("IRREVERSIBLE");
    });

    it("includes Bankr section (either enabled or not configured)", () => {
      const hasBankrEnabled = system.includes("BANKR_AGENT_PROMPT") && system.includes("Portfolio, balances");
      const hasBankrDisabled = system.includes("Bankr is not enabled") || system.includes("Do NOT use BANKR_AGENT_PROMPT");
      expect(hasBankrEnabled || hasBankrDisabled).toBe(true);
    });

    it("when Bankr enabled, mentions BANKR_USER_INFO and BANKR_ORDER_LIST and maker flow", () => {
      if (!system.includes("BANKR_ORDER_LIST") || !system.includes("BANKR_USER_INFO")) return;
      expect(system).toContain("BANKR_USER_INFO");
      expect(system).toContain("BANKR_ORDER_LIST");
      expect(system).toMatch(/maker|BANKR_ORDER_LIST|list my orders/i);
    });

    it("clarifies Nansen MCP tools are NOT actions", () => {
      expect(system).toContain("Nansen MCP tools");
      expect(system).toContain("NOT actions");
      expect(system).toContain("Do NOT put Nansen tool names");
      expect(system).toContain("<actions>");
      expect(system).toContain("REPLY");
      expect(system).toContain("token_discovery_screener");
      expect(system).toContain("token_flows");
    });

    it("includes Morpho and risk instructions", () => {
      expect(system).toContain("Morpho");
      expect(system).toMatch(/risk|APY|TVL|utilization/i);
    });

    it("includes ASK_AGENT and other-agent instructions", () => {
      expect(system).toContain("ASK_AGENT");
      expect(system).toContain("Vince");
      expect(system).toContain("Kelly");
      expect(system).toContain("Solus");
    });

    it("includes tool discipline and WEB_SEARCH", () => {
      expect(system).toContain("WEB_SEARCH");
      expect(system).toMatch(/tool|discipline|memory/i);
    });

    it("includes LP staking / AMM refusal", () => {
      expect(system).toMatch(/LP staking|liquidity provision|AMM/);
      expect(system).toContain("Decline");
    });
  });

  describe("messageExamples content", () => {
    const examples = otakuCharacter.messageExamples as Array<Array<{ name: string; content: { text?: string } }>>;

    it("includes at least one Otaku response per conversation", () => {
      for (const conv of examples) {
        const hasOtaku = conv.some((m) => m.name === "Otaku");
        expect(hasOtaku).toBe(true);
      }
    });

    it("covers CME gap, DeFi protocol risk, bridge/swap, transfer confirm, LP decline", () => {
      const allText = examples.flatMap((c) => c.map((m) => m.content?.text ?? "")).join(" ");
      expect(allText).toMatch(/CME|gap|search|WEB_SEARCH/i);
      expect(allText).toMatch(/APY|TVL|risk|reflexive/i);
      expect(allText).toMatch(/bridge|swap|ETH|USDC|Relay/i);
      expect(allText).toMatch(/confirm|transfer|IRREVERSIBLE/i);
      expect(allText).toMatch(/LP|liquidity|stake|pool|can't|cannot/i);
    });

    it("includes Bankr examples (portfolio and user info) when present", () => {
      const allText = examples.flatMap((c) => c.map((m) => m.content?.text ?? "")).join(" ");
      const hasPortfolioExample = allText.includes("Show my portfolio") || allText.includes("portfolio");
      const hasBankrAction = examples.some((conv) =>
        conv.some((m) => (m.content as { actions?: string[] })?.actions?.includes("BANKR_AGENT_PROMPT") || (m.content as { actions?: string[] })?.actions?.includes("BANKR_USER_INFO"))
      );
      expect(hasPortfolioExample || hasBankrAction).toBe(true);
    });
  });

  describe("style instructions", () => {
    const allStyle = (otakuCharacter.style?.all as string[]) ?? [];

    it("includes confirmation and transfer safety rules", () => {
      expect(allStyle.some((s) => /confirm|transfer|IRREVERSIBLE/.test(s))).toBe(true);
    });

    it("includes question vs command guidance", () => {
      expect(allStyle.some((s) => /question|guidance|execute|command/.test(s))).toBe(true);
    });

    it("includes Nansen and evidence-based phrasing", () => {
      expect(allStyle.some((s) => /Nansen|evidence|data/.test(s))).toBe(true);
    });
  });

  describe("otakuAgent.plugins (buildPlugins)", () => {
    const plugins = otakuAgent.plugins as Plugin[];

    it("returns an array of Plugin objects", () => {
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThanOrEqual(2);
      plugins.forEach((p) => {
        expect(p).toHaveProperty("name");
        expect(typeof (p as Plugin).name).toBe("string");
      });
    });

    it("always includes sql and bootstrap plugins", () => {
      const names = plugins.map((p) => (p as Plugin).name);
      const hasSql = names.some((n) => n?.includes("sql"));
      const hasBootstrap = names.includes("bootstrap");
      expect(hasSql).toBe(true);
      expect(hasBootstrap).toBe(true);
    });

    it("plugin order: sql first, bootstrap second", () => {
      const first = (plugins[0] as Plugin).name;
      const second = (plugins[1] as Plugin).name;
      expect(first?.includes("sql")).toBe(true);
      expect(second).toBe("bootstrap");
    });

    it("may include openrouter, openai, web-search, cdp, bankr when env is set", () => {
      const names = plugins.map((p) => (p as Plugin).name);
      // At least one model provider is typically present in dev
      const hasModel = names.some((n) => ["openrouter", "openai", "anthropic"].includes(n));
      const hasSearch = names.includes("web-search") || names.some((n) => n?.includes("search"));
      const hasCdp = names.includes("cdp");
      const hasBankr = names.includes("bankr");
      // We only assert structure: core plugins present; optional ones may or may not be
      expect(names.length).toBeGreaterThanOrEqual(2);
      expect(hasModel || hasSearch || hasCdp || hasBankr || names.length > 2).toBe(true);
    });
  });

  describe("init (initOtaku)", () => {
    it("is a function", () => {
      expect(typeof otakuAgent.init).toBe("function");
    });

    it("resolves without throwing when called with mock runtime", async () => {
      const mockRuntime = {
        agentId: "test-otaku-id",
        getService: () => null,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      } as unknown as IAgentRuntime;
      await expect(otakuAgent.init(mockRuntime)).resolves.toBeUndefined();
    });

    it("can be called multiple times without throwing", async () => {
      const mockRuntime = {
        agentId: "test-otaku-id-2",
        getService: () => null,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      } as unknown as IAgentRuntime;
      await otakuAgent.init(mockRuntime);
      await otakuAgent.init(mockRuntime);
    });
  });

  describe("settings.secrets conditional on env", () => {
    it("secrets is an object", () => {
      expect(otakuCharacter.settings?.secrets).toBeDefined();
      expect(typeof otakuCharacter.settings?.secrets).toBe("object");
    });

    it("when Bankr env is set, secrets may include BANKR_* keys", () => {
      const secrets = otakuCharacter.settings?.secrets as Record<string, unknown> | undefined;
      if (!secrets) return;
      const keys = Object.keys(secrets);
      // If BANKR_API_KEY was set at load time, we should see Bankr keys
      if (keys.some((k) => k.startsWith("BANKR_"))) {
        expect(secrets).toHaveProperty("BANKR_API_KEY");
      }
    });
  });

  describe("mcp configuration", () => {
    it("nansen-ai server has type stdio and command bunx", () => {
      const mcp = (otakuCharacter.settings as Record<string, unknown>).mcp as Record<string, unknown>;
      const servers = mcp?.servers as Record<string, Record<string, unknown>>;
      const nansen = servers?.["nansen-ai"];
      expect(nansen).toBeDefined();
      expect(nansen?.type).toBe("stdio");
      expect(nansen?.command).toBe("bunx");
      expect(Array.isArray(nansen?.args)).toBe(true);
      expect((nansen?.args as string[]).some((a) => a.includes("mcp.nansen.ai"))).toBe(true);
    });

    it("mcp has maxRetries", () => {
      const mcp = (otakuCharacter.settings as Record<string, unknown>).mcp as Record<string, unknown>;
      expect(mcp?.maxRetries).toBe(20);
    });
  });

  describe("regression: no Nansen tool names as actions", () => {
    it("system prompt tells model not to put Nansen tools in actions", () => {
      const system = otakuCharacter.system!;
      expect(system).toMatch(/Do NOT put Nansen tool names.*<actions>/);
      expect(system).toContain("only contain ElizaOS action names");
      expect(system).toContain("Available actions list");
    });
  });

  describe("regression: Bankr conditional copy", () => {
    it("system prompt either describes Bankr actions or says not configured", () => {
      const system = otakuCharacter.system!;
      const describesBankrActions = system.includes("BANKR_ORDER_QUOTE") || system.includes("limit/stop/DCA/TWAP");
      const saysNotConfigured = system.includes("Not configured") && system.includes("BANKR_API_KEY");
      expect(describesBankrActions || saysNotConfigured).toBe(true);
    });
  });
});
