/**
 * Post Automation Panel - Per-Post Comment Automation
 * Allow users to manage keyword automation for specific posts
 */

"use client";

import { useState, useEffect } from "react";
import {
    PlusIcon,
    TrashIcon,
    Loader2Icon,
    MessageCircleIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    PencilIcon,
    SaveIcon,
    XIcon,
    LinkIcon,
    RefreshCwIcon,
    ExternalLinkIcon,
    FileTextIcon,
    SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PostData {
    id: string;
    text: string;
    url: string;
    createdAt: string;
    reactions: number;
    comments: number;
    automation: PostAutomation | null;
}

interface PostAutomation {
    postId: string;
    postUrl: string;
    postText: string;
    keywords: string[];
    publicReply: string;
    dmMessage: string;
    attachmentUrl?: string;
    enabled: boolean;
    triggeredCount: number;
    createdAt: string;
}

interface PostAutomationPanelProps {
    agentId?: string;
}

export function PostAutomationPanel({ agentId }: PostAutomationPanelProps) {
    const [posts, setPosts] = useState<PostData[]>([]);
    const [savedAutomations, setSavedAutomations] = useState<PostAutomation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showAddManual, setShowAddManual] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        postUrl: "",
        keywords: "",
        publicReply: "",
        dmMessage: "",
        attachmentUrl: "",
    });

    const fetchPosts = async (showRefresh = false) => {
        if (!agentId) return;

        if (showRefresh) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/posts?agentId=${agentId}`);
            const data = await response.json();

            if (data.posts) {
                setPosts(data.posts);
            }
            if (data.savedAutomations) {
                setSavedAutomations(data.savedAutomations);
            }
        } catch (error) {
            console.error("Failed to fetch posts:", error);
            toast.error("Failed to fetch posts");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [agentId]);

    const resetForm = () => {
        setFormData({
            postUrl: "",
            keywords: "",
            publicReply: "",
            dmMessage: "",
            attachmentUrl: "",
        });
        setEditingPostId(null);
        setShowAddManual(false);
    };

    const handleSave = async (postId?: string) => {
        if (!agentId) return;

        const targetPostId = postId || editingPostId;
        const keywords = formData.keywords.split(",").map(k => k.trim().toLowerCase()).filter(k => k);

        if (!keywords.length || !formData.publicReply || !formData.dmMessage) {
            toast.error("Please fill in keywords, public reply, and DM message");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    postAutomation: {
                        postId: targetPostId,
                        postUrl: formData.postUrl,
                        keywords,
                        publicReply: formData.publicReply,
                        dmMessage: formData.dmMessage,
                        attachmentUrl: formData.attachmentUrl,
                        enabled: true,
                    },
                }),
            });

            if (response.ok) {
                toast.success("Automation saved!");
                resetForm();
                fetchPosts(true);
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to save");
            }
        } catch (error) {
            toast.error("Failed to save automation");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (postId: string) => {
        if (!agentId) return;

        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/posts", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, postId }),
            });

            if (response.ok) {
                toast.success("Automation removed");
                fetchPosts(true);
            }
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleToggle = async (automation: PostAutomation) => {
        if (!agentId) return;

        try {
            await fetch("/api/standalone-agents/linkedin-scheduler/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    postAutomation: {
                        ...automation,
                        enabled: !automation.enabled,
                    },
                }),
            });
            fetchPosts(true);
        } catch (error) {
            toast.error("Failed to toggle");
        }
    };

    const startEdit = (post: PostData) => {
        const automation = post.automation || savedAutomations.find(a => a.postId === post.id);
        if (automation) {
            setFormData({
                postUrl: automation.postUrl || post.url || "",
                keywords: automation.keywords.join(", "),
                publicReply: automation.publicReply,
                dmMessage: automation.dmMessage,
                attachmentUrl: automation.attachmentUrl || "",
            });
        } else {
            setFormData({
                postUrl: post.url || "",
                keywords: "",
                publicReply: "Thanks {{firstName}}! Just sent it to your inbox 📩",
                dmMessage: "Hey {{firstName}}! Here's what you requested:",
                attachmentUrl: "",
            });
        }
        setEditingPostId(post.id);
    };

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-purple-500" />
                        Lead Magnets
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Set up keyword automation for your LinkedIn posts
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => fetchPosts(true)}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? (
                            <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCwIcon className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                    <Button onClick={() => setShowAddManual(true)}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Post URL
                    </Button>
                </div>
            </div>

            {/* Add Manual Post Form */}
            {showAddManual && (
                <Card className="border-purple-500/50">
                    <CardHeader>
                        <CardTitle className="text-base">Add Post by URL</CardTitle>
                        <CardDescription>
                            Paste a LinkedIn post URL to set up keyword automation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="postUrl">LinkedIn Post URL *</Label>
                            <Input
                                id="postUrl"
                                placeholder="https://www.linkedin.com/posts/username-activity-123456789"
                                value={formData.postUrl}
                                onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="keywords">Trigger Keywords * (comma-separated)</Label>
                            <Input
                                id="keywords"
                                placeholder="guide, pdf, interested, send"
                                value={formData.keywords}
                                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="publicReply">Public Reply *</Label>
                            <Textarea
                                id="publicReply"
                                placeholder="Thanks {{firstName}}! Just sent it to your inbox 📩"
                                value={formData.publicReply}
                                onChange={(e) => setFormData({ ...formData, publicReply: e.target.value })}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="dmMessage">DM Message *</Label>
                            <Textarea
                                id="dmMessage"
                                placeholder="Hey {{firstName}}! Here's what you requested..."
                                value={formData.dmMessage}
                                onChange={(e) => setFormData({ ...formData, dmMessage: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="attachmentUrl">Attachment URL (optional)</Label>
                            <Input
                                id="attachmentUrl"
                                placeholder="https://your-site.com/guide.pdf"
                                value={formData.attachmentUrl}
                                onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={() => handleSave()} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <SaveIcon className="h-4 w-4 mr-2" />
                                )}
                                Save Automation
                            </Button>
                            <Button variant="outline" onClick={resetForm}>
                                <XIcon className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Automations */}
            {savedAutomations.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-lg font-medium">Active Automations</h3>
                    {savedAutomations.map((automation) => (
                        <Card key={automation.postId} className={!automation.enabled ? "opacity-60" : ""}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                                {automation.postText || "Post: " + automation.postId}
                                            </p>
                                            {automation.postUrl && (
                                                <a
                                                    href={automation.postUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500 hover:underline"
                                                >
                                                    <ExternalLinkIcon className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {automation.keywords.map((kw) => (
                                                <Badge key={kw} variant="outline" className="bg-purple-500/10 text-purple-500">
                                                    {kw}
                                                </Badge>
                                            ))}
                                            {automation.triggeredCount > 0 && (
                                                <Badge variant="secondary">
                                                    {automation.triggeredCount} sent
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggle(automation)}
                                        >
                                            {automation.enabled ? (
                                                <ToggleRightIcon className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <ToggleLeftIcon className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(automation.postId)}
                                        >
                                            <TrashIcon className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Posts List */}
            <div className="space-y-3">
                <h3 className="text-lg font-medium">Your Posts</h3>
                {posts.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="p-8 text-center">
                            <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="font-semibold mb-2">No Posts Found</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                We couldn't fetch your LinkedIn posts. You can manually add post URLs above.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    posts.map((post) => (
                        <Card key={post.id}>
                            <CardContent className="p-4">
                                {editingPostId === post.id ? (
                                    // Edit mode
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">{post.text}...</p>

                                        <div className="space-y-2">
                                            <Label>Trigger Keywords (comma-separated)</Label>
                                            <Input
                                                placeholder="guide, pdf, interested"
                                                value={formData.keywords}
                                                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Public Reply</Label>
                                            <Textarea
                                                value={formData.publicReply}
                                                onChange={(e) => setFormData({ ...formData, publicReply: e.target.value })}
                                                rows={2}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>DM Message</Label>
                                            <Textarea
                                                value={formData.dmMessage}
                                                onChange={(e) => setFormData({ ...formData, dmMessage: e.target.value })}
                                                rows={2}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Attachment URL (optional)</Label>
                                            <Input
                                                placeholder="https://your-site.com/guide.pdf"
                                                value={formData.attachmentUrl}
                                                onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button onClick={() => handleSave(post.id)} disabled={isSaving} size="sm">
                                                {isSaving ? <Loader2Icon className="h-4 w-4 animate-spin mr-1" /> : <SaveIcon className="h-4 w-4 mr-1" />}
                                                Save
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={resetForm}>
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // View mode
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm mb-2">{post.text}...</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>👍 {post.reactions} reactions</span>
                                                <span>💬 {post.comments} comments</span>
                                                {post.url && (
                                                    <a
                                                        href={post.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-500 hover:underline flex items-center gap-1"
                                                    >
                                                        View <ExternalLinkIcon className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                            {post.automation && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                                        Automation Active
                                                    </Badge>
                                                    {post.automation.keywords.slice(0, 2).map((kw) => (
                                                        <Badge key={kw} variant="secondary">{kw}</Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => startEdit(post)}
                                        >
                                            {post.automation ? (
                                                <><PencilIcon className="h-4 w-4 mr-1" /> Edit</>
                                            ) : (
                                                <><PlusIcon className="h-4 w-4 mr-1" /> Add Automation</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Info Card */}
            <Card className="bg-muted/30 border-muted">
                <CardContent className="p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                        <MessageCircleIcon className="h-4 w-4" />
                        How Post Automation Works
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>1. Add a LinkedIn post URL or select from your posts</li>
                        <li>2. Set trigger keywords (e.g., "guide", "pdf", "interested")</li>
                        <li>3. When someone comments with a keyword:</li>
                        <li className="ml-4">• Public reply is posted as a comment reply</li>
                        <li className="ml-4">• DM with optional attachment is sent to the commenter</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
