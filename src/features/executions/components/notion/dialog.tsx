"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";

const notionFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().min(1, "Credential is required"),
  resource: z.enum(["database", "databasePage", "page", "block"]),
  operation: z.string().min(1, "Operation is required"),
  // Database operations
  databaseId: z.string().optional(),
  searchQuery: z.string().optional(),
  // Database Page operations
  title: z.string().optional(),
  content: z.string().optional(),
  properties: z.string().optional(),
  filter: z.string().optional(),
  // Page operations
  pageId: z.string().optional(),
  parentPageId: z.string().optional(),
  // Block operations
  blockId: z.string().optional(),
  blockType: z.string().optional(),
  blockContent: z.string().optional(),
});

export type NotionFormValues = z.infer<typeof notionFormSchema>;

type NotionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: NotionFormValues) => void;
  defaultValues?: Partial<NotionFormValues>;
};

export const NotionDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: NotionDialogProps) => {
  const { 
    data: credentials,
    isLoading: isLoadingCredentials,
  } = useCredentialsByType(CredentialType.NOTION);

  const form = useForm<NotionFormValues>({
    resolver: zodResolver(notionFormSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "",
      credentialId: defaultValues?.credentialId || "",
      resource: defaultValues?.resource || "databasePage",
      operation: defaultValues?.operation || "create",
      databaseId: defaultValues?.databaseId || "",
      searchQuery: defaultValues?.searchQuery || "",
      title: defaultValues?.title || "",
      content: defaultValues?.content || "",
      properties: defaultValues?.properties || "",
      filter: defaultValues?.filter || "",
      pageId: defaultValues?.pageId || "",
      parentPageId: defaultValues?.parentPageId || "",
      blockId: defaultValues?.blockId || "",
      blockType: defaultValues?.blockType || "paragraph",
      blockContent: defaultValues?.blockContent || "",
    },
  });

  const resource = form.watch("resource");
  const operation = form.watch("operation");

  // Get available operations for selected resource
  const getOperations = () => {
    const operations: Record<string, { value: string; label: string }[]> = {
      database: [
        { value: "get", label: "Get" },
        { value: "getMany", label: "Get Many" },
        { value: "search", label: "Search" },
      ],
      databasePage: [
        { value: "create", label: "Create" },
        { value: "get", label: "Get" },
        { value: "getMany", label: "Get Many" },
        { value: "update", label: "Update" },
      ],
      page: [
        { value: "archive", label: "Archive" },
        { value: "create", label: "Create" },
        { value: "search", label: "Search" },
      ],
      block: [
        { value: "append", label: "Append After" },
        { value: "getChildren", label: "Get Child Blocks" },
      ],
    };
    return operations[resource] || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Notion Node</DialogTitle>
          <DialogDescription>
            Work with Notion databases, pages, and blocks
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="notionResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Name to store the result (e.g., notionResult)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notion Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Notion credential" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingCredentials ? (
                        <SelectItem value="loading" disabled>
                          Loading credentials...
                        </SelectItem>
                      ) : credentials && credentials.length > 0 ? (
                        credentials.map((credential) => (
                          <SelectItem key={credential.id} value={credential.id}>
                            <div className="flex items-center gap-2">
                              <Image
                                src="/logos/notion.svg"
                                alt="Notion"
                                width={16}
                                height={16}
                              />
                              {credential.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No credentials found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select your Notion API credential
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a resource" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="database">Database</SelectItem>
                      <SelectItem value="databasePage">Database Page</SelectItem>
                      <SelectItem value="page">Page</SelectItem>
                      <SelectItem value="block">Block</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the Notion resource type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getOperations().map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the operation to perform
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Database ID - shown for database operations */}
            {((resource === "database" && ["get"].includes(operation)) || 
              (resource === "databasePage" && ["create", "getMany"].includes(operation))) && (
              <FormField
                control={form.control}
                name="databaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Database ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="abc123def456..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Your Notion database ID (found in the database URL)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Search Query - for search operations */}
            {((resource === "database" && operation === "search") ||
              (resource === "page" && operation === "search")) && (
              <FormField
                control={form.control}
                name="searchQuery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Query</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Search term..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Text to search for in titles and content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Page ID - shown for page/block operations */}
            {((resource === "databasePage" && ["get", "update"].includes(operation)) ||
              (resource === "page" && operation === "archive") ||
              (resource === "block")) && (
              <FormField
                control={form.control}
                name="pageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page ID</FormLabel>
                    <FormControl>
                      <Input placeholder="xyz789..." {...field} />
                    </FormControl>
                    <FormDescription>
                      The Notion page ID (for block operations, this is the parent page)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Parent Page ID - for page creation */}
            {resource === "page" && operation === "create" && (
              <FormField
                control={form.control}
                name="parentPageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Page ID</FormLabel>
                    <FormControl>
                      <Input placeholder="parent-page-id..." {...field} />
                    </FormControl>
                    <FormDescription>
                      The page where this new page will be created as a child
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Title - for page/database page creation */}
            {((resource === "databasePage" && operation === "create") ||
              (resource === "page" && operation === "create")) && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="New Task from {{workflow}}"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Title for the new page (supports Handlebars templates)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Properties - for database page create/update */}
            {resource === "databasePage" && ["create", "update"].includes(operation) && (
              <FormField
                control={form.control}
                name="properties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Properties (JSON, Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"Status": {"status": {"name": "Done"}}}'
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Notion properties in JSON format (supports Handlebars templates)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Filter - for database page getMany */}
            {resource === "databasePage" && operation === "getMany" && (
              <FormField
                control={form.control}
                name="filter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filter (JSON, Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"property": "Status", "status": {"equals": "Done"}}'
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Filter to apply when querying pages (leave empty for all pages)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Content - for page creation */}
            {((resource === "databasePage" && operation === "create") ||
              (resource === "page" && operation === "create")) && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Page content..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Content for the page (supports Handlebars templates)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Block Type - for block append */}
            {resource === "block" && operation === "append" && (
              <FormField
                control={form.control}
                name="blockType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Block Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select block type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="paragraph">Paragraph</SelectItem>
                        <SelectItem value="heading_1">Heading 1</SelectItem>
                        <SelectItem value="heading_2">Heading 2</SelectItem>
                        <SelectItem value="heading_3">Heading 3</SelectItem>
                        <SelectItem value="bulleted_list_item">Bullet List</SelectItem>
                        <SelectItem value="numbered_list_item">Numbered List</SelectItem>
                        <SelectItem value="to_do">To-Do</SelectItem>
                        <SelectItem value="code">Code Block</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Type of block to append
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Block Content - for block append */}
            {resource === "block" && operation === "append" && (
              <FormField
                control={form.control}
                name="blockContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Block Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Block content..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Content to append as a block (supports Handlebars templates)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
