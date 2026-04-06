// src/features/executions/components/agent/agent-execution-node.tsx
"use client";

import { memo, useState, useMemo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { useReactFlow, Position } from "@xyflow/react";
import { BotIcon } from "lucide-react";

import { AgentType } from "@/generated/prisma";
import type { NodeStatus } from "@/components/react-flow/node-status-indicator";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import { NodeStatusIndicator } from "@/components/react-flow/node-status-indicator";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";

// Channels
import { LEAD_INGESTION_CHANNEL_NAME } from "@/inngest/channels/lead-ingestion";
import { LEAD_QUALIFIER_CHANNEL_NAME } from "@/inngest/channels/lead-qualifier";
import { LEAD_PRIORITIZER_CHANNEL_NAME } from "@/inngest/channels/lead-prioritizer";
import { LEAD_OUTREACH_CHANNEL_NAME } from "@/inngest/channels/lead-outreach";
import { LEAD_FOLLOWUPS_CHANNEL_NAME } from "@/inngest/channels/lead-followups";

// Actions (tokens)
import { fetchLeadIngestionRealtimeToken } from "./ingestion/actions";
import { fetchLeadQualifierRealtimeToken } from "./qualifier/actions";
import { fetchLeadPrioritizerRealtimeToken } from "./prioritizer/actions";
import { fetchLeadOutreachRealtimeToken } from "./outreach/actions";
import { fetchLeadFollowupsRealtimeToken } from "./followups/actions";

// Dialogs
import { LeadIngestionDialog } from "./ingestion/dialog";
import { LeadQualifierDialog } from "./qualifier/dialog";
import { LeadPrioritizerDialog } from "./prioritizer/dialog";
import { LeadOutreachDialog } from "./outreach/dialog";
import { LeadFollowupsDialog } from "./followups/dialog";
import { AgentNodeWrapper } from "@/components/agent-node";

export type AgentExecutionNodeData = {
  label?: string;
  description?: string;
  agentType?: AgentType | null;
  status?: NodeStatus;          // legacy / fallback, not used for realtime
  config?: Record<string, any>;
};

type AgentExecutionNodeType = Node<AgentExecutionNodeData>;

export const AgentExecutionNode = memo(
  (props: NodeProps<AgentExecutionNodeType>) => {
    const { id, data } = props;
    const { setNodes, setEdges } = useReactFlow();
    const [dialogOpen, setDialogOpen] = useState(false);

    const name = data.label?.trim() || "AI Agent";
    const description =
      data.description || "Executes automated lead-processing logic.";

    //
    // 1) Map agentType -> channel + token fetcher
    //
    const { channel, refreshToken } = useMemo(() => {
      switch (data.agentType) {
        case AgentType.LEAD_INGESTION:
          return {
            channel: LEAD_INGESTION_CHANNEL_NAME,
            refreshToken: fetchLeadIngestionRealtimeToken,
          };
        case AgentType.LEAD_QUALIFIER:
          return {
            channel: LEAD_QUALIFIER_CHANNEL_NAME,
            refreshToken: fetchLeadQualifierRealtimeToken,
          };
        case AgentType.LEAD_PRIORITIZER:
          return {
            channel: LEAD_PRIORITIZER_CHANNEL_NAME,
            refreshToken: fetchLeadPrioritizerRealtimeToken,
          };
        case AgentType.LEAD_COLD_OUTREACH:
          return {
            channel: LEAD_OUTREACH_CHANNEL_NAME,
            refreshToken: fetchLeadOutreachRealtimeToken,
          };
        case AgentType.LEAD_FOLLOWUP:
          return {
            channel: LEAD_FOLLOWUPS_CHANNEL_NAME,
            refreshToken: fetchLeadFollowupsRealtimeToken,
          };
        default:
          // Fallback config – shouldn't happen in practice, but keeps hooks stable
          return {
            channel: LEAD_INGESTION_CHANNEL_NAME,
            refreshToken: fetchLeadIngestionRealtimeToken,
          };
      }
    }, [data.agentType]);

    //
    // 2) Live status from Inngest → drives spinner animation
    //
    const liveStatus: NodeStatus = useNodeStatus({
      nodeId: id,
      channel,
      topic: "status",
      refreshToken,
    });

    //
    // 3) Delete + settings handlers
    //
    const handleDelete = () => {
      setNodes((currentNodes) =>
        currentNodes.filter((node) => node.id !== id),
      );
      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) => edge.source !== id && edge.target !== id,
        ),
      );
    };

    const handleOpenSettings = () => setDialogOpen(true);

    const updateConfig = (newConfig: any) => {
      setNodes((nodes) =>
        nodes.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  config: newConfig,
                },
              }
            : n,
        ),
      );
      setDialogOpen(false);
    };

    //
    // 4) Pick the right dialog for this agent
    //
    let DialogComponent: any = null;

    switch (data.agentType) {
      case AgentType.LEAD_INGESTION:
        DialogComponent = LeadIngestionDialog;
        break;
      case AgentType.LEAD_QUALIFIER:
        DialogComponent = LeadQualifierDialog;
        break;
      case AgentType.LEAD_PRIORITIZER:
        DialogComponent = LeadPrioritizerDialog;
        break;
      case AgentType.LEAD_COLD_OUTREACH:
        DialogComponent = LeadOutreachDialog;
        break;
      case AgentType.LEAD_FOLLOWUP:
        DialogComponent = LeadFollowupsDialog;
        break;
      default:
        DialogComponent = null;
    }

    return (
      <>
        {DialogComponent && (
          <DialogComponent
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            defaultValues={data.config ?? {}}
            onSubmit={updateConfig}
          />
        )}

        {/* This is the "inline BaseExecutionNode" logic */}
        <AgentNodeWrapper
          name={name}
          description={description}
          onDelete={handleDelete}
          onSettings={DialogComponent ? handleOpenSettings : undefined}
        >
          <NodeStatusIndicator status={liveStatus} variant="border">
            <BaseNode
              status={liveStatus}
              onDoubleClick={DialogComponent ? handleOpenSettings : undefined}
            >
              <BaseNodeContent>
                <BotIcon className="size-4 text-muted-foreground" />

                <div className="flex flex-col gap-1 text-xs min-w-[200px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[12px]">
                      {name}
                    </span>

                    {data.agentType && (
                      <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                        {String(data.agentType)
                          .toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Handles */}
                <BaseHandle
                  id="target-1"
                  type="target"
                  position={Position.Left}
                />
                <BaseHandle
                  id="source-1"
                  type="source"
                  position={Position.Right}
                />
              </BaseNodeContent>
            </BaseNode>
          </NodeStatusIndicator>
        </AgentNodeWrapper>
      </>
    );
  },
);

AgentExecutionNode.displayName = "AgentExecutionNode";
