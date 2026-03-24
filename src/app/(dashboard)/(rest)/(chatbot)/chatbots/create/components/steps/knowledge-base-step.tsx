"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { UploadDialog } from "@/chatbot/modules/dashboard/ui/components/upload-dialog";

import type { Id } from "@/../convex/_generated/dataModel";
import type { ChatbotFormState, KnowledgeBase } from "../types";

export function KnowledgeBaseStep({
  entityId,
  form,
  setForm,
  knowledgeBases,
  createKnowledgeBase,
}: {
  entityId: string;
  form: ChatbotFormState;
  setForm: (next: ChatbotFormState) => void;
  knowledgeBases: KnowledgeBase[];
  createKnowledgeBase: (args: {
    entityId: string;
    name: string;
    description?: string;
  }) => Promise<Id<"knowledgeBases">>;
}) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [kbCreateName, setKbCreateName] = useState("");
  const [kbCreateDescription, setKbCreateDescription] = useState("");
  const [isCreatingKb, setIsCreatingKb] = useState(false);

  const handleCreateKnowledgeBase = async () => {
    const name = kbCreateName.trim();
    if (!name) return;

    try {
      setIsCreatingKb(true);
      const createdId = await createKnowledgeBase({
        entityId,
        name,
        description: kbCreateDescription.trim() || undefined,
      });
      setForm({ ...form, knowledgeBaseId: createdId });
      setKbCreateName("");
      setKbCreateDescription("");
    } finally {
      setIsCreatingKb(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="kb">Knowledge Base</Label>
        <Select
          value={form.knowledgeBaseId || ""}
          onValueChange={(value) =>
            setForm({
              ...form,
              knowledgeBaseId: (value as Id<"knowledgeBases">) || "",
            })
          }
        >
          <SelectTrigger id="kb">
            <SelectValue placeholder="Select a knowledge base (optional)" />
          </SelectTrigger>
          <SelectContent>
            {knowledgeBases.map((kb) => (
              <SelectItem key={kb._id} value={kb._id}>
                {kb.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {knowledgeBases.length === 0
            ? "No knowledge bases found yet. Create one below or upload docs to enable answers from your data."
            : "Optional, but recommended for accurate answers from your docs."}
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="text-sm font-medium">Create a new knowledge base</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="kbName">Name</Label>
            <Input
              id="kbName"
              value={kbCreateName}
              onChange={(e) => setKbCreateName(e.target.value)}
              placeholder="e.g., Product Docs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kbDesc">Description (optional)</Label>
            <Input
              id="kbDesc"
              value={kbCreateDescription}
              onChange={(e) => setKbCreateDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            You can upload documents after creating/selecting a knowledge base.
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCreateKnowledgeBase}
            disabled={isCreatingKb || kbCreateName.trim().length === 0}
          >
            {isCreatingKb ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="text-sm font-medium">Upload documents</div>
        <div className="text-xs text-muted-foreground">
          Upload PDFs, CSVs, TXT files, images, or videos into the selected knowledge base.
        </div>
        <Button
          type="button"
          onClick={() => setUploadDialogOpen(true)}
          disabled={!form.knowledgeBaseId}
        >
          Upload Document
        </Button>
        {!form.knowledgeBaseId ? (
          <div className="text-xs text-muted-foreground">
            Select or create a knowledge base first.
          </div>
        ) : null}
      </div>

      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        defaultKnowledgeBaseId={form.knowledgeBaseId ? form.knowledgeBaseId : undefined}
      />
    </>
  );
}
