/**
 * KELLY_RECOMMEND_CREATIVE action tests.
 */

import { describe, it, expect } from "bun:test";
import { kellyRecommendCreativeAction } from "../actions/recommendCreative.action";
import {
  createMockRuntimeWithComposeState,
  createMockMessage,
  createMockCallback,
  createMockState,
} from "./test-utils";
import { findBannedJargon, findFillerPhrases } from "../constants/voice";

describe("KELLY_RECOMMEND_CREATIVE", () => {
  it("validates on 'oil painting tips'", async () => {
    const msg = createMockMessage("Tips to get started with oil painting");
    const result = await kellyRecommendCreativeAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'ableton push 3'", async () => {
    const msg = createMockMessage(
      "How to use Push 3 with Ableton for house music?",
    );
    const result = await kellyRecommendCreativeAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'blender mcp'", async () => {
    const msg = createMockMessage(
      "Blender with Claude MCP — how does that work?",
    );
    const result = await kellyRecommendCreativeAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'hasselblad'", async () => {
    const msg = createMockMessage("Tips for shooting with the Hasselblad H2");
    const result = await kellyRecommendCreativeAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("validates on 'davinci resolve'", async () => {
    const msg = createMockMessage("Color grading in DaVinci Resolve");
    const result = await kellyRecommendCreativeAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(true);
  });

  it("does not validate on unrelated messages", async () => {
    const msg = createMockMessage("recommend a wine for tonight");
    const result = await kellyRecommendCreativeAction.validate!(
      createMockRuntimeWithComposeState(),
      msg,
    );
    expect(result).toBe(false);
  });

  it("handler calls callback with domain-specific prefix", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Oil painting: start with a limited palette (titanium white, cadmium yellow, alizarin crimson, ultramarine blue). Use linseed oil medium.",
    });
    const msg = createMockMessage("Tips to get started with oil painting");
    const cb = createMockCallback();

    await kellyRecommendCreativeAction.handler(
      runtime,
      msg,
      createMockState(),
      {},
      cb,
    );

    expect(cb.calls.length).toBe(1);
    expect(cb.calls[0].text).toContain("painting tip");
  });

  it("output has no banned jargon or filler", async () => {
    const runtime = createMockRuntimeWithComposeState({
      text: "Ableton Push 3: standalone mode. Session view for live performance. AI: use MCP server for generative MIDI.",
    });
    runtime.useModel = async () =>
      "**Tip:** Start in Session View on Push 3—lay down a four-bar drum loop, then add bass and chords in separate clips. Push 3's standalone mode means you can sketch ideas without the laptop. **Next step:** Try the MCP server integration for generative MIDI—Claude can suggest chord progressions and you audition them live on Push.";
    const msg = createMockMessage("house music production tips with Push 3");
    const cb = createMockCallback();
    await kellyRecommendCreativeAction.handler(
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
