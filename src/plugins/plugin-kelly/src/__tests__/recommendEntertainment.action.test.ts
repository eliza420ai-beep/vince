/**
 * KELLY_RECOMMEND_ENTERTAINMENT action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendEntertainmentAction } from "../actions/recommendEntertainment.action";
import {
  createMockRuntimeWithComposeState,
  createMockMessage,
  createMockCallback,
  createMockState,
} from "./test-utils";
import { findBannedJargon, findFillerPhrases } from "../constants/voice";

describe("KELLY_RECOMMEND_ENTERTAINMENT", () => {
  it("validates on 'recommend a book'", async () => {
    const msg = createMockMessage("Recommend a book to read");
    const result = await kellyRecommendEntertainmentAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'something to watch on netflix'", async () => {
    const msg = createMockMessage("Something to watch on Netflix tonight");
    const result = await kellyRecommendEntertainmentAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'music for the taycan'", async () => {
    const msg = createMockMessage(
      "Music for the Taycan — something like Bonobo",
    );
    const result = await kellyRecommendEntertainmentAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'apple tv movie'", async () => {
    const msg = createMockMessage("Good movie on Apple TV?");
    const result = await kellyRecommendEntertainmentAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("does not validate on unrelated messages", async () => {
    const msg = createMockMessage("where to eat in Biarritz");
    const result = await kellyRecommendEntertainmentAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(false);
  });

  it("handler calls callback with category-specific prefix", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Books: The Almanack of Naval Ravikant, Shoe Dog. Music: Bonobo, Tycho.",
    });
    runtime.useModel = async () =>
      "**Pick:** The Almanack of Naval Ravikant by Eric Jorgenson — distilled wisdom on wealth and happiness. Read it in a sitting; it changes how you think about leverage. **Alternative:** Shoe Dog by Phil Knight — founder story with grit.";
    const msg = createMockMessage("recommend a book");
    const cb = createMockCallback();

    await kellyRecommendEntertainmentAction.handler(
      runtime,
      msg,
      createMockState(),
      {},
      cb,
    );

    expect(cb.calls.length).toBe(1);
    expect(cb.calls[0].text).toContain("book pick");
  });

  it("detects 'something like X' pattern", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Music: Bonobo (downtempo), Tycho (ambient), Bicep (electronic).",
    });
    runtime.useModel = async () =>
      "**Pick:** Tycho — Dive — same downtempo warmth as Bonobo, layered and cinematic. Perfect for the Taycan on a coast drive. **Alternative:** Bicep — Isles — more energy, still textured.";
    const msg = createMockMessage(
      "Music for the Taycan — something like Bonobo",
    );
    const cb = createMockCallback();

    await kellyRecommendEntertainmentAction.handler(
      runtime,
      msg,
      createMockState(),
      {},
      cb,
    );

    expect(cb.calls.length).toBe(1);
    expect(cb.calls[0].text).toContain("music pick");
  });

  it("output has no banned jargon or filler", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Netflix: Ozark, Dark. Apple TV: Severance, Shrinking.",
    });
    runtime.useModel = async () =>
      "**Pick:** Severance on Apple TV—sharp, unsettling, beautifully shot. You get a slow burn that rewards patience. **Alternative:** Dark on Netflix—layered time-travel thriller, German, dubbed or subbed.";
    const msg = createMockMessage("something to watch tonight");
    const cb = createMockCallback();
    await kellyRecommendEntertainmentAction.handler(
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
