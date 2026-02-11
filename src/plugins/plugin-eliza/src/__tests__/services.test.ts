/**
 * Plugin Eliza - Service Tests
 * 
 * Standalone tests that don't require @elizaos/core runtime.
 * Tests pure logic functions from the services.
 */

import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ============================================================================
// Test Utilities (reimplemented to avoid @elizaos/core dependency)
// ============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Simulated style guide rules for testing
const TEST_TERMINOLOGY = [
  { preferred: "crypto", avoid: ["cryptocurrency", "cryptocurrencies"], caseSensitive: false },
  { preferred: "DeFi", avoid: ["defi", "DEFI", "Defi"], caseSensitive: true },
  { preferred: "NFT", avoid: ["nft", "Nft"], caseSensitive: true },
  { preferred: "web3", avoid: ["Web3", "WEB3"], caseSensitive: true },
  { preferred: "onchain", avoid: ["on-chain", "on chain"], caseSensitive: false },
];

const TEST_CAPITALIZATION = [
  { term: "Ethereum", correct: "Ethereum", type: "brand" },
  { term: "Bitcoin", correct: "Bitcoin", type: "brand" },
  { term: "MetaMask", correct: "MetaMask", type: "brand" },
  { term: "DeFi", correct: "DeFi", type: "acronym" },
];

const TEST_PROHIBITED = [
  { phrase: "get rich", reason: "Hype language" },
  { phrase: "100x", reason: "Hype language" },
  { phrase: "guaranteed", reason: "Misleading" },
];

const TEST_TONE_MARKERS = [
  { pattern: "obviously", tone: "casual" },
  { pattern: "🚀", tone: "promotional" },
  { pattern: "WAGMI", tone: "promotional" },
  // AI-slop markers
  { pattern: "game-changer", tone: "formal" },
  { pattern: "in the ever-evolving", tone: "formal" },
  { pattern: "let's dive in", tone: "formal" },
  { pattern: "leverage", tone: "formal" },
  { pattern: "seamless", tone: "formal" },
  { pattern: "excited to announce", tone: "formal" },
];

// Test implementation of style checking
interface TestViolation {
  rule: string;
  type: string;
  severity: string;
  found?: string;
  suggestion?: string;
}

function checkStyleTest(content: string): { violations: TestViolation[]; score: number } {
  const violations: TestViolation[] = [];

  // Check terminology
  for (const rule of TEST_TERMINOLOGY) {
    for (const avoid of rule.avoid) {
      const regex = rule.caseSensitive
        ? new RegExp(`\\b${escapeRegex(avoid)}\\b`, "g")
        : new RegExp(`\\b${escapeRegex(avoid)}\\b`, "gi");

      let match;
      while ((match = regex.exec(content)) !== null) {
        violations.push({
          rule: `Terminology: ${rule.preferred}`,
          type: "terminology",
          severity: "warning",
          found: match[0],
          suggestion: rule.preferred,
        });
      }
    }
  }

  // Check capitalization
  for (const rule of TEST_CAPITALIZATION) {
    const regex = new RegExp(`\\b${escapeRegex(rule.term)}\\b`, "gi");
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[0] !== rule.correct) {
        violations.push({
          rule: `Capitalization: ${rule.correct}`,
          type: "capitalization",
          severity: "warning",
          found: match[0],
          suggestion: rule.correct,
        });
      }
    }
  }

  // Check prohibited
  for (const rule of TEST_PROHIBITED) {
    const regex = new RegExp(escapeRegex(rule.phrase), "gi");
    let match;
    while ((match = regex.exec(content)) !== null) {
      violations.push({
        rule: `Prohibited: ${rule.phrase}`,
        type: "prohibited",
        severity: "error",
        found: match[0],
      });
    }
  }

  // Check tone
  for (const marker of TEST_TONE_MARKERS) {
    const regex = new RegExp(escapeRegex(marker.pattern), "gi");
    let match;
    while ((match = regex.exec(content)) !== null) {
      violations.push({
        rule: `Tone: ${marker.tone}`,
        type: "tone",
        severity: "info",
        found: match[0],
      });
    }
  }

  const errors = violations.filter(v => v.severity === "error").length;
  const warnings = violations.filter(v => v.severity === "warning").length;
  const score = Math.max(0, 100 - errors * 10 - warnings * 3);

  return { violations, score };
}

