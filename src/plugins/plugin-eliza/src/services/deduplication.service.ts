/**
 * Smart Deduplication Service
 *
 * Detects and manages duplicate/similar content in the knowledge base:
 * - Exact duplicates (same content)
 * - Near duplicates (minor differences)
 * - Semantic duplicates (same topic, different wording)
 * - Version conflicts (same file, different sources)
 *
 * Actions:
 * - Identify duplicates
 * - Suggest merges
 * - Auto-archive redundant content
 * - Track content lineage
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { logger } from "@elizaos/core";

import { getKnowledgeRoot, getCacheRoot, ARCHIVE_DIR } from "../config/paths";

const KNOWLEDGE_ROOT = getKnowledgeRoot();
const DEDUPE_STATE_PATH = path.join(getCacheRoot(), "dedupe-state.json");

export interface ContentFingerprint {
  id: string; // filepath
  hash: string; // content hash
  simhash: string; // similarity hash
  wordCount: number;
  firstLine: string;
  keywords: string[];
  createdAt: string;
  modifiedAt: string;
}

export interface DuplicateGroup {
  type: "exact" | "near" | "semantic";
  similarity: number; // 0-1
  files: string[];
  suggestedAction: "merge" | "archive" | "review";
  reason: string;
}

export interface DedupeState {
  lastScan: string;
  fingerprints: ContentFingerprint[];
  duplicateGroups: DuplicateGroup[];
  archived: Array<{
    original: string;
    archived: string;
    date: string;
    reason: string;
  }>;
  stats: {
    totalFiles: number;
    exactDupes: number;
    nearDupes: number;
    semanticDupes: number;
    bytesRecoverable: number;
  };
}

/**
 * Generate content hash
 */
function hashContent(content: string): string {
  return crypto.createHash("md5").update(content.trim()).digest("hex");
}

/**
 * Generate simhash for similarity detection
 * Simplified implementation - in production use proper simhash library
 */
function simhash(content: string): string {
  const words = content
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const wordSet = new Set(words);

  // Create a simple feature hash
  const features: number[] = new Array(64).fill(0);

  for (const word of wordSet) {
    const wordHash = crypto.createHash("md5").update(word).digest();
    for (let i = 0; i < 64; i++) {
      const bit = (wordHash[Math.floor(i / 8)] >> (i % 8)) & 1;
      features[i] += bit ? 1 : -1;
    }
  }

  // Convert to binary string
  return features.map((f) => (f > 0 ? "1" : "0")).join("");
}

/**
 * Calculate hamming distance between two simhashes
 */
function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
}

/**
 * Calculate Jaccard similarity between keyword sets
 */
function jaccardSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  const intersection = new Set([...set1].filter((k) => set2.has(k)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Count word frequencies
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // Return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Generate fingerprint for a file
 */
function fingerprintFile(filePath: string): ContentFingerprint | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const stat = fs.statSync(filePath);
    const relPath = path.relative(KNOWLEDGE_ROOT, filePath);
    const lines = content.split("\n").filter((l) => l.trim());

    return {
      id: relPath,
      hash: hashContent(content),
      simhash: simhash(content),
      wordCount: content.split(/\s+/).length,
      firstLine: lines[0]?.slice(0, 100) || "",
      keywords: extractKeywords(content),
      createdAt: stat.birthtime.toISOString(),
      modifiedAt: stat.mtime.toISOString(),
    };
  } catch (e) {
    return null;
  }
}

/**
 * Find duplicate groups among fingerprints
 */
function findDuplicates(fingerprints: ContentFingerprint[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < fingerprints.length; i++) {
    if (processed.has(fingerprints[i].id)) continue;

    const exactMatches: string[] = [fingerprints[i].id];
    const nearMatches: string[] = [];
    const semanticMatches: string[] = [];

    for (let j = i + 1; j < fingerprints.length; j++) {
      if (processed.has(fingerprints[j].id)) continue;

      const fp1 = fingerprints[i];
      const fp2 = fingerprints[j];

      // Check exact duplicate
      if (fp1.hash === fp2.hash) {
        exactMatches.push(fp2.id);
        processed.add(fp2.id);
        continue;
      }

      // Check near duplicate (simhash distance < 10)
      const distance = hammingDistance(fp1.simhash, fp2.simhash);
      if (distance < 10) {
        nearMatches.push(fp2.id);
        processed.add(fp2.id);
        continue;
      }

      // Check semantic duplicate (high keyword overlap)
      const similarity = jaccardSimilarity(fp1.keywords, fp2.keywords);
      if (similarity > 0.6) {
        semanticMatches.push(fp2.id);
        // Don't mark as processed - might match other semantic groups
      }
    }

    // Create groups
    if (exactMatches.length > 1) {
      groups.push({
        type: "exact",
        similarity: 1.0,
        files: exactMatches,
        suggestedAction: "archive",
        reason: "Identical content - keep newest, archive others",
      });
    }

    if (nearMatches.length > 0) {
      groups.push({
        type: "near",
        similarity: 0.9,
        files: [fingerprints[i].id, ...nearMatches],
        suggestedAction: "merge",
        reason: "Nearly identical content - review and merge",
      });
    }

    if (semanticMatches.length > 0) {
      groups.push({
        type: "semantic",
        similarity: 0.7,
        files: [fingerprints[i].id, ...semanticMatches],
        suggestedAction: "review",
        reason: "Similar topics - may benefit from consolidation",
      });
    }

    processed.add(fingerprints[i].id);
  }

  return groups;
}

