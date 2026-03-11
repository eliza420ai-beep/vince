import { describe, it, expect } from "vitest";
import {
  parseTopicFromPrompt,
  parseTweetIdOrUrl,
  parseUsernameFromMessage,
} from "../actions/helpers/inputParsers";

describe("inputParsers", () => {
  it("parses username from handle mention", () => {
    expect(parseUsernameFromMessage("What did @trader123 say?")).toBe(
      "trader123",
    );
  });

  it("parses tweet id from URL before naked id", () => {
    const out = parseTweetIdOrUrl(
      "Summarize https://x.com/a/status/1234567890123456789 and id 1111111111111111111",
    );
    expect(out.tweetId).toBe("1234567890123456789");
    expect(out.source).toBe("url");
  });

  it("parses topic from about clause", () => {
    expect(parseTopicFromPrompt("what did @foo say about btc")).toBe("btc");
  });
});
