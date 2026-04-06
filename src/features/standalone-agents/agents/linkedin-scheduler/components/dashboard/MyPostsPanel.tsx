/**
 * My Posts Panel - LinkedIn Scheduler Dashboard
 * Shows user's LinkedIn posts + allows adding by URL
 * Allows one-click automation creation for any post
 */

"use client";

import { useState, useEffect } from "react";
import {
    Loader2Icon,
    RefreshCwIcon,
    ImageIcon,
    MessageSquareIcon,
    HeartIcon,
    Share2Icon,
    ZapIcon,
    ExternalLinkIcon,
    AlertCircleIcon,
    PlusIcon,
    LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface LinkedInPost {
    id: string;
    socialId: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    reactions: number;
    comments: number;
    shares: number;
    authorName: string;
    authorImage?: string | null;
    linkedInUrl: string;
    source?: 'app' | 'automation' | 'manual';
    hasAutomation?: boolean;
}

interface MyPostsPanelProps {
    agentId?: string;
    onCreateAutomation?: (post: LinkedInPost) => void;
}

export function MyPostsPanel({ agentId, onCreateAutomation }: MyPostsPanelProps) {
    const [posts, setPosts] = useState<LinkedInPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [postUrl, setPostUrl] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const fetchPosts = async () => {
        if (!agentId) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/my-posts?agentId=${agentId}`);
            const data = await response.json();

            if (data.error && !data.posts) {
                setError(data.error);
                return;
            }

            setPosts(data.posts || []);
        } catch (err) {
            console.error("Failed to fetch posts:", err);
            setError("Failed to fetch posts");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [agentId]);

    const handleAddPost = async () => {
        if (!postUrl.trim() || !agentId) return;

        setIsAdding(true);
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/my-posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId, postUrl: postUrl.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data.error || "Failed to add post");
                return;
            }

            toast.success("Post added successfully!");
            setPostUrl("");
            setShowAddForm(false);
            fetchPosts(); // Refresh the list
        } catch (err) {
            console.error("Failed to add post:", err);
            toast.error("Failed to add post");
        } finally {
            setIsAdding(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return "Unknown date";
        }
    };

    const handleCreateAutomation = (post: LinkedInPost) => {
        if (onCreateAutomation) {
            onCreateAutomation(post);
        } else {
            navigator.clipboard.writeText(post.linkedInUrl);
            toast.success("Post URL copied! Paste it in the Automations tab.");
        }
    };

    const getSourceBadge = (source?: string) => {
        switch (source) {
            case 'app':
                return <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-600">Posted via App</Badge>;
            case 'automation':
                return <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">Has Automation</Badge>;
            case 'manual':
                return <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">Added Manually</Badge>;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2Icon className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Fetching your LinkedIn posts...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-6 text-center">
                        <AlertCircleIcon className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">Failed to Load Posts</h3>
                        <p className="text-sm text-muted-foreground mb-4">{error}</p>
                        <Button onClick={fetchPosts} variant="outline">
                            <RefreshCwIcon className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <ImageIcon className="h-6 w-6 text-primary" />
                        My LinkedIn Posts
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Select a post to create comment automation
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Post
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchPosts}>
                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Add Post Form */}
            {showAddForm && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <LinkIcon className="h-5 w-5 text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-medium">Add Post by URL</p>
                                <p className="text-xs text-muted-foreground">
                                    Paste any LinkedIn post URL to add it here
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://www.linkedin.com/feed/update/..."
                                value={postUrl}
                                onChange={(e) => setPostUrl(e.target.value)}
                                className="flex-1"
                            />
                            <Button
                                onClick={handleAddPost}
                                disabled={!postUrl.trim() || isAdding}
                            >
                                {isAdding ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <PlusIcon className="h-4 w-4 mr-1" />
                                        Add
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Info Banner */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <ZapIcon className="h-5 w-5 text-primary shrink-0" />
                        <div>
                            <p className="text-sm font-medium">Quick Automation Setup</p>
                            <p className="text-xs text-muted-foreground">
                                Click on any post to create a comment automation. When someone comments with your keywords, auto-reply will be triggered!
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Posts Grid */}
            {posts.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Posts Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                            Add your LinkedIn posts to create automations:
                        </p>
                        <Button
                            variant="default"
                            onClick={() => setShowAddForm(true)}
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Add Post by URL
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {posts.map((post) => (
                        <Card
                            key={post.id}
                            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                            onClick={() => handleCreateAutomation(post)}
                        >
                            {/* Image or Placeholder */}
                            {post.imageUrl ? (
                                <div className="aspect-video bg-muted relative overflow-hidden">
                                    <img
                                        src={post.imageUrl}
                                        alt="Post image"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" className="shadow-lg">
                                                <ZapIcon className="h-4 w-4 mr-1" />
                                                Create Automation
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center p-4 relative">
                                    <p className="text-sm text-center line-clamp-4">{post.content}</p>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="sm" className="shadow-lg">
                                                <ZapIcon className="h-4 w-4 mr-1" />
                                                Create Automation
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Content */}
                            <CardContent className="p-4">
                                {/* Content Preview */}
                                {post.imageUrl && (
                                    <p className="text-sm line-clamp-2 mb-3">{post.content || "No text content"}</p>
                                )}

                                {/* Stats Row */}
                                <div className="flex items-center gap-4 text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <HeartIcon className="h-4 w-4" />
                                        <span className="text-sm">{post.reactions}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageSquareIcon className="h-4 w-4" />
                                        <span className="text-sm">{post.comments}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Share2Icon className="h-4 w-4" />
                                        <span className="text-sm">{post.shares}</span>
                                    </div>
                                </div>

                                {/* Date & Source Badge */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate(post.createdAt)}
                                    </span>
                                    {getSourceBadge(post.source)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
