interface OpenClawConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
}

interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  unrealizedPnl: number;
  side: 'long' | 'short';
}

class OpenClawClient {
  private config: Required<OpenClawConfig>;

  constructor(config: OpenClawConfig) {
    this.config = {
      baseUrl: 'https://api.openclaw.io/v1',
      timeout: 10000,
      ...config
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`OpenClaw API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    return this.request<MarketData>(`/market/${symbol}`);
  }

  async getPositions(): Promise<Position[]> {
    return this.request<Position[]>('/positions');
  }

  async placeOrder(order: OrderRequest): Promise<{ orderId: string; status: string }> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(order)
    });
  }

  async getOrderStatus(orderId: string): Promise<{ orderId: string; status: string; filled: number }> {
    return this.request(`/orders/${orderId}`);
  }

  async cancelOrder(orderId: string): Promise<{ orderId: string; status: string }> {
    return this.request(`/orders/${orderId}`, {
      method: 'DELETE'
    });
  }

  async getAccountBalance(): Promise<{ balance: number; availableBalance: number }> {
    return this.request('/account/balance');
  }

  // Streaming market data
  createMarketStream(symbols: string[], onData: (data: MarketData) => void): WebSocket {
    const wsUrl = this.config.baseUrl.replace('http', 'ws') + '/stream';
    const ws = new WebSocket(`${wsUrl}?token=${this.config.apiKey}`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'subscribe', symbols }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'market_data') {
        onData(data.payload);
      }
    };
    
    return ws;
  }

  // Risk management helpers
  calculatePositionSize(accountBalance: number, riskPercent: number, entryPrice: number, stopPrice: number): number {
    const riskAmount = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entryPrice - stopPrice);
    return Math.floor(riskAmount / priceRisk);
  }

  validateOrder(order: OrderRequest, maxPositionSize: number): boolean {
    if (order.quantity <= 0) return false;
    if (order.quantity > maxPositionSize) return false;
    if (order.type === 'limit' && !order.price) return false;
    return true;
  }
}

export { OpenClawClient, type OpenClawConfig, type MarketData, type OrderRequest, type Position };