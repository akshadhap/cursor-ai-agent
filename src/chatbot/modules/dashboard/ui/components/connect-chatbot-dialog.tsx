"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { createScript } from "../../../integrations/utils";

interface ConnectChatbotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbot: {
    chatbotId?: string;
    _id: string;
    name: string;
  } | null;
  entityId: string;
}

export const ConnectChatbotDialog = ({
  open,
  onOpenChange,
  chatbot,
  entityId,
}: ConnectChatbotDialogProps) => {
  if (!chatbot || !entityId) return null;

  const chatbotId = chatbot.chatbotId || chatbot._id;

  const snippet = createScript("html", entityId, chatbotId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Embed code copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Connect {chatbot.name}</DialogTitle>
          <DialogDescription>
            Copy this code and paste it before the closing &lt;/body&gt; tag in
            your HTML
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="relative">
            <div className="overflow-x-auto rounded-lg bg-muted p-4 max-h-[400px] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap break-words">
                <code>{snippet}</code>
              </pre>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="absolute right-2 top-2 shadow-md"
              onClick={handleCopy}
            >
              <CopyIcon className="mr-2 h-4 w-4" />
              Copy
            </Button>
          </div>

          <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-4 text-sm">
            <p className="font-medium mb-2">💡 Quick tip:</p>
            <p className="text-muted-foreground">
              For other frameworks (React, Next.js) or to customize the widget
              position, visit the <span className="font-medium">Integrations</span>{" "}
              page from the sidebar.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
