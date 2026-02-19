/**
 * KELLY_RECOMMEND_ROWING action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendRowingAction } from "../actions/recommendRowing.action";
import {
  createMockRuntimeWithComposeState,
  createMockMessage,
  createMockCallback,
  createMockState,
} from "./test-utils";
import { findBannedJargon, findFillerPhrases } from "../constants/voice";

describe("KELLY_RECOMMEND_ROWING", () => {
  it("validates on 'rowing workout'", async () => {
    const msg = createMockMessage("Rowing workout for surf fitness");
    const result = await kellyRecommendRowingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'surf fit'", async () => {
    const msg = createMockMessage("How can I get more surf fit?");
    const result = await kellyRecommendRowingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'indoor cardio'", async () => {
    const msg = createMockMessage("Indoor cardio for today");
    const result = await kellyRecommendRowingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("does not validate on unrelated messages", async () => {
    const msg = createMockMessage("recommend a wine for tonight");
    const result = await kellyRecommendRowingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(false);
  });

  it("handler calls callback with text", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Water rowing: 20 min steady-state at 22 spm builds paddle endurance.",
    });
    const msg = createMockMessage("rowing workout");
    const cb = createMockCallback();

    await kellyRecommendRowingAction.handler(
      runtime,
      msg,
      createMockState(),
      {},
      cb,
    );

    expect(cb.calls.length).toBe(1);
    expect(cb.calls[0].text).toBeTruthy();
    expect(cb.calls[0].text).toContain("rowing");
  });

  it("output has no banned jargon or filler", async () => {
    const runtime = createMockRuntimeWithComposeState();
    runtime.useModel = async () =>
      "**Session:** 20 min — 5 min warm-up at 20 spm, 4x3 min at 26-28 spm with 1 min easy between, 2 min cool-down. **Why:** Matches the interval pattern of paddling out through sets — burst effort, brief recovery, repeat.";
    const msg = createMockMessage("rowing for surf fit");
    const cb = createMockCallback();
    await kellyRecommendRowingAction.handler(
      runtime,
      msg,
      createMockState(),
      {},
      cb,
    );

    const text = cb.calls[0]?.text ?? "";
    expect(findBannedJargon(text)).toEqual([]);
    expect(findFillerPhrases(text)).toEqual([]);
  });
});
