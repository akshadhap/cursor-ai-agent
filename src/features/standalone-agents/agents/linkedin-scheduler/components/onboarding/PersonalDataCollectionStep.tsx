/**
 * Personal Data Collection Step
 * Collects personal profile details for individual users
 */

"use client";

import { useState } from "react";
import {
    ArrowRightIcon,
    ArrowLeftIcon,
    UserIcon,
    LinkedinIcon,
    GlobeIcon,
    Loader2Icon,
    TargetIcon,
    PenToolIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CompanyProfile, ContentTone } from "../../config";
import { CONTENT_TONES } from "../../config";

interface PersonalDataCollectionStepProps {
    onNext: (profile: CompanyProfile) => void;
    onBack?: () => void;
    initialData?: Partial<CompanyProfile>;
    isLoading?: boolean;
}

const contentGoals = [
    "Build personal brand",
    "Share expertise & knowledge",
    "Network & connect",
    "Find job opportunities",
    "Generate leads",
    "Establish thought leadership",
];

export function PersonalDataCollectionStep({
    onNext,
    onBack,
    initialData,
    isLoading = false,
}: PersonalDataCollectionStepProps) {
    const [fullName, setFullName] = useState(initialData?.businessName || "");
    const [professionalTitle, setProfessionalTitle] = useState(initialData?.industry || "");
    const [bio, setBio] = useState(initialData?.description || "");
    const [linkedInUrl, setLinkedInUrl] = useState(initialData?.linkedInUrl || "");
    const [websiteUrl, setWebsiteUrl] = useState(initialData?.websiteUrl || "");
    const [targetAudience, setTargetAudience] = useState(initialData?.targetAudience || "");
    const [contentTone, setContentTone] = useState<ContentTone>(
        initialData?.contentTone || "professional"
    );
    const [selectedGoals, setSelectedGoals] = useState<string[]>(
        initialData?.productsServices || []
    );

    const toggleGoal = (goal: string) => {
        if (selectedGoals.includes(goal)) {
            setSelectedGoals(selectedGoals.filter((g) => g !== goal));
        } else {
            setSelectedGoals([...selectedGoals, goal]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Map personal data to CompanyProfile format for consistency
        onNext({
            businessName: fullName,
            industry: professionalTitle,
            description: bio,
            companySize: "solo", // Personal accounts are solo
            productsServices: selectedGoals,
            targetAudience,
            contentTone,
            linkedInUrl,
            websiteUrl,
            additionalLinks: [],
        });
    };

    const isValid = fullName.trim() && professionalTitle.trim() && linkedInUrl.trim();

    return (
        <div className="h-screen flex items-center justify-center p-4 bg-background overflow-hidden">
            <Card className="w-full max-w-xl border-border/50 max-h-[calc(100vh-2rem)] flex flex-col">
                <CardHeader className="text-center pb-2 flex-shrink-0">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">Step 2 of 7</span>
                    </div>
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Tell us about yourself</CardTitle>
                    <CardDescription className="text-sm">
                        We'll use this to personalize your content and recommendations
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label htmlFor="fullName">
                                Full Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="fullName"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Professional Title */}
                        <div className="space-y-2">
                            <Label htmlFor="professionalTitle">
                                Professional Title <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="professionalTitle"
                                placeholder="e.g., Software Engineer, Marketing Manager, Entrepreneur"
                                value={professionalTitle}
                                onChange={(e) => setProfessionalTitle(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {/* LinkedIn URL */}
                        <div className="space-y-2">
                            <Label htmlFor="linkedInUrl" className="flex items-center gap-2">
                                <LinkedinIcon className="h-4 w-4 text-blue-500" />
                                LinkedIn Profile URL <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="linkedInUrl"
                                placeholder="https://linkedin.com/in/yourname"
                                value={linkedInUrl}
                                onChange={(e) => setLinkedInUrl(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Personal Website */}
                        <div className="space-y-2">
                            <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                                <GlobeIcon className="h-4 w-4" />
                                Personal Website / Portfolio (optional)
                            </Label>
                            <Input
                                id="websiteUrl"
                                placeholder="https://yourwebsite.com"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Bio */}
                        <div className="space-y-2">
                            <Label htmlFor="bio">Short Bio</Label>
                            <Textarea
                                id="bio"
                                placeholder="Tell us about your background and expertise..."
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                disabled={isLoading}
                                className="min-h-[80px] resize-none"
                            />
                        </div>

                        {/* Content Goals */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <TargetIcon className="h-4 w-4" />
                                Content Goals (select all that apply)
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {contentGoals.map((goal) => (
                                    <button
                                        key={goal}
                                        type="button"
                                        onClick={() => toggleGoal(goal)}
                                        disabled={isLoading}
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${selectedGoals.includes(goal)
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                            }`}
                                    >
                                        {goal}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Target Audience & Content Tone */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="targetAudience">Target Audience</Label>
                                <Input
                                    id="targetAudience"
                                    placeholder="e.g., Tech professionals"
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <PenToolIcon className="h-4 w-4" />
                                    Content Tone
                                </Label>
                                <Select
                                    value={contentTone}
                                    onValueChange={(value) => setContentTone(value as ContentTone)}
                                    disabled={isLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={CONTENT_TONES.PROFESSIONAL}>Professional</SelectItem>
                                        <SelectItem value={CONTENT_TONES.CASUAL}>Casual</SelectItem>
                                        <SelectItem value={CONTENT_TONES.FRIENDLY}>Friendly</SelectItem>
                                        <SelectItem value={CONTENT_TONES.AUTHORITATIVE}>Authoritative</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="space-y-3">
                            <Button
                                type="submit"
                                className="w-full h-11"
                                disabled={isLoading || !isValid}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>

                            {onBack && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full"
                                    onClick={onBack}
                                    disabled={isLoading}
                                >
                                    <ArrowLeftIcon className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
