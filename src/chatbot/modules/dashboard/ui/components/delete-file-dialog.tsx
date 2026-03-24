"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "../../../../../../convex/_generated/api";
import type { PublicFile } from "../../../../../../convex/private/files";

import { useQuery, useMutation } from "convex/react";
import { authClient } from "@/lib/auth-client";


interface DeleteFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PublicFile | null;
  onDeleted?: () => void;
};



export const DeleteFileDialog = ({
  open,
  onOpenChange,
  file,
  onDeleted,
}: DeleteFileDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteFile = useMutation(api.private.files.deleteFile);

// BetterAuth session
const { data: session } = authClient.useSession();
const currentEmail = session?.user?.email ?? null;

// Convex users to map BetterAuth user → orgId
const users = useQuery(api.users.getMany);
const currentConvexUser = users?.find((u) => u.email === currentEmail);
const entityId = currentConvexUser?.entityId ?? null;



const handleDelete = async () => {
  if (!file || !entityId) {
    return;
  }
  setIsDeleting(true);

  // Close immediately (like upload)
  onOpenChange(false);
  onDeleted?.();
  toast.success(`Deleting "${file.name}" in background...`);

  // Run deletion in background
  (async () => {
    try {
      await deleteFile({
        entryId: file.id,
        entityId,
      });
    } catch (error) {
      console.error(error);
      toast.error(
        `Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsDeleting(false);
    }
  })();
};



  return (
  <Dialog onOpenChange={onOpenChange} open={open}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          Delete File
        </DialogTitle>
        <DialogDescription>
          Are you sure you want to delete this file? This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      {file && ( 

        <div className="py-4">
        <div className="rounded-lg border bg-muted/50 p-4">
            <p className="font-medium">{file.name}</p>
            <p className="text-muted-foreground text-sm">
            Type: {file.type.toUpperCase()} | Size: {file.size}
            </p>
        </div>
        </div>



      )}


      <DialogFooter>
  <Button
    disabled={isDeleting}
    onClick={() => onOpenChange(false)}
    variant="outline"
  >
    Cancel
  </Button>
  <Button
    disabled={isDeleting || !file}
    onClick={handleDelete}
    variant="destructive"
  >
    {isDeleting ? "Deleting..." : "Delete"}
  </Button>
</DialogFooter>



    </DialogContent>
  </Dialog>
)












};

