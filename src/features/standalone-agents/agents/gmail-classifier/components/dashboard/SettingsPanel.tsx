"use client";

import { useState, useEffect } from "react";
import { X, Mail, MessageSquare, CheckCircle, ExternalLink, LogOut, ChevronRight, RefreshCw, AlertCircle, Zap, Settings2, Loader2, Brain, LayoutGrid, Plug } from "lucide-react";
import { KnowledgeBaseSettings } from "./KnowledgeBaseSettings";
import { AutomationRulesManager } from "./AutomationRulesManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface JiraProject {
    key: string;
    name: string;
    avatarUrl?: string;
    projectTypeKey?: string;
}

interface SettingsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    agentId?: string;
    userEmail?: string;
    userName?: string;
    isGmailConnected: boolean;
    isSlackConnected?: boolean;
    isJiraConnected?: boolean;
    isNotionConnected?: boolean;
    onConnectSlack?: () => void;
    onConnectJira?: () => void;
    onConnectNotion?: () => void;
    onDisconnectGmail?: () => void;
    onDisconnectJira?: () => void;
    onDisconnectNotion?: () => void;
    onDisconnectSlack?: () => void;
    onSignOut?: () => void;
    onRefreshIntegrations?: () => void;
    integrationsError?: boolean;
    // Automation settings
    autoCreateJiraTasks?: boolean;
    onAutoCreateJiraTasksChange?: (enabled: boolean) => void;
    jiraProjectKey?: string;
    onJiraProjectKeyChange?: (key: string) => void;
}

