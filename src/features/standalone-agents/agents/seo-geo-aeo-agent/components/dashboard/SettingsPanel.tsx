/**
 * VisibilityAI — Settings Panel
 * Manage domain, competitors, re-run analysis — monochrome
 */

"use client";

import { useState } from "react";
import {
    SettingsIcon,
    GlobeIcon,
    PlusIcon,
    XIcon,
    SaveIcon,
    RefreshCwIcon,
    Loader2Icon,
    AlertTriangleIcon,
    BrainCircuitIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WebsiteProfile, Industry } from "../../config";
import { INDUSTRIES } from "../../config";

interface SettingsPanelProps {
    websiteProfile: WebsiteProfile;
    agentId: string;
    isAnalyzing: boolean;
    onUpdateProfile: (profile: WebsiteProfile) => void;
    onRunAnalysis: () => void;
}

export function SettingsPanel({ websiteProfile, agentId, isAnalyzing, onUpdateProfile, onRunAnalysis }: SettingsPanelProps) {
    const [domain, setDomain] = useState(websiteProfile.domain);
    const [businessName, setBusinessName] = useState(websiteProfile.businessName);
    const [description, setDescription] = useState(websiteProfile.description);
    const [industry, setIndustry] = useState<Industry>(websiteProfile.industry);
    const [competitors, setCompetitors] = useState<string[]>(
        websiteProfile.competitors.length > 0 ? websiteProfile.competitors : [""]
    );
    const [isSaving, setIsSaving] = useState(false);

    const addCompetitor = () => {
        if (competitors.length < 3) setCompetitors([...competitors, ""]);
    };

    const removeCompetitor = (idx: number) => setCompetitors(competitors.filter((_, i) => i !== idx));

    const updateCompetitor = (idx: number, value: string) => {
        const updated = [...competitors];
        updated[idx] = value;
        setCompetitors(updated);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
            const cleanCompetitors = competitors
                .map(c => c.replace(/^https?:\/\//, "").replace(/\/$/, "").trim())
                .filter(Boolean);

            const updated: WebsiteProfile = {
                ...websiteProfile,
                domain: cleanDomain,
                businessName: businessName.trim(),
                description: description.trim(),
                industry,
                competitors: cleanCompetitors,
            };

            await fetch(`/api/standalone-agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config: { websiteProfile: updated } }),
            });

            onUpdateProfile(updated);
            toast.success("Settings saved!");
        } catch (error) {
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                        <SettingsIcon className="h-4 w-4 text-background" />
                    </div>
                    Settings
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Manage your website settings and analysis configuration</p>
            </div>

            {/* Website */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <GlobeIcon className="h-4 w-4 text-foreground" />
                        Website Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm">Domain</Label>
                            <div className="relative">
                                <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={domain}
                                    onChange={e => setDomain(e.target.value)}
                                    placeholder="example.com"
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm">Business Name</Label>
                            <Input
                                value={businessName}
                                onChange={e => setBusinessName(e.target.value)}
                                placeholder="Acme Corp"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm">Description</Label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Brief business description..."
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm">Industry</Label>
                        <select
                            value={industry}
                            onChange={e => setIndustry(e.target.value as Industry)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {INDUSTRIES.map(ind => (
                                <option key={ind} value={ind}>{ind}</option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Competitors */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <GlobeIcon className="h-4 w-4 text-foreground" />
                        Competitors
                        <span className="text-xs font-normal text-muted-foreground">(up to 3)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {competitors.map((comp, idx) => (
                        <div key={idx} className="flex gap-2">
                            <div className="relative flex-1">
                                <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={`competitor${idx + 1}.com`}
                                    value={comp}
                                    onChange={e => updateCompetitor(idx, e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                            {competitors.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-muted-foreground hover:text-foreground"
                                    onClick={() => removeCompetitor(idx)}
                                >
                                    <XIcon className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {competitors.length < 3 && (
                        <Button variant="outline" size="sm" onClick={addCompetitor} className="gap-2 border-dashed w-full">
                            <PlusIcon className="h-4 w-4" />
                            Add Competitor
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-3">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full gap-2"
                >
                    {isSaving
                        ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Saving...</>
                        : <><SaveIcon className="h-4 w-4" /> Save Settings</>
                    }
                </Button>

                <Card className="border-border/50 bg-muted/20">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-2">
                            <BrainCircuitIcon className="h-4 w-4 text-foreground flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold">Re-run Full Agent Analysis</p>
                                <p className="text-xs text-muted-foreground">
                                    Crawls the site again and refreshes all SEO, GEO and AEO scores.
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={onRunAnalysis}
                            disabled={isAnalyzing}
                            className="w-full gap-2"
                        >
                            <RefreshCwIcon className={cn("h-4 w-4", isAnalyzing && "animate-spin")} />
                            {isAnalyzing ? "Analyzing..." : "Re-run Analysis"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
