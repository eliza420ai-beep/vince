/**
 * News Sentiment Service: phrase overrides and keyword classification.
 * Ensures "erases gains" / "gains wiped" etc. are bearish and record/outflows are correct.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { VinceNewsSentimentService } from "../services/newsSentiment.service";
import { createMockRuntime } from "./test-utils";

describe("VinceNewsSentimentService", () => {
  let service: VinceNewsSentimentService;
  let runtime: ReturnType<typeof createMockRuntime>;

  beforeEach(() => {
    runtime = createMockRuntime();
    service = new VinceNewsSentimentService(runtime);
  });

  describe("getSentimentForHeadline", () => {
    it("classifies NEGATIVE_GAINS_PHRASES as bearish (e.g. erases gains)", () => {
      expect(service.getSentimentForHeadline("BTC erases gains after Fed comments")).toBe("bearish");
      expect(service.getSentimentForHeadline("Bitcoin gives up gains in sell-off")).toBe("bearish");
      expect(service.getSentimentForHeadline("Ethereum wipes out gains as market retreats")).toBe("bearish");
      expect(service.getSentimentForHeadline("SOL reversed gains amid volatility")).toBe("bearish");
    });

    it("classifies 'BTC erases gains since Trump's election win' as bearish (not bullish)", () => {
      // Regression: "erases gains" + "gains"/"win" must not override; NEGATIVE_GAINS wins
      expect(service.getSentimentForHeadline("BTC erases gains since Trump's election win")).toBe("bearish");
      expect(service.getSentimentForHeadline("BTC erases gains since Trump\u2019s election win")).toBe("bearish");
    });

    it("does not classify positive 'gains' headlines as bearish when no loss phrase", () => {
      expect(service.getSentimentForHeadline("BTC posts gains on ETF inflows")).toBe("bullish");
      expect(service.getSentimentForHeadline("Crypto gains momentum")).toBe("bullish");
    });

    it("classifies record outflows as bearish (not bullish 'record')", () => {
      expect(service.getSentimentForHeadline("Record outflows from Bitcoin ETF")).toBe("bearish");
    });

    it("classifies record high / record inflow as bullish", () => {
      expect(service.getSentimentForHeadline("BTC hits record high")).toBe("bullish");
      expect(service.getSentimentForHeadline("Record inflow into spot ETFs")).toBe("bullish");
    });

    it("classifies bearish price action keywords", () => {
      expect(service.getSentimentForHeadline("Bitcoin slides below $60k")).toBe("bearish");
      expect(service.getSentimentForHeadline("ETH fell 5% in 24h")).toBe("bearish");
      expect(service.getSentimentForHeadline("Market sell off continues")).toBe("bearish");
    });

    it("classifies bullish headlines", () => {
      expect(service.getSentimentForHeadline("BTC soars to new ATH")).toBe("bullish");
      expect(service.getSentimentForHeadline("ETF approval boosts institutional adoption")).toBe("bullish");
    });

    it("returns neutral for unrelated headlines", () => {
      expect(service.getSentimentForHeadline("The meeting is at 3pm")).toBe("neutral");
    });

    it("classifies expanded NEGATIVE_GAINS_PHRASES as bearish", () => {
      expect(service.getSentimentForHeadline("Crypto continues to slide on macro concerns")).toBe("bearish");
      expect(service.getSentimentForHeadline("BTC touches $72k as fear mounts")).toBe("bearish");
      expect(service.getSentimentForHeadline("ETF outflow hits $272m")).toBe("bearish");
      expect(service.getSentimentForHeadline("US probes exchanges over Iran sanctions evasion")).toBe("bearish");
    });
  });

  describe("getTradingSentiment", () => {
    it("returns neutral when no news cache", () => {
      const result = service.getTradingSentiment("BTC");
      expect(result.sentiment).toBe("neutral");
      expect(result.confidence).toBe(0);
      expect(result.hasHighRiskEvent).toBe(false);
    });
  });
});
