"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  CornerUpLeftIcon,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "../../../../../../convex/_generated/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { getCountryFromTimezone, getCountryFlagUrl } from "@/lib/country-utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DicebearAvatar } from "./dicebear-avatar";
import { ConversationStatusIcon } from "./conversations-status-icon";
import { useAtomValue, useSetAtom } from "jotai/react";
import { statusFilterAtom, chatbotFilterAtom } from "../../atoms";
import { useInfiniteScroll } from "../hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "./infinite-scroll-trigger";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { useEffect } from "react";

const getConversationPreview = (conversation: any) => {
  const lastMessage = conversation?.lastMessage ?? null;
  const messageContent = lastMessage?.text ?? null;

  const kind = typeof conversation?.kind === "string" ? conversation.kind : null;
  const type = kind === "voice" ? "Voice" : kind === "video" ? "Video" : "Chat";

  if (!messageContent) return { text: "No messages yet", type };

  if (typeof messageContent === "string" && messageContent.startsWith("[Voice]")) {
    return { text: messageContent.replace("[Voice] ", ""), type: "Voice" };
  }

  if (typeof messageContent === "string" && messageContent.startsWith("[Video]")) {
    return { text: messageContent.replace("[Video] ", ""), type: "Video" };
  }

  return { text: String(messageContent), type };
};

