#!/usr/bin/env node

/**
 * 🧪 THOMPSON SAMPLING BANDIT TESTING GUIDE
 *
 * Complete testing workflow for validating bandit learning:
 * 1. Pre-test setup and validation
 * 2. Trade execution instructions
 * 3. Real-time monitoring
 * 4. Post-test analysis
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PERSISTENCE_DIR = path.join(__dirname, '..', '.elizadb', 'vince-paper-bot');
const BANDIT_STATE_FILE = path.join(PERSISTENCE_DIR, 'weight-bandit-state.json');
const JOURNAL_FILE = path.join(PERSISTENCE_DIR, 'journal.json');
const POSITIONS_FILE = path.join(PERSISTENCE_DIR, 'positions.json');

console.log('🧪 THOMPSON SAMPLING BANDIT LEARNING TEST');
console.log('=========================================');
console.log('');

// Create test monitoring setup
function createMonitoringScript() {
  const scriptContent = `#!/bin/bash

# 📊 BANDIT LEARNING MONITOR
# Real-time monitoring of Thompson Sampling adaptation

echo "🎯 THOMPSON SAMPLING MONITOR - Press Ctrl+C to stop"
echo "=================================================="
echo ""

while true; do
    clear
    echo "🎯 THOMPSON SAMPLING MONITOR - $(date)"
    echo "=================================================="
    echo ""

    # Check bandit state
    if [ -f "${BANDIT_STATE_FILE}" ]; then
        echo "✅ BANDIT STATE ACTIVE:"
        node -e "
        const state = JSON.parse(require('fs').readFileSync('${BANDIT_STATE_FILE}', 'utf8'));
        console.log(\`   Total outcomes: \${state.totalOutcomes || 0}\`);
        console.log(\`   Last updated: \${state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}\`);
        console.log(\`   Sources tracked: \${Object.keys(state.sources || {}).length}\`);
        console.log('');

        if (Object.keys(state.sources || {}).length > 0) {
            console.log('🏆 TOP SIGNAL SOURCES:');
            const sources = Object.entries(state.sources);
            sources
                .sort((a, b) => {
                    const aWinRate = a[1].alpha / (a[1].alpha + a[1].beta);
                    const bWinRate = b[1].alpha / (b[1].alpha + b[1].beta);
                    return bWinRate - aWinRate;
                })
                .slice(0, 8)
                .forEach(([source, data], i) => {
                    const winRate = (data.alpha / (data.alpha + data.beta) * 100).toFixed(1);
                    const confidence = data.alpha + data.beta - 2;
                    const bar = '█'.repeat(Math.ceil(winRate / 10));
                    console.log(\`   \${i + 1}. \${source.padEnd(20)} \${winRate}% \${bar} (\${confidence} trades)\`);
                });
        }
        " 2>/dev/null
    else
        echo "⚠️ BANDIT NOT INITIALIZED YET"
        echo "   Execute trades to start learning!"
    fi

    echo ""

    # Check active positions
    if [ -f "${POSITIONS_FILE}" ]; then
        echo "📊 ACTIVE POSITIONS:"
        node -e "
        try {
            const positions = JSON.parse(require('fs').readFileSync('${POSITIONS_FILE}', 'utf8'));
            const activePositions = positions.filter(p => p.status === 'open');
            if (activePositions.length > 0) {
                activePositions.forEach(pos => {
                    const pnl = ((pos.currentPrice || pos.entryPrice) - pos.entryPrice) / pos.entryPrice * 100 * (pos.direction === 'long' ? 1 : -1);
                    console.log(\`   \${pos.asset} \${pos.direction.toUpperCase()}: \${pnl > 0 ? '+' : ''}\${pnl.toFixed(1)}% P&L\`);
                });
            } else {
                console.log('   No active positions');
            }
        } catch (e) {
            console.log('   No positions data');
        }
        " 2>/dev/null
    else
        echo "📊 No positions file found"
    fi

    echo ""
    echo "🔄 Next update in 5 seconds... (Ctrl+C to stop)"
    sleep 5
done`;

  fs.writeFileSync(path.join(__dirname, 'monitor-bandit.sh'), scriptContent);
  fs.chmodSync(path.join(__dirname, 'monitor-bandit.sh'), 0o755);
  console.log('✅ Created monitoring script: scripts/monitor-bandit.sh');
}

// Pre-test validation
console.log('🔍 PRE-TEST VALIDATION:');
console.log('');

// Check VINCE status
try {
  const response = await fetch('http://localhost:3000', { method: 'HEAD' });
  if (response.ok) {
    console.log('✅ VINCE frontend accessible at http://localhost:3000');
  } else {
    console.log('❌ VINCE frontend error:', response.status);
  }
} catch (error) {
  console.log('❌ VINCE not running - start with: bun start');
  process.exit(1);
}

// Check persistence directory
if (!fs.existsSync(PERSISTENCE_DIR)) {
  fs.mkdirSync(PERSISTENCE_DIR, { recursive: true });
  console.log('✅ Created persistence directory');
} else {
  console.log('✅ Persistence directory exists');
}

// Check existing state
if (fs.existsSync(BANDIT_STATE_FILE)) {
  const state = JSON.parse(fs.readFileSync(BANDIT_STATE_FILE, 'utf8'));
  console.log(`⚠️ Existing bandit state found: ${state.totalOutcomes || 0} outcomes recorded`);
} else {
  console.log('✅ Clean slate - ready for fresh bandit learning');
}

console.log('');

// Create monitoring tools
createMonitoringScript();

console.log('');
console.log('🧪 TESTING PROCEDURE:');
console.log('=====================');
console.log('');

console.log('📋 STEP 1: OPEN MONITORING');
console.log('   Run in separate terminal:');
console.log('   → ./scripts/monitor-bandit.sh');
console.log('');

console.log('📋 STEP 2: EXECUTE TRADES');
console.log('   Open http://localhost:3000 and send these messages:');
console.log('   → "trade BTC"    (Initialize with BTC trade)');
console.log('   → "trade ETH"    (Add ETH data point)');
console.log('   → "trade SOL"    (Add SOL data point)');
console.log('   → "perps HYPE"   (Add HYPE data point)');
console.log('');

console.log('📋 STEP 3: FORCE TRADE COMPLETION');
console.log('   After trades open, manually close them:');
console.log('   → "bot status"   (Check open positions)');
console.log('   → "close all"    (Close all positions)');
console.log('   OR wait for automatic stop loss/take profit');
console.log('');

console.log('📋 STEP 4: OBSERVE BANDIT LEARNING');
console.log('   Watch the monitor for:');
console.log('   ✅ Bandit state file creation');
console.log('   ✅ Signal source tracking');
console.log('   ✅ Win/loss ratio updates');
console.log('   ✅ Adaptive weight sampling');
console.log('');

console.log('📋 STEP 5: EXECUTE MORE TRADES');
console.log('   Send more trading commands:');
console.log('   → "perps BTC"    (Test weight adaptation)');
console.log('   → "options ETH"  (Different signal mix)');
console.log('   → "memes"        (Alternative signal sources)');
console.log('');

console.log('🎯 EXPECTED BANDIT BEHAVIOR:');
console.log('============================');
console.log('');
console.log('🟢 WINNERS (Should get higher weights):');
console.log('   • BinanceTopTraders (if whales move market correctly)');
console.log('   • NewsSentiment (if news aligns with price action)');
console.log('   • CoinGlass (if funding/OI signals work)');
console.log('');
console.log('🔴 LOSERS (Should get lower weights):');
console.log('   • Sources that gave wrong signals');
console.log('   • Low-confidence sources');
console.log('   • Contradictory indicators');
console.log('');
console.log('⚡ ADAPTIVE FEATURES:');
console.log('   • Thompson Sampling balances exploration vs exploitation');
console.log('   • Beta distributions track uncertainty');
console.log('   • Recent trades get more weight (decay factor)');
console.log('   • Win bonuses for profitable signals');
console.log('');

console.log('📊 SUCCESS METRICS:');
console.log('==================');
console.log('');
console.log('✅ Initialization:');
console.log('   • weight-bandit-state.json file created');
console.log('   • Multiple signal sources tracked');
console.log('   • totalOutcomes > 0');
console.log('');
console.log('✅ Learning Evidence:');
console.log('   • Win rates differentiate between sources');
console.log('   • Top performers show high alpha values');
console.log('   • Poor performers show high beta values');
console.log('   • Weights adapt based on recent performance');
console.log('');
console.log('✅ Production Readiness:');
console.log('   • No errors in bandit recordOutcome()');
console.log('   • Graceful fallback to static weights if needed');
console.log('   • Persistent state across restarts');
console.log('');

console.log('🚀 ADVANCED TESTING:');
console.log('====================');
console.log('');
console.log('🔬 Multi-Asset Comparison:');
console.log('   Test if bandit learns different patterns per asset');
console.log('   → BTC vs ETH vs SOL signal effectiveness');
console.log('');
console.log('🔬 Market Regime Testing:');
console.log('   Test bandit adaptation to different market conditions');
console.log('   → Trending vs ranging markets');
console.log('   → High vs low volatility periods');
console.log('');
console.log('🔬 Signal Source Analysis:');
console.log('   Monitor which categories perform best:');
console.log('   → Market data (CoinGlass, Binance)');
console.log('   → Sentiment (News, X)');
console.log('   → Technical (RSI, ATR)');
console.log('   → On-chain (Nansen, Sanbase)');
console.log('');

console.log('🔥 READY TO TEST THOMPSON SAMPLING BANDIT LEARNING!');
console.log('');
console.log('Start monitoring: ./scripts/monitor-bandit.sh');
console.log('Then execute trades at: http://localhost:3000');
console.log('');
console.log('🧠⚡ WATCH THE AI LEARN IN REAL-TIME! 🚀');