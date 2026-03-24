"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";
import {
  HardDrive,
  File,
  Folder,
  Upload,
  Download,
  Search,
  Share2,
  Trash2,
  Copy,
  Move,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  Plus,
  Eye,
  Edit,
  List,
  Users,
} from "lucide-react";

// Google Drive MIME types
const MIME_TYPES = {
  folder: "application/vnd.google-apps.folder",
  document: "application/vnd.google-apps.document",
  spreadsheet: "application/vnd.google-apps.spreadsheet",
  presentation: "application/vnd.google-apps.presentation",
  form: "application/vnd.google-apps.form",
  drawing: "application/vnd.google-apps.drawing",
  pdf: "application/pdf",
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

const OPERATIONS = [
  // Public File Operations (no credentials needed)
  { value: "download_public_file", label: "Download Public File", icon: Download, category: "public" },
  { value: "get_public_file_info", label: "Get Public File Info", icon: Eye, category: "public" },

  // File Operations
  { value: "list_files", label: "List Files", icon: List, category: "files" },
  { value: "get_file", label: "Get File Info", icon: Eye, category: "files" },
  { value: "create_file", label: "Create File", icon: Plus, category: "files" },
  { value: "update_file", label: "Update File", icon: Edit, category: "files" },
  { value: "download_file", label: "Download File", icon: Download, category: "files" },
  { value: "upload_file", label: "Upload File", icon: Upload, category: "files" },
  { value: "copy_file", label: "Copy File", icon: Copy, category: "files" },
  { value: "move_file", label: "Move File", icon: Move, category: "files" },
  { value: "delete_file", label: "Delete File", icon: Trash2, category: "files" },
  { value: "search_files", label: "Search Files", icon: Search, category: "files" },

  // Folder Operations
  { value: "create_folder", label: "Create Folder", icon: Folder, category: "folders" },
  { value: "list_folder_contents", label: "List Folder Contents", icon: List, category: "folders" },
  { value: "get_folder", label: "Get Folder Info", icon: Eye, category: "folders" },

  // Share Operations
  { value: "share_file", label: "Share File/Folder", icon: Share2, category: "sharing" },
  { value: "list_permissions", label: "List Permissions", icon: Users, category: "sharing" },
  { value: "update_permission", label: "Update Permission", icon: Edit, category: "sharing" },
  { value: "remove_permission", label: "Remove Permission", icon: Trash2, category: "sharing" },

  // Google Docs Operations
  { value: "create_document", label: "Create Google Doc", icon: FileText, category: "docs" },
  { value: "create_spreadsheet", label: "Create Google Sheet", icon: FileSpreadsheet, category: "docs" },
  { value: "create_presentation", label: "Create Google Slides", icon: Presentation, category: "docs" },
  { value: "export_document", label: "Export as PDF/DOCX", icon: Download, category: "docs" },
] as const;

type OperationType = (typeof OPERATIONS)[number]["value"];

// Public operations that don't require credentials
const PUBLIC_OPERATIONS = ["download_public_file", "get_public_file_info"] as const;

const googleDriveFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().optional(), // Optional for public file operations
  operation: z.string().min(1, "Operation is required"),

  // Public file URL (no credentials needed)
  publicFileUrl: z.string().optional(),

  // File/Folder identifiers
  fileId: z.string().optional(),
  folderId: z.string().optional(),
  parentFolderId: z.string().optional(),
  destinationFolderId: z.string().optional(),

  // File properties
  fileName: z.string().optional(),
  fileDescription: z.string().optional(),
  mimeType: z.string().optional(),

  // Content
  fileContent: z.string().optional(),
  fileUrl: z.string().optional(),

  // Search & List
  searchQuery: z.string().optional(),
  pageSize: z.number().optional(),
  orderBy: z.string().optional(),
  includeTrash: z.boolean().optional(),

  // Sharing
  shareEmail: z.string().optional(),
  shareRole: z.enum(["reader", "commenter", "writer", "owner"]).optional(),
  shareType: z.enum(["user", "group", "domain", "anyone"]).optional(),
  permissionId: z.string().optional(),
  sendNotification: z.boolean().optional(),
  emailMessage: z.string().optional(),

  // Export
  exportFormat: z.string().optional(),

  // Advanced
  supportsAllDrives: z.boolean().optional(),
  fields: z.string().optional(),

  // Use public access mode (no credentials)
  usePublicAccess: z.boolean().optional(),
});

