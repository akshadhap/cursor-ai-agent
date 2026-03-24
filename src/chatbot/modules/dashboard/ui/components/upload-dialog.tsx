"use client";

import { useQuery, useMutation } from "convex/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { PDFDocument } from "pdf-lib";

// File upload constraints
const MAX_FILE_SIZE_MB = 300;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // 300MB
const MAX_PAGES = 3000;
const MAX_WHISPER_VIDEO_MB = 25;
const MAX_WHISPER_VIDEO_BYTES = MAX_WHISPER_VIDEO_MB * 1024 * 1024;
const MAX_OPENAI_IMAGE_MB = 20;
const MAX_OPENAI_IMAGE_BYTES = MAX_OPENAI_IMAGE_MB * 1024 * 1024;

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUploaded?: () => void;
  defaultKnowledgeBaseId?: Id<"knowledgeBases">;
}

export const UploadDialog = ({
  open,
  onOpenChange,
  onFileUploaded,
  defaultKnowledgeBaseId,
}: UploadDialogProps) => {
  const generateUploadUrl = useMutation(api.private.files.generateUploadUrl);
  const createFileAfterUpload = useMutation(api.private.files.createFileAfterUpload);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidatingFile, setIsValidatingFile] = useState(false);
  const [validatedPdfPages, setValidatedPdfPages] = useState<number | null>(null);
  const [validatedFileFingerprint, setValidatedFileFingerprint] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState({
    category: "",
    filename: "",
    knowledgeBaseId: (defaultKnowledgeBaseId || "") as string,
  });

  const getFileFingerprint = (file: File) => {
    return `${file.name}:${file.size}:${file.lastModified}`;
  };

  const validateFile = async (file: File) => {
    // Hard size limit
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        `File too large! Maximum size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      );
      return { ok: false as const };
    }

    const isVideo =
      file.type.startsWith("video/") ||
      [".mp4", ".webm", ".mov"].some((ext) => file.name.toLowerCase().endsWith(ext));

    if (isVideo && file.size > MAX_WHISPER_VIDEO_BYTES) {
      toast.error(
        `Video too large for transcription! Maximum size is ${MAX_WHISPER_VIDEO_MB}MB. Your video is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      );
      return { ok: false as const };
    }

    const isImage =
      file.type.startsWith("image/") ||
      [".jpg", ".jpeg", ".png", ".webp", ".gif"].some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

    if (isImage && file.size > MAX_OPENAI_IMAGE_BYTES) {
      toast.error(
        `Image too large! Maximum size is ${MAX_OPENAI_IMAGE_MB}MB. Your image is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`
      );
      return { ok: false as const };
    }

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return { ok: true as const, pdfPages: null as number | null };
    }

    try {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = pdf.getPageCount();
      if (pages > MAX_PAGES) {
        toast.error(`PDF too long! Maximum is ${MAX_PAGES} pages. Your PDF has ${pages} pages.`);
        return { ok: false as const };
      }
      return { ok: true as const, pdfPages: pages };
    } catch (e) {
      console.error("[UploadDialog] Failed to count PDF pages", e);
      toast.error("Couldn't validate PDF page count. Please re-try or upload a different PDF.");
      return { ok: false as const };
    }
  };

  // BetterAuth session
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // Convex users to map BetterAuth user → orgId
  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  // Get knowledge bases for dropdown
  const knowledgeBases = useQuery(
    api.private.knowledgeBases.list,
    entityId
      ? { entityId, paginationOpts: { numItems: 100, cursor: null } }
      : "skip"
  );

  const handleFileDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsValidatingFile(true);
    setValidatedPdfPages(null);
    setValidatedFileFingerprint(null);

    (async () => {
      const fingerprint = getFileFingerprint(file);
      const res = await validateFile(file);
      if (!res.ok) {
        setUploadedFiles([]);
        setIsValidatingFile(false);
        return;
      }

      setUploadedFiles([file]);
      setValidatedFileFingerprint(fingerprint);
      setValidatedPdfPages(res.pdfPages ?? null);

      if (!uploadForm.filename) {
        setUploadForm((prev) => ({ ...prev, filename: file.name }));
      }
      setIsValidatingFile(false);
    })();
  };

  const handleUpload = async () => {
    if (!entityId) {
      console.error("Entity ID is required to upload files");
      toast.error("Please login to upload files");
      return;
    }

    if (!uploadForm.knowledgeBaseId) {
      toast.error("Please select a knowledge base");
      return;
    }

    const blob = uploadedFiles[0];
    if (!blob) {
      toast.error("Please select a file");
      return;
    }

    // Re-validate to prevent bypass or stale validation
    const fingerprint = getFileFingerprint(blob);
    if (validatedFileFingerprint !== fingerprint) {
      setIsValidatingFile(true);
      const res = await validateFile(blob);
      setIsValidatingFile(false);
      if (!res.ok) return;
      setValidatedFileFingerprint(fingerprint);
      setValidatedPdfPages(res.pdfPages ?? null);
    }

    const displayName = uploadForm.filename.trim() || blob.name;
    const originalFilename = blob.name;
    const selectedKBId = uploadForm.knowledgeBaseId as Id<"knowledgeBases">;
    const category = uploadForm.category;
    const orgId = entityId;

    // Close dialog immediately
    handleCancel();

    // Process upload in background
    (async () => {
      try {
        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload file directly to Convex storage
        const uploadResult = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "application/octet-stream" },
          body: blob,
        });

        if (!uploadResult.ok) {
          throw new Error(`Upload failed: ${uploadResult.statusText}`);
        }

        const { storageId } = await uploadResult.json();

        // Step 3: Create file record and trigger async processing
        await createFileAfterUpload({
          entityId: orgId,
          storageId,
          filename: originalFilename,
          displayName,
          mimeType: blob.type || "application/octet-stream",
          category: category || undefined,
          knowledgeBaseId: selectedKBId,
        });

        toast.success(`"${displayName}" uploaded! Processing in background...`);

        // Trigger refresh
        onFileUploaded?.();
      } catch (error) {
        console.error(error);
        toast.error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    })();
  };

  const handleCancel = () => {
    onOpenChange(false);
    setUploadedFiles([]);
    setIsValidatingFile(false);
    setValidatedPdfPages(null);
    setValidatedFileFingerprint(null);
    setUploadForm({
      category: "",
      filename: "",
      knowledgeBaseId: (defaultKnowledgeBaseId || "") as string,
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Upload Document
          </DialogTitle>
          <DialogDescription>
            Upload documents to your knowledge base for AI-powered search and retrieval
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="knowledge-base">
              Knowledge Base <span className="text-destructive">*</span>
            </Label>
            <Select
              value={uploadForm.knowledgeBaseId}
              onValueChange={(value) => setUploadForm((prev) => ({
                ...prev,
                knowledgeBaseId: value,
              }))}
            >
              <SelectTrigger id="knowledge-base">
                <SelectValue placeholder="Select knowledge base" />
              </SelectTrigger>
              <SelectContent>
                {knowledgeBases?.page && knowledgeBases.page.map((kb) => (
                  <SelectItem key={kb._id} value={kb._id}>
                    {kb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category
            </Label>
            <Input
              className="w-full"
              id="category"
              onChange={(e) => setUploadForm((prev) => ({
                ...prev,
                category: e.target.value,
              }))}
              placeholder="e.g., Documentation, Support, Product"
              type="text"
              value={uploadForm.category}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filename">
              Filename
              <span className="text-muted-foreground text-xs"> (optional)</span>
            </Label>
            <Input
              className="w-full"
              id="filename"
              onChange={(e) => setUploadForm((prev) => ({
                ...prev,
                filename: e.target.value,
              }))}
              placeholder="Override default filename"
              type="text"
              value={uploadForm.filename}
            />
          </div>

          <Dropzone
            accept={{
              "application/pdf": [".pdf"],
              "text/csv": [".csv"],
              "text/plain": [".txt"],
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "image/gif": [".gif"],
              "video/mp4": [".mp4"],
              "video/webm": [".webm"],
              "video/quicktime": [".mov"],
            }}
            disabled={isUploading || isValidatingFile}
            maxFiles={1}
            onDrop={handleFileDrop}
            src={uploadedFiles}
          >
            <DropzoneEmptyState />
            <DropzoneContent />
          </Dropzone>
        </div>

        <DialogFooter>
          <Button
            disabled={isUploading}
            onClick={handleCancel}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              uploadedFiles.length === 0 ||
              !uploadForm.knowledgeBaseId ||
              isUploading ||
              isValidatingFile
            }
          >
            {isUploading ? "Uploading..." : isValidatingFile ? "Validating..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
