"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";

import { VapiFormFields } from "./vapi-form-fields";
import { WidgetPreview } from "./widget-preview";
import { LogoManager } from "./logo-manager";
import { FormSchema } from "../../types";
import { widgetSettingsSchema } from "../../schemas";
import { BeyAgentFormFields } from "./bey-agent-form-fields";

// Theme presets
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

const DEFAULT_WIDGET_SIZE = 420;

const resolveWidgetSize = (
  size: number | "small" | "medium" | "large" | undefined,
): number => {
  if (typeof size === "number") return size;
  if (size === "small") return 360;
  if (size === "large") return 520;
  if (size === "medium") return 420;
  return DEFAULT_WIDGET_SIZE;
};

interface Chatbot {
  _id: Id<"chatbots">;
  chatbotId?: string;
  name: string;
  greetMessage: string;
  customSystemPrompt?: string;
  aiAvatarEnabled?: boolean;
  beyondPresenceAgentId?: string;
  isDefault?: boolean;
  knowledgeBaseId?: Id<"knowledgeBases">;
  appearance?: {
    primaryColor?: string;
    size?: number | "small" | "medium" | "large";
    logo?: {
      type: "default" | "upload" | "url";
      size?: number;
      storageId?: Id<"_storage">;
      externalUrl?: string;
      fileName?: string;
      mimeType?: string;
      updatedAt: number;
    };
  };
  defaultSuggestions: {
    suggestion1?: string;
    suggestion2?: string;
    suggestion3?: string;
  };
  vapiSettings?: {
    assistantId?: string;
    phoneNumber?: string;
  };
}

interface CustomizationFormProps {
  chatbot: Chatbot;
  entityId: string;
  hasVapiPlugin?: boolean;
  hasBeyondPresencePlugin?: boolean;
}

