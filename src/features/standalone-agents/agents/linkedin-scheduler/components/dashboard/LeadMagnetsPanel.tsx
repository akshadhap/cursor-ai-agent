/**
 * Lead Magnets Panel - Comment-to-DM Automation
 * Configure keyword triggers for automatic DM responses
 */

"use client";

import { useState, useEffect } from "react";
import {
    PlusIcon,
    TrashIcon,
    Loader2Icon,
    MailIcon,
    FileTextIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    PencilIcon,
    SaveIcon,
    XIcon,
    SparklesIcon,
    LinkIcon,
    RefreshCwIcon,
    MessageCircleIcon,
    CheckCircleIcon,
    UsersIcon,
    UserIcon,
    CalendarIcon,
    ExternalLinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface LeadMagnet {
    id: string;
    name: string;
    keyword: string;
    postUrl?: string;
    publicReply: string;
    dmMessage: string;
    attachmentUrl?: string;
    enabled: boolean;
    createdAt: string;
    triggeredCount: number;
}

interface LeadMagnetsPanelProps {
    agentId?: string;
}

interface CapturedLead {
    id: string;
    name: string;
    profileUrl: string;
    keyword: string;
    leadMagnetName: string;
    capturedAt: string;
    status: "sent" | "pending" | "failed";
}

type SubTab = "automations" | "leads";

export function LeadMagnetsPanel({ agentId }: LeadMagnetsPanelProps) {
    const [leadMagnets, setLeadMagnets] = useState<LeadMagnet[]>([]);
    const [capturedLeads, setCapturedLeads] = useState<CapturedLead[]>([]);
    const [activeSubTab, setActiveSubTab] = useState<SubTab>("automations");
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastScan, setLastScan] = useState<string | null>(null);
    const [scanResult, setScanResult] = useState<{ matched: number; processed: number } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        keyword: "",
        postUrl: "",
        publicReply: "",
        dmMessage: "",
        attachmentUrl: "",
    });

    const fetchLeadMagnets = async () => {
        if (!agentId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/lead-magnet?agentId=${agentId}`);
            const data = await response.json();
            if (data.leadMagnets) {
                setLeadMagnets(data.leadMagnets);
            }
        } catch (error) {
            console.error("Failed to fetch lead magnets:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLeadMagnets();
        fetchLastScan();
        fetchCapturedLeads();
    }, [agentId]);

    const fetchCapturedLeads = async () => {
        if (!agentId) return;
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/lead-magnet/leads?agentId=${agentId}`);
            const data = await response.json();
            if (data.leads) {
                setCapturedLeads(data.leads);
            }
        } catch (error) {
            console.error("Failed to fetch captured leads:", error);
        }
    };

    const fetchLastScan = async () => {
        if (!agentId) return;
        try {
            const response = await fetch(`/api/standalone-agents/linkedin-scheduler/comments/monitor?agentId=${agentId}`);
            const data = await response.json();
            if (data.lastScan) {
                setLastScan(data.lastScan);
            }
        } catch (error) {
            console.error("Failed to fetch last scan:", error);
        }
    };

    const handleScanComments = async () => {
        if (!agentId) return;

        setIsScanning(true);
        setScanResult(null);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/comments/monitor", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId }),
            });

            const data = await response.json();

            if (response.ok) {
                setScanResult({
                    matched: data.leadMagnetsTriggered || 0,
                    processed: data.commentsProcessed || 0,
                });
                setLastScan(new Date().toISOString());
                toast.success(`Scanned ${data.commentsProcessed} comments, triggered ${data.leadMagnetsTriggered} lead magnets`);
                fetchLeadMagnets(); // Refresh to update triggered counts
            } else {
                toast.error(data.error || "Scan failed");
            }
        } catch (error) {
            toast.error("Failed to scan comments");
        } finally {
            setIsScanning(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            keyword: "",
            postUrl: "",
            publicReply: "",
            dmMessage: "",
            attachmentUrl: "",
        });
        setEditingId(null);
        setIsCreating(false);
    };

    const handleSave = async () => {
        if (!agentId || !formData.keyword || !formData.postUrl || !formData.publicReply || !formData.dmMessage) {
            toast.error("Please fill in keyword, post URL, public reply, and DM message");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/lead-magnet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    leadMagnet: {
                        id: editingId,
                        ...formData,
                    },
                }),
            });

            if (response.ok) {
                toast.success(editingId ? "Lead magnet updated!" : "Lead magnet created!");
                resetForm();
                fetchLeadMagnets();
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to save");
            }
        } catch (error) {
            toast.error("Failed to save lead magnet");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!agentId) return;

        try {
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/lead-magnet", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId, leadMagnetId: id }),
            });

            if (response.ok) {
                toast.success("Lead magnet deleted");
                fetchLeadMagnets();
            }
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const handleToggle = async (magnet: LeadMagnet) => {
        if (!agentId) return;

        try {
            await fetch("/api/standalone-agents/linkedin-scheduler/lead-magnet", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    leadMagnet: {
                        ...magnet,
                        enabled: !magnet.enabled,
                    },
                }),
            });
            fetchLeadMagnets();
        } catch (error) {
            toast.error("Failed to toggle");
        }
    };

    const startEdit = (magnet: LeadMagnet) => {
        setFormData({
            name: magnet.name,
            keyword: magnet.keyword,
            publicReply: magnet.publicReply,
            dmMessage: magnet.dmMessage,
            postUrl: magnet.postUrl || "",
            attachmentUrl: magnet.attachmentUrl || "",
        });
        setEditingId(magnet.id);
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
                        <SparklesIcon className="h-6 w-6 text-purple-500" />
                        Lead Magnets
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Auto-reply to post comments and send DMs with your content
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleScanComments}
                        disabled={isScanning || leadMagnets.filter(lm => lm.enabled).length === 0}
                    >
                        {isScanning ? (
                            <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <RefreshCwIcon className="h-4 w-4 mr-2" />
                        )}
                        Scan Comments
                    </Button>
                    {!isCreating && (
                        <Button onClick={() => setIsCreating(true)}>
                            <PlusIcon className="h-4 w-4 mr-2" />
                            New Lead Magnet
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
                <button
                    onClick={() => setActiveSubTab("automations")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeSubTab === "automations" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                >
                    <SparklesIcon className="h-4 w-4 inline mr-2" />
                    Automations
                </button>
                <button
                    onClick={() => setActiveSubTab("leads")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeSubTab === "leads" ? "bg-background shadow-sm" : "hover:bg-background/50"}`}
                >
                    <UsersIcon className="h-4 w-4 inline mr-2" />
                    Leads Captured ({capturedLeads.length})
                </button>
            </div>

            {/* Automations Tab Content */}
            {activeSubTab === "automations" && (
                <>
                    {/* Scan Status Card */}
                    {(lastScan || scanResult) && (
                        <Card className="bg-muted/30">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <MessageCircleIcon className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">Comment Scanner</p>
                                            {lastScan && (
                                                <p className="text-xs text-muted-foreground">
                                                    Last scan: {new Date(lastScan).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {scanResult && (
                                        <div className="flex items-center gap-4">
                                            <div className="text-center">
                                                <p className="text-lg font-semibold">{scanResult.processed}</p>
                                                <p className="text-xs text-muted-foreground">Comments</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-lg font-semibold text-green-500">{scanResult.matched}</p>
                                                <p className="text-xs text-muted-foreground">Triggered</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Create/Edit Form */}
                    {isCreating && (
                        <Card className="border-primary/50">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    {editingId ? "Edit Lead Magnet" : "Create Lead Magnet"}
                                </CardTitle>
                                <CardDescription>
                                    When someone comments with the keyword, we'll reply publicly and send them a DM
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g., Free Guide Offer"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="keyword">Trigger Keyword *</Label>
                                        <Input
                                            id="keyword"
                                            placeholder="e.g., guide, pdf, interested"
                                            value={formData.keyword}
                                            onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="postUrl" className="flex items-center gap-2">
                                        <LinkIcon className="h-3 w-3" />
                                        Post URL *
                                    </Label>
                                    <Input
                                        id="postUrl"
                                        placeholder="https://www.linkedin.com/posts/... or paste post ID"
                                        value={formData.postUrl}
                                        onChange={(e) => setFormData({ ...formData, postUrl: e.target.value })}
                                    />
                                    <p className="text-xs text-muted-foreground">The LinkedIn post URL to monitor for comments with the trigger keyword</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="publicReply">Public Reply *</Label>
                                    <Textarea
                                        id="publicReply"
                                        placeholder="Thanks #name! Just sent it to your inbox 📩"
                                        value={formData.publicReply}
                                        onChange={(e) => setFormData({ ...formData, publicReply: e.target.value })}
                                        rows={2}
                                        className={formData.publicReply.includes('#name') ? 'border-purple-500/50' : ''}
                                    />
                                    {formData.publicReply.includes('#name') && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 font-medium">#name</span>
                                            <span className="text-xs text-muted-foreground">will be replaced with person's first name</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dmMessage">DM Message *</Label>
                                    <Textarea
                                        id="dmMessage"
                                        placeholder="Hey #name! Here's the guide you requested..."
                                        value={formData.dmMessage}
                                        onChange={(e) => setFormData({ ...formData, dmMessage: e.target.value })}
                                        rows={3}
                                        className={formData.dmMessage.includes('#name') ? 'border-purple-500/50' : ''}
                                    />
                                    {formData.dmMessage.includes('#name') && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 font-medium">#name</span>
                                            <span className="text-xs text-muted-foreground">will be replaced with person's first name</span>
                                        </div>
                                    )}
                                </div>

                                {/* Variable Instructions */}
                                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                    <p className="text-sm font-medium text-purple-600 mb-1">💡 Personalization Variables</p>
                                    <p className="text-xs text-muted-foreground">
                                        Use <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-600 font-mono">#name</span> in your messages to automatically insert the commenter's first name.
                                        Example: "Hey <span className="text-purple-600">#name</span>!" becomes "Hey John!"
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="attachmentUrl" className="flex items-center gap-2">
                                        <LinkIcon className="h-3 w-3" />
                                        Attachment URL (optional)
                                    </Label>
                                    <Input
                                        id="attachmentUrl"
                                        placeholder="https://your-site.com/guide.pdf"
                                        value={formData.attachmentUrl}
                                        onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
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

                    {/* Lead Magnets List */}
                    {leadMagnets.length === 0 && !isCreating ? (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">No Lead Magnets Yet</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Create your first lead magnet to auto-send content to commenters
                                </p>
                                <Button onClick={() => setIsCreating(true)}>
                                    <PlusIcon className="h-4 w-4 mr-2" />
                                    Create Lead Magnet
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {leadMagnets.map((magnet) => (
                                <Card key={magnet.id} className={!magnet.enabled ? "opacity-60" : ""}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-medium">{magnet.name}</h3>
                                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500">
                                                        "{magnet.keyword}"
                                                    </Badge>
                                                    {magnet.triggeredCount > 0 && (
                                                        <Badge variant="secondary">
                                                            {magnet.triggeredCount} sent
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground line-clamp-1">
                                                    {magnet.dmMessage}
                                                </p>
                                                {magnet.attachmentUrl && (
                                                    <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                                        <LinkIcon className="h-3 w-3" />
                                                        {magnet.attachmentUrl}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggle(magnet)}
                                                >
                                                    {magnet.enabled ? (
                                                        <ToggleRightIcon className="h-5 w-5 text-green-500" />
                                                    ) : (
                                                        <ToggleLeftIcon className="h-5 w-5 text-muted-foreground" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => startEdit(magnet)}
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(magnet.id)}
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
                </>
            )}

            {/* Leads Captured Tab Content */}
            {activeSubTab === "leads" && (
                <div className="space-y-4">
                    {capturedLeads.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="p-8 text-center">
                                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">No Leads Captured Yet</h3>
                                <p className="text-sm text-muted-foreground">
                                    When users comment with trigger keywords, they'll appear here after receiving your DMs
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {capturedLeads.map((lead) => (
                                <Card key={lead.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <UserIcon className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium">{lead.name}</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Triggered by "{lead.keyword}" • {lead.leadMagnetName}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-right">
                                                    <Badge variant={lead.status === "sent" ? "default" : lead.status === "pending" ? "secondary" : "destructive"}>
                                                        {lead.status === "sent" ? "DM Sent" : lead.status === "pending" ? "Pending" : "Failed"}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(lead.capturedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                {lead.profileUrl && (
                                                    <a
                                                        href={lead.profileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-muted-foreground hover:text-primary"
                                                    >
                                                        <ExternalLinkIcon className="h-4 w-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
