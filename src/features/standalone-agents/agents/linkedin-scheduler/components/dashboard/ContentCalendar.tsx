/**
 * Content Calendar - Visual scheduling for posts
 */

"use client";

import { useState } from "react";
import {
    CalendarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PlusIcon,
    ClockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { LinkedInPost } from "../../config";

interface ContentCalendarProps {
    posts: LinkedInPost[];
    onAddPost: (date: Date) => void;
    onSelectPost: (post: LinkedInPost) => void;
}

export function ContentCalendar({
    posts,
    onAddPost,
    onSelectPost,
}: ContentCalendarProps) {
    const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

    // Get current week dates (Monday to Sunday)
    const getWeekDates = (offset: number) => {
        const today = new Date();
        const startOfWeek = new Date(today);
        // getDay() returns 0 for Sunday, 1 for Monday, etc.
        // We want Monday as start of week, so:
        // - If today is Sunday (0), go back 6 days to get Monday
        // - Otherwise, go back (getDay - 1) days to get Monday
        const dayOfWeek = today.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysToSubtract + offset * 7);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates(currentWeekOffset);
    const today = new Date();

    const isToday = (date: Date) => {
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    };

    const getPostsForDate = (date: Date) => {
        return posts.filter((post) => {
            if (!post.scheduledAt) return false;
            const postDate = new Date(post.scheduledAt);
            return (
                postDate.getFullYear() === date.getFullYear() &&
                postDate.getMonth() === date.getMonth() &&
                postDate.getDate() === date.getDate()
            );
        });
    };

    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "scheduled":
                return "bg-blue-500/10 text-blue-500";
            case "posted":
                return "bg-green-500/10 text-green-500";
            case "draft":
                return "bg-yellow-500/10 text-yellow-500";
            case "failed":
                return "bg-red-500/10 text-red-500";
            default:
                return "bg-muted text-muted-foreground";
        }
    };

    return (
        <div className="border rounded-lg border-border/50 bg-card">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Content Calendar</h3>
                        <p className="text-xs text-muted-foreground">
                            {monthNames[weekDates[0].getMonth()]} {weekDates[0].getFullYear()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentWeekOffset(0)}
                    >
                        Today
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                    >
                        <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                <div className="grid grid-cols-7 gap-3">
                    {weekDates.map((date, index) => {
                        const datePosts = getPostsForDate(date);
                        const isTodayDate = isToday(date);

                        return (
                            <div
                                key={index}
                                className={cn(
                                    "min-h-[140px] rounded-lg border p-3 transition-colors",
                                    isTodayDate
                                        ? "border-primary bg-primary/5"
                                        : "border-border/50 hover:border-border"
                                )}
                            >
                                {/* Day Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-muted-foreground">
                                        {dayNames[index]}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span
                                            className={cn(
                                                "text-lg font-semibold",
                                                isTodayDate && "text-primary"
                                            )}
                                        >
                                            {date.getDate()}
                                        </span>
                                        {isTodayDate && (
                                            <Badge className="text-[10px] px-1.5 py-0">
                                                Today
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Posts */}
                                <div className="space-y-2">
                                    {datePosts.length > 0 ? (
                                        datePosts.slice(0, 2).map((post) => {
                                            const time = post.scheduledAt
                                                ? new Date(post.scheduledAt).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "";
                                            return (
                                                <button
                                                    key={post.id}
                                                    onClick={() => onSelectPost(post)}
                                                    className={cn(
                                                        "w-full p-2 rounded text-left text-xs transition-colors hover:opacity-80",
                                                        getStatusColor(post.status)
                                                    )}
                                                >
                                                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                                        <ClockIcon className="h-3 w-3" />
                                                        {time}
                                                    </div>
                                                    <p className="line-clamp-2">
                                                        {post.content.slice(0, 50)}...
                                                    </p>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <button
                                            onClick={() => onAddPost(date)}
                                            className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-4 rounded border border-dashed border-border/50 hover:border-border transition-colors"
                                        >
                                            <PlusIcon className="h-3 w-3" />
                                            Add post
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
