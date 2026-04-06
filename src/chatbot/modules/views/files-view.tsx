"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { PublicFile } from "../../../../convex/private/files";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  FileIcon,
  MoreHorizontalIcon,
  TrashIcon,
  PlusIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2Icon,
  UploadIcon,
  GlobeIcon,
  RefreshCwIcon,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { UploadDialog } from "../dashboard/ui/components/upload-dialog";
import { DeleteFileDialog } from "../dashboard/ui/components/delete-file-dialog";
import { PageHeader } from "@/components/page-header";

const KB_FILTER_STORAGE_KEY = "files-kb-filter";
const SOURCE_FILTER_STORAGE_KEY = "files-source-filter";

type FilesViewProps = {
  entityId: string;
  embedded?: boolean;
  forcedKnowledgeBaseId?: string;
};

/* -------------------------------------------------
   VIEW
------------------------------------------------- */
export const FilesView = ({ entityId, embedded, forcedKnowledgeBaseId }: FilesViewProps) => {
  const scopedKbStorageKey = entityId ? `${KB_FILTER_STORAGE_KEY}-${entityId}` : null;
  const scopedSourceStorageKey = entityId ? `${SOURCE_FILTER_STORAGE_KEY}-${entityId}` : null;

  /* ---------------- KNOWLEDGE BASES ---------------- */
  const knowledgeBases = useQuery(
    api.private.knowledgeBases.list,
    entityId
      ? { entityId, paginationOpts: { numItems: 100, cursor: null } }
      : "skip"
  );

  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "uploaded" | "scraped">("all");

  const effectiveKnowledgeBaseId = forcedKnowledgeBaseId ?? selectedKnowledgeBaseId;

  // Load persisted filters whenever organization changes
  useEffect(() => {
    if (forcedKnowledgeBaseId !== undefined) {
      setSelectedKnowledgeBaseId(forcedKnowledgeBaseId);
      return;
    }
    if (!scopedKbStorageKey || typeof window === "undefined") {
      setSelectedKnowledgeBaseId("all");
      return;
    }
    const storedKb = localStorage.getItem(scopedKbStorageKey);
    setSelectedKnowledgeBaseId(storedKb || "all");
  }, [forcedKnowledgeBaseId, scopedKbStorageKey]);

  useEffect(() => {
    if (!scopedSourceStorageKey || typeof window === "undefined") {
      setSourceFilter("all");
      return;
    }
    const storedSource = localStorage.getItem(scopedSourceStorageKey) as "all" | "uploaded" | "scraped" | null;
    setSourceFilter(storedSource || "all");
  }, [scopedSourceStorageKey]);

  // Persist filter selections to localStorage scoped per organization
  useEffect(() => {
    if (forcedKnowledgeBaseId !== undefined) {
      return;
    }
    if (!scopedKbStorageKey || typeof window === "undefined") {
      return;
    }
    localStorage.setItem(scopedKbStorageKey, selectedKnowledgeBaseId);
  }, [forcedKnowledgeBaseId, selectedKnowledgeBaseId, scopedKbStorageKey]);

  useEffect(() => {
    if (!scopedSourceStorageKey || typeof window === "undefined") {
      return;
    }
    localStorage.setItem(scopedSourceStorageKey, sourceFilter);
  }, [sourceFilter, scopedSourceStorageKey]);

  // Ensure selected KB belongs to current organization
  useEffect(() => {
    if (!knowledgeBases?.page || effectiveKnowledgeBaseId === "all") {
      return;
    }
    const exists = knowledgeBases.page.some(
      (kb) => kb.knowledgeBaseId === effectiveKnowledgeBaseId || kb._id === effectiveKnowledgeBaseId,
    );
    if (!exists) {
      setSelectedKnowledgeBaseId("all");
    }
  }, [knowledgeBases, effectiveKnowledgeBaseId]);

  /* ---------------- FILES ---------------- */
  const hasValidKbSelection =
    effectiveKnowledgeBaseId !== "all" &&
    !!knowledgeBases?.page?.some(
      (kb) => kb.knowledgeBaseId === effectiveKnowledgeBaseId || kb._id === effectiveKnowledgeBaseId,
    );

  // Find the knowledge base _id from knowledgeBaseId string
  const selectedKbDocId = hasValidKbSelection
    ? knowledgeBases?.page?.find(
        (kb) => kb.knowledgeBaseId === effectiveKnowledgeBaseId || kb._id === effectiveKnowledgeBaseId,
      )?._id
    : undefined;

  const filesResult = useQuery(
    api.private.files.list,
    entityId
      ? {
          entityId,
          knowledgeBaseId: selectedKbDocId,
          paginationOpts: { numItems: 100, cursor: null },
        }
      : "skip"
  );

  // Debug logging
  console.log("[FilesView] entityId:", entityId);
  console.log("[FilesView] selectedKbDocId:", selectedKbDocId);
  console.log("[FilesView] filesResult:", filesResult);

  const isLoadingFiles = filesResult === undefined;
  const filesList = filesResult?.page ?? [];

  /* ---------------- DIALOGS ---------------- */
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null);

  /* ---------------- MUTATIONS ---------------- */
  const retryFile = useMutation(api.private.files.retryFileProcessing);

  /* ---------------- HANDLERS ---------------- */
  const handleDeleteClick = (file: PublicFile) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  const handleRetryClick = async (file: PublicFile) => {
    try {
      await retryFile({ entryId: file.id, entityId });
      toast.success("Retrying file processing...");
    } catch (error) {
      console.error(error);
      toast.error("Failed to retry file processing");
    }
  };

  const handleFileDeleted = () => {
    setSelectedFile(null);
  };

  /* ---------------- HELPERS ---------------- */
  const getKnowledgeBaseName = (knowledgeBaseId: string | undefined) => {
    if (!knowledgeBaseId) return "Default";
    const kb = knowledgeBases?.page?.find((kb) => kb._id === knowledgeBaseId || kb.knowledgeBaseId === knowledgeBaseId);
    return kb?.name || "Unknown";
  };

  const uniqueFiles = useMemo(() => {
    const seen = new Map<string, PublicFile>();
    for (const file of filesList) {
      const key = `${file.name}-${file.knowledgeBaseId ?? "default"}`;
      if (!seen.has(key)) {
        seen.set(key, file);
      }
    }
    return Array.from(seen.values());
  }, [filesList]);

  // Apply source filter
  const filteredFiles = useMemo(() => {
    if (sourceFilter === "all") return uniqueFiles;
    return uniqueFiles.filter((file) => (file.sourceType || "uploaded") === sourceFilter);
  }, [uniqueFiles, sourceFilter]);

  /* ---------------- UI ---------------- */
  return (
    <>
      <DeleteFileDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        file={selectedFile}
        onDeleted={handleFileDeleted}
      />

      <UploadDialog
        onOpenChange={setUploadDialogOpen}
        open={uploadDialogOpen}
        defaultKnowledgeBaseId={selectedKbDocId}
      />

      {embedded ? (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="shrink-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kb-filter">Filter by Knowledge Base</Label>
              <Select
                value={selectedKnowledgeBaseId}
                onValueChange={setSelectedKnowledgeBaseId}
                disabled={forcedKnowledgeBaseId !== undefined}
              >
                <SelectTrigger id="kb-filter">
                  <SelectValue placeholder="Select knowledge base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Knowledge Bases</SelectItem>
                  {knowledgeBases?.page?.map((kb) => (
                    <SelectItem key={kb._id} value={kb.knowledgeBaseId ?? kb._id}>
                      {kb.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filter by Source</Label>
              <Tabs
                value={sourceFilter}
                onValueChange={(v) => setSourceFilter(v as "all" | "uploaded" | "scraped")}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All Files</TabsTrigger>
                  <TabsTrigger value="uploaded">
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Uploaded
                  </TabsTrigger>
                  <TabsTrigger value="scraped">
                    <GlobeIcon className="mr-2 h-4 w-4" />
                    Scraped
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-lg border bg-background">
            <div className="flex shrink-0 items-center justify-end border-b px-6 py-4">
              <Button onClick={() => setUploadDialogOpen(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Add New
              </Button>
            </div>

            <Table
              className="min-w-[1100px]"
              containerClassName="show-scrollbar flex-1 min-h-0 overflow-x-scroll overflow-y-scroll"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-4 font-medium">Name</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Knowledge Base</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Source</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Type</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Size</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Status</TableHead>
                  <TableHead className="px-6 py-4 font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {(() => {
                  if (isLoadingFiles) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={7}>
                          Loading files...
                        </TableCell>
                      </TableRow>
                    );
                  }

                  if (filteredFiles.length === 0) {
                    return (
                      <TableRow>
                        <TableCell className="h-24 text-center" colSpan={7}>
                          No files found
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return filteredFiles.map((file) => (
                    <TableRow className="hover:bg-muted/50" key={file.id}>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                            <FileIcon className="h-4 w-4" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground ml-7">
                            Original: {file.originalFilename ?? file.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="secondary">{getKnowledgeBaseName(file.knowledgeBaseId)}</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {file.sourceType === "scraped" ? (
                          <Badge variant="default" className="gap-1">
                            <GlobeIcon className="h-3 w-3" />
                            Scraped
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <UploadIcon className="h-3 w-3" />
                            Uploaded
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge className="uppercase" variant="outline">
                          {file.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">{file.size}</TableCell>
                      <TableCell className="px-6 py-4">
                        {file.status === "ready" && (
                          <Badge
                            variant="default"
                            className="gap-1 bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle2Icon className="h-3 w-3" />
                            Ready
                          </Badge>
                        )}
                        {file.status === "processing" && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2Icon className="h-3 w-3 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {file.status === "deleting" && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2Icon className="h-3 w-3 animate-spin" />
                            Deleting
                          </Badge>
                        )}
                        {file.status === "error" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircleIcon className="h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="size-8 p-0" size="sm" variant="ghost">
                              <MoreHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {file.status === "error" && (
                              <DropdownMenuItem onClick={() => handleRetryClick(file)}>
                                <RefreshCwIcon className="size-4 mr-2" />
                                Retry Processing
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={file.status === "deleting"}
                              onClick={() => handleDeleteClick(file)}
                            >
                              <TrashIcon className="size-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col bg-muted">
          <PageHeader
            title="Knowledge Base Files"
            description="Upload and manage documents for your AI assistant"
          ></PageHeader>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="mx-auto w-full max-w-screen-md">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kb-filter">Filter by Knowledge Base</Label>
                  <Select
                    value={selectedKnowledgeBaseId}
                    onValueChange={setSelectedKnowledgeBaseId}
                  >
                    <SelectTrigger id="kb-filter">
                      <SelectValue placeholder="Select knowledge base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Knowledge Bases</SelectItem>
                      {knowledgeBases?.page?.map((kb) => (
                        <SelectItem key={kb._id} value={kb.knowledgeBaseId ?? kb._id}>
                          {kb.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Filter by Source</Label>
                  <Tabs
                    value={sourceFilter}
                    onValueChange={(v) =>
                      setSourceFilter(v as "all" | "uploaded" | "scraped")
                    }
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">All Files</TabsTrigger>
                      <TabsTrigger value="uploaded">
                        <UploadIcon className="mr-2 h-4 w-4" />
                        Uploaded
                      </TabsTrigger>
                      <TabsTrigger value="scraped">
                        <GlobeIcon className="mr-2 h-4 w-4" />
                        Scraped
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="mt-8 rounded-lg border bg-background">
                <div className="flex items-center justify-end border-b px-6 py-4">
                  <Button onClick={() => setUploadDialogOpen(true)}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Add New
                  </Button>
                </div>

                <Table
                  className="min-w-[1100px]"
                  containerClassName="show-scrollbar max-h-[60vh] overflow-x-scroll overflow-y-scroll"
                >
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-6 py-4 font-medium">Name</TableHead>
                      <TableHead className="px-6 py-4 font-medium">Knowledge Base</TableHead>
                      <TableHead className="px-6 py-4 font-medium">Source</TableHead>
                      <TableHead className="px-6 py-4 font-medium">Type</TableHead>
                      <TableHead className="px-6 py-4 font-medium">Size</TableHead>
                      <TableHead className="px-6 py-4 font-medium">Status</TableHead>
                      <TableHead className="px-6 py-4 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {(() => {
                      if (isLoadingFiles) {
                        return (
                          <TableRow>
                            <TableCell className="h-24 text-center" colSpan={7}>
                              Loading files...
                            </TableCell>
                          </TableRow>
                        );
                      }

                      if (filteredFiles.length === 0) {
                        return (
                          <TableRow>
                            <TableCell className="h-24 text-center" colSpan={7}>
                              No files found
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return filteredFiles.map((file) => (
                        <TableRow className="hover:bg-muted/50" key={file.id}>
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-3">
                                <FileIcon className="h-4 w-4" />
                                <span className="font-medium">{file.name}</span>
                              </div>
                              <span className="text-sm text-muted-foreground ml-7">
                                Original: {file.originalFilename ?? file.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge variant="secondary">
                              {getKnowledgeBaseName(file.knowledgeBaseId)}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {file.sourceType === "scraped" ? (
                              <Badge variant="default" className="gap-1">
                                <GlobeIcon className="h-3 w-3" />
                                Scraped
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <UploadIcon className="h-3 w-3" />
                                Uploaded
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className="uppercase" variant="outline">
                              {file.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-muted-foreground">
                            {file.size}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            {file.status === "ready" && (
                              <Badge
                                variant="default"
                                className="gap-1 bg-green-500 hover:bg-green-600"
                              >
                                <CheckCircle2Icon className="h-3 w-3" />
                                Ready
                              </Badge>
                            )}
                            {file.status === "processing" && (
                              <Badge variant="secondary" className="gap-1">
                                <Loader2Icon className="h-3 w-3 animate-spin" />
                                Processing
                              </Badge>
                            )}
                            {file.status === "deleting" && (
                              <Badge variant="secondary" className="gap-1">
                                <Loader2Icon className="h-3 w-3 animate-spin" />
                                Deleting
                              </Badge>
                            )}
                            {file.status === "error" && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertCircleIcon className="h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button className="size-8 p-0" size="sm" variant="ghost">
                                  <MoreHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {file.status === "error" && (
                                  <DropdownMenuItem onClick={() => handleRetryClick(file)}>
                                    <RefreshCwIcon className="size-4 mr-2" />
                                    Retry Processing
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  disabled={file.status === "deleting"}
                                  onClick={() => handleDeleteClick(file)}
                                >
                                  <TrashIcon className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
