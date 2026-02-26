#!/usr/bin/env node

/**
 * Thompson Sampling Bandit Algorithm Demo
 *
 * Shows how VINCE adaptively learns signal source weights based on trade outcomes.
 * Each signal source is modeled as a Beta distribution (success/failure).
 * The algorithm samples from these distributions to weight signal sources dynamically.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Beta distribution sampling (Thompson Sampling core)
function betaSample(alpha, beta) {
  // Simple approximation for demo - in production we'd use proper gamma sampling
  const x = Math.random();
  const y = Math.random();

  // Beta approximation using two uniform samples
  const logX = Math.log(x) / alpha;
  const logY = Math.log(y) / beta;

  return Math.exp(logX) / (Math.exp(logX) + Math.exp(logY));
}

// Initialize signal source priors (Alpha=1, Beta=1 = uniform prior)
const signalSources = {
  'BinanceTopTraders': { alpha: 1, beta: 1, totalTrades: 0 },
  'CoinGlass': { alpha: 1, beta: 1, totalTrades: 0 },
  'BinanceFundingExtreme': { alpha: 1, beta: 1, totalTrades: 0 },
  'NewsSentiment': { alpha: 1, beta: 1, totalTrades: 0 },
  'DeribitIVSkew': { alpha: 1, beta: 1, totalTrades: 0 },
  'MarketRegime': { alpha: 1, beta: 1, totalTrades: 0 },
  'HyperliquidBias': { alpha: 1, beta: 1, totalTrades: 0 },
  'DeribitPutCallRatio': { alpha: 1, beta: 1, totalTrades: 0 },
  'BinanceTakerFlow': { alpha: 1, beta: 1, totalTrades: 0 },
  'BinanceLongShort': { alpha: 1, beta: 1, totalTrades: 0 },
  'CrossVenueFunding': { alpha: 1, beta: 1, totalTrades: 0 },
  'HIP3Momentum': { alpha: 1, beta: 1, totalTrades: 0 },
  'HIP3OIBuild': { alpha: 1, beta: 1, totalTrades: 0 },
  'HIP3PriceAction': { alpha: 1, beta: 1, totalTrades: 0 },
  'HIP3Funding': { alpha: 1, beta: 1, totalTrades: 0 },
  'LiquidationCascade': { alpha: 1, beta: 1, totalTrades: 0 }
};

console.log('🎯 THOMPSON SAMPLING BANDIT LEARNING DEMO');
console.log('==========================================');
console.log('');

// Load completed trades
const demoFile = path.join(__dirname, '..', 'data', 'thompson-sampling-demo.jsonl');
const trades = [];

if (fs.existsSync(demoFile)) {
  const lines = fs.readFileSync(demoFile, 'utf8').trim().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      trades.push(JSON.parse(line));
    }
  }
}

console.log(`📊 Processing ${trades.length} completed trades for bandit learning...`);
console.log('');

// Process trades chronologically to show learning progression
trades.forEach((trade, idx) => {
  console.log(`🔄 TRADE ${idx + 1}/${trades.length}: ${trade.asset} ${trade.direction.toUpperCase()} → ${trade.outcome}`);
  console.log(`   Signals: ${trade.sourceClusters.join(', ')}`);
  console.log(`   P&L: ${trade.pnlPct > 0 ? '+' : ''}${trade.pnlPct}% | Confidence: ${trade.confidence}%`);
  console.log(`   Reason: ${trade.reason}`);

  // Update signal source statistics
  const isWin = trade.outcome === 'WIN';

  trade.sourceClusters.forEach(source => {
    if (signalSources[source]) {
      signalSources[source].totalTrades++;
      if (isWin) {
        signalSources[source].alpha++;
      } else {
        signalSources[source].beta++;
      }
    }
  });

  // Show top 5 signal sources after this trade
  const sourceRankings = Object.entries(signalSources)
    .filter(([_, data]) => data.totalTrades > 0)
    .map(([source, data]) => {
      const winRate = data.alpha / (data.alpha + data.beta);
      const thompsonSample = betaSample(data.alpha, data.beta);
      const confidence = data.totalTrades;

      return {
        source,
        winRate: winRate * 100,
        thompsonSample: thompsonSample * 100,
        confidence,
        alpha: data.alpha,
        beta: data.beta
      };
    })
    .sort((a, b) => b.thompsonSample - a.thompsonSample);

  console.log(`   🏆 Top 3 Signal Sources (by Thompson Sample):`);
  sourceRankings.slice(0, 3).forEach((rank, i) => {
    const confidenceLevel = rank.confidence >= 3 ? 'High' : rank.confidence >= 2 ? 'Med' : 'Low';
    console.log(`      ${i + 1}. ${rank.source}: ${rank.winRate.toFixed(1)}% win rate (${rank.confidence} trades) | TS: ${rank.thompsonSample.toFixed(1)}% | ${confidenceLevel} confidence`);
  });

  console.log('');
});

// Final bandit state summary
console.log('🎯 FINAL THOMPSON SAMPLING STATE');
console.log('================================');
console.log('');

const finalRankings = Object.entries(signalSources)
  .filter(([_, data]) => data.totalTrades > 0)
  .map(([source, data]) => {
    const winRate = (data.alpha - 1) / (data.alpha + data.beta - 2); // Adjusted for prior
    const thompsonSample = betaSample(data.alpha, data.beta);
    const confidence = data.totalTrades;

    return {
      source,
      winRate: winRate * 100,
      thompsonSample: thompsonSample * 100,
      confidence,
      alpha: data.alpha,
      beta: data.beta
    };
  })
  .sort((a, b) => b.thompsonSample - a.thompsonSample);

console.log('📊 Signal Source Performance (Bayesian Learning):');
console.log('');

finalRankings.forEach((rank, i) => {
  const stars = '★'.repeat(Math.min(5, Math.ceil(rank.confidence / 2)));
  const confidenceLevel = rank.confidence >= 4 ? 'HIGH' : rank.confidence >= 2 ? 'MEDIUM' : 'LOW';

  console.log(`${(i + 1).toString().padStart(2)}. ${rank.source.padEnd(20)} | Win Rate: ${rank.winRate.toFixed(1)}% | TS Weight: ${rank.thompsonSample.toFixed(1)}% | ${rank.confidence} trades | ${stars} ${confidenceLevel}`);
  console.log(`    Beta Distribution: α=${rank.alpha}, β=${rank.beta}`);
});

console.log('');
console.log('🧠 WHAT THE ALGORITHM LEARNED:');
console.log('');

// Identify top performers
const topPerformers = finalRankings.filter(r => r.winRate > 60 && r.confidence >= 2);
const underperformers = finalRankings.filter(r => r.winRate < 40 && r.confidence >= 2);

if (topPerformers.length > 0) {
  console.log('🟢 HIGH-PERFORMING SIGNALS (>60% win rate):');
  topPerformers.forEach(perf => {
    console.log(`   • ${perf.source}: ${perf.winRate.toFixed(1)}% (${perf.confidence} trades) - WEIGHT UP ↗️`);
  });
  console.log('');
}

if (underperformers.length > 0) {
  console.log('🔴 UNDERPERFORMING SIGNALS (<40% win rate):');
  underperformers.forEach(perf => {
    console.log(`   • ${perf.source}: ${perf.winRate.toFixed(1)}% (${perf.confidence} trades) - WEIGHT DOWN ↘️`);
  });
  console.log('');
}

// Show adaptive behavior
console.log('⚡ ADAPTIVE WEIGHTING IN ACTION:');
console.log('• Thompson Sampling dynamically samples from Beta distributions');
console.log('• High performers get higher probability of selection');
console.log('• Low performers get reduced weight but can recover');
console.log('• Algorithm balances exploitation vs exploration');
console.log('• More data = more confident parameter estimates');
console.log('');

console.log('🎯 NEXT TRADE SIGNAL WEIGHTS:');
const nextWeights = finalRankings.slice(0, 5).map(r => ({
  source: r.source,
  weight: r.thompsonSample
}));

nextWeights.forEach(w => {
  const barLength = Math.ceil(w.weight / 5);
  const bar = '█'.repeat(barLength) + '░'.repeat(20 - barLength);
  console.log(`${w.source.padEnd(20)} ${bar} ${w.weight.toFixed(1)}%`);
});

console.log('');
console.log('🔥 BANDIT ALGORITHM STATUS: LEARNING AND ADAPTING! ✨');