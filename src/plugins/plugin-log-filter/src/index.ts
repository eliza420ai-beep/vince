/**
 * Log Filter Plugin
 *
 * Suppresses verbose logs that clutter the terminal, specifically:
 * - MCP tool schema definitions (JSON schemas, response formats, etc.)
 * - Verbose API documentation in logs
 * - Known non-blocking MESSAGE-BUS / central_messages errors (see ISSUES.md)
 *
 * This plugin wraps the logger to filter out noisy but non-critical log messages.
 */

import type { Plugin, IAgentRuntime } from '@elizaos/core';
import { logger as coreLogger } from '@elizaos/core';

/** Known MESSAGE-BUS/central_messages errors we suppress. Non-blocking for UI delivery. */
const SUPPRESS_ERROR_PATTERNS = [
  /\[HTTP\].*Error submitting agent message/i,
  /\[SERVICE:MESSAGE-BUS\].*Error sending response to central server/i,
  /Failed query:.*insert into "central_messages"/i,
  /\[PLUGIN:SQL\].*Max retry attempts reached.*central_messages/i,
  // Transient SQL retries (rooms, participants, etc.) - plugin retries and typically succeeds
  /\[PLUGIN:SQL\].*Database operation failed, retrying/i,
  // Failed query (participants, rooms) - common with direct/DM chat, retries usually succeed
  /Failed query:.*participants.*room_id/i,
  /Failed query:.*select.*from "rooms"/i,
  // BatchEmbeddings 500 - transient embedding API errors, chat still works (degraded RAG)
  /\[BatchEmbeddings\].*API error: 500/i,
  /Cannot map room\/world to central IDs/i,
  /MESSAGE-BUS.*(?:room|world).*mapping/i,
  // Server/World ID warnings - expected for direct client (no Discord/Telegram server)
  /No server ID found for room/i,
  /No server ID found for world/i,
  // ElizaOS 1.7.2 framework noise: empty action lookup after callback-based actions complete
  // This happens when multi-step template returns isFinish: true with action: "" - expected behavior
  /\[AGENT\].*Action not found.*action=""/i,
  // Settings provider errors - expected for DM/direct clients without world context
  // These are normal in non-Discord/Telegram environments and are handled gracefully by the provider
  /\[PLUGIN:BOOTSTRAP:PROVIDER:SETTINGS\].*No world found/i,
  /\[PLUGIN:BOOTSTRAP:PROVIDER:SETTINGS\].*Critical error in settings provider/i,
  /No server ownership found for onboarding/i,
  /No world found for user during onboarding/i,
  /Critical error in settings provider.*No server ownership/i,
];

function shouldSuppressError(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  return SUPPRESS_ERROR_PATTERNS.some((p) => p.test(message));
}

/** Deribit noise suppression - 429 rate limits, SOL-PERPETUAL, general API errors */
function shouldSuppressDeribitNoise(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  // SOL-PERPETUAL 400 errors - we skip that instrument
  if (/SOL-PERPETUAL/i.test(message) && /Deribit|get_funding_rate_value|ticker/i.test(message)) return true;
  // Deribit 429 rate limiting - expected under load, handled gracefully
  if (/VinceDeribitService.*API error.*429/i.test(message)) return true;
  if (/\[VinceDeribitService\].*status=429/i.test(message)) return true;
  // General Deribit rate limit noise
  if (/Deribit.*rate.*limit/i.test(message)) return true;
  return false;
}

/** Suppress expected "missing API key" warnings - these are informational, not errors */
function shouldSuppressMissingApiKeyWarning(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  // These are expected notices, not actionable warnings
  if (/No API key.*using free alternatives/i.test(message)) return true;
  if (/No OpenSea API key.*limited functionality/i.test(message)) return true;
  if (/SECRET_SALT is not set/i.test(message)) return true;
  if (/Invalid input format for embedding/i.test(message)) return true;
  // HTTP auth disabled notice - expected for local dev
  if (/Authentication middleware configured.*API Key: DISABLED/i.test(message)) return true;
  // AI SDK model compatibility - frequencyPenalty/presencePenalty not supported by some models (harmless)
  if (/frequencyPenalty.*not supported/i.test(message)) return true;
  if (/presencePenalty.*not supported/i.test(message)) return true;
  if (/AI SDK Warning/i.test(message) && /not supported by this model/i.test(message)) return true;
  return false;
}

