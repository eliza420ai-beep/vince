/**
 * KELLY_RECOMMEND_HOME_COOKING action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendHomeCookingAction } from "../actions/recommendHomeCooking.action";
import {
  createMockRuntimeWithComposeState,
  createMockMessage,
  createMockCallback,
  createMockState,
} from "./test-utils";
import { findBannedJargon, findFillerPhrases } from "../constants/voice";

describe("KELLY_RECOMMEND_HOME_COOKING", () => {
  it("validates on 'what to cook tonight'", async () => {
    const msg = createMockMessage("what to cook tonight");
    const result = await kellyRecommendHomeCookingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'green egg'", async () => {
    const msg = createMockMessage("Green Egg tonight — what should I grill?");
    const result = await kellyRecommendHomeCookingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'thermomix'", async () => {
    const msg = createMockMessage("Thermomix dinner ideas");
    const result = await kellyRecommendHomeCookingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("does not validate on unrelated messages", async () => {
    const msg = createMockMessage("recommend a hotel in Paris");
    const result = await kellyRecommendHomeCookingAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(false);
  });

  it("handler calls callback with text", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Green Egg BBQ: smoke a local duck breast. Thermomix: risotto with porcini.",
    });
    const msg = createMockMessage("what should I cook tonight?");
    const cb = createMockCallback();
    const state = createMockState();

    await kellyRecommendHomeCookingAction.handler(runtime, msg, state, {}, cb);

    expect(cb.calls.length).toBe(1);
    expect(cb.calls[0].text).toBeTruthy();
    expect(typeof cb.calls[0].text).toBe("string");
  });

  it("output has no banned jargon or filler", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Green Egg BBQ: smoke a duck breast. Thermomix TM7: risotto porcini.",
    });
    runtime.useModel = async () =>
      "**Tonight:** Smoked duck breast on the Green Egg—local Landes duck, indirect at 160°C for 90 min. Pair with a Cahors (Le Sid by Matthieu Cosse). **Alternative:** Thermomix risotto with porcini—the TM7 nails the stirring.";
    const msg = createMockMessage("what to cook tonight");
    const cb = createMockCallback();
    await kellyRecommendHomeCookingAction.handler(
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
