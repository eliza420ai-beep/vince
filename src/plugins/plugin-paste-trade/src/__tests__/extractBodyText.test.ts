import { describe, expect, it } from "bun:test";
import {
  bodyTextFromExtracted,
  resolveBodyTextFromExtractOutput,
} from "../extractBodyText.ts";

describe("bodyTextFromExtracted", () => {
  it("prefers text over source label (tweet shape)", () => {
    expect(
      bodyTextFromExtracted({
        source: "x_api",
        text: "Long BTC here",
        word_count: 3,
      }),
    ).toBe("Long BTC here");
  });

  it("does not use source as body", () => {
    expect(bodyTextFromExtracted({ source: "x_api" })).toBe("");
  });

  it("uses body_text when text absent", () => {
    expect(
      bodyTextFromExtracted({ body_text: "  article  ", source: "text" }),
    ).toBe("article");
  });

  it("uses transcript for youtube-shaped JSON", () => {
    expect(
      bodyTextFromExtracted({
        source: "youtube",
        transcript: "hello world",
      }),
    ).toBe("hello world");
  });
});

describe("resolveBodyTextFromExtractOutput", () => {
  it("reads saved_to JSON and uses text field", () => {
    const body = resolveBodyTextFromExtractOutput(
      {
        source: "x_api",
        saved_to: "/tmp/x.json",
        transcript_saved: true,
      },
      () => JSON.stringify({ text: "from file", source: "x_api" }),
    );
    expect(body).toBe("from file");
  });

  it("reads transcript from saved file when stdout omitted it", () => {
    const body = resolveBodyTextFromExtractOutput(
      { source: "youtube", saved_to: "/tmp/y.json", transcript_saved: true },
      () =>
        JSON.stringify({
          source: "youtube",
          transcript: "full transcript here with enough length",
        }),
    );
    expect(body).toContain("full transcript");
  });
});