export const CustomizationForm = ({
  chatbot,
  entityId,
  hasVapiPlugin,
  hasBeyondPresencePlugin,
}: CustomizationFormProps) => {
  const updateChatbot = useMutation(api.private.chatbots.update);
  const [isLivePreviewEnabled, setIsLivePreviewEnabled] = useState(true);
  const logo = chatbot.appearance?.logo;

  // Determine initial theme based on current color
  const getInitialTheme = useCallback((): ThemePreset => {
    const currentColor = chatbot.appearance?.primaryColor;
    if (currentColor === THEME_PRESETS.dark.primaryColor) return "dark";
    if (currentColor === THEME_PRESETS.classic.primaryColor) return "classic";
    return "classic";
  }, [chatbot.appearance?.primaryColor]);

  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(getInitialTheme());

  const form = useForm<FormSchema>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues: {
      chatbotName: chatbot.name || "Support Assistant",
      greetMessage: chatbot.greetMessage || "Hi! How can I help you?",
      customSystemPrompt: chatbot.customSystemPrompt || "",
      aiAvatarEnabled: chatbot.aiAvatarEnabled ?? false,
      beyondPresenceAgentId: chatbot.beyondPresenceAgentId
        ? chatbot.beyondPresenceAgentId
        : "none",
      appearance: {
        primaryColor: chatbot.appearance?.primaryColor || "",
        size: resolveWidgetSize(chatbot.appearance?.size),
      },
      defaultSuggestions: {
        suggestion1: chatbot.defaultSuggestions?.suggestion1 || "",
        suggestion2: chatbot.defaultSuggestions?.suggestion2 || "",
        suggestion3: chatbot.defaultSuggestions?.suggestion3 || "",
      },
      vapiSettings: {
        assistantId: chatbot.vapiSettings?.assistantId || "",
        phoneNumber: chatbot.vapiSettings?.phoneNumber || "",
      },
    },
  });

  const handleThemeChange = (theme: ThemePreset) => {
    setSelectedTheme(theme);
    form.setValue("appearance.primaryColor", THEME_PRESETS[theme].primaryColor);
  };

  // Reset form when chatbot changes
  useEffect(() => {
    setSelectedTheme(getInitialTheme());
    form.reset({
      chatbotName: chatbot.name || "Support Assistant",
      greetMessage: chatbot.greetMessage || "Hi! How can I help you?",
      customSystemPrompt: chatbot.customSystemPrompt || "",
      aiAvatarEnabled: chatbot.aiAvatarEnabled ?? false,
      beyondPresenceAgentId: chatbot.beyondPresenceAgentId
        ? chatbot.beyondPresenceAgentId
        : "none",
      appearance: {
        primaryColor: chatbot.appearance?.primaryColor || "",
        size: resolveWidgetSize(chatbot.appearance?.size),
      },
      defaultSuggestions: {
        suggestion1: chatbot.defaultSuggestions?.suggestion1 || "",
        suggestion2: chatbot.defaultSuggestions?.suggestion2 || "",
        suggestion3: chatbot.defaultSuggestions?.suggestion3 || "",
      },
      vapiSettings: {
        assistantId: chatbot.vapiSettings?.assistantId || "",
        phoneNumber: chatbot.vapiSettings?.phoneNumber || "",
      },
    });
  }, [chatbot, form, getInitialTheme]);

  const onSubmit = async (values: FormSchema) => {
    try {
      await updateChatbot({
        chatbotId: chatbot._id as any,
        entityId,
        name: values.chatbotName || chatbot.name,
        greetMessage: values.greetMessage,
        customSystemPrompt: values.customSystemPrompt,
        aiAvatarEnabled: values.aiAvatarEnabled,
        beyondPresenceAgentId:
          values.beyondPresenceAgentId === "none"
            ? ""
            : values.beyondPresenceAgentId ?? "",
        appearance: {
          primaryColor: values.appearance?.primaryColor || undefined,
          size: values.appearance?.size || undefined,
        },
        defaultSuggestions: {
          suggestion1: values.defaultSuggestions?.suggestion1 || undefined,
          suggestion2: values.defaultSuggestions?.suggestion2 || undefined,
          suggestion3: values.defaultSuggestions?.suggestion3 || undefined,
        },
        vapiSettings: {
          assistantId:
            values.vapiSettings?.assistantId === "none"
              ? undefined
              : values.vapiSettings?.assistantId || undefined,
          phoneNumber:
            values.vapiSettings?.phoneNumber === "none"
              ? undefined
              : values.vapiSettings?.phoneNumber || undefined,
        },
      });

      toast.success("Chatbot settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  // Add the WidgetPreview component at the root level but control its visibility
  return (
    <>
      <div className="max-w-5xl mx-auto px-4">
        <div className="space-y-6">
          <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
              <CardHeader>
                <CardTitle>General Chat Settings</CardTitle>
                <CardDescription>
                  Configure basic chat widget behavior and messages
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Chatbot Name */}
                <FormField
                  control={form.control}
                  name="chatbotName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chatbot Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Support Assistant, AI Helper"
                        />
                      </FormControl>
                      <FormDescription>
                        The name displayed for your AI assistant in the chat widget
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Greeting Message */}
                <FormField
                  control={form.control}
                  name="greetMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Greeting Message</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Welcome message shown when chat opens"
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Message displayed when users open the chat widget
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Custom System Prompt */}
                <FormField
                  control={form.control}
                  name="customSystemPrompt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom System Prompt (Advanced)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Leave empty to use default AI behavior. Enter custom instructions to modify how the AI assistant responds..."
                          rows={8}
                        />
                      </FormControl>
                      <FormDescription>
                        Advanced: Customize the AI's behavior and personality. Leave empty to use the default prompt.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="aiAvatarEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-x-4 rounded-md border px-3 py-2">
                        <div>
                          <FormLabel>AI Avatar</FormLabel>
                          <FormDescription>
                            When enabled, voice responses will be delivered through an avatar.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={Boolean(field.value)}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Appearance */}
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-4 text-sm font-medium">Appearance</h3>
                    <p className="mb-4 text-muted-foreground text-sm">
                      Customize the look and feel of your chat widget
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <FormLabel>Theme Preset</FormLabel>
                        <RadioGroup value={selectedTheme} onValueChange={handleThemeChange}>
                          <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((themeKey) => {
                              const theme = THEME_PRESETS[themeKey];
                              return (
                                <div key={themeKey} className="relative">
                                  <RadioGroupItem
                                    value={themeKey}
                                    id={`theme-${themeKey}`}
                                    className="peer sr-only"
                                  />
                                  <Label
                                    htmlFor={`theme-${themeKey}`}
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
                            })}
                          </div>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground">
                          Select a theme preset or customize the color below
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="appearance.primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Primary Color (Optional)</FormLabel>
                            <FormControl>
                              {(() => {
                                const value = typeof field.value === "string" ? field.value : "";
                                const isHex = /^#([0-9a-fA-F]{3}){1,2}$/.test(value.trim());
                                const fallbackHex = "#E08A3A";
                                return (
                              <div className="flex items-center gap-x-2">
                                <Input
                                  {...field}
                                  placeholder="linear-gradient(90deg, #F7E07A 0%, #F2B85A 50%, #E08A3A 100%)"
                                  type="text"
                                />
                                <Input
                                  className="h-10 w-20 cursor-pointer"
                                  onChange={(e) => field.onChange(e.target.value)}
                                  type="color"
                                  value={isHex ? value : fallbackHex}
                                  disabled={!isHex}
                                />
                              </div>
                                );
                              })()}
                            </FormControl>
                            <FormDescription>
                              Override theme color with custom hex value
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="appearance.size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Widget Size</FormLabel>
                            <FormControl>
                              <div>
                                <div className="mb-3 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                  For a better experience, turn on Live Preview to see the size change in real time.
                                </div>

                                <div className="mb-3 flex items-center justify-between gap-x-4 rounded-md border px-3 py-2">
                                  <div>
                                    <div className="text-sm font-medium">Live Preview</div>
                                    <div className="text-xs text-muted-foreground">
                                      Toggle to show/hide the widget while resizing
                                    </div>
                                  </div>
                                  <Switch
                                    checked={isLivePreviewEnabled}
                                    onCheckedChange={setIsLivePreviewEnabled}
                                  />
                                </div>

                                <div className="flex items-center gap-x-4">
                                  <Slider
                                    value={[field.value || DEFAULT_WIDGET_SIZE]}
                                    onValueChange={(value) => field.onChange(value[0])}
                                    min={300}
                                    max={600}
                                    step={10}
                                    className="w-full"
                                  />
                                  <span className="text-sm text-muted-foreground">
                                    {field.value || DEFAULT_WIDGET_SIZE}px
                                  </span>
                                </div>

                                <div className="mt-4">
                                  <div className="text-sm font-medium">Recommended sizes</div>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant={field.value === 368 ? "default" : "outline"}
                                      onClick={() => field.onChange(368)}
                                    >
                                      Small
                                    </Button>
                                    <Button
                                      type="button"
                                      variant={field.value === 418 ? "default" : "outline"}
                                      onClick={() => field.onChange(418)}
                                    >
                                      Medium
                                    </Button>
                                    <Button
                                      type="button"
                                      variant={field.value === 468 ? "default" : "outline"}
                                      onClick={() => field.onChange(468)}
                                    >
                                      Large
                                    </Button>
                                  </div>
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    Small: 368px, Medium: 418px, Large: 468px
                                  </div>
                                </div>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Drag the slider to adjust the widget width (height will scale automatically).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Logo Manager */}
                      <div className="space-y-3 pt-4">
                        <FormLabel>Chatbot Logo</FormLabel>
                        <LogoManager
                          chatbotId={chatbot._id as Id<"chatbots">}
                          logo={logo && logo.type ? logo : undefined}
                          entityId={entityId}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Default Suggestions */}
                <div className="space-y-4">
                  <div>
                    <h3 className="mb-4 text-sm font-medium">Default Suggestions</h3>
                    <p className="mb-4 text-muted-foreground text-sm">
                      Quick reply suggestions shown to customers to help guide the conversation
                    </p>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="defaultSuggestions.suggestion1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Suggestion 1</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g. How do I get started?" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="defaultSuggestions.suggestion2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Suggestion 2</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. What are your pricing plans?"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="defaultSuggestions.suggestion3"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Suggestion 3</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g. Can I speak to support?"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vapi Section */}
            {hasVapiPlugin && (
              <Card>
                <CardHeader>
                  <CardTitle>Voice Assistant Settings</CardTitle>
                  <CardDescription>
                    Configure voice calling features powered by Vapi
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <VapiFormFields form={form} />
                </CardContent>
              </Card>
            )}

            {hasBeyondPresencePlugin && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Avatar Settings</CardTitle>
                  <CardDescription>
                    Select the Beyond Presence agent to use for this chatbot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <BeyAgentFormFields form={form} />
                </CardContent>
              </Card>
            )}

            {/* Submit */}
            <div className="mt-8 flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
    
    {/* Widget Preview - controlled by isLivePreviewEnabled */}
    {isLivePreviewEnabled && (
      <WidgetPreview
        chatbot={chatbot}
        chatbotId={chatbot.chatbotId!}
        entityId={entityId}
        width={resolveWidgetSize(form.watch("appearance.size") || undefined)}
        primaryColor={form.watch("appearance.primaryColor")}
        autoShow
      />
    )}
    </>
  );
};
