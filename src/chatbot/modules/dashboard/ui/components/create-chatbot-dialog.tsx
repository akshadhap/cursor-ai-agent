"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { Bot, CheckIcon, Cpu, Database, Palette, Sparkles } from "lucide-react";

const THEME_PRESETS = {
  classic: {
    name: "Classic Glow",
    description: "Warm gold gradient glow",
    primaryColor:
      "linear-gradient(90deg, #F7E07A 0%, #F2B85A 50%, #E08A3A 100%)",
  },
  dark: {
    name: "Dark Mode",
    description: "Sleek dark theme",
    primaryColor: "#1F2937",
  },
} as const;

const CHATBOT_TEMPLATES = {
  support: {
    name: "Support",
    description: "Answer questions and help customers resolve issues.",
    greetMessage: "Hi! I'm your support assistant — how can I help today?",
    suggestions: ["Pricing", "Troubleshooting", "Talk to a human"],
  },
  sales: {
    name: "Sales",
    description: "Qualify leads and guide visitors to the right plan.",
    greetMessage: "Hey! Looking for the right plan? Tell me what you're building.",
    suggestions: ["Plans & pricing", "Book a demo", "Features"],
  },
  faq: {
    name: "FAQ",
    description: "Quick answers to common questions from your docs.",
    greetMessage: "Hi! Ask me anything — I’ll answer from your knowledge base.",
    suggestions: ["Refund policy", "Setup", "Contact support"],
  },
} as const;

type ThemePreset = keyof typeof THEME_PRESETS;
type ChatbotTemplate = keyof typeof CHATBOT_TEMPLATES;

type ChatbotFormState = {
  template: ChatbotTemplate;
  name: string;
  description: string;
  knowledgeBaseId: string;
  greetMessage: string;
  isDefault: boolean;
  suggestion1: string;
  suggestion2: string;
  suggestion3: string;
  themePreset: ThemePreset;
};

const createInitialFormState = (): ChatbotFormState => {
  const template = "support" as const;
  const defaults = CHATBOT_TEMPLATES[template];

  return {
    template,
    name: "",
    description: "",
    knowledgeBaseId: "",
    greetMessage: defaults.greetMessage,
    isDefault: false,
    suggestion1: defaults.suggestions[0] ?? "",
    suggestion2: defaults.suggestions[1] ?? "",
    suggestion3: defaults.suggestions[2] ?? "",
    themePreset: "classic",
  };
};

const BUILD_STAGES = [
  { label: "Forging the core", icon: Cpu, color: "from-violet-500 to-purple-500" },
  {
    label: "Loading knowledge",
    icon: Database,
    color: "from-emerald-500 to-teal-500",
  },
  {
    label: "Infusing personality",
    icon: Sparkles,
    color: "from-orange-500 to-amber-500",
  },
  { label: "Wiring the UI", icon: Palette, color: "from-sky-500 to-blue-500" },
];