/** OpenSea 401 / NFT floor - expected when OPENSEA_API_KEY is unset; plugin logs once and returns empty data */
function shouldSuppressOpenSeaNoise(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  if (/\[OpenSeaFallback\].*HTTP error: 401/i.test(message)) return true;
  if (/\[OpenSeaFallback\].*analyzeFloorOpportunities error/i.test(message)) return true;
  if (/\[VinceNFTFloor\].*Empty floor price for/i.test(message)) return true;
  return false;
}

/** Server ownership warnings - expected for direct client (no Discord/Telegram) */
const SUPPRESS_INFO_PATTERNS = [
  /No server ownership found for user/i,
  /after recovery attempt/i,
];

/** Routine startup / init Info logs – keep terminal focused on boxes, warnings, errors. Set VINCE_QUIET=false to show. */
const SUPPRESS_ROUTINE_INFO_PATTERNS = [
  /\[TrainONNX\]/i,
  /\[PLUGIN:SQL\].*Migration|Initializing migration|No changes detected|Migration completed|All migrations|Skipping RLS|DatabaseMigrationService/i,
  /\[PLUGIN:SQL\]\s*(Initializing|Starting|Migration)/i,
  /\[PLUGIN:BOOTSTRAP:SERVICE:EMBEDDING\]/i,
  /\[HyperliquidFallback\].*initialized/i,
  /\[VinceCoinGecko\].*Dashboard loaded/i,
  /\[VinceSignalAggregator\].*initialized|Service initialized/i,
  /\[VinceTopTraders\].*Loaded.*wallets/i,
  /\[VinceNewsSentiment\].*initialized|Service initialized/i,
  /\[VinceMeteora\].*started|✅/i,
  /\[VinceBinanceLiq\].*Connecting/i,
  /\[VinceMarketRegime\].*initialized/i,
  /\[VinceHIP3\].*initialized/i,
  /\[VinceWatchlist\].*Loaded|started/i,
  /\[VinceAlert\].*started/i,
  /\[VinceTradeJournal\].*started/i,
  /\[VinceGoalTracker\].*started|Daily Target/i,
  /\[VincePositionManager\].*started/i,
  /\[VincePaperTrading\].*State restored|started/i,
  /\[VinceImprovementJournal\].*Found|started/i,
  /\[VinceFeatureStore\].*Supabase|Initialized|storing features/i,
  /\[WeightBandit\].*Thompson Sampling|initialized/i,
  /\[SignalSimilarity\].*Embedding-based|initialized/i,
  /\[VINCE\].*Agent initialized|Plugin initialized/i,
  /\[Eliza\].*24\/7 research|ready/i,
  /\[VinceParameterTuner\].*started/i,
  /\[AGENT\].*Successfully registered|Auto-associated/i,
  /\[SERVICE:MESSAGE-BUS\].*Subscribing|Fetched channels|Loaded valid channel|Agent subscribed/i,
  /\[LogFilter\].*Logger filter active/i,
  // Pino may prefix with agent context
  /#(VINCE|Eliza)\s+\[PLUGIN:BOOTSTRAP:SERVICE:EMBEDDING\]/i,
];

