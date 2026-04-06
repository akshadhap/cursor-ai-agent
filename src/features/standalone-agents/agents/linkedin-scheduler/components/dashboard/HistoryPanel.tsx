/**
 * Enhanced History Panel - Activity History with 3 Tabs
 * Posts History, Messages History, Automation Triggers History
 */

"use client";

import { useState, useEffect } from "react";
import {
    EyeIcon,
    SendIcon,
    TrashIcon,
    CalendarIcon,
    CheckCircle2Icon,
    XCircleIcon,
    FileTextIcon,
    ClockIcon,
    MailIcon,
    ZapIcon,
    MessageSquareIcon,
    Loader2Icon,
    RefreshCwIcon,
    RotateCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type { LinkedInPost } from "../../config";

interface HistoryPanelProps {
    agentId?: string;
    posts: LinkedInPost[];
    onUpdateStatus: (postId: string, status: LinkedInPost["status"]) => void;
    onDelete: (postId: string) => void;
    onRestoreToEditor?: (content: string, imageUrl?: string, postId?: string) => void;
    onNavigateToRule?: (ruleId: string, ruleType: 'inbox' | 'comment') => void;  // For automation pointers
}

type HistoryTab = "posts" | "inbox" | "comments";
type PostFilterTab = "all" | "draft" | "scheduled" | "posted" | "failed";

interface MessageHistory {
    id: string;
    type: "sent" | "received";
    senderName: string;
    content: string;
    timestamp: string;
    isAutoReply?: boolean;
}

interface AutomationHistory {
    id: string;
    type: "dm_reply" | "comment_reply" | "lead_capture";
    ruleName: string;
    ruleId?: string | null;  // Link to source automation rule
    postId?: string | null;  // For comment triggers - link to source post
    postUrl?: string | null; // LinkedIn post URL
    triggerKeyword: string;
    recipientName: string;
    timestamp: string;
}

const postFilterTabs: { id: PostFilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "scheduled", label: "Scheduled" },
    { id: "posted", label: "Posted" },
    { id: "failed", label: "Failed" },
];

type PostImageFilter = "with_images" | "without_images" | "all";

