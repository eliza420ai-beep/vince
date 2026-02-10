/**
 * MessageExamples regression: lock in Kelly tone and structure from character examples.
 * Uses fixtures to avoid importing kellyCharacter (and Discord deps). Asserts invariants only.
 */

import { describe, it, expect } from "bun:test";
import * as path from "path";
import * as fs from "fs";
import { findBannedJargon, FILLER_PHRASES } from "../constants/voice";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const ASK_AGENT_FIXTURE = path.join(FIXTURES_DIR, "kelly-ask-agent-examples.json");
const REPLY_SAMPLES_FIXTURE = path.join(FIXTURES_DIR, "kelly-reply-samples.json");

function assertNoBannedJargon(text: string): void {
  const found = findBannedJargon(text);
  expect(found).toHaveLength(0);
}

function assertNoFillerPhrases(text: string): void {
  const lower = text.toLowerCase();
  for (const phrase of FILLER_PHRASES) {
    expect(lower.includes(phrase)).toBe(false);
  }
}

function hasConcreteRecommendation(text: string): boolean {
  return /\*\*[^*]+\*\*/.test(text) || /[A-Za-zÀ-ÿ][^—]*—/.test(text);
}

describe("Kelly messageExamples regression", () => {
  it("ASK_AGENT fixture: each Kelly reply has no banned jargon", () => {
    const examples = JSON.parse(fs.readFileSync(ASK_AGENT_FIXTURE, "utf-8"));
    for (const ex of examples) {
      assertNoBannedJargon(ex.kellyText ?? "");
    }
  });

  it("ASK_AGENT fixture: each Kelly reply has no filler phrases", () => {
    const examples = JSON.parse(fs.readFileSync(ASK_AGENT_FIXTURE, "utf-8"));
    for (const ex of examples) {
      assertNoFillerPhrases(ex.kellyText ?? "");
    }
  });

  it("ASK_AGENT fixture: each reply contains reporting pattern (says or says:)", () => {
    const examples = JSON.parse(fs.readFileSync(ASK_AGENT_FIXTURE, "utf-8"));
    for (const ex of examples) {
      const text = (ex.kellyText ?? "").toLowerCase();
      expect(text.includes("says:") || text.includes("says ")).toBe(true);
    }
  });

  it("reply samples fixture: each Kelly reply has no banned jargon", () => {
    const examples = JSON.parse(fs.readFileSync(REPLY_SAMPLES_FIXTURE, "utf-8"));
    for (const ex of examples) {
      assertNoBannedJargon(ex.kellyText ?? "");
    }
  });

  it("reply samples fixture: each Kelly reply has no filler phrases", () => {
    const examples = JSON.parse(fs.readFileSync(REPLY_SAMPLES_FIXTURE, "utf-8"));
    for (const ex of examples) {
      assertNoFillerPhrases(ex.kellyText ?? "");
    }
  });

  it("reply samples: recommendation examples have at least one concrete pick (bold or —)", () => {
    const examples = JSON.parse(fs.readFileSync(REPLY_SAMPLES_FIXTURE, "utf-8"));
    const recommendationExamples = examples.filter((ex: any) => ex.isRecommendation === true);
    for (const ex of recommendationExamples) {
      expect(
        hasConcreteRecommendation(ex.kellyText ?? ""),
        `Recommendation example for "${ex.userPrompt}" should contain bold or — pattern`,
      ).toBe(true);
    }
  });
});
