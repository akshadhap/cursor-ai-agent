"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Cpu,
  Database,
  LayoutTemplate,
  Palette,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";

import { authClient } from "@/lib/auth-client";
import { api } from "../../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../../convex/_generated/dataModel";
import { useBeyondPresenceAgents } from "@/chatbot/modules/plugins/hooks/use-beyond-presence-data";
import { useVapiAssistants, useVapiPhoneNumbers } from "@/chatbot/modules/plugins/hooks/use-vapi-data";

import { THEME_PRESETS } from "./components/constants";
import { CreateChatbotBuildOverlay } from "./components/create-chatbot-build-overlay";
import { CreateChatbotMockPreview } from "./components/create-chatbot-mock-preview";
import {
  CreateChatbotStepper,
  type CreateChatbotStep,
} from "./components/create-chatbot-stepper";
import {
  createInitialFormState,
  type ChatbotFormState,
  type KnowledgeBase,
} from "./components/types";
import { AiConfigurationStep } from "./components/steps/ai-configuration-step";
import { BasicInfoStep } from "./components/steps/basic-info-step";
import { KnowledgeBaseStep } from "./components/steps/knowledge-base-step";
import { StylingStep } from "./components/steps/styling-step";

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

export default function Page() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  const knowledgeBasesResult = useQuery(
    api.private.knowledgeBases.list,
    entityId
      ? { entityId, paginationOpts: { numItems: 100, cursor: null } }
      : "skip",
  );

  const knowledgeBases: KnowledgeBase[] = knowledgeBasesResult?.page ?? [];

  const createChatbot = useMutation(api.private.chatbots.create);
  const updateChatbot = useMutation(api.private.chatbots.update);
  const createKnowledgeBase = useMutation(api.private.knowledgeBases.create);

  const vapiPlugin = useQuery(
    api.private.plugins.getOne,
    entityId ? { service: "vapi", entityId } : "skip",
  );

  const beyondPresencePlugin = useQuery(
    api.private.plugins.getOne,
    entityId ? { service: "beyond_presence", entityId } : "skip",
  );

  const hasBeyondPresencePlugin = Boolean(beyondPresencePlugin);
  const hasVapiPlugin = Boolean(vapiPlugin);

  const beyondPresenceHooksEnabled =
    beyondPresencePlugin !== undefined && hasBeyondPresencePlugin;
  const vapiHooksEnabled = vapiPlugin !== undefined && hasVapiPlugin;

  const { data: beyondPresenceAgents, isLoading: isBeyondPresenceAgentsLoading } =
    useBeyondPresenceAgents({ enabled: beyondPresenceHooksEnabled });
  const { data: vapiAssistants, isLoading: isVapiAssistantsLoading } =
    useVapiAssistants({ enabled: vapiHooksEnabled });
  const { data: vapiPhoneNumbers, isLoading: isVapiPhoneNumbersLoading } =
    useVapiPhoneNumbers({ enabled: vapiHooksEnabled });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ChatbotFormState>(createInitialFormState());
  const [buildMode, setBuildMode] = useState<"idle" | "building" | "success">(
    "idle",
  );

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<
    "order_bot" | null
  >(null);
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>({
    ...ORDER_BOT_DEFAULTS,
  });

  const storageKey = entityId ? `create_chatbot_wizard:${entityId}` : null;
  const [didRestore, setDidRestore] = useState(false);

  const steps: CreateChatbotStep[] = [
    { id: 1, title: "Basic Info", icon: Settings },
    { id: 2, title: "AI Configuration", icon: Cpu },
    { id: 3, title: "Knowledge Base", icon: Database },
    { id: 4, title: "Styling", icon: Palette },
  ];

  const totalSteps = steps.length;

  const selectedTheme = THEME_PRESETS[form.themePreset];

  const resolvedPrimaryColor = useMemo(() => {
    const override = String(form.primaryColorOverride ?? "").trim();
    return override.length > 0 ? override : selectedTheme.primaryColor;
  }, [form.primaryColorOverride, selectedTheme.primaryColor]);
  const kbName = form.knowledgeBaseId
    ? knowledgeBases.find((k) => k._id === form.knowledgeBaseId)?.name ??
      "Unknown"
    : "None";

  const previewSuggestions = [form.suggestion1, form.suggestion2, form.suggestion3]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);

  useEffect(() => {
    if (!storageKey) return;
    if (didRestore) return;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setDidRestore(true);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.step === "number") {
          setStep(Math.max(0, Math.min(totalSteps - 1, parsed.step)));
        }
        if (parsed.form && typeof parsed.form === "object") {
          setForm({
            ...createInitialFormState(),
            ...(parsed.form as Partial<ChatbotFormState>),
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setDidRestore(true);
    }
  }, [storageKey, didRestore, totalSteps]);

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

  useEffect(() => {
    if (!storageKey) return;
    if (!didRestore) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ step, form }));
    } catch {
      // ignore
    }
  }, [storageKey, didRestore, step, form]);

  const applyTemplate = () => {
    setForm({
      ...form,
      name: templateDraft.name,
      description: templateDraft.description,
      greetMessage: templateDraft.greetMessage,
      suggestion1: templateDraft.suggestion1,
      suggestion2: templateDraft.suggestion2,
      suggestion3: templateDraft.suggestion3,
      customSystemPrompt: templateDraft.customSystemPrompt,
    });
    setTemplatesOpen(false);
    setConfirmOverwriteOpen(false);
  };

  const handleUseTemplate = () => {
    const initial = createInitialFormState();
    const wouldOverwrite =
      form.name !== initial.name ||
      form.description !== initial.description ||
      form.greetMessage !== initial.greetMessage ||
      form.suggestion1 !== initial.suggestion1 ||
      form.suggestion2 !== initial.suggestion2 ||
      form.suggestion3 !== initial.suggestion3 ||
      form.customSystemPrompt !== initial.customSystemPrompt;

    if (wouldOverwrite) {
      setConfirmOverwriteOpen(true);
      return;
    }

    applyTemplate();
  };

  const handleCreate = async () => {
    if (!entityId) return;

    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setBuildMode("building");

    const startedAt = Date.now();
    try {
      const chatbotId = await createChatbot({
        entityId,
        name: form.name,
        description: form.description || undefined,
        knowledgeBaseId: form.knowledgeBaseId ? form.knowledgeBaseId : undefined,
        greetMessage: form.greetMessage,
        defaultSuggestions: {
          suggestion1: form.suggestion1 || undefined,
          suggestion2: form.suggestion2 || undefined,
          suggestion3: form.suggestion3 || undefined,
        },
        appearance: {
          primaryColor: resolvedPrimaryColor,
        },
        isDefault: form.isDefault,
      });

      const nextBeyondPresenceAgentId =
        form.aiAvatarEnabled &&
        String(form.beyondPresenceAgentId).trim().length > 0 &&
        form.beyondPresenceAgentId !== "none"
          ? String(form.beyondPresenceAgentId).trim()
          : undefined;

      const nextVapiSettings =
        form.voiceEnabled &&
        (form.vapiAssistantId !== "none" || form.vapiPhoneNumber !== "none")
          ? {
              assistantId:
                form.vapiAssistantId !== "none"
                  ? String(form.vapiAssistantId).trim() || undefined
                  : undefined,
              phoneNumber:
                form.vapiPhoneNumber !== "none"
                  ? String(form.vapiPhoneNumber).trim() || undefined
                  : undefined,
            }
          : undefined;

      await updateChatbot({
        chatbotId: chatbotId as Id<"chatbots">,
        entityId,
        customSystemPrompt: form.customSystemPrompt.trim() || undefined,
        aiAvatarEnabled: form.aiAvatarEnabled,
        beyondPresenceAgentId: nextBeyondPresenceAgentId,
        vapiSettings: nextVapiSettings,
        appearance: {
          primaryColor: resolvedPrimaryColor,
          size: form.widgetWidth,
        },
        isDefault: form.isDefault,
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 5000 - elapsed));
      }

      setBuildMode("success");
      toast.success("Chatbot created successfully");

      if (storageKey) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }

      setTimeout(() => {
        router.push("/chatbots");
      }, 900);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create chatbot");
      setBuildMode("idle");
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!form.name.trim()) {
        toast.error("Name is required");
        return;
      }
      if (!form.greetMessage.trim()) {
        toast.error("Greeting message is required");
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    await handleCreate();
  };

  if (!entityId || knowledgeBasesResult === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <CreateChatbotBuildOverlay buildMode={buildMode} />

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
                  className="w-full rounded-lg border bg-muted/20 p-4 text-left hover:bg-muted/30"
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

      <AlertDialog open={confirmOverwriteOpen} onOpenChange={setConfirmOverwriteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your current changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Applying this template will overwrite the fields you have already filled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current</AlertDialogCancel>
            <AlertDialogAction onClick={applyTemplate}>
              Replace with template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-3 items-center">
        <div className="justify-self-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/chatbots")}
            disabled={buildMode !== "idle"}
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-center">
          {Math.round((step / (totalSteps - 1)) * 100)}% complete
        </div>
        <div className="justify-self-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setTemplatesOpen(true)}
            disabled={buildMode !== "idle"}
          >
            <LayoutTemplate className="h-4 w-4" />
            Templates
          </Button>
        </div>
      </div>

      {/* <div className="mb-2 pl-1 flex items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-1">
            Create Chatbot
          </h1>
          <p className="text-sm md:text-base text-muted-foreground hidden sm:block">
            Configure your chatbot step by step
          </p>
        </div>
      </div> */}

      <div className="-mt-2">
        <CreateChatbotStepper steps={steps} step={step} />
      </div>

      <ResizablePanelGroup
        direction="horizontal"
        className="h-[calc(100vh-320px)] min-h-[520px] rounded-xl border bg-background overflow-visible"
      >
        <ResizablePanel defaultSize={55} minSize={35}>
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {step === 0 ? (
                <BasicInfoStep form={form} setForm={setForm} />
              ) : null}

              {step === 1 ? (
                <AiConfigurationStep
                  form={form}
                  setForm={setForm}
                  hasBeyondPresencePlugin={hasBeyondPresencePlugin}
                  beyondPresenceAgents={(beyondPresenceAgents as any[]) ?? []}
                  isBeyondPresenceAgentsLoading={isBeyondPresenceAgentsLoading}
                  hasVapiPlugin={hasVapiPlugin}
                  vapiAssistants={(vapiAssistants as any[]) ?? []}
                  isVapiAssistantsLoading={isVapiAssistantsLoading}
                  vapiPhoneNumbers={(vapiPhoneNumbers as any[]) ?? []}
                  isVapiPhoneNumbersLoading={isVapiPhoneNumbersLoading}
                  onOpenBeyondPresenceSettings={() =>
                    router.push("/plugins/ai-avatar")
                  }
                  onOpenVapiSettings={() => router.push("/plugins/vapi")}
                />
              ) : null}

              {step === 2 ? (
                <KnowledgeBaseStep
                  entityId={entityId}
                  form={form}
                  setForm={setForm}
                  knowledgeBases={knowledgeBases}
                  createKnowledgeBase={async (args) => {
                    try {
                      const createdId = await createKnowledgeBase(args);
                      toast.success("Knowledge base created");
                      return createdId;
                    } catch (error) {
                      console.error(error);
                      toast.error("Failed to create knowledge base");
                      throw error;
                    }
                  }}
                />
              ) : null}

              {step === 3 ? (
                <>
                  <StylingStep form={form} setForm={setForm} kbName={kbName} />
                </>
              ) : null}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={45} minSize={35} className="overflow-visible">
          <div className="h-full overflow-visible p-6">
            <CreateChatbotMockPreview
              mode={step === 1 ? "selection" : "chat"}
              name={form.name}
              greetMessage={form.greetMessage}
              suggestions={previewSuggestions}
              primaryColor={resolvedPrimaryColor}
              hasAvatar={Boolean(
                form.aiAvatarEnabled && form.beyondPresenceAgentId !== "none",
              )}
              hasVoice={Boolean(form.voiceEnabled && form.vapiAssistantId !== "none")}
              hasPhone={Boolean(form.voiceEnabled && form.vapiPhoneNumber !== "none")}
              showLauncher={step === 3}
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button
            variant="outline"
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={buildMode !== "idle"}
          >
            Previous
          </Button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push("/chatbots")}
            disabled={buildMode !== "idle"}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleNext} disabled={buildMode !== "idle"}>
            {step === totalSteps - 1 ? "Create Chatbot" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
