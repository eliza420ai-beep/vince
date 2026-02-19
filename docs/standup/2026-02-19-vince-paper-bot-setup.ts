import { TwitterApi } from 'twitter-api-v2';

interface PaperBotConfig {
  twitterClient: TwitterApi;
  tradingAccount: string;
  riskLimit: number;
  paperBalance: number;
}

interface Trade {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entry: number;
  timestamp: number;
  pnl?: number;
}

class PaperBot {
  private config: PaperBotConfig;
  private trades: Trade[] = [];
  private balance: number;

  constructor(config: PaperBotConfig) {
    this.config = config;
    this.balance = config.paperBalance;
  }

  async executeTrade(symbol: string, side: 'long' | 'short', size: number, price: number): Promise<Trade> {
    const trade: Trade = {
      symbol,
      side,
      size,
      entry: price,
      timestamp: Date.now()
    };

    this.trades.push(trade);
    
    const tweetText = this.formatTradeAlert(trade);
    await this.tweet(tweetText);
    
    return trade;
  }

  async closeTrade(tradeIndex: number, exitPrice: number): Promise<void> {
    const trade = this.trades[tradeIndex];
    if (!trade) return;

    const multiplier = trade.side === 'long' ? 1 : -1;
    const pnl = (exitPrice - trade.entry) * multiplier * trade.size;
    trade.pnl = pnl;
    this.balance += pnl;

    const tweetText = this.formatCloseAlert(trade, exitPrice);
    await this.tweet(tweetText);
  }

  private formatTradeAlert(trade: Trade): string {
    const direction = trade.side === 'long' ? '📈' : '📉';
    return `${direction} ${trade.symbol.toUpperCase()} ${trade.side.toUpperCase()}\n` +
           `Size: ${trade.size}\n` +
           `Entry: $${trade.entry.toFixed(4)}\n` +
           `#PaperTrading`;
  }

  private formatCloseAlert(trade: Trade, exitPrice: number): string {
    const pnlEmoji = (trade.pnl || 0) > 0 ? '✅' : '❌';
    const pnlPercent = ((exitPrice - trade.entry) / trade.entry * 100).toFixed(2);
    return `${pnlEmoji} CLOSED ${trade.symbol.toUpperCase()}\n` +
           `Exit: $${exitPrice.toFixed(4)}\n` +
           `PnL: $${(trade.pnl || 0).toFixed(2)} (${pnlPercent}%)\n` +
           `Balance: $${this.balance.toFixed(2)}`;
  }

  private async tweet(text: string): Promise<void> {
    try {
      await this.config.twitterClient.v2.tweet(text);
    } catch (error) {
      console.error('Tweet failed:', error);
    }
  }

  getStats() {
    const totalTrades = this.trades.length;
    const closedTrades = this.trades.filter(t => t.pnl !== undefined);
    const winners = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    return {
      totalTrades,
      closedTrades: closedTrades.length,
      winRate: closedTrades.length > 0 ? (winners / closedTrades.length * 100).toFixed(1) : '0',
      totalPnl: totalPnl.toFixed(2),
      balance: this.balance.toFixed(2)
    };
  }

  async tweetStats(): Promise<void> {
    const stats = this.getStats();
    const statsText = `📊 Paper Trading Stats\n` +
                     `Trades: ${stats.totalTrades} (${stats.closedTrades} closed)\n` +
                     `Win Rate: ${stats.winRate}%\n` +
                     `Total PnL: $${stats.totalPnl}\n` +
                     `Balance: $${stats.balance}`;
    
    await this.tweet(statsText);
  }
}

export { PaperBot, PaperBotConfig, Trade };