export function SettingsPanel({
    isOpen,
    onClose,
    agentId,
    userEmail,
    userName,
    isGmailConnected,
    isSlackConnected = false,
    isJiraConnected = false,
    isNotionConnected = false,
    onConnectSlack,
    onConnectJira,
    onConnectNotion,
    onDisconnectGmail,
    onDisconnectJira,
    onDisconnectNotion,
    onDisconnectSlack,
    onSignOut,
    onRefreshIntegrations,
    integrationsError = false,
    autoCreateJiraTasks = false,
    onAutoCreateJiraTasksChange,
    jiraProjectKey,
    onJiraProjectKeyChange,
}: SettingsPanelProps) {

    const displayName = userName || userEmail?.split('@')[0] || 'User';
    const [activeTab, setActiveTab] = useState<'general' | 'brain' | 'integrations'>('general');

    // Jira projects state
    const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [projectsError, setProjectsError] = useState<string | null>(null);

    // Fetch Jira projects when panel opens and Jira is connected
    useEffect(() => {
        if (isOpen && isJiraConnected && agentId && jiraProjects.length === 0) {
            fetchJiraProjects();
        }
    }, [isOpen, isJiraConnected, agentId]);

    const fetchJiraProjects = async () => {
        if (!agentId) return;

        setIsLoadingProjects(true);
        setProjectsError(null);

        try {
            const response = await fetch('/api/standalone-agents/gmail-classifier/jira-projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId }),
            });

            if (response.ok) {
                const data = await response.json();
                setJiraProjects(data.projects || []);
            } else {
                const error = await response.json();
                setProjectsError(error.error || 'Failed to load projects');
            }
        } catch (err) {
            setProjectsError('Failed to connect to Jira');
        } finally {
            setIsLoadingProjects(false);
        }
    };

    return (
        <>
            {/* Backdrop with blur */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Centered Modal */}
            <div
                className={cn(
                    "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[85vh] bg-card dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-2xl shadow-2xl z-[101] transition-all duration-300 ease-out flex flex-col overflow-hidden",
                    isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                )}
            >
                {/* Header */}
                <header className="flex items-center justify-between px-6 py-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="w-5 h-5" />
                    </Button>
                </header>


                {/* Tab Navigation */}
                <div className="flex items-center gap-1 p-2 mx-6 mt-4 bg-muted/30 rounded-lg border border-border">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                            activeTab === 'general' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" /> General
                    </button>
                    <button
                        onClick={() => setActiveTab('brain')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                            activeTab === 'brain' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                    >
                        <Brain className="w-3.5 h-3.5" /> Brain
                    </button>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                            activeTab === 'integrations' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                    >
                        <Plug className="w-3.5 h-3.5" /> Integrations
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'brain' && <KnowledgeBaseSettings />}

                    {activeTab === 'general' && (
                        <>
                            {/* User Profile */}
                            <div className="px-6 py-5 border-b border-border">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12 border-2 border-border">
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground text-lg font-medium">
                                            {displayName[0].toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-foreground truncate">{displayName}</p>
                                        <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Email Connection */}
                            <div className="px-6 py-5 border-b border-border">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                                    Email Connection
                                </h3>

                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border">
                                    <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center flex-shrink-0">
                                        <Image src="/logos/gmail.svg" alt="Gmail" width={24} height={24} className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-semibold text-foreground">Gmail</span>
                                            {isGmailConnected && (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Connected
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
                                    </div>
                                    {isGmailConnected && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={onDisconnectGmail}
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            title="Disconnect Gmail"
                                        >
                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                                            </svg>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'integrations' && (
                        <>


                            {/* Automation Settings */}
                            <div className="px-6 py-5 border-b border-border">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5" />
                                    Automation
                                </h3>

                                {/* Auto Jira Task Creation */}
                                <div className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    isJiraConnected
                                        ? "bg-muted/50 border-border"
                                        : "bg-muted/20 border-dashed border-muted-foreground/30"
                                )}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border bg-white",
                                                isJiraConnected ? "border-blue-100 dark:border-blue-900" : "border-border"
                                            )}>
                                                <Image src="/logos/jira.svg" alt="Jira" width={24} height={24} className={cn("w-6 h-6", !isJiraConnected && "grayscale opacity-50")} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-foreground text-sm">Auto-Create Jira Tasks</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Automatically create tasks for emails marked as "Action Required"
                                                </p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={autoCreateJiraTasks}
                                            onCheckedChange={onAutoCreateJiraTasksChange}
                                            disabled={!isJiraConnected}
                                        />
                                    </div>

                                    {!isJiraConnected && (
                                        <div className="mt-3 pt-3 border-t border-dashed border-muted-foreground/30">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={onConnectJira}
                                                className="w-full gap-2 text-xs"
                                            >
                                                Connect Jira to enable
                                                <ChevronRight className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    )}

                                    {isJiraConnected && autoCreateJiraTasks && (
                                        <div className="mt-3 pt-3 border-t border-border space-y-3">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-muted-foreground">Select Project</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={fetchJiraProjects}
                                                        disabled={isLoadingProjects}
                                                        className="h-5 w-5"
                                                    >
                                                        <RefreshCw className={cn("w-3 h-3", isLoadingProjects && "animate-spin")} />
                                                    </Button>
                                                </div>

                                                {isLoadingProjects ? (
                                                    <div className="flex items-center justify-center py-3 text-xs text-muted-foreground gap-2">
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        Loading projects...
                                                    </div>
                                                ) : projectsError ? (
                                                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                                                        {projectsError}
                                                    </div>
                                                ) : jiraProjects.length === 0 ? (
                                                    <div className="text-xs text-muted-foreground text-center py-2">
                                                        No projects found
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={jiraProjectKey || ""}
                                                        onChange={(e) => onJiraProjectKeyChange?.(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    >
                                                        <option value="">Choose a project...</option>
                                                        {jiraProjects.map((project) => (
                                                            <option key={project.key} value={project.key}>
                                                                {project.key} - {project.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}

                                                {jiraProjectKey && (
                                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                                        ✓ Tasks will be created in <strong>{jiraProjectKey}</strong>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Custom Automation Rules */}
                            <div className="px-6 py-5 border-b border-border">
                                <AutomationRulesManager
                                    agentId={agentId || ''}
                                    isJiraConnected={isJiraConnected}
                                    isNotionConnected={isNotionConnected}
                                    jiraProjectKey={jiraProjectKey}
                                    onConnectJira={onConnectJira}
                                    onConnectNotion={onConnectNotion}
                                />
                            </div>




                            {/* Tool Integrations */}
                            <div className="px-6 py-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Tool Integrations
                                    </h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onRefreshIntegrations}
                                        className="h-6 w-6"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </div>

                                {integrationsError && (
                                    <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        Failed to load tool connections
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <div className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                                        isSlackConnected
                                            ? "bg-muted/50 border-border"
                                            : "bg-muted/30 border-border hover:bg-muted/50"
                                    )}>
                                        <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center flex-shrink-0">
                                            <Image src="/logos/slack.svg" alt="Slack" width={24} height={24} className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-foreground">Slack</span>
                                                {isSlackConnected && (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Connected
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Send email notifications and updates to Slack channels
                                            </p>
                                        </div>
                                        {isSlackConnected ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={onDisconnectSlack}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                title="Disconnect Slack"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                                                </svg>
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="link"
                                                onClick={onConnectSlack}
                                                className="text-primary gap-1 p-0 h-auto font-medium"
                                            >
                                                Connect
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Jira */}
                                    <div className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                                        isJiraConnected
                                            ? "bg-muted/50 border-border"
                                            : "bg-muted/30 border-border hover:bg-muted/50"
                                    )}>
                                        <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center flex-shrink-0">
                                            <Image src="/logos/jira.svg" alt="Jira" width={24} height={24} className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-foreground">Jira</span>
                                                {isJiraConnected && (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Connected
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Create tasks and tickets from emails automatically
                                            </p>
                                        </div>
                                        {isJiraConnected ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={onDisconnectJira}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                title="Disconnect Jira"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                                                </svg>
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="link"
                                                onClick={onConnectJira}
                                                className="text-primary gap-1 p-0 h-auto font-medium"
                                            >
                                                Connect
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>

                                    {/* Notion */}
                                    <div className={cn(
                                        "flex items-center gap-4 p-4 rounded-xl border transition-colors",
                                        isNotionConnected
                                            ? "bg-muted/50 border-border"
                                            : "bg-muted/30 border-border hover:bg-muted/50"
                                    )}>
                                        <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center flex-shrink-0">
                                            <Image src="/logos/notion.svg" alt="Notion" width={24} height={24} className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-foreground">Notion</span>
                                                {isNotionConnected && (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Connected
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Save emails and create pages in Notion
                                            </p>
                                        </div>
                                        {isNotionConnected ? (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={onDisconnectNotion}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                title="Disconnect Notion"
                                            >
                                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
                                                </svg>
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="link"
                                                onClick={onConnectNotion}
                                                className="text-primary gap-1 p-0 h-auto font-medium"
                                            >
                                                Connect
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* View All Integrations */}
                                <Button
                                    variant="outline"
                                    className="w-full mt-4 gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View all integrations
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border">
                    <Button
                        variant="ghost"
                        onClick={onSignOut}
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </div>
        </>
    );
}

