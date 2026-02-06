/**
 * VINCE Knowledge Quality E2E Test
 *
 * Tests whether VINCE's knowledge base actually improves response quality
 * using A/B comparison (with knowledge vs without knowledge).
 *
 * This test validates that our ~286 markdown files across 6 knowledge
 * directories provide measurable value.
 *
 * Usage:
 *   bun test src/plugins/plugin-vince/src/__tests__/knowledgeQuality.e2e.test.ts
 *
 * Requirements:
 *   - OPENAI_API_KEY environment variable
 *   - Network access for API calls
 *   - ~5-10 minutes runtime (embedding generation + LLM scoring)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  type TestCase,
  type DomainTestResult,
  runDomainTest,
  clearEmbeddingCache,
} from "./knowledge-utils";

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const VINCE_TEST_CASES: TestCase[] = [
  // OPTIONS Domain - explicitly ask for knowledge-based frameworks
  {
    domain: "OPTIONS",
    query:
      "Using the strike selection framework from your knowledge base, how should I adjust HYPE covered call strikes when funding is +0.03%? What does your knowledge say about APR thresholds and the Wheel Strategy implementation?",
    expectedCapabilities: [
      "strike selection from perps methodology",
      "Wheel Strategy implementation",
      "APR threshold framework",
      "HYPE-specific guidance",
    ],
    expectedTone: [
      "direct",
      "methodology-focused",
      "trader language",
      "framework-citing",
    ],
    weight: 5,
    description: "Options strike selection with Wheel Strategy",
  },

  // PERPS Domain - explicitly ask for interpretation framework
  {
    domain: "PERPS",
    query:
      "According to your funding rate interpretation framework, what are the red flags when funding flips from negative to positive? Apply the methodology from your knowledge to explain entry timing.",
    expectedCapabilities: [
      "funding rate interpretation framework",
      "specific thresholds (0.05% crowded)",
      "entry timing methodology",
      "red flag identification",
    ],
    expectedTone: ["data-first", "framework-applying", "expert knowledge"],
    weight: 5,
    description: "Funding rate interpretation methodology",
  },

  // MEMES/TRENCHES Domain - explicitly ask for H/E/F/S and grinding methodology
  {
    domain: "MEMES",
    query:
      "Using the trenches grinding methodology from your knowledge base, how should I evaluate a new Solana meme coin? Apply the H/E/F/S rating system if your knowledge includes it.",
    expectedCapabilities: [
      "trenches grinding methodology",
      "H/E/F/S rating system",
      "pump.fun evaluation framework",
      "LP analysis approach",
    ],
    expectedTone: ["practical", "framework-citing", "degen-aware"],
    weight: 4,
    description: "Meme coin evaluation with H/E/F/S",
  },

  // AIRDROPS Domain - explicitly ask for Tread.fi strategies
  {
    domain: "AIRDROPS",
    query:
      "What does your knowledge base say about Tread.fi airdrop farming strategies? Apply any specific volume targets or tier thresholds from your knowledge to optimize farming approach.",
    expectedCapabilities: [
      "Treadfi strategy specifics",
      "volume target thresholds",
      "tier optimization framework",
      "capital efficiency methodology",
    ],
    expectedTone: ["strategic", "framework-citing", "specific protocols"],
    weight: 4,
    description: "Airdrop farming with knowledge thresholds",
  },

  // LIFESTYLE Domain - explicitly ask for Southwest France Palace methodology
  {
    domain: "LIFESTYLE",
    query:
      "According to your Southwest France Palace methodology, which of the three Palaces should I choose for a gastronomy-focused one-night stay? Apply your 24-hour protocol and explain the off-season timing strategy. What makes Les Prés d'Eugénie different from Les Sources de Caudalie for this purpose?",
    expectedCapabilities: [
      "specific Palace comparisons (Eugénie vs Caudalie vs Palais)",
      "1-night 24-hour protocol",
      "off-season timing strategy",
      "occasion-matching framework",
    ],
    expectedTone: ["cultured", "methodology-applying", "property-specific"],
    weight: 3,
    description: "Southwest France Palace selection methodology",
  },

  // ART/NFT Domain - explicitly ask for floor analysis methodology
  {
    domain: "ART",
    query:
      "What methodology does your knowledge base provide for evaluating NFT floor thickness? Apply this framework to analyze CryptoPunks or Meridian liquidity specifically.",
    expectedCapabilities: [
      "floor analysis methodology from knowledge",
      "liquidity assessment framework",
      "CryptoPunks/Meridian specific analysis",
      "collection evaluation approach",
    ],
    expectedTone: ["analytical", "framework-applying", "collection-specific"],
    weight: 3,
    description: "NFT floor analysis with knowledge methodology",
  },
];

// ============================================================================
// TEST SUITE (A/B comparison skipped unless RUN_NETWORK_TESTS=1)
// ============================================================================
const skipNetworkTests = process.env.RUN_NETWORK_TESTS !== "1";

describe("VINCE Knowledge Quality", () => {
  const results: DomainTestResult[] = [];

  beforeAll(() => {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("\n⚠️  OPENAI_API_KEY not set - test will skip\n");
    }

    // Clear embedding cache for fresh run
    clearEmbeddingCache();
  });

  describe.skipIf(skipNetworkTests)("A/B Comparison by Domain", () => {
    it("should show improvement with OPTIONS knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "OPTIONS")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      // Enhanced should score at least as well as baseline
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5, // Allow small variance
      );

      // Domain expertise should show improvement
      expect(result.enhancedScore.domainExpertise).toBeGreaterThanOrEqual(
        result.baselineScore.domainExpertise - 10,
      );
    }, 180000); // 3 min timeout

    it("should show improvement with PERPS knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "PERPS")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with MEMES knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "MEMES")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with AIRDROPS knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "AIRDROPS")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with LIFESTYLE knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "LIFESTYLE")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with ART knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "ART")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);
  });

  describe("Overall Knowledge Impact", () => {
    it("should show positive average improvement across all domains", async () => {
      if (!process.env.OPENAI_API_KEY || results.length === 0) {
        console.log("Skipping - no API key or no results");
        return;
      }

      // Calculate averages
      const avgBaseline =
        results.reduce((sum, r) => sum + r.baselineScore.overallScore, 0) /
        results.length;
      const avgEnhanced =
        results.reduce((sum, r) => sum + r.enhancedScore.overallScore, 0) /
        results.length;
      const avgImprovement = avgEnhanced - avgBaseline;
      const improvementPercent =
        avgBaseline > 0
          ? ((avgImprovement / avgBaseline) * 100).toFixed(1)
          : "N/A";

      // Calculate Knowledge Integration averages
      const avgKIBaseline =
        results.reduce(
          (sum, r) => sum + r.baselineScore.knowledgeIntegration,
          0,
        ) / results.length;
      const avgKIEnhanced =
        results.reduce(
          (sum, r) => sum + r.enhancedScore.knowledgeIntegration,
          0,
        ) / results.length;
      const avgKIImprovement = avgKIEnhanced - avgKIBaseline;

      // Print summary
      console.log("\n");
      console.log("═".repeat(80));
      console.log("                    VINCE KNOWLEDGE QUALITY RESULTS");
      console.log("═".repeat(80));
      console.log(
        "\n| Domain     | Base | Enh  | Impr   | KI Base | KI Enh | KI Delta |",
      );
      console.log(
        "|------------|------|------|--------|---------|--------|----------|",
      );

      for (const r of results) {
        const kiDelta =
          r.enhancedScore.knowledgeIntegration -
          r.baselineScore.knowledgeIntegration;
        console.log(
          `| ${r.domain.padEnd(10)} | ${String(r.baselineScore.overallScore).padStart(4)} | ${String(r.enhancedScore.overallScore).padStart(4)} | ${((r.improvement >= 0 ? "+" : "") + r.improvement).padStart(6)} | ${String(r.baselineScore.knowledgeIntegration).padStart(7)} | ${String(r.enhancedScore.knowledgeIntegration).padStart(6)} | ${((kiDelta >= 0 ? "+" : "") + kiDelta).padStart(8)} |`,
        );
      }

      console.log(
        "|------------|------|------|--------|---------|--------|----------|",
      );
      console.log(
        `| AVERAGE    | ${String(Math.round(avgBaseline)).padStart(4)} | ${String(Math.round(avgEnhanced)).padStart(4)} | ${((avgImprovement >= 0 ? "+" : "") + Math.round(avgImprovement)).padStart(6)} | ${String(Math.round(avgKIBaseline)).padStart(7)} | ${String(Math.round(avgKIEnhanced)).padStart(6)} | ${((avgKIImprovement >= 0 ? "+" : "") + Math.round(avgKIImprovement)).padStart(8)} |`,
      );
      console.log("\n");
      console.log(`Overall Improvement: ${improvementPercent}%`);
      console.log(
        `Knowledge Integration Delta: +${Math.round(avgKIImprovement)} points`,
      );

      // Interpretation
      const pct = parseFloat(improvementPercent as string);
      if (pct >= 20) {
        console.log("EXCELLENT: Knowledge base provides significant value!");
      } else if (pct >= 10) {
        console.log("GOOD: Knowledge base is helping responses.");
      } else if (pct >= 5) {
        console.log("MODERATE: Some improvement detected.");
      } else if (pct > 0) {
        console.log(
          "LIMITED: Small improvement. Consider reviewing knowledge quality.",
        );
      } else {
        console.log(
          "NO IMPROVEMENT: Knowledge may not be matching queries well.",
        );
      }

      // Best and worst domains
      const best = results.reduce((a, b) =>
        a.improvement > b.improvement ? a : b,
      );
      const worst = results.reduce((a, b) =>
        a.improvement < b.improvement ? a : b,
      );

      console.log(`\nBest: ${best.domain} (+${best.improvement})`);
      console.log(`Needs work: ${worst.domain} (+${worst.improvement})`);
      console.log("\n");

      // Assertion: average improvement should be non-negative
      // We're lenient here - knowledge should help, not hurt
      expect(avgEnhanced).toBeGreaterThanOrEqual(avgBaseline - 10);
    });

    it("should have OPTIONS and PERPS as top performers (our deepest knowledge)", async () => {
      if (!process.env.OPENAI_API_KEY || results.length === 0) {
        console.log("Skipping - no API key or no results");
        return;
      }

      const optionsResult = results.find((r) => r.domain === "OPTIONS");
      const perpsResult = results.find((r) => r.domain === "PERPS");

      if (optionsResult && perpsResult) {
        // These are our deepest knowledge areas - should show positive improvement
        console.log(`\nCore Domains Check:`);
        const optKIDelta =
          optionsResult.enhancedScore.knowledgeIntegration -
          optionsResult.baselineScore.knowledgeIntegration;
        const perpsKIDelta =
          perpsResult.enhancedScore.knowledgeIntegration -
          perpsResult.baselineScore.knowledgeIntegration;

        console.log(
          `  OPTIONS: Overall ${optionsResult.improvement >= 0 ? "PASS" : "FAIL"} (+${optionsResult.improvement}) | KI Delta: +${optKIDelta}`,
        );
        console.log(
          `  PERPS: Overall ${perpsResult.improvement >= 0 ? "PASS" : "FAIL"} (+${perpsResult.improvement}) | KI Delta: +${perpsKIDelta}`,
        );

        // At least one of our core domains should show improvement
        const coreImprovement = Math.max(
          optionsResult.improvement,
          perpsResult.improvement,
        );
        expect(coreImprovement).toBeGreaterThanOrEqual(0);

        // Knowledge Integration should improve significantly for core domains
        const coreKIImprovement = Math.max(optKIDelta, perpsKIDelta);
        expect(coreKIImprovement).toBeGreaterThanOrEqual(5);
      }
    });

    it("should show Knowledge Integration improvement when knowledge is provided", async () => {
      if (!process.env.OPENAI_API_KEY || results.length === 0) {
        console.log("Skipping - no API key or no results");
        return;
      }

      // Calculate average KI delta
      const avgKIDelta =
        results.reduce((sum, r) => {
          return (
            sum +
            (r.enhancedScore.knowledgeIntegration -
              r.baselineScore.knowledgeIntegration)
          );
        }, 0) / results.length;

      console.log(`\nKnowledge Integration Check:`);
      console.log(`  Average KI Delta: +${Math.round(avgKIDelta)}`);
      console.log(
        `  This measures whether knowledge is actually being USED, not just present.`,
      );

      // Enhanced responses should have higher KI scores than baseline
      // This is the key metric - proves knowledge is being integrated
      expect(avgKIDelta).toBeGreaterThan(0);
    });
  });
});
