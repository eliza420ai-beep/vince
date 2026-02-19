import { WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface Position {
  coin: string;
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  marginUsed: number;
}

interface OrderBook {
  coin: string;
  bid: number;
  ask: number;
  midPrice: number;
}

class HyperliquidPaperBot extends EventEmitter {
  private ws: WebSocket | null = null;
  private positions: Map<string, Position> = new Map();
  private balance = 100000; // $100k paper balance
  private orderBooks: Map<string, OrderBook> = new Map();

  constructor() {
    super();
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket('wss://api.hyperliquid.xyz/ws');
    
    this.ws.on('open', () => {
      console.log('Connected to Hyperliquid');
      this.subscribe(['BTC', 'ETH', 'SOL']);
    });

    this.ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      this.handleMessage(msg);
    });

    this.ws.on('close', () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => this.connect(), 5000);
    });
  }

  private subscribe(coins: string[]) {
    if (!this.ws) return;
    
    coins.forEach(coin => {
      this.ws!.send(JSON.stringify({
        method: 'subscribe',
        subscription: {
          type: 'l2Book',
          coin: coin
        }
      }));
    });
  }

  private handleMessage(msg: any) {
    if (msg.channel === 'l2Book' && msg.data) {
      const { coin, levels } = msg.data;
      const bid = parseFloat(levels.bids[0]?.[0] || '0');
      const ask = parseFloat(levels.asks[0]?.[0] || '0');
      
      this.orderBooks.set(coin, {
        coin,
        bid,
        ask,
        midPrice: (bid + ask) / 2
      });

      this.updateUnrealizedPnl(coin);
    }
  }

  openPosition(coin: string, size: number, isLong: boolean = true): boolean {
    const book = this.orderBooks.get(coin);
    if (!book) return false;

    const entryPrice = isLong ? book.ask : book.bid;
    const notional = Math.abs(size * entryPrice);
    const marginRequired = notional * 0.1; // 10x leverage

    if (marginRequired > this.balance) {
      console.log(`Insufficient balance. Required: $${marginRequired}, Available: $${this.balance}`);
      return false;
    }

    const position: Position = {
      coin,
      size: isLong ? size : -size,
      entryPrice,
      unrealizedPnl: 0,
      marginUsed: marginRequired
    };

    this.positions.set(coin, position);
    this.balance -= marginRequired;
    
    console.log(`Opened ${isLong ? 'LONG' : 'SHORT'} ${coin} | Size: ${size} | Entry: $${entryPrice}`);
    this.emit('positionOpened', position);
    return true;
  }

  closePosition(coin: string): boolean {
    const position = this.positions.get(coin);
    const book = this.orderBooks.get(coin);
    
    if (!position || !book) return false;

    const exitPrice = position.size > 0 ? book.bid : book.ask;
    const pnl = position.size * (exitPrice - position.entryPrice);
    
    this.balance += position.marginUsed + pnl;
    this.positions.delete(coin);
    
    console.log(`Closed ${coin} | PnL: $${pnl.toFixed(2)} | Exit: $${exitPrice}`);
    this.emit('positionClosed', { coin, pnl, exitPrice });
    return true;
  }

  private updateUnrealizedPnl(coin: string) {
    const position = this.positions.get(coin);
    const book = this.orderBooks.get(coin);
    
    if (!position || !book) return;

    const markPrice = book.midPrice;
    position.unrealizedPnl = position.size * (markPrice - position.entryPrice);
  }

  getPortfolio() {
    const totalUnrealizedPnl = Array.from(this.positions.values())
      .reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    
    return {
      balance: this.balance,
      totalUnrealizedPnl,
      equity: this.balance + totalUnrealizedPnl,
      positions: Array.from(this.positions.values()),
      orderBooks: Array.from(this.orderBooks.values())
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export { HyperliquidPaperBot, Position, OrderBook };