"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
    Activity,
    Search,
    RefreshCw,
    Settings,
    Inbox,
    Mail,
    AlertCircle,
    CheckCircle,
    Archive,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Shield,
    Zap,
    Star,
    Square,
    CheckSquare,
    ArrowDownUp,
    LayoutGrid,
    Sparkles,
    MessageSquare,
    ChevronDown,
    CreditCard,
    LogOut,
    Send,
    PanelRight,
    X,
    Plus,
    ExternalLink,
    Loader2,
    Tag,
    Newspaper,
    Bell,
    Bot,
    User,
    Megaphone,
    Play,
    Clock,
    History,
    Paperclip,
    Menu,
    type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsPanel } from "./SettingsPanel";
import { SyncPreferencesModal, SyncPreferences, dateRangeToQuery } from "./SyncPreferencesModal";
import { AnalyticsWidget } from "./AnalyticsWidget";
import { AutomationRulesManager } from "./AutomationRulesManager";
import { KnowledgeBaseSettings } from "./KnowledgeBaseSettings";
import { ActionNowSection, SmartScoreBadge, InsightTags } from "./ActionNowSection";
import { NotionPageDialog } from "./NotionPageDialog";
import { ChatSidePanel } from "../ChatSidePanel";
import { FilterToolbar, FilterState, SortState, defaultFilters, defaultSort } from "./FilterToolbar";
import { Switch } from "@/components/ui/switch";
import { ActivityHistory } from "./ActivityHistory";
import { AttachmentsView } from "./AttachmentsView";
import { SpamRescueView } from "./SpamRescueView";

interface EmailDashboardProps {
    agentId: string;
    isConnected: boolean;
    isSlackConnected?: boolean;
    isJiraConnected?: boolean;
    isNotionConnected?: boolean;
    userEmail?: string;
    userName?: string;
    onConnectSlack?: () => void;
    onConnect: () => void;
    onConnectJira?: () => void;
    onConnectNotion?: () => void;
    onDisconnectJira?: () => void;
    onDisconnectGmail?: () => void;
    onDisconnectNotion?: () => void;
    onDisconnectSlack?: () => void;
    onOpenSettings: () => void;
}

interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
}

interface Email {
    id: string;
    subject: string;
    from: string;
    snippet: string;
    body?: string; // Added body for reading pane
    date: string;
    category: string;
    priority: string;
    confidence?: number;
    labels: string[];
    isRead?: boolean;
    actionRequired?: boolean;
    attachments?: Attachment[];
}

