/**
 * Calendar Panel - Full Monthly Calendar View
 * Shows all scheduled posts and posting history in a full month grid
 */

"use client";

import { useState, useMemo } from "react";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    CalendarIcon,
    ClockIcon,
    CheckCircle2Icon,
    FileTextIcon,
    PlusIcon,
    XIcon,
    ImageIcon,
    ExternalLinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LinkedInPost } from "../../config";

interface CalendarPanelProps {
    posts: LinkedInPost[];
    onSelectPost?: (post: LinkedInPost) => void;
    onAddPost?: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function CalendarPanel({ posts, onSelectPost, onAddPost }: CalendarPanelProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDatePosts, setSelectedDatePosts] = useState<{ date: Date; posts: LinkedInPost[] } | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Generate calendar days for current month
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startDay = firstDayOfMonth.getDay();
        const totalDays = lastDayOfMonth.getDate();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false,
            });
        }

        // Current month days
        for (let day = 1; day <= totalDays; day++) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true,
            });
        }

        // Fill to complete 5 or 6 rows
        const totalCells = days.length <= 35 ? 35 : 42;
        const remainingDays = totalCells - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            days.push({
                date: new Date(year, month + 1, day),
                isCurrentMonth: false,
            });
        }

        return days;
    }, [year, month]);

    // Group posts by date
    const postsByDate = useMemo(() => {
        const grouped: Record<string, LinkedInPost[]> = {};
        posts.forEach((post) => {
            const dateStr = post.scheduledAt
                ? new Date(post.scheduledAt).toDateString()
                : post.createdAt
                    ? new Date(post.createdAt).toDateString()
                    : null;
            if (dateStr) {
                if (!grouped[dateStr]) grouped[dateStr] = [];
                grouped[dateStr].push(post);
            }
        });
        return grouped;
    }, [posts]);

    const getPostsForDate = (date: Date): LinkedInPost[] => {
        return postsByDate[date.toDateString()] || [];
    };

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    const getStatusDot = (status: LinkedInPost["status"]) => {
        switch (status) {
            case "posted":
                return "bg-green-500";
            case "scheduled":
                return "bg-blue-500";
            case "draft":
                return "bg-yellow-500";
            case "failed":
                return "bg-red-500";
            default:
                return "bg-gray-400";
        }
    };

    // Stats
    const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
    const postedCount = posts.filter((p) => p.status === "posted").length;
    const draftCount = posts.filter((p) => p.status === "draft").length;

    const numRows = calendarDays.length / 7;

    return (
        <div className="p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                        Content Calendar
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        View and manage all your scheduled posts
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        {scheduledCount} scheduled
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        {postedCount} posted
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1.5 py-1.5 px-3">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        {draftCount} drafts
                    </Badge>
                </div>
            </div>

            {/* Calendar Container */}
            <div className="bg-card border border-border/50 rounded-2xl shadow-lg flex-1 flex flex-col overflow-hidden">
                {/* Calendar Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h2 className="text-xl font-semibold">
                        {MONTHS[month]} {year}
                    </h2>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={goToPreviousMonth}>
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={goToToday}>
                            Today
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={goToNextMonth}>
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-border/30">
                    {WEEKDAYS.map((day) => (
                        <div
                            key={day}
                            className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className={cn("grid grid-cols-7 flex-1", numRows === 5 ? "grid-rows-5" : "grid-rows-6")}>
                    {calendarDays.map((dayInfo, index) => {
                        const dayPosts = getPostsForDate(dayInfo.date);
                        const isTodayDate = isToday(dayInfo.date);

                        return (
                            <div
                                key={index}
                                onClick={() => {
                                    // If date has posts, show popup; otherwise navigate directly
                                    if (dayPosts.length > 0) {
                                        setSelectedDatePosts({ date: dayInfo.date, posts: dayPosts });
                                    } else {
                                        onAddPost?.(dayInfo.date);
                                    }
                                }}
                                className={cn(
                                    "border-b border-r border-border/20 p-2 cursor-pointer transition-all hover:bg-muted/40 group",
                                    !dayInfo.isCurrentMonth && "bg-muted/20 text-muted-foreground/50",
                                    isTodayDate && "bg-primary/5",
                                    index % 7 === 6 && "border-r-0"
                                )}
                            >
                                {/* Day Number */}
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={cn(
                                            "flex items-center justify-center h-7 w-7 text-sm font-medium rounded-full transition-colors",
                                            isTodayDate && "bg-primary text-primary-foreground",
                                            !isTodayDate && dayInfo.isCurrentMonth && "group-hover:bg-muted"
                                        )}
                                    >
                                        {dayInfo.date.getDate()}
                                    </span>
                                    {dayPosts.length > 0 && (
                                        <div className="flex gap-0.5">
                                            {dayPosts.slice(0, 3).map((post, i) => (
                                                <div
                                                    key={i}
                                                    className={cn("h-1.5 w-1.5 rounded-full", getStatusDot(post.status))}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Posts indicator */}
                                <div className="space-y-0.5">
                                    {dayPosts.slice(0, 2).map((post) => (
                                        <div
                                            key={post.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelectPost?.(post);
                                            }}
                                            className={cn(
                                                "text-[10px] px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:opacity-80",
                                                post.status === "posted" && "bg-green-500/15 text-green-700 dark:text-green-400",
                                                post.status === "scheduled" && "bg-blue-500/15 text-blue-700 dark:text-blue-400",
                                                post.status === "draft" && "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                                            )}
                                        >
                                            {post.content.slice(0, 20)}...
                                        </div>
                                    ))}
                                    {dayPosts.length > 2 && (
                                        <div className="text-[10px] text-muted-foreground text-center">
                                            +{dayPosts.length - 2} more
                                        </div>
                                    )}
                                    {dayPosts.length === 0 && dayInfo.isCurrentMonth && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-1">
                                            <PlusIcon className="h-3 w-3" />
                                            Add
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Date Posts Popup */}
            {selectedDatePosts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDatePosts(null)}>
                    <Card className="max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CalendarIcon className="h-5 w-5 text-primary" />
                                    {selectedDatePosts.date.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric"
                                    })}
                                </CardTitle>
                                <CardDescription>
                                    {selectedDatePosts.posts.length} post{selectedDatePosts.posts.length !== 1 ? "s" : ""} on this date
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedDatePosts(null)}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto">
                            {selectedDatePosts.posts.map((post) => (
                                <div
                                    key={post.id}
                                    onClick={() => {
                                        onSelectPost?.(post);
                                        setSelectedDatePosts(null);
                                    }}
                                    className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "text-xs",
                                                post.status === "posted" && "bg-green-500/10 text-green-600 border-green-500/30",
                                                post.status === "scheduled" && "bg-blue-500/10 text-blue-600 border-blue-500/30",
                                                post.status === "draft" && "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                                            )}
                                        >
                                            {post.status === "posted" && <CheckCircle2Icon className="h-3 w-3 mr-1" />}
                                            {post.status === "scheduled" && <ClockIcon className="h-3 w-3 mr-1" />}
                                            {post.status === "draft" && <FileTextIcon className="h-3 w-3 mr-1" />}
                                            {post.status}
                                        </Badge>
                                        {post.imageUrl && (
                                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <p className="text-sm line-clamp-3">{post.content}</p>
                                </div>
                            ))}

                            <Button
                                className="w-full gap-2 mt-4"
                                onClick={() => {
                                    onAddPost?.(selectedDatePosts.date);
                                    setSelectedDatePosts(null);
                                }}
                            >
                                <PlusIcon className="h-4 w-4" />
                                Add New Post
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
