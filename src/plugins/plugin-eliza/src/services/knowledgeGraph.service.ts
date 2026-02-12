/**
 * Knowledge Graph Service
 *
 * Tracks relationships between knowledge items:
 * - Topic → Topic connections
 * - Source → Topic mappings
 * - Citation/reference links
 * - Conceptual clusters
 *
 * Enables:
 * - "Related content" suggestions
 * - Cross-referencing in essays
 * - Gap detection between related topics
 * - Knowledge clustering for better organization
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "@elizaos/core";

import { getKnowledgeRoot, getCacheRoot } from "../config/paths";

const KNOWLEDGE_ROOT = getKnowledgeRoot();
const GRAPH_PATH = path.join(getCacheRoot(), "knowledge-graph.json");

export interface KnowledgeNode {
  id: string; // filepath relative to knowledge/
  title: string;
  category: string;
  keywords: string[];
  mentions: string[]; // other nodes mentioned in this file
  wordCount: number;
  lastUpdated: string;
}

export interface KnowledgeEdge {
  source: string; // node id
  target: string; // node id
  type: "mentions" | "related" | "similar" | "citation";
  weight: number; // 0-1, strength of connection
  evidence?: string; // why this connection exists
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  clusters: Array<{
    name: string;
    nodeIds: string[];
    coherence: number;
  }>;
  lastBuilt: string;
  stats: {
    totalNodes: number;
    totalEdges: number;
    avgConnections: number;
    isolatedNodes: string[];
  };
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  const keywords = new Set<string>();
  
  // Extract capitalized phrases (proper nouns, titles)
  const properNouns = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  properNouns.forEach(n => {
    if (n.length > 2 && n.length < 30) keywords.add(n.toLowerCase());
  });
  
  // Extract quoted terms
  const quoted = content.match(/"([^"]+)"/g) || [];
  quoted.forEach(q => {
    const term = q.replace(/"/g, "").toLowerCase();
    if (term.length > 2 && term.length < 30) keywords.add(term);
  });
  
  // Extract markdown headers
  const headers = content.match(/^#+\s+(.+)$/gm) || [];
  headers.forEach(h => {
    const text = h.replace(/^#+\s+/, "").toLowerCase();
    keywords.add(text);
  });
  
  // Extract bold/italic terms
  const emphasis = content.match(/\*\*([^*]+)\*\*|\*([^*]+)\*/g) || [];
  emphasis.forEach(e => {
    const term = e.replace(/\*/g, "").toLowerCase();
    if (term.length > 2 && term.length < 30) keywords.add(term);
  });
  
  // Common crypto/tech terms
  const techTerms = content.match(/\b(?:AI|DeFi|NFT|DAO|DEX|CEX|TVL|APY|APR|ETH|BTC|SOL|L1|L2|ZK|EVM|RWA|MEV|AMM|LSD|LST)\b/gi) || [];
  techTerms.forEach(t => keywords.add(t.toUpperCase()));
  
  return Array.from(keywords).slice(0, 30);
}

/**
 * Find mentions of other files in content
 */
function findMentions(content: string, allNodes: KnowledgeNode[]): string[] {
  const mentions: string[] = [];
  const contentLower = content.toLowerCase();
  
  for (const node of allNodes) {
    // Check if this node's title or keywords are mentioned
    if (contentLower.includes(node.title.toLowerCase())) {
      mentions.push(node.id);
      continue;
    }
    
    // Check keywords
    const keywordMatches = node.keywords.filter(k => 
      k.length > 3 && contentLower.includes(k)
    ).length;
    
    if (keywordMatches >= 2) {
      mentions.push(node.id);
    }
  }
  
  return mentions;
}

/**
 * Calculate similarity between two nodes
 */
function calculateSimilarity(node1: KnowledgeNode, node2: KnowledgeNode): number {
  if (node1.id === node2.id) return 0;
  
  let score = 0;
  
  // Same category boost
  if (node1.category === node2.category) {
    score += 0.3;
  }
  
  // Keyword overlap
  const keywords1 = new Set(node1.keywords);
  const keywords2 = new Set(node2.keywords);
  const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
  const union = new Set([...keywords1, ...keywords2]);
  
  if (union.size > 0) {
    score += 0.7 * (intersection.size / union.size);
  }
  
  return Math.min(1, score);
}

/**
 * Build knowledge graph from files
 */