// Category configuration for display
const CATEGORY_CONFIG: Record<string, { label: string; Icon: LucideIcon; color: string; bgClass: string }> = {
    'requires_action': {
        label: 'Action Required',
        Icon: AlertCircle,
        color: 'red',
        bgClass: 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/15 dark:text-red-400',
    },
    'important': {
        label: 'Important',
        Icon: Star,
        color: 'orange',
        bgClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/15 dark:text-orange-400',
    },
    'personal': {
        label: 'Personal',
        Icon: User,
        color: 'blue',
        bgClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400',
    },
    'transactional': {
        label: 'Transactional',
        Icon: CreditCard,
        color: 'purple',
        bgClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/15 dark:text-purple-400',
    },
    'updates': {
        label: 'Updates',
        Icon: Bell,
        color: 'cyan',
        bgClass: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-500/15 dark:text-cyan-400',
    },
    'newsletters': {
        label: 'Newsletters',
        Icon: Newspaper,
        color: 'gray',
        bgClass: 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-500/15 dark:text-gray-400',
    },
    'promotional': {
        label: 'Promotional',
        Icon: Megaphone,
        color: 'emerald',
        bgClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    'automated': {
        label: 'Automated',
        Icon: Bot,
        color: 'slate',
        bgClass: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-500/15 dark:text-slate-400',
    },
};

// Category tabs for filtering
const CATEGORY_TABS: { id: string; label: string; Icon: LucideIcon | null }[] = [
    { id: 'all', label: 'All', Icon: null },
    { id: 'requires_action', label: 'Action', Icon: AlertCircle },
    { id: 'important', label: 'Important', Icon: Star },
    { id: 'personal', label: 'Personal', Icon: User },
    { id: 'transactional', label: 'Bills', Icon: CreditCard },
    { id: 'updates', label: 'Updates', Icon: Bell },
    { id: 'newsletters', label: 'News', Icon: Newspaper },
    { id: 'promotional', label: 'Promos', Icon: Megaphone },
];

// Category badge colors - theme adaptive
const getCategoryStyle = (category: string) => {
    const config = CATEGORY_CONFIG[category.toLowerCase()];
    return config?.bgClass || 'bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-500/15 dark:text-gray-400';
};

const getCategoryInfo = (category: string) => {
    return CATEGORY_CONFIG[category.toLowerCase()] || { label: category, icon: '📧', color: 'gray', bgClass: '' };
};

// Get sender initials and color
const getSenderInfo = (from: string) => {
    const name = from.replace(/<.*>/, '').trim();
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

    // Generate consistent color based on name - using solid colors for better visibility
    const colors = [
        'bg-blue-500',
        'bg-emerald-500',
        'bg-orange-500',
        'bg-purple-500',
        'bg-cyan-500',
        'bg-amber-500',
        'bg-rose-500',
        'bg-indigo-500',
        'bg-teal-500',
        'bg-pink-500',
    ];
    const colorIndex = name.charCodeAt(0) % colors.length;

    return { name, initials, color: colors[colorIndex] };
};

export function EmailDashboard({
    agentId,
    isConnected,
    isSlackConnected = false,
    isJiraConnected = false,
    isNotionConnected = false,
    userEmail,
    onConnect,
    onConnectSlack,
    onConnectJira,
    onConnectNotion,
    onDisconnectJira,
    onDisconnectGmail,
    onDisconnectNotion,
    onDisconnectSlack,
    onOpenSettings
}: EmailDashboardProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState("inbox");
    const [searchQuery, setSearchQuery] = useState("");
    const [emails, setEmails] = useState<Email[]>([]);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [showAnalytics, setShowAnalytics] = useState(true);
    const [agentConfig, setAgentConfig] = useState<any>(null);

    // Fetch Agent Config
    useEffect(() => {
        const fetchAgentConfig = async () => {
            if (!agentId) return;
            try {
                const res = await fetch(`/api/standalone-agents/${agentId}`);
                if (res.ok) {
                    const data = await res.json();
                    setAgentConfig(data.config || {});
                }
            } catch (error) {
                console.error("Failed to fetch agent config:", error);
            }
        };
        fetchAgentConfig();
    }, [agentId]);

    // Responsive: Collapse sidebar on mobile mount
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setSidebarCollapsed(true);
        }
    }, []);

    // Active Email for Reading Pane
    const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
    const [isReadingPaneOpen, setIsReadingPaneOpen] = useState(false); // Default: Closed
    const activeEmail = useMemo(() => emails.find(e => e.id === activeEmailId), [emails, activeEmailId]);

    // Category filter state
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [showStarredOnly, setShowStarredOnly] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const EMAILS_PER_PAGE = 25;

    // Sync preferences state
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncPreferences, setSyncPreferences] = useState<SyncPreferences | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSavingPreferences, setIsSavingPreferences] = useState(false);

    // Check for user preferences on mount
    useEffect(() => {
        const checkPreferences = async () => {
            if (!agentId) return;
            try {
                const res = await fetch(`/api/standalone-agents/gmail-classifier/preferences?agentId=${agentId}&userId=${agentId}`); // Ideally userId, but auth header handles it
                if (res.ok) {
                    const data = await res.json();
                    const prefs = data.syncPreferences || {};
                    console.log("Fetched prefs:", prefs);
                    setSyncPreferences(prefs);

                    // If connected AND no preferences set, show modal to ask user
                    if (isConnected && Object.keys(prefs).length === 0) {
                        setShowSyncModal(true);
                    }
                }
            } catch (error) {
                console.error("Failed to check preferences:", error);
            }
        };
        checkPreferences();
    }, [agentId, isConnected]);

    const handleSavePreferences = async (newPrefs: SyncPreferences) => {
        setIsSavingPreferences(true);
        try {
            const res = await fetch(`/api/standalone-agents/gmail-classifier/preferences`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId,
                    syncPreferences: newPrefs
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error("Save prefs error response:", errData);
                throw new Error(errData.details || errData.error || "Failed to save preferences");
            }

            setSyncPreferences(newPrefs);
            setShowSyncModal(false);
            toast.success("Sync preferences saved");

            // Trigger fresh sync with new settings
            handleRefresh();

        } catch (error: any) {
            console.error("Error saving preferences:", error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setIsSavingPreferences(false);
        }
    };

    const handleSignOut = async () => {
        try {
            // Call server-side logout to clear HTTP-only cookies
            await fetch("/api/auth/logout", { method: "POST" });
        } catch (e) {
            console.error("Logout failed", e);
        }

        // Clear client-side cookies as backup
        document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
        document.cookie = "email=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

        // Force reload to trigger auth check/redirect
        window.location.href = "/login";
    };

    // Chat side panel state
    const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);
    const [chatContext, setChatContext] = useState<any>(null);

    // Automation settings state
    const [autoCreateJiraTasks, setAutoCreateJiraTasks] = useState(false);
    const [jiraProjectKey, setJiraProjectKey] = useState<string>("");

    // Apply rules state
    const [isApplyingRules, setIsApplyingRules] = useState(false);
    const [applyRulesResult, setApplyRulesResult] = useState<any>(null);

    // Apply rules to current filter
    const handleApplyRules = async (targetCategory?: string) => {
        if (isApplyingRules) return;
        setIsApplyingRules(true);
        setApplyRulesResult(null);

        try {
            const filter: any = {};

            // Use current category filter or specified target
            const catToUse = targetCategory || (selectedCategory !== 'all' ? selectedCategory : undefined);
            if (catToUse) {
                filter.category = catToUse;
            }

            // If emails are selected, use those
            if (selectedEmails.size > 0) {
                filter.emailIds = Array.from(selectedEmails);
            }

            const response = await fetch('/api/standalone-agents/gmail-classifier/automation-rules/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId,
                    filter,
                    dryRun: false,
                }),
            });

            const result = await response.json();
            setApplyRulesResult(result);

            if (result.executed > 0) {
                // Show success message
                console.log(`[ApplyRules] Executed ${result.executed} actions`);
            }
        } catch (error) {
            console.error('[ApplyRules] Error:', error);
            setApplyRulesResult({ error: 'Failed to apply rules' });
        } finally {
            setIsApplyingRules(false);
        }
    };

    // Load persisted settings on mount
    useEffect(() => {
        if (!agentId) return;
        fetch(`/api/standalone-agents/gmail-classifier/config?agentId=${agentId}`)
            .then(res => res.json())
            .then(data => {
                if (data.config) {
                    if (data.config.autoCreateJiraTasks !== undefined) setAutoCreateJiraTasks(data.config.autoCreateJiraTasks);
                    if (data.config.jiraProjectKey) setJiraProjectKey(data.config.jiraProjectKey);
                }
            })
            .catch(console.error);
    }, [agentId]);

    // Manual action state
    const [isCreatingJiraTask, setIsCreatingJiraTask] = useState(false);
    const [isNotionDialogOpen, setIsNotionDialogOpen] = useState(false);
    const [notionInitialData, setNotionInitialData] = useState({ title: "", content: "" });
    const [isDrafting, setIsDrafting] = useState(false);

    // Smart Drafter Handler
    const handleAutoDraft = async (type: "quick" | "full" | "decline" | "positive") => {
        if (!activeEmail) return;
        setIsDrafting(true);
        try {
            let instruction = "";
            switch (type) {
                case "quick": instruction = "Write a short, polite acknowledgement confirming receipt."; break;
                case "full": instruction = "Write a comprehensive professional reply addressing the key points."; break;
                case "decline": instruction = "Politely decline the request or offer."; break;
                case "positive": instruction = "Reply positively and enthusiastically."; break;
            }

            const res = await fetch("/api/email-agent/draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // Required for production auth
                body: JSON.stringify({
                    emailId: activeEmail.id,
                    instruction,
                    agentId: agentId
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to draft");

            toast.success("Draft created in Gmail!", {
                action: {
                    label: "Open Gmail",
                    onClick: () => window.open(`https://mail.google.com/mail/u/0/#drafts/${data.draft.id || ""}`, "_blank"),
                },
            });
        } catch (error: any) {
            toast.error("Drafting failed: " + error.message);
        } finally {
            setIsDrafting(false);
        }
    };

    // Auto-sync state (1-minute polling)
    const [isAutoSyncing, setIsAutoSyncing] = useState(false);
    const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
    const autoSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastSyncTimeRef = useRef<string | null>(null);

    // Advanced filter and sort state
    const [advancedFilters, setAdvancedFilters] = useState<FilterState>(defaultFilters);
    const [sortConfig, setSortConfig] = useState<SortState>(defaultSort);

    // Filter emails by category first, then filters, then paginate
    const filteredEmails = useMemo(() => {
        let filtered = emails;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.subject?.toLowerCase().includes(query) ||
                e.from?.toLowerCase().includes(query) ||
                e.snippet?.toLowerCase().includes(query)
            );
        }

        // Filter by category
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(e => e.category.toLowerCase() === selectedCategory);
        }

        // Filter by unread
        if (showUnreadOnly) {
            filtered = filtered.filter(e => !e.isRead);
        }

        // Filter by starred (assume passed in labels or priority='high' for now if not label)
        if (showStarredOnly) {
            filtered = filtered.filter(e =>
                e.labels.includes('STARRED') ||
                e.priority === 'urgent' ||
                e.priority === 'high' ||
                e.category === 'important'
            );
        }

        // Advanced filter: Priority
        if (advancedFilters.priorities.length > 0) {
            filtered = filtered.filter(e => advancedFilters.priorities.includes(e.priority));
        }

        // Advanced filter: Senders
        if (advancedFilters.senders.length > 0) {
            filtered = filtered.filter(e => {
                const sender = e.from?.replace(/<.*>/, "").trim() || e.from;
                return advancedFilters.senders.includes(sender);
            });
        }

        // Advanced filter: Date Range
        if (advancedFilters.dateRange !== "all") {
            const now = new Date();
            let cutoff = new Date();
            if (advancedFilters.dateRange === "today") {
                cutoff.setHours(0, 0, 0, 0);
            } else if (advancedFilters.dateRange === "week") {
                cutoff.setDate(now.getDate() - 7);
            } else if (advancedFilters.dateRange === "month") {
                cutoff.setMonth(now.getMonth() - 1);
            }
            filtered = filtered.filter(e => new Date(e.date) >= cutoff);
        }

        // Advanced filter: Read Status
        if (advancedFilters.readStatus === "unread") {
            filtered = filtered.filter(e => !e.isRead);
        } else if (advancedFilters.readStatus === "read") {
            filtered = filtered.filter(e => e.isRead);
        }

        // Apply sort
        filtered = [...filtered].sort((a, b) => {
            let comparison = 0;
            if (sortConfig.field === "date") {
                comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            } else if (sortConfig.field === "priority") {
                const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
                comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            } else if (sortConfig.field === "sender") {
                comparison = (a.from || "").localeCompare(b.from || "");
            }
            return sortConfig.direction === "asc" ? -comparison : comparison;
        });

        return filtered;
    }, [emails, searchQuery, selectedCategory, showUnreadOnly, showStarredOnly, advancedFilters, sortConfig]);

    // Calculate category counts for tabs
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: emails.length };
        emails.forEach(email => {
            const cat = email.category.toLowerCase();
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [emails]);

    // Calculate paginated emails from filtered list
    const paginatedEmails = useMemo(() => {
        const startIndex = (currentPage - 1) * EMAILS_PER_PAGE;
        const endIndex = startIndex + EMAILS_PER_PAGE;
        return filteredEmails.slice(startIndex, endIndex);
    }, [filteredEmails, currentPage]);

    // Priority emails (Action Required / High Priority) - shown at top
    const priorityEmails = useMemo(() => {
        if (selectedCategory !== 'all') return []; // Don't show priority section when filtering
        return emails
            .filter(e => e.category === 'requires_action' || e.priority === 'high' || e.priority === 'urgent')
            .slice(0, 3); // Limit to top 3
    }, [emails, selectedCategory]);

    const totalPages = Math.ceil(filteredEmails.length / EMAILS_PER_PAGE);
    const startItem = filteredEmails.length > 0 ? (currentPage - 1) * EMAILS_PER_PAGE + 1 : 0;
    const endItem = Math.min(currentPage * EMAILS_PER_PAGE, filteredEmails.length);

    // Load cached emails from DB (instant, no API call to Gmail)
    const loadCachedEmails = async () => {
        if (!isConnected) return;

        setIsLoading(emails.length === 0);

        try {
            const response = await fetch(`/api/standalone-agents/gmail-classifier/get-emails?agentId=${agentId}`);

            if (response.ok) {
                const data = await response.json();
                const cachedEmails = (data.emails || []).map((e: any) => ({
                    ...e,
                    category: e.category || 'other',
                    priority: e.priority || 'medium',
                    confidence: e.confidence || 0.85,
                    isRead: e.isRead ?? false,
                    body: e.body || e.snippet // Fallback to snippet if body missing
                }));
                setEmails(cachedEmails);
                setLastSync(data.lastSync);
                setStats(data.stats);

                // Load sync preferences if available
                if (data.syncPreferences) {
                    setSyncPreferences(data.syncPreferences);
                }

                if (cachedEmails.length > 0) {
                    console.log(`Loaded ${cachedEmails.length} cached emails`);
                }
            }
        } catch (error) {
            console.error("Failed to load cached emails:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Sync emails from Gmail API (updates cache)
    // freshSync=true will clear existing cache and replace with new emails
    const syncEmails = async (prefs: SyncPreferences, freshSync: boolean = false) => {
        if (!isConnected) return;

        setIsRefreshing(true);
        setIsSyncing(true);

        try {
            // Build query with date range
            const dateQuery = dateRangeToQuery(prefs.dateRange);

            const response = await fetch(`/api/standalone-agents/gmail-classifier/fetch-emails`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    agentId,
                    count: prefs.emailCount,
                    query: dateQuery || undefined,
                    freshSync, // Clear cache and start fresh if true
                    autoCreateJiraTasks,
                    jiraProjectKey,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const fetchedEmails = (data.emails || []).map((e: any) => ({
                    ...e,
                    category: e.category || 'other',
                    priority: e.priority || 'medium',
                    confidence: e.confidence || 0.85,
                    isRead: e.isRead ?? false,
                    body: e.body || e.snippet,
                    attachments: e.attachments || [], // Ensure attachments are included
                }));

                // Log attachment stats for debugging
                const totalAttachments = fetchedEmails.reduce((acc: number, e: any) => acc + (e.attachments?.length || 0), 0);
                console.log(`[Sync] Fetched ${fetchedEmails.length} emails with ${totalAttachments} total attachments`);

                setEmails(fetchedEmails);
                setStats(data.stats);
                setLastSync(new Date().toISOString());
                setCurrentPage(1); // Reset to first page after sync

                // Show appropriate toast based on new emails
                const newCount = data.stats?.newInLastSync || 0;
                if (newCount > 0) {
                    toast.success(`Found ${newCount} new emails!`);
                } else {
                    toast.success(`Inbox up to date (${fetchedEmails.length} emails)`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Sync failed:", response.status, errorData);
                toast.error(`Failed to sync: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
            console.error("Failed to sync emails:", error);
            toast.error("Connection error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsRefreshing(false);
            setIsSyncing(false);
            setShowSyncModal(false);
        }
    };

    // Handle sync with preferences (save to DB and sync)
    // This is called from the modal - always do a fresh sync to clear old cache
    const handleSyncWithPreferences = async (prefs: SyncPreferences) => {
        // Save preferences to DB
        try {
            await fetch(`/api/standalone-agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: { syncPreferences: prefs }
                }),
            });
            setSyncPreferences(prefs);
        } catch (error) {
            console.error("Failed to save preferences:", error);
        }

        // Then sync with freshSync=true to clear old cache and start fresh
        await syncEmails(prefs, true);
    };

    // Create Jira task manually from email
    const createManualJiraTask = async (email: Email) => {
        if (!isJiraConnected) {
            toast.error("Please connect Jira first in Settings");
            return;
        }

        if (!jiraProjectKey) {
            toast.error("Please select a Jira project in Settings → Automation");
            setSettingsOpen(true);
            return;
        }

        setIsCreatingJiraTask(true);

        try {
            const response = await fetch('/api/standalone-agents/gmail-classifier/create-jira-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agentId,
                    email: {
                        id: email.id,
                        subject: email.subject,
                        from: email.from,
                        snippet: email.snippet || email.body?.substring(0, 200),
                        date: email.date,
                        category: email.category,
                        priority: email.priority,
                    },
                    projectKey: jiraProjectKey,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(
                    <div className="flex items-center gap-2">
                        <span>Jira task created: <strong>{data.issueKey}</strong></span>
                        {data.issueUrl && (
                            <a href={data.issueUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                                Open
                            </a>
                        )}
                    </div>
                );
            } else {
                const error = await response.json();
                toast.error(error.error || "Failed to create Jira task");
            }
        } catch (err) {
            toast.error("Failed to create Jira task");
            console.error(err);
        } finally {
            setIsCreatingJiraTask(false);
        }
    };

    // Load cached emails on mount, then optionally sync
    useEffect(() => {
        if (isConnected) {
            loadCachedEmails();
        }
    }, [isConnected, agentId]);

    // Auto-sync timer - runs at the interval specified in syncPreferences
    useEffect(() => {
        // Clear any existing timer
        if (autoSyncIntervalRef.current) {
            clearInterval(autoSyncIntervalRef.current);
            autoSyncIntervalRef.current = null;
        }

        // Start new timer if auto-sync is enabled (interval > 0)
        if (syncPreferences?.autoSyncInterval && syncPreferences.autoSyncInterval > 0 && isConnected) {
            const intervalMs = syncPreferences.autoSyncInterval * 60 * 1000; // Convert minutes to milliseconds

            console.log(`[AutoSync] Starting timer: every ${syncPreferences.autoSyncInterval} minutes`);

            autoSyncIntervalRef.current = setInterval(() => {
                console.log('[AutoSync] Running scheduled sync...');
                setIsAutoSyncing(true);
                syncEmails(syncPreferences, false).finally(() => {
                    setIsAutoSyncing(false);
                });
            }, intervalMs);
        }

        // Cleanup on unmount or when dependencies change
        return () => {
            if (autoSyncIntervalRef.current) {
                clearInterval(autoSyncIntervalRef.current);
                autoSyncIntervalRef.current = null;
            }
        };
    }, [syncPreferences?.autoSyncInterval, isConnected]);

    // Handle refresh button click
    const handleRefresh = () => {
        if (syncPreferences) {
            // Use saved preferences with freshSync=true to always get fresh data
            syncEmails(syncPreferences, true);
        } else {
            // Show preferences modal for first sync
            setShowSyncModal(true);
        }
    };

    const handleClassifyAll = () => {
        toast.info("Classifying inbox...");
        if (syncPreferences) {
            syncEmails(syncPreferences, true);
        } else {
            setShowSyncModal(true);
        }
    };

    const toggleEmailSelection = (id: string) => {
        const newSelected = new Set(selectedEmails);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedEmails(newSelected);
    };

    const selectAll = () => {
        if (selectedEmails.size === emails.length) {
            setSelectedEmails(new Set());
        } else {
            setSelectedEmails(new Set(emails.map(e => e.id)));
        }
    };

    // Not Connected State
    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in fade-in duration-500 bg-background">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-[32px] rounded-full transition-all duration-1000" />
                    <div className="relative bg-card border border-border p-8 rounded-3xl shadow-2xl">
                        <Mail className="w-16 h-16 text-primary" />
                    </div>
                </div>

                <div className="max-w-md space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                        Connect Your Gmail
                    </h1>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                        Let Spinabot analyze and organize your inbox.
                        Connect your account to get started with intelligent email classification.
                    </p>
                </div>

                <Button
                    size="lg"
                    onClick={onConnect}
                    className="h-12 px-8 text-base shadow-lg"
                >
                    <Shield className="w-4 h-4 mr-2" />
                    Connect Securely
                </Button>
            </div>
        );
    }

    // Connected Dashboard - Theme Adaptive
    return (
        <div className="flex h-full w-full overflow-hidden bg-background text-foreground isolate">

            {/* Sidebar */}
            <aside
                className={cn(
                    "flex-shrink-0 border-r border-border bg-muted/10 flex flex-col transition-all duration-300 z-50",
                    sidebarCollapsed
                        ? "hidden md:flex md:w-16"
                        : "absolute inset-y-0 left-0 w-64 shadow-2xl md:static md:w-56 md:shadow-none bg-background md:bg-muted/10"
                )}
            >
                {/* Sidebar Header - Back to Setup */}
                <div className="p-3 flex items-center justify-between border-b border-border/50">
                    {!sidebarCollapsed && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onOpenSettings}
                            className="gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-sm">Back to Setup</span>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            const newCollapsed = !sidebarCollapsed;
                            setSidebarCollapsed(newCollapsed);
                            // If sidebar is being expanded, close chat panel
                            if (!newCollapsed && isChatPanelOpen) {
                                setIsChatPanelOpen(false);
                                setChatContext(null);
                            }
                        }}
                        className={cn("text-muted-foreground hover:text-foreground h-8 w-8", sidebarCollapsed && "mx-auto")}
                    >
                        <ChevronLeft className={cn("w-4 h-4 transition-transform", sidebarCollapsed && "rotate-180")} />
                    </Button>
                </div>

                {/* Main Navigation */}
                <nav className="py-3 px-2 space-y-1">
                    {[
                        { id: 'inbox', label: 'Inbox', icon: Inbox, count: emails.length },
                        { id: 'attachments', label: 'Attachments', icon: Paperclip, count: emails.filter(e => e.attachments && e.attachments.length > 0).reduce((acc, e) => acc + (e.attachments?.length || 0), 0) },
                        { id: 'spam', label: 'Spam Rescue', icon: Shield, count: 0 },
                        { id: 'history', label: 'History', icon: History, count: 0 },
                        { id: 'analytics', label: 'Analytics', icon: Activity, count: 0 },
                        { id: 'settings', label: 'Settings', icon: Settings, count: 0 },
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedFolder(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                                selectedFolder === item.id
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4 flex-shrink-0", selectedFolder === item.id && "text-primary")} />
                            {!sidebarCollapsed && (
                                <>
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {item.count > 0 && (
                                        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-medium">
                                            {item.count}
                                        </Badge>
                                    )}
                                </>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Categories / Labels Section */}
                {!sidebarCollapsed && (
                    <div className="px-2 py-3 border-t border-border/50">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                            Categories
                        </h3>
                        <div className="space-y-0.5">
                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                                const count = categoryCounts[key] || 0;
                                if (count === 0) return null;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                                        className={cn(
                                            "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-all",
                                            selectedCategory === key
                                                ? config.bgClass
                                                : "text-muted-foreground hover:bg-accent/50"
                                        )}
                                    >
                                        <config.Icon className="w-4 h-4" />
                                        <span className="flex-1 text-left truncate">{config.label}</span>
                                        <Badge variant="secondary" className="h-4 px-1 text-[10px] font-medium bg-background/50">
                                            {count}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Collapsed Categories - Icons only */}
                {sidebarCollapsed && (
                    <div className="px-2 py-3 border-t border-border/50 space-y-1">
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                            const count = categoryCounts[key] || 0;
                            if (count === 0) return null;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
                                    className={cn(
                                        "w-full flex items-center justify-center py-2 text-lg rounded-md transition-all",
                                        selectedCategory === key
                                            ? config.bgClass
                                            : "hover:bg-accent/50"
                                    )}
                                    title={`${config.label} (${count})`}
                                >
                                    <config.Icon className="w-5 h-5" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </aside>

            {/* Main Content - Fixed Layout Split View */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">

                {/* SHARED HEADER - Spans full width above both panes */}
                <header className="flex-shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex items-center gap-4 flex-shrink-0">
                        {/* Connected Tools - Logo Row */}
                        <div className="flex items-center gap-2">
                            {/* Gmail - Always Primary */}
                            <div className={cn("relative group flex items-center justify-center w-8 h-8 rounded-full border transition-all",
                                isConnected ? "bg-white border-emerald-200 shadow-sm" : "bg-muted border-transparent opacity-50 grayscale")}>
                                <Image src="/logos/gmail.svg" alt="Gmail" width={18} height={18} className="w-4.5 h-4.5" />
                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full transition-transform scale-0 group-hover:scale-100" />
                            </div>

                            {/* Divider if other integrations exist */}
                            {(isSlackConnected || isJiraConnected || isNotionConnected) && (
                                <div className="h-4 w-[1px] bg-border mx-1" />
                            )}

                            {/* Slack */}
                            {isSlackConnected && (
                                <div className="relative group flex items-center justify-center w-8 h-8 rounded-full bg-white border border-emerald-200 shadow-sm" title="Slack Connected">
                                    <Image src="/logos/slack.svg" alt="Slack" width={18} height={18} className="w-4.5 h-4.5" />
                                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full transition-transform scale-0 group-hover:scale-100" />
                                </div>
                            )}

                            {/* Jira */}
                            {isJiraConnected && (
                                <div className="relative group flex items-center justify-center w-8 h-8 rounded-full bg-white border border-emerald-200 shadow-sm" title="Jira Connected">
                                    <Image src="/logos/jira.svg" alt="Jira" width={18} height={18} className="w-4.5 h-4.5" />
                                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full transition-transform scale-0 group-hover:scale-100" />
                                </div>
                            )}

                            {/* Notion */}
                            {isNotionConnected && (
                                <div className="relative group flex items-center justify-center w-8 h-8 rounded-full bg-white border border-emerald-200 shadow-sm" title="Notion Connected">
                                    <Image src="/logos/notion.svg" alt="Notion" width={18} height={18} className="w-4.5 h-4.5" />
                                    <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-background rounded-full transition-transform scale-0 group-hover:scale-100" />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:hidden">
                            <Button variant="ghost" size="icon" onClick={() => setSidebarCollapsed(false)}>
                                <Menu className="w-5 h-5" />
                            </Button>
                            <span className="font-bold">SPINaBOT</span>
                        </div>
                    </div>

                    <div className="flex-1 max-w-md px-2 hidden md:block">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search emails..." className="pl-9 h-9 bg-background/50 focus:bg-background transition-colors" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

                        <Button
                            variant={isChatPanelOpen ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                                const willOpen = !isChatPanelOpen;
                                setIsChatPanelOpen(willOpen);
                                if (willOpen) setSidebarCollapsed(true);
                            }}
                            className={cn("gap-2 h-9", isChatPanelOpen && "bg-primary text-primary-foreground")}
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden lg:inline">Assistant</span>
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Settings">
                            <Settings className="w-4 h-4" />
                        </Button>

                        <Avatar className="h-8 w-8 border ring-1 ring-border cursor-pointer transition-opacity hover:opacity-80" onClick={() => setSettingsOpen(true)}>
                            {/* Show fetched profile picture in header too */}
                            {(agentConfig as any)?.gmailProfilePicture ? (
                                <AvatarImage src={(agentConfig as any).gmailProfilePicture} alt="Profile" />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {((agentConfig as any)?.gmailProfileName?.[0] || userEmail?.[0])?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                {/* SHARED TOOLBAR - Controls + Categories */}
                <div className="flex-shrink-0 px-4 py-2 border-b border-border flex items-center justify-between bg-background/50 backdrop-blur">
                    <div className="flex items-center gap-2">

                        <Button variant="ghost" size="sm" onClick={handleRefresh} className={cn("gap-2 h-8", isRefreshing && "animate-pulse")} title="Sync Emails">
                            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowSyncModal(true)} className="h-8 w-8" title="Sync Preferences">
                            <Settings className="w-4 h-4" />
                        </Button>

                        <div className="hidden md:flex items-center gap-2 ml-2 overflow-x-auto no-scrollbar">
                            {CATEGORY_TABS.map(tab => {
                                const isActive = selectedCategory === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setSelectedCategory(tab.id); setCurrentPage(1); }}
                                        className={cn("flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border transition-all",
                                            isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"
                                        )}
                                    >
                                        {tab.label} {categoryCounts[tab.id] > 0 && <span className="opacity-75 ml-1">({categoryCounts[tab.id]})</span>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md border border-border/50">
                            {filteredEmails.length > 0 ? `${startItem}-${endItem} of ${filteredEmails.length}` : '0'}
                        </span>
                        <Button variant="ghost" size="icon" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="h-7 w-7"><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="h-7 w-7"><ChevronRight className="w-4 h-4" /></Button>
                        <div className="border-l border-border pl-2 flex items-center gap-1">
                            <Button
                                variant={isReadingPaneOpen ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2 h-7 px-2"
                                onClick={() => setIsReadingPaneOpen(!isReadingPaneOpen)}
                                title={isReadingPaneOpen ? "Close Reading Pane" : "Open Reading Pane"}
                            >
                                <PanelRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters Bar */}
                <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-muted/20">
                    <FilterToolbar
                        emails={emails}
                        filters={advancedFilters}
                        sort={sortConfig}
                        onFiltersChange={setAdvancedFilters}
                        onSortChange={setSortConfig}
                        onClearFilters={() => setAdvancedFilters(defaultFilters)}
                    />
                </div>

                {/* SPLIT VIEW - Email List + Reading Pane (same level) */}
                <div className="flex-1 flex overflow-hidden">
                    {selectedFolder === 'settings' ? (
                        <div className="flex-1 flex flex-col bg-muted/10 animate-in fade-in duration-300">
                            {/* Settings Header */}
                            <div className="flex-shrink-0 px-8 py-6 border-b border-border bg-background/50">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">Settings</h2>
                                <p className="text-muted-foreground text-sm mt-1">Manage your integrations and automation rules.</p>
                            </div>

                            {/* Settings Content - Better Layout */}
                            <div className="flex-1 flex flex-col gap-6 p-6 overflow-auto">
                                {/* Top Row: Account + Integrations (side by side) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
                                    {/* Account Card (Now includes Gmail) */}
                                    <div className="rounded-xl border border-border bg-card p-4">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5" />
                                                Account
                                            </div>
                                            {/* Gmail Connection Status Badge in Header */}
                                            {isConnected && (
                                                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/20">
                                                    <Image src="/logos/gmail.svg" alt="Gmail" width={12} height={12} className="w-3 h-3" />
                                                    Connected
                                                </div>
                                            )}
                                        </h3>

                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-border">
                                                {/* Prioritize Gmail Profile Picture if connected */}
                                                {(agentConfig as any)?.gmailProfilePicture ? (
                                                    <AvatarImage src={(agentConfig as any).gmailProfilePicture} alt="Profile" />
                                                ) : null}
                                                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground font-medium text-sm">
                                                    {/* Use Gmail Name Initial if available, else User Email Initial */}
                                                    {((agentConfig as any)?.gmailProfileName?.[0] || userEmail?.[0])?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                {/* Show Gmail Name if available */}
                                                <p className="font-medium text-sm text-foreground truncate">
                                                    {(agentConfig as any)?.gmailProfileName || userEmail?.split('@')[0]}
                                                </p>
                                                {/* Show Gmail Email if connected, else User Email */}
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {(agentConfig as any)?.gmailEmail || userEmail}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs hover:bg-red-500/10 hover:text-red-500"
                                                onClick={isConnected ? onDisconnectGmail : handleSignOut}
                                                title={isConnected ? "Disconnect Gmail" : "Sign Out"}
                                            >
                                                <LogOut className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Integrations Card (Gmail removed, Slack added) */}
                                    <div className="rounded-xl border border-border bg-card p-4">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                                            Integrations
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            {/* Slack (Moved here) */}
                                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 flex-1">
                                                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shrink-0">
                                                    <Image src="/logos/slack.svg" alt="Slack" width={18} height={18} className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium">Slack</p>
                                                </div>
                                                {isSlackConnected ? (
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={onConnectSlack}>Connect</Button>
                                                )}
                                            </div>

                                            {/* Jira */}
                                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 flex-1">
                                                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shrink-0">
                                                    <Image src="/logos/jira.svg" alt="Jira" width={18} height={18} className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium">Jira</p>
                                                </div>
                                                {isJiraConnected ? (
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={onConnectJira}>Connect</Button>
                                                )}
                                            </div>

                                            {/* Notion */}
                                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 flex-1">
                                                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center shrink-0">
                                                    <Image src="/logos/notion.svg" alt="Notion" width={18} height={18} className="w-4.5 h-4.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium">Notion</p>
                                                </div>
                                                {isNotionConnected ? (
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                                ) : (
                                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={onConnectNotion}>Connect</Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>


                                </div>

                                {/* Bottom Row: Automation Rules + Knowledge Base (side by side, equal height) */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                                    {/* Automation Rules - Left */}
                                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col overflow-hidden">
                                        <AutomationRulesManager
                                            agentId={agentId}
                                            isJiraConnected={isJiraConnected}
                                            isNotionConnected={isNotionConnected}
                                            jiraProjectKey={jiraProjectKey}
                                            onConnectJira={onConnectJira}
                                            onConnectNotion={onConnectNotion}
                                        />
                                    </div>

                                    {/* Knowledge Base - Right */}
                                    <div className="rounded-xl border border-border bg-card p-4 flex flex-col overflow-hidden">
                                        <KnowledgeBaseSettings />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : selectedFolder === 'history' ? (
                        <div className="flex-1 flex flex-col bg-muted/10 animate-in fade-in duration-300">
                            {/* History Header */}
                            <div className="flex-shrink-0 px-8 py-6 border-b border-border bg-background/50">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">Activity History</h2>
                                <p className="text-muted-foreground text-sm mt-1">Track all automated actions, connections, and changes.</p>
                            </div>

                            {/* Activity History Content */}
                            <ActivityHistory agentId={agentId} className="flex-1" />
                        </div>
                    ) : selectedFolder === 'attachments' ? (
                        <AttachmentsView
                            emails={emails}
                            onSelectEmail={(emailId) => {
                                setSelectedFolder('inbox');
                                setActiveEmailId(emailId);
                                setIsReadingPaneOpen(true);
                            }}
                            className="animate-in fade-in duration-300"
                        />
                    ) : selectedFolder === 'spam' ? (
                        <div className="flex-1 flex flex-col bg-muted/10 animate-in fade-in duration-300">
                            <SpamRescueView
                                agentId={agentId}
                                className="flex-1"
                                onEmailSelect={(emailId) => {
                                    setSelectedFolder('inbox');
                                    setActiveEmailId(emailId);
                                    setIsReadingPaneOpen(true);
                                }}
                            />
                        </div>
                    ) : selectedFolder === 'analytics' ? (
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-muted/10">
                            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Inbox Analytics</h2>
                                    <p className="text-muted-foreground text-lg">Insights and health metrics for your email communications.</p>
                                </div>
                                <AnalyticsWidget emails={emails} className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* EMAIL LIST PANE */}
                            <div className={cn(
                                "flex flex-col border-r border-border bg-background flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden",
                                isReadingPaneOpen ? "hidden md:flex w-full md:w-[380px] lg:w-[420px] resize-x" : "w-full flex"
                            )}>

                                {/* Scrollable Email List */}
                                <div className="flex-1 overflow-y-auto min-h-0">
                                    {isLoading ? (
                                        <div className="p-4 space-y-4">
                                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-muted/40 rounded-lg animate-pulse" />)}
                                        </div>
                                    ) : emails.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                            <Inbox className="w-10 h-10 opacity-20 mb-2" />
                                            <span className="text-sm">No emails found</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Action Now - Smart Priority Cards */}
                                            {selectedFolder === 'inbox' && selectedCategory === 'all' && (
                                                <ActionNowSection
                                                    emails={emails}
                                                    onSelectEmail={(id) => {
                                                        setActiveEmailId(id);
                                                        setIsReadingPaneOpen(true);
                                                    }}
                                                />
                                            )}

                                            {/* Priority Section */}
                                            {priorityEmails.length > 0 && (
                                                <div className="border-b border-border/40 bg-red-50/30 dark:bg-zinc-900/50">
                                                    <div className="px-4 py-2 flex items-center gap-2 text-red-600 dark:text-red-400/80">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-semibold uppercase tracking-wide opacity-90">Requires Attention ({priorityEmails.length})</span>
                                                    </div>
                                                    <div className="divide-y divide-border/20">
                                                        {priorityEmails.map((email) => {
                                                            const senderInfo = getSenderInfo(email.from);
                                                            const isActive = activeEmailId === email.id;
                                                            return (
                                                                <div
                                                                    key={`priority-${email.id}`}
                                                                    onClick={() => { setActiveEmailId(email.id); setIsReadingPaneOpen(true); }}
                                                                    className={cn(
                                                                        "px-4 py-2 cursor-pointer transition-all hover:bg-muted/30 dark:hover:bg-red-900/10 border-l-2",
                                                                        isActive
                                                                            ? "bg-muted/50 dark:bg-zinc-800/50 border-l-red-500"
                                                                            : "border-l-transparent border-l-red-500/30 hover:border-l-red-500/50"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                            <Avatar className="h-5 w-5 shrink-0 text-[9px]">
                                                                                <AvatarFallback className="bg-red-500/80 text-white">{senderInfo.initials}</AvatarFallback>
                                                                            </Avatar>
                                                                            <span className="text-[13px] font-semibold text-foreground/90 truncate">{senderInfo.name}</span>
                                                                        </div>
                                                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[9px] h-4 border-0">Action</Badge>
                                                                    </div>
                                                                    <h4 className="text-[13px] font-medium text-foreground/80 truncate mt-0.5">{email.subject}</h4>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Regular Email List */}
                                            <div className="divide-y divide-border/30">
                                                {paginatedEmails.map((email) => {
                                                    const isSelected = selectedEmails.has(email.id);
                                                    const isActive = activeEmailId === email.id;
                                                    const senderInfo = getSenderInfo(email.from);
                                                    const isUrgent = email.category === 'requires_action' || email.priority === 'high';

                                                    return (
                                                        <div
                                                            key={email.id}
                                                            onClick={() => {
                                                                setActiveEmailId(email.id);
                                                                setIsReadingPaneOpen(true);
                                                            }}
                                                            className={cn(
                                                                "group relative px-3 py-2 cursor-pointer transition-all border-l-2 border-b border-border/50",
                                                                "hover:bg-muted/50 dark:hover:bg-gradient-to-r dark:hover:from-zinc-900 dark:hover:to-neutral-900",
                                                                isActive ? "bg-primary/5 dark:bg-gradient-to-r dark:from-zinc-900 dark:to-neutral-900 border-l-primary" : "border-l-transparent",
                                                                isUrgent && !isActive && "border-l-red-500",
                                                                !email.isRead && !isActive && "bg-muted/20 dark:bg-zinc-900/30"
                                                            )}
                                                        >
                                                            {/* Row 1: Sender + Date */}
                                                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                    {/* Smart Score - HIDDEN in list view per request */}

                                                                    <Avatar className="h-5 w-5 shrink-0 text-[9px]">
                                                                        {/* Use grayscale for non-urgent items, colors for urgent */}
                                                                        <AvatarFallback className={cn(
                                                                            isUrgent ? senderInfo.color + " text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                                                        )}>
                                                                            {senderInfo.initials}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className={cn("text-[13px] truncate", !email.isRead ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                                                                        {senderInfo.name}
                                                                    </span>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                                                                    {new Date(email.date).toLocaleDateString() === new Date().toLocaleDateString()
                                                                        ? new Date(email.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                        : new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>

                                                            {/* Row 2: Subject + Badge */}
                                                            <div className="flex items-center gap-2">
                                                                <h4 className={cn("text-[13px] truncate flex-1", !email.isRead ? "font-semibold text-foreground" : "text-foreground/80")}>
                                                                    {email.subject}
                                                                </h4>
                                                                <Badge className={cn("text-[10px] px-1.5 h-5 min-w-[20px] shrink-0 font-medium flex items-center justify-center", getCategoryStyle(email.category))}>
                                                                    {/* Only show icon, no text label */}
                                                                    {email.category === 'promotional' && <Tag className="w-3 h-3" />}
                                                                    {email.category === 'updates' && <RefreshCw className="w-3 h-3" />}
                                                                    {email.category === 'newsletters' && <Newspaper className="w-3 h-3" />}
                                                                    {email.category === 'requires_action' && <AlertCircle className="w-3 h-3" />}
                                                                    {!['promotional', 'updates', 'newsletters', 'requires_action'].includes(email.category) && <Mail className="w-3 h-3" />}
                                                                </Badge>
                                                            </div>

                                                            {/* Hover Actions */}
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all bg-background/90 rounded-md p-1 shadow-sm">
                                                                <button onClick={(e) => { e.stopPropagation(); toggleEmailSelection(email.id); }} className="p-1 hover:bg-muted rounded">
                                                                    {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5 text-muted-foreground" />}
                                                                </button>
                                                                <button className="p-1 hover:bg-muted rounded"><Star className="w-3.5 h-3.5 text-muted-foreground hover:text-yellow-500" /></button>
                                                                <button className="p-1 hover:bg-muted rounded"><Archive className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* READING PANE: Flex-1 fills remaining space */}
                            {isReadingPaneOpen && (
                                <div className={cn(
                                    "flex-1 flex-col bg-background min-w-0 h-full border-l border-border/50",
                                    "flex animate-in fade-in duration-300 slide-in-from-right-4 md:animate-none md:slide-in-from-right-0"
                                )}>
                                    {activeEmail ? (
                                        <div className="flex flex-col h-full animate-in fade-in duration-300">
                                            {/* Reading Pane Toolbar */}
                                            <div className="flex-shrink-0 h-[60px] border-b border-border flex items-center justify-between px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => setActiveEmailId(null)} className="md:hidden"><ChevronLeft className="w-4 h-4" /></Button>
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Button variant="ghost" size="icon"><Archive className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon"><AlertCircle className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    {/* Chat with Agent Button */}
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="gap-1.5 h-8 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                                        onClick={() => {
                                                            if (activeEmail) {
                                                                setChatContext({
                                                                    id: activeEmail.id,
                                                                    subject: activeEmail.subject,
                                                                    content: activeEmail.body || activeEmail.snippet,
                                                                    from: activeEmail.from
                                                                });
                                                                setIsChatPanelOpen(true);
                                                                setSidebarCollapsed(true); // Collapse sidebar when chat opens
                                                            }
                                                        }}
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                        Chat
                                                    </Button>

                                                    {/* Action Dropdown - Create Task */}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5 h-8 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                                                                disabled={isCreatingJiraTask}
                                                            >
                                                                {isCreatingJiraTask ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <Plus className="w-3.5 h-3.5" />
                                                                )}
                                                                Create
                                                                <ChevronDown className="w-3 h-3 opacity-50" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                                Actions
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />

                                                            {/* Jira Task */}
                                                            <DropdownMenuItem
                                                                disabled={!isJiraConnected}
                                                                onClick={() => activeEmail && createManualJiraTask(activeEmail)}
                                                            >
                                                                <Image src="/logos/jira.svg" alt="Jira" width={14} height={14} className="mr-2 grayscale-0" />
                                                                <span>Create Issue</span>
                                                                {!isJiraConnected && <span className="ml-auto text-[10px] text-muted-foreground">(Connect)</span>}
                                                            </DropdownMenuItem>

                                                            {/* Notion Page */}
                                                            <DropdownMenuItem
                                                                disabled={!isNotionConnected}
                                                                onClick={() => {
                                                                    if (activeEmail) {
                                                                        setNotionInitialData({
                                                                            title: activeEmail.subject || "No Subject",
                                                                            content: activeEmail.snippet || "", // Could fetch full body if available, snippet is safe for now
                                                                        });
                                                                        setIsNotionDialogOpen(true);
                                                                    }
                                                                }}
                                                            >
                                                                <Image src="/logos/notion.svg" alt="Notion" width={14} height={14} className="mr-2 grayscale-0" />
                                                                <span>Create Page</span>
                                                                {!isNotionConnected && <span className="ml-auto text-[10px] text-muted-foreground">(Connect)</span>}
                                                            </DropdownMenuItem>

                                                            {/* Slack Message */}
                                                            <DropdownMenuItem
                                                                disabled={!isSlackConnected}
                                                                onClick={() => toast.info("Send Slack Message coming soon")}
                                                            >
                                                                <Image src="/logos/slack.svg" alt="Slack" width={14} height={14} className="mr-2 grayscale-0" />
                                                                <span>Send Message</span>
                                                                {!isSlackConnected && <span className="ml-auto text-[10px] text-muted-foreground">(Connect)</span>}
                                                            </DropdownMenuItem>

                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => setSettingsOpen(true)} className="gap-2 text-xs">
                                                                <Settings className="w-3.5 h-3.5" />
                                                                Manage Integrations
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button variant="ghost" size="icon" onClick={() => { setIsReadingPaneOpen(false); setActiveEmailId(null); }} title="Close Preview"><X className="w-5 h-5 text-muted-foreground/70 hover:text-foreground" /></Button>
                                                    <Button variant="ghost" size="icon"><Star className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon"><MessageSquare className="w-4 h-4" /></Button>
                                                </div>
                                            </div>

                                            {/* Email Content */}
                                            <div className="flex-1 overflow-y-auto p-8">
                                                <div className="max-w-3xl mx-auto">
                                                    <h1 className="text-2xl font-bold text-foreground mb-6 leading-tigher">{activeEmail.subject}</h1>

                                                    <div className="flex items-start justify-between mb-8 pb-6 border-b border-border">
                                                        <div className="flex items-center gap-4">
                                                            <Avatar className="h-12 w-12">
                                                                <AvatarFallback className={cn("text-white text-lg", getSenderInfo(activeEmail.from).color)}>{getSenderInfo(activeEmail.from).initials}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-semibold text-foreground text-lg">{getSenderInfo(activeEmail.from).name}</div>
                                                                <div className="text-muted-foreground text-sm">{activeEmail.from}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right text-sm text-muted-foreground flex flex-col items-end gap-1">
                                                            <div>{new Date(activeEmail.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                            <div className="flex items-center gap-2">
                                                                <div>{new Date(activeEmail.date).toLocaleTimeString()}</div>
                                                                {/* Smart Score Badge - Shown in Preview */}
                                                                {(activeEmail as any).smartScore && (activeEmail as any).smartScore >= 50 && (
                                                                    <SmartScoreBadge
                                                                        score={(activeEmail as any).smartScore}
                                                                        level={(activeEmail as any).smartLevel || 'medium'}
                                                                        size="small"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="prose prose-slate dark:prose-invert max-w-none">
                                                        <div className="whitespace-pre-wrap leading-relaxed text-foreground/90 font-light text-base">
                                                            {activeEmail.body || activeEmail.snippet}
                                                        </div>

                                                        {!activeEmail.body && (
                                                            <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border/50 text-sm text-muted-foreground italic">
                                                                Note: This is a preview. Only the snippet was fetched. Connect to Gmail API to load full content.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-12 pt-6 border-t border-border flex flex-col gap-4">
                                                        {/* Smart Reply Options */}
                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            <div className="w-full text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                                                <Sparkles className="w-3 h-3 text-primary" />
                                                                AI Suggested Actions:
                                                            </div>
                                                            <Button
                                                                variant="outline" size="sm"
                                                                onClick={() => handleAutoDraft("positive")}
                                                                disabled={isDrafting}
                                                                className="h-8 text-xs gap-1.5 border-emerald-200 hover:bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                                            >
                                                                {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : "👍 Yes / Positive"}
                                                            </Button>
                                                            <Button
                                                                variant="outline" size="sm"
                                                                onClick={() => handleAutoDraft("decline")}
                                                                disabled={isDrafting}
                                                                className="h-8 text-xs gap-1.5 border-red-200 hover:bg-red-50 text-red-700 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                                                            >
                                                                {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : "👎 No / Decline"}
                                                            </Button>
                                                            <Button
                                                                variant="outline" size="sm"
                                                                onClick={() => handleAutoDraft("quick")}
                                                                disabled={isDrafting}
                                                                className="h-8 text-xs gap-1.5"
                                                            >
                                                                {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : "⚡️ Quick Ack"}
                                                            </Button>
                                                            <Button
                                                                variant="secondary" size="sm"
                                                                onClick={() => handleAutoDraft("full")}
                                                                disabled={isDrafting}
                                                                className="h-8 text-xs gap-1.5 ml-auto"
                                                            >
                                                                {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3" /> Draft Full Reply</>}
                                                            </Button>
                                                        </div>

                                                        <div className="flex gap-4">
                                                            <Button className="min-w-[120px]"><Send className="w-4 h-4 mr-2" /> Reply</Button>
                                                            <Button variant="outline">Forward</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/5">
                                            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center shadow-sm mb-6">
                                                <Mail className="w-10 h-10 opacity-20" />
                                            </div>
                                            <h3 className="text-lg font-medium text-foreground mb-2">Select an email to read</h3>
                                            <p className="max-w-xs text-center leading-relaxed opacity-70">
                                                Choose an email from the list to view its contents, reply, or manage it.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Settings Panel */}
            <SettingsPanel
                isOpen={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                agentId={agentId}
                userEmail={userEmail}
                isGmailConnected={isConnected}
                isSlackConnected={isSlackConnected}
                isJiraConnected={isJiraConnected}
                isNotionConnected={isNotionConnected}
                onConnectSlack={onConnectSlack}
                onConnectJira={onConnectJira}
                onConnectNotion={onConnectNotion}
                onDisconnectJira={onDisconnectJira}
                onDisconnectGmail={onDisconnectGmail}
                onDisconnectNotion={onDisconnectNotion}
                onDisconnectSlack={onDisconnectSlack}
                onSignOut={handleSignOut}
                onRefreshIntegrations={() => toast.info("Refreshing integrations...")}
                autoCreateJiraTasks={autoCreateJiraTasks}
                onAutoCreateJiraTasksChange={async (enabled) => {
                    setAutoCreateJiraTasks(enabled);
                    try {
                        await fetch("/api/standalone-agents/gmail-classifier/config", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ agentId, autoCreateJiraTasks: enabled })
                        });
                        toast.success(enabled ? "Automation enabled & saved" : "Automation disabled");
                    } catch (e) {
                        toast.error("Failed to save settings");
                    }
                }}
                jiraProjectKey={jiraProjectKey}
                onJiraProjectKeyChange={async (key) => {
                    setJiraProjectKey(key);
                    try {
                        await fetch("/api/standalone-agents/gmail-classifier/config", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ agentId, jiraProjectKey: key })
                        });
                    } catch (e) {
                        toast.error("Failed to save project");
                    }
                }}
            />

            {/* Sync Preferences Modal */}
            <SyncPreferencesModal
                isOpen={showSyncModal}
                onClose={() => setShowSyncModal(false)}
                onConfirm={handleSavePreferences}
                isLoading={isSavingPreferences}
                initialPreferences={syncPreferences || undefined}
            />

            {/* Notion Page Dialog */}
            <NotionPageDialog
                open={isNotionDialogOpen}
                onOpenChange={setIsNotionDialogOpen}
                agentId={agentId}
                initialTitle={notionInitialData.title}
                initialContent={notionInitialData.content}
            />

            {/* AI Email Agent Side Panel */}
            <ChatSidePanel
                agentId={agentId}
                isOpen={isChatPanelOpen}
                onClose={() => {
                    setIsChatPanelOpen(false);
                    setChatContext(null);
                }}
                onEmailSelect={(emailId) => {
                    setActiveEmailId(emailId);
                    setIsReadingPaneOpen(true);
                }}
                isGmailConnected={isConnected}
                isJiraConnected={isJiraConnected}
                activeContext={chatContext}
            />
        </div >
    );
}
