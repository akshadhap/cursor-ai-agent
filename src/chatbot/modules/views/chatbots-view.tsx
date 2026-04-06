"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckCircleIcon,
  LinkIcon,
  ArrowLeft,
  LayoutTemplate,
  MoreVertical,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { EditChatbotDialog } from "../dashboard/ui/components/edit-chatbot-dialog";
import { DeleteChatbotDialog } from "../dashboard/ui/components/delete-chatbot-dialog";
import { ConnectChatbotDialog } from "../dashboard/ui/components/connect-chatbot-dialog";
import { PageHeader } from "@/components/page-header";

interface Chatbot {
  _id: Id<"chatbots">;
  name: string;
  description?: string;
  knowledgeBaseId?: Id<"knowledgeBases">;
  greetMessage: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: number;
  updatedAt?: number;
  defaultSuggestions: {
    suggestion1?: string;
    suggestion2?: string;
    suggestion3?: string;
  };
}

type ChatbotRow = Chatbot & {
  appearance?: {
    primaryColor?: string;
  };
};

type KnowledgeBase = {
  _id: Id<"knowledgeBases">;
  name: string;
};

type TemplateDraft = {
  name: string;
  description: string;
  greetMessage: string;
  suggestion1: string;
  suggestion2: string;
  suggestion3: string;
  customSystemPrompt: string;
};

const ORDER_BOT_DEFAULTS: TemplateDraft = {
  name: "Order Assistant",
  description: "Help customers browse the menu and place orders.",
  greetMessage: "Hi! What can I get started for you today?",
  suggestion1: "Show me beverages",
  suggestion2: "What are your bestsellers?",
  suggestion3: "I want to place an order",
  customSystemPrompt:
    "You are an Order Assistant for a restaurant. Your job is to help customers browse the menu, answer questions about items, and help build an order.\n\nData sources and routing rules:\n- For food/menu/order questions (items, prices, categories like beverages/starters, availability, modifiers, order placement), always use the connected Clover integration as the primary source of truth when it is available.\n- If Clover is not connected, returns no items, or the user asks about something not in Clover, fall back to the selected Knowledge Base (if available).\n- If neither Clover nor a Knowledge Base can answer, ask a clarifying question or suggest next steps (connect Clover, upload menu docs).\n\nBehavior rules:\n- Ask clarifying questions (size, quantity, spice level, add-ons) when needed.\n- Confirm the final order clearly before placing it.\n- Keep responses short, friendly, and focused on ordering.\n- Do not answer unrelated general knowledge questions. If a request is unrelated to the restaurant, explain you can help with menu and ordering and ask what they want to order.",
};

