/**
 * Standard Feature Flag Vocabulary
 * 
 * These are the canonical flags that plugins SHOULD use when declaring capabilities.
 * Using standard flags enables ecosystem-wide discovery and indexing.
 * 
 * Plugins can also define custom flags - these are just the common ones.
 * 
 * Naming convention: kebab-case
 * - "can-X" for actions (can-trade, can-post)
 * - "supports-X" for platforms/chains (supports-solana)
 * - "has-X" for features (has-memory, has-knowledge)
 * - "accepts-X" for inputs (accepts-payments)
 */

/**
 * Standard feature flag categories
 */
export const FLAG_CATEGORIES = {
  /** Trading and DeFi operations */
  TRADING: 'trading',
  
  /** Blockchain and chain-specific features */
  BLOCKCHAIN: 'blockchain',
  
  /** Social media and communication */
  SOCIAL: 'social',
  
  /** Commerce and payments */
  COMMERCE: 'commerce',
  
  /** Memory and knowledge systems */
  MEMORY: 'memory',
  
  /** Media processing (images, audio, video) */
  MEDIA: 'media',
  
  /** Utility and general purpose */
  UTILITY: 'utility',
} as const;

export type FlagCategory = typeof FLAG_CATEGORIES[keyof typeof FLAG_CATEGORIES];

/**
 * Standard feature flags with their descriptions
 */
