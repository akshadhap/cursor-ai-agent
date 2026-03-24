"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";

interface Logo {
  type: "default" | "upload" | "url";
  size?: number;
  storageId?: Id<"_storage">;
  externalUrl?: string;
  fileName?: string;
  mimeType?: string;
  updatedAt: number;
}

interface LogoManagerProps {
  chatbotId: Id<"chatbots">;
  logo?: Logo;
  entityId: string;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_MB = 2;

export const LogoManager = ({ chatbotId, logo, entityId }: LogoManagerProps) => {
  const generateUploadUrl = useMutation(api.private.chatbots.generateLogoUploadUrl);
  const uploadLogo = useMutation(api.private.chatbots.uploadLogo);
  const setLogoUrl = useMutation(api.private.chatbots.setLogoUrl);
  const resetLogo = useMutation(api.private.chatbots.resetLogo);
  const logoUrl = useQuery(
    api.private.chatbots.getLogoUrl,
    { chatbotId }
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isUrlDialogOpen) {
      setUrlValue(logo?.type === "url" ? logo?.externalUrl ?? "" : "");
    }
  }, [isUrlDialogOpen, logo]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isSvg = file.type === "image/svg+xml" || lowerName.endsWith(".svg");

    if (!isSvg) {
      toast.error("Only SVG logos are supported");
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      toast.error(`Logo must be smaller than ${MAX_LOGO_MB}MB`);
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "image/svg+xml" },
        body: file,
      });

      if (!result.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await result.json();

      await uploadLogo({
        chatbotId,
        entityId,
        storageId,
        fileName: file.name,
        mimeType: file.type || "image/svg+xml",
        size: file.size,
      });

      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = async () => {
    if (!logo) {
      return;
    }

    setIsSaving(true);
    try {
      await resetLogo({
        chatbotId,
        entityId,
      });
      toast.success("Logo reset to default");
    } catch (error) {
      console.error(error);
      toast.error("Failed to reset logo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyUrl = async () => {
    const trimmed = urlValue.trim();

    if (!trimmed) {
      toast.error("Please enter an SVG URL");
      return;
    }

    if (!trimmed.startsWith("https://")) {
      toast.error("URL must use HTTPS");
      return;
    }

    setIsSaving(true);
    try {
      await setLogoUrl({
        chatbotId,
        entityId,
        externalUrl: trimmed,
      });
      toast.success("Logo URL saved successfully");
      setIsUrlDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save URL");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {logoUrl ? (
            <img
              alt="Chatbot logo preview"
              className="h-full w-full object-contain"
              src={logoUrl}
            />
          ) : (
            <span className="text-xs text-muted-foreground">No logo</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <Button
            disabled={isUploading || isSaving}
            onClick={handleUploadClick}
            variant="default"
            type="button"
          >
            {isUploading ? "Uploading..." : "Upload SVG"}
          </Button>
          
          <Button
            disabled={isUploading || isSaving || !logo}
            onClick={handleReset}
            variant="ghost"
            type="button"
          >
            Reset to default
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Logos must be HTTPS-hosted SVGs under {MAX_LOGO_MB}MB. They appear in chat headers,
        avatars, and embed buttons.
      </p>

      <input
        accept=".svg,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      <Dialog onOpenChange={setIsUrlDialogOpen} open={isUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use external SVG</DialogTitle>
            <DialogDescription>
              Provide an HTTPS link to an SVG file.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="https://example.com/logo.svg"
            type="url"
            value={urlValue}
            onChange={(event) => setUrlValue(event.target.value)}
          />
          <DialogFooter>
            <Button
              onClick={() => setIsUrlDialogOpen(false)}
              type="button"
              variant="outline"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyUrl}
              type="button"
              disabled={isSaving || urlValue.trim().length === 0}
            >
              {isSaving ? "Saving..." : "Save URL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
