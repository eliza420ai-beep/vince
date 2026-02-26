#!/usr/bin/env node

/**
 * 🧪 SIMULATE BANDIT LEARNING WITH MOCK TRADES
 *
 * Creates realistic trade outcomes to test Thompson Sampling bandit learning
 * when the web interface isn't accessible.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock bandit state initialization
const PERSISTENCE_DIR = path.join(__dirname, '..', '.elizadb', 'vince-paper-bot');
const BANDIT_STATE_FILE = path.join(PERSISTENCE_DIR, 'weight-bandit-state.json');

// Create mock trade outcomes for testing
const mockTrades = [
  {
    asset: "BTC",
    sources: ["BinanceTopTraders", "CoinGlass", "NewsSentiment"],
    profitable: true,
    pnlPct: 1.8
  },
  {
    asset: "ETH",
    sources: ["NewsSentiment", "MarketRegime", "DeribitIVSkew"],
    profitable: true,
    pnlPct: 2.3
  },
  {
    asset: "SOL",
    sources: ["CoinGlass", "BinanceFundingExtreme", "HyperliquidBias"],
    profitable: false,
    pnlPct: -1.2
  },
  {
    asset: "BTC",
    sources: ["BinanceTopTraders", "MarketRegime"],
    profitable: true,
    pnlPct: 0.9
  },
  {
    asset: "ETH",
    sources: ["DeribitPutCallRatio", "NewsSentiment", "CrossVenueFunding"],
    profitable: false,
    pnlPct: -0.7
  }
];

console.log('🧪 SIMULATING THOMPSON SAMPLING BANDIT LEARNING');
console.log('==============================================');
console.log('');

// Ensure persistence directory exists
if (!fs.existsSync(PERSISTENCE_DIR)) {
  fs.mkdirSync(PERSISTENCE_DIR, { recursive: true });
  console.log('✅ Created persistence directory');
}

// Initialize bandit state
const initialBanditState = {
  sources: {},
  totalOutcomes: 0,
  lastUpdated: Date.now(),
  version: "1.0"
};

// Beta distribution helpers
function initializeSource(source) {
  return {
    alpha: 1,  // Prior success count
    beta: 1,   // Prior failure count
    count: 0,
    lastUpdated: Date.now()
  };
}

function updateSource(sourceData, isWin, pnlPct) {
  const winBonus = Math.min(1.0, Math.abs(pnlPct) / 2.0); // Bonus based on profit
  const lossWeight = Math.min(1.0, Math.abs(pnlPct) / 2.0);

  if (isWin) {
    sourceData.alpha += 1 + winBonus;
  } else {
    sourceData.beta += 1 + lossWeight;
  }

  sourceData.count++;
  sourceData.lastUpdated = Date.now();

  return sourceData;
}

function betaSample(alpha, beta) {
  // Simplified beta sampling for demo
  const mean = alpha / (alpha + beta);
  const variance = (alpha * beta) / ((alpha + beta) ** 2 * (alpha + beta + 1));
  const noise = (Math.random() - 0.5) * Math.sqrt(variance) * 2;
  return Math.max(0, Math.min(1, mean + noise));
}

// Load or initialize bandit state
let banditState;
if (fs.existsSync(BANDIT_STATE_FILE)) {
  banditState = JSON.parse(fs.readFileSync(BANDIT_STATE_FILE, 'utf8'));
  console.log('📊 Loaded existing bandit state');
} else {
  banditState = { ...initialBanditState };
  console.log('🆕 Initializing fresh bandit state');
}

console.log('');
console.log('🔄 SIMULATING TRADES:');
console.log('====================');

// Process mock trades
mockTrades.forEach((trade, i) => {
  console.log(`\\n📊 TRADE ${i + 1}: ${trade.asset} ${trade.profitable ? 'WIN' : 'LOSS'} (${trade.pnlPct > 0 ? '+' : ''}${trade.pnlPct}%)`);
  console.log(`   Sources: ${trade.sources.join(', ')}`);

  // Update each source
  trade.sources.forEach(source => {
    if (!banditState.sources[source]) {
      banditState.sources[source] = initializeSource(source);
      console.log(`   ✨ Initialized new source: ${source}`);
    }

    updateSource(banditState.sources[source], trade.profitable, trade.pnlPct);
  });

  banditState.totalOutcomes++;
  banditState.lastUpdated = Date.now();

  // Show current rankings
  const rankings = Object.entries(banditState.sources)
    .map(([source, data]) => ({
      source,
      winRate: data.alpha / (data.alpha + data.beta) * 100,
      sample: betaSample(data.alpha, data.beta) * 100,
      confidence: data.count
    }))
    .sort((a, b) => b.sample - a.sample);

  console.log('   📈 Current Thompson Samples:');
  rankings.slice(0, 3).forEach((rank, idx) => {
    console.log(`      ${idx + 1}. ${rank.source}: ${rank.sample.toFixed(1)}% weight (${rank.winRate.toFixed(1)}% win rate, ${rank.confidence} trades)`);
  });
});

// Save bandit state
fs.writeFileSync(BANDIT_STATE_FILE, JSON.stringify(banditState, null, 2));
console.log('');
console.log('💾 Saved bandit state to:', BANDIT_STATE_FILE);

// Final analysis
console.log('');
console.log('🎯 FINAL THOMPSON SAMPLING STATE:');
console.log('=================================');

const finalRankings = Object.entries(banditState.sources)
  .map(([source, data]) => ({
    source,
    winRate: data.alpha / (data.alpha + data.beta) * 100,
    sample: betaSample(data.alpha, data.beta) * 100,
    alpha: data.alpha,
    beta: data.beta,
    confidence: data.count
  }))
  .sort((a, b) => b.sample - a.sample);

console.log(`Total Outcomes: ${banditState.totalOutcomes}`);
console.log(`Sources Tracked: ${Object.keys(banditState.sources).length}`);
console.log('');

finalRankings.forEach((rank, i) => {
  const confidenceLevel = rank.confidence >= 3 ? 'HIGH' : rank.confidence >= 2 ? 'MED' : 'LOW';
  console.log(`${(i + 1).toString().padStart(2)}. ${rank.source.padEnd(20)} | Win Rate: ${rank.winRate.toFixed(1)}% | TS Weight: ${rank.sample.toFixed(1)}% | α=${rank.alpha.toFixed(1)} β=${rank.beta.toFixed(1)} | ${confidenceLevel}`);
});

console.log('');
console.log('🔥 BANDIT LEARNING SIMULATION COMPLETE!');
console.log('');
console.log('✅ The monitor should now show:');
console.log('   • ✅ BANDIT STATE ACTIVE');
console.log('   • 🏆 TOP SIGNAL SOURCES rankings');
console.log('   • Real-time Thompson Sampling weights');
console.log('');
console.log('🎯 Run the monitor again to see the bandit learning in action!');