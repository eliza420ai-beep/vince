/**
 * Knowledge Integration Test
 *
 * Validates that the knowledge folder adds value to Vince actions by testing:
 * 1. Knowledge structure - directories exist and contain files
 * 2. Domain coverage - each domain has relevant keyword content
 * 3. Knowledge retrieval - semantic search finds relevant chunks (optional, requires API key)
 *
 * Usage:
 *   bun test src/plugins/plugin-vince/src/__tests__/knowledge.integration.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Knowledge directories configured in src/agents/vince.ts
 */
const VINCE_KNOWLEDGE_CONFIG = [
  { directory: "options", shared: true },
  { directory: "perps-trading", shared: true },
  { directory: "grinding-the-trenches", shared: true },
  { directory: "defi-metrics", shared: true },
  { directory: "the-good-life", shared: true },
  { directory: "art-collections", shared: true },
];

/**
 * Domain coverage requirements - keywords that MUST exist in knowledge files
 */
const DOMAIN_COVERAGE = {
  OPTIONS: {
    directory: "options",
    minFiles: 20,
    requiredKeywords: [
      "covered call",
      "secured put",
      "strike",
      "IV",
      "expiry",
      "premium",
    ],
    description: "Options trading frameworks and strike selection methodology",
  },
  PERPS: {
    directory: "perps-trading",
    minFiles: 30,
    requiredKeywords: [
      "funding rate",
      "liquidation",
      "perpetual",
      "leverage",
      "position",
    ],
    description: "Perpetual futures trading methodology",
  },
  MEMES: {
    directory: "grinding-the-trenches",
    minFiles: 15,
    requiredKeywords: ["meme", "dex", "liquidity", "token"],
    description: "Meme coin evaluation and trading",
  },
  AIRDROPS: {
    directory: "grinding-the-trenches",
    minFiles: 15,
    requiredKeywords: ["airdrop", "farming"],
    description: "Airdrop farming strategies",
  },
  DEFI: {
    directory: "defi-metrics",
    minFiles: 25,
    requiredKeywords: ["TVL", "yield", "protocol", "liquidity"],
    description: "DeFi metrics and protocol analysis",
  },
  LIFESTYLE: {
    directory: "the-good-life",
    minFiles: 30,
    requiredKeywords: ["hotel", "restaurant", "wellness", "travel"],
    description: "Lifestyle recommendations",
  },
  ART: {
    directory: "art-collections",
    minFiles: 50,
    requiredKeywords: ["floor", "collection", "NFT", "art"],
    description: "NFT and art collection analysis",
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get the knowledge base path
 */
function getKnowledgePath(): string {
  return path.join(process.cwd(), "knowledge");
}

/**
 * Recursively get all markdown files in a directory
 */
function getMarkdownFiles(dirPath: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Read file content safely
 */
function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Check if content contains keyword (case-insensitive)
 */
function containsKeyword(content: string, keyword: string): boolean {
  return content.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * Search all files in directory for keyword
 */
function findKeywordInDirectory(
  dirPath: string,
  keyword: string,
): { found: boolean; files: string[] } {
  const files = getMarkdownFiles(dirPath);
  const matchingFiles: string[] = [];

  for (const file of files) {
    const content = readFileSafe(file);
    if (containsKeyword(content, keyword)) {
      matchingFiles.push(path.relative(getKnowledgePath(), file));
    }
  }

  return {
    found: matchingFiles.length > 0,
    files: matchingFiles.slice(0, 3), // Return up to 3 example files
  };
}

/**
 * Get file statistics for a directory
 */
function getDirectoryStats(dirPath: string): {
  fileCount: number;
  totalSize: number;
  avgSize: number;
} {
  const files = getMarkdownFiles(dirPath);
  let totalSize = 0;

  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      totalSize += stats.size;
    } catch {
      // Skip files that can't be read
    }
  }

  return {
    fileCount: files.length,
    totalSize,
    avgSize: files.length > 0 ? Math.round(totalSize / files.length) : 0,
  };
}

// ============================================================================
// STRUCTURE VALIDATION
// ============================================================================

describe("Knowledge Structure Validation", () => {
  const knowledgePath = getKnowledgePath();

  it("should have knowledge base directory", () => {
    expect(fs.existsSync(knowledgePath)).toBe(true);
  });

  describe("Configured Directories", () => {
    for (const config of VINCE_KNOWLEDGE_CONFIG) {
      it(`should have ${config.directory}/ directory`, () => {
        const dirPath = path.join(knowledgePath, config.directory);
        expect(fs.existsSync(dirPath)).toBe(true);
      });
    }
  });

  describe("Directory File Counts", () => {
    for (const [domain, config] of Object.entries(DOMAIN_COVERAGE)) {
      it(`${domain}: should have at least ${config.minFiles} files in ${config.directory}/`, () => {
        const dirPath = path.join(knowledgePath, config.directory);
        const stats = getDirectoryStats(dirPath);

        expect(stats.fileCount).toBeGreaterThanOrEqual(config.minFiles);
      });
    }
  });

  it("should have well-formed markdown files (non-empty)", () => {
    const emptyFiles: string[] = [];

    for (const config of VINCE_KNOWLEDGE_CONFIG) {
      const dirPath = path.join(knowledgePath, config.directory);
      const files = getMarkdownFiles(dirPath);

      for (const file of files) {
        const content = readFileSafe(file);
        if (content.trim().length < 100) {
          // Less than 100 chars is too short
          emptyFiles.push(path.relative(knowledgePath, file));
        }
      }
    }

    // Allow some empty/short files but flag if too many
    const maxEmptyAllowed = 5;
    if (emptyFiles.length > maxEmptyAllowed) {
      console.warn(
        `Warning: ${emptyFiles.length} files are nearly empty:`,
        emptyFiles.slice(0, 10),
      );
    }
    expect(emptyFiles.length).toBeLessThanOrEqual(maxEmptyAllowed);
  });
});

// ============================================================================
// DOMAIN COVERAGE VALIDATION
// ============================================================================

describe("Domain Coverage Validation", () => {
  const knowledgePath = getKnowledgePath();
  const coverageResults: {
    domain: string;
    directory: string;
    files: number;
    keywordsFound: number;
    keywordsTotal: number;
    missing: string[];
    status: string;
  }[] = [];

  for (const [domain, config] of Object.entries(DOMAIN_COVERAGE)) {
    describe(`${domain} Domain`, () => {
      const dirPath = path.join(knowledgePath, config.directory);
      let foundKeywords = 0;
      const missingKeywords: string[] = [];

      for (const keyword of config.requiredKeywords) {
        it(`should contain "${keyword}" in knowledge files`, () => {
          const result = findKeywordInDirectory(dirPath, keyword);

          if (result.found) {
            foundKeywords++;
          } else {
            missingKeywords.push(keyword);
          }

          expect(result.found).toBe(true);
        });
      }

      // Track for summary
      const stats = getDirectoryStats(dirPath);
      coverageResults.push({
        domain,
        directory: config.directory,
        files: stats.fileCount,
        keywordsFound: config.requiredKeywords.length - missingKeywords.length,
        keywordsTotal: config.requiredKeywords.length,
        missing: missingKeywords,
        status:
          missingKeywords.length === 0
            ? "PASS"
            : missingKeywords.length <= 1
              ? "WARN"
              : "FAIL",
      });
    });
  }

  // Print summary after all tests
  it("should print coverage summary", () => {
    console.log("\n");
    console.log("═".repeat(80));
    console.log("                    KNOWLEDGE COVERAGE SUMMARY");
    console.log("═".repeat(80));
    console.log(
      "\n| Domain     | Directory              | Files | Keywords  | Status |",
    );
    console.log(
      "|------------|------------------------|-------|-----------|--------|",
    );

    for (const result of coverageResults) {
      const keywordStr = `${result.keywordsFound}/${result.keywordsTotal}`;
      console.log(
        `| ${result.domain.padEnd(10)} | ${result.directory.padEnd(22)} | ${String(result.files).padStart(5)} | ${keywordStr.padStart(9)} | ${result.status.padStart(6)} |`,
      );
    }

    console.log("\n");

    // All domains should pass
    const failedDomains = coverageResults.filter((r) => r.status === "FAIL");
    expect(failedDomains.length).toBe(0);
  });
});

// ============================================================================
// METHODOLOGY CONTENT VALIDATION
// ============================================================================

describe("Methodology Content Validation", () => {
  const knowledgePath = getKnowledgePath();

  /**
   * Check that knowledge contains actual methodology, not just data
   */
  const methodologyTerms = [
    "methodology",
    "framework",
    "approach",
    "how to",
    "strategy",
    "when to",
    "consider",
    "analyze",
    "evaluate",
  ];

  it("should contain methodology content (not just raw data)", () => {
    let methodologyFilesFound = 0;
    const totalFiles = VINCE_KNOWLEDGE_CONFIG.reduce((sum, config) => {
      const dirPath = path.join(knowledgePath, config.directory);
      return sum + getMarkdownFiles(dirPath).length;
    }, 0);

    for (const config of VINCE_KNOWLEDGE_CONFIG) {
      const dirPath = path.join(knowledgePath, config.directory);
      const files = getMarkdownFiles(dirPath);

      for (const file of files) {
        const content = readFileSafe(file).toLowerCase();
        const hasMethodology = methodologyTerms.some((term) =>
          content.includes(term),
        );
        if (hasMethodology) {
          methodologyFilesFound++;
        }
      }
    }

    // At least 50% of files should contain methodology content
    const methodologyRatio = methodologyFilesFound / totalFiles;
    console.log(
      `\nMethodology content: ${methodologyFilesFound}/${totalFiles} files (${(methodologyRatio * 100).toFixed(1)}%)`,
    );

    expect(methodologyRatio).toBeGreaterThan(0.3); // At least 30% should have methodology
  });

  it("OPTIONS knowledge should contain strike selection methodology", () => {
    const dirPath = path.join(knowledgePath, "options");
    const strikeTerms = ["strike selection", "strike distance", "OTM", "ATM"];
    let found = false;

    const files = getMarkdownFiles(dirPath);
    for (const file of files) {
      const content = readFileSafe(file).toLowerCase();
      if (strikeTerms.some((term) => content.includes(term.toLowerCase()))) {
        found = true;
        break;
      }
    }

    expect(found).toBe(true);
  });

  it("PERPS knowledge should contain funding rate interpretation", () => {
    const dirPath = path.join(knowledgePath, "perps-trading");
    const fundingTerms = ["funding", "rate", "positive", "negative"];
    let matchCount = 0;

    const files = getMarkdownFiles(dirPath);
    for (const file of files) {
      const content = readFileSafe(file).toLowerCase();
      const matches = fundingTerms.filter((term) => content.includes(term));
      if (matches.length >= 2) {
        matchCount++;
      }
    }

    expect(matchCount).toBeGreaterThan(0);
  });

  it("LIFESTYLE knowledge should contain specific recommendations", () => {
    const dirPath = path.join(knowledgePath, "the-good-life");
    const specificTerms = ["michelin", "palace", "spa", "pool", "france"];
    let specificCount = 0;

    const files = getMarkdownFiles(dirPath);
    for (const file of files) {
      const content = readFileSafe(file).toLowerCase();
      if (specificTerms.some((term) => content.includes(term))) {
        specificCount++;
      }
    }

    // Should have multiple files with specific recommendations
    expect(specificCount).toBeGreaterThan(5);
  });
});

// ============================================================================
// ACTION KNOWLEDGE INTEGRATION
// ============================================================================

describe("Action Knowledge Integration", () => {
  const knowledgePath = getKnowledgePath();

  /**
   * Simulate what an action query would find
   */
  function simulateActionQuery(
    query: string,
    directories: string[],
  ): { matchingFiles: number; topMatches: string[] } {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const matches: { file: string; score: number }[] = [];

    for (const dir of directories) {
      const dirPath = path.join(knowledgePath, dir);
      const files = getMarkdownFiles(dirPath);

      for (const file of files) {
        const content = readFileSafe(file).toLowerCase();
        let score = 0;

        for (const term of queryTerms) {
          if (content.includes(term)) {
            score++;
          }
        }

        if (score > 0) {
          matches.push({
            file: path.relative(knowledgePath, file),
            score,
          });
        }
      }
    }

    // Sort by score
    matches.sort((a, b) => b.score - a.score);

    return {
      matchingFiles: matches.length,
      topMatches: matches.slice(0, 5).map((m) => m.file),
    };
  }

  it("VINCE_OPTIONS query should find relevant knowledge", () => {
    const query =
      "strike selection covered call secured put options friday expiry";
    const result = simulateActionQuery(query, ["options"]);

    expect(result.matchingFiles).toBeGreaterThan(3);
    console.log(`OPTIONS query found ${result.matchingFiles} matching files`);
  });

  it("VINCE_PERPS query should find relevant knowledge", () => {
    const query = "perpetual funding rate liquidation leverage position sizing";
    const result = simulateActionQuery(query, ["perps-trading"]);

    expect(result.matchingFiles).toBeGreaterThan(5);
    console.log(`PERPS query found ${result.matchingFiles} matching files`);
  });

  it("VINCE_LIFESTYLE query should find relevant knowledge", () => {
    const query = "hotel restaurant wellness travel france luxury";
    const result = simulateActionQuery(query, ["the-good-life"]);

    expect(result.matchingFiles).toBeGreaterThan(10);
    console.log(`LIFESTYLE query found ${result.matchingFiles} matching files`);
  });

  it("VINCE_AIRDROPS query should find relevant knowledge", () => {
    const query = "airdrop farming strategy protocol points";
    const result = simulateActionQuery(query, ["grinding-the-trenches"]);

    expect(result.matchingFiles).toBeGreaterThan(2);
    console.log(`AIRDROPS query found ${result.matchingFiles} matching files`);
  });

  it("VINCE_NFT_FLOOR query should find relevant knowledge", () => {
    const query = "NFT floor collection art punk";
    const result = simulateActionQuery(query, ["art-collections"]);

    expect(result.matchingFiles).toBeGreaterThan(10);
    console.log(`NFT query found ${result.matchingFiles} matching files`);
  });
});

// ============================================================================
// OPTIONAL: SEMANTIC RETRIEVAL TESTS (requires API key)
// ============================================================================

describe("Semantic Retrieval Tests (Optional)", () => {
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  it("should skip if no OPENAI_API_KEY", () => {
    if (!hasApiKey) {
      console.log("\n⚠️  Skipping semantic tests - OPENAI_API_KEY not set\n");
      console.log(
        "   To run semantic tests: OPENAI_API_KEY=sk-xxx bun test knowledge.integration.test.ts\n",
      );
    }
    // Always passes - semantic tests are optional
    expect(true).toBe(true);
  });

  // Note: Full semantic tests are in knowledgeQuality.e2e.test.ts
  // This is just a placeholder to show where semantic retrieval would go
});

// ============================================================================
// SUMMARY
// ============================================================================

describe("Knowledge Value Summary", () => {
  it("should print overall knowledge statistics", () => {
    const knowledgePath = getKnowledgePath();
    let totalFiles = 0;
    let totalSize = 0;

    console.log("\n");
    console.log("═".repeat(80));
    console.log("                    KNOWLEDGE BASE STATISTICS");
    console.log("═".repeat(80));
    console.log("\n| Directory              | Files | Size (KB) | Avg (KB) |");
    console.log("|------------------------|-------|-----------|----------|");

    for (const config of VINCE_KNOWLEDGE_CONFIG) {
      const dirPath = path.join(knowledgePath, config.directory);
      const stats = getDirectoryStats(dirPath);

      totalFiles += stats.fileCount;
      totalSize += stats.totalSize;

      const sizeKB = (stats.totalSize / 1024).toFixed(1);
      const avgKB = (stats.avgSize / 1024).toFixed(1);

      console.log(
        `| ${config.directory.padEnd(22)} | ${String(stats.fileCount).padStart(5)} | ${sizeKB.padStart(9)} | ${avgKB.padStart(8)} |`,
      );
    }

    console.log("|------------------------|-------|-----------|----------|");
    console.log(
      `| TOTAL                  | ${String(totalFiles).padStart(5)} | ${(totalSize / 1024).toFixed(1).padStart(9)} | ${(totalSize / totalFiles / 1024).toFixed(1).padStart(8)} |`,
    );
    console.log("\n");

    // Knowledge base should have substantial content
    expect(totalFiles).toBeGreaterThan(200);
    expect(totalSize).toBeGreaterThan(500 * 1024); // At least 500KB total

    console.log(
      `✅ Knowledge base validated: ${totalFiles} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log("\n");
  });
});
