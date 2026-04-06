/**
 * Activity History Tracking
 * Logs all automated actions: Jira tasks, Notion pages, rules, connections, etc.
 */

export type ActivityType =
    | 'connection'
    | 'disconnection'
    | 'jira_task'
    | 'notion_page'
    | 'rule_created'
    | 'rule_updated'
    | 'rule_deleted'
    | 'rule_executed'
    | 'knowledge_added'
    | 'knowledge_deleted'
    | 'email_sync'
    | 'email_classified'
    | 'automation';

export type ActivityStatus = 'success' | 'failed' | 'pending';

export interface ActivityLog {
    id: string;
    type: ActivityType;
    action: string;
    details: string;
    timestamp: string;
    status: ActivityStatus;
    metadata?: {
        emailId?: string;
        emailSubject?: string;
        ruleName?: string;
        tool?: 'gmail' | 'jira' | 'notion' | 'slack';
        taskKey?: string;
        pageId?: string;
        count?: number;
        [key: string]: any;
    };
}

/**
 * Generate a unique ID for activity logs
 */
export function generateActivityId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an activity log entry
 */
export function createActivityLog(
    type: ActivityType,
    action: string,
    details: string,
    status: ActivityStatus = 'success',
    metadata?: ActivityLog['metadata']
): ActivityLog {
    return {
        id: generateActivityId(),
        type,
        action,
        details,
        timestamp: new Date().toISOString(),
        status,
        metadata,
    };
}

/**
 * Get icon name for activity type
 */
export function getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
        connection: 'plug',
        disconnection: 'unplug',
        jira_task: 'clipboard-list',
        notion_page: 'file-text',
        rule_created: 'plus-circle',
        rule_updated: 'edit',
        rule_deleted: 'trash',
        rule_executed: 'play',
        knowledge_added: 'brain',
        knowledge_deleted: 'brain',
        email_sync: 'refresh-cw',
        email_classified: 'tag',
        automation: 'zap',
    };
    return icons[type] || 'activity';
}

/**
 * Get color for activity type
 */
export function getActivityColor(type: ActivityType): string {
    const colors: Record<ActivityType, string> = {
        connection: 'text-emerald-500',
        disconnection: 'text-orange-500',
        jira_task: 'text-blue-500',
        notion_page: 'text-gray-600 dark:text-gray-400',
        rule_created: 'text-green-500',
        rule_updated: 'text-yellow-500',
        rule_deleted: 'text-red-500',
        rule_executed: 'text-purple-500',
        knowledge_added: 'text-pink-500',
        knowledge_deleted: 'text-pink-500',
        email_sync: 'text-sky-500',
        email_classified: 'text-indigo-500',
        automation: 'text-amber-500',
    };
    return colors[type] || 'text-muted-foreground';
}

/**
 * Format activity for display
 */
export function formatActivityTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
