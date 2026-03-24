"use client";

import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
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
import { useRouter } from "next/navigation";
import { PaletteIcon } from "lucide-react";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "../../../../../../convex/_generated/dataModel";

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

type ThemePreset = keyof typeof THEME_PRESETS;
type EditThemePreset = ThemePreset | "current";

type EditChatbotFormState = {
  name: string;
  description: string;
  knowledgeBaseId: string;
  greetMessage: string;
  isDefault: boolean;
  suggestion1: string;
  suggestion2: string;
  suggestion3: string;
  themePreset: EditThemePreset;
};

const createInitialFormState = (): EditChatbotFormState => ({
  name: "",
  description: "",
  knowledgeBaseId: "",
  greetMessage: "",
  isDefault: false,
  suggestion1: "",
  suggestion2: "",
  suggestion3: "",
  themePreset: "current",
});

interface KnowledgeBase {
  _id: Id<"knowledgeBases">;
  name: string;
  knowledgeBaseId?: string;
}

interface Chatbot {
  _id: Id<"chatbots">;
  name: string;
  description?: string;
  knowledgeBaseId?: Id<"knowledgeBases">;
  greetMessage: string;
  isDefault: boolean;
  defaultSuggestions: {
    suggestion1?: string;
    suggestion2?: string;
    suggestion3?: string;
  };
  appearance?: {
    primaryColor?: string;
  };
}

interface EditChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: Chatbot | null;
  knowledgeBases: KnowledgeBase[];
  entityId: string;
}

