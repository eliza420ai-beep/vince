/**
 * Skill/Capability Detection Utilities
 *
 * WHY THIS MODULE EXISTS:
 * =======================
 * Discovery has sophisticated pattern matching for inferring capabilities
 * from text, action names, and context. This logic is useful beyond just
 * building manifests - other plugins can use it to detect capabilities
 * from conversation.
 *
 * USE CASES:
 * - plugin-skills: Detect and record skills from conversation
 * - plugin-jobsearch: Extract skills from resumes/messages
 * - Any plugin observing user capabilities
 *
 * DETECTION METHODS:
 * 1. KEYWORD MATCHING: "I know TypeScript" → has-skill-typescript
 * 2. CONTEXT CLUES: "built", "years experience" → confidence boost
 * 3. EXCLUSION PATTERNS: "want to learn" → NOT a skill claim
 * 4. ACTION INFERENCE: "swap tokens" → can-trade
 */

import { getStandardFlagInfo, isStandardFlag, STANDARD_FLAGS } from './flags.js';
import type { FeatureFlag } from './types.js';

/**
 * Detection result from capability analysis
 */
export interface CapabilityDetection {
  /** The capability flag detected */
  flag: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Keywords that triggered detection */
  matchedKeywords: string[];
  /** Context clues that boosted confidence */
  matchedContext: string[];
  /** Source of detection */
  source: 'keyword' | 'action' | 'service' | 'explicit';
}

/**
 * Detection rule for a capability
 */
export interface CapabilityRule {
  /** The capability flag */
  flag: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Category for grouping */
  category?: string;
  /** Keywords that indicate this capability */
  keywords: string[];
  /** Context clues that increase confidence */
  contextClues: string[];
  /** Patterns that should exclude detection (e.g., "want to learn") */
  excludePatterns?: string[];
}

/**
 * Built-in capability detection rules
 *
 * WHY DEFINED HERE:
 * These rules capture the semantic patterns that indicate capabilities.
 * They're derived from the standard flags but with detection-specific metadata.
 */
