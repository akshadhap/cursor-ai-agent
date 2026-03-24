"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultValues?: {
        cronExpression?: string;
        timezone?: string;
        description?: string;
    };
    onSubmit?: (values: {
        cronExpression: string;
        timezone: string;
        description: string;
    }) => void;
}

// Common cron presets
const cronPresets = [
    { label: "Every minute", value: "* * * * *" },
    { label: "Every 5 minutes", value: "*/5 * * * *" },
    { label: "Every 15 minutes", value: "*/15 * * * *" },
    { label: "Every 30 minutes", value: "*/30 * * * *" },
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every 6 hours", value: "0 */6 * * *" },
    { label: "Every day at midnight", value: "0 0 * * *" },
    { label: "Every day at 9am", value: "0 9 * * *" },
    { label: "Every Monday at 9am", value: "0 9 * * 1" },
    { label: "Weekdays at 9am", value: "0 9 * * 1-5" },
    { label: "First day of month", value: "0 0 1 * *" },
];

// Common timezones
const timezones = [
    { label: "UTC", value: "UTC" },
    { label: "US Eastern (New York)", value: "America/New_York" },
    { label: "US Pacific (Los Angeles)", value: "America/Los_Angeles" },
    { label: "US Central (Chicago)", value: "America/Chicago" },
    { label: "UK (London)", value: "Europe/London" },
    { label: "Central Europe (Berlin)", value: "Europe/Berlin" },
    { label: "India (Kolkata)", value: "Asia/Kolkata" },
    { label: "Japan (Tokyo)", value: "Asia/Tokyo" },
    { label: "Australia (Sydney)", value: "Australia/Sydney" },
];

export const CronTriggerDialog = ({
    open,
    onOpenChange,
    defaultValues = {},
    onSubmit,
}: Props) => {
    const [cronExpression, setCronExpression] = useState(
        defaultValues.cronExpression || "* * * * *"
    );
    const [timezone, setTimezone] = useState(defaultValues.timezone || "UTC");
    const [description, setDescription] = useState(
        defaultValues.description || ""
    );
    const [error, setError] = useState("");

    // Simple cron validation
    const validateCron = (expr: string): boolean => {
        const parts = expr.trim().split(/\s+/);
        return parts.length === 5 || parts.length === 6;
    };

    const handlePresetSelect = (preset: string) => {
        setCronExpression(preset);
        const matchedPreset = cronPresets.find((p) => p.value === preset);
        if (matchedPreset && !description) {
            setDescription(matchedPreset.label);
        }
    };

    const handleSubmit = () => {
        if (!validateCron(cronExpression)) {
            setError(
                "Invalid cron expression. Should have 5 or 6 space-separated fields."
            );
            return;
        }

        setError("");
        onSubmit?.({ cronExpression, timezone, description });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Cron Trigger</DialogTitle>
                    <DialogDescription>
                        Configure when this workflow should run automatically using a cron
                        schedule.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Preset Selection */}
                    <div>
                        <Label>Quick Presets</Label>
                        <Select onValueChange={handlePresetSelect}>
                            <SelectTrigger className="mt-2">
                                <SelectValue placeholder="Choose a preset..." />
                            </SelectTrigger>
                            <SelectContent>
                                {cronPresets.map((preset) => (
                                    <SelectItem key={preset.value} value={preset.value}>
                                        {preset.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Cron Expression */}
                    <div>
                        <Label htmlFor="cronExpression">Cron Expression *</Label>
                        <Input
                            id="cronExpression"
                            value={cronExpression}
                            onChange={(e) => setCronExpression(e.target.value)}
                            placeholder="0 9 * * 1-5"
                            className="mt-2 font-mono"
                        />
                        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
                        <p className="text-xs text-muted-foreground mt-2">
                            Format: minute hour day-of-month month day-of-week
                        </p>
                        <div className="text-xs text-muted-foreground mt-1 grid grid-cols-5 gap-2 bg-muted/50 p-2 rounded font-mono">
                            <span title="Minute (0-59)">MIN</span>
                            <span title="Hour (0-23)">HOUR</span>
                            <span title="Day of Month (1-31)">DOM</span>
                            <span title="Month (1-12)">MON</span>
                            <span title="Day of Week (0-6, 0=Sun)">DOW</span>
                        </div>
                    </div>

                    {/* Timezone */}
                    <div>
                        <Label>Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {timezones.map((tz) => (
                                    <SelectItem key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div>
                        <Label htmlFor="description">Description (optional)</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Daily report at 9am"
                            className="mt-2"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit}>Save Schedule</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
