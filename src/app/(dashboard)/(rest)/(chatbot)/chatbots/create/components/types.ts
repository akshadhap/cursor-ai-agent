import type { Id } from "../../../../../../../../convex/_generated/dataModel";
import { CHATBOT_TEMPLATES, THEME_PRESETS } from "./constants";

export type ThemePreset = keyof typeof THEME_PRESETS;
export type ChatbotTemplate = keyof typeof CHATBOT_TEMPLATES;

export type BuildMode = "idle" | "building" | "success";

export type ChatbotFormState = {
  template: ChatbotTemplate;
  name: string;
  description: string;
  knowledgeBaseId: Id<"knowledgeBases"> | "";
  greetMessage: string;
  customSystemPrompt: string;
  aiAvatarEnabled: boolean;
  beyondPresenceAgentId: string;
  voiceEnabled: boolean;
  vapiAssistantId: string;
  vapiPhoneNumber: string;
  isDefault: boolean;
  suggestion1: string;
  suggestion2: string;
  suggestion3: string;
  themePreset: ThemePreset;
  primaryColorOverride: string;
  widgetWidth: number;
  logoDataUrl: string;
  logoFileName: string;
  logoMimeType: string;
};

export interface KnowledgeBase {
  _id: Id<"knowledgeBases">;
  name: string;
  knowledgeBaseId?: string;
}

export const createInitialFormState = (): ChatbotFormState => {
  const template = "support" as const;
  const defaults = CHATBOT_TEMPLATES[template];

  return {
    template,
    name: "",
    description: "",
    knowledgeBaseId: "",
    greetMessage: defaults.greetMessage,
    customSystemPrompt: "",
    aiAvatarEnabled: false,
    beyondPresenceAgentId: "none",
    voiceEnabled: false,
    vapiAssistantId: "none",
    vapiPhoneNumber: "none",
    isDefault: false,
    suggestion1: defaults.suggestions[0] ?? "",
    suggestion2: defaults.suggestions[1] ?? "",
    suggestion3: defaults.suggestions[2] ?? "",
    themePreset: "classic",
    primaryColorOverride: "",
    widgetWidth: 418,
    logoDataUrl: "",
    logoFileName: "",
    logoMimeType: "",
  };
};
