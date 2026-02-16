/**
 * Coinbase Advanced Trade API client (REST).
 * JWT auth per https://docs.cdp.coinbase.com/coinbase-app/authentication-authorization/api-key-authentication
 * Base URL: https://api.coinbase.com
 */

import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { logger } from "@elizaos/core";

const ADVANCED_TRADE_BASE = "https://api.coinbase.com";
const REQUEST_HOST = "api.coinbase.com";

export interface AdvancedTradeConfig {
  keyName: string;
  keySecret: string; // PEM EC private key (ES256)
}

function buildJwt(method: string, path: string, config: AdvancedTradeConfig): string {
  const uri = `${method} ${REQUEST_HOST}${path}`;
  const nbf = Math.floor(Date.now() / 1000);
  const exp = nbf + 120;
  const payload = {
    sub: config.keyName,
    iss: "cdp",
    nbf,
    exp,
    uri,
  };
  return jwt.sign(payload, config.keySecret, {
    algorithm: "ES256",
    header: { kid: config.keyName, nonce: randomBytes(16).toString("hex") },
  });
}

export async function advancedTradeRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  config: AdvancedTradeConfig,
  body?: object
): Promise<T> {
  const jwt = buildJwt(method, path, config);
  const url = `${ADVANCED_TRADE_BASE}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    "Content-Type": "application/json",
  };
  const options: RequestInit = { method, headers };
  if (body && (method === "POST" || method === "DELETE")) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const text = await res.text();
  if (!res.ok) {
    logger.warn(`[AdvancedTrade] ${method} ${path} ${res.status}: ${text}`);
    throw new Error(`Advanced Trade API ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}

export function getAdvancedTradeConfig(): AdvancedTradeConfig | null {
  const keyName = process.env.COINBASE_ADVANCED_TRADE_KEY_NAME?.trim();
  const keySecret = process.env.COINBASE_ADVANCED_TRADE_KEY_SECRET?.trim();
  if (!keyName || !keySecret) return null;
  return { keyName, keySecret };
}

export function isAdvancedTradeConfigured(): boolean {
  return getAdvancedTradeConfig() !== null;
}
