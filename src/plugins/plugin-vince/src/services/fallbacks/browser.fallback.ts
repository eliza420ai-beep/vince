/**
 * Browser Fallback Service
 *
 * Provides simple fetch-based HTML retrieval when plugin-web-search browser automation
 * is not available. This is a lightweight fallback for fetching web pages.
 *
 * Note: This does NOT render JavaScript - it only fetches static HTML.
 * Works for sites that serve content in initial HTML (like MandoMinutes).
 */

import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";

const REQUEST_TIMEOUT_MS = 30_000; // 30 seconds
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  content: string;
  timestamp: number;
}

/**
 * Interface matching the browser service from plugin-web-search
 * Only implements the subset used by plugin-vince
 */
export interface IBrowserService {
  /**
   * Navigate to a URL (fetches the page)
   */
  navigate(
    url: string,
    sessionId?: string,
    options?: {
      retries?: number;
      retryDelay?: number;
      timeout?: number;
    }
  ): Promise<{ success: boolean; content?: string; error?: string }>;

  /**
   * Get page content (returns cached content from last navigate)
   */
  getPageContent(): Promise<string>;

  /**
   * Fetch a page and return its content (simplified interface)
   */
  fetchPage?(url: string): Promise<string | null>;

  /**
   * Browse to a URL (alternative interface)
   */
  browse?(url: string): Promise<{ content?: string; text?: string } | null>;
}

export class BrowserFallbackService implements IBrowserService {
  private cache: Map<string, CacheEntry> = new Map();
  private lastContent: string = "";
  private runtime: IAgentRuntime | null = null;

  constructor(runtime?: IAgentRuntime) {
    this.runtime = runtime ?? null;
    logger.debug("[BrowserFallback] Fallback service initialized (simple fetch, no JS rendering)");
  }

  /**
   * Parse HTML to simplified accessibility-tree-like format
   * This matches the format expected by MandoMinutes parser
   */
  private parseHtmlToAccessibilityFormat(html: string): string {
    const lines: string[] = [];
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch) {
      lines.push(`heading "${titleMatch[1].trim()}"`);
    }

    // Extract headings
    const headingRegex = /<h([1-6])[^>]*>([^<]*)<\/h\1>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null) {
      const level = headingMatch[1];
      const text = headingMatch[2].trim();
      if (text) {
        lines.push(`heading "${text}" (level ${level})`);
      }
    }

    // Extract links with text
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const text = linkMatch[2].trim();
      if (text && text.length > 5) { // Skip tiny navigation links
        lines.push(`link "${text}"`);
      }
    }

    // Extract list items
    const listItemRegex = /<li[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/li>/gi;
    let listMatch;
    while ((listMatch = listItemRegex.exec(html)) !== null) {
      const text = listMatch[1].replace(/<[^>]*>/g, " ").trim();
      if (text && text.length > 10) {
        lines.push(`listitem: ${text.substring(0, 200)}`);
      }
    }

    // Extract paragraph text (first sentence of each)
    const paragraphRegex = /<p[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/p>/gi;
    let paragraphMatch;
    let paragraphCount = 0;
    while ((paragraphMatch = paragraphRegex.exec(html)) !== null && paragraphCount < 50) {
      const text = paragraphMatch[1].replace(/<[^>]*>/g, " ").trim();
      if (text && text.length > 20) {
        lines.push(`text: ${text.substring(0, 300)}`);
        paragraphCount++;
      }
    }

    return lines.join("\n");
  }

  /**
   * Fetch a URL with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options?: {
      retries?: number;
      retryDelay?: number;
      timeout?: number;
    }
  ): Promise<string> {
    const retries = options?.retries ?? 3;
    const retryDelay = options?.retryDelay ?? 2000;
    const timeout = options?.timeout ?? REQUEST_TIMEOUT_MS;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return html;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`Request timed out after ${timeout}ms`);
        }

        if (attempt < retries - 1) {
          logger.debug(`[BrowserFallback] Retry ${attempt + 1}/${retries} for ${url}: ${lastError.message}`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    throw lastError || new Error("Fetch failed");
  }

  /**
   * Navigate to a URL (fetches the page)
   */
  async navigate(
    url: string,
    _sessionId?: string,
    options?: {
      retries?: number;
      retryDelay?: number;
      timeout?: number;
    }
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug(`[BrowserFallback] Using cached content for ${url}`);
      this.lastContent = cached.content;
      return { success: true, content: cached.content };
    }

    try {
      logger.debug(`[BrowserFallback] Fetching ${url}`);
      const html = await this.fetchWithRetry(url, options);
      
      // Parse to accessibility format
      const content = this.parseHtmlToAccessibilityFormat(html);
      
      // Cache the result
      this.cache.set(url, {
        content,
        timestamp: Date.now(),
      });
      
      this.lastContent = content;
      
      logger.debug(`[BrowserFallback] Successfully fetched ${url} (${content.length} chars)`);
      return { success: true, content };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[BrowserFallback] Failed to fetch ${url}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get page content (returns cached content from last navigate)
   */
  async getPageContent(): Promise<string> {
    return this.lastContent;
  }

  /**
   * Fetch a page and return its content (simplified interface)
   */
  async fetchPage(url: string): Promise<string | null> {
    const result = await this.navigate(url);
    return result.success ? result.content || null : null;
  }

  /**
   * Browse to a URL (alternative interface)
   */
  async browse(url: string): Promise<{ content?: string; text?: string } | null> {
    const result = await this.navigate(url);
    if (result.success) {
      return { content: result.content, text: result.content };
    }
    return null;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.lastContent = "";
  }
}