export const CAPABILITY_RULES: CapabilityRule[] = [
  // Trading & Finance
  {
    flag: 'can-trade',
    displayName: 'Trading',
    description: 'Can execute trades',
    category: 'trading',
    keywords: ['trade', 'trading', 'swap', 'exchange', 'buy', 'sell'],
    contextClues: ['executed', 'completed', 'portfolio', 'market'],
  },
  {
    flag: 'can-stake',
    displayName: 'Staking',
    description: 'Can stake assets',
    category: 'trading',
    keywords: ['stake', 'staking', 'unstake', 'validator', 'delegation'],
    contextClues: ['rewards', 'yield', 'apy'],
  },
  {
    flag: 'accepts-payments',
    displayName: 'Accepts Payments',
    description: 'Can receive payments',
    category: 'commerce',
    keywords: ['payment', 'pay', 'accept', 'invoice', 'billing'],
    contextClues: ['processed', 'received', 'completed'],
  },

  // Blockchain
  {
    flag: 'supports-solana',
    displayName: 'Solana',
    description: 'Supports Solana blockchain',
    category: 'blockchain',
    keywords: ['solana', 'sol', 'spl', 'phantom', 'solflare'],
    contextClues: ['wallet', 'token', 'transaction'],
  },
  {
    flag: 'supports-ethereum',
    displayName: 'Ethereum',
    description: 'Supports Ethereum blockchain',
    category: 'blockchain',
    keywords: ['ethereum', 'eth', 'erc20', 'metamask', 'evm'],
    contextClues: ['wallet', 'token', 'contract'],
  },
  {
    flag: 'has-wallet',
    displayName: 'Has Wallet',
    description: 'Has a crypto wallet',
    category: 'blockchain',
    keywords: ['wallet', 'address', 'balance', 'funds'],
    contextClues: ['my wallet', 'send to', 'receive'],
  },

  // Social Media
  {
    flag: 'has-twitter',
    displayName: 'Twitter/X',
    description: 'Has Twitter/X access',
    category: 'social',
    keywords: ['twitter', 'tweet', 'x.com', 'post'],
    contextClues: ['followers', 'engagement', 'viral'],
  },
  {
    flag: 'has-discord',
    displayName: 'Discord',
    description: 'Has Discord access',
    category: 'social',
    keywords: ['discord', 'server', 'channel', 'bot'],
    contextClues: ['moderation', 'members', 'community'],
  },
  {
    flag: 'has-telegram',
    displayName: 'Telegram',
    description: 'Has Telegram access',
    category: 'social',
    keywords: ['telegram', 'tg', 'group', 'channel'],
    contextClues: ['members', 'admin', 'bot'],
  },

  // Content & Media
  {
    flag: 'can-generate-images',
    displayName: 'Image Generation',
    description: 'Can generate images',
    category: 'content',
    keywords: ['generate image', 'create image', 'image generation', 'dall-e', 'midjourney', 'stable diffusion'],
    contextClues: ['art', 'visual', 'illustration'],
  },
  {
    flag: 'can-transcribe',
    displayName: 'Transcription',
    description: 'Can transcribe audio',
    category: 'content',
    keywords: ['transcribe', 'transcription', 'speech-to-text', 'audio'],
    contextClues: ['recording', 'voice', 'speech'],
  },
  {
    flag: 'can-process-video',
    displayName: 'Video Processing',
    description: 'Can process video',
    category: 'content',
    keywords: ['video', 'edit', 'process', 'stream'],
    contextClues: ['footage', 'clip', 'production'],
  },

  // Research & Information
  {
    flag: 'can-search-web',
    displayName: 'Web Search',
    description: 'Can search the web',
    category: 'research',
    keywords: ['search', 'google', 'lookup', 'find', 'research'],
    contextClues: ['online', 'web', 'internet'],
  },
  {
    flag: 'can-browse',
    displayName: 'Web Browsing',
    description: 'Can browse websites',
    category: 'research',
    keywords: ['browse', 'visit', 'website', 'url', 'page'],
    contextClues: ['content', 'scrape', 'read'],
  },
  {
    flag: 'can-read-pdf',
    displayName: 'PDF Reading',
    description: 'Can read PDF documents',
    category: 'research',
    keywords: ['pdf', 'document', 'file'],
    contextClues: ['read', 'extract', 'parse'],
  },

  // Communication
  {
    flag: 'can-send-email',
    displayName: 'Email',
    description: 'Can send emails',
    category: 'communication',
    keywords: ['email', 'mail', 'send', 'inbox'],
    contextClues: ['message', 'reply', 'forward'],
  },
  {
    flag: 'can-dm',
    displayName: 'Direct Messages',
    description: 'Can send direct messages',
    category: 'communication',
    keywords: ['dm', 'direct message', 'private message', 'pm'],
    contextClues: ['send', 'reach out', 'contact'],
  },

  // Security
  {
    flag: 'has-tee',
    displayName: 'TEE',
    description: 'Has Trusted Execution Environment',
    category: 'security',
    keywords: ['tee', 'enclave', 'secure execution', 'attestation'],
    contextClues: ['trusted', 'secure', 'verified'],
  },

  // Programming Skills
  {
    flag: 'has-skill-typescript',
    displayName: 'TypeScript',
    description: 'Knows TypeScript',
    category: 'development',
    keywords: ['typescript', 'ts', 'types', 'interfaces'],
    contextClues: ['years', 'experience', 'built', 'developed'],
    excludePatterns: ['want to learn', 'learning', 'how to'],
  },
  {
    flag: 'has-skill-javascript',
    displayName: 'JavaScript',
    description: 'Knows JavaScript',
    category: 'development',
    keywords: ['javascript', 'js', 'node', 'nodejs'],
    contextClues: ['years', 'experience', 'built', 'developed'],
    excludePatterns: ['want to learn', 'learning', 'how to'],
  },
  {
    flag: 'has-skill-python',
    displayName: 'Python',
    description: 'Knows Python',
    category: 'development',
    keywords: ['python', 'py', 'django', 'flask'],
    contextClues: ['years', 'experience', 'built', 'developed'],
    excludePatterns: ['want to learn', 'learning', 'how to'],
  },
  {
    flag: 'has-skill-solidity',
    displayName: 'Solidity',
    description: 'Knows Solidity',
    category: 'blockchain',
    keywords: ['solidity', 'smart contract', 'evm', 'contracts'],
    contextClues: ['deployed', 'audited', 'wrote'],
    excludePatterns: ['want to learn', 'learning', 'how to'],
  },
  {
    flag: 'has-skill-rust',
    displayName: 'Rust',
    description: 'Knows Rust',
    category: 'development',
    keywords: ['rust', 'cargo', 'rustacean'],
    contextClues: ['years', 'experience', 'built', 'developed'],
    excludePatterns: ['want to learn', 'learning', 'how to'],
  },
];