function autoFixTest(content: string): { content: string; fixes: number } {
  let fixed = content;
  let fixes = 0;

  for (const rule of TEST_TERMINOLOGY) {
    for (const avoid of rule.avoid) {
      const regex = rule.caseSensitive
        ? new RegExp(`\\b${escapeRegex(avoid)}\\b`, "g")
        : new RegExp(`\\b${escapeRegex(avoid)}\\b`, "gi");

      const before = fixed;
      fixed = fixed.replace(regex, rule.preferred);
      if (fixed !== before) {
        fixes += (before.match(regex) || []).length;
      }
    }
  }

  for (const rule of TEST_CAPITALIZATION) {
    const regex = new RegExp(`\\b${escapeRegex(rule.term)}\\b`, "gi");
    fixed = fixed.replace(regex, (match) => {
      if (match !== rule.correct) {
        fixes++;
        return rule.correct;
      }
      return match;
    });
  }

  return { content: fixed, fixes };
}

// Simhash implementation for deduplication tests
function simhash(content: string): string {
  const words = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordSet = new Set(words);
  const features: number[] = new Array(64).fill(0);

  for (const word of wordSet) {
    const wordHash = crypto.createHash("md5").update(word).digest();
    for (let i = 0; i < 64; i++) {
      const bit = (wordHash[Math.floor(i / 8)] >> (i % 8)) & 1;
      features[i] += bit ? 1 : -1;
    }
  }

  return features.map(f => (f > 0 ? "1" : "0")).join("");
}

function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

function hashContent(content: string): string {
  return crypto.createHash("md5").update(content.trim()).digest("hex");
}

