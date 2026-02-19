import { WebSocket } from 'ws';

interface OpenClawConfig {
  endpoint: string;
  apiKey: string;
  timeout?: number;
}

interface OpenClawMessage {
  id: string;
  type: 'query' | 'stream' | 'response' | 'error';
  payload: any;
  timestamp: number;
}

interface OpenClawResponse {
  success: boolean;
  data?: any;
  error?: string;
  messageId: string;
}

class OpenClawAdapter {
  private ws: WebSocket | null = null;
  private config: OpenClawConfig;
  private messageHandlers: Map<string, (response: OpenClawResponse) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(config: OpenClawConfig) {
    this.config = { timeout: 30000, ...config };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.endpoint, {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'User-Agent': 'OpenClaw-Adapter/1.0'
          }
        });

        this.ws.on('open', () => {
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          try {
            const message: OpenClawMessage = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });

        this.ws.on('close', () => {
          this.handleDisconnect();
        });

        this.ws.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: OpenClawMessage): void {
    if (message.type === 'response' || message.type === 'error') {
      const handler = this.messageHandlers.get(message.id);
      if (handler) {
        const response: OpenClawResponse = {
          success: message.type === 'response',
          data: message.type === 'response' ? message.payload : undefined,
          error: message.type === 'error' ? message.payload.error : undefined,
          messageId: message.id
        };
        handler(response);
        this.messageHandlers.delete(message.id);
      }
    }
  }

  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect().catch(console.error);
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    }
  }

  async query(payload: any): Promise<OpenClawResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const messageId = this.generateId();
    const message: OpenClawMessage = {
      id: messageId,
      type: 'query',
      payload,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(messageId);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      this.messageHandlers.set(messageId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.ws!.send(JSON.stringify(message));
    });
  }

  async stream(payload: any, onData: (data: any) => void): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const messageId = this.generateId();
    const message: OpenClawMessage = {
      id: messageId,
      type: 'stream',
      payload,
      timestamp: Date.now()
    };

    this.messageHandlers.set(messageId, (response) => {
      if (response.success && response.data) {
        onData(response.data);
      }
    });

    this.ws.send(JSON.stringify(message));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageHandlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export { OpenClawAdapter, OpenClawConfig, OpenClawResponse };