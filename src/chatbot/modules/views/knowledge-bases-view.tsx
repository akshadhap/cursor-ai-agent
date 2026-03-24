"use client";

import { useState } from "react";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon, TrashIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import { FilesView } from "./files-view";

export const KnowledgeBasesView = () => {
  /* ---------------- AUTH ---------------- */
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // Get entityId from Convex users table (BetterAuth → Convex mapping)
  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId;

  /* ---------------- DATA ---------------- */
  const knowledgeBases = usePaginatedQuery(
    api.private.knowledgeBases.list,
    entityId ? { entityId } : "skip",
    { initialNumItems: 10 }
  );

  /* ---------------- STATE ---------------- */
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [kbListDialogOpen, setKbListDialogOpen] = useState(false);
  const [selectedKB, setSelectedKB] = useState<any | null>(null);

  const createKB = useMutation(api.private.knowledgeBases.create);
  const updateKB = useMutation(api.private.knowledgeBases.update);
  const deleteKB = useMutation(api.private.knowledgeBases.deleteKnowledgeBase);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const resetForm = () =>
    setFormData({
      name: "",
      description: "",
    });

  /* ---------------- HANDLERS ---------------- */
  const handleCreate = async () => {
    if (!formData.name || !entityId) return;

    try {
      await createKB({
        entityId,
        name: formData.name,
        description: formData.description || undefined,
      });
      toast.success("Knowledge base created");
      setCreateDialogOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to create knowledge base");
    }
  };

  if (!entityId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const handleEdit = async () => {
    if (!selectedKB || !entityId) return;

    try {
      await updateKB({
        entityId,
        knowledgeBaseId: selectedKB.knowledgeBaseId,
        name: formData.name,
        description: formData.description || undefined,
      });
      toast.success("Knowledge base updated");
      setEditDialogOpen(false);
      setSelectedKB(null);
      resetForm();
    } catch {
      toast.error("Failed to update knowledge base");
    }
  };

  const handleDelete = async () => {
    if (!selectedKB || !entityId) return;

    try {
      await deleteKB({
        entityId,
        knowledgeBaseId: selectedKB._id,
      });
      toast.success("Knowledge base deleted");
      setDeleteDialogOpen(false);
      setSelectedKB(null);
    } catch (error: any) {
      const message =
        (error?.data && typeof error.data.message === "string" && error.data.message) ||
        (typeof error?.message === "string" ? error.message : "");

      const assignedMatch = message.match(/It is assigned to:\s*(.+)$/i);
      const assignedTo = assignedMatch?.[1]?.trim();

      if (assignedTo) {
        toast.error("Knowledge base is still connected", {
          description: `This knowledge base is assigned to: ${assignedTo}. Disconnect it from the chatbot first, then delete the knowledge base.`,
        });
        return;
      }

      toast.error("Failed to delete knowledge base");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* CREATE */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Knowledge Base</DialogTitle>
            <DialogDescription>
              Create a new knowledge base to organize your files
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Knowledge Base</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Base</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedKB?.name}"?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LIST */}
      <Dialog open={kbListDialogOpen} onOpenChange={setKbListDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Knowledge Bases</DialogTitle>
            <DialogDescription>
              Create and manage knowledge bases for your chatbots
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-background">
            {knowledgeBases.results.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No knowledge bases yet. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {knowledgeBases.results.map((kb) => (
                    <TableRow key={kb._id}>
                      <TableCell className="font-medium">{kb.name}</TableCell>
                      <TableCell>{kb.description || "No description"}</TableCell>
                      <TableCell>
                        {kb.createdAt ? new Date(kb.createdAt).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedKB(kb);
                              setFormData({
                                name: kb.name,
                                description: kb.description || "",
                              });
                              setKbListDialogOpen(false);
                              setEditDialogOpen(true);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedKB(kb);
                              setKbListDialogOpen(false);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setKbListDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MAIN */}
      <div className="flex min-h-screen w-full flex-col bg-muted">
        <PageHeader
          title="Knowledge Bases"
          description="Create and manage knowledge bases for your chatbots"
        >
          <div className="flex gap-2">
            <Button onClick={() => setKbListDialogOpen(true)}>View Knowledge Bases</Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Knowledge Base
            </Button>
          </div>
        </PageHeader>

        <div className="flex-1 min-h-0 min-w-0 overflow-hidden overflow-x-hidden px-6 py-4">
          <div className="h-full min-h-0 min-w-0 w-full">
            <FilesView entityId={entityId} embedded />
          </div>
        </div>
      </div>
    </>
  );
};
