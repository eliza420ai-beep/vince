#!/bin/bash

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
    if [ -f "/Users/vince/.openclaw/workspace/vince-worktrees/standup-action/.elizadb/vince-paper-bot/weight-bandit-state.json" ]; then
        echo "✅ BANDIT STATE ACTIVE:"
        node -e "
        const state = JSON.parse(require('fs').readFileSync('/Users/vince/.openclaw/workspace/vince-worktrees/standup-action/.elizadb/vince-paper-bot/weight-bandit-state.json', 'utf8'));
        console.log(`   Total outcomes: ${state.totalOutcomes || 0}`);
        console.log(`   Last updated: ${state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'Never'}`);
        console.log(`   Sources tracked: ${Object.keys(state.sources || {}).length}`);
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
                    console.log(`   ${i + 1}. ${source.padEnd(20)} ${winRate}% ${bar} (${confidence} trades)`);
                });
        }
        " 2>/dev/null
    else
        echo "⚠️ BANDIT NOT INITIALIZED YET"
        echo "   Execute trades to start learning!"
    fi

    echo ""

    # Check active positions
    if [ -f "/Users/vince/.openclaw/workspace/vince-worktrees/standup-action/.elizadb/vince-paper-bot/positions.json" ]; then
        echo "📊 ACTIVE POSITIONS:"
        node -e "
        try {
            const positions = JSON.parse(require('fs').readFileSync('/Users/vince/.openclaw/workspace/vince-worktrees/standup-action/.elizadb/vince-paper-bot/positions.json', 'utf8'));
            const activePositions = positions.filter(p => p.status === 'open');
            if (activePositions.length > 0) {
                activePositions.forEach(pos => {
                    const pnl = ((pos.currentPrice || pos.entryPrice) - pos.entryPrice) / pos.entryPrice * 100 * (pos.direction === 'long' ? 1 : -1);
                    console.log(`   ${pos.asset} ${pos.direction.toUpperCase()}: ${pnl > 0 ? '+' : ''}${pnl.toFixed(1)}% P&L`);
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
done