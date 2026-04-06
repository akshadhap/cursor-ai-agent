/**
 * Action Now Section
 * Displays top priority emails that need immediate attention
 * Uses muted, monochromatic color scheme
 */

"use client";

import { useMemo } from "react";
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    DollarSign,
    Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Email {
    id: string;
    subject: string;
    from: string;
    snippet?: string;
    date: string;
    category: string;
    priority: string;
    smartScore?: number;
    smartLevel?: 'critical' | 'high' | 'medium' | 'low';
    isUrgent?: boolean;
    extractedDates?: { text: string; type: string; isUrgent: boolean }[];
    monetaryAmounts?: string[];
    suggestedAction?: string;
    isRead?: boolean;
}

interface ActionNowSectionProps {
    emails: Email[];
    onSelectEmail: (id: string) => void;
    className?: string;
}

export function ActionNowSection({ emails, onSelectEmail, className }: ActionNowSectionProps) {
    const actionEmails = useMemo(() => {
        return emails
            .filter(e => (e.smartScore || 0) >= 60 || e.isUrgent || e.category === 'requires_action')
            .sort((a, b) => (b.smartScore || 0) - (a.smartScore || 0))
            .slice(0, 3);
    }, [emails]);

    if (actionEmails.length === 0) {
        return null;
    }

    return (
        <div className={cn("px-4 py-3 border-b border-border bg-muted/30", className)}>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-foreground/10 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-foreground" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-foreground">Action Now</h3>
                </div>
                <span className="text-[10px] text-muted-foreground">
                    {actionEmails.length} priority
                </span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {actionEmails.map((email) => (
                    <ActionEmailCard
                        key={email.id}
                        email={email}
                        onClick={() => onSelectEmail(email.id)}
                    />
                ))}
            </div>
        </div>
    );
}

function ActionEmailCard({ email, onClick }: { email: Email; onClick: () => void }) {
    const senderName = email.from.match(/^([^<]+)/)?.[1]?.trim() || email.from.split('@')[0];

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex-shrink-0 w-[260px] p-3 rounded-xl border text-left transition-all",
                "bg-card hover:bg-accent border-border hover:border-foreground/20",
                "hover:shadow-md"
            )}
        >
            <div className="flex items-start gap-3">
                {/* Score Badge - Monochrome */}
                <SmartScoreBadge
                    score={email.smartScore || 0}
                    level={email.smartLevel || 'medium'}
                />

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground truncate">{senderName}</span>
                        {email.isUrgent && (
                            <span className="text-[9px] font-semibold text-foreground/70 uppercase">
                                urgent
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{email.subject}</p>

                    {/* Minimal Insights */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {email.extractedDates && email.extractedDates.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                                <Calendar className="w-2.5 h-2.5" />
                                {email.extractedDates[0].text}
                            </span>
                        )}
                        {email.monetaryAmounts && email.monetaryAmounts.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground">
                                <DollarSign className="w-2.5 h-2.5" />
                                {email.monetaryAmounts[0]}
                            </span>
                        )}
                    </div>
                </div>

                <ArrowRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-1" />
            </div>
        </button>
    );
}

/**
 * Smart Score Badge - Monochromatic design
 */
export function SmartScoreBadge({
    score,
    level,
    size = 'default'
}: {
    score: number;
    level: 'critical' | 'high' | 'medium' | 'low';
    size?: 'small' | 'default';
}) {
    // Monochromatic - use opacity to indicate priority
    const opacity = level === 'critical' ? 'bg-foreground text-background'
        : level === 'high' ? 'bg-foreground/80 text-background'
            : level === 'medium' ? 'bg-foreground/40 text-foreground'
                : 'bg-muted text-muted-foreground';

    return (
        <div className={cn(
            "rounded-lg flex items-center justify-center font-bold flex-shrink-0",
            opacity,
            size === 'small' ? 'w-6 h-6 text-[10px]' : 'w-9 h-9 text-xs'
        )}>
            {score}
        </div>
    );
}

/**
 * Minimal Insight Tags
 */
export function InsightTags({ email }: { email: Email }) {
    if (!email.extractedDates?.length && !email.monetaryAmounts?.length) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            {email.extractedDates && email.extractedDates.slice(0, 1).map((date, i) => (
                <span key={i} className="inline-flex items-center gap-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {date.text}
                </span>
            ))}
            {email.monetaryAmounts && email.monetaryAmounts.slice(0, 1).map((amt, i) => (
                <span key={i} className="inline-flex items-center gap-0.5">
                    <DollarSign className="w-2.5 h-2.5" />
                    {amt}
                </span>
            ))}
        </div>
    );
}
