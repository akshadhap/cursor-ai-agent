/**
 * Step 4: Post Type Selection
 * User selects which types of posts they want to create
 */

"use client";

import { useState } from "react";
import {
    GraduationCapIcon,
    MegaphoneIcon,
    LightbulbIcon,
    TrophyIcon,
    CameraIcon,
    MessageCircleIcon,
    NewspaperIcon,
    ArrowRightIcon,
    ArrowLeftIcon,
    CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PostType, AnalysisResult } from "../../config";
import { POST_TYPE_CONFIG } from "../../config";

interface PostTypeSelectionStepProps {
    analysis: AnalysisResult;
    onNext: (selectedTypes: PostType[]) => void;
    onBack: () => void;
    initialSelection?: PostType[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    GraduationCap: GraduationCapIcon,
    Megaphone: MegaphoneIcon,
    Lightbulb: LightbulbIcon,
    Trophy: TrophyIcon,
    Camera: CameraIcon,
    MessageCircle: MessageCircleIcon,
    Newspaper: NewspaperIcon,
};

export function PostTypeSelectionStep({
    analysis,
    onNext,
    onBack,
    initialSelection = [],
}: PostTypeSelectionStepProps) {
    const [selectedTypes, setSelectedTypes] = useState<PostType[]>(
        initialSelection.length > 0 ? initialSelection : analysis.recommendedPostTypes.slice(0, 3)
    );

    const toggleType = (type: PostType) => {
        setSelectedTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        );
    };

    const handleContinue = () => {
        onNext(selectedTypes);
    };

    const isRecommended = (type: PostType) =>
        analysis.recommendedPostTypes.includes(type);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-3xl border-border/50">
                <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xs text-muted-foreground">Step 4 of 5</span>
                    </div>
                    <CardTitle className="text-2xl">Choose Your Content Types</CardTitle>
                    <CardDescription className="text-base">
                        Select the types of posts you want to create. We&apos;ve pre-selected the best ones for your profile.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Post Type Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(POST_TYPE_CONFIG).map(([key, config]) => {
                            const type = key as PostType;
                            const isSelected = selectedTypes.includes(type);
                            const recommended = isRecommended(type);
                            const IconComponent = iconMap[config.icon] || MessageCircleIcon;

                            return (
                                <button
                                    key={type}
                                    onClick={() => toggleType(type)}
                                    className={cn(
                                        "relative p-4 rounded-lg border text-left transition-all",
                                        isSelected
                                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                                            : "border-border/50 hover:border-border bg-card hover:bg-accent/50"
                                    )}
                                >
                                    {/* Recommended badge */}
                                    {recommended && (
                                        <Badge
                                            className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0"
                                            variant="default"
                                        >
                                            Recommended
                                        </Badge>
                                    )}

                                    {/* Selected check */}
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                            <CheckIcon className="h-3 w-3 text-primary-foreground" />
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3">
                                        <div className={cn("p-2 rounded-lg", `bg-${config.color.replace("text-", "")}/10`)}>
                                            <IconComponent className={cn("h-5 w-5", config.color)} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm">{config.label}</h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {config.description}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected count */}
                    <div className="flex items-center justify-center gap-2 py-2">
                        <span className="text-sm text-muted-foreground">
                            {selectedTypes.length} type{selectedTypes.length !== 1 ? "s" : ""} selected
                        </span>
                        {selectedTypes.length === 0 && (
                            <span className="text-sm text-destructive">Select at least 1</span>
                        )}
                    </div>

                    {/* Content themes from analysis */}
                    {analysis.contentThemes && analysis.contentThemes.length > 0 && (
                        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <h4 className="text-sm font-medium mb-2">Suggested Content Themes</h4>
                            <div className="flex flex-wrap gap-2">
                                {analysis.contentThemes.map((theme, index) => (
                                    <Badge key={index} variant="secondary">
                                        {theme}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeftIcon className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleContinue}
                            disabled={selectedTypes.length === 0}
                        >
                            Continue
                            <ArrowRightIcon className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
