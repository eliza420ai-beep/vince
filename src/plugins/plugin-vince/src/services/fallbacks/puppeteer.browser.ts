/**
 * Browser Service using agent-browser CLI
 *
 * Native browser automation using the agent-browser CLI tool.
 * This approach is proven to work in plugin-browser-automation.
 *
 * Features:
 * - Uses agent-browser CLI for browser management
 * - JavaScript execution for dynamic content
 * - Smart content waiting (polls until content stabilizes)
 * - Session management
 * - No direct Puppeteer dependency issues
 */

import { logger } from "@elizaos/core";
import { exec } from "child_process";
import { promisify } from "util";
import type { IBrowserService } from "./browser.fallback";

const execAsync = promisify(exec);

const DEFAULT_SESSION_ID = "vince-mando";
const DEFAULT_TIMEOUT = 30000;

export class PuppeteerBrowserService implements IBrowserService {
  private sessionId: string = DEFAULT_SESSION_ID;
  private lastContent: string = "";
  private agentBrowserPath: string = "agent-browser";

  constructor() {
    // Session ID for this instance
    this.sessionId = `vince-${Date.now()}`;
  }

  /**
   * Navigate to a URL
   */
  async navigate(
    url: string,
    _sessionId?: string,
    options?: {
      retries?: number;
      retryDelay?: number;
      timeout?: number;
      waitForSelector?: string;
    },
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const retries = options?.retries ?? 3;
    const retryDelay = options?.retryDelay ?? 2000;

    let lastError = "";

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const command = `${this.agentBrowserPath} open "${url}" --session ${this.sessionId}`;
        logger.debug(
          `[AgentBrowser] Navigating to ${url} (attempt ${attempt}/${retries})`,
        );

        await execAsync(command, { timeout });

        // Wait for content to load
        const content = await this.waitForContent();
        this.lastContent = content;

        logger.debug(`[AgentBrowser] Got content: ${content.length} chars`);

        return { success: true, content };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        lastError = errorMsg;

        // Check if this is a retryable error
        const isRetryable =
          errorMsg.includes("net::ERR_ABORTED") ||
          errorMsg.includes("Execution context was destroyed") ||
          errorMsg.includes("Navigation timeout") ||
          errorMsg.includes("net::ERR_CONNECTION") ||
          errorMsg.includes("ETIMEDOUT");

        if (isRetryable && attempt < retries) {
          logger.debug(
            `[AgentBrowser] Navigation attempt ${attempt}/${retries} failed, retrying in ${retryDelay}ms...`,
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * attempt),
          );
          continue;
        }

        // Only log error on final attempt
        if (attempt === retries) {
          logger.warn(
            `[AgentBrowser] Navigation to ${url} failed after ${retries} attempts: ${errorMsg.split("\n")[0]}`,
          );
        }

        return { success: false, error: lastError };
      }
    }

    return { success: false, error: lastError || "Navigation failed" };
  }

  /**
   * Wait for dynamic content to load
   * Polls the page until content stabilizes
   */
  private async waitForContent(options?: {
    maxWaitMs?: number;
    pollIntervalMs?: number;
    minContentLength?: number;
    minLines?: number;
  }): Promise<string> {
    const maxWaitMs = options?.maxWaitMs ?? 30000;
    const pollIntervalMs = options?.pollIntervalMs ?? 2000;
    const minContentLength = options?.minContentLength ?? 1000;
    const minLines = options?.minLines ?? 10;
    const mustNotContain = ["Loading...", "Loading…"];

    const startTime = Date.now();
    let lastContent = "";
    let stableCount = 0;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const content = await this.getPageTextRaw();

        // Count actual newlines
        const lineCount = (content.match(/\n/g) || []).length + 1;

        // Check if content is still loading
        const stillLoading = mustNotContain.some((s) => content.includes(s));

        // Check minimum length and lines
        const hasMinLength = content.length >= minContentLength;
        const hasMinLines = lineCount >= minLines;

        // Check if content has stabilized
        if (content === lastContent && content.length > 500) {
          stableCount++;
        } else {
          stableCount = 0;
        }
        lastContent = content;

        // Content is ready if stable or meets criteria
        if (
          (!stillLoading && hasMinLength && hasMinLines) ||
          stableCount >= 2
        ) {
          logger.debug(
            `[AgentBrowser] Content ready: ${content.length} chars, ${lineCount} lines after ${Date.now() - startTime}ms`,
          );
          return content;
        }

        logger.debug(
          `[AgentBrowser] Waiting for content... (${content.length} chars, ${lineCount} lines, loading=${stillLoading})`,
        );
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        logger.debug(
          `[AgentBrowser] Error getting content during wait: ${error}`,
        );
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    // Return whatever we have after timeout
    const finalLineCount = (lastContent.match(/\n/g) || []).length + 1;
    logger.warn(
      `[AgentBrowser] Timeout waiting for content, returning current state (${lastContent.length} chars, ${finalLineCount} lines)`,
    );
    return lastContent;
  }

  /**
   * Get raw page text via agent-browser eval
   */
  private async getPageTextRaw(): Promise<string> {
    try {
      const command = `${this.agentBrowserPath} eval "document.body.innerText" --session ${this.sessionId}`;
      const { stdout } = await execAsync(command, { timeout: 10000 });

      // agent-browser eval returns JSON-encoded output
      let text = stdout.trim();

      // Parse if it's JSON string
      if (text.startsWith('"') && text.endsWith('"')) {
        try {
          text = JSON.parse(text);
        } catch (e) {
          // Keep as-is if parse fails
        }
      }

      // Handle literal \n sequences
      if (typeof text === "string" && text.includes("\\n")) {
        text = text
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\r/g, "\r");
      }

      return text;
    } catch (error) {
      logger.debug(`[AgentBrowser] getPageTextRaw failed: ${error}`);
      return "";
    }
  }

  /**
   * Get page content from last navigation
   */
  async getPageContent(): Promise<string> {
    if (this.lastContent) {
      return this.lastContent;
    }

    // Try to get fresh content
    try {
      this.lastContent = await this.getPageTextRaw();
      return this.lastContent;
    } catch (error) {
      logger.debug(`[AgentBrowser] Failed to get page content: ${error}`);
    }

    return "";
  }

  /**
   * Fetch a page and return content (simplified interface)
   */
  async fetchPage(url: string): Promise<string | null> {
    const result = await this.navigate(url);
    return result.success ? result.content || null : null;
  }

  /**
   * Browse to URL (alternative interface)
   */
  async browse(
    url: string,
  ): Promise<{ content?: string; text?: string } | null> {
    const result = await this.navigate(url);
    if (result.success) {
      return { content: result.content, text: result.content };
    }
    return null;
  }

  /**
   * Close browser session
   */
  async close(): Promise<void> {
    try {
      const command = `${this.agentBrowserPath} close --session ${this.sessionId}`;
      await execAsync(command, { timeout: 5000 });
      logger.debug(`[AgentBrowser] Session ${this.sessionId} closed`);
    } catch (error) {
      // Ignore close errors
      logger.debug(`[AgentBrowser] Close error (ignored): ${error}`);
    }

    this.lastContent = "";
  }
}
