import { atom } from "jotai";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    language?: string;
  };
}

export interface WorkflowGenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
}

// Main state atoms
export const aiGeneratorOpenAtom = atom<boolean>(false);
export const chatMessagesAtom = atom<ChatMessage[]>([]);
export const workflowGenerationStateAtom = atom<WorkflowGenerationState>({
  isGenerating: false,
  progress: 0,
  currentStep: "",
  error: null,
});

// Language tracking - automatically detected from conversation
export const conversationLanguageAtom = atom<string>("English");

// Input state
export const userInputAtom = atom<string>("");

// Schema context - will be populated with prisma schema
export const schemaContextAtom = atom<string>("");