export const STANDARD_FLAGS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // TRADING
  // ═══════════════════════════════════════════════════════════════════════════
  
  CAN_TRADE: {
    flag: 'can-trade',
    description: 'Can execute trades on supported exchanges',
    category: FLAG_CATEGORIES.TRADING,
  },
  
  CAN_SWAP: {
    flag: 'can-swap',
    description: 'Can swap tokens on DEXs',
    category: FLAG_CATEGORIES.TRADING,
  },
  
  CAN_STAKE: {
    flag: 'can-stake',
    description: 'Can stake tokens for rewards',
    category: FLAG_CATEGORIES.TRADING,
  },
  
  CAN_PROVIDE_LIQUIDITY: {
    flag: 'can-provide-liquidity',
    description: 'Can provide liquidity to pools',
    category: FLAG_CATEGORIES.TRADING,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCKCHAIN
  // ═══════════════════════════════════════════════════════════════════════════
  
  SUPPORTS_SOLANA: {
    flag: 'supports-solana',
    description: 'Has Solana blockchain integration',
    category: FLAG_CATEGORIES.BLOCKCHAIN,
  },
  
  SUPPORTS_ETHEREUM: {
    flag: 'supports-ethereum',
    description: 'Has Ethereum blockchain integration',
    category: FLAG_CATEGORIES.BLOCKCHAIN,
  },
  
  SUPPORTS_BASE: {
    flag: 'supports-base',
    description: 'Has Base (L2) blockchain integration',
    category: FLAG_CATEGORIES.BLOCKCHAIN,
  },
  
  SUPPORTS_POLYGON: {
    flag: 'supports-polygon',
    description: 'Has Polygon blockchain integration',
    category: FLAG_CATEGORIES.BLOCKCHAIN,
  },
  
  SUPPORTS_ARBITRUM: {
    flag: 'supports-arbitrum',
    description: 'Has Arbitrum blockchain integration',
    category: FLAG_CATEGORIES.BLOCKCHAIN,
  },
  
  HAS_WALLET: {
    flag: 'has-wallet',
    description: 'Has wallet management capabilities',
    category: FLAG_CATEGORIES.BLOCKCHAIN,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SOCIAL
  // ═══════════════════════════════════════════════════════════════════════════
  
  HAS_TWITTER: {
    flag: 'has-twitter',
    description: 'Connected to Twitter/X',
    category: FLAG_CATEGORIES.SOCIAL,
  },
  
  HAS_DISCORD: {
    flag: 'has-discord',
    description: 'Connected to Discord',
    category: FLAG_CATEGORIES.SOCIAL,
  },
  
  HAS_TELEGRAM: {
    flag: 'has-telegram',
    description: 'Connected to Telegram',
    category: FLAG_CATEGORIES.SOCIAL,
  },
  
  CAN_POST: {
    flag: 'can-post',
    description: 'Can create social media posts',
    category: FLAG_CATEGORIES.SOCIAL,
  },
  
  CAN_DM: {
    flag: 'can-dm',
    description: 'Can send direct messages',
    category: FLAG_CATEGORIES.SOCIAL,
  },
  
  CAN_FOLLOW: {
    flag: 'can-follow',
    description: 'Can follow/unfollow users',
    category: FLAG_CATEGORIES.SOCIAL,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMERCE
  // ═══════════════════════════════════════════════════════════════════════════
  
  ACCEPTS_PAYMENTS: {
    flag: 'accepts-payments',
    description: 'Can receive payments',
    category: FLAG_CATEGORIES.COMMERCE,
  },
  
  CAN_INVOICE: {
    flag: 'can-invoice',
    description: 'Can create and send invoices',
    category: FLAG_CATEGORIES.COMMERCE,
  },
  
  HAS_COMMERCE: {
    flag: 'has-commerce',
    description: 'Has commerce/survival mechanics',
    category: FLAG_CATEGORIES.COMMERCE,
  },
  
  CAN_QUOTE: {
    flag: 'can-quote',
    description: 'Can provide service quotes',
    category: FLAG_CATEGORIES.COMMERCE,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEMORY
  // ═══════════════════════════════════════════════════════════════════════════
  
  HAS_MEMORY: {
    flag: 'has-memory',
    description: 'Has persistent memory across sessions',
    category: FLAG_CATEGORIES.MEMORY,
  },
  
  HAS_KNOWLEDGE: {
    flag: 'has-knowledge',
    description: 'Has loaded knowledge base',
    category: FLAG_CATEGORIES.MEMORY,
  },
  
  CAN_LEARN: {
    flag: 'can-learn',
    description: 'Can learn from interactions',
    category: FLAG_CATEGORIES.MEMORY,
  },
  
  HAS_HOMEOSTASIS: {
    flag: 'has-homeostasis',
    description: 'Has internal physiological/psychological state management',
    category: FLAG_CATEGORIES.MEMORY,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA
  // ═══════════════════════════════════════════════════════════════════════════
  
  CAN_GENERATE_IMAGES: {
    flag: 'can-generate-images',
    description: 'Can generate images',
    category: FLAG_CATEGORIES.MEDIA,
  },
  
  CAN_TRANSCRIBE: {
    flag: 'can-transcribe',
    description: 'Can transcribe audio to text',
    category: FLAG_CATEGORIES.MEDIA,
  },
  
  CAN_PROCESS_VIDEO: {
    flag: 'can-process-video',
    description: 'Can process video content',
    category: FLAG_CATEGORIES.MEDIA,
  },
  
  CAN_READ_PDF: {
    flag: 'can-read-pdf',
    description: 'Can extract and process PDF content',
    category: FLAG_CATEGORIES.MEDIA,
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  CAN_SEARCH_WEB: {
    flag: 'can-search-web',
    description: 'Can search the web',
    category: FLAG_CATEGORIES.UTILITY,
  },
  
  CAN_BROWSE: {
    flag: 'can-browse',
    description: 'Can browse web pages',
    category: FLAG_CATEGORIES.UTILITY,
  },
  
  CAN_SEND_EMAIL: {
    flag: 'can-send-email',
    description: 'Can send emails',
    category: FLAG_CATEGORIES.UTILITY,
  },
  
  HAS_TEE: {
    flag: 'has-tee',
    description: 'Has Trusted Execution Environment support',
    category: FLAG_CATEGORIES.UTILITY,
  },
} as const;

/**
 * Get all standard flag names
 */
export function getStandardFlagNames(): string[] {
  return Object.values(STANDARD_FLAGS).map((f) => f.flag);
}

/**
 * Get flags by category
 */
export function getFlagsByCategory(category: FlagCategory): typeof STANDARD_FLAGS[keyof typeof STANDARD_FLAGS][] {
  return Object.values(STANDARD_FLAGS).filter((f) => f.category === category);
}

/**
 * Check if a flag is a standard flag
 */
export function isStandardFlag(flag: string): boolean {
  return getStandardFlagNames().includes(flag);
}

/**
 * Get standard flag info by flag name
 */
export function getStandardFlagInfo(flag: string): typeof STANDARD_FLAGS[keyof typeof STANDARD_FLAGS] | undefined {
  return Object.values(STANDARD_FLAGS).find((f) => f.flag === flag);
}