export const EditChatbotDialog = ({
  open,
  onOpenChange,
  chatbot,
  knowledgeBases,
  entityId,
}: EditChatbotDialogProps) => {
  const updateChatbot = useMutation(api.private.chatbots.update);

  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EditChatbotFormState>(createInitialFormState());

  useEffect(() => {
    if (!open) return;
    if (!chatbot) return;

    setForm({
      name: chatbot.name,
      description: chatbot.description || "",
      knowledgeBaseId: chatbot.knowledgeBaseId || "",
      greetMessage: chatbot.greetMessage,
      isDefault: chatbot.isDefault,
      suggestion1: chatbot.defaultSuggestions.suggestion1 || "",
      suggestion2: chatbot.defaultSuggestions.suggestion2 || "",
      suggestion3: chatbot.defaultSuggestions.suggestion3 || "",
      themePreset: "current",
    });
    setStep(0);
  }, [open, chatbot]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setIsUpdating(false);
    }
  }, [open]);

  if (!chatbot) return null;

  const totalSteps = 3;
  const stepLabel = step === 0 ? "Basics" : step === 1 ? "Knowledge" : "Style";
  const progressValue = ((step + 1) / totalSteps) * 100;

  const kbName = form.knowledgeBaseId
    ? knowledgeBases.find((k) => k._id === form.knowledgeBaseId)?.name ?? "Unknown"
    : "None";

  const previewSuggestions = [form.suggestion1, form.suggestion2, form.suggestion3]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);

  const currentPrimaryColor = chatbot.appearance?.primaryColor ?? "#3b82f6";
  const previewPrimaryColor =
    form.themePreset === "current"
      ? currentPrimaryColor
      : THEME_PRESETS[form.themePreset].primaryColor;

  const previewThemeName =
    form.themePreset === "current" ? "Current" : THEME_PRESETS[form.themePreset].name;

  const handleUpdate = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsUpdating(true);
    try {
      const updateArgs: Parameters<typeof updateChatbot>[0] = {
        chatbotId: chatbot._id,
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
        isDefault: form.isDefault,
      };

      if (form.themePreset !== "current") {
        updateArgs.appearance = {
          primaryColor: THEME_PRESETS[form.themePreset].primaryColor,
        };
      }

      await updateChatbot(updateArgs);

      toast.success("Chatbot updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update chatbot");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
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

    await handleUpdate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl" disableScrollWrapper>
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <DialogHeader>
              <DialogTitle>Edit Chatbot</DialogTitle>
              <DialogDescription>
                Update your chatbot in a few steps — you can fine-tune everything anytime.
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
                      <div className="space-y-2">
                        <Label htmlFor="edit-name">Chatbot Name</Label>
                        <Input
                          id="edit-name"
                          placeholder="e.g., Support Bot"
                          value={form.name}
                          onChange={(e) =>
                            setForm({ ...form, name: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-description">Description (optional)</Label>
                        <Textarea
                          id="edit-description"
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
                        <Label htmlFor="edit-kb">Knowledge Base</Label>
                        <Select
                          value={form.knowledgeBaseId}
                          onValueChange={(value) =>
                            setForm({ ...form, knowledgeBaseId: value })
                          }
                        >
                          <SelectTrigger id="edit-kb">
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
                        <Label htmlFor="edit-greet">Greeting Message</Label>
                        <Textarea
                          id="edit-greet"
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
                              themePreset: value as EditThemePreset,
                            })
                          }
                          className="grid gap-3 sm:grid-cols-3"
                        >
                          <div className="relative">
                            <RadioGroupItem
                              value="current"
                              id="edit-theme-current"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="edit-theme-current"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                            >
                              <div
                                className="mb-2 h-8 w-8 rounded-full"
                                style={{ background: currentPrimaryColor }}
                              />
                              <div className="text-center">
                                <div className="font-semibold">Current</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Keep existing
                                </div>
                              </div>
                            </Label>
                          </div>

                          {(Object.keys(THEME_PRESETS) as ThemePreset[]).map(
                            (themeKey) => {
                              const theme = THEME_PRESETS[themeKey];
                              return (
                                <div key={themeKey} className="relative">
                                  <RadioGroupItem
                                    value={themeKey}
                                    id={`edit-theme-${themeKey}`}
                                    className="peer sr-only"
                                  />
                                  <Label
                                    htmlFor={`edit-theme-${themeKey}`}
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                                  >
                                    <div
                                      className="mb-2 h-8 w-8 rounded-full"
                                      style={{ background: theme.primaryColor }}
                                    />
                                    <div className="text-center">
                                      <div className="font-semibold">{theme.name}</div>
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
                          id="edit-isDefault"
                          checked={form.isDefault}
                          onCheckedChange={(checked) =>
                            setForm({ ...form, isDefault: checked === true })
                          }
                        />
                        <Label htmlFor="edit-isDefault">Set as default chatbot</Label>
                      </div>

                      <Button
                        variant="ghost"
                        className="w-full justify-start items-center gap-2"
                        title="Customize Appearance & Advanced Settings"
                        onClick={() => {
                          try {
                            const CHATBOT_CUSTOMIZATION_KEY = "customization-chatbot-id";
                            if (entityId) {
                              const scopedKey = `${CHATBOT_CUSTOMIZATION_KEY}:${entityId}`;
                              localStorage.setItem(scopedKey, chatbot._id);
                            }
                          } catch (e) {
                            // ignore localStorage errors
                          }
                          router.push("/customization");
                        }}
                      >
                        <PaletteIcon className="mr-2 h-4 w-4" />
                        <span>Customize Appearance & Advanced Settings</span>
                      </Button>

                      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                        <div className="font-medium">Review</div>
                        <div className="mt-2 space-y-1 text-muted-foreground">
                          <div>
                            <span className="text-foreground">Name:</span>{" "}
                            {form.name.trim() || "—"}
                          </div>
                          <div>
                            <span className="text-foreground">Knowledge base:</span>{" "}
                            {kbName}
                          </div>
                          <div>
                            <span className="text-foreground">Theme:</span>{" "}
                            {previewThemeName}
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
                      style={{ background: previewPrimaryColor }}
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
              <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
                Cancel
              </Button>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {step > 0 ? (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={isUpdating}
                  >
                    Back
                  </Button>
                ) : null}
                <Button type="button" onClick={handleNext} disabled={isUpdating}>
                  {step === totalSteps - 1
                    ? isUpdating
                      ? "Saving..."
                      : "Save Changes"
                    : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