export const ConversationsPanel = () => {
  const pathname = usePathname();

  const statusFilter = useAtomValue(statusFilterAtom);
  const setStatusFilter = useSetAtom(statusFilterAtom);

  const chatbotFilter = useAtomValue(chatbotFilterAtom);
  const setChatbotFilter = useSetAtom(chatbotFilterAtom);

  // 🔐 BetterAuth session
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // 🧠 Convex users
  const users = useQuery(api.users.getMany);

  // Match Convex user by BetterAuth email
  const currentConvexUser = users?.find((u) => u.email === currentEmail);

  // Org ID now comes from Convex user
  const entityId = currentConvexUser?.entityId ?? null;

  // Fetch chatbots for the dropdown
  const chatbotsResult = useQuery(
    api.private.chatbots.getMany,
    entityId ? { entityId, paginationOpts: { numItems: 100, cursor: null } } : "skip"
  );
  const chatbots = chatbotsResult?.page ?? [];
  const chatbotNameById = new Map(
  chatbots.map((bot) => [bot._id, bot.name])
);


  const status =
    statusFilter === "all" || statusFilter === "voice" || statusFilter === "video"
      ? undefined
      : (statusFilter as "unresolved" | "escalated" | "resolved");

  // Validate that the chatbot filter is still valid (exists in the chatbots list)
  const isValidChatbotFilter =
    chatbotFilter === "all" ||
    chatbots.some((bot) => bot._id === chatbotFilter);

  const chatbotId =
    chatbotFilter === "all" || !isValidChatbotFilter
      ? undefined
      : chatbotFilter;

  // Reset invalid chatbot filter
  useEffect(() => {
    if (chatbotFilter !== "all" && !isValidChatbotFilter && chatbots.length > 0) {
      setChatbotFilter("all");
    }
  }, [chatbotFilter, isValidChatbotFilter, chatbots.length, setChatbotFilter]);

  // ✅ Pass entityId and chatbotId into conversations.getMany
  // @ts-ignore - Convex type inference issue, works correctly at runtime
  const conversations = usePaginatedQuery(
    api.private.conversations.getMany,
    entityId
      ? {
          entityId,
          status,
          chatbotId,
        }
      : "skip",
    {
      initialNumItems: 10,
    }
  );

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
    isLoadingFirstPage,
  } = useInfiniteScroll({
    status: conversations.status,
    loadMore: conversations.loadMore,
    loadSize: 10,
  });

  return (
    <div className="flex h-full w-full flex-col bg-background text-sidebar-foreground">
      <div className="flex items-center gap-2 border-b p-2">
        <Select
          defaultValue="all"
          onValueChange={(value) =>
            setStatusFilter(
              value as
                | "unresolved"
                | "escalated"
                | "resolved"
                | "voice"
                | "video"
                | "all"
            )
          }
          value={statusFilter}
        >
          <SelectTrigger className="h-8 flex-1 border-none px-1.5 shadow-none ring-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <ListIcon className="size-4" />
                <span>All</span>
              </div>
            </SelectItem>
            <SelectItem value="unresolved">
              <div className="flex items-center gap-2">
                <ArrowRightIcon className="size-4" />
                <span>Unresolved</span>
              </div>
            </SelectItem>
            <SelectItem value="escalated">
              <div className="flex items-center gap-2">
                <ArrowUpIcon className="size-4" />
                <span>Escalated</span>
              </div>
            </SelectItem>
            <SelectItem value="resolved">
              <div className="flex items-center gap-2">
                <CheckIcon className="size-4" />
                <span>Resolved</span>
              </div>
            </SelectItem>
            <SelectItem value="voice">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
                <span>Voice</span>
              </div>
            </SelectItem>
            <SelectItem value="video">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
                <span>Video</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          defaultValue="all"
          onValueChange={(value) => setChatbotFilter(value as any)}
          value={chatbotFilter}
        >
          <SelectTrigger className="h-8 flex-1 border-none px-1.5 shadow-none ring-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-0">
            <SelectValue placeholder="Chatbot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-2">
                <ListIcon className="size-4" />
                <span>All Chatbots</span>
              </div>
            </SelectItem>
            {chatbots.map((chatbot) => (
              <SelectItem key={chatbot._id} value={chatbot._id}>
                <div className="flex items-center gap-2">
                  <span>{chatbot.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoadingFirstPage || !entityId ? (
        <SkeletonConversations />
      ) : (
        <ScrollArea className="max-h-[calc(100vh-53px)]">
          <div className="flex w-full flex-1 flex-col text-sm">
            {conversations.results
              .filter((conversation) => {
                if (!conversation) return false;
                if (statusFilter === "voice") {
                  return String(conversation.kind ?? "") === "voice";
                }
                if (statusFilter === "video") {
                  return String(conversation.kind ?? "") === "video";
                }
                return true;
              })
              .map((conversation) => {
                if (!conversation) return null;

                const isLastMessageFromOperator =
                  conversation.lastMessage?.message?.role === "assistant";
                const preview = getConversationPreview(conversation);

                const country = getCountryFromTimezone(
                  conversation.contactSession.metadata?.timezone
                );
                const countryFlagUrl = country?.code
                  ? getCountryFlagUrl(country.code)
                  : undefined;

                return (
                  <Link
                    key={conversation._id}
                    className={cn(
                      "relative flex cursor-pointer items-start gap-3 border-b p-4 py-5 text-sm text-accent-foreground transition-colors hover:bg-accent/70",
                      pathname === `/conversations/${conversation._id}` &&
                        "bg-accent/80 text-accent-foreground"
                    )}
                    href={`/conversations/${conversation._id}`}
                  >
                    <div
                      className={cn(
                        "-translate-y-1/2 absolute top-1/2 left-0 h-[64%] w-1 rounded-r-full bg-neutral-300 opacity-0 transition-opacity",
                        pathname === `/conversations/${conversation._id}` &&
                          "opacity-100"
                      )}
                    />
                    <DicebearAvatar
                      seed={conversation.contactSession._id}
                      badgeImageUrl={countryFlagUrl}
                      size={40}
                      className="shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex w-full items-center gap-2">
                        <span className="truncate font-bold">
                          {conversation.contactSession.name}
                        </span>
                        <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                          {formatDistanceToNow(conversation._creationTime)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-muted-foreground text-xs">
                          {conversation.caseId}
                          {conversation.chatbotId &&
                            chatbotNameById.get(conversation.chatbotId) &&
                            ` · ${chatbotNameById.get(conversation.chatbotId)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {preview.type}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="flex w-0 grow items-center gap-1">
                          {isLastMessageFromOperator && (
                            <CornerUpLeftIcon className="size-3 shrink-0 text-muted-foreground" />
                          )}
                          <span
                            className={cn(
                              "line-clamp-1 text-muted-foreground text-xs",
                              !isLastMessageFromOperator &&
                                "font-bold text-black"
                            )}
                          >
                            {preview.text}
                          </span>
                        </div>
                        {preview.type !== "Voice" && preview.type !== "Video" && (
                          <ConversationStatusIcon status={conversation.status} />
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>

          <InfiniteScrollTrigger
            canLoadMore={
              statusFilter === "voice" || statusFilter === "video" ? false : canLoadMore
            }
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />
        </ScrollArea>
      )}
    </div>
  );
};

export const SkeletonConversations = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
      <div className="relative flex w-full min-w-0 flex-col p-2">
        <div className="w-full space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              className="flex items-start gap-3 rounded-lg p-4"
              key={index}
            >
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex w-full items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="ml-auto h-3 w-12 shrink-0" />
                    </div>
                    <div className="mt-2">
                    <Skeleton className="h-3 w-full" />
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