function BotBuildIntro({
  onSkip,
}: {
  onSkip: () => void;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const interval = setInterval(() => {
      setStage((prev) =>
        prev < BUILD_STAGES.length - 1 ? prev + 1 : BUILD_STAGES.length - 1,
      );
    }, 380);

    return () => clearInterval(interval);
  }, []);

  const progressValue = ((stage + 1) / BUILD_STAGES.length) * 100;
  const active = BUILD_STAGES[stage];
  const ActiveIcon = active.icon;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border bg-background">
      <motion.div
        className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(139,92,246,0.22), rgba(59,130,246,0.10), transparent 70%)",
        }}
        animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(16,185,129,0.18), rgba(34,211,238,0.10), transparent 70%)",
        }}
        animate={{ x: [0, -35, 0], y: [0, -20, 0] }}
        transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="relative">
              <motion.div
                className="absolute -inset-10 rounded-full bg-gradient-to-r from-violet-500/25 via-cyan-500/20 to-emerald-500/25 blur-2xl"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 12,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              />
              <motion.div
                className="absolute -inset-6 rounded-full border border-primary/20"
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.25, 0.7] }}
                transition={{
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border bg-background/70 shadow-sm">
                <Bot className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Building your chatbot
              </div>
              <motion.div
                key={active.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center gap-2 text-xl font-semibold lg:justify-start"
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${active.color} text-white shadow-sm`}
                >
                  <ActiveIcon className="h-4 w-4" />
                </span>
                <span>{active.label}</span>
              </motion.div>
              <div className="pt-2">
                <Progress value={progressValue} />
              </div>
              <div className="text-xs text-muted-foreground">
                This will only take a moment…
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {BUILD_STAGES.map((s, idx) => {
              const Icon = s.icon;
              const done = idx < stage;
              const active = idx === stage;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    active
                      ? "bg-accent/40"
                      : done
                        ? "bg-muted/30"
                        : "bg-background"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r ${s.color} text-white shadow-sm`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {done ? "Done" : active ? "In progress" : "Queued"}
                    </div>
                  </div>
                  {done ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckIcon className="h-4 w-4 text-emerald-600" />
                    </div>
                  ) : (
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary/60"
                      animate={active ? { scale: [1, 1.4, 1] } : undefined}
                      transition={{
                        duration: 0.9,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                </div>
              );
            })}

            <div className="pt-2">
              <Button variant="outline" className="w-full" onClick={onSkip}>
                Skip animation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KnowledgeBase {
  _id: Id<"knowledgeBases">;
  name: string;
  knowledgeBaseId?: string;
}

interface CreateChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  knowledgeBases: KnowledgeBase[];
  entityId: string;
}

export const CreateChatbotDialog = ({
  open,
  onOpenChange,
  knowledgeBases,
  entityId,
}: CreateChatbotDialogProps) => {
  const createChatbot = useMutation(api.private.chatbots.create);

  const [isCreating, setIsCreating] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ChatbotFormState>(createInitialFormState());

  useEffect(() => {
    if (!open) {
      setForm(createInitialFormState());
      setShowIntro(false);
      setStep(0);
      setIsCreating(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setShowIntro(true);
    const timeout = setTimeout(() => setShowIntro(false), 1700);
    return () => clearTimeout(timeout);
  }, [open]);

  const totalSteps = 3;
  const stepLabel = step === 0 ? "Basics" : step === 1 ? "Knowledge" : "Style";
  const progressValue = ((step + 1) / totalSteps) * 100;

  const selectedTheme = THEME_PRESETS[form.themePreset];
  const selectedTemplate = CHATBOT_TEMPLATES[form.template];
  const kbName = form.knowledgeBaseId
    ? knowledgeBases.find((k) => k._id === form.knowledgeBaseId)?.name ?? "Unknown"
    : "None";
  const previewSuggestions = [form.suggestion1, form.suggestion2, form.suggestion3]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);

  const handleTemplateChange = (value: string) => {
    const templateKey = value as ChatbotTemplate;
    const template = CHATBOT_TEMPLATES[templateKey];
    setForm((prev) => ({
      ...prev,
      template: templateKey,
      greetMessage: template.greetMessage,
      suggestion1: template.suggestions[0] ?? "",
      suggestion2: template.suggestions[1] ?? "",
      suggestion3: template.suggestions[2] ?? "",
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsCreating(true);
    try {
      await createChatbot({
        entityId,
        name: form.name,
        description: form.description || undefined,
        knowledgeBaseId: form.knowledgeBaseId
          ? (form.knowledgeBaseId as Id<"knowledgeBases">)
          : undefined,
        greetMessage: form.greetMessage,
        defaultSuggestions: {
          suggestion1: form.suggestion1 || undefined,
          suggestion2: form.suggestion2 || undefined,
          suggestion3: form.suggestion3 || undefined,
        },
        appearance: {
          primaryColor: THEME_PRESETS[form.themePreset].primaryColor,
        },
        isDefault: form.isDefault,
      });

      toast.success("Chatbot created successfully");
      handleCancel();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create chatbot");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setForm(createInitialFormState());
    setStep(0);
    onOpenChange(false);
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!form.name.trim()) {
        toast.error("Name is required");
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!form.greetMessage.trim()) {
        toast.error("Greeting message is required");
        return;
      }
      setStep(2);
      return;
    }

    await handleCreate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl" disableScrollWrapper>
        <AnimatePresence mode="wait">
          {showIntro ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="flex max-h-[85vh] flex-col"
            >
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <DialogHeader>
                  <DialogTitle>Create Chatbot</DialogTitle>
                  <DialogDescription>
                    One second — we’re assembling everything.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6">
                  <BotBuildIntro onSkip={() => setShowIntro(false)} />
                </div>
              </div>

              <div className="border-t bg-background px-6 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setShowIntro(false)}
                    disabled={isCreating}
                  >
                    Start Building
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex max-h-[85vh] flex-col"
            >
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <DialogHeader>
                  <DialogTitle>Create Chatbot</DialogTitle>
                  <DialogDescription>
                    Build a chatbot in a few steps — you can edit everything later.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-6 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        Step {step + 1} of {totalSteps}
                      </span>
                      <span className="text-muted-foreground">{stepLabel}</span>
                    </div>
                    <Progress value={progressValue} />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
                      {step === 0 ? (
                        <>
                          <div className="space-y-3">
                            <Label>Start with a template</Label>
                            <RadioGroup
                              value={form.template}
                              onValueChange={handleTemplateChange}
                              className="grid gap-3 sm:grid-cols-3"
                            >
                              {(
                                Object.keys(CHATBOT_TEMPLATES) as ChatbotTemplate[]
                              ).map((templateKey) => {
                                const template = CHATBOT_TEMPLATES[templateKey];
                                return (
                                  <div key={templateKey} className="relative">
                                    <RadioGroupItem
                                      value={templateKey}
                                      id={`create-template-${templateKey}`}
                                      className="peer sr-only"
                                    />
                                    <Label
                                      htmlFor={`create-template-${templateKey}`}
                                      className="flex h-full flex-col justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                                    >
                                      <div className="font-semibold">
                                        {template.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {template.description}
                                      </div>
                                    </Label>
                                  </div>
                                );
                              })}
                            </RadioGroup>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="name">Chatbot Name</Label>
                            <Input
                              id="name"
                              placeholder={`e.g., ${selectedTemplate.name} Bot`}
                              value={form.name}
                              onChange={(e) =>
                                setForm({ ...form, name: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                              id="description"
                              placeholder="What is this chatbot for?"
                              value={form.description}
                              onChange={(e) =>
                                setForm({ ...form, description: e.target.value })
                              }
                            />
                          </div>
                        </>
                      ) : null}

                      {step === 1 ? (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="kb">Knowledge Base</Label>
                            <Select
                              value={form.knowledgeBaseId}
                              onValueChange={(value) =>
                                setForm({ ...form, knowledgeBaseId: value })
                              }
                            >
                              <SelectTrigger id="kb">
                                <SelectValue placeholder="Select a knowledge base (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {knowledgeBases.map((kb) => (
                                  <SelectItem key={kb._id} value={kb._id}>
                                    {kb.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="text-xs text-muted-foreground">
                              {knowledgeBases.length === 0
                                ? "No knowledge bases found yet. Upload docs in Knowledge Bases to enable answers from your data."
                                : "Optional, but recommended for accurate answers from your docs."}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="greet">Greeting Message</Label>
                            <Textarea
                              id="greet"
                              placeholder="Hello! How can I help you today?"
                              value={form.greetMessage}
                              onChange={(e) =>
                                setForm({ ...form, greetMessage: e.target.value })
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Suggested questions (optional)</Label>
                            <div className="grid gap-2">
                              <Input
                                placeholder="Suggestion 1"
                                value={form.suggestion1}
                                onChange={(e) =>
                                  setForm({ ...form, suggestion1: e.target.value })
                                }
                              />
                              <Input
                                placeholder="Suggestion 2"
                                value={form.suggestion2}
                                onChange={(e) =>
                                  setForm({ ...form, suggestion2: e.target.value })
                                }
                              />
                              <Input
                                placeholder="Suggestion 3"
                                value={form.suggestion3}
                                onChange={(e) =>
                                  setForm({ ...form, suggestion3: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </>
                      ) : null}

                      {step === 2 ? (
                        <>
                          <div className="space-y-3">
                            <Label>Theme</Label>
                            <RadioGroup
                              value={form.themePreset}
                              onValueChange={(value) =>
                                setForm({
                                  ...form,
                                  themePreset: value as ThemePreset,
                                })
                              }
                              className="grid gap-3 sm:grid-cols-2"
                            >
                              {(Object.keys(THEME_PRESETS) as ThemePreset[]).map(
                                (themeKey) => {
                                  const theme = THEME_PRESETS[themeKey];
                                  return (
                                    <div key={themeKey} className="relative">
                                      <RadioGroupItem
                                        value={themeKey}
                                        id={`create-theme-${themeKey}`}
                                        className="peer sr-only"
                                      />
                                      <Label
                                        htmlFor={`create-theme-${themeKey}`}
                                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                                      >
                                        <div
                                          className="mb-2 h-8 w-8 rounded-full"
                                          style={{ background: theme.primaryColor }}
                                        />
                                        <div className="text-center">
                                          <div className="font-semibold">
                                            {theme.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {theme.description}
                                          </div>
                                        </div>
                                      </Label>
                                    </div>
                                  );
                                },
                              )}
                            </RadioGroup>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="isDefault"
                              checked={form.isDefault}
                              onCheckedChange={(checked) =>
                                setForm({ ...form, isDefault: checked === true })
                              }
                            />
                            <Label htmlFor="isDefault">Set as default chatbot</Label>
                          </div>

                          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                            <div className="font-medium">Review</div>
                            <div className="mt-2 space-y-1 text-muted-foreground">
                              <div>
                                <span className="text-foreground">Name:</span>{" "}
                                {form.name.trim() || "—"}
                              </div>
                              <div>
                                <span className="text-foreground">Template:</span>{" "}
                                {selectedTemplate.name}
                              </div>
                              <div>
                                <span className="text-foreground">Knowledge base:</span>{" "}
                                {kbName}
                              </div>
                              <div>
                                <span className="text-foreground">Theme:</span>{" "}
                                {selectedTheme.name}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>

                    <div className="space-y-3 lg:sticky lg:top-2 self-start">
                      <div className="text-sm font-medium">Live preview</div>
                      <div className="rounded-xl border bg-background overflow-hidden">
                        <div
                          className="h-12 px-4 flex items-center"
                          style={{ background: selectedTheme.primaryColor }}
                        >
                          <div className="text-sm font-semibold text-white truncate">
                            {form.name.trim() || "Your chatbot"}
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="text-xs text-muted-foreground">
                            Knowledge base: {kbName}
                          </div>
                          <div className="rounded-lg bg-muted p-3 text-sm">
                            {form.greetMessage.trim() ||
                              "Hello! How can I help you today?"}
                          </div>
                          {previewSuggestions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {previewSuggestions.map((s, idx) => (
                                <Button
                                  key={`${s}-${idx}`}
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  type="button"
                                >
                                  {s}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Add suggested questions to help users get started.
                            </div>
                          )}
                          <div className="h-9 rounded-md border bg-background" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t bg-background px-6 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    {step > 0 ? (
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={isCreating}
                      >
                        Back
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isCreating}
                    >
                      {step === totalSteps - 1
                        ? isCreating
                          ? "Creating..."
                          : "Create Chatbot"
                        : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
