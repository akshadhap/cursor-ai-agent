"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileCode, Download, Loader2 } from "lucide-react";
import { downloadActionFile, getGeneratedActionFile } from "../actions/get-action-file";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface DownloadActionFileButtonProps {
  workflowId: string;
}

export function DownloadActionFileButton({
  workflowId,
}: DownloadActionFileButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionFileContent, setActionFileContent] = useState<string | null>(null);

  const handleView = async () => {
    setIsLoading(true);
    try {
      const result = await getGeneratedActionFile(workflowId);
      
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setActionFileContent(result.actionFile);
      setIsDialogOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load action file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const { fileName, content } = await downloadActionFile(workflowId);
      
      // Create blob and download
      const blob = new Blob([content], { type: "text/typescript" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${fileName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download action file");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Action File</DialogTitle>
            <DialogDescription>
              TypeScript server action file for this workflow
            </DialogDescription>
          </DialogHeader>
          
          {actionFileContent && (
            <pre className="bg-zinc-950 text-zinc-50 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{actionFileContent}</code>
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
