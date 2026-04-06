/**
 * Smart Rules Panel - Auto-Reply Rule Configuration
 * Configure keyword-based auto-responses for incoming messages
 */

"use client";

import { useState, useEffect } from "react";
import {
    PlusIcon,
    TrashIcon,
    Loader2Icon,
    MessageSquareIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    PencilIcon,
    SaveIcon,
    XIcon,
    ZapIcon,
    BellIcon,
    TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface SmartRule {
    id: string;
    name: string;
    keywords: string[];
    response: string;
    enabled: boolean;
    notifyOnReply: boolean;
    createdAt: string;
    triggeredCount: number;
}

interface SmartRulesPanelProps {
    agentId?: string;
}

export function SmartRulesPanel({ agentId }: SmartRulesPanelProps) {
    const [rules, setRules] = useState<SmartRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        keywords: "",
        response: "",
        notifyOnReply: false,
    });

    const fetchRules = async () => {
        if (!agentId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/smart-rules?agentId=${agentId}`);
            const data = await response.json();
            if (data.smartRules) {
                setRules(data.smartRules);
            }
        } catch (error) {
            console.error("Failed to fetch rules:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, [agentId]);

    const resetForm = () => {
        setFormData({
            name: "",
            keywords: "",
            response: "",
            notifyOnReply: false,
        });
        setEditingId(null);
        setIsCreating(false);
    };

    const handleSave = async () => {
        if (!agentId || !formData.keywords || !formData.response) {
            toast.error("Please fill in keywords and response");
            return;
        }

        const keywordsArray = formData.keywords
            .split(",")
            .map(k => k.trim().toLowerCase())
            .filter(k => k.length > 0);

        if (keywordsArray.length === 0) {
            toast.error("Please add at least one keyword");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/smart-rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    rule: {
                        id: editingId,
                        name: formData.name || `Rule: ${keywordsArray[0]}`,
                        keywords: keywordsArray,
                        response: formData.response,
                        notifyOnReply: formData.notifyOnReply,
                    },
                }),
            });

            if (response.ok) {
                toast.success(editingId ? "Rule updated!" : "Rule created!");
                resetForm();
                fetchRules();
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to save");
            }
        } catch (error) {
            toast.error("Failed to save rule");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!agentId) return;

        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/smart-rules", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, ruleId: id }),
            });

            if (response.ok) {
                toast.success("Rule deleted");
                fetchRules();
            }
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleToggle = async (rule: SmartRule) => {
        if (!agentId) return;

        try {
            await fetch("/api/standalone-agents/linkedin-scheduler/smart-rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    rule: {
                        ...rule,
                        enabled: !rule.enabled,
                    },
                }),
            });
            fetchRules();
        } catch (error) {
            toast.error("Failed to toggle");
        }
    };

    const startEdit = (rule: SmartRule) => {
        setFormData({
            name: rule.name,
            keywords: rule.keywords.join(", "),
            response: rule.response,
            notifyOnReply: rule.notifyOnReply,
        });
        setEditingId(rule.id);
        setIsCreating(true);
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
                        <ZapIcon className="h-6 w-6 text-yellow-500" />
                        Smart Rules
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Auto-reply to messages containing specific keywords
                    </p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        New Rule
                    </Button>
                )}
            </div>

            {/* Create/Edit Form */}
            {isCreating && (
                <Card className="border-yellow-500/50">
                    <CardHeader>
                        <CardTitle className="text-base">
                            {editingId ? "Edit Rule" : "Create Rule"}
                        </CardTitle>
                        <CardDescription>
                            When someone sends a message with any of these keywords, we'll auto-reply
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Rule Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Pricing Info"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="keywords" className="flex items-center gap-2">
                                <TagIcon className="h-3 w-3" />
                                Trigger Keywords * (comma-separated)
                            </Label>
                            <Input
                                id="keywords"
                                placeholder="e.g., pricing, cost, how much, price"
                                value={formData.keywords}
                                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Message will trigger if it contains ANY of these keywords
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="response">Auto-Response *</Label>
                            <Textarea
                                id="response"
                                placeholder="Hey {{firstName}}! Thanks for asking about pricing..."
                                value={formData.response}
                                onChange={(e) => setFormData({ ...formData, response: e.target.value })}
                                rows={4}
                            />
                            <p className="text-xs text-muted-foreground">Use {"{{firstName}}"} for personalization</p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                                <BellIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Notify me when triggered</p>
                                    <p className="text-xs text-muted-foreground">Get a notification when this rule fires</p>
                                </div>
                            </div>
                            <Switch
                                checked={formData.notifyOnReply}
                                onCheckedChange={(checked) => setFormData({ ...formData, notifyOnReply: checked })}
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? (
                                    <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <SaveIcon className="h-4 w-4 mr-2" />
                                )}
                                {editingId ? "Update" : "Create"}
                            </Button>
                            <Button variant="outline" onClick={resetForm}>
                                <XIcon className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Rules List */}
            {rules.length === 0 && !isCreating ? (
                <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                        <MessageSquareIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No Smart Rules Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create rules to auto-reply to common questions
                        </p>
                        <Button onClick={() => setIsCreating(true)}>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create Rule
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule) => (
                        <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <h3 className="font-medium">{rule.name}</h3>
                                            {rule.keywords.slice(0, 3).map((keyword) => (
                                                <Badge key={keyword} variant="outline" className="bg-yellow-500/10 text-yellow-600">
                                                    {keyword}
                                                </Badge>
                                            ))}
                                            {rule.keywords.length > 3 && (
                                                <Badge variant="secondary">
                                                    +{rule.keywords.length - 3} more
                                                </Badge>
                                            )}
                                            {rule.triggeredCount > 0 && (
                                                <Badge variant="secondary">
                                                    {rule.triggeredCount} triggered
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {rule.response}
                                        </p>
                                        {rule.notifyOnReply && (
                                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                <BellIcon className="h-3 w-3" />
                                                Notifications enabled
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggle(rule)}
                                        >
                                            {rule.enabled ? (
                                                <ToggleRightIcon className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <ToggleLeftIcon className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => startEdit(rule)}
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(rule.id)}
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

            {/* Info Card */}
            <Card className="bg-muted/30 border-muted">
                <CardContent className="p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                        <ZapIcon className="h-4 w-4" />
                        How Smart Rules Work
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• When you receive a DM containing any trigger keyword, the auto-response is sent</li>
                        <li>• Each chat is only replied to once to prevent spam</li>
                        <li>• Your own messages are never replied to (loop protection)</li>
                        <li>• Daily limit of 100 messages applies across all automation</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
