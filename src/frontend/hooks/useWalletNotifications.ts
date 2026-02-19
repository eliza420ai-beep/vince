import { useState, useEffect, useCallback } from "react";
import type { Transaction } from "@elizaos/api-client";
import { elizaClient } from "@/frontend/lib/elizaClient";
import {
  fetchOtakuAlerts,
  type AlertItem,
} from "@/frontend/lib/otakuAlertsApi";
import {
  fetchOtakuNotifications,
  type NotificationEvent,
} from "@/frontend/lib/otakuNotificationsApi";

const STORAGE_KEY_PREFIX = "vince-notifications-last-seen-";
const MAX_ITEMS = 50;

export interface NotificationItem {
  id: string;
  title: string;
  subtitle?: string;
  time: number;
  link?: string;
  type: "send" | "receive" | "swap" | "other" | "alert";
  source?: "wallet" | "alert" | "event";
}

function formatAmount(value: string): string {
  const amount = parseFloat(value || "0");
  let s = amount.toFixed(4);
  if (s.length > 10) s = amount.toFixed(2);
  return s;
}

function formatRelativeTime(timestampMs: number): string {
  const now = Date.now();
  const diff = now - timestampMs;
  if (diff < 60_000) return "Just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)}d ago`;
  return new Date(timestampMs).toLocaleDateString();
}

function mapTransactionToItem(tx: Transaction): NotificationItem {
  const timeMs = tx.timestamp * 1000;
  const amountStr = formatAmount(tx.value);
  const category = (tx.category || "").toLowerCase();
  const isSwap =
    category.includes("swap") ||
    category.includes("trade") ||
    category.includes("exchange");
  const type: NotificationItem["type"] = isSwap
    ? "swap"
    : tx.direction === "received"
      ? "receive"
      : tx.direction === "sent"
        ? "send"
        : "other";
  let title: string;
  if (type === "swap") {
    title = `Swap`;
  } else if (type === "receive") {
    title = `Received ${amountStr} ${tx.asset}`;
  } else {
    title = `Sent ${amountStr} ${tx.asset}`;
  }
  return {
    id: tx.hash,
    title,
    subtitle: `${tx.chain} · ${formatRelativeTime(timeMs)}`,
    time: timeMs,
    link: tx.explorerUrl,
    type,
    source: "wallet",
  };
}

function mapAlertToItem(alert: AlertItem): NotificationItem {
  return {
    id: alert.id,
    title: alert.title,
    subtitle: alert.subtitle,
    time: alert.time,
    type: "alert",
    source: "alert",
  };
}

function mapEventToItem(ev: NotificationEvent): NotificationItem {
  return {
    id: ev.id,
    title: ev.title,
    subtitle: ev.subtitle,
    time: ev.time,
    type: "alert",
    source: "event",
  };
}

function getLastSeenAt(userId: string): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (raw == null) return 0;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function setLastSeenAt(userId: string, ms: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, String(ms));
  } catch {
    /* ignore */
  }
}

export function useWalletNotifications(
  userId: string | null,
  agentId: string | null = null,
) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenAt, setLastSeenAtState] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [historyRes, alertsList, eventsList] = await Promise.all([
        elizaClient.cdp.getHistory(),
        agentId ? fetchOtakuAlerts(agentId) : Promise.resolve(null),
        agentId
          ? fetchOtakuNotifications(agentId, userId)
          : Promise.resolve(null),
      ]);
      const txs = historyRes.transactions || [];
      const walletItems = txs.map(mapTransactionToItem);
      const alertItems = (alertsList ?? []).map(mapAlertToItem);
      const eventItems = (eventsList ?? []).map(mapEventToItem);
      const merged = [...walletItems, ...alertItems, ...eventItems]
        .sort((a, b) => b.time - a.time)
        .slice(0, MAX_ITEMS);
      const seen = getLastSeenAt(userId);
      setLastSeenAtState(seen);
      setItems(merged);
      const count = merged.filter((i) => i.time > seen).length;
      setUnreadCount(count);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity");
      setItems([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId, agentId]);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setUnreadCount(0);
      setLastSeenAtState(0);
      return;
    }
    loadHistory();
  }, [userId, loadHistory]);

  useEffect(() => {
    const onFocus = () => loadHistory();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadHistory]);

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const now = Date.now();
    setLastSeenAt(userId, now);
    setLastSeenAtState(now);
    setUnreadCount(0);
  }, [userId]);

  return {
    items,
    unreadCount,
    markAllRead,
    isLoading,
    error,
    refetch: loadHistory,
  };
}
