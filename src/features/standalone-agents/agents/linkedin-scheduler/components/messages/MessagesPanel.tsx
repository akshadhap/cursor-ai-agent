/**
 * Messages Panel - LinkedIn Message Automation
 * Shows inbox, automation rules, and message templates
 */

"use client";

import { useState, useEffect } from "react";
import {
    MailIcon,
    BotIcon,
    FileTextIcon,
    InboxIcon,
    PlusIcon,
    ClockIcon,
    Loader2Icon,
    PlayIcon,
    Trash2Icon,
    CheckCircle2Icon,
    ExternalLinkIcon,
    BarChart3Icon,
    TrendingUpIcon,
    MessageSquareIcon,
    FilterIcon,
    CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type { MessageTemplate, LinkedInMessage } from "../../config";

type MessagesTab = "inbox" | "automation" | "templates";

// Local automation rule type for this component
interface AutomationRuleLocal {
    id: string;
    name: string;
    enabled: boolean;
    trigger: "new_today" | "all_unread" | "keyword";
    keyword?: string;
    replyMessage: string;
    delay: number;
    createdAt?: string;
}

interface MessagesPanelProps {
    messages: LinkedInMessage[];
    templates: MessageTemplate[];
    isConnected: boolean;
    isLoading: boolean;
    agentId?: string;
    onReplyMessage: (messageId: string, content: string) => void;
    onConnect: () => void;
}

export function MessagesPanel({
    messages,
    templates,
    isConnected,
    isLoading,
    agentId,
    onReplyMessage,
    onConnect,
}: MessagesPanelProps) {
    const [activeTab, setActiveTab] = useState<MessagesTab>("inbox");
    const [rules, setRules] = useState<AutomationRuleLocal[]>([]);
    const [isLoadingRules, setIsLoadingRules] = useState(false);

    // Fetch automation rules
    useEffect(() => {
        if (agentId && isConnected) {
            fetchRules();
        }
    }, [agentId, isConnected]);

    const fetchRules = async () => {
        if (!agentId) return;
        setIsLoadingRules(true);
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/unipile/automation?agentId=${agentId}`);
            const data = await response.json();
            if (data.rules) {
                setRules(data.rules);
            }
        } catch (error) {
            console.error("Failed to fetch rules:", error);
        } finally {
            setIsLoadingRules(false);
        }
    };

    const tabs = [
        { id: "inbox" as const, label: "Inbox", icon: InboxIcon, count: messages.filter(m => !m.isRead).length },
        { id: "automation" as const, label: "Automation", icon: BotIcon, count: rules.filter(r => r.enabled).length },
        { id: "templates" as const, label: "Templates", icon: FileTextIcon, count: templates.length },
    ];

    if (!isConnected) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Card className="max-w-lg border-border/50">
                    <CardContent className="p-8 text-center">
                        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <MailIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Connect LinkedIn</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Connect your LinkedIn account via Unipile to automate messages and manage your inbox.
                        </p>
                        <Button onClick={onConnect} size="lg">
                            Connect LinkedIn Account
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
                    <h1 className="text-2xl font-semibold">Messages</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage LinkedIn messages and automation
                    </p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                    LinkedIn Connected
                </Badge>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            activeTab === tab.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                        {tab.count > 0 && (
                            <Badge
                                variant={activeTab === tab.id ? "secondary" : "outline"}
                                className="ml-1 text-xs px-1.5 py-0"
                            >
                                {tab.count}
                            </Badge>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === "inbox" && (
                <InboxTab messages={messages} onReply={onReplyMessage} isLoading={isLoading} />
            )}

            {activeTab === "automation" && (
                <AutomationTab
                    rules={rules}
                    agentId={agentId}
                    isLoading={isLoadingRules}
                    onRulesChange={setRules}
                />
            )}

            {activeTab === "templates" && (
                <TemplatesTab templates={templates} />
            )}
        </div>
    );
}

// ============================================
// INBOX TAB
// ============================================

function InboxTab({
    messages,
    isLoading,
}: {
    messages: LinkedInMessage[];
    onReply: (messageId: string, content: string) => void;
    isLoading: boolean;
}) {
    // Calculate analytics
    const totalMessages = messages.length;
    const unreadCount = messages.filter(m => !m.isRead).length;
    const todayCount = messages.filter(m => {
        const msgDate = new Date(m.timestamp);
        const today = new Date();
        return msgDate.toDateString() === today.toDateString();
    }).length;
    const weekCount = messages.filter(m => {
        const msgDate = new Date(m.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return msgDate >= weekAgo;
    }).length;

    const openLinkedInInbox = () => {
        window.open('https://www.linkedin.com/messaging/', '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Open LinkedIn Button */}
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <InboxIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">LinkedIn Inbox</h3>
                                <p className="text-sm text-muted-foreground">
                                    View and respond to messages directly on LinkedIn
                                </p>
                            </div>
                        </div>
                        <Button onClick={openLinkedInInbox} className="gap-2">
                            <ExternalLinkIcon className="h-4 w-4" />
                            Open LinkedIn Inbox
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <MessageSquareIcon className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{isLoading ? '-' : totalMessages}</p>
                                <p className="text-xs text-muted-foreground">Total Messages</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                <MailIcon className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{isLoading ? '-' : unreadCount}</p>
                                <p className="text-xs text-muted-foreground">Unread</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <CalendarIcon className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{isLoading ? '-' : todayCount}</p>
                                <p className="text-xs text-muted-foreground">Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <TrendingUpIcon className="h-5 w-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{isLoading ? '-' : weekCount}</p>
                                <p className="text-xs text-muted-foreground">This Week</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Info Card */}
            <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                    <BarChart3Icon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Inbox Analytics</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Your LinkedIn messages are monitored for automation triggers.
                        Use the Automation tab to set up auto-replies based on keywords.
                    </p>
                    <Button variant="outline" className="mt-4 gap-2" onClick={openLinkedInInbox}>
                        <ExternalLinkIcon className="h-4 w-4" />
                        Manage Messages on LinkedIn
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================
// AUTOMATION TAB
// ============================================

function AutomationTab({
    rules,
    agentId,
    isLoading,
    onRulesChange,
}: {
    rules: AutomationRuleLocal[];
    agentId?: string;
    isLoading: boolean;
    onRulesChange: (rules: AutomationRuleLocal[]) => void;
}) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [ruleName, setRuleName] = useState("Auto-reply to new messages");
    const [trigger, setTrigger] = useState<"new_today" | "all_unread" | "keyword">("new_today");
    const [keyword, setKeyword] = useState("");
    const [replyMessage, setReplyMessage] = useState("Hi! Thanks for reaching out. How can I help you?");

    const triggerLabels = {
        new_today: "New messages from today",
        all_unread: "All unread messages",
        keyword: "Messages containing keyword",
    };

    const handleCreateRule = async () => {
        if (!agentId) return;
        setIsSaving(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/unipile/automation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    rule: {
                        name: ruleName,
                        trigger,
                        keyword: trigger === "keyword" ? keyword : undefined,
                        replyMessage,
                        enabled: true,
                        delay: 0,
                    },
                }),
            });

            const data = await response.json();
            if (data.rules) {
                onRulesChange(data.rules);
                setShowCreateForm(false);
                toast.success("Automation rule created!");
            } else {
                toast.error(data.error || "Failed to create rule");
            }
        } catch (error) {
            toast.error("Failed to create rule");
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleRule = async (ruleId: string, enabled: boolean) => {
        if (!agentId) return;
        const rule = rules.find(r => r.id === ruleId);
        if (!rule) return;

        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/unipile/automation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    rule: { ...rule, enabled },
                }),
            });

            const data = await response.json();
            if (data.rules) {
                onRulesChange(data.rules);
            }
        } catch (error) {
            toast.error("Failed to update rule");
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!agentId) return;
        try {
            const response = await fetch(
                `/api/standalone-agents/linkedin-scheduler/unipile/automation?agentId=${agentId}&ruleId=${ruleId}`,
                { method: "DELETE" }
            );

            const data = await response.json();
            if (data.rules !== undefined) {
                onRulesChange(data.rules);
                toast.success("Rule deleted");
            }
        } catch (error) {
            toast.error("Failed to delete rule");
        }
    };

    const handleRunAutomation = async () => {
        if (!agentId) return;
        setIsRunning(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/unipile/automation/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId }),
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message || `Processed ${data.processed} messages`);
            } else {
                toast.error(data.error || "Automation failed");
            }
        } catch (error) {
            toast.error("Failed to run automation");
        } finally {
            setIsRunning(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Create rules to automatically respond to LinkedIn messages
                </p>
                <div className="flex gap-2">
                    {rules.some(r => r.enabled) && (
                        <Button
                            onClick={handleRunAutomation}
                            disabled={isRunning}
                            variant="outline"
                        >
                            {isRunning ? (
                                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <PlayIcon className="h-4 w-4 mr-2" />
                            )}
                            Run Now
                        </Button>
                    )}
                    <Button onClick={() => setShowCreateForm(true)}>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        New Rule
                    </Button>
                </div>
            </div>

            {/* Create Rule Form */}
            {showCreateForm && (
                <Card className="border-border/50 border-2 border-dashed">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Create Automation Rule</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                                Cancel
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="ruleName">Rule Name</Label>
                                <Input
                                    id="ruleName"
                                    value={ruleName}
                                    onChange={(e) => setRuleName(e.target.value)}
                                    placeholder="e.g., Reply to today's messages"
                                />
                            </div>

                            <div>
                                <Label>Trigger</Label>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    {(["new_today", "all_unread", "keyword"] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTrigger(t)}
                                            className={cn(
                                                "p-2 text-xs rounded-lg border text-center transition-colors",
                                                trigger === t
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            {triggerLabels[t]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {trigger === "keyword" && (
                                <div>
                                    <Label htmlFor="keyword">Keywords (comma-separated)</Label>
                                    <Input
                                        id="keyword"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="e.g., interested, hire, job, hello"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Enter multiple keywords separated by commas. Matches if message contains ANY of them.
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="replyMessage">Auto-Reply Message</Label>
                                <Textarea
                                    id="replyMessage"
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Your auto-reply message..."
                                    rows={3}
                                />
                            </div>

                            <Button
                                onClick={handleCreateRule}
                                disabled={isSaving || !ruleName || !replyMessage}
                                className="w-full"
                            >
                                {isSaving ? (
                                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle2Icon className="h-4 w-4 mr-2" />
                                )}
                                Create Rule
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Existing Rules */}
            {rules.length === 0 && !showCreateForm ? (
                <Card className="border-border/50">
                    <CardContent className="p-8 text-center">
                        <BotIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No automation rules</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create rules to auto-reply to messages based on triggers
                        </p>
                        <Button onClick={() => setShowCreateForm(true)} variant="outline">
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create First Rule
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {rules.map((rule) => (
                        <Card key={rule.id} className="border-border/50">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={rule.enabled}
                                            onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                                        />
                                        <div>
                                            <p className="font-medium">{rule.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="text-xs">
                                                    {triggerLabels[rule.trigger]}
                                                </Badge>
                                                {rule.keyword && (
                                                    <Badge variant="outline" className="text-xs">
                                                        "{rule.keyword}"
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                                Reply: "{rule.replyMessage}"
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteRule(rule.id)}
                                    >
                                        <Trash2Icon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// TEMPLATES TAB
// ============================================

function TemplatesTab({
    templates,
}: {
    templates: MessageTemplate[];
}) {
    const categoryLabels = {
        welcome: "Welcome",
        "follow-up": "Follow-up",
        "thank-you": "Thank You",
        custom: "Custom",
    };

    const categoryColors = {
        welcome: "bg-green-500/10 text-green-500",
        "follow-up": "bg-blue-500/10 text-blue-500",
        "thank-you": "bg-purple-500/10 text-purple-500",
        custom: "bg-gray-500/10 text-gray-500",
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Create reusable message templates
                </p>
                <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New Template
                </Button>
            </div>

            {templates.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-8 text-center">
                        <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-2">No templates yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Create templates to use in automated responses
                        </p>
                        <Button variant="outline">
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create First Template
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            className="border-border/50 cursor-pointer hover:border-border transition-colors"
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-medium">{template.name}</h3>
                                    <Badge
                                        variant="secondary"
                                        className={cn("text-xs", categoryColors[template.category])}
                                    >
                                        {categoryLabels[template.category]}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {template.content}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