export function HistoryPanel({ agentId, posts, onUpdateStatus, onDelete, onRestoreToEditor, onNavigateToRule }: HistoryPanelProps) {
    const [activeTab, setActiveTab] = useState<HistoryTab>("posts");
    const [postFilter, setPostFilter] = useState<PostFilterTab>("all");
    const [postImageFilter, setPostImageFilter] = useState<PostImageFilter>("with_images");
    const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
    const [automationHistory, setAutomationHistory] = useState<AutomationHistory[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch history data
    const fetchHistory = async () => {
        if (!agentId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/history?agentId=${agentId}`);
            const data = await response.json();

            if (data.messageHistory) setMessageHistory(data.messageHistory);
            if (data.automationHistory) setAutomationHistory(data.automationHistory);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on initial mount to get accurate counts
    useEffect(() => {
        fetchHistory();
    }, [agentId]);

    // Re-fetch when switching to inbox/comments tabs
    useEffect(() => {
        if (activeTab !== "posts") {
            fetchHistory();
        }
    }, [activeTab]);

    // Auto-refresh every 30 seconds when on inbox/comments tab
    useEffect(() => {
        if (activeTab === "posts") return;

        const interval = setInterval(() => {
            fetchHistory();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [activeTab, agentId]);

    // Filter automation history by type
    const inboxHistory = automationHistory.filter(a => a.type === 'dm_reply');
    const commentsHistory = automationHistory.filter(a => a.type === 'comment_reply' || a.type === 'lead_capture');

    const getFilteredPosts = () => {
        let filtered = posts;

        // Filter by status
        if (postFilter !== "all") {
            filtered = filtered.filter(p => p.status === postFilter);
        }

        // Filter by image
        if (postImageFilter === "with_images") {
            filtered = filtered.filter(p => p.imageUrl);
        } else if (postImageFilter === "without_images") {
            filtered = filtered.filter(p => !p.imageUrl);
        }

        return filtered;
    };

    const getCount = (status: PostFilterTab) => {
        if (status === "all") return posts.length;
        return posts.filter(p => p.status === status).length;
    };

    const getStatusBadge = (status: LinkedInPost["status"]) => {
        const statusConfigs: Record<string, { label: string; color: string }> = {
            draft: { label: "Draft", color: "text-gray-500" },
            scheduled: { label: "Scheduled", color: "text-blue-500" },
            posted: { label: "Posted", color: "text-green-500" },
            failed: { label: "Failed", color: "text-red-500" },
        };
        const config = statusConfigs[status] || { label: status, color: "" };
        return (
            <Badge variant="outline" className={cn("gap-1", config.color)}>
                {status === "posted" && <CheckCircle2Icon className="h-3 w-3" />}
                {status === "scheduled" && <CalendarIcon className="h-3 w-3" />}
                {status === "draft" && <FileTextIcon className="h-3 w-3" />}
                {status === "failed" && <XCircleIcon className="h-3 w-3" />}
                {config.label}
            </Badge>
        );
    };

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const handleDeleteHistoryItem = async (type: "message" | "automation", id: string) => {
        if (!agentId) return;

        try {
            await fetch(`/api/standalone-agents/linkedin-scheduler/history`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, type, id }),
            });

            if (type === "message") {
                setMessageHistory(prev => prev.filter(m => m.id !== id));
            } else {
                setAutomationHistory(prev => prev.filter(a => a.id !== id));
            }
            toast.success("History item deleted");
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const filteredPosts = getFilteredPosts();

    // Separate posts with and without images
    const postsWithImages = filteredPosts.filter(p => p.imageUrl);
    const postsWithoutImages = filteredPosts.filter(p => !p.imageUrl);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <ClockIcon className="h-6 w-6 text-primary" />
                        History
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        View your posts, messages, and automation activity
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchHistory} disabled={isLoading}>
                    <RefreshCwIcon className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as HistoryTab)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="posts" className="flex items-center gap-2">
                        <FileTextIcon className="h-4 w-4" />
                        Posts
                        <Badge variant="secondary">{posts.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="inbox" className="flex items-center gap-2">
                        <MailIcon className="h-4 w-4" />
                        Inbox
                        <Badge variant="secondary">{inboxHistory.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="comments" className="flex items-center gap-2">
                        <MessageSquareIcon className="h-4 w-4" />
                        Comments
                        <Badge variant="secondary">{commentsHistory.length}</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Posts Tab */}
                <TabsContent value="posts" className="mt-6 space-y-6">
                    {/* Post Filters */}
                    <div className="flex gap-2 flex-wrap">
                        {postFilterTabs.map((tab) => (
                            <Button
                                key={tab.id}
                                variant={postFilter === tab.id ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPostFilter(tab.id)}
                            >
                                {tab.label}
                                <Badge variant="secondary" className="ml-2">
                                    {getCount(tab.id)}
                                </Badge>
                            </Button>
                        ))}
                    </div>

                    {/* Image Filter Toggle */}
                    <div className="flex gap-2 items-center">
                        <span className="text-sm text-muted-foreground">Show:</span>
                        <div className="flex gap-1">
                            <Button
                                variant={postImageFilter === "with_images" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPostImageFilter("with_images")}
                            >
                                📷 With Images
                            </Button>
                            <Button
                                variant={postImageFilter === "without_images" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPostImageFilter("without_images")}
                            >
                                📝 Text Only
                            </Button>
                            <Button
                                variant={postImageFilter === "all" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPostImageFilter("all")}
                            >
                                All
                            </Button>
                        </div>
                    </div>

                    {filteredPosts.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                <FileTextIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">No posts found</h3>
                                <p className="text-sm text-muted-foreground">
                                    {postFilter === "all" && postImageFilter === "all"
                                        ? "Create your first post from the Dashboard"
                                        : `No matching posts`}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPosts.map((post) => (
                                <Card key={post.id} className="overflow-hidden flex flex-col">
                                    {/* Image or Enhanced Text Display */}
                                    {post.imageUrl ? (
                                        <div className="aspect-video bg-muted relative overflow-hidden">
                                            <img
                                                src={post.imageUrl}
                                                alt="Post image"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        /* For text-only posts, show more content with gradient background */
                                        <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 min-h-[120px] flex items-start">
                                            <p className="text-sm line-clamp-5">{post.content}</p>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <CardContent className="p-4 flex-1 flex flex-col">
                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2 mb-2">
                                            {getStatusBadge(post.status)}
                                            {!post.imageUrl && (
                                                <Badge variant="outline" className="text-xs">Text Only</Badge>
                                            )}
                                        </div>

                                        {/* Post Content - show less for text-only since it's shown above */}
                                        <p className={cn("text-sm flex-1 mb-3", post.imageUrl ? "line-clamp-3" : "line-clamp-2")}>{post.imageUrl ? post.content : ""}</p>

                                        {/* Date */}
                                        <p className="text-xs text-muted-foreground mb-3">
                                            {post.status === "scheduled" ? "Scheduled: " : "Created: "}
                                            {formatDateTime(post.scheduledAt || post.createdAt)}
                                        </p>

                                        {/* Action Icons */}
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview">
                                                    <EyeIcon className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                {/* Only show Restore for drafts, scheduled, or failed - not for posted */}
                                                {post.status !== "posted" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        title="Restore to Editor"
                                                        onClick={() => {
                                                            if (onRestoreToEditor) {
                                                                onRestoreToEditor(post.content, post.imageUrl, post.id);
                                                                toast.success("Restored to editor!");
                                                            }
                                                        }}
                                                    >
                                                        <RotateCcwIcon className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                                {post.status === "draft" && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Send Now">
                                                        <SendIcon className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => onDelete(post.id)}>
                                                            Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Inbox Tab - DM Auto-Replies */}
                <TabsContent value="inbox" className="mt-6 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : inboxHistory.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                <MailIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">No inbox auto-replies</h3>
                                <p className="text-sm text-muted-foreground">
                                    Automated DM replies will appear here
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {inboxHistory.map((auto) => (
                                <Card key={auto.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="p-2 rounded-lg shrink-0 bg-blue-500/10 text-blue-500">
                                                    <MailIcon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium">{auto.ruleName}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {auto.triggerKeyword}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Replied to {auto.recipientName}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground mt-1">
                                                        {formatDateTime(auto.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* View Rule Button - Automation Pointer */}
                                                {auto.ruleId && onNavigateToRule && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-primary text-xs"
                                                        onClick={() => onNavigateToRule(auto.ruleId!, 'inbox')}
                                                        title="View automation rule"
                                                    >
                                                        View Rule →
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDeleteHistoryItem("automation", auto.id)}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Comments Tab - Comment Auto-Replies */}
                <TabsContent value="comments" className="mt-6 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : commentsHistory.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                <MessageSquareIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">No comment auto-replies</h3>
                                <p className="text-sm text-muted-foreground">
                                    Automated comment replies will appear here
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {commentsHistory.map((auto) => (
                                <Card key={auto.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className={cn(
                                                    "p-2 rounded-lg shrink-0",
                                                    auto.type === "lead_capture" ? "bg-purple-500/10 text-purple-500" :
                                                        "bg-green-500/10 text-green-500"
                                                )}>
                                                    {auto.type === "lead_capture" ? (
                                                        <ZapIcon className="h-4 w-4" />
                                                    ) : (
                                                        <MessageSquareIcon className="h-4 w-4" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium">{auto.ruleName}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {auto.triggerKeyword}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Replied to {auto.recipientName}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground mt-1">
                                                        {formatDateTime(auto.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* View Post Button - for comment triggers */}
                                                {auto.postUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-green-600 text-xs"
                                                        onClick={() => window.open(auto.postUrl!, '_blank')}
                                                        title="View original post on LinkedIn"
                                                    >
                                                        📝 View Post
                                                    </Button>
                                                )}
                                                {/* View Rule Button - Automation Pointer */}
                                                {auto.ruleId && onNavigateToRule && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-primary text-xs"
                                                        onClick={() => onNavigateToRule(auto.ruleId!, 'comment')}
                                                        title="View automation rule"
                                                    >
                                                        View Rule →
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive"
                                                    onClick={() => handleDeleteHistoryItem("automation", auto.id)}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div >
    );
}
