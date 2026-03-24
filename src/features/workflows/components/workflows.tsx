"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import {
  useCreateWorkflow,
  useRemoveWorkflow,
  useSuspenseWorkflows,
  useExecuteWorkflow,
} from "../hooks/use-workflows";
import { useRouter } from "next/navigation";
import { useWorkflowsParams } from "../hooks/use-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import type { Workflow } from "@/generated/prisma";
import { WorkflowIcon, MoreVerticalIcon, TrashIcon, Maximize2 } from "lucide-react";
import { WorkflowPreview } from "./workflow-preview";
import type { Node, Edge } from "@xyflow/react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const WorkflowsSearch = () => {
  const [params, setParams] = useWorkflowsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search workflows"
    />
  );
};

export const WorkflowsList = () => {
  const workflows = useSuspenseWorkflows();

  if (workflows.data.items.length === 0) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="max-w-sm mx-auto">
          <WorkflowsEmpty />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {workflows.data.items.map((workflow) => (
        <WorkflowItem key={workflow.id} data={workflow} />
      ))}
    </div>
  );
};

export const WorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/workflows/${data.id}`);
      },
    });
  }

  return (
    <EntityHeader
      title="Workflows"
      description="Create and manage your workflows"
      onNew={handleCreate}
      newButtonLabel="New workflow"
      disabled={disabled}
      isCreating={createWorkflow.isPending}
    />
  );
};

export const WorkflowsPagination = () => {
  const workflows = useSuspenseWorkflows();
  const [params, setParams] = useWorkflowsParams();

  return (
    <EntityPagination
      disabled={workflows.isFetching}
      totalPages={workflows.data.totalPages}
      page={workflows.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const WorkflowsContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <EntityContainer
      header={<WorkflowsHeader />}
      search={<WorkflowsSearch />}
      pagination={<WorkflowsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const WorkflowsLoading = () => {
  return <LoadingView message="Loading workflows..." />;
};

export const WorkflowsError = () => {
  return <ErrorView message="Error loading workflows" />;
};

export const WorkflowsEmpty = () => {
  const router = useRouter();
  const createWorkflow = useCreateWorkflow();

  const handleCreate = () => {
    createWorkflow.mutate(undefined, {
      onSuccess: (data) => {
        router.push(`/workflows/${data.id}`);
      }
    });
  };

  return (
    <EmptyView
      onNew={handleCreate}
      message="You haven't created any workflows yet. Get started by creating your first workflow"
    />
  );
};

export const WorkflowItem = ({
  data,
}: {
  data: Workflow & { 
    flowNodes?: Node[]; 
    flowEdges?: Edge[];
  };
}) => {
  const router = useRouter();
  const removeWorkflow = useRemoveWorkflow();
  const executeWorkflow = useExecuteWorkflow();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fix hydration by only rendering time on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeWorkflow.mutate({ id: data.id });
  };

  const handleExecute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    executeWorkflow.mutate({ id: data.id });
  };

  const handleExpandPreview = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPreviewOpen(true);
  };

  const handleOpenWorkflow = () => {
    if (isRemoving) return;
    router.push(`/workflows/${data.id}`);
  };

  const nodes = data.flowNodes || [];
  const edges = data.flowEdges || [];
  const nodeCount = nodes.length;
  const isRemoving = removeWorkflow.isPending;

  return (
    <>
      <Card
        onClick={handleOpenWorkflow}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleOpenWorkflow();
        }}
        className={cn(
          "group overflow-hidden p-0 shadow-sm hover:shadow-xl transition-all duration-300 border border-border/40 hover:border-primary/60 h-full flex flex-col cursor-pointer",
          isRemoving && "opacity-60 pointer-events-none",
          "bg-card hover:bg-card/95 backdrop-blur-sm"
        )}
      >
        {/* Preview starts from absolute top - no padding */}
        <div className="relative h-[200px] overflow-hidden shrink-0 bg-muted/30">
          {nodes.length > 0 ? (
            <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-105">
              <WorkflowPreview nodes={nodes} edges={edges} className="h-full w-full" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm font-medium">
              Empty workflow
            </div>
          )}

          {/* Enhanced gradient overlay */}
          <div className="absolute inset-0 pointer-events-none bg-linear-to-t from-background/60 via-background/10 to-transparent" />

          {/* Node count badge with modern styling */}
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 shadow-lg border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background transition-colors pointer-events-auto"
              onClick={handleExpandPreview}
              aria-label="Expand preview"
            >
              <Maximize2 className="size-4" />
            </Button>
            <Badge
              variant="secondary"
              className="text-xs font-medium px-3 py-1.5 shadow-lg border border-border/50 bg-background/90 backdrop-blur-md"
            >
              {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
            </Badge>
          </div>
        </div>

        {/* Workflow Details with modern spacing */}
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <WorkflowIcon className="size-5 text-primary" />

              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-semibold truncate leading-tight text-foreground">
                  {data.name}
                </CardTitle>
              </div>
            </div>

            {/* Actions with better hover states */}
            <div className="flex gap-1 items-center shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Open workflow actions"
                  >
                    <MoreVerticalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem
                    onClick={handleRemove}
                    className="text-destructive focus:text-destructive"
                  >
                    <TrashIcon className="size-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-auto pt-3 space-y-1.5 border-t border-border/50">
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="font-medium">Updated</span>
              <span suppressHydrationWarning>
                {mounted ? formatDistanceToNow(data.updatedAt, { addSuffix: true }) : '...'}
              </span>
            </CardDescription>
            <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="font-medium">Created</span>
              <span suppressHydrationWarning>
                {mounted ? formatDistanceToNow(data.createdAt, { addSuffix: true }) : '...'}
              </span>
            </CardDescription>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent 
          className="max-w-7xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden"
          disableScrollWrapper={true}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
            <WorkflowIcon className="size-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">{data.name}</DialogTitle>
          </div>
          <div className="flex-1 overflow-hidden bg-muted/30">
            {nodes.length > 0 && isPreviewOpen ? (
              <WorkflowPreview
                key={`preview-${data.id}`}
                nodes={nodes}
                edges={edges}
                className="h-full w-full"
                interactive={true}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm font-medium">
                Empty workflow
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
