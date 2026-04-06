// src/features/executions/components/agent/followups/dialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type FollowupsFormValues = Record<string, never>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FollowupsFormValues) => void;
  defaultValues?: Partial<FollowupsFormValues>;
}

export const LeadFollowupsDialog = ({
  open,
  onOpenChange,
  onSubmit,
}: Props) => {
  const handleClose = () => {
    // nothing to configure – just signal "no-op" config
    onSubmit({} as FollowupsFormValues);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lead Followups</DialogTitle>
          <DialogDescription>
            This node automatically sends followup emails based on your configuration.
        
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>
                Uses senderEmail as the sender.
              </li>
            </ul>
            To change copy / delays, edit the template config (not this node).
          </DialogDescription>
        </DialogHeader>

      </DialogContent>
    </Dialog>
  );
};
