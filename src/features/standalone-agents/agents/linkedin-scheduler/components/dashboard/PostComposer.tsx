/**
 * Post Composer - Create LinkedIn posts with AI
 * Tabs: AI Generate | Write | From URL
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import {
    SparklesIcon,
    PencilIcon,
    LinkIcon,
    ImageIcon,
    UploadIcon,
    Loader2Icon,
    XIcon,
    SendIcon,
    CalendarIcon,
    EyeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SchedulePicker } from "./SchedulePicker";
import { LinkedInFullPagePreview } from "./LinkedInFullPagePreview";

type ComposerTab = "generate" | "write" | "url";

interface PostComposerProps {
    initialContent?: string;
    initialImagePreview?: string | null;
    onContentChange: (content: string) => void;
    onImageChange: (image: File | null) => void;
    onGenerate: (prompt: string) => Promise<string>;
    onExtractFromUrl: (url: string) => Promise<string>;
    onPost?: (content: string, image?: File | null) => Promise<void>;
    onSchedule?: (content: string, scheduledFor: Date, image?: File | null) => Promise<void>;
    onSaveDraft?: (content: string, imagePreview?: string | null) => void;
    onCancel?: () => void;
    isGenerating: boolean;
    isPosting?: boolean;
    // Author info for preview
    authorName?: string;
    authorTitle?: string;
    // Agent ID for image generation
    agentId?: string;
}

export function PostComposer({
    initialContent = "",
    initialImagePreview = null,
    onContentChange,
    onImageChange,
    onGenerate,
    onExtractFromUrl,
    onPost,
    onSchedule,
    onSaveDraft,
    onCancel,
    isGenerating,
    isPosting = false,
    authorName = "You",
    authorTitle = "Professional",
    agentId,
}: PostComposerProps) {
    const [activeTab, setActiveTab] = useState<ComposerTab>("generate");
    const [content, setContent] = useState(initialContent);
    const [prompt, setPrompt] = useState("");
    const [url, setUrl] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(initialImagePreview);
    const [isDragOver, setIsDragOver] = useState(false);
    const [showScheduler, setShowScheduler] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [showFullPagePreview, setShowFullPagePreview] = useState(false);

    // AI Image Generation state
    const [showAiImageGen, setShowAiImageGen] = useState(false);
    const [aiImagePrompt, setAiImagePrompt] = useState("");
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Sync content with external changes (e.g., from draft restore or History restore)
    useEffect(() => {
        setContent(initialContent);
    }, [initialContent]);

    // Sync image preview with external changes
    useEffect(() => {
        setImagePreview(initialImagePreview);
    }, [initialImagePreview]);

    const MAX_CHARS = 3000;

    const handleContentChange = (value: string) => {
        if (value.length <= MAX_CHARS) {
            setContent(value);
            onContentChange(value);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please describe what you want to post about");
            return;
        }

        try {
            const generated = await onGenerate(prompt);
            setContent(generated);
            onContentChange(generated);
            setActiveTab("write"); // Switch to write tab to edit
            toast.success("Post generated!");
        } catch (error) {
            toast.error("Failed to generate post");
        }
    };

    const handleExtractUrl = async () => {
        if (!url.trim()) {
            toast.error("Please enter a URL");
            return;
        }

        try {
            const extracted = await onExtractFromUrl(url);
            setContent(extracted);
            onContentChange(extracted);
            setActiveTab("write");
            toast.success("Content extracted from URL!");
        } catch (error) {
            toast.error("Failed to extract content from URL");
        }
    };

    const handleImageDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("Image must be less than 10MB");
                return;
            }
            setImage(file);
            onImageChange(file);
            setImagePreview(URL.createObjectURL(file));
        }
    }, [onImageChange]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("Image must be less than 10MB");
                return;
            }
            setImage(file);
            onImageChange(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const removeImage = () => {
        setImage(null);
        onImageChange(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
    };

    // AI Image Generation handlers
    const handleGeneratePrompt = async () => {
        if (!agentId || !content.trim()) {
            toast.error("Write some post content first to generate an image");
            return;
        }
        setIsGeneratingPrompt(true);
        setShowAiImageGen(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/image-generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    postContent: content,
                    action: "generate_prompt",
                }),
            });
            const data = await response.json();
            if (data.prompt) {
                setAiImagePrompt(data.prompt);
                toast.success("Image prompt generated! Edit if needed, then generate.");
            } else {
                toast.error(data.error || "Failed to generate prompt");
            }
        } catch (error) {
            toast.error("Failed to generate image prompt");
        } finally {
            setIsGeneratingPrompt(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!agentId || !aiImagePrompt.trim()) {
            toast.error("Generate or enter a prompt first");
            return;
        }
        setIsGeneratingImage(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/image-generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    postContent: content,
                    action: "generate_image",
                    customPrompt: aiImagePrompt,
                }),
            });
            const data = await response.json();
            if (data.imageUrl) {
                setImagePreview(data.imageUrl);
                setShowAiImageGen(false);
                toast.success("Image generated successfully!");
            } else {
                toast.error(data.error || "Failed to generate image. Check API key configuration.");
            }
        } catch (error) {
            toast.error("Failed to generate image");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const tabs = [
        { id: "generate" as const, label: "AI Generate", icon: SparklesIcon },
        { id: "write" as const, label: "Write", icon: PencilIcon },
        { id: "url" as const, label: "From URL", icon: LinkIcon },
    ];

    return (
        <div className="space-y-4">
            {/* Tab Switcher */}
            <div className="flex bg-muted/50 rounded-lg p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                            activeTab === tab.id
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
                {activeTab === "generate" && (
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Describe what you want to post about... e.g. 'Write a post about AI trends in 2024'"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[120px] resize-none"
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {prompt.length} characters
                            </span>
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt.trim()}
                            >
                                {isGenerating ? (
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <SparklesIcon className="mr-2 h-4 w-4" />
                                )}
                                Generate
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === "write" && (
                    <div className="space-y-3">
                        <Textarea
                            placeholder="Write your LinkedIn post here..."
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            className="min-h-[120px] resize-none"
                        />
                        <div className="flex items-center justify-between">
                            <span className={cn(
                                "text-xs",
                                content.length > MAX_CHARS * 0.9
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                            )}>
                                {content.length} / {MAX_CHARS} characters
                            </span>
                        </div>
                    </div>
                )}

                {activeTab === "url" && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Paste a URL to extract content..."
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <Button
                                onClick={handleExtractUrl}
                                disabled={isGenerating || !url.trim()}
                            >
                                {isGenerating ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Extract"
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            We'll analyze the URL and generate a LinkedIn post about it
                        </p>
                    </div>
                )}
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <ImageIcon className="h-4 w-4" />
                        Add Image to Post
                    </div>
                    {agentId && content.trim() && !imagePreview && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGeneratePrompt}
                            disabled={isGeneratingPrompt}
                            className="text-xs h-7"
                        >
                            {isGeneratingPrompt ? (
                                <Loader2Icon className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                                <SparklesIcon className="h-3 w-3 mr-1" />
                            )}
                            Get Image Prompt
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    Upload an image or generate one with AI based on your post
                </p>

                {/* AI Image Prompt Panel */}
                {showAiImageGen && (
                    <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-purple-600">🎨 AI Image Prompt</p>
                            <button
                                onClick={() => setShowAiImageGen(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <Textarea
                            value={aiImagePrompt}
                            onChange={(e) => setAiImagePrompt(e.target.value)}
                            placeholder="AI will generate a detailed image prompt based on your post..."
                            rows={5}
                            className="text-sm font-mono"
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    navigator.clipboard.writeText(aiImagePrompt);
                                    toast.success("Prompt copied! Use it in Midjourney, DALL-E, or any AI image tool");
                                }}
                                disabled={!aiImagePrompt.trim()}
                                className="flex-1"
                            >
                                📋 Copy Prompt
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleGeneratePrompt}
                                disabled={isGeneratingPrompt}
                            >
                                {isGeneratingPrompt ? (
                                    <Loader2Icon className="h-3 w-3 animate-spin" />
                                ) : (
                                    "🔄 Regenerate"
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Copy this prompt and use it in Midjourney, DALL-E, Leonardo AI, or any image generator
                        </p>
                    </div>
                )}

                {imagePreview ? (
                    <div className="relative rounded-lg border-2 border-border overflow-hidden bg-muted/10">
                        <img
                            src={imagePreview}
                            alt="Post image"
                            className="w-full h-auto block"
                        />
                        <button
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1.5 bg-background/90 backdrop-blur-sm rounded-full hover:bg-background shadow-md border"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                ) : !showAiImageGen && (
                    <label
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                            isDragOver
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-muted-foreground"
                        )}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleImageDrop}
                    >
                        <div className="flex flex-col items-center justify-center py-4">
                            <UploadIcon className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Drag & drop or click to upload image
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG up to 10MB
                            </p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                        />
                    </label>
                )}
            </div>

            {/* Action Buttons */}
            {content.trim() && (
                <div className="space-y-3 pt-2 border-t border-border/50">
                    {showScheduler && (
                        <SchedulePicker
                            value={scheduledDate}
                            onChange={setScheduledDate}
                            onConfirm={async () => {
                                if (onSchedule && scheduledDate) {
                                    await onSchedule(content, scheduledDate, image);
                                    setContent("");
                                    setPrompt("");
                                    setScheduledDate(null);
                                    setShowScheduler(false);
                                    removeImage();
                                }
                            }}
                            onCancel={() => {
                                setShowScheduler(false);
                                setScheduledDate(null);
                            }}
                        />
                    )}

                    {!showScheduler && (
                        <div className="flex items-center gap-2">
                            {/* Cancel / Save as Draft button */}
                            {(content.trim() || imagePreview) && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        if (onSaveDraft && content.trim()) {
                                            onSaveDraft(content, imagePreview);
                                        }
                                        if (onCancel) {
                                            onCancel();
                                        }
                                        // Clear both local and parent state
                                        setContent("");
                                        setPrompt("");
                                        onContentChange(""); // Notify parent to clear Preview
                                        removeImage();
                                        onImageChange(null); // Notify parent to clear image
                                    }}
                                    className="text-muted-foreground"
                                >
                                    <XIcon className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                            )}

                            <Button
                                onClick={async () => {
                                    if (onPost) {
                                        await onPost(content, image);
                                        // Clear both local and parent state
                                        setContent("");
                                        setPrompt("");
                                        onContentChange(""); // Notify parent to clear Preview
                                        removeImage();
                                        onImageChange(null); // Notify parent to clear image
                                    }
                                }}
                                disabled={isPosting || !content.trim()}
                                className="flex-1"
                            >
                                {isPosting ? (
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <SendIcon className="mr-2 h-4 w-4" />
                                )}
                                Post Now
                            </Button>


                            <Button
                                variant="outline"
                                onClick={() => setShowScheduler(true)}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                Schedule
                            </Button>

                            {/* Magic Preview Button */}
                            <Button
                                variant="outline"
                                onClick={() => setShowFullPagePreview(true)}
                                disabled={!content.trim()}
                                className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 text-purple-700 hover:from-purple-500/20 hover:to-pink-500/20"
                            >
                                <EyeIcon className="mr-2 h-4 w-4" />
                                ✨ Magic Preview
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Full Page LinkedIn Preview */}
            <LinkedInFullPagePreview
                isOpen={showFullPagePreview}
                onClose={() => setShowFullPagePreview(false)}
                content={content}
                imageUrl={imagePreview}
                authorName={authorName}
                authorTitle={authorTitle}
            />
        </div>
    );
}
