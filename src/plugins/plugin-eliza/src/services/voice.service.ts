/**
 * Voice Learning Service
 *
 * Analyzes existing Substack essays and tweets to learn the brand voice.
 * Extracts patterns, tone, structure, and characteristic phrases.
 */

import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import {
  SUBSTACK_DIR,
  MARKETING_DIR,
  VOICE_CACHE_FILE as CACHE_FILE,
} from "../config/paths";

export interface VoiceProfile {
  // Overall characteristics
  tone: string[];
  vocabulary: string[];
  avoidedWords: string[];

  // Structure patterns
  typicalOpenings: string[];
  typicalClosings: string[];
  transitionPhrases: string[];

  // Style metrics
  avgSentenceLength: number;
  avgParagraphLength: number;
  bulletFrequency: number; // 0-1 scale

  // Characteristic phrases
  signatures: string[];

  // Content themes
  recurringThemes: string[];

  // Generated summary for prompts
  voiceSummary: string;

  // Metadata
  analyzedFiles: number;
  lastUpdated: number;
}

function ensureCacheDir(): void {
  const dir = path.dirname(CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadCachedProfile(): VoiceProfile | null {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    const cached = JSON.parse(
      fs.readFileSync(CACHE_FILE, "utf-8"),
    ) as VoiceProfile;
    // Cache valid for 7 days
    if (Date.now() - cached.lastUpdated < 7 * 24 * 60 * 60 * 1000) {
      return cached;
    }
  } catch {}
  return null;
}

function saveProfile(profile: VoiceProfile): void {
  ensureCacheDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(profile, null, 2));
}

function extractOpenings(content: string): string[] {
  const openings: string[] = [];
  // Get first sentence of each major section
  const sections = content.split(/^##\s+/m);
  for (const section of sections.slice(0, 5)) {
    const firstSentence = section.trim().split(/[.!?]/)[0];
    if (
      firstSentence &&
      firstSentence.length > 20 &&
      firstSentence.length < 200
    ) {
      openings.push(firstSentence.trim());
    }
  }
  return openings;
}

function extractClosings(content: string): string[] {
  const closings: string[] = [];
  const paragraphs = content.split(/\n\n+/);
  const lastParagraphs = paragraphs.slice(-3);
  for (const para of lastParagraphs) {
    const trimmed = para.trim();
    if (
      trimmed.length > 30 &&
      trimmed.length < 300 &&
      !trimmed.startsWith("#")
    ) {
      closings.push(trimmed);
    }
  }
  return closings;
}

function extractSignaturePhrases(content: string): string[] {
  // Look for phrases that appear to be distinctive/branded
  const signatures: string[] = [];

  const patterns = [
    /trade well,? live well/gi,
    /edge and equilibrium/gi,
    /the cheat code/gi,
    /endless summer/gi,
    /lifestyle over spreadsheet/gi,
    /buy the waves/gi,
    /wake up stoked/gi,
    /crypto as a game/gi,
    /not a jail/gi,
    /refuse to sell your time/gi,
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      signatures.push(...matches);
    }
  }

  return [...new Set(signatures)];
}

function calculateMetrics(content: string): {
  avgSentence: number;
  avgParagraph: number;
  bulletFreq: number;
} {
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 20);
  const bulletLines = (content.match(/^[-*•]\s+/gm) || []).length;
  const totalLines = content.split("\n").length;

  return {
    avgSentence:
      sentences.length > 0
        ? Math.round(
            sentences.reduce((a, s) => a + s.trim().split(/\s+/).length, 0) /
              sentences.length,
          )
        : 15,
    avgParagraph:
      paragraphs.length > 0
        ? Math.round(
            paragraphs.reduce((a, p) => a + p.trim().split(/\s+/).length, 0) /
              paragraphs.length,
          )
        : 50,
    bulletFreq: totalLines > 0 ? bulletLines / totalLines : 0,
  };
}

function extractThemes(content: string): string[] {
  const themes: string[] = [];
  const themePatterns: Record<string, RegExp> = {
    "options trading": /option|strike|call|put|expiry/gi,
    "perps & funding": /perp|funding|leverage|liquidat/gi,
    "lifestyle design": /lifestyle|travel|hotel|dining|living well/gi,
    "bitcoin philosophy": /bitcoin|btc|halving|store of value|digital gold/gi,
    "defi & yield": /defi|yield|tvl|protocol|liquidity/gi,
    "market psychology": /fear|greed|sentiment|cycle|psychology/gi,
    "risk management": /risk|position size|stop loss|drawdown/gi,
    "airdrops & farming": /airdrop|farm|points|incentive/gi,
  };

  for (const [theme, pattern] of Object.entries(themePatterns)) {
    const matches = content.match(pattern);
    if (matches && matches.length >= 3) {
      themes.push(theme);
    }
  }

  return themes;
}