export const ChatbotsView = () => {
  const router = useRouter();

  /* ---------------- AUTH / ORG ---------------- */
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

  const knowledgeBasesResult = useQuery(
    api.private.knowledgeBases.list,
    entityId
      ? { entityId, paginationOpts: { numItems: 100, cursor: null } }
      : "skip"
  );

  const chatbots = (chatbotsResult?.page ?? []) as ChatbotRow[];
  const knowledgeBases = (knowledgeBasesResult?.page ?? []) as KnowledgeBase[];
  const isLoading = chatbotsResult === undefined;

  /* ---------------- STATE ---------------- */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<ChatbotRow | null>(null);

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    "order_bot" | null
  >(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>({
    ...ORDER_BOT_DEFAULTS,
  });

  const wizardStorageKey = entityId ? `create_chatbot_wizard:${entityId}` : null;

  useEffect(() => {
    if (!templatesOpen) return;
    setSelectedTemplateId(null);
    setTemplateDraft({
      name: ORDER_BOT_DEFAULTS.name,
      description: ORDER_BOT_DEFAULTS.description,
      greetMessage: ORDER_BOT_DEFAULTS.greetMessage,
      suggestion1: ORDER_BOT_DEFAULTS.suggestion1,
      suggestion2: ORDER_BOT_DEFAULTS.suggestion2,
      suggestion3: ORDER_BOT_DEFAULTS.suggestion3,
      customSystemPrompt: ORDER_BOT_DEFAULTS.customSystemPrompt,
    });
  }, [templatesOpen]);

  /* ---------------- HANDLERS ---------------- */
  const handleEditClick = (chatbot: ChatbotRow) => {
    setSelectedChatbot(chatbot);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (chatbot: ChatbotRow) => {
    setSelectedChatbot(chatbot);
    setDeleteDialogOpen(true);
  };

  const handleConnectClick = (chatbot: ChatbotRow) => {
    setSelectedChatbot(chatbot);
    setConnectDialogOpen(true);
  };

  const getKnowledgeBaseName = (kbId?: Id<"knowledgeBases">) => {
    if (!kbId) return "None";
    const kb = knowledgeBases.find((k) => k._id === kbId);
    return kb?.name || "Unknown";
  };

  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return "—";
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  /* ---------------- UI ---------------- */
  if (!entityId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const applyTemplateAndGo = () => {
    if (typeof window === "undefined") return;
    if (!wizardStorageKey) return;

    const payload = {
      step: 0,
      form: {
        name: templateDraft.name,
        description: templateDraft.description,
        greetMessage: templateDraft.greetMessage,
        suggestion1: templateDraft.suggestion1,
        suggestion2: templateDraft.suggestion2,
        suggestion3: templateDraft.suggestion3,
        customSystemPrompt: templateDraft.customSystemPrompt,
      },
    };

    try {
      localStorage.setItem(wizardStorageKey, JSON.stringify(payload));
    } catch {
      // ignore
    }

    setTemplatesOpen(false);
    setConfirmReplaceOpen(false);
    router.push("/chatbots/create");
  };

  const handleUseTemplate = () => {
    if (typeof window === "undefined") return;
    if (!wizardStorageKey) return;

    let existing: string | null = null;
    try {
      existing = localStorage.getItem(wizardStorageKey);
    } catch {
      existing = null;
    }

    if (existing) {
      setConfirmReplaceOpen(true);
      return;
    }

    applyTemplateAndGo();
  };

  return (
    <>
      <EditChatbotDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        chatbot={selectedChatbot}
        knowledgeBases={knowledgeBases}
        entityId={entityId}
      />

      <DeleteChatbotDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        chatbot={selectedChatbot}
        entityId={entityId}
        isLastChatbot={chatbots.length === 1}
      />

      <ConnectChatbotDialog
        open={connectDialogOpen}
        onOpenChange={setConnectDialogOpen}
        chatbot={selectedChatbot}
        entityId={entityId}
      />

      <div className="flex h-full flex-col bg-muted">
        <PageHeader
          title="Chatbot Builder"
          description="Build and manage chatbots for your organization"
        >
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setTemplatesOpen(true)}
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
        </PageHeader>

        <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Templates</DialogTitle>
              <DialogDescription>
                Start from a ready-made template. You can edit everything before applying.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {selectedTemplateId === null ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full rounded-lg border bg-background p-4 text-left hover:bg-muted/30"
                    onClick={() => {
                      setSelectedTemplateId("order_bot");
                      setTemplateDraft({
                        name: ORDER_BOT_DEFAULTS.name,
                        description: ORDER_BOT_DEFAULTS.description,
                        greetMessage: ORDER_BOT_DEFAULTS.greetMessage,
                        suggestion1: ORDER_BOT_DEFAULTS.suggestion1,
                        suggestion2: ORDER_BOT_DEFAULTS.suggestion2,
                        suggestion3: ORDER_BOT_DEFAULTS.suggestion3,
                        customSystemPrompt: ORDER_BOT_DEFAULTS.customSystemPrompt,
                      });
                    }}
                  >
                    <div className="text-sm font-medium">Order Bot</div>
                    <div className="text-xs text-muted-foreground">
                      A template for a menu + ordering assistant.
                    </div>
                  </button>

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setTemplatesOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => setSelectedTemplateId(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 rounded-lg border bg-background p-4">
                      <div className="text-sm font-medium">Order Bot</div>
                      <div className="text-xs text-muted-foreground">
                        A template for a menu + ordering assistant.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-background p-4 space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="template-name">Chatbot Name</Label>
                        <Input
                          id="template-name"
                          value={templateDraft.name}
                          onChange={(e) =>
                            setTemplateDraft({
                              ...templateDraft,
                              name: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="template-description">Description</Label>
                        <Input
                          id="template-description"
                          value={templateDraft.description}
                          onChange={(e) =>
                            setTemplateDraft({
                              ...templateDraft,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template-greet">Greeting Message</Label>
                      <Textarea
                        id="template-greet"
                        value={templateDraft.greetMessage}
                        onChange={(e) =>
                          setTemplateDraft({
                            ...templateDraft,
                            greetMessage: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="template-s1">Suggestion 1</Label>
                        <Input
                          id="template-s1"
                          value={templateDraft.suggestion1}
                          onChange={(e) =>
                            setTemplateDraft({
                              ...templateDraft,
                              suggestion1: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-s2">Suggestion 2</Label>
                        <Input
                          id="template-s2"
                          value={templateDraft.suggestion2}
                          onChange={(e) =>
                            setTemplateDraft({
                              ...templateDraft,
                              suggestion2: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="template-s3">Suggestion 3</Label>
                        <Input
                          id="template-s3"
                          value={templateDraft.suggestion3}
                          onChange={(e) =>
                            setTemplateDraft({
                              ...templateDraft,
                              suggestion3: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template-system">System Prompt</Label>
                      <Textarea
                        id="template-system"
                        value={templateDraft.customSystemPrompt}
                        onChange={(e) =>
                          setTemplateDraft({
                            ...templateDraft,
                            customSystemPrompt: e.target.value,
                          })
                        }
                        rows={10}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setTemplatesOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={handleUseTemplate}>
                        Use template
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace your saved draft?</AlertDialogTitle>
              <AlertDialogDescription>
                You already have a saved Chatbot Builder draft. Applying this template will overwrite the fields you have already filled.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep draft</AlertDialogCancel>
              <AlertDialogAction onClick={applyTemplateAndGo}>
                Replace with template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-screen-xl">
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center rounded-md border bg-background py-12">
                  <p className="text-muted-foreground">Loading chatbots...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card
                      className="group cursor-pointer border-dashed bg-background/60 py-0 gap-0 hover:bg-accent/30 transition-colors"
                      onClick={() => router.push("/chatbots/create")}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <PlusIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold">Create a new chatbot</div>
                            <div className="text-sm text-muted-foreground">
                              Set the personality, knowledge base, and theme.
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {chatbots.map((chatbot) => {
                      const primaryColor =
                        chatbot?.appearance?.primaryColor ?? "#3b82f6";
                      const canDelete = !(chatbot.isDefault && chatbots.length === 1);

                      return (
                        <Card
                          key={chatbot._id}
                          className="group relative cursor-pointer overflow-hidden py-0 gap-0 hover:shadow-md transition-shadow"
                          onClick={(e) => {
                            const target = e.target as HTMLElement | null;
                            if (target?.closest('[data-slot="dropdown-menu-content"]')) {
                              return;
                            }
                            if (target?.closest('[data-slot="dropdown-menu-trigger"]')) {
                              return;
                            }
                            handleEditClick(chatbot);
                          }}
                        >
                          <div className="h-2 w-full" style={{ background: primaryColor }} />

                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="font-semibold truncate">
                                    {chatbot.name}
                                  </div>
                                  {chatbot.isDefault && (
                                    <Badge variant="secondary" className="shrink-0">
                                      <CheckCircleIcon className="mr-1 h-3 w-3" />
                                      Default
                                    </Badge>
                                  )}
                                  {chatbot.isActive === false && (
                                    <Badge variant="outline" className="shrink-0">
                                      Paused
                                    </Badge>
                                  )}
                                </div>
                                {chatbot.description ? (
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    {chatbot.description}
                                  </div>
                                ) : null}
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleEditClick(chatbot);
                                    }}
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleDeleteClick(chatbot);
                                    }}
                                    disabled={!canDelete}
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">
                                Knowledge base: {getKnowledgeBaseName(chatbot.knowledgeBaseId)}
                              </Badge>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium text-muted-foreground/80">
                                Updated
                              </span>{" "}
                              {formatTimeAgo(chatbot.updatedAt)}
                              <span className="mx-2">•</span>
                              <span className="font-medium text-muted-foreground/80">
                                Created
                              </span>{" "}
                              {formatTimeAgo(chatbot.createdAt)}
                            </div>
                          </CardContent>

                          <CardFooter className="p-4 pt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConnectClick(chatbot);
                              }}
                            >
                              <LinkIcon className="mr-2 h-4 w-4" />
                              Connect
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>

                  {chatbots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <p className="text-sm text-muted-foreground">
                        Start by creating your first chatbot.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
