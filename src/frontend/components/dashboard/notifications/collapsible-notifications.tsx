"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/frontend/components/ui/badge";
import { Bullet } from "@/frontend/components/ui/bullet";
import { Button } from "@/frontend/components/ui/button";
import BellIcon from "@/frontend/components/icons/bell";
import PlusIcon from "@/frontend/components/icons/plus";
import MinusIcon from "@/frontend/components/icons/minus";
import type { NotificationItem } from "@/frontend/hooks/useWalletNotifications";

const CONTENT_HEIGHT = 400; // Height of expandable content

function NotificationRow({ item }: { item: NotificationItem }) {
  const content = (
    <div className="flex flex-col gap-0.5 p-2 rounded-md hover:bg-muted/50 transition-colors text-left w-full">
      <span className="text-xs font-medium truncate">{item.title}</span>
      {item.subtitle && (
        <span className="text-[10px] text-muted-foreground truncate">
          {item.subtitle}
        </span>
      )}
    </div>
  );
  if (item.link) {
    return (
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </a>
    );
  }
  return content;
}

export interface CollapsibleNotificationsProps {
  /** Wallet UI mode: degen | normies. Affects empty state and header copy. Default "degen". */
  mode?: "degen" | "normies";
  /** Notification items (e.g. from wallet history). */
  notifications?: NotificationItem[];
  /** Unread count for badge. */
  unreadCount?: number;
  /** Called when user clicks "Mark all read". */
  onMarkAllRead?: () => void;
  /** True while loading notifications. */
  isLoading?: boolean;
}

export default function CollapsibleNotifications({
  mode = "degen",
  notifications = [],
  unreadCount: unreadCountProp = 0,
  onMarkAllRead,
  isLoading = false,
}: CollapsibleNotificationsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const unreadCount = unreadCountProp;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const emptyPrimary =
    mode === "normies" ? "You're all caught up" : "No new notifications";
  const emptySecondary =
    mode === "normies" ? "No new activity" : "You're all caught up!";
  const headerLabel = mode === "normies" ? "Activity" : "Notifications";

  return (
    <motion.div
      className="absolute bottom-0 inset-x-0 z-30"
      initial={{ y: CONTENT_HEIGHT }}
      animate={{ y: isExpanded ? 0 : CONTENT_HEIGHT }}
      transition={{ duration: 0.3, ease: "circInOut" }}
    >
      {/* Header - Matches ChatHeader style exactly */}
      <motion.div
        layout
        className="cursor-pointer flex items-center gap-3 transition-all duration-300 w-full h-14 bg-background text-foreground rounded-t-lg px-4 py-3"
        onClick={toggleExpanded}
      >
        {/* Header Content */}
        <motion.div layout className="flex items-center gap-2 flex-1">
          {/* Unread Badge/Bullet */}
          {unreadCount > 0 ? <Badge>{unreadCount}</Badge> : <Bullet />}

          {/* Title */}
          <span className="text-sm font-medium uppercase">
            {isExpanded ? headerLabel : headerLabel}
          </span>
        </motion.div>

        {/* Toggle Icon */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={isExpanded ? "expanded" : "collapsed"}
            initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
          >
            {isExpanded ? (
              <MinusIcon className="size-4" />
            ) : (
              <PlusIcon className="size-4" />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Expandable Content - Matches Chat component exactly */}
      <div className="overflow-y-auto" style={{ height: CONTENT_HEIGHT }}>
        <div className="bg-background text-foreground h-full">
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                {/* Notifications List */}
                <div className="flex-1 flex flex-col overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : notifications.length > 0 ? (
                    <>
                      {unreadCount > 0 && onMarkAllRead && (
                        <div className="px-3 pt-2 pb-1 border-b border-border/50">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkAllRead();
                            }}
                          >
                            Mark all read
                          </Button>
                        </div>
                      )}
                      <div className="space-y-0.5 p-3">
                        {notifications.map((item) => (
                          <NotificationRow key={item.id} item={item} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <BellIcon className="size-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {emptyPrimary}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {emptySecondary}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
