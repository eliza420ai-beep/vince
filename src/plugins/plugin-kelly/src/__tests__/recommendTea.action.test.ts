/**
 * KELLY_RECOMMEND_TEA action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendTeaAction } from "../actions/recommendTea.action";
import {
  createMockRuntimeWithComposeState,
  createMockMessage,
  createMockCallback,
  createMockState,
} from "./test-utils";
import { findBannedJargon, findFillerPhrases } from "../constants/voice";

describe("KELLY_RECOMMEND_TEA", () => {
  it("validates on 'what tea for this evening'", async () => {
    const msg = createMockMessage("What tea for this evening?");
    const result = await kellyRecommendTeaAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'morning tea with milk'", async () => {
    const msg = createMockMessage("Morning tea with milk?");
    const result = await kellyRecommendTeaAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'dammann'", async () => {
    const msg = createMockMessage("What's good from Dammann?");
    const result = await kellyRecommendTeaAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("does not validate on unrelated messages", async () => {
    const msg = createMockMessage("recommend a wine for tonight");
    const result = await kellyRecommendTeaAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(false);
  });

  it("handler calls callback with text", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Dammann Frères: Assam GFBOP, English Breakfast, Rooibos Earl Grey, Tisane fleur d'oranger.",
    });
    const msg = createMockMessage("What tea for this evening?");
    const cb = createMockCallback();

    await kellyRecommendTeaAction.handler(
      runtime,
      msg,
      createMockState(),
      {},
      cb,
    );

    expect(cb.calls.length).toBe(1);
    expect(cb.calls[0].text).toBeTruthy();
  });

  it("evening tea response has no banned jargon or filler", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Dammann: Rooibos Earl Grey (caffeine-free bergamot rooibos), Tisane fleur d'oranger (chamomile, orange blossom).",
    });
    runtime.useModel = async () =>
      "**Pick:** Rooibos Earl Grey from Dammann—bergamot on rooibos, caffeine-free, good after dinner. You get the Earl Grey character without the caffeine. **Alternative:** Tisane fleur d'oranger—chamomile and orange blossom, calming.";
    const msg = createMockMessage("evening tea");
    const cb = createMockCallback();
    await kellyRecommendTeaAction.handler(
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
