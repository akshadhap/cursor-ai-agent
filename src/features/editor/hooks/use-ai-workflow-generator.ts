"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  aiGeneratorOpenAtom,
  chatMessagesAtom,
  userInputAtom,
  workflowGenerationStateAtom,
  type ChatMessage,
} from "../store/ai-generator-atoms";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook to interact with the AI workflow generator
 */
export function useAiWorkflowGenerator(workflowId: string) {
  const [isOpen, setIsOpen] = useAtom(aiGeneratorOpenAtom);
  const [messages, setMessages] = useAtom(chatMessagesAtom);
  const [userInput, setUserInput] = useAtom(userInputAtom);
  const [generationState, setGenerationState] = useAtom(
    workflowGenerationStateAtom
  );

  /**
   * Open the AI generator with an optional initial message
   */
  const open = useCallback(
    (initialMessage?: string) => {
      setIsOpen(true);
      if (initialMessage) {
        setUserInput(initialMessage);
      }
    },
    [setIsOpen, setUserInput]
  );

  /**
   * Close the AI generator
   */
  const close = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  /**
   * Toggle the AI generator
   */
  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, [setIsOpen]);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || generationState.isGenerating) {
        return;
      }

      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);

      setGenerationState({
        isGenerating: true,
        progress: 0,
        currentStep: "Processing your request...",
        error: null,
      });

      try {
        const response = await fetch("/api/ai-workflow-generator/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId,
            message,
            history: messages,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate response");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);

                  if (parsed.type === "content") {
                    assistantMessage += parsed.content;
                  } else if (parsed.type === "progress") {
                    setGenerationState({
                      isGenerating: true,
                      progress: parsed.progress,
                      currentStep: parsed.step,
                      error: null,
                    });
                  } else if (parsed.type === "complete") {
                    const assistantMsg: ChatMessage = {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: assistantMessage,
                      timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, assistantMsg]);

                    setGenerationState({
                      isGenerating: false,
                      progress: 100,
                      currentStep: "Complete",
                      error: null,
                    });

                    toast.success("Workflow generated successfully!");
                  }
                } catch (e) {
                  console.error("Error parsing SSE data:", e);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An error occurred";

        setGenerationState({
          isGenerating: false,
          progress: 0,
          currentStep: "",
          error: errorMessage,
        });

        toast.error(`Failed to generate workflow: ${errorMessage}`);
      }
    },
    [
      workflowId,
      messages,
      generationState.isGenerating,
      setMessages,
      setGenerationState,
    ]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  /**
   * Reset the generator state
   */
  const reset = useCallback(() => {
    setMessages([]);
    setUserInput("");
    setGenerationState({
      isGenerating: false,
      progress: 0,
      currentStep: "",
      error: null,
    });
  }, [setMessages, setUserInput, setGenerationState]);

  return {
    // State
    isOpen,
    messages,
    userInput,
    generationState,

    // Actions
    open,
    close,
    toggle,
    sendMessage,
    clearMessages,
    reset,

    // Setters (for direct manipulation if needed)
    setIsOpen,
    setMessages,
    setUserInput,
    setGenerationState,
  };
}

/**
 * Hook to quickly send a message to the AI generator
 */
export function useAiPrompt(workflowId: string) {
  const { open, sendMessage } = useAiWorkflowGenerator(workflowId);

  /**
   * Open the AI generator and immediately send a message
   */
  const prompt = useCallback(
    async (message: string) => {
      open();
      // Wait a bit for the UI to open
      await new Promise((resolve) => setTimeout(resolve, 300));
      await sendMessage(message);
    },
    [open, sendMessage]
  );

  return prompt;
}
