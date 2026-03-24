"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nodeComponents } from "@/config/node-components";
import { cn } from "@/lib/utils";

interface WorkflowPreviewProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
  interactive?: boolean;
}

export const WorkflowPreview = ({
  nodes,
  edges,
  className,
  interactive = false,
}: WorkflowPreviewProps) => {
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const fit = useCallback(() => {
    if (!instance) return;

    requestAnimationFrame(() => {
      instance.fitView({ padding: interactive ? 0.2 : 0.15, duration: 0 });
      requestAnimationFrame(() => {
        instance.fitView({ padding: interactive ? 0.2 : 0.15, duration: 0 });
      });
    });
  }, [instance, interactive]);

  useEffect(() => {
    fit();
  }, [fit, nodes.length, edges.length]);

  // Cleanup ReactFlow instance when unmounting or interactive changes
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      setInstance(null);
    };
  }, [interactive]);

  const handleInit = useCallback((rf: ReactFlowInstance) => {
    setInstance(rf);
    cleanupRef.current = () => {
      // Cleanup any event listeners or subscriptions
      rf.setNodes([]);
      rf.setEdges([]);
    };
  }, []);

  return (
    <div
      className={cn("relative bg-background/95 min-h-0", className)}
      style={{ width: "100%", height: "100%", overflow: "hidden" }}
    >
      {interactive ? (
        // Interactive mode for modal
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeComponents}
          onInit={handleInit}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable
          nodesConnectable={false}
          panOnDrag
          panOnScroll
          zoomOnScroll
          zoomOnPinch
          zoomOnDoubleClick={false}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <Background gap={40} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
      ) : (
        // Static card preview with CSS scaling
        <div className="absolute inset-0">
          <div
            style={{
              width: "400%",
              height: "400%",
              transform: "scale(0.25)",
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeComponents}
              onInit={handleInit}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              elementsSelectable={false}
              panOnDrag={false}
              panOnScroll={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              proOptions={{ hideAttribution: true }}
              style={{ pointerEvents: "none", width: "100%", height: "100%" }}
            >
              <Background gap={40} />
            </ReactFlow>
          </div>
        </div>
      )}
    </div>
  );
};
