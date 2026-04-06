/**
 * Step 5: Timing Suggestions
 * Shows optimal posting times and lets user approve/modify schedule
 */

"use client";

import { useState } from "react";
import {
    ClockIcon,
    CalendarIcon,
    CheckIcon,
    SparklesIcon,
    ArrowLeftIcon,
    Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AnalysisResult, UserPreferences } from "../../config";

interface TimingSuggestionsStepProps {
    analysis: AnalysisResult;
    selectedPostTypes: string[];
    onComplete: (preferences: UserPreferences) => void;
    onBack: () => void;
    isLoading?: boolean;
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const timeSlots = [
    "8:00 AM",
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
    "6:00 PM",
];

const frequencyOptions = [
    { value: "daily", label: "Daily (7 posts/week)" },
    { value: "3x-week", label: "3x per week" },
    { value: "2x-week", label: "2x per week" },
    { value: "weekly", label: "Weekly (1 post/week)" },
] as const;

export function TimingSuggestionsStep({
    analysis,
    selectedPostTypes,
    onComplete,
    onBack,
    isLoading = false,
}: TimingSuggestionsStepProps) {
    const [frequency, setFrequency] = useState<"daily" | "3x-week" | "2x-week" | "weekly">("3x-week");
    const [schedule, setSchedule] = useState<{ day: string; time: string }[]>(() => {
        // Initialize from analysis optimal times
        return analysis.optimalPostingTimes.map((opt) => ({
            day: opt.day,
            time: opt.timeRange.split(" - ")[0] || "10:00 AM",
        }));
    });

    const handleDayToggle = (day: string) => {
        const exists = schedule.find((s) => s.day === day);
        if (exists) {
            setSchedule(schedule.filter((s) => s.day !== day));
        } else {
            setSchedule([...schedule, { day, time: "10:00 AM" }]);
        }
    };

    const handleTimeChange = (day: string, time: string) => {
        setSchedule(schedule.map((s) => (s.day === day ? { ...s, time } : s)));
    };

    const handleComplete = () => {
        onComplete({
            selectedPostTypes: selectedPostTypes as UserPreferences["selectedPostTypes"],
            approvedSchedule: schedule,
            contentFrequency: frequency,
        });
    };

    const isDaySelected = (day: string) => schedule.some((s) => s.day === day);
    const getDayTime = (day: string) => schedule.find((s) => s.day === day)?.time || "10:00 AM";
    const isOptimalDay = (day: string) =>
        analysis.optimalPostingTimes.some((opt) => opt.day.toLowerCase() === day.toLowerCase());

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-3xl border-border/50">
                <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="text-xs text-muted-foreground">Step 5 of 5</span>
                    </div>
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-cyan-500/10">
                        <ClockIcon className="h-7 w-7 text-cyan-500" />
                    </div>
                    <CardTitle className="text-2xl">Set Your Posting Schedule</CardTitle>
                    <CardDescription className="text-base">
                        Based on our analysis, here are the best times to post. Customize as needed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Posting Frequency */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Posting Frequency</label>
                        <Select
                            value={frequency}
                            onValueChange={(value) => setFrequency(value as typeof frequency)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {frequencyOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Day Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Select Days
                        </label>
                        <div className="grid grid-cols-7 gap-2">
                            {daysOfWeek.map((day) => {
                                const selected = isDaySelected(day);
                                const optimal = isOptimalDay(day);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDayToggle(day)}
                                        className={cn(
                                            "relative p-3 rounded-lg border text-center transition-all",
                                            selected
                                                ? "border-primary bg-primary/10 text-primary"
                                                : "border-border/50 bg-card hover:bg-accent/50"
                                        )}
                                    >
                                        {optimal && !selected && (
                                            <Badge
                                                className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[8px] px-1 py-0"
                                                variant="secondary"
                                            >
                                                Best
                                            </Badge>
                                        )}
                                        {selected && (
                                            <div className="absolute top-1 right-1 h-3 w-3 rounded-full bg-primary flex items-center justify-center">
                                                <CheckIcon className="h-2 w-2 text-primary-foreground" />
                                            </div>
                                        )}
                                        <span className="text-xs font-medium">{day.slice(0, 3)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Selection for Selected Days */}
                    {schedule.length > 0 && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <ClockIcon className="h-4 w-4" />
                                Set Times
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {schedule.map(({ day }) => (
                                    <div
                                        key={day}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card"
                                    >
                                        <span className="text-sm font-medium w-24">{day}</span>
                                        <Select
                                            value={getDayTime(day)}
                                            onValueChange={(time) => handleTimeChange(day, time)}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timeSlots.map((time) => (
                                                    <SelectItem key={time} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Optimal times from analysis */}
                    <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-primary" />
                            AI Recommended Times
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {analysis.optimalPostingTimes.map((time, index) => (
                                <Badge key={index} variant="secondary" className="py-1">
                                    {time.day}: {time.timeRange} ({time.timezone})
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Schedule Summary */}
                    <div className="text-center py-2">
                        <span className="text-sm text-muted-foreground">
                            You&apos;ll post on{" "}
                            <span className="font-medium text-foreground">{schedule.length} days</span> per week
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeftIcon className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleComplete}
                            disabled={isLoading || schedule.length === 0}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                    Setting up...
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="mr-2 h-4 w-4" />
                                    Complete Setup
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
