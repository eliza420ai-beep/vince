#!/usr/bin/env node

/**
 * 🎯 TRIGGER THOMPSON SAMPLING BANDIT LEARNING
 *
 * Initializes the bandit learning system by:
 * 1. Checking current bandit state
 * 2. Triggering trades to generate outcomes
 * 3. Monitoring bandit adaptation in real-time
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const PERSISTENCE_DIR = path.join(__dirname, '..', '.elizadb', 'vince-paper-bot');
const BANDIT_STATE_FILE = path.join(PERSISTENCE_DIR, 'weight-bandit-state.json');

console.log('🎯 THOMPSON SAMPLING BANDIT INITIALIZATION');
console.log('==========================================');
console.log('');

// Check if bandit state exists
console.log('📊 CHECKING BANDIT STATE...');
if (fs.existsSync(BANDIT_STATE_FILE)) {
  console.log('✅ Bandit state file exists!');
  const state = JSON.parse(fs.readFileSync(BANDIT_STATE_FILE, 'utf8'));

  console.log(`📈 Current bandit status:`);
  console.log(`   Sources tracked: ${Object.keys(state.sources || {}).length}`);
  console.log(`   Total outcomes recorded: ${state.totalOutcomes || 0}`);
  console.log(`   Last updated: ${state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}`);
  console.log('');

  // Show top 5 sources by sample weight
  const sources = Object.entries(state.sources || {});
  if (sources.length > 0) {
    console.log('🏆 TOP 5 SIGNAL SOURCES (by current parameters):');
    sources
      .sort((a, b) => {
        const [, aData] = a;
        const [, bData] = b;
        const aWinRate = aData.alpha / (aData.alpha + aData.beta);
        const bWinRate = bData.alpha / (bData.alpha + bData.beta);
        return bWinRate - aWinRate;
      })
      .slice(0, 5)
      .forEach(([source, data], i) => {
        const winRate = (data.alpha / (data.alpha + data.beta) * 100).toFixed(1);
        const confidence = data.count || (data.alpha + data.beta - 2);
        console.log(`   ${i + 1}. ${source}: ${winRate}% win rate (${confidence} trades)`);
      });
    console.log('');
  }
} else {
  console.log('⚠️ Bandit state file not found - bandit learning not initialized yet!');
  console.log(`   Expected location: ${BANDIT_STATE_FILE}`);
  console.log('   Need to execute trades to initialize the learning system.');
  console.log('');
}

// Check if VINCE is running
console.log('🔍 CHECKING VINCE STATUS...');
try {
  const response = await fetch('http://localhost:3000', { method: 'HEAD' });
  if (response.ok) {
    console.log('✅ VINCE frontend is running at http://localhost:3000');
  } else {
    console.log('❌ VINCE frontend returned error:', response.status);
  }
} catch (error) {
  console.log('❌ VINCE not accessible:', error.message);
}

console.log('');

// Instructions for initializing bandit learning
console.log('🚀 TO INITIALIZE THOMPSON SAMPLING:');
console.log('');
console.log('1. 🌐 Open http://localhost:3000 in your browser');
console.log('2. 💬 Chat with VINCE using these commands:');
console.log('   • "trade BTC" - Execute BTC trade');
console.log('   • "trade ETH" - Execute ETH trade');
console.log('   • "trade SOL" - Execute SOL trade');
console.log('   • "perps HYPE" - Execute HYPE trade');
console.log('');
console.log('3. ⏰ Wait for trades to complete (positions close)');
console.log('   • Manual close: "bot status" then close positions');
console.log('   • Auto close: Wait for stop loss or take profit');
console.log('');
console.log('4. 📊 Monitor bandit learning:');
console.log(`   • Watch file: ${BANDIT_STATE_FILE}`);
console.log('   • Run this script again to see progress');
console.log('');

console.log('🎯 BANDIT LEARNING FLOW:');
console.log('┌─ Trade Entry ─→ Signal sources extracted');
console.log('├─ Trade Exit ──→ recordOutcome() called');
console.log('├─ Bandit Update → Beta distributions updated');
console.log('├─ Cache Clear ─→ New weights sampled');
console.log('└─ Next Trade ──→ Improved signal source weights');
console.log('');

console.log('⚡ Expected behavior:');
console.log('• High-performing sources get higher weights over time');
console.log('• Low-performing sources get lower weights');
console.log('• Algorithm balances exploitation vs exploration');
console.log('• Continuous learning from every trade outcome');
console.log('');

// Provide real-time monitoring command
console.log('📈 REAL-TIME MONITORING:');
console.log('Run this command to watch bandit state in real-time:');
console.log('');
console.log(`watch -n 5 "cat '${BANDIT_STATE_FILE}' 2>/dev/null | jq '.sources | to_entries | map({source: .key, winRate: (.value.alpha / (.value.alpha + .value.beta) * 100 | floor), trades: (.value.alpha + .value.beta - 2)}) | sort_by(-.winRate)' 2>/dev/null || echo 'Bandit not initialized yet'"`);

console.log('');
console.log('🔥 READY TO LEARN! EXECUTE TRADES TO START BANDIT ADAPTATION! 🧠⚡');