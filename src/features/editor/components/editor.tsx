"use client";

import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
} from "@xyflow/react";
import { ErrorView, LoadingView } from "@/components/entity-components";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";

import "@xyflow/react/dist/style.css";
import { nodeComponents } from "@/config/node-components";
import { AddNodeButton } from "./add-node-button";
import { useAtom, useSetAtom } from "jotai";
import { editorAtom, stickyNotesAtom, type StickyNote } from "../store/atoms";

import { NodeType } from "@/generated/prisma";
import { ExecuteWorkflowButton } from "./execute-workflow-button";

import { Button } from "@/components/ui/button";
import { StickyNotesOverlay } from "./sticky-notes-overlay";
import { AiWorkflowGeneratorOverlay } from "./ai-workflow-generator-overlay";
import { aiGeneratorOpenAtom } from "../store/ai-generator-atoms";

import { X, StickyNote as StickyNoteIcon, Sparkles } from "lucide-react";



// ---------- Loading / Error ----------

export const EditorLoading = () => {
  return <LoadingView message="Loading editor..." />;
};

export const EditorError = () => {
  return <ErrorView message="Error loading editor" />;
};

// ---------- Main Editor ----------

export const Editor = ({
  workflowId,
  isDeveloperMode,
}: {
  workflowId: string;
  isDeveloperMode?: boolean;
}) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);

  const effectiveIsDeveloperMode =
    typeof isDeveloperMode === "boolean"
      ? isDeveloperMode
      : (workflow as any).isDeveloper ?? true;

  useEffect(() => {
    console.log("WF nodes", workflow.nodes);
    console.log("WF edges", workflow.edges);
    console.log("WF stickyNotes", (workflow as any).stickyNotes);
  }, [workflow]);

  const setEditor = useSetAtom(editorAtom);

  const [nodes, setNodes] = useState<Node[]>(workflow.nodes);
  const [edges, setEdges] = useState<Edge[]>(workflow.edges);

  // ⭐ Sync nodes/edges when workflow data changes (for real-time AI generation)
  useEffect(() => {
    console.log("🔄 Workflow data changed, updating canvas...");
    setNodes(workflow.nodes);
    setEdges(workflow.edges);
  }, [workflow.nodes, workflow.edges]);

  // ⭐ sticky notes – shared via jotai so header can access them
  const [stickyNotes, setStickyNotes] = useAtom(stickyNotesAtom);
  
  // ⭐ AI workflow generator
  const setAiGeneratorOpen = useSetAtom(aiGeneratorOpenAtom);


  const onNodesChange = useCallback(
    (changes: NodeChange[]) =>
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  const hasManualTrigger = useMemo(
    () => nodes.some((node) => node.type === NodeType.MANUAL_TRIGGER),
    [nodes],
  );

  const containerRef = useRef<HTMLDivElement | null>(null);

  // ✅ when workflow changes (i.e., open page / different workflow), load notes from DB
  useEffect(() => {
    const raw = (workflow as any).stickyNotes ?? [];
    if (!Array.isArray(raw)) {
      setStickyNotes([]);
      return;
    }

    // Filter out AI-generated sticky notes and action file metadata
    const userNotes = raw.filter((n: any) => !n.__aiGenerated && !n.__actionFile);
    const mapped: StickyNote[] = userNotes.map((n: any) => ({
      id: n.id ?? crypto.randomUUID(),
      x: typeof n.x === "number" ? n.x : 80,
      y: typeof n.y === "number" ? n.y : 80,
      width: typeof n.width === "number" ? n.width : 220,
      height: typeof n.height === "number" ? n.height : 120,
      text: typeof n.text === "string" ? n.text : "",
    }));

    setStickyNotes(mapped);
  }, [workflowId, workflow]);

  const handleAddStickyNote = () => {
    const container = containerRef.current;
    let x = 80;
    let y = 80;

    if (container) {
      const rect = container.getBoundingClientRect();
      x = rect.width / 2 - 110;
      y = 100;
    }

    setStickyNotes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        x,
        y,
        width: 220,
        height: 120,
        text: "",
      },
    ]);
  };


  return (
    <div ref={containerRef} className="size-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeComponents}
        onInit={setEditor}
        fitView
        snapGrid={[10, 10]}
        snapToGrid
        panOnScroll
        panOnDrag={false}
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap />

        <Panel position="top-right">
          <div className="flex flex-col items-end gap-2">
            <AddNodeButton isDeveloperMode={effectiveIsDeveloperMode} />

            <Button
              size="icon"
              variant="outline"
              className="bg-background"
              onClick={handleAddStickyNote}
              title="Add sticky note"
            >
              <StickyNoteIcon className="h-4 w-4" />
            </Button>
          
          </div>
        </Panel>
      
      <AiWorkflowGeneratorOverlay workflowId={workflowId} />


        {hasManualTrigger && (
          <Panel position="bottom-center">
            <ExecuteWorkflowButton workflowId={workflowId} />
          </Panel>
        )}
      </ReactFlow>

      <StickyNotesOverlay containerRef={containerRef} />

    </div>
  );
};