/**
 * Check if text matches a capability rule
 *
 * @param rule - The rule to check against
 * @param text - The text to analyze
 * @returns Detection result if matched, null otherwise
 */
export function checkCapabilityRule(
  rule: CapabilityRule,
  text: string
): CapabilityDetection | null {
  const lowerText = text.toLowerCase();

  // WHY CHECK EXCLUSIONS FIRST:
  // Fast rejection for patterns that indicate NOT a capability claim
  // "I want to learn TypeScript" shouldn't trigger has-skill-typescript
  if (rule.excludePatterns) {
    for (const exclude of rule.excludePatterns) {
      if (lowerText.includes(exclude.toLowerCase())) {
        return null;
      }
    }
  }

  // Count keyword matches
  const matchedKeywords: string[] = [];
  for (const keyword of rule.keywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

  // No keywords = no detection
  if (matchedKeywords.length === 0) {
    return null;
  }

  // Check context clues for confidence boost
  const matchedContext: string[] = [];
  for (const clue of rule.contextClues) {
    if (lowerText.includes(clue.toLowerCase())) {
      matchedContext.push(clue);
    }
  }

  // Calculate confidence
  // WHY THIS FORMULA:
  // - Base 0.3 for any keyword match
  // - +0.1 per additional keyword (up to 0.6 total from keywords)
  // - +0.1 per context clue (up to 0.35 boost)
  // - Max 0.95 to leave room for "verified" being 1.0
  const keywordConfidence = Math.min(0.6, 0.3 + matchedKeywords.length * 0.1);
  const contextBoost = Math.min(0.35, matchedContext.length * 0.1);
  const confidence = Math.min(0.95, keywordConfidence + contextBoost);

  return {
    flag: rule.flag,
    confidence,
    matchedKeywords,
    matchedContext,
    source: 'keyword',
  };
}

/**
 * Detect all capabilities from text
 *
 * @param text - The text to analyze
 * @param minConfidence - Minimum confidence threshold (default: 0.4)
 * @returns Array of detected capabilities sorted by confidence
 *
 * @example
 * const detections = detectCapabilitiesFromText(
 *   "I have 5 years of TypeScript experience and can trade on Solana"
 * );
 * // Returns:
 * // [
 * //   { flag: 'has-skill-typescript', confidence: 0.7, ... },
 * //   { flag: 'can-trade', confidence: 0.5, ... },
 * //   { flag: 'supports-solana', confidence: 0.5, ... }
 * // ]
 */
export function detectCapabilitiesFromText(
  text: string,
  minConfidence: number = 0.4
): CapabilityDetection[] {
  const results: CapabilityDetection[] = [];

  for (const rule of CAPABILITY_RULES) {
    const detection = checkCapabilityRule(rule, text);
    if (detection && detection.confidence >= minConfidence) {
      results.push(detection);
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Infer capabilities from an action name
 *
 * WHY THIS FUNCTION:
 * Actions often directly indicate capabilities:
 * - "SWAP_TOKENS" → can-trade, can-swap
 * - "POST_TWEET" → has-twitter, can-post
 *
 * @param actionName - The action name to analyze
 * @returns Array of inferred capabilities
 */
export function inferCapabilitiesFromAction(actionName: string): CapabilityDetection[] {
  const name = actionName.toLowerCase();
  const results: CapabilityDetection[] = [];

  // Action patterns and their implied capabilities
  const actionPatterns: { pattern: RegExp; flags: string[] }[] = [
    { pattern: /swap|trade|exchange/i, flags: ['can-trade', 'can-swap'] },
    { pattern: /stake|unstake/i, flags: ['can-stake'] },
    { pattern: /post|tweet/i, flags: ['can-post'] },
    { pattern: /dm|direct.?message/i, flags: ['can-dm'] },
    { pattern: /follow/i, flags: ['can-follow'] },
    { pattern: /generate.*image|image.*generat/i, flags: ['can-generate-images'] },
    { pattern: /search.*web|web.*search/i, flags: ['can-search-web'] },
    { pattern: /send.*email|email/i, flags: ['can-send-email'] },
    { pattern: /browse/i, flags: ['can-browse'] },
    { pattern: /transcribe/i, flags: ['can-transcribe'] },
    { pattern: /quote|pricing/i, flags: ['can-quote'] },
    { pattern: /invoice/i, flags: ['can-invoice'] },
  ];

  for (const { pattern, flags } of actionPatterns) {
    if (pattern.test(name)) {
      for (const flag of flags) {
        const standardInfo = getStandardFlagInfo(flag);
        results.push({
          flag,
          confidence: 0.9, // High confidence from action name
          matchedKeywords: [actionName],
          matchedContext: [],
          source: 'action',
        });
      }
    }
  }

  return results;
}

/**
 * Infer capabilities from a service type
 *
 * WHY THIS FUNCTION:
 * Services indicate platform capabilities:
 * - "twitter" service → has-twitter
 * - "wallet" service → has-wallet
 *
 * @param serviceType - The service type to analyze
 * @returns Array of inferred capabilities
 */
export function inferCapabilitiesFromService(serviceType: string): CapabilityDetection[] {
  const type = serviceType.toLowerCase();
  const results: CapabilityDetection[] = [];

  // Service type to capability mapping
  const serviceToFlags: Record<string, string[]> = {
    commerce: ['accepts-payments', 'has-commerce'],
    wallet: ['has-wallet'],
    transcription: ['can-transcribe'],
    video: ['can-process-video'],
    browser: ['can-browse'],
    pdf: ['can-read-pdf'],
    web_search: ['can-search-web'],
    email: ['can-send-email'],
    tee: ['has-tee'],
    twitter: ['has-twitter'],
    discord: ['has-discord'],
    telegram: ['has-telegram'],
  };

  const matchedFlags = serviceToFlags[type] || [];
  for (const flag of matchedFlags) {
    results.push({
      flag,
      confidence: 0.95, // Very high confidence from service type
      matchedKeywords: [serviceType],
      matchedContext: [],
      source: 'service',
    });
  }

  return results;
}

/**
 * Get a capability rule by flag name
 */
export function getCapabilityRule(flag: string): CapabilityRule | undefined {
  return CAPABILITY_RULES.find((r) => r.flag === flag);
}

/**
 * Get all capability rules in a category
 */
export function getCapabilityRulesByCategory(category: string): CapabilityRule[] {
  return CAPABILITY_RULES.filter((r) => r.category === category);
}

/**
 * Get all capability categories
 */
export function getCapabilityCategories(): string[] {
  const categories = new Set<string>();
  for (const rule of CAPABILITY_RULES) {
    if (rule.category) {
      categories.add(rule.category);
    }
  }
  return Array.from(categories);
}

