/**
 * AI Chat Panel - Chat with AI for content ideas
 */

"use client";

import { useState, useRef, useEffect } from "react";
import {
    SendIcon,
    SparklesIcon,
    Loader2Icon,
    BotIcon,
    UserIcon,
    CopyIcon,
    CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface AIChatPanelProps {
    agentId: string;
    companyName: string;
    industry: string;
    description?: string;
    targetAudience?: string;
    contentTone?: string;
    onUseContent: (content: string) => void;
}

export function AIChatPanel({
    agentId,
    companyName,
    industry,
    description,
    targetAudience,
    contentTone,
    onUseContent,
}: AIChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: `Hi! I'm your LinkedIn content assistant for ${companyName}. I can help you with:\n\n• Generate post ideas for ${industry}\n• Write engaging LinkedIn content\n• Suggest trending topics\n• Optimize your messaging\n\nWhat would you like to create today?`,
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    message: userMessage.content,
                    context: {
                        companyName,
                        industry,
                        description,
                        targetAudience,
                        contentTone,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response");
            }

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: data.response,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            toast.error("Failed to get AI response");
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (id: string, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestedPrompts = [
        "Give me 5 post ideas for this week",
        "Write a thought leadership post about AI",
        "Create an engaging poll for my audience",
        "Help me write a case study post",
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="p-6 border-b">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <SparklesIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold">AI Chat</h1>
                        <p className="text-sm text-muted-foreground">
                            Get content ideas and writing assistance
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex gap-3",
                            message.role === "user" ? "justify-end" : "justify-start"
                        )}
                    >
                        {message.role === "assistant" && (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <BotIcon className="h-4 w-4 text-primary" />
                            </div>
                        )}
                        <div
                            className={cn(
                                "max-w-[70%] rounded-lg p-4",
                                message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                            )}
                        >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.role === "assistant" && message.id !== "welcome" && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => handleCopy(message.id, message.content)}
                                    >
                                        {copiedId === message.id ? (
                                            <CheckIcon className="h-3 w-3 mr-1" />
                                        ) : (
                                            <CopyIcon className="h-3 w-3 mr-1" />
                                        )}
                                        Copy
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => onUseContent(message.content)}
                                    >
                                        <SparklesIcon className="h-3 w-3 mr-1" />
                                        Use in Post
                                    </Button>
                                </div>
                            )}
                        </div>
                        {message.role === "user" && (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <UserIcon className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <BotIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            {messages.length === 1 && (
                <div className="px-6 pb-4">
                    <p className="text-xs text-muted-foreground mb-2">Suggested prompts:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map((prompt) => (
                            <button
                                key={prompt}
                                onClick={() => setInput(prompt)}
                                className="text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="p-6 border-t">
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Ask for content ideas, help writing posts..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[60px] resize-none"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="h-auto"
                    >
                        {isLoading ? (
                            <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                            <SendIcon className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
