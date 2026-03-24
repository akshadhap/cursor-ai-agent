"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  BellIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  RefreshCwIcon,
  TrashIcon,
  CheckCheckIcon,
  Trash2Icon,
  BellOffIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";

export const NotificationsBell = () => {
  // Get current user's entityId
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  // CONVEX QUERIES (Real-time)
  const notifications = useQuery(
    api.private.notifications.list,
    entityId ? { entityId, limit: 10 } : "skip"
  );
  const unreadCount = useQuery(
    api.private.notifications.getUnreadCount,
    entityId ? { entityId } : "skip"
  );

  // CONVEX MUTATIONS (Actions)
  const markAsRead = useMutation(api.private.notifications.markAsRead);
  const markAllAsRead = useMutation(api.private.notifications.markAllAsRead);
  const deleteNotification = useMutation(
    api.private.notifications.deleteNotification
  );
  const deleteAll = useMutation(api.private.notifications.deleteAll);

  const [isOpen, setIsOpen] = useState(false);
  const shownToastIdsRef = useRef<Set<string>>(new Set());

  const hasNotifications = notifications && notifications.length > 0;

  useEffect(() => {
    if (!entityId) return;
    if (!notifications) return;

    const now = Date.now();
    const recentWindowMs = 30_000;

    for (const n of notifications) {
      if (n.type !== "file_failed") continue;
      if (n.read) continue;
      if (typeof n.createdAt === "number" && n.createdAt < now - recentWindowMs) continue;

      const id = String(n._id);
      if (shownToastIdsRef.current.has(id)) continue;
      shownToastIdsRef.current.add(id);

      toast.error(n.message);

      (async () => {
        try {
          await markAsRead({ entityId, notificationId: n._id });
        } catch (e) {
          console.error(e);
        }
      })();
    }
  }, [notifications, entityId, markAsRead]);

  // ICON HELPER
  const getIcon = (
    type: "file_ready" | "file_failed" | "file_processing"
  ) => {
    switch (type) {
      case "file_ready":
        return <CheckCircle2Icon className="h-4 w-4 text-green-500" />;
      case "file_failed":
        return <AlertCircleIcon className="h-4 w-4 text-red-500" />;
      case "file_processing":
        return (
          <RefreshCwIcon className="h-4 w-4 text-blue-500 animate-spin" />
        );
    }
  };

  // EVENT HANDLERS
  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    if (!entityId) return;
    try {
      await markAsRead({ entityId, notificationId });
      // No toast needed - UI updates automatically via Convex
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!entityId) return;
    try {
      await markAllAsRead({ entityId });
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error(error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (notificationId: Id<"notifications">) => {
    if (!entityId) return;
    try {
      await deleteNotification({ entityId, notificationId });
      // UI updates automatically
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete notification");
    }
  };

  const handleDeleteAll = async () => {
    if (!entityId) return;
    try {
      const result = await deleteAll({ entityId });
      toast.success(`Cleared ${result.deleted} notifications`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to clear notifications");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <BellIcon className="h-5 w-5" />

          {/* UNREAD COUNT BADGE */}
          {unreadCount !== undefined && unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        {/* HEADER WITH ACTIONS */}
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex gap-1">
            {/* MARK ALL AS READ BUTTON */}
            {unreadCount !== undefined && unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheckIcon className="h-3 w-3 mr-1" />
                Mark read
              </Button>
            )}

            {/* CLEAR ALL BUTTON */}
            {hasNotifications && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                onClick={handleDeleteAll}
                title="Clear all notifications"
              >
                <Trash2Icon className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />

        {/* NOTIFICATIONS LIST */}
        <div className="max-h-[400px] overflow-y-auto">
          {!hasNotifications ? (
            // EMPTY STATE
            <div className="px-4 py-12 text-center">
              <BellOffIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            // NOTIFICATION ITEMS
            notifications.map((notification) => (
              <div
                key={notification._id}
                className={`px-2 py-2 hover:bg-muted/50 cursor-pointer transition-colors ${
                  !notification.read
                    ? "bg-blue-50 dark:bg-blue-950/20 border-l-2 border-l-blue-500"
                    : ""
                }`}
                onClick={() => {
                  if (!notification.read) {
                    handleMarkAsRead(notification._id);
                  }
                }}
              >
                <div className="flex items-start gap-2">
                  {/* NOTIFICATION ICON */}
                  <div className="mt-0.5">{getIcon(notification.type)}</div>

                  <div className="flex-1 min-w-0">
                    {/* TITLE */}
                    <p className="text-sm font-medium leading-tight">
                      {notification.title}
                    </p>

                    {/* MESSAGE */}
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>

                    {/* TIMESTAMP */}
                    <p className="text-xs text-muted-foreground/70 mt-1.5">
                      {formatDistanceToNow(notification.createdAt, {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* DELETE BUTTON */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification._id);
                    }}
                    title="Delete notification"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
