/**
 * News Sentiment Service: phrase overrides and keyword classification.
 * Ensures "erases gains" / "gains wiped" etc. are bearish and record/outflows are correct.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { VinceNewsSentimentService } from "../services/newsSentiment.service";
import { createMockRuntime } from "./test-utils";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("VinceNewsSentimentService", () => {
  let service: VinceNewsSentimentService;
  let runtime: ReturnType<typeof createMockRuntime>;
  let testSharedDir: string;
  let testSharedPath: string;

  beforeEach(() => {
    testSharedDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "mando-test-shared-"),
    );
    testSharedPath = path.join(testSharedDir, "mando_minutes_latest_v9.json");
    process.env.MANDO_SHARED_CACHE_PATH = testSharedPath;
    runtime = createMockRuntime();
    service = new VinceNewsSentimentService(runtime);
  });

  afterEach(() => {
    delete process.env.MANDO_SHARED_CACHE_PATH;
    if (testSharedDir)
      fs.rmSync(testSharedDir, { recursive: true, force: true });
  });

  describe("getSentimentForHeadline", () => {
    it("classifies NEGATIVE_GAINS_PHRASES as bearish (e.g. erases gains)", () => {
      expect(
        service.getSentimentForHeadline("BTC erases gains after Fed comments"),
      ).toBe("bearish");
      expect(
        service.getSentimentForHeadline("Bitcoin gives up gains in sell-off"),
      ).toBe("bearish");
      expect(
        service.getSentimentForHeadline(
          "Ethereum wipes out gains as market retreats",
        ),
      ).toBe("bearish");
      expect(
        service.getSentimentForHeadline("SOL reversed gains amid volatility"),
      ).toBe("bearish");
    });

    it("classifies 'BTC erases gains since Trump's election win' as bearish (not bullish)", () => {
      // Regression: "erases gains" + "gains"/"win" must not override; NEGATIVE_GAINS wins
      expect(
        service.getSentimentForHeadline(
          "BTC erases gains since Trump's election win",
        ),
      ).toBe("bearish");
      expect(
        service.getSentimentForHeadline(
          "BTC erases gains since Trump\u2019s election win",
        ),
      ).toBe("bearish");
    });

    it("does not classify positive 'gains' headlines as bearish when no loss phrase", () => {
      expect(
        service.getSentimentForHeadline("BTC posts gains on ETF inflows"),
      ).toBe("bullish");
      expect(service.getSentimentForHeadline("Crypto gains momentum")).toBe(
        "bullish",
      );
    });

    it("classifies record outflows as bearish (not bullish 'record')", () => {
      expect(
        service.getSentimentForHeadline("Record outflows from Bitcoin ETF"),
      ).toBe("bearish");
    });

    it("classifies signed ETF flow lines as bearish when net negative", () => {
      expect(
        service.getSentimentForHeadline("BTC ETFs: -$206m | ETH ETFs: -$50m"),
      ).toBe("bearish");
    });

    it("classifies signed ETF flow lines as bullish when net positive", () => {
      expect(
        service.getSentimentForHeadline("BTC ETFs: +$206m | ETH ETFs: +$50m"),
      ).toBe("bullish");
    });

    it("classifies record high / record inflow as bullish", () => {
      expect(service.getSentimentForHeadline("BTC hits record high")).toBe(
        "bullish",
      );
      expect(
        service.getSentimentForHeadline("Record inflow into spot ETFs"),
      ).toBe("bullish");
    });

    it("classifies bearish price action keywords", () => {
      expect(service.getSentimentForHeadline("Bitcoin slides below $60k")).toBe(
        "bearish",
      );
      expect(service.getSentimentForHeadline("ETH fell 5% in 24h")).toBe(
        "bearish",
      );
      expect(service.getSentimentForHeadline("Market sell off continues")).toBe(
        "bearish",
      );
    });

    it("classifies bullish headlines", () => {
      expect(service.getSentimentForHeadline("BTC soars to new ATH")).toBe(
        "bullish",
      );
      expect(
        service.getSentimentForHeadline(
          "ETF approval boosts institutional adoption",
        ),
      ).toBe("bullish");
    });

    it("returns neutral for unrelated headlines", () => {
      expect(service.getSentimentForHeadline("The meeting is at 3pm")).toBe(
        "neutral",
      );
    });

    it("classifies expanded NEGATIVE_GAINS_PHRASES as bearish", () => {
      expect(
        service.getSentimentForHeadline(
          "Crypto continues to slide on macro concerns",
        ),
      ).toBe("bearish");
      expect(
        service.getSentimentForHeadline("BTC touches $72k as fear mounts"),
      ).toBe("bearish");
      expect(service.getSentimentForHeadline("ETF outflow hits $272m")).toBe(
        "bearish",
      );
      expect(
        service.getSentimentForHeadline(
          "US probes exchanges over Iran sanctions evasion",
        ),
      ).toBe("bearish");
    });
  });

  describe("getTradingSentiment", () => {
    it("returns neutral when no news cache", () => {
      const result = service.getTradingSentiment("BTC");
      expect(result.sentiment).toBe("neutral");
      expect(result.confidence).toBe(0);
      expect(result.hasHighRiskEvent).toBe(false);
    });

    it("uses per-asset sentiment on mixed headlines", async () => {
      const now = Date.now();
      (service as any).newsCache = [
        {
          title: "BTC weakens while ETH rallies after ETF updates",
          source: "MandoMinutes",
          sentiment: "neutral",
          perAssetSentiment: { BTC: "bearish", ETH: "bullish" },
          impact: "medium",
          assets: ["BTC", "ETH"],
          category: "crypto",
          timestamp: now,
        },
      ];

      const btc = service.getTradingSentiment("BTC");
      const eth = service.getTradingSentiment("ETH");
      expect(btc.sentiment).toBe("bearish");
      expect(eth.sentiment).toBe("bullish");
    });

    it("scopes risk events to relevant asset", () => {
      const now = Date.now();
      (service as any).riskEvents = [
        {
          type: "security",
          description: "ETH bridge exploit drains funds",
          severity: "critical",
          assets: ["ETH"],
          timestamp: now,
        },
      ];
      const btc = service.getTradingSentiment("BTC");
      const eth = service.getTradingSentiment("ETH");
      expect(btc.hasHighRiskEvent).toBe(false);
      expect(eth.hasHighRiskEvent).toBe(true);
    });

    it("keeps HIP-3 assets neutral when only macro/global context exists", () => {
      const now = Date.now();
      (service as any).newsCache = [
        {
          title: "Fed signals tariff concerns, BTC under pressure",
          source: "MandoMinutes",
          sentiment: "bearish",
          impact: "medium",
          assets: ["BTC"],
          category: "macro",
          timestamp: now,
        },
      ];
      const hip3 = service.getTradingSentiment("AAPL");
      expect(hip3.sentiment).toBe("neutral");
      expect(hip3.confidence).toBeLessThanOrEqual(30);
    });
  });

  describe("getVibeCheck", () => {
    it("returns fallback when no news cache", () => {
      expect(service.getVibeCheck()).toBe("No news data yet.");
    });
  });

  describe("getTLDR", () => {
    it("does not return bullish catalyst when sentiment mix is conflicted", () => {
      const now = Date.now();
      (service as any).newsCache = [
        // Institutional context exists...
        {
          title: "Institutional desk adds BTC exposure",
          source: "MandoMinutes",
          sentiment: "bullish",
          impact: "medium",
          assets: ["BTC"],
          category: "crypto",
          timestamp: now,
        },
        // ...but directional signal is mixed.
        {
          title: "ETF flows turn negative into close",
          source: "MandoMinutes",
          sentiment: "bearish",
          impact: "medium",
          assets: ["BTC", "ETH"],
          category: "crypto",
          timestamp: now,
        },
        {
          title: "Risk appetite improves on macro relief",
          source: "MandoMinutes",
          sentiment: "bullish",
          impact: "medium",
          assets: ["BTC"],
          category: "macro",
          timestamp: now,
        },
        {
          title: "Funding flips and leverage gets flushed",
          source: "MandoMinutes",
          sentiment: "bearish",
          impact: "medium",
          assets: ["BTC"],
          category: "crypto",
          timestamp: now,
        },
      ];
      const tldr = service.getTLDR();
      expect(tldr).not.toContain("BULLISH CATALYST");
      expect(tldr).toContain("MIXED");
    });
  });

  describe("parseMandoMinutesContent (nav/footer filter)", () => {
    it("does not add site nav line 'MinutesAffiliatePodcastsFollow on' as a headline", () => {
      const content = [
        "Latest",
        "MandoMinutes",
        "Crypto",
        "MinutesAffiliatePodcastsFollow on",
      ].join("\n");
      const articles = (service as any).parseMandoMinutesContent(content);
      const hasNavLine = articles.some(
        (a: { title: string }) =>
          a.title.includes("MinutesAffiliate") ||
          a.title.includes("PodcastsFollow"),
      );
      expect(hasNavLine).toBe(false);
      expect(articles.length).toBe(0);
    });

    it("keeps compact but valid market lines like Hot coins", () => {
      const content = [
        "Left Curve Corner",
        "Hot coins: SKR",
        "Hot NFTs: Mooncats, Digidaigaku",
      ].join("\n");
      const articles = (service as any).parseMandoMinutesContent(content);
      const titles = articles.map((a: { title: string }) => a.title);
      expect(titles).toContain("Hot coins: SKR");
      expect(titles).toContain("Hot NFTs: Mooncats, Digidaigaku");
    });
  });

  describe("hybrid-safe Mando payload quality gate", () => {
    it("rejects nav-only payloads", () => {
      const payload = {
        timestamp: Date.now(),
        articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
      };
      expect((service as any).isValidMandoPayload(payload)).toBe(false);
    });

    it("accepts healthy payloads with many substantive headlines", () => {
      const payload = {
        timestamp: Date.now(),
        articles: Array.from({ length: 12 }).map((_, i) => ({
          title: `Macro update ${i}: This is a substantive Mando headline with enough detail`,
        })),
      };
      expect((service as any).isValidMandoPayload(payload)).toBe(true);
    });

    it("rejects synthetic test-headline payloads", () => {
      const payload = {
        timestamp: Date.now(),
        articles: Array.from({ length: 12 }).map((_, i) => ({
          title: `Runtime headline ${i + 1} with enough detail for validation`,
        })),
      };
      expect((service as any).isValidMandoPayload(payload)).toBe(false);
    });

    it("rejects payloads dominated by CSS/style noise lines", () => {
      const payload = {
        timestamp: Date.now(),
        articles: [
          { title: "--wt-primary-color: #dd3344;" },
          {
            title:
              ".bg-wt-primary { background-color: var(--wt-primary-color); }",
          },
          { title: "@font-face { font-family: 'Roboto'; }" },
          {
            title:
              "src: url('https://fonts.gstatic.com/s/roboto/v29/foo.woff2')",
          },
          { title: "line-height: 1.25rem;" },
          { title: "Crypto sell off intensifies, extreme fear continues" },
          { title: "Strategy buys $40m BTC, BMNR buys 51k ETH" },
        ],
      };
      expect((service as any).isValidMandoPayload(payload)).toBe(false);
    });

    it("keeps existing in-memory cache when invalid source data is all that is available", async () => {
      const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "mando-no-last-good-"),
      );
      const sharedPath = path.join(tmpDir, "mando_minutes_latest_v9.json");
      fs.writeFileSync(
        sharedPath,
        JSON.stringify({
          timestamp: Date.now(),
          articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
        }),
        "utf-8",
      );
      process.env.MANDO_SHARED_CACHE_PATH = sharedPath;

      const existingTitle =
        "Bitcoin ETF inflows continue as institutions accumulate";
      (service as any).newsCache = [
        {
          title: existingTitle,
          source: "MandoMinutes",
          sentiment: "bullish",
          impact: "medium",
          assets: ["BTC"],
          category: "crypto",
          timestamp: Date.now() - 5_000,
        },
      ];

      const invalidPayload = {
        timestamp: Date.now(),
        articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
      };
      (runtime as any).getCache = async (cacheKey: string) =>
        cacheKey === "mando_minutes:latest:v9" ? invalidPayload : null;
      (service as any).fetchDirectFromBrowser = async () => null;

      try {
        await (service as any).fetchFromMandoMinutes(false);
        expect((service as any).newsCache).toHaveLength(1);
        expect((service as any).newsCache[0].title).toBe(existingTitle);
      } finally {
        delete process.env.MANDO_SHARED_CACHE_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("loads valid shared-file cache when runtime cache is invalid", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mando-shared-"));
      const sharedPath = path.join(tmpDir, "mando_minutes_latest_v9.json");
      const sharedPayload = {
        timestamp: Date.now(),
        articles: Array.from({ length: 12 }).map((_, i) => ({
          title: `Macro desk update ${i + 1}: institutions rebalance risk into quality assets`,
          categories: ["crypto"],
        })),
      };
      fs.writeFileSync(sharedPath, JSON.stringify(sharedPayload), "utf-8");
      process.env.MANDO_SHARED_CACHE_PATH = sharedPath;

      try {
        const invalidPayload = {
          timestamp: Date.now(),
          articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
        };
        (runtime as any).getCache = async (cacheKey: string) =>
          cacheKey === "mando_minutes:latest:v9" ||
          cacheKey === "mando_minutes:latest"
            ? invalidPayload
            : null;
        (service as any).fetchDirectFromBrowser = async () => null;

        await (service as any).fetchFromMandoMinutes(false);

        expect((service as any).newsCache.length).toBe(12);
        expect((service as any).newsCache[0].title).toContain(
          "Macro desk update 1",
        );
      } finally {
        delete process.env.MANDO_SHARED_CACHE_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("prefers valid runtime cache and does not call direct fetch", async () => {
      const runtimePayload = {
        timestamp: Date.now(),
        articles: Array.from({ length: 12 }).map((_, i) => ({
          title: `BTC market brief ${i + 1}: volatility compresses as funding normalizes`,
          categories: ["crypto"],
        })),
      };
      (runtime as any).getCache = async (cacheKey: string) =>
        cacheKey === "mando_minutes:latest:v9" ? runtimePayload : null;

      let directCalls = 0;
      (service as any).fetchDirectFromBrowser = async () => {
        directCalls += 1;
        return null;
      };

      await (service as any).fetchFromMandoMinutes(false);

      expect(directCalls).toBe(0);
      expect((service as any).newsCache.length).toBe(12);
      expect((service as any).newsCache[0].title).toContain(
        "BTC market brief 1",
      );
    });

    it("restores last-known-good shared snapshot when current caches are invalid", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mando-last-good-"));
      const sharedPath = path.join(tmpDir, "mando_minutes_latest_v9.json");
      const lastGoodPath = path.join(
        tmpDir,
        "mando_minutes_latest_v9_last_good.json",
      );
      fs.writeFileSync(
        sharedPath,
        JSON.stringify({
          timestamp: Date.now(),
          articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
        }),
        "utf-8",
      );
      fs.writeFileSync(
        lastGoodPath,
        JSON.stringify({
          timestamp: Date.now() - 60_000,
          articles: Array.from({ length: 12 }).map((_, i) => ({
            title: `Last good headline ${i + 1} with substantive context`,
            categories: ["crypto"],
          })),
        }),
        "utf-8",
      );
      process.env.MANDO_SHARED_CACHE_PATH = sharedPath;

      try {
        (runtime as any).getCache = async () => ({
          timestamp: Date.now(),
          articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
        });
        (service as any).fetchDirectFromBrowser = async () => null;

        await (service as any).fetchFromMandoMinutes(false);

        expect((service as any).newsCache).toHaveLength(12);
        expect((service as any).newsCache[0].title).toContain(
          "Last good headline 1",
        );
      } finally {
        delete process.env.MANDO_SHARED_CACHE_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("uses Mando API fallback when direct browser fetch fails", async () => {
      (runtime as any).getCache = async () => null;
      (service as any).fetchDirectFromBrowser = async () => null;

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        ({
          ok: true,
          json: async () => ({
            content: {
              free: {
                rss: `Crypto
Crypto sell off intensifies, extreme fear continues
ZachXBT to expose major firm's insider trading
Strategy buys $40m BTC, BMNR buys 51k ETH
USD1 short and social media attack failed: WLFI
Terraform accuses Jane Street of insider trading
Cryptocom gets OCC approval for bank charter

Macro & General
Tech stocks sell-off after Citrini report on AI risks
Nvidia plans new chip for PCs in 1H26
Trump to add more tariffs if countries play games
EU set to freeze US trade deal approval
FedEx sues US government for full tariff refund

Left Curve Corner
Hot NFTs: Mooncats, Digidaigaku
Backpack to offer 20% equity via token staking`,
              },
            },
          }),
        }) as Response) as typeof fetch;

      try {
        await (service as any).fetchFromMandoMinutes(false);
        expect((service as any).newsCache.length).toBeGreaterThan(0);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("startup shared-cache self-heal", () => {
    it("repairs shared cache from last-known-good snapshot on start", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mando-repair-"));
      const sharedPath = path.join(tmpDir, "mando_minutes_latest_v9.json");
      const lastGoodPath = path.join(
        tmpDir,
        "mando_minutes_latest_v9_last_good.json",
      );

      fs.writeFileSync(
        sharedPath,
        JSON.stringify({
          timestamp: Date.now(),
          articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
        }),
        "utf-8",
      );
      fs.writeFileSync(
        lastGoodPath,
        JSON.stringify({
          timestamp: Date.now() - 30_000,
          articles: Array.from({ length: 12 }).map((_, i) => ({
            title: `Recovered market headline ${i + 1}: cross-asset positioning remains defensive`,
            categories: ["crypto"],
          })),
        }),
        "utf-8",
      );
      process.env.MANDO_SHARED_CACHE_PATH = sharedPath;

      try {
        const repairedRuntime = createMockRuntime();
        let runtimeCacheWrite: unknown = null;
        (repairedRuntime as any).setCache = async (
          key: string,
          value: unknown,
        ) => {
          if (key === "mando_minutes:latest:v9") runtimeCacheWrite = value;
          return true;
        };
        (repairedRuntime as any).getCache = async () => null;

        const started = await VinceNewsSentimentService.start(
          repairedRuntime as any,
        );
        const repairedRaw = fs.readFileSync(sharedPath, "utf-8");
        const repairedJson = JSON.parse(repairedRaw) as {
          articles: Array<{ title: string }>;
        };

        expect(repairedJson.articles.length).toBe(12);
        expect(repairedJson.articles[0].title).toContain(
          "Recovered market headline 1",
        );
        expect(runtimeCacheWrite).toBeTruthy();
        await started.stop();
      } finally {
        delete process.env.MANDO_SHARED_CACHE_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("does not repair shared cache from synthetic last-good snapshot", async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mando-no-repair-"));
      const sharedPath = path.join(tmpDir, "mando_minutes_latest_v9.json");
      const lastGoodPath = path.join(
        tmpDir,
        "mando_minutes_latest_v9_last_good.json",
      );

      const navOnly = {
        timestamp: Date.now(),
        articles: [{ title: "MinutesAffiliatePodcastsFollow on" }],
      };
      fs.writeFileSync(sharedPath, JSON.stringify(navOnly), "utf-8");
      fs.writeFileSync(
        lastGoodPath,
        JSON.stringify({
          timestamp: Date.now() - 20_000,
          articles: Array.from({ length: 12 }).map((_, i) => ({
            title: `Runtime headline ${i + 1} with enough detail for validation`,
            categories: ["crypto"],
          })),
        }),
        "utf-8",
      );
      process.env.MANDO_SHARED_CACHE_PATH = sharedPath;

      try {
        const repairedRuntime = createMockRuntime();
        (repairedRuntime as any).setCache = async () => true;
        (repairedRuntime as any).getCache = async () => null;
        (VinceNewsSentimentService.prototype as any).fetchDirectFromBrowser =
          async () => null;

        const started = await VinceNewsSentimentService.start(
          repairedRuntime as any,
        );
        const afterRaw = fs.readFileSync(sharedPath, "utf-8");
        const afterJson = JSON.parse(afterRaw) as {
          articles: Array<{ title: string }>;
        };
        expect(afterJson.articles).toHaveLength(1);
        expect(afterJson.articles[0].title).toBe(
          "MinutesAffiliatePodcastsFollow on",
        );
        await started.stop();
      } finally {
        delete process.env.MANDO_SHARED_CACHE_PATH;
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
