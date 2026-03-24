"use client";

import { PlusIcon } from "lucide-react";
import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { NodeSelector } from "@/components/node-selector";

type AddNodeButtonProps = {
  isDeveloperMode: boolean;
};

export const AddNodeButton = memo(({ isDeveloperMode }: AddNodeButtonProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);

  return (
    <NodeSelector
      open={selectorOpen}
      onOpenChange={setSelectorOpen}
      isDeveloperMode={isDeveloperMode}   // 👈 pass it through
    >
      <Button
        onClick={() => setSelectorOpen(true)}
        size="icon"
        variant="outline"
        className="bg-background"
      >
        <PlusIcon />
      </Button>
    </NodeSelector>
  );
});

AddNodeButton.displayName = "AddNodeButton";
