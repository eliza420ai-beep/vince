/**
 * Crypto intel smart wallets (Phase 5).
 * File: smart_wallets.json
 */

import * as fs from "fs";
import * as path from "path";
import type { SmartWallet, SmartWalletsFile } from "../types/cryptoIntelMemory";

const SMART_WALLETS_FILE = "smart_wallets.json";

export async function readSmartWallets(
  memoryDir: string,
): Promise<SmartWalletsFile | null> {
  const filepath = path.join(memoryDir, SMART_WALLETS_FILE);
  if (!fs.existsSync(filepath)) return null;
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const obj = JSON.parse(raw) as SmartWalletsFile;
    if (!obj || !Array.isArray(obj.wallets)) return null;
    return obj;
  } catch {
    return null;
  }
}

export function getTrackedWallets(memoryDir: string): Promise<SmartWallet[]> {
  return readSmartWallets(memoryDir).then((f) => f?.wallets ?? []);
}

export async function writeSmartWallets(
  memoryDir: string,
  data: SmartWalletsFile,
): Promise<void> {
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const filepath = path.join(memoryDir, SMART_WALLETS_FILE);
  const payload: SmartWalletsFile = {
    version: data.version ?? 1,
    lastUpdated: new Date().toISOString(),
    wallets: data.wallets ?? [],
  };
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf-8");
}

export async function addWallet(
  memoryDir: string,
  wallet: SmartWallet,
): Promise<void> {
  const current = await readSmartWallets(memoryDir);
  const wallets = current?.wallets ?? [];
  if (
    wallets.some(
      (w) => w.address.toLowerCase() === wallet.address.toLowerCase(),
    )
  ) {
    return;
  }
  await writeSmartWallets(memoryDir, {
    version: current?.version ?? 1,
    lastUpdated: new Date().toISOString(),
    wallets: [...wallets, wallet],
  });
}

export async function updateWallet(
  memoryDir: string,
  address: string,
  patch: Partial<SmartWallet>,
): Promise<boolean> {
  const current = await readSmartWallets(memoryDir);
  if (!current) return false;
  const idx = current.wallets.findIndex(
    (w) => w.address.toLowerCase() === address.toLowerCase(),
  );
  if (idx === -1) return false;
  current.wallets[idx] = { ...current.wallets[idx], ...patch };
  await writeSmartWallets(memoryDir, current);
  return true;
}

export async function updateLastChecked(
  memoryDir: string,
  address: string,
): Promise<void> {
  await updateWallet(memoryDir, address, {
    last_checked: new Date().toISOString(),
  });
}
