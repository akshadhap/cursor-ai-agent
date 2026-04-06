"use client";

import { ExecutionStatus } from "@/generated/prisma";
import { CheckCircle2Icon, ClockIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSuspenseExecution } from "@/features/executions/hooks/use-executions";
import { useTRPC } from "@/trpc/client";

const getStatusIcon = (status: ExecutionStatus) => {
  switch (status) {
    case ExecutionStatus.SUCCESS:
      return <CheckCircle2Icon className="size-5 text-green-600" />;
    case ExecutionStatus.FAILED:
      return <XCircleIcon className="size-5 text-red-600" />;
    case ExecutionStatus.RUNNING:
      return <Loader2Icon className="size-5 text-blue-600 animate-spin" />;
    default:
      return <ClockIcon className="size-5 text-muted-foreground" />;
  }
}

const formatStatus = (status: ExecutionStatus) => {
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export const ExecutionView = ({
  executionId
}: { 
  executionId: string
}) => {
  const { data: execution, refetch } = useSuspenseExecution(executionId);
  const [showStackTrace, setShowStackTrace] = useState(false);


  // Auto-refresh while execution is running to show real-time progress
  useEffect(() => {
    if (execution.status === ExecutionStatus.RUNNING) {
      const interval = setInterval(() => {
        refetch();
      }, 2000); // Refresh every 2 seconds

      return () => clearInterval(interval);
    }
  }, [execution.status, refetch]);

  const duration = execution.completedAt
    ? Math.round(
      (new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000,
    )
    : null;

  // Calculate total tokens
  const totalTokens = execution.executedNodes && Array.isArray(execution.executedNodes)
    ? (execution.executedNodes as Array<{tokens?: number}>).reduce((sum, node) => sum + (node.tokens || 0), 0)
    : 0;

  return (
    <Card className="w-full border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg border border-border/60 bg-muted/40">
              {getStatusIcon(execution.status)}
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">{formatStatus(execution.status)}</CardTitle>
              <CardDescription className="text-sm">
                Execution for {execution.workflowName || execution.workflow?.name || "Unknown Workflow"}
                {!execution.workflow && execution.workflowId === null && (
                  <span className="text-red-600 dark:text-red-400 font-medium"> (Deleted)</span>
                )}
              </CardDescription>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Started {formatDistanceToNow(execution.startedAt, { addSuffix: true })}
                </span>
                {execution.completedAt ? (
                  <span className="text-xs font-medium text-muted-foreground">
                    Completed {formatDistanceToNow(execution.completedAt, { addSuffix: true })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {duration !== null ? (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-border/60 bg-muted/60 text-muted-foreground">
                Duration {duration}s
              </span>
            ) : null}
            {totalTokens > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                {totalTokens.toLocaleString()} tokens
              </span>
            )}
            {execution.status === ExecutionStatus.RUNNING && (
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/60">
                <Loader2Icon className="size-3 animate-spin" />
                Live
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Workflow
            </p>
            {execution.workflow ? (
              <Link
                prefetch
                className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
                href={`/workflows/${execution.workflowId}`}
              >
                {execution.workflowName || execution.workflow.name}
              </Link>
            ) : (
              <div className="mt-2 inline-flex flex-col gap-1">
                <span className="text-sm font-medium">
                  {execution.workflowName || "Unknown Workflow"}
                </span>
                <span className="text-xs text-red-600 dark:text-red-400">
                  (Workflow Deleted)
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Started</p>
            <p className="mt-2 text-sm">{formatDistanceToNow(execution.startedAt, { addSuffix: true })}</p>
          </div>

          {execution.completedAt ? (
            <div className="rounded-lg border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
              <p className="mt-2 text-sm">{formatDistanceToNow(execution.completedAt, { addSuffix: true })}</p>
            </div>
          ) : null}

          <div className="rounded-lg border border-border/60 bg-card/50 p-4 sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event ID</p>
            <p className="mt-2 text-sm font-mono">{execution.inngestEventId}</p>
          </div>
        </div>
        {execution.error && (
          <div className="rounded-lg border border-red-200/70 bg-red-50/60 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-red-900 mb-2">
                Error
              </p>
              <p className="text-sm text-red-800 font-mono break-words">
                {execution.error}
              </p>
            </div>

            {execution.errorStack && (
              <Collapsible
                open={showStackTrace}
                onOpenChange={setShowStackTrace}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-900 hover:bg-red-100"
                  >
                    {showStackTrace
                      ? "Hide stack trace"
                      : "Show stack trace"
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="text-xs font-mono text-red-800 overflow-auto mt-2 p-3 rounded-md bg-red-100">
                    {execution.errorStack}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {execution.plannedNodes && Array.isArray(execution.plannedNodes) && execution.plannedNodes.length > 0 && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm font-semibold">Execution Plan</p>
                    <p className="text-xs text-muted-foreground">Step-by-step node progress</p>
                  
                  </div>
                  <div className="flex items-center gap-3">
                    {execution.status === ExecutionStatus.RUNNING && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/60">
                        <Loader2Icon className="size-3 animate-spin" />
                        Executing...
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                {(execution.plannedNodes as Array<{nodeId: string, nodeName: string, nodeType: string, agentType?: string}>).map((node, index) => {
                  // Find if this node has been executed
                  const executedNode = execution.executedNodes && Array.isArray(execution.executedNodes)
                    ? (execution.executedNodes as Array<{nodeId: string, nodeName: string, nodeType: string, agentType?: string, executedAt: string, tokens?: number}>)
                        .find((en) => en.nodeId === node.nodeId)
                    : null;
                  
                  const isExecuted = !!executedNode;
                  const tokens = executedNode?.tokens || 0;
                  const executedAt = executedNode?.executedAt;

                  return (
                    <div
                      key={node.nodeId}
                      className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isExecuted
                          ? "border-green-200 dark:border-green-900/50 bg-green-50/70 dark:bg-green-950/20"
                          : "border-border/60 bg-card/60 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex items-center justify-center size-9 rounded-full flex-shrink-0 border ${
                          isExecuted
                            ? "bg-green-100 dark:bg-green-950/50 border-green-200/70 dark:border-green-900/60"
                            : "bg-muted/70 border-border/60"
                        }`}>
                          {isExecuted ? (
                            <CheckCircle2Icon className="size-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <ClockIcon className="size-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
                              #{index + 1}
                            </span>
                            <span className={`text-sm font-medium truncate ${
                              isExecuted ? "text-foreground" : "text-muted-foreground"
                            }`}>
                              {node.nodeName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
  {node.nodeType === 'AGENT' && node.agentType && (
    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
      {node.agentType.replace('LEAD_', '').replace(/_/g, ' ')}
    </span>
  )}
</div>

                          {executedAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Executed at {new Date(executedAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isExecuted && tokens > 0 && (
                          <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                            {tokens.toLocaleString()} tokens
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            )}

            {execution.output && (
              <div>
                <p className="text-sm font-semibold mb-4">Output</p>
                <div className="p-4 bg-muted/70 border border-border/60 rounded-lg">
                  <pre className="text-xs font-mono overflow-auto max-h-[600px]">
                    {JSON.stringify(execution.output, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
      </CardContent>
    </Card>
  );
};
