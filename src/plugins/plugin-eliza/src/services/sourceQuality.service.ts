/**
 * Source Quality Tracking Service
 *
 * Tracks and scores the quality/reliability of content sources:
 * - Source reputation (domain, author)
 * - Content freshness
 * - Citation frequency
 * - Accuracy history
 * - User feedback
 *
 * Enables:
 * - Prioritize high-quality sources in research
 * - Flag potentially unreliable content
 * - Track content provenance
 * - Improve essay citations
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

const KNOWLEDGE_ROOT = path.resolve(process.cwd(), "knowledge");
const QUALITY_DB_PATH = path.join(process.cwd(), ".openclaw-cache", "source-quality.json");

export interface SourceRecord {
  id: string; // normalized domain or author
  type: "domain" | "author" | "publication" | "youtube";
  name: string;
  url?: string;
  qualityScore: number; // 0-100
  trustLevel: "verified" | "trusted" | "neutral" | "cautious" | "untrusted";
  metrics: {
    contentCount: number; // files from this source
    avgAge: number; // days
    citationCount: number; // times referenced
    userUpvotes: number;
    userDownvotes: number;
    lastIngested: string;
  };
  tags: string[]; // e.g., ["crypto", "defi", "research"]
  notes: string;
  history: Array<{
    date: string;
    event: "ingested" | "cited" | "upvoted" | "downvoted" | "flagged";
    details?: string;
  }>;
}

export interface ContentProvenance {
  fileId: string;
  source: string; // source id
  originalUrl?: string;
  ingestedAt: string;
  ingestedBy: string; // agent name
  transformations: string[]; // e.g., ["summarized", "translated"]
  qualityAtIngestion: number;
}

export interface QualityDatabase {
  sources: SourceRecord[];
  provenance: ContentProvenance[];
  lastUpdated: string;
  stats: {
    totalSources: number;
    avgQuality: number;
    verifiedSources: number;
    untrustedSources: number;
  };
}

// Known high-quality sources (baseline)
const TRUSTED_DOMAINS: Record<string, { score: number; trust: SourceRecord["trustLevel"]; tags: string[] }> = {
  "arxiv.org": { score: 90, trust: "verified", tags: ["research", "academic"] },
  "nature.com": { score: 95, trust: "verified", tags: ["research", "science"] },
  "ethereum.org": { score: 90, trust: "verified", tags: ["crypto", "ethereum"] },
  "docs.solana.com": { score: 88, trust: "verified", tags: ["crypto", "solana"] },
  "vitalik.eth.limo": { score: 92, trust: "verified", tags: ["crypto", "ethereum", "thought-leader"] },
  "a]16z.com": { score: 85, trust: "trusted", tags: ["crypto", "vc", "research"] },
  "paradigm.xyz": { score: 88, trust: "trusted", tags: ["crypto", "defi", "research"] },
  "messari.io": { score: 82, trust: "trusted", tags: ["crypto", "research", "data"] },
  "theblock.co": { score: 75, trust: "trusted", tags: ["crypto", "news"] },
  "coindesk.com": { score: 72, trust: "trusted", tags: ["crypto", "news"] },
  "decrypt.co": { score: 70, trust: "neutral", tags: ["crypto", "news"] },
  "cointelegraph.com": { score: 65, trust: "neutral", tags: ["crypto", "news"] },
  "youtube.com": { score: 50, trust: "neutral", tags: ["video"] }, // varies by channel
  "medium.com": { score: 55, trust: "neutral", tags: ["blog"] }, // varies by author
  "twitter.com": { score: 45, trust: "cautious", tags: ["social"] },
  "x.com": { score: 45, trust: "cautious", tags: ["social"] },
  "reddit.com": { score: 40, trust: "cautious", tags: ["social", "forum"] },
};

/**
 * Extract source from URL
 */
function extractSource(url: string): { domain: string; type: SourceRecord["type"] } {
  try {
    const parsed = new URL(url);
    let domain = parsed.hostname.replace("www.", "");
    
    // Special handling for YouTube
    if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
      return { domain: "youtube.com", type: "youtube" };
    }
    
    // Special handling for Twitter/X
    if (domain === "twitter.com" || domain === "x.com") {
      return { domain: "x.com", type: "domain" };
    }
    
    return { domain, type: "domain" };
  } catch (e) {
    return { domain: url, type: "domain" };
  }
}

/**
 * Calculate quality score for a source
 */
