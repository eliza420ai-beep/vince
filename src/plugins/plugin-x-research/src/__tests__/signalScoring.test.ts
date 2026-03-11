import { describe, it, expect } from "vitest";
import {
  dedupeByText,
  inferTradingSignalFromTexts,
  rankTweetsByTopicRelevance,
} from "../actions/helpers/signalScoring";

describe("signalScoring helpers", () => {
  it("dedupes repeated text payloads", () => {
    const out = dedupeByText([
      { text: "BTC breakout now", id: "1" } as any,
      { text: "BTC breakout now", id: "2" } as any,
      { text: "SOL strength", id: "3" } as any,
    ]);
    expect(out).toHaveLength(2);
  });

  it("ranks topic-relevant tweets above generic ones", () => {
    const ranked = rankTweetsByTopicRelevance(
      [
        {
          text: "macro thoughts only",
          id: "1",
          metrics: { likeCount: 100 },
        } as any,
        {
          text: "BTC funding and OI rising",
          id: "2",
          metrics: { likeCount: 10 },
        } as any,
      ],
      ["btc", "funding", "oi"],
    );
    expect(ranked[0].id).toBe("2");
  });

  it("infers directional signal and confidence", () => {
    const signal = inferTradingSignalFromTexts([
      "BTC long setup with breakout",
      "SOL bullish continuation",
    ]);
    expect(signal.directionBias).toBe("long");
    expect(signal.confidence).toBeGreaterThan(40);
  });
});
