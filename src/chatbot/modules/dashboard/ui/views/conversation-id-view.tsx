"use client";


import { useInfiniteScroll } from "../hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "../components/infinite-scroll-trigger";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useAction, useMutation, useQuery } from "convex/react";
import { MoreHorizontal , MoreHorizontalIcon, Wand2Icon} from "lucide-react";
import { ConversationStatusButton } from "../components/conversation-status-button"
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AIConversation,
  AIConversationContent,
  AIConversationScrollButton,
} from "../components/ai/conversation";
import {
  AIInput,
  AIInputButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from "../components/ai/input";
import {
  AIMessage,
  AIMessageContent,
} from "../components/ai/message";
import { AIResponse } from "../components/ai/response";
import { Form, FormField } from "@/components/ui/form";
import { z } from "zod"; 
import { useForm } from "react-hook-form"; 
import {zodResolver} from "@hookform/resolvers/zod";
import {toUIMessages,useThreadMessages} from "@convex-dev/agent/react";
import { DicebearAvatar } from "../components/dicebear-avatar";
import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";

import { useState } from "react";
import { toast } from "sonner";

//1
const formSchema = z.object({
  message: z.string().min(1, "Message is required"),
});



export const ConversationIdView = ({
  conversationId,
}: {
  conversationId: Id<"conversations">;
}) => {
  // 🔐 BetterAuth session
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // 🧠 Convex users (to get org ID)
  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  const conversation = useQuery(
    api.private.conversations.getOne,
    entityId
      ? {
          conversationId,
          entityId,
        }
      : "skip",
  );
  const chatbot = useQuery(
  api.private.chatbots.getOne,
  conversation?.chatbotId && entityId
    ? {
        chatbotId: conversation.chatbotId,
        entityId,
      }
    : "skip"
);


  const messages = useThreadMessages(
    api.private.messages.getMany,
    conversation?.threadId && entityId
      ? {
          threadId: conversation.threadId,
          entityId,
        }
      : "skip",
    { initialNumItems: 10 },
  );

  const isTranscriptConversation = messages.results?.some((message) => {
    const text = message.text ?? "";
    return text.startsWith("[Voice]") || text.startsWith("[Video]");
  });

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingMore,
  } = useInfiniteScroll({
    status: messages.status,
    loadMore: messages.loadMore,
    loadSize: 10,
  });

  //2
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  const [isEnhancing, setIsEnhancing] = useState(false);
  const enhanceResponse = useAction(api.private.messages.enhanceResponse);

  const handleEnhanceResponse = async () => {
    if (!entityId) return;
    
    setIsEnhancing(true);
    const currentValue = form.getValues("message");

    try {
      const response = await enhanceResponse({
  prompt: currentValue,
  entityId,
});

      form.setValue("message", response);
    } catch (error) {
       toast.error("Failed to enhance response.");
      console.error(error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const createMessage = useAction(api.private.messages.create);
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!entityId) return;

    try {
      await createMessage({
        conversationId,
        prompt: values.message,
        entityId,
        agentName:
          session?.user?.name ?? session?.user?.email ?? "Operator",
      });

      form.reset();
    } catch (error) {
      console.error(error);
    }
  };

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const updateConversationStatus = useAction(api.private.conversations.updateStatus);
  const handleToggleStatus = async () => {
    if (!conversation || !entityId) {
      return;
    }
    setIsUpdatingStatus(true);

    let newStatus: "unresolved" | "resolved" | "escalated";

    // Cyc
    if (conversation.status === "unresolved") {
      newStatus = "escalated";
    } else if (conversation.status === "escalated") {
      newStatus = "resolved";
    } else {
      newStatus = "unresolved";
    }

    

    try {
      
      await updateConversationStatus({
  conversationId,
  status: newStatus,
  entityId,
});

    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (conversation === undefined || messages.status === "LoadingFirstPage") {
    return <ConversationIdViewLoading />;
  }

  return (
    <div className="flex h-full flex-col bg-muted">
      <PageHeader
        title={chatbot?.name ?? "Conversation"}
        description={conversation ? conversation.caseId : undefined}
      >
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost">
            <MoreHorizontalIcon />
          </Button>
        </div>

        {!!conversation && !isTranscriptConversation && (
          <ConversationStatusButton
            onClick={handleToggleStatus}
            status={conversation?.status}
            disabled={isUpdatingStatus}
          />
        )}
      </PageHeader>
      {/* 1 */}
      <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          <InfiniteScrollTrigger
            canLoadMore={canLoadMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={handleLoadMore}
            ref={topElementRef}
          />

          {toUIMessages(messages.results ?? [])?.map((message) => (
            <AIMessage
              key={message.id}
              // In reverse, because we are watching from "assistant" perspective
              from={message.role === "user" ? "assistant" : "user"}
            >
              <AIMessageContent>
                <AIResponse>{message.text}</AIResponse>
              </AIMessageContent>
              {message.role === "user" && (
                <DicebearAvatar
                  seed={conversation?.contactSessionId ?? "user"}
                  size={32}
                />
              )}
            </AIMessage>
          ))}
        </AIConversationContent>
        <AIConversationScrollButton />
      </AIConversation>
      <div className="p-2">
        <Form {...form}>
          <AIInput onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <AIInputTextarea
                  disabled={
                    isTranscriptConversation ||
                    conversation?.status === "resolved" ||
                    form.formState.isSubmitting ||
                    isEnhancing
                  }
                  onChange={field.onChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      form.handleSubmit(onSubmit)();
                    }
                  }}
                  placeholder={
                    isTranscriptConversation
                      ? "This is a transcript and cannot be replied to."
                      : conversation?.status === "resolved"
                      ? "This conversation has been resolved"
                      : "Type your response as an operator..."
                  }
                  value={field.value}
                />
              )}
            />
            <AIInputToolbar>
              <AIInputTools>
                <AIInputButton
                  onClick={handleEnhanceResponse}
                  disabled={
                    isTranscriptConversation ||
                    conversation?.status === "resolved" ||
                    isEnhancing ||
                    !form.formState.isValid
                  }
                >
                  <Wand2Icon />
                  {isEnhancing ? "Enhancing..." : "Enhance"}
                </AIInputButton>
              </AIInputTools>
              <AIInputSubmit
                disabled={
                  isTranscriptConversation ||
                  conversation?.status === "resolved" ||
                  !form.formState.isValid ||
                  form.formState.isSubmitting
                }
                status="ready"
                type="submit"
              />
            </AIInputToolbar>
          </AIInput>
        </Form>
      </div>
    </div>
  );
};

export const ConversationIdViewLoading = () => {
  return (
    <div className="flex h-full flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background p-2.5">
        <Button disabled size="sm" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </header>
      <AIConversation className="max-h-[calc(100vh-180px)]">
        <AIConversationContent>
          {Array.from({ length: 8 }, (_, index) => {
            const isUser = index % 2 === 0;
            const widths = ["w-48", "w-60", "w-72"];
            const width = widths[index % widths.length];

            return (
              <div
                className={cn(
                  "group flex w-full items-end justify-end gap-2 py-2 [&>div]:max-w-[80%]",
                  isUser ? "is-user" : "is-assistant flex-row-reverse",
                )}
                key={index}
              >
                <Skeleton className={`h-9 ${width} rounded-lg bg-neutral-200`} />
                <Skeleton className="size-8 rounded-full bg-neutral-200" />
              </div>
            );
          })}
        </AIConversationContent>
      </AIConversation>
      <div className="p-2">
        <AIInput>
          <AIInputTextarea
            disabled
            placeholder="Type your response as an operator..."
          />
          <AIInputToolbar>
            <AIInputTools />
            <AIInputSubmit disabled status="ready" />
          </AIInputToolbar>
        </AIInput>
      </div>
    </div>
  );
};