export function analyzeVoice(): VoiceProfile {
  // Check cache first
  const cached = loadCachedProfile();
  if (cached) {
    logger.debug("[Voice] Using cached voice profile");
    return cached;
  }

  logger.info("[Voice] Analyzing content for voice profile...");

  const allContent: string[] = [];
  let fileCount = 0;

  // Read substack essays
  if (fs.existsSync(SUBSTACK_DIR)) {
    const files = fs.readdirSync(SUBSTACK_DIR).filter((f) => f.endsWith(".md"));
    for (const file of files.slice(0, 30)) {
      // Sample up to 30 essays
      try {
        const content = fs.readFileSync(path.join(SUBSTACK_DIR, file), "utf-8");
        allContent.push(content);
        fileCount++;
      } catch {}
    }
  }

  // Read marketing content
  if (fs.existsSync(MARKETING_DIR)) {
    const files = fs
      .readdirSync(MARKETING_DIR)
      .filter((f) => f.endsWith(".md"));
    for (const file of files.slice(0, 10)) {
      try {
        const content = fs.readFileSync(
          path.join(MARKETING_DIR, file),
          "utf-8",
        );
        allContent.push(content);
        fileCount++;
      } catch {}
    }
  }

  const combined = allContent.join("\n\n");

  // Extract patterns
  const allOpenings = allContent.flatMap(extractOpenings).slice(0, 10);
  const allClosings = allContent.flatMap(extractClosings).slice(0, 10);
  const allSignatures = [
    ...new Set(allContent.flatMap(extractSignaturePhrases)),
  ];
  const allThemes = [...new Set(allContent.flatMap(extractThemes))];
  const metrics = calculateMetrics(combined);

  const profile: VoiceProfile = {
    tone: [
      "confident but not arrogant",
      "direct and human",
      "expert-level (skip 101)",
      "slightly provocative",
      "personality-driven",
    ],
    vocabulary: [
      "frameworks over hot takes",
      "numbers-first when explaining",
      "cite by name (HYPE wheel, Cheat Code, etc.)",
    ],
    avoidedWords: [
      "delve",
      "landscape",
      "certainly",
      "great question",
      "it's important to note",
      "at the end of the day",
      "let me explain",
      "to be clear",
      "interestingly",
    ],
    typicalOpenings:
      allOpenings.length > 0
        ? allOpenings
        : [
            "Most people get this wrong.",
            "The consensus is [X]. Here's why that's incomplete.",
            "There's a framework for this.",
          ],
    typicalClosings:
      allClosings.length > 0
        ? allClosings
        : [
            "The money is a byproduct. The real edge is the life you build.",
            "That's the framework. Now go apply it.",
          ],
    transitionPhrases: [
      "Here's the thing:",
      "The framework:",
      "What this means:",
      "The real question:",
      "Put differently:",
    ],
    avgSentenceLength: metrics.avgSentence,
    avgParagraphLength: metrics.avgParagraph,
    bulletFrequency: metrics.bulletFreq,
    signatures:
      allSignatures.length > 0
        ? allSignatures
        : ["Trade well, live well", "Edge and equilibrium", "The Cheat Code"],
    recurringThemes: allThemes,
    voiceSummary: generateVoiceSummary(metrics, allSignatures, allThemes),
    analyzedFiles: fileCount,
    lastUpdated: Date.now(),
  };

  saveProfile(profile);
  logger.info({ fileCount }, "[Voice] Voice profile generated");

  return profile;
}

function generateVoiceSummary(
  metrics: { avgSentence: number; avgParagraph: number; bulletFreq: number },
  signatures: string[],
  themes: string[],
): string {
  return `IKIGAI STUDIO VOICE:
- Confident, direct, expert-level. No 101 explanations.
- Personality-driven: take positions, be memorable.
- Paragraphs preferred (bullet frequency: ${(metrics.bulletFreq * 100).toFixed(0)}%).
- Average sentence: ${metrics.avgSentence} words. Mix short punchy with longer explanations.
- Signature phrases: ${signatures.slice(0, 3).join(", ")}.
- Core themes: ${themes.slice(0, 5).join(", ")}.
- Philosophy: "Trade well, live well" - edge and equilibrium, lifestyle over spreadsheet.
- AVOID: ${["delve", "landscape", "certainly", "great question", "it's important to note"].join(", ")}.`;
}

export function getVoicePromptAddition(): string {
  const profile = analyzeVoice();
  return `
BRAND VOICE (learned from ${profile.analyzedFiles} existing pieces):
${profile.voiceSummary}

SIGNATURE PHRASES YOU CAN USE:
${profile.signatures.map((s) => `- "${s}"`).join("\n")}

TYPICAL OPENINGS THAT WORK:
${profile.typicalOpenings
  .slice(0, 3)
  .map((o) => `- "${o.slice(0, 80)}..."`)
  .join("\n")}
`;
}

export default {
  analyzeVoice,
  getVoicePromptAddition,
};
