/**
 * PostFlow Dashboard - Main Dashboard Layout
 * Contains sidebar navigation and content panels
 */

"use client";

import { useState, useEffect } from "react";
import {
    LayoutDashboardIcon,
    ClockIcon,
    SettingsIcon,
    LinkedinIcon,
    SunIcon,
    CalendarIcon,
    TrendingUpIcon,
    FileTextIcon,
    SparklesIcon,
    MessageSquareIcon,
    MailIcon,
    BarChart3Icon,
    ZapIcon,
    ImageIcon,
    MagnetIcon,
    UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTrialStatus, formatTrialRemaining, getTrialBannerVariant, type TrialStatus } from "@/lib/trial-utils";

// Import panels
import { HistoryPanel } from "./HistoryPanel";
import { SettingsPanel } from "./SettingsPanel";
import { AnalyzePanel } from "./AnalyzePanel";
import { PostComposer } from "./PostComposer";
import { PostPreview } from "./PostPreview";
import { ContentCalendar } from "./ContentCalendar";
import { MessagesPanel } from "../messages/MessagesPanel";
import { AIChatPanel } from "../chat/AIChatPanel";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { CalendarPanel } from "./CalendarPanel";
import { AutomationsPanel } from "./AutomationsPanel";
import { PostSuccessModal } from "./PostSuccessModal";
import { MyPostsPanel } from "./MyPostsPanel";
import { LeadMagnetsPanel } from "./LeadMagnetsPanel";

import type {
    CompanyProfile,
    AnalysisResult,
    ContentSuggestion,
    LinkedInPost,
    NavItemId,
    MessageTemplate,
    AutomationRule,
    LinkedInMessage,
} from "../../config";

interface PostFlowDashboardProps {
    agentId: string;
    businessProfile: CompanyProfile;
    aiAnalysis: AnalysisResult | null;
    suggestions: ContentSuggestion[];
    posts: LinkedInPost[];
    activeTab: NavItemId;
    isAnalyzing: boolean;
    ayrshareConnected: boolean;
    unipileConnected?: boolean;
    messages?: LinkedInMessage[];
    templates?: MessageTemplate[];
    automationRules?: AutomationRule[];
    onTabChange: (tab: NavItemId) => void;
    onRunAnalysis: () => void;
    onScheduleSuggestion: (suggestionId: string, scheduledFor: string) => void;
    onSaveDraft: (content: string, category: string, imageUrl?: string, postId?: string) => void;
    onUpdatePostStatus: (postId: string, status: LinkedInPost["status"]) => void;
    onDeletePost: (postId: string) => void;
    onSaveAyrshareKey: (apiKey: string) => void;
    onDisconnectAyrshare: () => void;
    onUpdateBusinessProfile: (profile: CompanyProfile) => void;
    onGeneratePost?: (prompt: string) => Promise<string>;
    onExtractFromUrl?: (url: string) => Promise<string>;
    onPublishPost?: (content: string, image?: File) => void;
    onSchedulePost?: (content: string, scheduledFor: Date, image?: File) => void;
    onConnectUnipile?: () => void;
    onToggleAutomationRule?: (ruleId: string, enabled: boolean) => void;
    onCreateTemplate?: () => void;
    onEditTemplate?: (template: MessageTemplate) => void;
    onCreateRule?: () => void;
    onEditRule?: (rule: AutomationRule) => void;
    onReplyMessage?: (messageId: string, content: string) => void;
}

const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboardIcon },
    { id: "analyze" as const, label: "Analyze", icon: BarChart3Icon },
    { id: "chat" as const, label: "AI Chat", icon: MessageSquareIcon },
    { id: "inbox" as const, label: "Inbox", icon: MailIcon },
    { id: "myposts" as const, label: "My Posts", icon: ImageIcon },
    { id: "leadmagnets" as const, label: "Lead Magnets", icon: MagnetIcon },
    { id: "automations" as const, label: "Automations", icon: ZapIcon },
    { id: "calendar" as const, label: "Calendar", icon: CalendarIcon },
    { id: "history" as const, label: "History", icon: ClockIcon },
    { id: "analytics" as const, label: "Analytics", icon: TrendingUpIcon },
    { id: "settings" as const, label: "Settings", icon: SettingsIcon },
];

