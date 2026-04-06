// REPLACE ENTIRE FILE

"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const LeadPrioritizerDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lead Prioritizer</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This node will automatically prioritize all leads.
        </p>

      </DialogContent>
    </Dialog>
  );
};