export function buildKnowledgeGraph(): KnowledgeGraph {
  const nodes: KnowledgeNode[] = [];
  const edges: KnowledgeEdge[] = [];
  
  if (!fs.existsSync(KNOWLEDGE_ROOT)) {
    return {
      nodes: [],
      edges: [],
      clusters: [],
      lastBuilt: new Date().toISOString(),
      stats: { totalNodes: 0, totalEdges: 0, avgConnections: 0, isolatedNodes: [] },
    };
  }
  
  // First pass: collect all nodes
  const categories = fs.readdirSync(KNOWLEDGE_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith(".") && !["drafts", "briefs"].includes(d.name));
  
  for (const cat of categories) {
    const catPath = path.join(KNOWLEDGE_ROOT, cat.name);
    const files = fs.readdirSync(catPath).filter(f => f.endsWith(".md"));
    
    for (const file of files) {
      const filePath = path.join(catPath, file);
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const stat = fs.statSync(filePath);
        
        const title = file.replace(".md", "").replace(/[-_]/g, " ");
        const keywords = extractKeywords(content);
        const wordCount = content.split(/\s+/).length;
        
        nodes.push({
          id: `${cat.name}/${file}`,
          title,
          category: cat.name,
          keywords,
          mentions: [], // filled in second pass
          wordCount,
          lastUpdated: stat.mtime.toISOString(),
        });
      } catch (e) {
        logger.debug(`[KnowledgeGraph] Could not read ${filePath}`);
      }
    }
  }
  
  // Second pass: find mentions and build edges
  for (const node of nodes) {
    const filePath = path.join(KNOWLEDGE_ROOT, node.id);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const mentions = findMentions(content, nodes.filter(n => n.id !== node.id));
      node.mentions = mentions;
      
      // Create mention edges
      for (const mentionId of mentions) {
        edges.push({
          source: node.id,
          target: mentionId,
          type: "mentions",
          weight: 0.8,
          evidence: `${node.title} mentions ${mentionId.split("/")[1]}`,
        });
      }
    } catch (e) {
      // Skip
    }
  }
  
  // Third pass: calculate similarity edges
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const similarity = calculateSimilarity(nodes[i], nodes[j]);
      if (similarity > 0.4) {
        edges.push({
          source: nodes[i].id,
          target: nodes[j].id,
          type: "similar",
          weight: similarity,
          evidence: `Keyword overlap: ${nodes[i].keywords.filter(k => nodes[j].keywords.includes(k)).join(", ")}`,
        });
      }
    }
  }
  
  // Build clusters (simple category-based for now)
  const clusters = categories.map(cat => {
    const categoryNodes = nodes.filter(n => n.category === cat.name);
    const nodeIds = categoryNodes.map(n => n.id);
    
    // Calculate coherence (avg similarity within cluster)
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < categoryNodes.length; i++) {
      for (let j = i + 1; j < categoryNodes.length; j++) {
        totalSim += calculateSimilarity(categoryNodes[i], categoryNodes[j]);
        pairs++;
      }
    }
    
    return {
      name: cat.name,
      nodeIds,
      coherence: pairs > 0 ? totalSim / pairs : 0,
    };
  });
  
  // Calculate stats
  const connectionCounts = new Map<string, number>();
  for (const edge of edges) {
    connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
    connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
  }
  
  const isolatedNodes = nodes
    .filter(n => !connectionCounts.has(n.id))
    .map(n => n.id);
  
  const avgConnections = nodes.length > 0
    ? Array.from(connectionCounts.values()).reduce((a, b) => a + b, 0) / nodes.length
    : 0;
  
  const graph: KnowledgeGraph = {
    nodes,
    edges,
    clusters,
    lastBuilt: new Date().toISOString(),
    stats: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      avgConnections: Math.round(avgConnections * 10) / 10,
      isolatedNodes,
    },
  };
  
  // Save graph
  const cacheDir = path.dirname(GRAPH_PATH);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2));
  
  logger.info(`[KnowledgeGraph] Built graph: ${nodes.length} nodes, ${edges.length} edges`);
  
  return graph;
}

/**
 * Load cached graph or build new one
 */
export function loadKnowledgeGraph(maxAge = 3600000): KnowledgeGraph {
  try {
    if (fs.existsSync(GRAPH_PATH)) {
      const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, "utf-8")) as KnowledgeGraph;
      
      // Check if graph is fresh enough
      if (Date.now() - new Date(graph.lastBuilt).getTime() < maxAge) {
        return graph;
      }
    }
  } catch (e) {
    logger.debug("[KnowledgeGraph] Could not load cached graph, rebuilding");
  }
  
  return buildKnowledgeGraph();
}

/**
 * Get related nodes for a given node
 */
export function getRelatedNodes(nodeId: string, limit = 5): Array<{ node: KnowledgeNode; relationship: string; weight: number }> {
  const graph = loadKnowledgeGraph();
  const related: Array<{ node: KnowledgeNode; relationship: string; weight: number }> = [];
  
  // Find edges involving this node
  const relevantEdges = graph.edges.filter(e => e.source === nodeId || e.target === nodeId);
  
  for (const edge of relevantEdges) {
    const relatedId = edge.source === nodeId ? edge.target : edge.source;
    const relatedNode = graph.nodes.find(n => n.id === relatedId);
    
    if (relatedNode) {
      related.push({
        node: relatedNode,
        relationship: edge.type,
        weight: edge.weight,
      });
    }
  }
  
  return related
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

/**
 * Find nodes that should be connected but aren't
 */
export function findMissingConnections(): Array<{ node1: string; node2: string; reason: string }> {
  const graph = loadKnowledgeGraph();
  const missing: Array<{ node1: string; node2: string; reason: string }> = [];
  
  // Find nodes in same category with no edges
  for (const cluster of graph.clusters) {
    if (cluster.nodeIds.length < 2) continue;
    
    for (let i = 0; i < cluster.nodeIds.length; i++) {
      for (let j = i + 1; j < cluster.nodeIds.length; j++) {
        const hasEdge = graph.edges.some(e =>
          (e.source === cluster.nodeIds[i] && e.target === cluster.nodeIds[j]) ||
          (e.source === cluster.nodeIds[j] && e.target === cluster.nodeIds[i])
        );
        
        if (!hasEdge) {
          missing.push({
            node1: cluster.nodeIds[i],
            node2: cluster.nodeIds[j],
            reason: `Same category (${cluster.name}) but no connection`,
          });
        }
      }
    }
  }
  
  return missing.slice(0, 10);
}

export default {
  buildKnowledgeGraph,
  loadKnowledgeGraph,
  getRelatedNodes,
  findMissingConnections,
};
