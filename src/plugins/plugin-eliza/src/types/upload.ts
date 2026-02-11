/**
 * Types for UPLOAD action (content ingestion).
 * Kept local so plugin-eliza has no dependency on plugin-vince.
 */

export type KnowledgeCategory =
  | "perps-trading"
  | "options"
  | "defi-metrics"
  | "grinding-the-trenches"
  | "bitcoin-maxi"
  | "altcoins"
  | "solana"
  | "stocks"
  | "commodities"
  | "stablecoins"
  | "macro-economy"
  | "venture-capital"
  | "setup-guides"
  | "internal-docs"
  | "prompt-templates"
  | "privacy"
  | "security"
  | "regulation"
  | "rwa"
  | "substack-essays"
  | "the-good-life"
  | "art-collections"
  | "uncategorized";

export interface IGeneratedKnowledgeFile {
  category: KnowledgeCategory;
  filename: string;
  filepath: string;
  content: string;
  metadata: {
    source: string;
    sourceUrl: string;
    processedAt: string;
    wordCount: number;
    tags: string[];
  };
}

export interface IKnowledgeGenerationResult {
  success: boolean;
  file?: IGeneratedKnowledgeFile;
  files?: IGeneratedKnowledgeFile[];
  error?: string;
}
