interface PaperBotMetrics {
  totalTrades: number;
  winRate: number;
  avgHoldTime: number;
  maxDrawdown: number;
  sharpeRatio: number;
  pnl: number;
  lastTradeTime: Date;
  isActive: boolean;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice?: number;
  size: number;
  entryTime: Date;
  exitTime?: Date;
  pnl?: number;
  status: 'open' | 'closed';
}

class PaperBotMonitor {
  private trades: Trade[] = [];
  private alertThresholds = {
    maxDrawdown: 0.15,
    minWinRate: 0.45,
    maxInactiveHours: 24
  };

  addTrade(trade: Trade): void {
    this.trades.push(trade);
  }

  closeTrade(tradeId: string, exitPrice: number): void {
    const trade = this.trades.find(t => t.id === tradeId);
    if (!trade || trade.status === 'closed') return;
    
    trade.exitPrice = exitPrice;
    trade.exitTime = new Date();
    trade.status = 'closed';
    trade.pnl = this.calculatePnL(trade);
  }

  private calculatePnL(trade: Trade): number {
    if (!trade.exitPrice) return 0;
    const multiplier = trade.side === 'long' ? 1 : -1;
    return multiplier * (trade.exitPrice - trade.entryPrice) * trade.size;
  }

  getMetrics(): PaperBotMetrics {
    const closedTrades = this.trades.filter(t => t.status === 'closed');
    const openTrades = this.trades.filter(t => t.status === 'open');
    
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;
    
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    const holdTimes = closedTrades
      .filter(t => t.exitTime)
      .map(t => (t.exitTime!.getTime() - t.entryTime.getTime()) / (1000 * 60 * 60));
    const avgHoldTime = holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;
    
    const drawdown = this.calculateMaxDrawdown(closedTrades);
    const sharpe = this.calculateSharpeRatio(closedTrades);
    
    const lastTrade = this.trades.length > 0 ? this.trades[this.trades.length - 1] : null;
    const lastTradeTime = lastTrade ? lastTrade.entryTime : new Date(0);
    const hoursInactive = (Date.now() - lastTradeTime.getTime()) / (1000 * 60 * 60);
    
    return {
      totalTrades: this.trades.length,
      winRate,
      avgHoldTime,
      maxDrawdown: drawdown,
      sharpeRatio: sharpe,
      pnl: totalPnL,
      lastTradeTime,
      isActive: hoursInactive < this.alertThresholds.maxInactiveHours && openTrades.length > 0
    };
  }

  private calculateMaxDrawdown(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    
    let peak = 0;
    let maxDD = 0;
    let runningPnL = 0;
    
    for (const trade of trades) {
      runningPnL += trade.pnl || 0;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDD) maxDD = drawdown;
    }
    
    return peak > 0 ? maxDD / peak : 0;
  }

  private calculateSharpeRatio(trades: Trade[]): number {
    if (trades.length < 2) return 0;
    
    const returns = trades.map(t => (t.pnl || 0));
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? (avgReturn * Math.sqrt(252)) / (stdDev * Math.sqrt(252)) : 0;
  }

  getAlerts(): string[] {
    const metrics = this.getMetrics();
    const alerts: string[] = [];
    
    if (metrics.maxDrawdown > this.alertThresholds.maxDrawdown) {
      alerts.push(`⚠️ High drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%`);
    }
    
    if (metrics.winRate < this.alertThresholds.minWinRate && metrics.totalTrades > 10) {
      alerts.push(`⚠️ Low win rate: ${(metrics.winRate * 100).toFixed(1)}%`);
    }
    
    if (!metrics.isActive) {
      alerts.push(`⚠️ Bot inactive for ${Math.floor((Date.now() - metrics.lastTradeTime.getTime()) / (1000 * 60 * 60))}h`);
    }
    
    return alerts;
  }

  getPerformanceReport(): string {
    const metrics = this.getMetrics();
    const alerts = this.getAlerts();
    
    return `
Paper Bot Performance Report
===========================
Total Trades: ${metrics.totalTrades}
Win Rate: ${(metrics.winRate * 100).toFixed(1)}%
Avg Hold Time: ${metrics.avgHoldTime.toFixed(1)}h
Max Drawdown: ${(metrics.maxDrawdown * 100).toFixed(1)}%
Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}
Total P&L: ${metrics.pnl.toFixed(2)}
Status: ${metrics.isActive ? '🟢 Active' : '🔴 Inactive'}
Last Trade: ${metrics.lastTradeTime.toLocaleString()}

${alerts.length > 0 ? `Alerts:\n${alerts.join('\n')}` : '✅ All metrics within thresholds'}
    `.trim();
  }
}

export { PaperBotMonitor, PaperBotMetrics, Trade };