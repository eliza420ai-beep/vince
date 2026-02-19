/**
 * Content audit prompt builder unit tests.
 */

import { describe, it, expect } from "vitest";
import {
  buildContentAuditPrompt,
  type TweetForAudit,
} from "../constants/contentAuditPrompt";

describe("buildContentAuditPrompt", () => {
  it("handles empty array", () => {
    const result = buildContentAuditPrompt([]);
    expect(result).toContain("TOP POSTS (by engagement)");
    expect(result).toContain("Identify:");
    expect(result).toContain("**Hooks that work**");
  });

  it("includes tweet with meta (likeCount, retweetCount)", () => {
    const tweets: TweetForAudit[] = [
      {
        text: "First post",
        likeCount: 100,
        retweetCount: 20,
      },
    ];
    const result = buildContentAuditPrompt(tweets);
    expect(result).toContain("1. First post");
    expect(result).toContain("100 likes");
    expect(result).toContain("20 RTs");
  });

  it("handles tweet without meta", () => {
    const tweets: TweetForAudit[] = [{ text: "No metrics" }];
    const result = buildContentAuditPrompt(tweets);
    expect(result).toContain("1. No metrics");
    expect(result).not.toContain("likes");
  });
});
