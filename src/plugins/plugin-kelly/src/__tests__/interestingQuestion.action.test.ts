/**
 * KELLY_INTERESTING_QUESTION action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyInterestingQuestionAction } from "../actions/interestingQuestion.action";
import {
  createMockRuntimeWithComposeState,
  createMockMessage,
  createMockCallback,
  createMockState,
} from "./test-utils";
import { findBannedJargon, findFillerPhrases } from "../constants/voice";

describe("KELLY_INTERESTING_QUESTION", () => {
  it("validates on 'ask me something'", async () => {
    const msg = createMockMessage("Ask me something interesting");
    const result = await kellyInterestingQuestionAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'what should we talk about'", async () => {
    const msg = createMockMessage("What should we talk about?");
    const result = await kellyInterestingQuestionAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'surprise me'", async () => {
    const msg = createMockMessage("Surprise me");
    const result = await kellyInterestingQuestionAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("does not validate on unrelated messages", async () => {
    const msg = createMockMessage("where to eat in Biarritz");
    const result = await kellyInterestingQuestionAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(false);
  });

  it("handler calls callback with text (not empty)", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Interesting questions: What's the last thing you made with your hands? If you could live anywhere for a month?",
    });
    const msg = createMockMessage("Ask me something interesting");
    const cb = createMockCallback();

    await kellyInterestingQuestionAction.handler(
      runtime,
      msg,
      createMockState(),
      {},
      cb,
    );

    expect(cb.calls.length).toBe(1);
    expect(cb.calls[0].text).toBeTruthy();
    expect(cb.calls[0].text!.length).toBeGreaterThan(10);
  });

  it("output contains a question mark", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Questions: What would you paint if you had no fear of it being bad?",
    });
    runtime.useModel = async () =>
      "What would you paint if you had no fear of it being bad? You keep talking about starting — I think the canvas is waiting.";
    const msg = createMockMessage("ask me something");
    const cb = createMockCallback();
    await kellyInterestingQuestionAction.handler(runtime, msg, createMockState(), {}, cb);

    expect(cb.calls[0]?.text).toContain("?");
  });

  it("output has no banned jargon or filler", async () => {
    const runtime = createMockRuntimeWithComposeState();
    runtime.useModel = async () =>
      "If you could only surf one wave for the rest of your life — same break, same conditions — what would it look like? I'm curious what your perfect wave actually is.";
    const msg = createMockMessage("ask me something interesting");
    const cb = createMockCallback();
    await kellyInterestingQuestionAction.handler(runtime, msg, createMockState(), {}, cb);

    const text = cb.calls[0]?.text ?? "";
    expect(findBannedJargon(text)).toEqual([]);
    expect(findFillerPhrases(text)).toEqual([]);
  });
});