// Patterns to suppress (case-insensitive) - comprehensive list
const SUPPRESS_PATTERNS = [
    // CoinGecko MCP tool messages - catch ALL get_* patterns
    /\[coingecko\].*get_.*:/i,
    /\[coingecko\].*get_/i,
    /coingecko.*tool/i,
    // Schema patterns - comprehensive
    /response schema/i,
    /json schema/i,
    /Response Schema/i,
    /additionalProperties/i,
    /"type":\s*"(object|array|string|number|boolean|integer)"/i,
    /type.*object/i,
    /type.*array/i,
    /type.*string/i,
    /type.*number/i,
    /type.*integer/i,
    /description.*endpoint/i,
    // jq_filter and performance recommendations
    /jq_filter/i,
    /when using this tool/i,
    /always use.*jq_filter/i,
    /reduce.*response.*size/i,
    /improve.*performance/i,
    // Endpoint descriptions
    /this endpoint allows you/i,
    /this endpoint/i,
    /allows you to.*query/i,
    /query.*token.*price/i,
    /query.*supported.*currencies/i,
    /query.*trades.*24.*hours/i,
    /query.*last.*300.*trades/i,
    // Schema field definitions - comprehensive
    /block_number.*integer/i,
    /block_timestamp.*string/i,
    /from_token_address.*string/i,
    /pool_address.*string/i,
    /pool_dex.*string/i,
    /price_from_in_usd.*string/i,
    /from_token_amount.*string/i,
    /to_token.*string/i,
    /attributes.*object/i,
    /items.*array/i,
    /properties.*object/i,
    // Info tags
    /^Info\s*\[/i,
    /^Info:/i,
];

/** Quiet mode: suppress routine startup/info noise. Default true. Set VINCE_QUIET=false for verbose. */
function isQuietMode(): boolean {
  return process.env.VINCE_QUIET !== 'false';
}

// Check if a log message should be suppressed
function shouldSuppress(message: string): boolean {
    // Only suppress info-level verbose documentation
    // Keep errors, warnings, and important info
    if (!message || message.length < 20) return false;

    // Routine startup/info noise – keep terminal focused on boxes, warnings, errors
    if (isQuietMode() && SUPPRESS_ROUTINE_INFO_PATTERNS.some((p) => p.test(message))) {
        return true;
    }

    // Check for server ownership info patterns (direct client noise)
    if (SUPPRESS_INFO_PATTERNS.some(pattern => pattern.test(message))) {
        return true;
    }
    
    // Aggressive: Any message >300 chars with schema-like content (lowered threshold)
    if (message.length > 300) {
        const schemaIndicators = [
            '"type":', 'additionalProperties', 'Response Schema', 'response schema',
            'json schema', 'JSON Schema', 'schema', 'Schema'
        ];
        if (schemaIndicators.some(indicator => message.includes(indicator))) {
            return true;
        }
    }
    
    // Check against suppression patterns
    if (SUPPRESS_PATTERNS.some(pattern => pattern.test(message))) {
        return true;
    }
    
    // Check if message contains multiple JSON schema-like patterns (lowered threshold)
    const schemaPatternCount = (message.match(/"type":\s*"[^"]*"/gi) || []).length;
    if (schemaPatternCount >= 2) { // Lowered from 3 to 2
        return true; // Likely a full schema definition
    }
    
    // Check for object/array structure patterns
    if (message.includes('"properties":') || message.includes('"items":')) {
        return true;
    }
    
    // Check if it's a multi-line schema dump
    if (message.includes('\n') && schemaPatternCount >= 1) {
        return true; // Multi-line with type patterns = likely schema
    }
    
    return false;
}

function buildFullMessage(message: any, args: any[]): string {
  let messageStr: string;
  if (typeof message === 'string') {
    messageStr = message;
  } else if (typeof message === 'object' && message !== null) {
    messageStr = JSON.stringify({ message, args });
  } else {
    messageStr = String(message);
  }
  if (args.length === 0) return messageStr;
  return messageStr + ' ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
}

// Original logger methods (will be stored)
let originalInfo: typeof coreLogger.info;
let originalDebug: typeof coreLogger.debug;
let originalError: typeof coreLogger.error;
let originalWarn: typeof coreLogger.warn;

// Track if we've already patched
let isPatched = false;

/** AI SDK and similar libs log to console.warn directly - suppress known harmless model warnings */
function shouldSuppressConsoleWarn(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  if (/frequencyPenalty.*not supported/i.test(message)) return true;
  if (/presencePenalty.*not supported/i.test(message)) return true;
  if (/AI SDK Warning/i.test(message) && /not supported by this model/i.test(message)) return true;
  return false;
}

export const logFilterPlugin: Plugin = {
    name: 'log-filter',
    description: 'Filters verbose logs to keep terminal output clean',
    
    init: async (_config: Record<string, string>, _runtime: IAgentRuntime) => {
        // Only patch once globally
        if (isPatched) {
            coreLogger.debug('[LogFilter] Already patched, skipping');
            return;
        }
        
        // Store original methods
        originalInfo = coreLogger.info.bind(coreLogger);
        originalDebug = coreLogger.debug.bind(coreLogger);
        originalError = coreLogger.error.bind(coreLogger);
        originalWarn = coreLogger.warn.bind(coreLogger);
        
        // Wrap info method
        coreLogger.info = function(message: any, ...args: any[]) {
            const fullMessage = buildFullMessage(message, args);
            if (!shouldSuppress(fullMessage)) {
                originalInfo(message, ...args);
            } else if (process.env.LOG_LEVEL === 'debug') {
                originalDebug('[LogFilter] Suppressed:', fullMessage.substring(0, 150) + '...');
            }
        } as typeof coreLogger.info;
        
        // Wrap debug method - also filter verbose schemas in debug mode
        coreLogger.debug = function(message: any, ...args: any[]) {
            const fullMessage = buildFullMessage(message, args);
            if (!shouldSuppress(fullMessage)) {
                originalDebug(message, ...args);
            }
        } as typeof coreLogger.debug;
        
        // Wrap error – suppress known MESSAGE-BUS/central_messages noise (non-blocking for UI)
        coreLogger.error = function(message: any, ...args: any[]) {
            const fullMessage = buildFullMessage(message, args);
            if (shouldSuppressError(fullMessage) || shouldSuppressOpenSeaNoise(fullMessage)) {
                if (process.env.LOG_LEVEL === 'debug') {
                    originalDebug('[LogFilter] Suppressed error (MESSAGE-BUS/central_messages/OpenSea):', fullMessage.substring(0, 120) + '...');
                }
                return;
            }
            originalError(message, ...args);
        } as typeof coreLogger.error;
        
        // Wrap warn – MESSAGE-BUS/central_messages + Deribit noise + missing API keys + OpenSea empty floors
        coreLogger.warn = function(message: any, ...args: any[]) {
            const fullMessage = buildFullMessage(message, args);
            if (shouldSuppressError(fullMessage) || shouldSuppressDeribitNoise(fullMessage) || shouldSuppressMissingApiKeyWarning(fullMessage) || shouldSuppressOpenSeaNoise(fullMessage)) {
                if (process.env.LOG_LEVEL === 'debug') {
                    originalDebug('[LogFilter] Suppressed warn:', fullMessage.substring(0, 120) + '...');
                }
                return;
            }
            originalWarn(message, ...args);
        } as typeof coreLogger.warn;
        
        // Patch console.warn for AI SDK and other libs that bypass the logger
        const originalConsoleWarn = console.warn;
        console.warn = function (...args: unknown[]) {
            const msg = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
            if (shouldSuppressConsoleWarn(msg)) {
                if (process.env.LOG_LEVEL === 'debug') {
                    originalConsoleWarn('[LogFilter] Suppressed console.warn:', msg.substring(0, 80) + '...');
                }
                return;
            }
            originalConsoleWarn.apply(console, args);
        };

        isPatched = true;
        coreLogger.info('[LogFilter] ✅ Logger filter active - suppressing MCP schemas, MESSAGE-BUS/SQL/embedding noise, AI SDK warnings');
    },
};

export default logFilterPlugin;