/**
 * Run deduplication scan
 */
export function runDedupeScan(): DedupeState {
  const fingerprints: ContentFingerprint[] = [];

  if (!fs.existsSync(KNOWLEDGE_ROOT)) {
    return {
      lastScan: new Date().toISOString(),
      fingerprints: [],
      duplicateGroups: [],
      archived: [],
      stats: {
        totalFiles: 0,
        exactDupes: 0,
        nearDupes: 0,
        semanticDupes: 0,
        bytesRecoverable: 0,
      },
    };
  }

  // Scan all markdown files
  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        scanDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const fp = fingerprintFile(fullPath);
        if (fp) fingerprints.push(fp);
      }
    }
  }

  scanDir(KNOWLEDGE_ROOT);

  // Find duplicates
  const duplicateGroups = findDuplicates(fingerprints);

  // Calculate stats
  let bytesRecoverable = 0;
  for (const group of duplicateGroups) {
    if (group.type === "exact" && group.files.length > 1) {
      // Can recover all but one file
      for (let i = 1; i < group.files.length; i++) {
        const fp = fingerprints.find((f) => f.id === group.files[i]);
        if (fp) {
          try {
            const stat = fs.statSync(path.join(KNOWLEDGE_ROOT, fp.id));
            bytesRecoverable += stat.size;
          } catch (e) {
            // Skip
          }
        }
      }
    }
  }

  const state: DedupeState = {
    lastScan: new Date().toISOString(),
    fingerprints,
    duplicateGroups,
    archived: loadArchivedList(),
    stats: {
      totalFiles: fingerprints.length,
      exactDupes: duplicateGroups
        .filter((g) => g.type === "exact")
        .reduce((sum, g) => sum + g.files.length - 1, 0),
      nearDupes: duplicateGroups
        .filter((g) => g.type === "near")
        .reduce((sum, g) => sum + g.files.length - 1, 0),
      semanticDupes: duplicateGroups
        .filter((g) => g.type === "semantic")
        .reduce((sum, g) => sum + g.files.length - 1, 0),
      bytesRecoverable,
    },
  };

  // Save state
  const cacheDir = path.dirname(DEDUPE_STATE_PATH);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(DEDUPE_STATE_PATH, JSON.stringify(state, null, 2));

  logger.info(
    `[Deduplication] Scan complete: ${fingerprints.length} files, ${duplicateGroups.length} duplicate groups`,
  );

  return state;
}

/**
 * Load archived files list
 */
function loadArchivedList(): DedupeState["archived"] {
  try {
    if (fs.existsSync(DEDUPE_STATE_PATH)) {
      const state = JSON.parse(
        fs.readFileSync(DEDUPE_STATE_PATH, "utf-8"),
      ) as DedupeState;
      return state.archived || [];
    }
  } catch (e) {
    // Ignore
  }
  return [];
}

/**
 * Archive a duplicate file
 */
export function archiveFile(
  filePath: string,
  reason: string,
): { success: boolean; archivePath?: string; error?: string } {
  const fullPath = path.join(KNOWLEDGE_ROOT, filePath);

  if (!fs.existsSync(fullPath)) {
    return { success: false, error: "File not found" };
  }

  // Create archive directory
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  // Generate archive path
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archiveName = `${timestamp}_${path.basename(filePath)}`;
  const archivePath = path.join(ARCHIVE_DIR, archiveName);

  try {
    // Move file to archive
    fs.renameSync(fullPath, archivePath);

    // Update state
    const state = loadDedupeState();
    state.archived.push({
      original: filePath,
      archived: archiveName,
      date: new Date().toISOString(),
      reason,
    });
    fs.writeFileSync(DEDUPE_STATE_PATH, JSON.stringify(state, null, 2));

    logger.info(`[Deduplication] Archived ${filePath} → ${archiveName}`);

    return { success: true, archivePath: `.archive/${archiveName}` };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Load dedupe state
 */
export function loadDedupeState(): DedupeState {
  try {
    if (fs.existsSync(DEDUPE_STATE_PATH)) {
      return JSON.parse(
        fs.readFileSync(DEDUPE_STATE_PATH, "utf-8"),
      ) as DedupeState;
    }
  } catch (e) {
    logger.debug("[Deduplication] No existing state, will scan");
  }

  return runDedupeScan();
}

/**
 * Get duplicate groups without re-scanning (if recent)
 */
export function getDuplicateGroups(maxAge = 3600000): DuplicateGroup[] {
  try {
    if (fs.existsSync(DEDUPE_STATE_PATH)) {
      const state = JSON.parse(
        fs.readFileSync(DEDUPE_STATE_PATH, "utf-8"),
      ) as DedupeState;

      if (Date.now() - new Date(state.lastScan).getTime() < maxAge) {
        return state.duplicateGroups;
      }
    }
  } catch (e) {
    // Ignore
  }

  return runDedupeScan().duplicateGroups;
}

export default {
  runDedupeScan,
  loadDedupeState,
  getDuplicateGroups,
  archiveFile,
  fingerprintFile,
};
