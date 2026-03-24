/**
 * Settings Panel - Profile & Unipile Integration
 */

"use client";

import { useState, useEffect } from "react";
import {
    UserIcon,
    CheckCircle2Icon,
    ExternalLinkIcon,
    KeyIcon,
    Loader2Icon,
    LinkedinIcon,
    Trash2Icon,
    PencilIcon,
    SaveIcon,
    XIcon,
    GlobeIcon,
    BuildingIcon,
    UsersIcon,
    BriefcaseIcon,
    ClockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import type { CompanyProfile, CompanySize, ContentTone } from "../../config";
import { COMPANY_SIZE_LABELS } from "../../config";
import { getTrialStatus, formatTrialRemaining, TRIAL_DAYS, type TrialStatus } from "@/lib/trial-utils";

interface SettingsPanelProps {
    businessProfile: CompanyProfile;
    unipileConnected?: boolean;
    unipileAccountId?: string;
    agentId?: string;
    onUpdateBusinessProfile: (profile: CompanyProfile) => void;
    onSaveUnipileAccountId?: (accountId: string) => void;
    onDisconnectUnipile?: () => void;
}

export function SettingsPanel({
    businessProfile,
    unipileConnected = false,
    unipileAccountId,
    agentId,
    onUpdateBusinessProfile,
    onSaveUnipileAccountId,
    onDisconnectUnipile,
}: SettingsPanelProps) {
    const [unipileAccountIdInput, setUnipileAccountIdInput] = useState("");
    const [isSavingUnipile, setIsSavingUnipile] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);

    // Profile editing state
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [editedProfile, setEditedProfile] = useState<CompanyProfile>(businessProfile);

    // Reset edited profile when businessProfile changes
    useEffect(() => {
        setEditedProfile(businessProfile);
    }, [businessProfile]);

    // Trial status state
    const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);

    // Fetch trial status
    useEffect(() => {
        const fetchTrialStatus = async () => {
            if (!agentId) return;
            try {
                const response = await fetch(`/api/standalone-agents/${agentId}`);
                if (response.ok) {
                    const data = await response.json();
                    const config = data.config || data.agent?.config || {};
                    setTrialStatus(getTrialStatus(config));
                }
            } catch (error) {
                console.error("Failed to fetch trial status:", error);
            }
        };
        fetchTrialStatus();
    }, [agentId, unipileConnected]);

    const handleSaveUnipileAccountId = async () => {
        if (!unipileAccountIdInput.trim()) {
            toast.error("Please enter a Unipile Account ID");
            return;
        }

        setIsSavingUnipile(true);
        try {
            if (onSaveUnipileAccountId) {
                await onSaveUnipileAccountId(unipileAccountIdInput.trim());
                setUnipileAccountIdInput("");
                toast.success("LinkedIn connected via Unipile!");
            } else if (agentId) {
                // Call API directly if no handler provided
                const response = await fetch("/api/standalone-agents/linkedin-scheduler/unipile/connect", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        agentId,
                        accountId: unipileAccountIdInput.trim(),
                    }),
                });

                if (response.ok) {
                    setUnipileAccountIdInput("");
                    toast.success("LinkedIn connected via Unipile!");
                    window.location.reload();
                } else {
                    const error = await response.json();
                    toast.error(error.error || "Failed to save account ID");
                }
            }
        } catch (error) {
            toast.error("Failed to save account ID");
        } finally {
            setIsSavingUnipile(false);
        }
    };

    const handleDisconnectLinkedIn = async () => {
        if (!agentId) return;

        setIsDisconnecting(true);
        try {
            // Call API to disconnect
            const response = await fetch("/api/standalone-agents/linkedin-scheduler/unipile/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agentId }),
            });

            if (response.ok) {
                toast.success("LinkedIn disconnected");
                if (onDisconnectUnipile) {
                    onDisconnectUnipile();
                } else {
                    window.location.reload();
                }
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to disconnect");
            }
        } catch (error) {
            toast.error("Failed to disconnect LinkedIn");
        } finally {
            setIsDisconnecting(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSavingProfile(true);
        try {
            onUpdateBusinessProfile(editedProfile);
            setIsEditingProfile(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            toast.error("Failed to update profile");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleCancelEdit = () => {
        setEditedProfile(businessProfile);
        setIsEditingProfile(false);
    };

    return (
        <div className="p-6 space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your account and integrations
                </p>
            </div>

            {/* Profile Section */}
            <Card className="border-border/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-base">Profile</CardTitle>
                        </div>
                        {!isEditingProfile && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditingProfile(true)}
                            >
                                <PencilIcon className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isEditingProfile ? (
                        /* Edit Mode */
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="businessName">
                                        <BuildingIcon className="h-3 w-3 inline mr-1" />
                                        Business Name
                                    </Label>
                                    <Input
                                        id="businessName"
                                        value={editedProfile.businessName}
                                        onChange={(e) => setEditedProfile({
                                            ...editedProfile,
                                            businessName: e.target.value,
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="industry">
                                        <BriefcaseIcon className="h-3 w-3 inline mr-1" />
                                        Industry
                                    </Label>
                                    <Input
                                        id="industry"
                                        value={editedProfile.industry}
                                        onChange={(e) => setEditedProfile({
                                            ...editedProfile,
                                            industry: e.target.value,
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={editedProfile.description}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        description: e.target.value,
                                    })}
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="companySize">
                                        <UsersIcon className="h-3 w-3 inline mr-1" />
                                        Company Size
                                    </Label>
                                    <Select
                                        value={editedProfile.companySize}
                                        onValueChange={(value: CompanySize) => setEditedProfile({
                                            ...editedProfile,
                                            companySize: value,
                                        })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(COMPANY_SIZE_LABELS).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="targetAudience">Target Audience</Label>
                                    <Input
                                        id="targetAudience"
                                        value={editedProfile.targetAudience}
                                        onChange={(e) => setEditedProfile({
                                            ...editedProfile,
                                            targetAudience: e.target.value,
                                        })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="linkedInUrl">
                                    <LinkedinIcon className="h-3 w-3 inline mr-1" />
                                    LinkedIn URL
                                </Label>
                                <Input
                                    id="linkedInUrl"
                                    placeholder="https://linkedin.com/company/..."
                                    value={editedProfile.linkedInUrl}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        linkedInUrl: e.target.value,
                                    })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="websiteUrl">
                                    <GlobeIcon className="h-3 w-3 inline mr-1" />
                                    Website URL
                                </Label>
                                <Input
                                    id="websiteUrl"
                                    placeholder="https://yourcompany.com"
                                    value={editedProfile.websiteUrl}
                                    onChange={(e) => setEditedProfile({
                                        ...editedProfile,
                                        websiteUrl: e.target.value,
                                    })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contentTone">Content Tone</Label>
                                <Select
                                    value={editedProfile.contentTone}
                                    onValueChange={(value: ContentTone) => setEditedProfile({
                                        ...editedProfile,
                                        contentTone: value,
                                    })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="casual">Casual</SelectItem>
                                        <SelectItem value="authoritative">Authoritative</SelectItem>
                                        <SelectItem value="friendly">Friendly</SelectItem>
                                        <SelectItem value="inspirational">Inspirational</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={isSavingProfile}
                                >
                                    {isSavingProfile ? (
                                        <Loader2Icon className="h-4 w-4 animate-spin mr-1" />
                                    ) : (
                                        <SaveIcon className="h-4 w-4 mr-1" />
                                    )}
                                    Save Changes
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                >
                                    <XIcon className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* View Mode */
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-semibold">
                                    {businessProfile.businessName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium">{businessProfile.businessName}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {businessProfile.industry}
                                    </p>
                                </div>
                            </div>

                            {(businessProfile.linkedInUrl || businessProfile.websiteUrl) && (
                                <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    {businessProfile.linkedInUrl && (
                                        <a
                                            href={businessProfile.linkedInUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                        >
                                            <LinkedinIcon className="h-3 w-3" />
                                            LinkedIn
                                            <ExternalLinkIcon className="h-3 w-3" />
                                        </a>
                                    )}
                                    {businessProfile.websiteUrl && (
                                        <a
                                            href={businessProfile.websiteUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                        >
                                            <GlobeIcon className="h-3 w-3" />
                                            Website
                                            <ExternalLinkIcon className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Trial Status Section */}
            {trialStatus && trialStatus.trialStartDate && (
                <Card className={`border-border/50 ${trialStatus.isExpired ? 'border-red-500/50 bg-red-500/5' : ''}`}>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ClockIcon className={`h-5 w-5 ${trialStatus.isExpired ? 'text-red-500' : 'text-blue-500'}`} />
                            <CardTitle className="text-base">Trial Status</CardTitle>
                        </div>
                        <CardDescription>
                            {trialStatus.isExpired
                                ? "Your trial has expired. Reconnect to continue."
                                : "Your LinkedIn connection trial period"
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">
                                    {trialStatus.isExpired
                                        ? "Trial Expired"
                                        : formatTrialRemaining(trialStatus)
                                    }
                                </span>
                                <span className="text-muted-foreground">
                                    {trialStatus.isExpired ? 0 : trialStatus.daysRemaining} / {TRIAL_DAYS} days
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${trialStatus.isExpired ? 'bg-red-500' :
                                        trialStatus.daysRemaining <= 1 ? 'bg-yellow-500' :
                                            trialStatus.daysRemaining <= 2 ? 'bg-yellow-500' :
                                                'bg-blue-500'
                                        }`}
                                    style={{ width: `${trialStatus.isExpired ? 0 : (trialStatus.daysRemaining / TRIAL_DAYS) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Trial Details */}
                        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Started</p>
                                <p className="text-sm font-medium">
                                    {new Date(trialStatus.trialStartDate).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Expires</p>
                                <p className="text-sm font-medium">
                                    {trialStatus.trialEndsAt
                                        ? trialStatus.trialEndsAt.toLocaleDateString()
                                        : '-'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Info/Warning */}
                        {trialStatus.isExpired ? (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                <p className="text-sm text-red-600">
                                    ⚠️ Your trial has expired. Please go to LinkedIn Connection above and reconnect to refresh your trial period.
                                </p>
                            </div>
                        ) : trialStatus.daysRemaining <= 2 ? (
                            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <p className="text-sm text-yellow-600">
                                    ⏰ Your trial is ending soon. Make sure to save any important data before it expires.
                                </p>
                            </div>
                        ) : (
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-sm text-blue-600">
                                    🎉 Enjoy your trial! You have full access to all features for {trialStatus.daysRemaining} more days.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Unipile LinkedIn Integration */}
            <Card className="border-border/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <LinkedinIcon className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-base">LinkedIn Connection</CardTitle>
                    </div>
                    <CardDescription>
                        Connect LinkedIn for posting and message automation
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {unipileConnected ? (
                        /* Connected State */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <span className="font-medium">Connected</span>
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                        <CheckCircle2Icon className="h-3 w-3 mr-1" />
                                        Active
                                    </Badge>
                                </div>
                            </div>

                            {/* Disconnect Button */}
                            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-destructive">Disconnect LinkedIn</p>
                                        <p className="text-xs text-muted-foreground">
                                            This will stop all posting and messaging features
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDisconnectLinkedIn}
                                        disabled={isDisconnecting}
                                    >
                                        {isDisconnecting ? (
                                            <Loader2Icon className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Trash2Icon className="h-4 w-4 mr-1" />
                                                Disconnect
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Not Connected - Show Connect Button */
                        <div className="space-y-4">
                            {/* Connect Button - Primary Action */}
                            <div className="p-6 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="p-3 rounded-full bg-blue-500/20">
                                        <LinkedinIcon className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-medium">Connect Your LinkedIn</h4>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Securely connect your LinkedIn account to start posting
                                        </p>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={async () => {
                                            setIsSavingUnipile(true);
                                            try {
                                                const response = await fetch(`/api/standalone-agents/linkedin-scheduler/unipile/connect?agentId=${agentId}`);
                                                const data = await response.json();

                                                if (data.connectUrl) {
                                                    // Redirect to Unipile hosted auth
                                                    window.location.href = data.connectUrl;
                                                } else if (data.error) {
                                                    toast.error(data.error);
                                                } else {
                                                    toast.error("No connect URL received. Check server logs.");
                                                }
                                            } catch (error) {
                                                toast.error("Failed to start connection. Please try again.");
                                            } finally {
                                                setIsSavingUnipile(false);
                                            }
                                        }}
                                        disabled={isSavingUnipile}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                                    >
                                        {isSavingUnipile ? (
                                            <>
                                                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <LinkedinIcon className="h-4 w-4 mr-2" />
                                                Connect LinkedIn
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* What happens */}
                            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                                <h4 className="text-sm font-medium mb-2">What happens next?</h4>
                                <ol className="space-y-1 text-sm text-muted-foreground">
                                    <li>1. You'll be redirected to LinkedIn login</li>
                                    <li>2. Approve the connection securely</li>
                                    <li>3. Return here and start posting!</li>
                                </ol>
                            </div>

                            {/* Google SSO Tip */}
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    💡 <strong>Tip:</strong> If you normally log into LinkedIn with Google,
                                    click <strong>"Continue with Google"</strong> on the LinkedIn login page!
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Automation Queue Settings */}
            <Card className="border-border/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ClockIcon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Automation Queue</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Configure humanized delays for automated replies
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-border/50">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <ClockIcon className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-medium">Humanized Timing</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Messages are queued and sent with random delays between 45-90 seconds
                                    to mimic human behavior and avoid detection.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm">Min Delay (seconds)</Label>
                            <Input
                                type="number"
                                defaultValue={45}
                                min={30}
                                max={300}
                                className="bg-background"
                                disabled
                            />
                            <p className="text-xs text-muted-foreground">Minimum wait time</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm">Max Delay (seconds)</Label>
                            <Input
                                type="number"
                                defaultValue={90}
                                min={45}
                                max={600}
                                className="bg-background"
                                disabled
                            />
                            <p className="text-xs text-muted-foreground">Maximum wait time</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                            <p className="text-sm font-medium">Queue Status</p>
                            <p className="text-xs text-muted-foreground">
                                Automation queue is active
                            </p>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            Active
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

