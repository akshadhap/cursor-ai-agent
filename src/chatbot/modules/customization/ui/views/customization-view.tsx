"use client";

import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2Icon } from "lucide-react";
import { CustomizationForm } from "../components/customization-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { PageHeader } from "@/components/page-header";

const CHATBOT_CUSTOMIZATION_KEY = "customization-chatbot-id";

export const CustomizationView = () => {
  /* ---------------- AUTH / ORG (UNCHANGED SOURCE) ---------------- */
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  /* ---------------- DATA ---------------- */
  const chatbotsResult = useQuery(
    api.private.chatbots.getMany,
    entityId
      ? { entityId, paginationOpts: { numItems: 100, cursor: null } }
      : "skip"
  );

  const chatbots = chatbotsResult?.page ?? [];

  const vapiPlugin = useQuery(
    api.private.plugins.getOne,
    entityId ? { service: "vapi", entityId } : "skip"
  );

  const beyondPresencePlugin = useQuery(
    api.private.plugins.getOne,
    entityId ? { service: "beyond_presence", entityId } : "skip"
  );

  const [selectedChatbotId, setSelectedChatbotId] =
    useState<Id<"chatbots"> | null>(null);
  const [hasInitializedSelection, setHasInitializedSelection] =
    useState(false);

  /* ---------------- LOAD PERSISTED SELECTION ---------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!entityId) {
      setSelectedChatbotId(null);
      setHasInitializedSelection(false);
      return;
    }

    const scopedKey = `${CHATBOT_CUSTOMIZATION_KEY}:${entityId}`;
    const stored = localStorage.getItem(scopedKey) as
      | Id<"chatbots">
      | null;

    setSelectedChatbotId(stored);
    setHasInitializedSelection(true);
  }, [entityId]);

  /* ---------------- AUTO-SELECT DEFAULT / FALLBACK ---------------- */
  useEffect(() => {
    if (chatbotsResult === undefined || !hasInitializedSelection) return;

    if (selectedChatbotId) {
      const valid = chatbots.some((c) => c._id === selectedChatbotId);
      if (valid) return;
    }

    const defaultChatbot = chatbots.find((c) => c.isDefault);
    if (defaultChatbot) {
      setSelectedChatbotId(defaultChatbot._id);
      return;
    }

    if (chatbots[0]) {
      setSelectedChatbotId(chatbots[0]._id);
      return;
    }

    setSelectedChatbotId(null);
  }, [chatbots, chatbotsResult, selectedChatbotId, hasInitializedSelection]);

  /* ---------------- PERSIST SELECTION ---------------- */
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !entityId ||
      !selectedChatbotId
    ) {
      return;
    }

    const scopedKey = `${CHATBOT_CUSTOMIZATION_KEY}:${entityId}`;
    localStorage.setItem(scopedKey, selectedChatbotId);
  }, [entityId, selectedChatbotId]);

  const selectedChatbot = chatbots.find(
    (c) => c._id === selectedChatbotId
  );

  const isLoading =
    chatbotsResult === undefined ||
    vapiPlugin === undefined ||
    beyondPresencePlugin === undefined ||
    entityId === null;

  /* ---------------- LOADING ---------------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-y-2 bg-muted p-8">
        <Loader2Icon className="animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Loading settings...
        </p>
      </div>
    );
  }

  /* ---------------- EMPTY STATE ---------------- */
  if (!chatbots || chatbots.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-muted p-8">
        <div className="max-w-screen-md mx-auto w-full">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl">
              Advanced Customization
            </h1>
            <p className="text-muted-foreground">
              No chatbots found. Please create a chatbot first from
              the Chatbots page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- MAIN ---------------- */
  return (
    <div className="flex h-full flex-col bg-muted">
      <PageHeader
        title="Advanced Customization"
        description="Fine-tune appearance, behavior, and advanced settings for your chatbots"
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-screen-md mx-auto w-full">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="chatbot-select">
                Select Chatbot to Customize
              </Label>
              <Select
                value={selectedChatbotId ?? undefined}
                onValueChange={(value) =>
                  setSelectedChatbotId(value as Id<"chatbots">)
                }
              >
                <SelectTrigger id="chatbot-select">
                  <SelectValue placeholder="Select a chatbot" />
                </SelectTrigger>
                <SelectContent>
                  {chatbots.map((chatbot) => (
                    <SelectItem key={chatbot._id} value={chatbot._id}>
                      {chatbot.name}
                      {chatbot.isDefault && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedChatbot && entityId && (
              <CustomizationForm
                chatbot={selectedChatbot}
                entityId={entityId}
                hasVapiPlugin={!!vapiPlugin}
                hasBeyondPresencePlugin={!!beyondPresencePlugin}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
