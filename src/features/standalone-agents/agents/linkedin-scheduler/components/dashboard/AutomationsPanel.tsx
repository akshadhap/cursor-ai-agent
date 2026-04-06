/**
 * Unified Automations Panel
 * Consolidates: Messages Automation, Smart Rules, Lead Magnets, Post Automation
 * Three automation types: DM Auto-Replies, Comment Replies, Lead Capture
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import {
    PlusIcon,
    TrashIcon,
    Loader2Icon,
    MailIcon,
    MessageSquareIcon,
    SparklesIcon,
    ZapIcon,
    EditIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    InfoIcon,
    KeyIcon,
    FileTextIcon,
    SendIcon,
    LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

type AutomationType = "dm_reply" | "comment_reply" | "lead_capture";

interface AutomationRule {
    id: string;
    type: AutomationType;
    name: string;
    enabled: boolean;

    // Trigger configuration
    triggerType: "keyword" | "all_new";
    keywords: string[];

    // Response configuration
    responseTemplate: string;

    // For comment/lead capture
    postId?: string;
    postUrl?: string;
    postText?: string;
    publicReply?: string;
    dmMessage?: string;
    attachmentUrl?: string;

    // Metadata
    triggeredCount: number;
    createdAt: string;
    updatedAt: string;
}

interface AutomationsPanelProps {
    agentId?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AutomationsPanel({ agentId }: AutomationsPanelProps) {
    const [activeTab, setActiveTab] = useState<AutomationType>("dm_reply");
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Dialog state
    const [showDialog, setShowDialog] = useState(false);
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        triggerType: "keyword" as "keyword" | "all_new",
        keywords: "",
        responseTemplate: "",
        postUrl: "",
        publicReply: "",
        dmMessage: "",
        attachmentUrl: "",
    });

    // Fetch all automation rules
    const fetchRules = async () => {
        if (!agentId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/automations?agentId=${agentId}`);
            const data = await response.json();

            if (data.rules) {
                setRules(data.rules);
            }
        } catch (error) {
            console.error("Failed to fetch automations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, [agentId]);

    // Check for prefilled automation data (from post success modal)
    useEffect(() => {
        const prefillData = localStorage.getItem("prefillAutomation");
        if (prefillData) {
            try {
                const parsed = JSON.parse(prefillData);
                if (parsed.type === "comment_reply") {
                    // Switch to comment reply tab
                    setActiveTab("comment_reply");
                    // Pre-fill form with post data
                    setFormData({
                        name: `Auto-reply for post`,
                        triggerType: "keyword",
                        keywords: "",
                        responseTemplate: "",
                        postUrl: "",
                        publicReply: "Thanks for your comment! Check your DMs 📩",
                        dmMessage: "",
                        attachmentUrl: "",
                    });
                    // Open dialog
                    setShowDialog(true);
                    // Clear prefill data
                    localStorage.removeItem("prefillAutomation");
                }
            } catch (e) {
                console.error("Failed to parse prefill data:", e);
            }
        }
    }, []);

    // Filter rules by type
    const filteredRules = useMemo(() => {
        return rules.filter(r => r.type === activeTab);
    }, [rules, activeTab]);

    // Count by type
    const countByType = useMemo(() => ({
        dm_reply: rules.filter(r => r.type === "dm_reply").length,
        comment_reply: rules.filter(r => r.type === "comment_reply").length,
        lead_capture: rules.filter(r => r.type === "lead_capture").length,
    }), [rules]);

    const resetForm = () => {
        setFormData({
            name: "",
            triggerType: "keyword",
            keywords: "",
            responseTemplate: "",
            postUrl: "",
            publicReply: "",
            dmMessage: "",
            attachmentUrl: "",
        });
        setEditingRule(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setShowDialog(true);
    };

    const openEditDialog = (rule: AutomationRule) => {
        setEditingRule(rule);
        setFormData({
            name: rule.name,
            triggerType: rule.triggerType,
            keywords: rule.keywords.join(", "),
            responseTemplate: rule.responseTemplate,
            postUrl: rule.postUrl || "",
            publicReply: rule.publicReply || "",
            dmMessage: rule.dmMessage || "",
            attachmentUrl: rule.attachmentUrl || "",
        });
        setShowDialog(true);
    };

    const handleSave = async () => {
        if (!agentId) return;
        if (!formData.name.trim()) {
            toast.error("Please enter a name for this automation");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/automations", {
                method: editingRule ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    ruleId: editingRule?.id,
                    rule: {
                        type: activeTab,
                        name: formData.name.trim(),
                        triggerType: formData.triggerType,
                        keywords: formData.keywords.split(",").map(k => k.trim()).filter(Boolean),
                        responseTemplate: formData.responseTemplate,
                        postUrl: formData.postUrl,
                        publicReply: formData.publicReply,
                        dmMessage: formData.dmMessage,
                        attachmentUrl: formData.attachmentUrl,
                    },
                }),
            });

            if (response.ok) {
                toast.success(editingRule ? "Automation updated!" : "Automation created!");
                setShowDialog(false);
                resetForm();
                fetchRules();
            } else {
                const data = await response.json();
                toast.error(data.error || "Failed to save automation");
            }
        } catch (error) {
            toast.error("Failed to save automation");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggle = async (rule: AutomationRule) => {
        if (!agentId) return;

        try {
            await fetch("/api/standalone-agents/linkedin-scheduler/automations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    ruleId: rule.id,
                    rule: { enabled: !rule.enabled },
                }),
            });

            setRules(prev => prev.map(r =>
                r.id === rule.id ? { ...r, enabled: !r.enabled } : r
            ));
            toast.success(rule.enabled ? "Automation disabled" : "Automation enabled");
        } catch (error) {
            toast.error("Failed to update automation");
        }
    };

    const handleDelete = async (ruleId: string) => {
        if (!agentId) return;
        if (!confirm("Are you sure you want to delete this automation?")) return;

        try {
            await fetch("/api/standalone-agents/linkedin-scheduler/automations", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, ruleId }),
            });

            setRules(prev => prev.filter(r => r.id !== ruleId));
            toast.success("Automation deleted");
        } catch (error) {
            toast.error("Failed to delete automation");
        }
    };

    const getTypeIcon = (type: AutomationType) => {
        switch (type) {
            case "dm_reply": return MailIcon;
            case "comment_reply": return MessageSquareIcon;
            case "lead_capture": return SparklesIcon;
        }
    };

    const getTypeColor = (type: AutomationType) => {
        switch (type) {
            case "dm_reply": return "text-blue-500 bg-blue-500/10";
            case "comment_reply": return "text-green-500 bg-green-500/10";
            case "lead_capture": return "text-purple-500 bg-purple-500/10";
        }
    };

    const getTypeDescription = (type: AutomationType) => {
        switch (type) {
            case "dm_reply": return "Auto-reply to incoming DMs based on keywords";
            case "comment_reply": return "Reply to comments on your posts with keywords";
            case "lead_capture": return "Send DM when someone comments with trigger keywords";
        }
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
                        <ZapIcon className="h-6 w-6 text-primary" />
                        Automations
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Set up automatic responses for messages and comments
                    </p>
                </div>
                <Button onClick={openCreateDialog}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Automation
                </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AutomationType)}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dm_reply" className="flex items-center gap-2">
                        <MailIcon className="h-4 w-4" />
                        DM Auto-Replies
                        {countByType.dm_reply > 0 && (
                            <Badge variant="secondary" className="ml-1">{countByType.dm_reply}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="comment_reply" className="flex items-center gap-2">
                        <MessageSquareIcon className="h-4 w-4" />
                        Comment Replies
                        {countByType.comment_reply > 0 && (
                            <Badge variant="secondary" className="ml-1">{countByType.comment_reply}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="lead_capture" className="flex items-center gap-2">
                        <SparklesIcon className="h-4 w-4" />
                        Lead Capture
                        {countByType.lead_capture > 0 && (
                            <Badge variant="secondary" className="ml-1">{countByType.lead_capture}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Content for each tab type */}
                <TabsContent value={activeTab} className="mt-6 space-y-4">
                    {/* Info Card */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4 flex items-start gap-3">
                            <InfoIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">{getTypeDescription(activeTab)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {activeTab === "dm_reply" && "Each conversation is replied to only once to prevent spam."}
                                    {activeTab === "comment_reply" && "Add post URLs and set trigger keywords to auto-reply publicly."}
                                    {activeTab === "lead_capture" && "Combine public comment + DM to capture leads from your posts."}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rules List */}
                    {filteredRules.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                {React.createElement(getTypeIcon(activeTab), {
                                    className: "h-12 w-12 text-muted-foreground/40 mx-auto mb-4"
                                })}
                                <h3 className="font-semibold mb-2">No automations yet</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Create your first {activeTab.replace("_", " ")} automation
                                </p>
                                <Button onClick={openCreateDialog}>
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Create Automation
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {filteredRules.map((rule) => {
                                const Icon = getTypeIcon(rule.type);
                                return (
                                    <Card key={rule.id} className={cn(
                                        "transition-all",
                                        !rule.enabled && "opacity-60"
                                    )}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1">
                                                    <div className={cn("p-2 rounded-lg shrink-0", getTypeColor(rule.type))}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-medium">{rule.name}</h4>
                                                            {rule.keywords.map(kw => (
                                                                <Badge key={kw} variant="outline" className="text-xs">
                                                                    {kw}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {rule.responseTemplate || rule.publicReply || rule.dmMessage}
                                                        </p>
                                                        {rule.postUrl && (
                                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                <LinkIcon className="h-3 w-3" />
                                                                Post: {rule.postUrl.slice(0, 50)}...
                                                            </p>
                                                        )}
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                            <span>Triggered: {rule.triggeredCount}x</span>
                                                            <span>Created: {new Date(rule.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={rule.enabled}
                                                        onCheckedChange={() => handleToggle(rule)}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(rule)}
                                                    >
                                                        <EditIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => handleDelete(rule.id)}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRule ? "Edit" : "Create"} {activeTab.replace("_", " ")} Automation
                        </DialogTitle>
                        <DialogDescription>
                            {getTypeDescription(activeTab)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                placeholder="e.g., Welcome Message, Lead Magnet Delivery"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>

                        {/* Trigger Type */}
                        <div className="space-y-2">
                            <Label>Trigger</Label>
                            <Select
                                value={formData.triggerType}
                                onValueChange={(v) => setFormData(prev => ({ ...prev, triggerType: v as "keyword" | "all_new" }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="keyword">When message contains keywords</SelectItem>
                                    <SelectItem value="all_new">All new messages (with cooldown)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Keywords */}
                        {formData.triggerType === "keyword" && (
                            <div className="space-y-2">
                                <Label>Keywords (comma-separated)</Label>
                                <Input
                                    placeholder="guide, pdf, interested, help"
                                    value={formData.keywords}
                                    onChange={(e) => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Automation triggers when message contains any of these keywords
                                </p>
                            </div>
                        )}

                        {/* Post URL for comment/lead capture */}
                        {(activeTab === "comment_reply" || activeTab === "lead_capture") && (
                            <div className="space-y-2">
                                <Label>LinkedIn Post URL</Label>
                                <Input
                                    placeholder="https://www.linkedin.com/feed/update/urn:li:activity:..."
                                    value={formData.postUrl}
                                    onChange={(e) => setFormData(prev => ({ ...prev, postUrl: e.target.value }))}
                                />
                            </div>
                        )}

                        {/* Response Template for DM replies */}
                        {activeTab === "dm_reply" && (
                            <div className="space-y-2">
                                <Label>Response Message</Label>
                                <Textarea
                                    placeholder="Hi {{firstName}}! Thanks for reaching out..."
                                    value={formData.responseTemplate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, responseTemplate: e.target.value }))}
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use {"{{firstName}}"} to personalize with sender's name
                                </p>
                            </div>
                        )}

                        {/* Public Reply for comments */}
                        {(activeTab === "comment_reply" || activeTab === "lead_capture") && (
                            <div className="space-y-2">
                                <Label>Public Reply (Comment)</Label>
                                <Textarea
                                    placeholder="Thanks {{firstName}}! Check your DMs 📩"
                                    value={formData.publicReply}
                                    onChange={(e) => setFormData(prev => ({ ...prev, publicReply: e.target.value }))}
                                    rows={2}
                                />
                            </div>
                        )}

                        {/* DM Message for lead capture */}
                        {activeTab === "lead_capture" && (
                            <>
                                <div className="space-y-2">
                                    <Label>DM Message</Label>
                                    <Textarea
                                        placeholder="Hi {{firstName}}! Here's the resource you requested..."
                                        value={formData.dmMessage}
                                        onChange={(e) => setFormData(prev => ({ ...prev, dmMessage: e.target.value }))}
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Attachment URL (optional)</Label>
                                    <Input
                                        placeholder="https://example.com/your-lead-magnet.pdf"
                                        value={formData.attachmentUrl}
                                        onChange={(e) => setFormData(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <SendIcon className="h-4 w-4 mr-2" />
                            )}
                            {editingRule ? "Update" : "Create"} Automation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Need to import React for createElement
import React from "react";
