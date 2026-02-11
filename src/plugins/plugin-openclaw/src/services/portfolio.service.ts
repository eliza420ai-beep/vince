/**
 * OpenClaw Portfolio Service
 * 
 * Track your holdings and get research on your portfolio
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { logger } from "@elizaos/core";

const DATA_DIR = path.resolve(process.cwd(), ".openclaw-data");
const PORTFOLIO_FILE = path.join(DATA_DIR, "portfolio.json");

interface PortfolioHolding {
  token: string;
  amount: number;
  entryPrice?: number;
  addedAt: number;
  notes?: string;
}

interface Portfolio {
  holdings: PortfolioHolding[];
  lastUpdated: number;
}

// Initialize
function initDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Get portfolio
export function getPortfolio(): Portfolio {
  initDataDir();
  if (!existsSync(PORTFOLIO_FILE)) {
    return { holdings: [], lastUpdated: Date.now() };
  }
  try {
    return JSON.parse(readFileSync(PORTFOLIO_FILE, "utf-8"));
  } catch {
    return { holdings: [], lastUpdated: Date.now() };
  }
}

// Save portfolio
export function savePortfolio(portfolio: Portfolio): void {
  initDataDir();
  portfolio.lastUpdated = Date.now();
  writeFileSync(PORTFOLIO_FILE, JSON.stringify(portfolio, null, 2));
}

// Add holding
export function addHolding(token: string, amount: number, entryPrice?: number, notes?: string): PortfolioHolding {
  const portfolio = getPortfolio();
  const existing = portfolio.holdings.find(h => h.token.toLowerCase() === token.toLowerCase());
  
  if (existing) {
    existing.amount += amount;
    if (entryPrice) existing.entryPrice = entryPrice;
    if (notes) existing.notes = notes;
    savePortfolio(portfolio);
    return existing;
  }
  
  const holding: PortfolioHolding = {
    token: token.toUpperCase(),
    amount,
    entryPrice,
    addedAt: Date.now(),
    notes,
  };
  
  portfolio.holdings.push(holding);
  savePortfolio(portfolio);
  logger.info(`[Portfolio] Added ${amount} ${token}`);
  return holding;
}

// Remove holding
export function removeHolding(token: string): boolean {
  const portfolio = getPortfolio();
  const index = portfolio.holdings.findIndex(h => h.token.toLowerCase() === token.toLowerCase());
  
  if (index === -1) return false;
  
  portfolio.holdings.splice(index, 1);
  savePortfolio(portfolio);
  logger.info(`[Portfolio] Removed ${token}`);
  return true;
}

// Update holding
export function updateHolding(token: string, amount: number): PortfolioHolding | null {
  const portfolio = getPortfolio();
  const holding = portfolio.holdings.find(h => h.token.toLowerCase() === token.toLowerCase());
  
  if (!holding) return null;
  
  holding.amount = amount;
  savePortfolio(portfolio);
  return holding;
}

// Format portfolio
export function formatPortfolio(portfolio: Portfolio): string {
  if (portfolio.holdings.length === 0) {
    return `💼 **Portfolio is empty**

Add holdings: \`@VINCE add 10 SOL at 80\``;
  }
  
  const items = portfolio.holdings.map((h, i) => {
    const entry = h.entryPrice ? `@ $${h.entryPrice}` : "";
    return `${i + 1}. **${h.token}**: ${h.amount} ${entry}
   ${h.notes ? `• ${h.notes}` : ""}`;
  }).join("\n\n");
  
  const tokens = portfolio.holdings.map(h => h.token).join(", ");
  
  return `💼 **Portfolio** (${portfolio.holdings.length} tokens)

${items}

---
📊 Research all: \`@VINCE research portfolio\`
Tokens: ${tokens}`;
}

// Get portfolio tokens
export function getPortfolioTokens(): string[] {
  const portfolio = getPortfolio();
  return portfolio.holdings.map(h => h.token);
}

export default {
  getPortfolio,
  savePortfolio,
  addHolding,
  removeHolding,
  updateHolding,
  formatPortfolio,
  getPortfolioTokens,
};