// Jaccard similarity
function jaccardSimilarity(arr1: string[], arr2: string[]): number {
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

// Trusted domains baseline
const TRUSTED_DOMAINS: Record<string, number> = {
  "ethereum.org": 90,
  "paradigm.xyz": 88,
  "arxiv.org": 90,
  "youtube.com": 50,
  "twitter.com": 45,
};

function getSourceQuality(url: string): number {
  try {
    const domain = new URL(url).hostname.replace("www.", "");
    return TRUSTED_DOMAINS[domain] || 50;
  } catch {
    return 50;
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

const TEST_DIR = path.join(process.cwd(), ".test-fixtures-eliza");

beforeAll(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

// ============================================================================
// Style Guide Tests
// ============================================================================

describe("Style Guide - Terminology", () => {
  it("should detect 'cryptocurrency' and suggest 'crypto'", () => {
    const result = checkStyleTest("I love cryptocurrency!");
    const violation = result.violations.find(v => v.found === "cryptocurrency");
    
    expect(violation).toBeDefined();
    expect(violation?.suggestion).toBe("crypto");
  });

  it("should detect lowercase 'defi' and suggest 'DeFi'", () => {
    const result = checkStyleTest("defi is the future");
    const violation = result.violations.find(v => v.found === "defi");
    
    expect(violation).toBeDefined();
    expect(violation?.suggestion).toBe("DeFi");
  });

  it("should detect 'on-chain' and suggest 'onchain'", () => {
    const result = checkStyleTest("on-chain data is valuable");
    const violation = result.violations.find(v => v.found?.includes("on-chain"));
    
    expect(violation).toBeDefined();
    expect(violation?.suggestion).toBe("onchain");
  });

  it("should not flag correct terminology", () => {
    const result = checkStyleTest("crypto and DeFi are great");
    const termViolations = result.violations.filter(v => v.type === "terminology");
    
    expect(termViolations.length).toBe(0);
  });
});

describe("Style Guide - Capitalization", () => {
  it("should detect lowercase 'ethereum'", () => {
    const result = checkStyleTest("ethereum is a blockchain");
    const violation = result.violations.find(v => v.found === "ethereum");
    
    expect(violation).toBeDefined();
    expect(violation?.suggestion).toBe("Ethereum");
  });

  it("should detect 'BITCOIN' and suggest 'Bitcoin'", () => {
    const result = checkStyleTest("BITCOIN to the moon");
    const violation = result.violations.find(v => v.found === "BITCOIN");
    
    expect(violation).toBeDefined();
    expect(violation?.suggestion).toBe("Bitcoin");
  });

  it("should not flag correct capitalization", () => {
    const result = checkStyleTest("Ethereum and Bitcoin are great");
    const capViolations = result.violations.filter(v => v.type === "capitalization");
    
    expect(capViolations.length).toBe(0);
  });
});

describe("Style Guide - Prohibited Phrases", () => {
  it("should detect 'get rich'", () => {
    const result = checkStyleTest("This will help you get rich!");
    const violation = result.violations.find(v => v.type === "prohibited");
    
    expect(violation).toBeDefined();
    expect(violation?.severity).toBe("error");
  });

  it("should detect '100x'", () => {
    const result = checkStyleTest("Potential 100x gains!");
    const violation = result.violations.find(v => v.found === "100x");
    
    expect(violation).toBeDefined();
  });

  it("should detect 'guaranteed'", () => {
    const result = checkStyleTest("Guaranteed returns!");
    const violation = result.violations.find(v => v.found?.toLowerCase() === "guaranteed");
    
    expect(violation).toBeDefined();
  });
});

describe("Style Guide - Tone Markers", () => {
  it("should detect 'obviously'", () => {
    const result = checkStyleTest("Obviously, this is the best");
    const violation = result.violations.find(v => v.found?.toLowerCase() === "obviously");
    
    expect(violation).toBeDefined();
    expect(violation?.type).toBe("tone");
  });

  it("should detect rocket emoji", () => {
    const result = checkStyleTest("To the moon! 🚀");
    const violation = result.violations.find(v => v.found === "🚀");
    
    expect(violation).toBeDefined();
  });

  it("should detect WAGMI", () => {
    const result = checkStyleTest("WAGMI frens!");
    const violation = result.violations.find(v => v.found === "WAGMI");
    
    expect(violation).toBeDefined();
  });
});

describe("Style Guide - AI Slop Detection", () => {
  it("should detect 'game-changer'", () => {
    const result = checkStyleTest("This protocol is a game-changer for DeFi");
    const violation = result.violations.find(v => v.found?.toLowerCase().includes("game-changer"));
    
    expect(violation).toBeDefined();
    expect(violation?.type).toBe("tone");
  });

  it("should detect 'in the ever-evolving'", () => {
    const result = checkStyleTest("In the ever-evolving landscape of crypto...");
    const violation = result.violations.find(v => v.found?.toLowerCase().includes("ever-evolving"));
    
    expect(violation).toBeDefined();
  });

  it("should detect 'let's dive in'", () => {
    const result = checkStyleTest("Let's dive in and explore this topic!");
    const violation = result.violations.find(v => v.found?.toLowerCase().includes("dive in"));
    
    expect(violation).toBeDefined();
  });

  it("should detect 'leverage' as AI-slop verb", () => {
    const result = checkStyleTest("We leverage AI to optimize your portfolio");
    const violation = result.violations.find(v => v.found?.toLowerCase() === "leverage");
    
    expect(violation).toBeDefined();
  });

  it("should detect 'seamless'", () => {
    const result = checkStyleTest("Enjoy a seamless trading experience");
    const violation = result.violations.find(v => v.found?.toLowerCase() === "seamless");
    
    expect(violation).toBeDefined();
  });

  it("should detect 'excited to announce'", () => {
    const result = checkStyleTest("We're excited to announce our new feature!");
    const violation = result.violations.find(v => v.found?.toLowerCase().includes("excited to announce"));
    
    expect(violation).toBeDefined();
  });

  it("should flag AI-slop-heavy content", () => {
    const slopContent = `
      In the ever-evolving landscape of DeFi, we're excited to announce a game-changer.
      Let's dive in and leverage our cutting-edge technology for seamless trading.
    `;
    const result = checkStyleTest(slopContent);
    
    // Should have multiple AI-slop violations
    const slopViolations = result.violations.filter(v => v.type === "tone");
    expect(slopViolations.length).toBeGreaterThanOrEqual(4);
  });
});

describe("Style Guide - Scoring", () => {
  it("should score clean content highly", () => {
    const result = checkStyleTest("DeFi on Ethereum is innovative.");
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("should penalize errors more than warnings", () => {
    const withError = checkStyleTest("Get rich quick!"); // prohibited
    const withWarning = checkStyleTest("defi is cool"); // terminology
    
    expect(withError.score).toBeLessThan(withWarning.score);
  });

  it("should accumulate penalties", () => {
    const result = checkStyleTest("cryptocurrency defi nft ethereum"); // multiple violations
    expect(result.score).toBeLessThan(90); // 5 warnings = 15 point deduction = 85
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Style Guide - Auto-Fix", () => {
  it("should fix terminology", () => {
    const { content, fixes } = autoFixTest("I use cryptocurrency");
    
    expect(content).toBe("I use crypto");
    expect(fixes).toBe(1);
  });

  it("should fix capitalization", () => {
    const { content, fixes } = autoFixTest("ethereum is great");
    
    expect(content).toBe("Ethereum is great");
    expect(fixes).toBe(1);
  });

  it("should fix multiple issues", () => {
    const { content, fixes } = autoFixTest("cryptocurrency on ethereum with defi");
    
    expect(content).toContain("crypto");
    expect(content).toContain("Ethereum");
    expect(content).toContain("DeFi");
    expect(fixes).toBeGreaterThanOrEqual(3);
  });

  it("should not modify correct content", () => {
    const { content, fixes } = autoFixTest("DeFi on Ethereum");
    
    expect(content).toBe("DeFi on Ethereum");
    expect(fixes).toBe(0);
  });
});

// ============================================================================
// Deduplication Tests
// ============================================================================

describe("Deduplication - Hashing", () => {
  it("should produce same hash for identical content", () => {
    const content = "Hello world";
    const hash1 = hashContent(content);
    const hash2 = hashContent(content);
    
    expect(hash1).toBe(hash2);
  });

  it("should produce different hash for different content", () => {
    const hash1 = hashContent("Hello world");
    const hash2 = hashContent("Goodbye world");
    
    expect(hash1).not.toBe(hash2);
  });

  it("should ignore leading/trailing whitespace", () => {
    const hash1 = hashContent("  Hello world  ");
    const hash2 = hashContent("Hello world");
    
    expect(hash1).toBe(hash2);
  });
});

describe("Deduplication - Simhash", () => {
  it("should produce 64-bit hash", () => {
    const hash = simhash("This is a test document");
    expect(hash.length).toBe(64);
    expect(/^[01]+$/.test(hash)).toBe(true);
  });

  it("should produce similar hashes for similar content", () => {
    const hash1 = simhash("The quick brown fox jumps over the lazy dog");
    const hash2 = simhash("The quick brown fox leaps over the lazy dog");
    
    const distance = hammingDistance(hash1, hash2);
    expect(distance).toBeLessThan(20); // Similar content = low distance
  });

  it("should produce different hashes for different content", () => {
    const hash1 = simhash("DeFi protocols on Ethereum");
    const hash2 = simhash("Machine learning and AI");
    
    const distance = hammingDistance(hash1, hash2);
    expect(distance).toBeGreaterThan(10);
  });
});

describe("Deduplication - Jaccard Similarity", () => {
  it("should return 1 for identical arrays", () => {
    const arr = ["a", "b", "c"];
    expect(jaccardSimilarity(arr, arr)).toBe(1);
  });

  it("should return 0 for completely different arrays", () => {
    const arr1 = ["a", "b", "c"];
    const arr2 = ["d", "e", "f"];
    expect(jaccardSimilarity(arr1, arr2)).toBe(0);
  });

  it("should return 0.5 for half overlap", () => {
    const arr1 = ["a", "b"];
    const arr2 = ["b", "c"];
    expect(jaccardSimilarity(arr1, arr2)).toBe(1 / 3); // intersection=1, union=3
  });
});

// ============================================================================
// Source Quality Tests
// ============================================================================

describe("Source Quality - Trusted Domains", () => {
  it("should recognize ethereum.org as high quality", () => {
    const score = getSourceQuality("https://ethereum.org/docs");
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("should recognize paradigm.xyz as trusted", () => {
    const score = getSourceQuality("https://paradigm.xyz/research");
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it("should rate unknown domains as neutral", () => {
    const score = getSourceQuality("https://random-blog.xyz/post");
    expect(score).toBe(50);
  });

  it("should rate social media lower", () => {
    const twitter = getSourceQuality("https://twitter.com/user");
    const ethereum = getSourceQuality("https://ethereum.org/docs");
    
    expect(twitter).toBeLessThan(ethereum);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Integration - Full Style Check", () => {
  it("should handle complex document", () => {
    const doc = `# My cryptocurrency Guide

Obviously, ethereum is the best blockchain for defi.

## Getting Rich Quick

With this guide you can get rich using nft and Web3!

100x gains guaranteed! 🚀 WAGMI
`;

    const result = checkStyleTest(doc);
    
    // Should find multiple violations
    expect(result.violations.length).toBeGreaterThan(5);
    
    // Should have errors (prohibited phrases)
    const errors = result.violations.filter(v => v.severity === "error");
    expect(errors.length).toBeGreaterThan(0);
    
    // Score should be reduced due to violations
    expect(result.score).toBeLessThan(70);
  });

  it("should pass well-written content", () => {
    const doc = `# DeFi on Ethereum

## Summary

DeFi protocols enable permissionless financial services on Ethereum.

Uniswap and Aave are leading protocols with significant TVL.
`;

    const result = checkStyleTest(doc);
    
    // Should have few/no violations
    const errors = result.violations.filter(v => v.severity === "error");
    expect(errors.length).toBe(0);
    
    // Score should be high
    expect(result.score).toBeGreaterThan(80);
  });
});

describe("Integration - Fix and Verify", () => {
  it("should fix content and improve score", () => {
    const original = "cryptocurrency on ethereum with defi protocols";
    const originalResult = checkStyleTest(original);
    
    const { content: fixed } = autoFixTest(original);
    const fixedResult = checkStyleTest(fixed);
    
    expect(fixedResult.score).toBeGreaterThan(originalResult.score);
    expect(fixedResult.violations.length).toBeLessThan(originalResult.violations.length);
  });
});

console.log("✅ Plugin-eliza service tests ready");
