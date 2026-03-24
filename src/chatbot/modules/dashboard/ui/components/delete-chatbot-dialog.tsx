"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "../../../../../../convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface Chatbot {
  _id: Id<"chatbots">;
  name: string;
  isDefault: boolean;
}

interface DeleteChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: Chatbot | null;
  entityId: string;
  isLastChatbot: boolean;
}

export const DeleteChatbotDialog = ({
  open,
  onOpenChange,
  chatbot,
  entityId,
  isLastChatbot,
}: DeleteChatbotDialogProps) => {
  const deleteChatbot = useMutation(api.private.chatbots.remove);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!chatbot) return;

    setIsDeleting(true);
    try {
      await deleteChatbot({
        chatbotId: chatbot._id,
        entityId,
      });

      toast.success("Chatbot deleted successfully");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete chatbot");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!chatbot) return null;

  const canDelete = !(chatbot.isDefault && isLastChatbot);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Chatbot</DialogTitle>
          <DialogDescription>
            {canDelete
              ? `Are you sure you want to delete "${chatbot.name}"? This action cannot be undone.`
              : "You cannot delete the last default chatbot. Create another chatbot first or make another chatbot the default."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
