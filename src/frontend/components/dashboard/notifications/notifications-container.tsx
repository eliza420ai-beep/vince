"use client";

import React, { useEffect } from "react";
import { useWalletNotifications } from "@/frontend/hooks/useWalletNotifications";
import { socketManager } from "@/frontend/lib/socketManager";
import CollapsibleNotifications from "./collapsible-notifications";

export interface NotificationsContainerProps {
  userId: string | null;
  agentId: string | null;
  mode?: "degen" | "normies";
}

export default function NotificationsContainer({
  userId,
  agentId,
  mode = "degen",
}: NotificationsContainerProps) {
  const {
    items,
    unreadCount,
    markAllRead,
    isLoading,
    refetch,
  } = useWalletNotifications(userId, agentId);

  useEffect(() => {
    if (!agentId || !socketManager.isConnected()) return;
    const unsubscribe = socketManager.onEvent(
      "notifications:update",
      (data: { agentId?: string }) => {
        if (data?.agentId === agentId) refetch();
      },
    );
    return () => unsubscribe();
  }, [agentId, refetch]);

  return (
    <CollapsibleNotifications
      mode={mode}
      notifications={items}
      unreadCount={unreadCount}
      onMarkAllRead={markAllRead}
      isLoading={isLoading}
    />
  );
}