export type GoogleDriveFormValues = z.infer<typeof googleDriveFormSchema>;

interface GoogleDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: GoogleDriveFormValues) => void;
  defaultValues?: Partial<GoogleDriveFormValues>;
}

export const GoogleDriveDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: GoogleDriveDialogProps) => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
  } = useCredentialsByType(CredentialType.GOOGLE_DRIVE);

  const form = useForm<GoogleDriveFormValues>({
    resolver: zodResolver(googleDriveFormSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "",
      credentialId: defaultValues?.credentialId || "",
      operation: defaultValues?.operation || "",
      publicFileUrl: defaultValues?.publicFileUrl || "",
      fileId: defaultValues?.fileId || "",
      folderId: defaultValues?.folderId || "",
      parentFolderId: defaultValues?.parentFolderId || "",
      destinationFolderId: defaultValues?.destinationFolderId || "",
      fileName: defaultValues?.fileName || "",
      fileDescription: defaultValues?.fileDescription || "",
      mimeType: defaultValues?.mimeType || "",
      fileContent: defaultValues?.fileContent || "",
      fileUrl: defaultValues?.fileUrl || "",
      searchQuery: defaultValues?.searchQuery || "",
      pageSize: defaultValues?.pageSize || 100,
      orderBy: defaultValues?.orderBy || "modifiedTime desc",
      includeTrash: defaultValues?.includeTrash || false,
      shareEmail: defaultValues?.shareEmail || "",
      shareRole: defaultValues?.shareRole || "reader",
      shareType: defaultValues?.shareType || "user",
      permissionId: defaultValues?.permissionId || "",
      sendNotification: defaultValues?.sendNotification || true,
      emailMessage: defaultValues?.emailMessage || "",
      exportFormat: defaultValues?.exportFormat || "application/pdf",
      supportsAllDrives: defaultValues?.supportsAllDrives || true,
      fields: defaultValues?.fields || "",
      usePublicAccess: defaultValues?.usePublicAccess || false,
    },
  });

  const selectedOperation = form.watch("operation") as OperationType;

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
    onOpenChange(false);
  });

  const operationsByCategory = OPERATIONS.reduce((acc, op) => {
    if (!acc[op.category]) acc[op.category] = [];
    acc[op.category].push(op);
    return acc;
  }, {} as Record<string, typeof OPERATIONS[number][]>);

  const renderOperationFields = () => {
    switch (selectedOperation) {
      // Public file operations - NO credentials needed
      case "download_public_file":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">✨ No credentials required! Just paste a public Google Drive URL.</p>
            </div>
            <div>
              <Label htmlFor="publicFileUrl">Public Google Drive URL *</Label>
              <Input
                id="publicFileUrl"
                placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                {...form.register("publicFileUrl")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the shareable link from Google Drive (file must be set to &quot;Anyone with the link&quot;)
              </p>
            </div>
          </div>
        );

      case "get_public_file_info":
        return (
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">✨ No credentials required! Just paste a public Google Drive URL.</p>
            </div>
            <div>
              <Label htmlFor="publicFileUrl">Public Google Drive URL *</Label>
              <Input
                id="publicFileUrl"
                placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                {...form.register("publicFileUrl")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste the shareable link from Google Drive (file must be set to &quot;Anyone with the link&quot;)
              </p>
            </div>
          </div>
        );

      case "list_files":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderId">Folder ID (optional)</Label>
              <Input
                id="folderId"
                placeholder="Leave empty for root, or enter folder ID"
                {...form.register("folderId")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports template: {"{{folderId}}"} - Use &apos;root&apos; for My Drive root
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pageSize">Max Results</Label>
                <Input
                  id="pageSize"
                  type="number"
                  {...form.register("pageSize", { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="orderBy">Order By</Label>
                <Controller
                  name="orderBy"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modifiedTime desc">Modified (Newest)</SelectItem>
                        <SelectItem value="modifiedTime">Modified (Oldest)</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                        <SelectItem value="name desc">Name (Z-A)</SelectItem>
                        <SelectItem value="createdTime desc">Created (Newest)</SelectItem>
                        <SelectItem value="folder,name">Folders First</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="includeTrash"
                control={form.control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Include trashed files</Label>
            </div>
          </div>
        );

      case "get_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File ID *</Label>
              <Input
                id="fileId"
                placeholder="Enter file ID"
                {...form.register("fileId")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Supports template: {"{{fileId}}"}</p>
            </div>
            <div>
              <Label htmlFor="fields">Fields to Return (optional)</Label>
              <Input
                id="fields"
                placeholder="id, name, mimeType, webViewLink, size"
                {...form.register("fields")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list of fields</p>
            </div>
          </div>
        );

      case "create_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileName">File Name *</Label>
              <Input
                id="fileName"
                placeholder="my-file.txt"
                {...form.register("fileName")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="parentFolderId">Parent Folder ID</Label>
              <Input
                id="parentFolderId"
                placeholder="Leave empty for root"
                {...form.register("parentFolderId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mimeType">MIME Type</Label>
              <Controller
                name="mimeType"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text/plain">Text File</SelectItem>
                      <SelectItem value="application/json">JSON File</SelectItem>
                      <SelectItem value="text/csv">CSV File</SelectItem>
                      <SelectItem value="text/html">HTML File</SelectItem>
                      <SelectItem value="application/xml">XML File</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label htmlFor="fileContent">File Content</Label>
              <Textarea
                id="fileContent"
                placeholder="Enter file content..."
                {...form.register("fileContent")}
                className="mt-1 min-h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Supports template variables</p>
            </div>
            <div>
              <Label htmlFor="fileDescription">Description (optional)</Label>
              <Input
                id="fileDescription"
                {...form.register("fileDescription")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "update_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fileName">New Name (optional)</Label>
              <Input
                id="fileName"
                {...form.register("fileName")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fileContent">New Content (optional)</Label>
              <Textarea
                id="fileContent"
                {...form.register("fileContent")}
                className="mt-1 min-h-[100px] font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="fileDescription">New Description (optional)</Label>
              <Input
                id="fileDescription"
                {...form.register("fileDescription")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "download_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports template: {"{{fileId}}"} - ID of the file to download
              </p>
            </div>
            <div>
              <Label htmlFor="exportFormat">Export Format (for Google Workspace files)</Label>
              <Select
                value={form.watch("exportFormat")}
                onValueChange={(value) => form.setValue("exportFormat", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select export format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application/pdf">PDF (.pdf)</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (.docx)</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel (.xlsx)</SelectItem>
                  <SelectItem value="application/vnd.openxmlformats-officedocument.presentationml.presentation">PowerPoint (.pptx)</SelectItem>
                  <SelectItem value="text/html">HTML (.html)</SelectItem>
                  <SelectItem value="text/plain">Plain Text (.txt)</SelectItem>
                  <SelectItem value="application/rtf">Rich Text (.rtf)</SelectItem>
                  <SelectItem value="application/epub+zip">EPUB (.epub)</SelectItem>
                  <SelectItem value="application/zip">Zipped HTML (.zip)</SelectItem>
                  <SelectItem value="image/jpeg">JPEG (.jpg) - Drawings</SelectItem>
                  <SelectItem value="image/png">PNG (.png) - Drawings</SelectItem>
                  <SelectItem value="image/svg+xml">SVG (.svg) - Drawings</SelectItem>
                  <SelectItem value="text/csv">CSV (.csv) - Sheets only</SelectItem>
                  <SelectItem value="application/vnd.oasis.opendocument.text">OpenDocument Text (.odt)</SelectItem>
                  <SelectItem value="application/vnd.oasis.opendocument.spreadsheet">OpenDocument Spreadsheet (.ods)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only used for Google Docs, Sheets, Slides, and Drawings. Regular files download in original format.
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                📝 Note: Google Workspace files (Docs, Sheets, Slides) will be exported in the selected format.
                Regular files return as base64 (binary) or text depending on MIME type.
              </p>
            </div>
          </div>
        );

      case "upload_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileName">File Name *</Label>
              <Input
                id="fileName"
                {...form.register("fileName")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="parentFolderId">Parent Folder ID</Label>
              <Input
                id="parentFolderId"
                placeholder="Leave empty for root"
                {...form.register("parentFolderId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fileContent">File Content (Base64 or Text) *</Label>
              <Textarea
                id="fileContent"
                placeholder="Paste base64 encoded content or plain text"
                {...form.register("fileContent")}
                className="mt-1 min-h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Supports template: {"{{base64Content}}"} or {"{{textContent}}"}
              </p>
            </div>
            <div>
              <Label htmlFor="mimeType">MIME Type *</Label>
              <Input
                id="mimeType"
                placeholder="application/pdf, image/png, etc."
                {...form.register("mimeType")}
                className="mt-1"
              />
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-400">
                📦 Large File Support: Files under 5MB use multipart upload. Files over 5MB automatically use resumable upload (256KB chunks).
              </p>
            </div>
          </div>
        );

      case "copy_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">Source File ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fileName">New Name (optional)</Label>
              <Input
                id="fileName"
                placeholder="Copy of original name if empty"
                {...form.register("fileName")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="destinationFolderId">Destination Folder ID (optional)</Label>
              <Input
                id="destinationFolderId"
                placeholder="Same location if empty"
                {...form.register("destinationFolderId")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "move_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="destinationFolderId">Destination Folder ID *</Label>
              <Input
                id="destinationFolderId"
                {...form.register("destinationFolderId")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "delete_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
              <p className="text-xs mt-1 text-amber-500">
                ⚠️ This permanently deletes the file (bypasses trash)
              </p>
            </div>
          </div>
        );

      case "search_files":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="searchQuery">Search Query *</Label>
              <Textarea
                id="searchQuery"
                placeholder="name contains 'report' and mimeType='application/pdf'"
                {...form.register("searchQuery")}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                <a href="https://developers.google.com/drive/api/guides/search-files" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  Query syntax reference
                </a>
              </p>
            </div>
            <div>
              <Label htmlFor="pageSize">Max Results</Label>
              <Input
                id="pageSize"
                type="number"
                {...form.register("pageSize", { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "create_folder":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileName">Folder Name *</Label>
              <Input
                id="fileName"
                placeholder="My New Folder"
                {...form.register("fileName")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="parentFolderId">Parent Folder ID</Label>
              <Input
                id="parentFolderId"
                placeholder="Leave empty for root"
                {...form.register("parentFolderId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fileDescription">Description (optional)</Label>
              <Input
                id="fileDescription"
                {...form.register("fileDescription")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "list_folder_contents":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderId">Folder ID *</Label>
              <Input
                id="folderId"
                placeholder="Use 'root' for My Drive"
                {...form.register("folderId")}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pageSize">Max Results</Label>
                <Input
                  id="pageSize"
                  type="number"
                  {...form.register("pageSize", { valueAsNumber: true })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="orderBy">Order By</Label>
                <Controller
                  name="orderBy"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="folder,name">Folders First, then Name</SelectItem>
                        <SelectItem value="modifiedTime desc">Modified (Newest)</SelectItem>
                        <SelectItem value="name">Name (A-Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case "get_folder":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="folderId">Folder ID *</Label>
              <Input
                id="folderId"
                {...form.register("folderId")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "share_file":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File/Folder ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="shareType">Share With</Label>
              <Controller
                name="shareType"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Specific User</SelectItem>
                      <SelectItem value="group">Google Group</SelectItem>
                      <SelectItem value="domain">Entire Domain</SelectItem>
                      <SelectItem value="anyone">Anyone with Link</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {(form.watch("shareType") === "user" || form.watch("shareType") === "group") && (
              <div>
                <Label htmlFor="shareEmail">Email Address *</Label>
                <Input
                  id="shareEmail"
                  placeholder="user@example.com or {{variable}}"
                  {...form.register("shareEmail")}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports templates like {"{{clientEmail}}"} or plain email addresses
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="shareRole">Permission Level</Label>
              <Controller
                name="shareRole"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reader">Viewer</SelectItem>
                      <SelectItem value="commenter">Commenter</SelectItem>
                      <SelectItem value="writer">Editor</SelectItem>
                      <SelectItem value="owner">Owner (Transfer)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex items-center gap-2">
              <Controller
                name="sendNotification"
                control={form.control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Send notification email</Label>
            </div>
            {form.watch("sendNotification") && (
              <div>
                <Label htmlFor="emailMessage">Email Message (optional)</Label>
                <Textarea
                  id="emailMessage"
                  placeholder="Custom message for the notification"
                  {...form.register("emailMessage")}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        );

      case "list_permissions":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File/Folder ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "update_permission":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File/Folder ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="permissionId">Permission ID *</Label>
              <Input
                id="permissionId"
                {...form.register("permissionId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="shareRole">New Role</Label>
              <Controller
                name="shareRole"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reader">Viewer</SelectItem>
                      <SelectItem value="commenter">Commenter</SelectItem>
                      <SelectItem value="writer">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        );

      case "remove_permission":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">File/Folder ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="permissionId">Permission ID *</Label>
              <Input
                id="permissionId"
                {...form.register("permissionId")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "create_document":
      case "create_spreadsheet":
      case "create_presentation":
        const docType = selectedOperation === "create_document" ? "Document" :
          selectedOperation === "create_spreadsheet" ? "Spreadsheet" : "Presentation";
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileName">{docType} Name *</Label>
              <Input
                id="fileName"
                placeholder={`My ${docType}`}
                {...form.register("fileName")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="parentFolderId">Parent Folder ID</Label>
              <Input
                id="parentFolderId"
                placeholder="Leave empty for root"
                {...form.register("parentFolderId")}
                className="mt-1"
              />
            </div>
          </div>
        );

      case "export_document":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="fileId">Document ID *</Label>
              <Input
                id="fileId"
                {...form.register("fileId")}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be a Google Doc, Sheet, or Slides
              </p>
            </div>
            <div>
              <Label htmlFor="exportFormat">Export Format</Label>
              <Controller
                name="exportFormat"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="application/pdf">PDF</SelectItem>
                      <SelectItem value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">Word (.docx)</SelectItem>
                      <SelectItem value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">Excel (.xlsx)</SelectItem>
                      <SelectItem value="application/vnd.openxmlformats-officedocument.presentationml.presentation">PowerPoint (.pptx)</SelectItem>
                      <SelectItem value="text/plain">Plain Text</SelectItem>
                      <SelectItem value="text/csv">CSV</SelectItem>
                      <SelectItem value="text/html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Select an operation to configure
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-green-500" />
            Configure Google Drive
          </DialogTitle>
          <DialogDescription>
            Manage files, folders, and permissions in Google Drive
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Variable Name */}
          <div>
            <Label htmlFor="variableName">Variable Name *</Label>
            <Input
              id="variableName"
              placeholder="driveResult"
              {...form.register("variableName")}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Access result as {"{{driveResult}}"} in subsequent nodes
            </p>
            {form.formState.errors.variableName && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.variableName.message}</p>
            )}
          </div>

          {/* Credential Selection - Hidden for public operations only */}
          {(!selectedOperation || !["download_public_file", "get_public_file_info"].includes(selectedOperation)) && (
            <div>
              <Label className="text-base font-semibold">Google Drive Credential</Label>
              <Controller
                name="credentialId"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={isLoadingCredentials ? "Loading..." : "Select credential"} />
                    </SelectTrigger>
                    <SelectContent>
                      {credentials?.map((credential) => (
                        <SelectItem key={credential.id} value={credential.id}>
                          <div className="flex items-center gap-2">
                            <Image
                              src="/logos/google-drive.svg"
                              alt="Google Drive"
                              width={16}
                              height={16}
                            />
                            {credential.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.credentialId && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.credentialId.message}</p>
              )}
            </div>
          )}

          {/* Operation Selection */}
          <div>
            <Label className="text-base font-semibold">Select Operation</Label>
            <Tabs defaultValue="public" className="mt-2">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="public">Public</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
                <TabsTrigger value="folders">Folders</TabsTrigger>
                <TabsTrigger value="sharing">Sharing</TabsTrigger>
                <TabsTrigger value="docs">Google Docs</TabsTrigger>
              </TabsList>

              {Object.entries(operationsByCategory).map(([category, ops]) => (
                <TabsContent key={category} value={category} className="mt-3">
                  <div className="grid grid-cols-2 gap-2">
                    {ops.map((op) => {
                      const Icon = op.icon;
                      return (
                        <Button
                          key={op.value}
                          type="button"
                          variant={selectedOperation === op.value ? "default" : "outline"}
                          className="justify-start h-auto py-2"
                          onClick={() => form.setValue("operation", op.value)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {op.label}
                        </Button>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Dynamic Operation Fields */}
          {selectedOperation && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium mb-4">
                {OPERATIONS.find(o => o.value === selectedOperation)?.label} Configuration
              </h4>
              {renderOperationFields()}
            </div>
          )}

          {/* Advanced Options */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Advanced Options</h4>
            <div className="flex items-center gap-2">
              <Controller
                name="supportsAllDrives"
                control={form.control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label>Support Shared Drives</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedOperation}>
              Save Configuration
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