export function PostFlowDashboard({
    agentId,
    businessProfile,
    aiAnalysis,
    suggestions,
    posts,
    activeTab,
    isAnalyzing,
    ayrshareConnected,
    unipileConnected = false,
    messages = [],
    templates = [],
    automationRules = [],
    onTabChange,
    onRunAnalysis,
    onScheduleSuggestion,
    onSaveDraft,
    onUpdatePostStatus,
    onDeletePost,
    onSaveAyrshareKey,
    onDisconnectAyrshare,
    onUpdateBusinessProfile,
    onGeneratePost,
    onExtractFromUrl,
    onPublishPost,
    onSchedulePost,
    onConnectUnipile,
    onToggleAutomationRule,
    onCreateTemplate,
    onEditTemplate,
    onCreateRule,
    onEditRule,
    onReplyMessage,
}: PostFlowDashboardProps) {
    // Draft storage key
    const DRAFT_KEY = `linkedin_draft_${agentId}`;
    const DRAFT_IMAGE_KEY = `linkedin_draft_image_${agentId}`;

    // Local state for post composer
    const [postContent, setPostContent] = useState("");
    const [postImage, setPostImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [editingPostId, setEditingPostId] = useState<string | null>(null); // Track which draft is being edited

    // Post success modal state
    const [showPostSuccessModal, setShowPostSuccessModal] = useState(false);
    const [lastPostedContent, setLastPostedContent] = useState<string>("");
    const [lastPostedId, setLastPostedId] = useState<string | null>(null);

    // Trial status state
    const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);

    // Fetch trial status from agent config
    useEffect(() => {
        const fetchTrialStatus = async () => {
            if (!agentId) return;
            try {
                const response = await fetch(`/api/standalone-agents/${agentId}`);
                if (response.ok) {
                    const data = await response.json();
                    const config = data.config || data.agent?.config || {};
                    const status = getTrialStatus(config);
                    setTrialStatus(status);
                }
            } catch (error) {
                console.error("Failed to fetch trial status:", error);
            }
        };
        fetchTrialStatus();
    }, [agentId, unipileConnected]);

    // Load draft from localStorage on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        const savedImagePreview = localStorage.getItem(DRAFT_IMAGE_KEY);
        if (savedDraft) {
            setPostContent(savedDraft);
        }
        if (savedImagePreview) {
            setImagePreview(savedImagePreview);
        }
    }, [agentId]);

    // Auto-save draft to localStorage when content changes
    useEffect(() => {
        if (postContent.trim()) {
            localStorage.setItem(DRAFT_KEY, postContent);
        }
    }, [postContent, DRAFT_KEY]);

    // Auto-save image preview to localStorage
    useEffect(() => {
        if (imagePreview) {
            localStorage.setItem(DRAFT_IMAGE_KEY, imagePreview);
        }
    }, [imagePreview, DRAFT_IMAGE_KEY]);

    // Clear draft from localStorage
    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_IMAGE_KEY);
        setPostContent("");
        setPostImage(null);
        setImagePreview(null);
        setEditingPostId(null); // Reset editing state
    };

    // Messages state - fetch when tab is active
    const [fetchedMessages, setFetchedMessages] = useState<LinkedInMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    useEffect(() => {
        if (activeTab === "inbox" && unipileConnected && agentId) {
            const fetchMessages = async () => {
                setIsLoadingMessages(true);
                try {
                    const response = await fetch(`/api/standalone-agents/linkedin-scheduler/unipile/messages?agentId=${agentId}`);
                    const data = await response.json();
                    if (data.messages) {
                        setFetchedMessages(data.messages);
                    }
                } catch (error) {
                    console.error("Failed to fetch messages:", error);
                } finally {
                    setIsLoadingMessages(false);
                }
            };
            fetchMessages();
        }
    }, [activeTab, unipileConnected, agentId]);

    // Calculate stats
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeek = posts.filter((p) => {
        if (!p.scheduledAt) return false;
        const scheduledDate = new Date(p.scheduledAt);
        return scheduledDate >= startOfWeek && scheduledDate <= now;
    }).length;

    const upcoming = posts.filter((p) => p.status === "scheduled").length;
    const posted = posts.filter((p) => p.status === "posted").length;
    const drafts = posts.filter((p) => p.status === "draft").length;

    const stats = [
        { label: "This Week", value: thisWeek, icon: CalendarIcon, color: "text-blue-500", bgColor: "bg-blue-500/10" },
        { label: "Upcoming", value: upcoming, icon: ClockIcon, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
        { label: "Posted", value: posted, icon: TrendingUpIcon, color: "text-green-500", bgColor: "bg-green-500/10" },
        { label: "Drafts", value: drafts, icon: FileTextIcon, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    ];

    const handleContentChange = (content: string) => {
        setPostContent(content);
    };

    // Convert file to base64 for storage
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    };

    // Compress image before upload to reduce size
    const compressImage = (base64: string, maxSizeKB: number = 1024, quality: number = 0.8): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let { width, height } = img;

                // Scale down if too large (max 1920px)
                const maxDimension = 1920;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress as JPEG
                const compressed = canvas.toDataURL("image/jpeg", quality);

                // Check size and reduce quality if needed
                const sizeKB = (compressed.length * 3) / 4 / 1024;
                if (sizeKB > maxSizeKB && quality > 0.3) {
                    resolve(compressImage(base64, maxSizeKB, quality - 0.1));
                } else {
                    resolve(compressed);
                }
            };
            img.src = base64;
        });
    };

    // Upload image to ImgBB and get permanent URL
    const uploadImageToImgBB = async (base64: string, filename: string): Promise<string | null> => {
        try {
            // Compress image before uploading
            const compressed = await compressImage(base64);

            const response = await fetch("/api/standalone-agents/linkedin-scheduler/upload-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: compressed, filename }),
            });
            const data = await response.json();
            if (data.success && data.url) {
                console.log("[Image Upload] Uploaded to", data.provider, data.url);
                return data.url;
            }
            return null;
        } catch (error) {
            console.error("[Image Upload] Error:", error);
            return null;
        }
    };

    const handleImageChange = async (file: File | null) => {
        setPostImage(file);
        if (file) {
            // First set base64 for immediate preview
            const base64 = await fileToBase64(file);
            setImagePreview(base64);

            // Then upload to ImgBB in background for permanent URL
            const imgbbUrl = await uploadImageToImgBB(base64, file.name);
            if (imgbbUrl) {
                // Replace local base64 with permanent ImgBB URL
                setImagePreview(imgbbUrl);
                toast.success("Image uploaded!");
            }
        } else {
            setImagePreview(null);
            localStorage.removeItem(DRAFT_IMAGE_KEY);
        }
    };

    const handleGenerate = async (prompt: string): Promise<string> => {
        if (onGeneratePost) {
            return await onGeneratePost(prompt);
        }
        // Default behavior - call API
        const response = await fetch("/api/standalone-agents/linkedin-scheduler/generate-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, agentId }),
        });
        const data = await response.json();
        return data.content || "";
    };

    const handleExtractUrl = async (url: string): Promise<string> => {
        if (onExtractFromUrl) {
            return await onExtractFromUrl(url);
        }
        // Default behavior - call API
        const response = await fetch("/api/standalone-agents/linkedin-scheduler/extract-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, agentId }),
        });
        const data = await response.json();
        return data.content || "";
    };

    const handleAddPost = (date: Date) => {
        // Navigate to Dashboard to create a new post
        toast.info(`Create a post for ${date.toLocaleDateString()}`);
        onTabChange("dashboard");
    };

    const handleSelectPost = (post: LinkedInPost) => {
        // Restore post content to editor for viewing/editing
        setPostContent(post.content);
        if (post.imageUrl) {
            setImagePreview(post.imageUrl);
        }
        setEditingPostId(post.id);
        toast.success(`Loaded post: "${post.content.slice(0, 30)}..."`);
        onTabChange("dashboard");
    };

    const handleUseContent = (content: string) => {
        setPostContent(content);
        onTabChange("dashboard");
    };

    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async (content: string, image?: File | null) => {
        setIsPosting(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/unipile/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    content,
                    imageUrl: imagePreview, // Send the ImgBB URL for image posts
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to post");
            }

            const data = await response.json();
            console.log("Posted successfully:", data);

            // Store posted content for automation setup
            setLastPostedContent(content);
            setLastPostedId(data.postId || `post-${Date.now()}`);

            // If we were editing an existing draft, delete it now that it's posted
            if (editingPostId) {
                onDeletePost(editingPostId);
                setEditingPostId(null);
            }

            // Clear draft after successful post
            clearDraft();

            // Show success modal with automation option
            setShowPostSuccessModal(true);
        } catch (error) {
            console.error("Post error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to post");
        } finally {
            setIsPosting(false);
        }
    };

    const handleSchedulePost = async (content: string, scheduledFor: Date, image?: File | null) => {
        setIsPosting(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/unipile/post", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    content,
                    scheduledFor: scheduledFor.toISOString(),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to schedule");
            }

            const data = await response.json();
            console.log("Scheduled successfully:", data);
            toast.success(`📅 Scheduled for ${scheduledFor.toLocaleString()}`);
        } catch (error) {
            console.error("Schedule error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to schedule");
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="flex h-full">
            {/* Sidebar */}
            <aside className="w-56 border-r border-border/50 flex flex-col bg-card/50">
                {/* Logo */}
                <div className="p-4 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                            <LinkedinIcon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold">LinkedAI</h1>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {businessProfile.businessName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                activeTab === item.id
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Generate Ideas Button */}
                <div className="p-4">
                    <Button
                        className="w-full gap-2"
                        size="sm"
                        onClick={() => onTabChange("chat")}
                    >
                        <SparklesIcon className="h-4 w-4" />
                        Generate Ideas
                    </Button>
                </div>

                {/* Bottom section */}
                <div className="p-4 border-t border-border/50 space-y-3">
                    {/* User info */}
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {businessProfile.businessName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {businessProfile.businessName}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-background">
                {activeTab === "dashboard" && (
                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div>
                            <h1 className="text-2xl font-semibold">Dashboard</h1>
                            <p className="text-sm text-muted-foreground">
                                Generate and schedule LinkedIn posts with AI
                            </p>
                        </div>

                        {/* Post Composer & Preview */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="border rounded-xl border-border/50 p-5 bg-card shadow-md hover:shadow-lg transition-shadow">
                                <PostComposer
                                    initialContent={postContent}
                                    initialImagePreview={imagePreview}
                                    onContentChange={handleContentChange}
                                    onImageChange={handleImageChange}
                                    onGenerate={handleGenerate}
                                    onExtractFromUrl={handleExtractUrl}
                                    onPost={handlePost}
                                    onSchedule={handleSchedulePost}
                                    onSaveDraft={async (content, imgPreview) => {
                                        // Create or update draft post using the passed handler with image URL
                                        if (onSaveDraft) {
                                            onSaveDraft(content, "draft", imgPreview || undefined, editingPostId || undefined);
                                            toast.success(editingPostId ? "Draft updated!" : "Saved as draft!");
                                        }
                                        // Clear editing state after saving
                                        setEditingPostId(null);
                                    }}
                                    onCancel={() => {
                                        // Clear everything
                                        clearDraft();
                                    }}
                                    isGenerating={isAnalyzing}
                                    isPosting={isPosting}
                                    authorName={businessProfile.businessName}
                                    authorTitle={businessProfile.industry}
                                    agentId={agentId}
                                />
                            </div>
                            <div className="border rounded-xl border-border/50 p-5 bg-card shadow-md hover:shadow-lg transition-shadow">
                                <PostPreview
                                    content={postContent}
                                    image={imagePreview}
                                    authorName={businessProfile.businessName}
                                    authorTitle={businessProfile.industry}
                                />
                            </div>
                        </div>

                        {/* Content Calendar */}
                        <ContentCalendar
                            posts={posts}
                            onAddPost={handleAddPost}
                            onSelectPost={handleSelectPost}
                        />
                    </div>
                )}

                {activeTab === "analyze" && (
                    <AnalyzePanel
                        companyProfile={businessProfile}
                        analysis={aiAnalysis}
                        isAnalyzing={isAnalyzing}
                        onRunAnalysis={onRunAnalysis}
                    />
                )}

                {activeTab === "chat" && (
                    <AIChatPanel
                        agentId={agentId}
                        companyName={businessProfile.businessName}
                        industry={businessProfile.industry}
                        description={businessProfile.description}
                        targetAudience={businessProfile.targetAudience}
                        contentTone={businessProfile.contentTone}
                        onUseContent={handleUseContent}
                    />
                )}

                {activeTab === "inbox" && (
                    <MessagesPanel
                        messages={fetchedMessages.length > 0 ? fetchedMessages : (messages || [])}
                        templates={templates}
                        isConnected={unipileConnected}
                        isLoading={isLoadingMessages}
                        agentId={agentId}
                        onReplyMessage={onReplyMessage || (() => { })}
                        onConnect={onConnectUnipile || (() => { })}
                    />
                )}

                {activeTab === "myposts" && (
                    <MyPostsPanel
                        agentId={agentId}
                        onCreateAutomation={(post) => {
                            // Navigate to automations tab with post info
                            toast.success(`Selected post for automation! Redirecting to Automations...`);
                            onTabChange("automations");
                            // TODO: Could pass post info to AutomationsPanel for pre-fill
                        }}
                    />
                )}

                {activeTab === "leadmagnets" && (
                    <LeadMagnetsPanel agentId={agentId} />
                )}

                {activeTab === "automations" && (
                    <AutomationsPanel agentId={agentId} />
                )}

                {activeTab === "calendar" && (
                    <CalendarPanel
                        posts={posts}
                        onSelectPost={handleSelectPost}
                        onAddPost={handleAddPost}
                    />
                )}

                {activeTab === "history" && (
                    <HistoryPanel
                        agentId={agentId}
                        posts={posts}
                        onUpdateStatus={onUpdatePostStatus}
                        onDelete={onDeletePost}
                        onRestoreToEditor={(content, imageUrl, postId) => {
                            setPostContent(content);
                            if (imageUrl) {
                                setImagePreview(imageUrl);
                            }
                            // Track which post is being edited so we update instead of create new
                            if (postId) {
                                setEditingPostId(postId);
                            }
                            onTabChange("dashboard");
                        }}
                        onNavigateToRule={(ruleId, ruleType) => {
                            console.log(`[History] Navigating to rule: ${ruleId} (${ruleType})`);
                            // Switch to automations tab - rule highlighting can be added later
                            onTabChange("automations");
                            // Toast to help user find the rule
                            // TODO: Could pass ruleId to MessagesPanel for highlighting
                        }}
                    />
                )}

                {activeTab === "analytics" && (
                    <AnalyticsPanel agentId={agentId} posts={posts} />
                )}

                {activeTab === "settings" && (
                    <SettingsPanel
                        businessProfile={businessProfile}
                        unipileConnected={unipileConnected}
                        agentId={agentId}
                        onUpdateBusinessProfile={onUpdateBusinessProfile}
                    />
                )}
            </main>

            {/* Post Success Modal - Suggests automation setup after posting */}
            <PostSuccessModal
                open={showPostSuccessModal}
                onClose={() => {
                    setShowPostSuccessModal(false);
                    toast.success("🎉 Posted to LinkedIn!");
                }}
                onSetupAutomation={() => {
                    setShowPostSuccessModal(false);
                    // Navigate to automations tab with prefilled data
                    onTabChange("automations");
                    // Store in localStorage so AutomationsPanel can read it
                    localStorage.setItem("prefillAutomation", JSON.stringify({
                        type: "comment_reply",
                        postText: lastPostedContent,
                        postId: lastPostedId,
                    }));
                    toast.success("🎉 Posted! Now set up your automation.");
                }}
                postContent={lastPostedContent}
            />
        </div>
    );
}
