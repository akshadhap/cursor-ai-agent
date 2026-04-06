"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { SettingsIcon, TrashIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

interface AgentNodeWrapperProps {
  children: ReactNode;
  onDelete?: () => void;
  onSettings?: () => void;
  name?: string;
  description?: string;
}

export function AgentNodeWrapper({
  children,
  onDelete,
  onSettings,
  name,
  description,
}: AgentNodeWrapperProps) {
  return (
    <>
      {/* Toolbar (Top) */}
      <NodeToolbar>
        <Button size="sm" variant="ghost" onClick={onSettings}>
          <SettingsIcon className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <TrashIcon className="size-4" />
        </Button>
      </NodeToolbar>

      {/* Node Content */}
      {children}

      {/* Bottom label */}
      <NodeToolbar
        position={Position.Bottom}
        isVisible
        className="max-w-[200px] text-center"
      >
    
        {description && (
          <p className="text-muted-foreground truncate text-sm font-medium">
            {description}
          </p>
        )}
      </NodeToolbar>
    </>
  );
}