function calculateQualityScore(source: SourceRecord): number {
  let score = 50; // baseline
  
  // Check trusted domains
  const trustedInfo = TRUSTED_DOMAINS[source.id];
  if (trustedInfo) {
    score = trustedInfo.score;
  }
  
  // Adjust based on metrics
  const { contentCount, citationCount, userUpvotes, userDownvotes } = source.metrics;
  
  // More content = more established
  if (contentCount > 10) score += 5;
  if (contentCount > 50) score += 5;
  
  // Citations indicate value
  if (citationCount > 5) score += 5;
  if (citationCount > 20) score += 5;
  
  // User feedback
  const netVotes = userUpvotes - userDownvotes;
  if (netVotes > 5) score += 5;
  if (netVotes < -3) score -= 10;
  if (netVotes < -10) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine trust level from score
 */
function scoreToTrustLevel(score: number): SourceRecord["trustLevel"] {
  if (score >= 85) return "verified";
  if (score >= 70) return "trusted";
  if (score >= 50) return "neutral";
  if (score >= 30) return "cautious";
  return "untrusted";
}

/**
 * Load quality database
 */
export function loadQualityDB(): QualityDatabase {
  try {
    if (fs.existsSync(QUALITY_DB_PATH)) {
      return JSON.parse(fs.readFileSync(QUALITY_DB_PATH, "utf-8")) as QualityDatabase;
    }
  } catch (e) {
    logger.debug("[SourceQuality] No existing database, creating new");
  }
  
  return {
    sources: [],
    provenance: [],
    lastUpdated: new Date().toISOString(),
    stats: { totalSources: 0, avgQuality: 0, verifiedSources: 0, untrustedSources: 0 },
  };
}

/**
 * Save quality database
 */
export function saveQualityDB(db: QualityDatabase): void {
  const cacheDir = path.dirname(QUALITY_DB_PATH);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  // Update stats
  db.stats = {
    totalSources: db.sources.length,
    avgQuality: db.sources.length > 0 
      ? Math.round(db.sources.reduce((sum, s) => sum + s.qualityScore, 0) / db.sources.length)
      : 0,
    verifiedSources: db.sources.filter(s => s.trustLevel === "verified").length,
    untrustedSources: db.sources.filter(s => s.trustLevel === "untrusted").length,
  };
  db.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(QUALITY_DB_PATH, JSON.stringify(db, null, 2));
}

/**
 * Get or create source record
 */
export function getOrCreateSource(url: string): SourceRecord {
  const db = loadQualityDB();
  const { domain, type } = extractSource(url);
  
  let source = db.sources.find(s => s.id === domain);
  
  if (!source) {
    const trustedInfo = TRUSTED_DOMAINS[domain];
    
    source = {
      id: domain,
      type,
      name: domain,
      url: `https://${domain}`,
      qualityScore: trustedInfo?.score || 50,
      trustLevel: trustedInfo?.trust || "neutral",
      metrics: {
        contentCount: 0,
        avgAge: 0,
        citationCount: 0,
        userUpvotes: 0,
        userDownvotes: 0,
        lastIngested: "",
      },
      tags: trustedInfo?.tags || [],
      notes: "",
      history: [],
    };
    
    db.sources.push(source);
    saveQualityDB(db);
  }
  
  return source;
}

/**
 * Record content ingestion
 */
export function recordIngestion(fileId: string, sourceUrl: string, agent = "eliza"): ContentProvenance {
  const db = loadQualityDB();
  const { domain } = extractSource(sourceUrl);
  
  // Update source record
  let source = db.sources.find(s => s.id === domain);
  if (!source) {
    source = getOrCreateSource(sourceUrl);
  }
  
  source.metrics.contentCount++;
  source.metrics.lastIngested = new Date().toISOString();
  source.history.push({
    date: new Date().toISOString(),
    event: "ingested",
    details: fileId,
  });
  
  // Recalculate score
  source.qualityScore = calculateQualityScore(source);
  source.trustLevel = scoreToTrustLevel(source.qualityScore);
  
  // Create provenance record
  const provenance: ContentProvenance = {
    fileId,
    source: domain,
    originalUrl: sourceUrl,
    ingestedAt: new Date().toISOString(),
    ingestedBy: agent,
    transformations: [],
    qualityAtIngestion: source.qualityScore,
  };
  
  db.provenance.push(provenance);
  saveQualityDB(db);
  
  logger.debug(`[SourceQuality] Recorded ingestion: ${fileId} from ${domain} (quality: ${source.qualityScore})`);
  
  return provenance;
}

/**
 * Record user feedback
 */
export function recordFeedback(sourceId: string, type: "upvote" | "downvote" | "flag", details?: string): void {
  const db = loadQualityDB();
  const source = db.sources.find(s => s.id === sourceId);
  
  if (!source) {
    logger.warn(`[SourceQuality] Source not found: ${sourceId}`);
    return;
  }
  
  if (type === "upvote") {
    source.metrics.userUpvotes++;
    source.history.push({ date: new Date().toISOString(), event: "upvoted", details });
  } else if (type === "downvote") {
    source.metrics.userDownvotes++;
    source.history.push({ date: new Date().toISOString(), event: "downvoted", details });
  } else if (type === "flag") {
    source.history.push({ date: new Date().toISOString(), event: "flagged", details });
    source.metrics.userDownvotes += 3; // flags count more
  }
  
  source.qualityScore = calculateQualityScore(source);
  source.trustLevel = scoreToTrustLevel(source.qualityScore);
  
  saveQualityDB(db);
  logger.info(`[SourceQuality] Recorded ${type} for ${sourceId}, new score: ${source.qualityScore}`);
}

/**
 * Get quality report for knowledge base
 */
export function getQualityReport(): {
  summary: string;
  sources: Array<{ id: string; name: string; score: number; trust: string; contentCount: number }>;
  concerns: string[];
  recommendations: string[];
} {
  const db = loadQualityDB();
  
  const sources = db.sources
    .map(s => ({
      id: s.id,
      name: s.name,
      score: s.qualityScore,
      trust: s.trustLevel,
      contentCount: s.metrics.contentCount,
    }))
    .sort((a, b) => b.contentCount - a.contentCount);
  
  const concerns: string[] = [];
  const recommendations: string[] = [];
  
  // Identify concerns
  const untrusted = db.sources.filter(s => s.trustLevel === "untrusted" || s.trustLevel === "cautious");
  if (untrusted.length > 0) {
    concerns.push(`${untrusted.length} sources with low trust ratings`);
    for (const s of untrusted.slice(0, 3)) {
      concerns.push(`  - ${s.name}: ${s.qualityScore}/100 (${s.metrics.contentCount} files)`);
    }
  }
  
  // Check for unverified high-volume sources
  const highVolumeUnverified = db.sources.filter(
    s => s.metrics.contentCount > 5 && s.trustLevel === "neutral"
  );
  if (highVolumeUnverified.length > 0) {
    recommendations.push(`Review ${highVolumeUnverified.length} high-volume neutral sources for trust upgrade`);
  }
  
  // Check for stale content
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString();
  const stale = db.sources.filter(
    s => s.metrics.lastIngested && s.metrics.lastIngested < sixMonthsAgo
  );
  if (stale.length > 0) {
    recommendations.push(`${stale.length} sources haven't been updated in 6+ months`);
  }
  
  // General recommendations
  if (db.stats.verifiedSources < 3) {
    recommendations.push("Add more content from verified sources (arxiv, ethereum.org, etc.)");
  }
  
  const summary = `${db.stats.totalSources} sources tracked | Avg quality: ${db.stats.avgQuality}/100 | ${db.stats.verifiedSources} verified, ${db.stats.untrustedSources} untrusted`;
  
  return { summary, sources, concerns, recommendations };
}

/**
 * Get provenance for a file
 */
export function getProvenance(fileId: string): ContentProvenance | null {
  const db = loadQualityDB();
  return db.provenance.find(p => p.fileId === fileId) || null;
}

/**
 * Scan knowledge base and update quality records
 */
export function scanAndUpdateQuality(): { updated: number; newSources: number } {
  const db = loadQualityDB();
  let updated = 0;
  let newSources = 0;
  
  if (!fs.existsSync(KNOWLEDGE_ROOT)) {
    return { updated: 0, newSources: 0 };
  }
  
  // Scan for source references in files
  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          
          // Extract URLs from content
          const urls = content.match(/https?:\/\/[^\s\)>\]]+/g) || [];
          for (const url of urls) {
            const existing = db.sources.find(s => url.includes(s.id));
            if (!existing) {
              getOrCreateSource(url);
              newSources++;
            }
          }
          updated++;
        } catch (e) {
          // Skip
        }
      }
    }
  }
  
  scanDir(KNOWLEDGE_ROOT);
  
  logger.info(`[SourceQuality] Scan complete: ${updated} files, ${newSources} new sources`);
  
  return { updated, newSources };
}

export default {
  loadQualityDB,
  saveQualityDB,
  getOrCreateSource,
  recordIngestion,
  recordFeedback,
  getQualityReport,
  getProvenance,
  scanAndUpdateQuality,
};
