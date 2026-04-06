"use client";

import { useState, useRef, useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import {
  aiGeneratorOpenAtom,
  chatMessagesAtom,
  userInputAtom,
  workflowGenerationStateAtom,
  conversationLanguageAtom,
  type ChatMessage,
} from "../store/ai-generator-atoms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Loader2, Sparkles, MessageSquare, ChevronDown, ChevronRight, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { DownloadActionFileButton } from "./download-action-file-button";
import { useTRPC } from "@/trpc/client";

interface AiWorkflowGeneratorOverlayProps {
  workflowId: string;
}

export function AiWorkflowGeneratorOverlay({
  workflowId,
}: AiWorkflowGeneratorOverlayProps) {
  const [isOpen, setIsOpen] = useAtom(aiGeneratorOpenAtom);
  const [messages, setMessages] = useAtom(chatMessagesAtom);
  const [userInput, setUserInput] = useAtom(userInputAtom);
  const [generationState, setGenerationState] = useAtom(
    workflowGenerationStateAtom
  );
  const [conversationLanguage, setConversationLanguage] = useAtom(conversationLanguageAtom);
  
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressStreamRef = useRef<AbortController | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const lastWorkflowIdRef = useRef<string | null>(null);
  const [currentSuggestions, setCurrentSuggestions] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  // Load chat history and recommendations when overlay opens OR when workflowId changes
  useEffect(() => {
    if (isOpen) {
      // If workflow changed, clear messages/suggestions and stop any ongoing generation
      if (lastWorkflowIdRef.current !== workflowId) {
        console.log(`🔄 Workflow changed from ${lastWorkflowIdRef.current} to ${workflowId}`);
        lastWorkflowIdRef.current = workflowId;
        
        // Abort any ongoing progress stream
        if (progressStreamRef.current) {
          console.log('🛑 Aborting previous workflow progress stream');
          progressStreamRef.current.abort();
          progressStreamRef.current = null;
        }
        
        // Clear state for new workflow
        setMessages([]); 
        setCurrentSuggestions([]);
        setGenerationState({
          isGenerating: false,
          progress: 0,
          currentStep: '',
          error: null,
        });
      }
      
      loadChatHistory();
      loadRecommendations();
    }
  }, [isOpen, workflowId]);

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/ai-workflow-generator/history?workflowId=${workflowId}`);
      if (!response.ok) throw new Error('Failed to load history');
      
      const data = await response.json();
      
      if (data.history && data.history.length > 0) {
        const formattedMessages = data.history.map((msg: any) => ({
          id: `${msg.timestamp}-${msg.role}`,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          metadata: msg.metadata,
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`);
      if (!response.ok) return;
      
      const workflow = await response.json();
      const metadata = workflow.stickyNotes as any;
      
      console.log('📋 Loading recommendations from workflow metadata:', metadata);
      
      if (Array.isArray(metadata)) {
        const actionFileEntry = metadata.find((n: any) => n.__actionFile);
        if (actionFileEntry && actionFileEntry.__recommendations) {
          const recs = actionFileEntry.__recommendations;
          console.log('💡 Restored recommendations after refresh:', recs);
          generateSuggestions(recs);
        }
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    }
  };

  // Listen to real-time progress stream from Inngest
  useEffect(() => {
    if (!generationState.isGenerating) return;

    // Abort any existing stream first (prevent cross-contamination between workflows)
    if (progressStreamRef.current) {
      console.log('🛑 Aborting previous progress stream');
      progressStreamRef.current.abort();
    }

    // Create new AbortController for this stream
    const abortController = new AbortController();
    progressStreamRef.current = abortController;

    console.log('🎉 Starting progress stream for workflow:', workflowId);

    // Connect to progress SSE endpoint
    fetch(`/api/ai-workflow-generator/progress?workflowId=${workflowId}`, {
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Progress stream failed');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) return;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'workflow-update') {
                  // New nodes/connections created!
                  console.log(
                    `🎉 +${data.newNodes} nodes, +${data.newConnections} connections`
                  );
                  
                  // Force immediate canvas refresh using tRPC query
                  queryClient.invalidateQueries(
                    trpc.workflows.getOne.queryFilter({ id: workflowId })
                  );

                  // Update recommendations if provided
                  if (data.recommendations && data.recommendations.length > 0) {
                    console.log('💡 Received recommendations from SSE:', data.recommendations);
                    generateSuggestions(data.recommendations);
                  } else {
                    console.warn('⚠️ No recommendations in workflow-update event:', data);
                  }

                  // Keep loading - wait for generation-complete to show recommendations
                  setGenerationState((prev) => ({
                    ...prev,
                    currentStep: `Created ${data.nodeCount} nodes, finalizing...`,
                    progress: 95,
                  }));
                } else if (data.type === 'generation-complete') {
                  console.log('✅ Generation complete!', data);
                  
                  // Update recommendations if provided in completion event
                  if (data.recommendations && data.recommendations.length > 0) {
                    console.log('💡 Received recommendations in completion event:', data.recommendations);
                    generateSuggestions(data.recommendations);
                  } else {
                    console.warn('⚠️ No recommendations in generation-complete event');
                  }
                  
                  // Final refresh using tRPC query
                  queryClient.invalidateQueries(
                    trpc.workflows.getOne.queryFilter({ id: workflowId })
                  );

                  // Stop loading NOW so recommendations can be displayed
                  setGenerationState({
                    isGenerating: false,
                    progress: 100,
                    currentStep: `Complete! ${data.nodeCount} nodes created`,
                    error: null,
                  });
                  
                  console.log('🎯 Loading stopped, current suggestions:', currentSuggestions);
                } else if (data.type === 'timeout') {
                  console.warn('⏱️ Generation timeout');
                  setGenerationState((prev) => ({
                    ...prev,
                    isGenerating: false,
                    currentStep: 'Timed out - refresh to see results',
                  }));
                }
              } catch (e) {
                console.error('Error parsing progress:', e);
              }
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Progress stream error:', error);
        }
      });

    return () => {
      console.log('🛡️ Aborting progress stream');
      abortController.abort();
      progressStreamRef.current = null;
    };
    // Cleanup on unmount or workflowId change
    return () => {
      console.log('🧹 Cleaning up progress stream for workflow:', workflowId);
      if (progressStreamRef.current) {
        progressStreamRef.current.abort();
      }
    };
  }, [generationState.isGenerating, workflowId, queryClient, setGenerationState, trpc]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || generationState.isGenerating) return;

    const userMessage = userInput; // Store before clearing

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setUserInput("");

    // Set generating state
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
          message: userMessage,
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
                  setIsAssistantTyping(true);
                  
                  // Remove [TRIGGER_WORKFLOW] marker from displayed content
                  const cleanContent = assistantMessage.replace('[TRIGGER_WORKFLOW]', '').trim();
                  
                  // Update assistant message in real-time
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.id === "typing") {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, content: cleanContent },
                      ];
                    } else {
                      return [
                        ...prev,
                        {
                          id: "typing",
                          role: "assistant" as const,
                          content: cleanContent,
                          timestamp: new Date(),
                        },
                      ];
                    }
                  });
                } else if (parsed.type === "progress") {
                  setGenerationState({
                    isGenerating: true,
                    progress: parsed.progress,
                    currentStep: parsed.step,
                    error: null,
                  });
                } else if (parsed.type === "complete") {
                  setIsAssistantTyping(false);
                  
                  // Remove [TRIGGER_WORKFLOW] marker before displaying
                  const cleanContent = assistantMessage.replace('[TRIGGER_WORKFLOW]', '').trim();
                  
                  // Replace typing message with final message
                  setMessages((prev) => {
                    const filtered = prev.filter(m => m.id !== "typing");
                    return [
                      ...filtered,
                      {
                        id: Date.now().toString(),
                        role: "assistant" as const,
                        content: cleanContent,
                        timestamp: new Date(),
                      },
                    ];
                  });
                  
                  // Suggestions will come from LLM via workflow-update event
                  // No need to generate here
                  
                  console.log('✅ Chat complete, Inngest job is now creating nodes...');
                  
                  // Keep loading until workflow-update event from progress stream
                  setGenerationState((prev) => ({
                    ...prev,
                    currentStep: "Creating workflow nodes...",
                    progress: 50,
                  }));
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
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: "",
        error: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  // Detect language from text using character ranges
  const detectLanguage = (text: string): 'en' | 'hi' | 'ta' | 'te' | 'kn' => {
    // Devanagari (Hindi): U+0900–U+097F
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Tamil: U+0B80–U+0BFF
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    // Telugu: U+0C00–U+0C7F
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Kannada: U+0C80–U+0CFF
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    // Default to English
    return 'en';
  };

  const generateSuggestions = (recommendations: string[]) => {
    console.log('🎯 generateSuggestions called with:', recommendations);
    // Use LLM-generated recommendations directly
    if (recommendations && recommendations.length > 0) {
      setCurrentSuggestions(recommendations);
      console.log('✅ Current suggestions updated:', recommendations);
    } else {
      console.warn('⚠️ No valid recommendations to set');
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    // Set the input and send immediately
    setUserInput(suggestion);
    
    // Small delay to ensure state updates
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Manually trigger send with the suggestion
    if (!suggestion.trim() || generationState.isGenerating) return;

    const userMessage = suggestion.trim();

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setUserInput(""); // Clear input

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
          message: userMessage,
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
                  setIsAssistantTyping(true);
                  
                  // Update assistant message in real-time (strip marker)
                  const cleanContent = assistantMessage.replace('[TRIGGER_WORKFLOW]', '').trim();
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && lastMsg.id === "typing") {
                      return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, content: cleanContent },
                      ];
                    } else {
                      return [
                        ...prev,
                        {
                          id: "typing",
                          role: "assistant" as const,
                          content: cleanContent,
                          timestamp: new Date(),
                        },
                      ];
                    }
                  });
                } else if (parsed.type === "progress") {
                  setGenerationState({
                    isGenerating: true,
                    progress: parsed.progress,
                    currentStep: parsed.step,
                    error: null,
                  });
                } else if (parsed.type === "complete") {
                  setIsAssistantTyping(false);
                  
                  // Replace typing message with final message (strip marker)
                  const cleanContent = assistantMessage.replace('[TRIGGER_WORKFLOW]', '').trim();
                  setMessages((prev) => {
                    const filtered = prev.filter(m => m.id !== "typing");
                    return [
                      ...filtered,
                      {
                        id: Date.now().toString(),
                        role: "assistant" as const,
                        content: cleanContent,
                        timestamp: new Date(),
                      },
                    ];
                  });
                  
                  // Don't generate new suggestions on suggestion click
                  // Keep showing the same suggestions
                  
                  setGenerationState((prev) => ({
                    ...prev,
                    currentStep: "Creating workflow nodes...",
                    progress: 50,
                  }));
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
      setGenerationState({
        isGenerating: false,
        progress: 0,
        currentStep: "",
        error: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="h-full w-[500px] bg-background border-l shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-semibold">AI Workflow Generator</h2>
                {conversationLanguage !== "English" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Languages className="h-3 w-3" />
                    Responding in {conversationLanguage}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Action File Download */}
          <div className="px-6 py-3 border-b bg-muted/10 flex items-center justify-between gap-3">
            <DownloadActionFileButton workflowId={workflowId} />
          </div>

          {/* Progress Bar */}
          {generationState.isGenerating && (
            <div className="px-6 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">
                  {generationState.currentStep}
                </span>
              </div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${generationState.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {generationState.error && (
            <div className="px-6 py-3 border-b bg-destructive/10 text-destructive text-sm">
              {generationState.error}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-6 py-4">
              <div className="space-y-4">
              {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-full px-4 py-8">
                {/* Marketing Header */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center mb-6"
                >
                  <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Build complex automation workflows in <span className="font-semibold text-foreground">any language</span>. 
                    Just describe what you need, and watch AI create it instantly.
                  </p>
                  
                  {/* Feature Highlights */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary border border-primary/20">
                      <Sparkles className="h-3 w-3" />
                      9 Languages
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-xs font-medium text-green-600 dark:text-green-400 border border-green-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Real-time Generation
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      No Coding Required
                    </span>
                  </div>
                </motion.div>

                <div className="w-full max-w-lg">
                  {/* Language Selector Chips */}
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 text-center">
                      Choose Your Language
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        { id: 'en', label: '🇬🇧 English', gradient: 'from-blue-500 to-blue-600', ring: 'ring-blue-500' },
                        { id: 'es', label: '🇪🇸 Español', gradient: 'from-amber-400 to-red-500', ring: 'ring-red-500' },
                        { id: 'fr', label: '🇫🇷 Français', gradient: 'from-blue-500 to-red-500', ring: 'ring-blue-500' },
                        { id: 'de', label: '🇩🇪 Deutsch', gradient: 'from-slate-700 to-red-500', ring: 'ring-slate-700' },
                        { id: 'ar', label: '🇸🇦 العربية', gradient: 'from-emerald-600 to-emerald-700', ring: 'ring-emerald-600' },
                        { id: 'hi', label: '🇮🇳 हिन्दी', gradient: 'from-orange-500 to-orange-600', ring: 'ring-orange-500' },
                        { id: 'ta', label: '🇮🇳 தமிழ்', gradient: 'from-red-500 to-red-600', ring: 'ring-red-500' },
                        { id: 'te', label: '🇮🇳 తెలుగు', gradient: 'from-amber-500 to-amber-600', ring: 'ring-amber-500' },
                        { id: 'kn', label: '🇮🇳 ಕನ್ನಡ', gradient: 'from-rose-500 to-amber-500', ring: 'ring-rose-500' },
                      ].map((lang) => (
                        <motion.button
                          key={lang.id}
                          onClick={() => setSelectedLanguage(lang.id)}
                          className={cn(
                            "relative px-4 py-2 rounded-full text-xs font-medium transition-all duration-200",
                            "hover:scale-105 active:scale-95",
                            selectedLanguage === lang.id
                              ? `bg-linear-to-r ${lang.gradient} text-white shadow-lg ring-2 ${lang.ring} ring-offset-2 ring-offset-background`
                              : "bg-secondary/50 hover:bg-secondary/80 text-foreground border border-border hover:border-border/80"
                          )}
                          whileTap={{ scale: 0.95 }}
                        >
                          {selectedLanguage === lang.id && (
                            <motion.div
                              layoutId="activeChip"
                              className={cn(
                                "absolute inset-0 rounded-full",
                                `bg-linear-to-r ${lang.gradient}`
                              )}
                              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                          )}
                          <span className="relative z-10">{lang.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Examples for Selected Language */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedLanguage}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-3 text-center">
                        Try These Examples
                      </p>
                      
                      {selectedLanguage === 'en' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Create a workflow that sends welcome emails to new users")}>
                            <span className="text-left">📧 Send welcome emails to new users</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Build a lead scoring workflow with automated follow-ups")}>
                            <span className="text-left">🎯 Lead scoring with automated follow-ups</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Create a workflow to sync Stripe data to my database")}>
                            <span className="text-left">💳 Sync Stripe data to database</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'hi' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("नए उपयोगकर्ताओं को स्वागत ईमेल भेजने के लिए एक वर्कफ़्लो बनाएं")}>
                            <span className="text-left">📧 स्वागत ईमेल भेजें</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("विफल अनुरोधों के लिए त्रुटि प्रबंधन के साथ वर्कफ़्लो बनाएं")}>
                            <span className="text-left">⚠️ त्रुटि प्रबंधन जोड़ें</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Slack सूचनाओं के साथ लीड स्कोरिंग वर्कफ़्लो बनाएं")}>
                            <span className="text-left">🎯 लीड स्कोरिंग वर्कफ़्लो</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'ta' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("புதிய பயனர்களுக்கு வரவேற்பு மின்னஞ்சல்களை அனுப்ப ஒரு பணிப்பாய்வை உருவாக்கவும்")}>
                            <span className="text-left">📧 வரவேற்பு மின்னஞ்சல் அனுப்பவும்</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("பிழை கையாளுதலுடன் பணிப்பாய்வு உருவாக்கவும்")}>
                            <span className="text-left">⚠️ பிழை கையாளுதலைச் சேர்க்கவும்</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Slack அறிவிப்புகளுடன் லீட் ஸ்கோரிங் பணிப்பாய்வை உருவாக்கவும்")}>
                            <span className="text-left">🎯 லீட் ஸ்கோரிங் பணிப்பாய்வு</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'te' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("కొత్త వినియోగదారులకు స్వాగత ఇమెయిల్‌లను పంపడానికి వర్క్‌ఫ్లో సృష్టించండి")}>
                            <span className="text-left">📧 స్వాగత ఇమెయిల్ పంపండి</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("ఇమెయిల్ ఫాలో-అప్‌లతో లీడ్ స్కోరింగ్ వర్క్‌ఫ్లోను నిర్మించండి")}>
                            <span className="text-left">🎯 లీడ్ స్కోరింగ్ వర్క్‌ఫ్లో</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("ఎర్రర్ హ్యాండ్లింగ్‌తో వర్క్‌ఫ్లో సృష్టించండి")}>
                            <span className="text-left">⚠️ ఎర్రర్ హ్యాండ్లింగ్ జోడించండి</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'kn' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("ಹೊಸ ಬಳಕೆದಾರರಿಗೆ ಸ್ವಾಗತ ಇಮೇಲ್‌ಗಳನ್ನು ಕಳುಹಿಸಲು ವರ್ಕ್‌ಫ್ಲೋ ರಚಿಸಿ")}>
                            <span className="text-left">📧 ಸ್ವಾಗತ ಇಮೇಲ್ ಕಳುಹಿಸಿ</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("ಸ್ಟ್ರೈಪ್‌ನಿಂದ ನನ್ನ ಡೇಟಾಬೇಸ್‌ಗೆ ಡೇಟಾವನ್ನು ಸಿಂಕ್ ಮಾಡಲು ಕಾರ್ಯವನ್ನು ರಚಿಸಿ")}>
                            <span className="text-left">💳 ಡೇಟಾವನ್ನು ಸಿಂಕ್ ಮಾಡಿ</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("ದೋಷ ನಿರ್ವಹಣೆಯೊಂದಿಗೆ ವರ್ಕ್‌ಫ್ಲೋ ರಚಿಸಿ")}>
                            <span className="text-left">⚠️ ದೋಷ ನಿರ್ವಹಣೆಯನ್ನು ಸೇರಿಸಿ</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'es' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Crear un flujo de trabajo para enviar notificaciones de Slack cuando lleguen nuevos clientes")}>
                            <span className="text-left">💬 Notificaciones de Slack</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Crear flujo para enviar correos de bienvenida a nuevos usuarios")}>
                            <span className="text-left">📧 Correos de bienvenida</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Agregar manejo de errores y lógica de reintento al flujo")}>
                            <span className="text-left">⚠️ Manejo de errores</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'fr' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Créer un workflow pour analyser les e-mails avec l'IA et envoyer des réponses automatiques")}>
                            <span className="text-left">🤖 Analyse d'e-mails avec IA</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Créer un flux pour envoyer des e-mails de bienvenue aux nouveaux utilisateurs")}>
                            <span className="text-left">📧 E-mails de bienvenue</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Ajouter la gestion des erreurs et la logique de nouvelle tentative")}>
                            <span className="text-left">⚠️ Gestion des erreurs</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'de' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Erstellen Sie einen Workflow zur Automatisierung der Datenvalidierung und Fehlerbehandlung")}>
                            <span className="text-left">✅ Datenvalidierung automatisieren</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Workflow für Willkommens-E-Mails an neue Benutzer erstellen")}>
                            <span className="text-left">📧 Willkommens-E-Mails</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("Fehlerbehandlung und Wiederholungslogik hinzufügen")}>
                            <span className="text-left">⚠️ Fehlerbehandlung</span>
                          </Button>
                        </>
                      )}
                      
                      {selectedLanguage === 'ar' && (
                        <>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("إنشاء سير عمل لإرسال رسائل بريد إلكتروني للمتابعة بعد 3 أيام من التسجيل")}>
                            <span className="text-left">📧 رسائل المتابعة التلقائية</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("إنشاء سير عمل لإرسال رسائل ترحيب للمستخدمين الجدد")}>
                            <span className="text-left">👋 رسائل الترحيب</span>
                          </Button>
                          <Button variant="outline" className="w-full justify-start text-sm h-auto py-3 hover:bg-accent hover:scale-[1.02] transition-all border-border/50 hover:border-border hover:shadow-sm" onClick={() => setUserInput("إضافة معالجة الأخطاء ومنطق إعادة المحاولة")}>
                            <span className="text-left">⚠️ معالجة الأخطاء</span>
                          </Button>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex flex-col gap-2",
                      message.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[85%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                
                {/* Suggestion Chips */}
                {currentSuggestions.length > 0 && !generationState.isGenerating && (
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Quick Actions</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[10rem] overflow-y-auto pr-1">
                      {currentSuggestions.map((suggestion, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="h-auto min-h-[3rem] py-2.5 px-3 rounded-md text-xs font-medium whitespace-normal text-left leading-snug hover:bg-accent hover:scale-[1.02] transition-all border-border/60 hover:border-primary/50 hover:shadow-sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <span className="line-clamp-3 break-words">{suggestion}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="border-t px-6 py-4">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your workflow..."
                disabled={generationState.isGenerating}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || generationState.isGenerating}
                size="icon"
              >
                {generationState.isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
