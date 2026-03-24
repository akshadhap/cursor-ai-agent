/**
 * Automation Rules Manager
 * UI component for managing automation rules in Settings
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Plus,
    Trash2,
    Zap,
    ChevronRight,
    Settings2,
    Loader2,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AutomationRule, RuleField, RuleOperator, RuleActionType } from "@/lib/automation/types";
import { toast } from "sonner";

interface AutomationRulesManagerProps {
    agentId: string;
    isJiraConnected: boolean;
    isNotionConnected: boolean;
    jiraProjectKey?: string;
    onConnectJira?: () => void;
    onConnectNotion?: () => void;
}

const FIELD_OPTIONS: { value: RuleField; label: string }[] = [
    { value: 'category', label: 'Category' },
    { value: 'subject', label: 'Subject' },
    { value: 'body', label: 'Email Body' },
    { value: 'sender', label: 'Sender' },
    { value: 'priority', label: 'Priority' },
];

const OPERATOR_OPTIONS: { value: RuleOperator; label: string }[] = [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
];

const CATEGORY_VALUES = [
    { value: 'requires_action', label: 'Action Required' },
    { value: 'important', label: 'Important' },
    { value: 'personal', label: 'Personal' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'updates', label: 'Updates' },
    { value: 'newsletters', label: 'Newsletters' },
    { value: 'promotional', label: 'Promotional' },
    { value: 'automated', label: 'Automated' },
];

export function AutomationRulesManager({
    agentId,
    isJiraConnected,
    isNotionConnected,
    jiraProjectKey,
    onConnectJira,
    onConnectNotion,
}: AutomationRulesManagerProps) {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // New rule form state
    const [newRule, setNewRule] = useState({
        name: '',
        conditionField: 'category' as RuleField,
        conditionOperator: 'equals' as RuleOperator,
        conditionValue: '',
        actionType: 'create_jira_task' as RuleActionType,
    });

    // Fetch rules on mount
    useEffect(() => {
        fetchRules();
    }, [agentId]);

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/standalone-agents/gmail-classifier/automation-rules?agentId=${agentId}`
            );
            if (response.ok) {
                const data = await response.json();
                setRules(data.rules || []);
            }
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRule = async (ruleId: string, enabled: boolean) => {
        try {
            const response = await fetch(
                `/api/standalone-agents/gmail-classifier/automation-rules`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agentId, ruleId, updates: { enabled } }),
                }
            );
            if (response.ok) {
                setRules(prev =>
                    prev.map(r => r.id === ruleId ? { ...r, enabled } : r)
                );
                toast.success(enabled ? 'Rule enabled' : 'Rule disabled');
            }
        } catch (error) {
            toast.error('Failed to update rule');
        }
    };

    const deleteRule = async (ruleId: string) => {
        try {
            const response = await fetch(
                `/api/standalone-agents/gmail-classifier/automation-rules?agentId=${agentId}&ruleId=${ruleId}`,
                { method: 'DELETE' }
            );
            if (response.ok) {
                setRules(prev => prev.filter(r => r.id !== ruleId));
                toast.success('Rule deleted');
            }
        } catch (error) {
            toast.error('Failed to delete rule');
        }
    };

    const createRule = async () => {
        if (!newRule.name || !newRule.conditionValue) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch(
                `/api/standalone-agents/gmail-classifier/automation-rules`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentId,
                        rule: {
                            name: newRule.name,
                            enabled: true,
                            conditions: [{
                                field: newRule.conditionField,
                                operator: newRule.conditionOperator,
                                value: newRule.conditionValue,
                            }],
                            conditionOperator: 'AND',
                            action: {
                                type: newRule.actionType,
                                config: {
                                    projectKey: jiraProjectKey,
                                    notifyUser: true,
                                },
                            },
                        },
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setRules(prev => [...prev, data.rule]);
                setShowCreateForm(false);
                setNewRule({
                    name: '',
                    conditionField: 'category',
                    conditionOperator: 'equals',
                    conditionValue: '',
                    actionType: 'create_jira_task',
                });
                toast.success('Rule created!');
            } else {
                toast.error('Failed to create rule');
            }
        } catch (error) {
            toast.error('Failed to create rule');
        } finally {
            setIsCreating(false);
        }
    };

    const getActionLabel = (type: RuleActionType) => {
        switch (type) {
            case 'create_jira_task': return 'Create Jira Task';
            case 'save_to_notion': return 'Save to Notion';
            default: return type;
        }
    };

    const getActionColor = (type: RuleActionType) => {
        switch (type) {
            case 'create_jira_task': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
            case 'save_to_notion': return 'bg-gray-500/10 text-gray-700 border-gray-500/30';
            default: return 'bg-muted';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Automation Rules
                </h4>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="gap-1 h-7 text-xs"
                >
                    <Plus className="w-3 h-3" />
                    New Rule
                </Button>
            </div>

            {/* Create Rule Form */}
            {showCreateForm && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                    <h5 className="font-medium text-sm">Create New Rule</h5>

                    {/* Rule Name */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Rule Name</label>
                        <input
                            type="text"
                            value={newRule.name}
                            onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Action emails to Jira"
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">IF email...</label>
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={newRule.conditionField}
                                onChange={(e) => setNewRule(prev => ({ ...prev, conditionField: e.target.value as RuleField }))}
                                className="px-3 py-2 text-sm bg-background border border-border rounded-lg"
                            >
                                {FIELD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <select
                                value={newRule.conditionOperator}
                                onChange={(e) => setNewRule(prev => ({ ...prev, conditionOperator: e.target.value as RuleOperator }))}
                                className="px-3 py-2 text-sm bg-background border border-border rounded-lg"
                            >
                                {OPERATOR_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {newRule.conditionField === 'category' ? (
                                <select
                                    value={newRule.conditionValue}
                                    onChange={(e) => setNewRule(prev => ({ ...prev, conditionValue: e.target.value }))}
                                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg"
                                >
                                    <option value="">Select category...</option>
                                    {CATEGORY_VALUES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={newRule.conditionValue}
                                    onChange={(e) => setNewRule(prev => ({ ...prev, conditionValue: e.target.value }))}
                                    placeholder="Enter value..."
                                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg"
                                />
                            )}
                        </div>
                    </div>

                    {/* Action */}
                    <div className="space-y-2">
                        <label className="text-xs text-muted-foreground">THEN...</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setNewRule(prev => ({ ...prev, actionType: 'create_jira_task' }))}
                                disabled={!isJiraConnected}
                                className={cn(
                                    "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                                    newRule.actionType === 'create_jira_task'
                                        ? "border-blue-500 bg-blue-500/10 text-blue-600"
                                        : "border-border hover:border-blue-500/50",
                                    !isJiraConnected && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                🎫 Create Jira Task
                                {!isJiraConnected && (
                                    <span className="block text-xs text-muted-foreground mt-1">Connect Jira first</span>
                                )}
                            </button>
                            <button
                                onClick={() => setNewRule(prev => ({ ...prev, actionType: 'save_to_notion' }))}
                                disabled={!isNotionConnected}
                                className={cn(
                                    "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                                    newRule.actionType === 'save_to_notion'
                                        ? "border-gray-500 bg-gray-500/10 text-gray-700"
                                        : "border-border hover:border-gray-500/50",
                                    !isNotionConnected && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                📝 Save to Notion
                                {!isNotionConnected && (
                                    <span className="block text-xs text-muted-foreground mt-1">Connect Notion first</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCreateForm(false)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={createRule}
                            disabled={isCreating || !newRule.name || !newRule.conditionValue}
                            className="flex-1 gap-2"
                        >
                            {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            Create Rule
                        </Button>
                    </div>
                </div>
            )}

            {/* Rules List */}
            {rules.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                    <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No automation rules yet</p>
                    <p className="text-xs mt-1">Create a rule to automatically process emails</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {rules.map((rule) => (
                        <div
                            key={rule.id}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                rule.enabled
                                    ? "bg-muted/50 border-border"
                                    : "bg-muted/20 border-dashed border-muted-foreground/30 opacity-60"
                            )}
                        >
                            <Switch
                                checked={rule.enabled}
                                onCheckedChange={(enabled) => toggleRule(rule.id, enabled)}
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-foreground truncate">{rule.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {rule.conditions.map(c => `${c.field} ${c.operator} "${c.value}"`).join(', ')}
                                </p>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px]", getActionColor(rule.action.type))}>
                                {getActionLabel(rule.action.type)}
                            </Badge>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteRule(rule.id)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            {rules.some(r => r.enabled) && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Rules run automatically when new emails are synced
                </p>
            )}
        </div>
    );
}
