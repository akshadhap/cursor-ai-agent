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
import { useTheme } from "next-themes";
import Image from "next/image";

const airtableFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().min(1, "Credential is required"),
  resource: z.enum(["base", "record"]),
  operation: z.string().min(1, "Operation is required"),
  baseId: z.string().optional(),
  tableIdOrName: z.string().optional(),
  recordId: z.string().optional(),
  fields: z.string().optional(),
  filterByFormula: z.string().optional(),
  maxRecords: z.string().optional(),
  view: z.string().optional(),
});

export type AirtableFormValues = z.infer<typeof airtableFormSchema>;

type AirtableDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AirtableFormValues) => void;
  defaultValues?: Partial<AirtableFormValues>;
};

export const AirtableDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: AirtableDialogProps) => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
  } = useCredentialsByType(CredentialType.AIRTABLE);

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const form = useForm<AirtableFormValues>({
    resolver: zodResolver(airtableFormSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "airtableResult",
      credentialId: defaultValues?.credentialId || "",
      resource: defaultValues?.resource || "record",
      operation: defaultValues?.operation || "list",
      baseId: defaultValues?.baseId || "",
      tableIdOrName: defaultValues?.tableIdOrName || "",
      recordId: defaultValues?.recordId || "",
      fields: defaultValues?.fields || "",
      filterByFormula: defaultValues?.filterByFormula || "",
      maxRecords: defaultValues?.maxRecords || "100",
      view: defaultValues?.view || "",
    },
  });

  const resource = form.watch("resource");
  const operation = form.watch("operation");

  const getOperations = () => {
    const operations: Record<string, { value: string; label: string }[]> = {
      base: [
        { value: "list", label: "List Bases" },
        { value: "getSchema", label: "Get Schema" },
      ],
      record: [
        { value: "list", label: "List Records" },
        { value: "get", label: "Get Record" },
        { value: "create", label: "Create Record" },
        { value: "update", label: "Update Record" },
        { value: "delete", label: "Delete Record" },
      ],
    };
    return operations[resource] || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Airtable Node</DialogTitle>
          <DialogDescription>
            Work with Airtable bases, tables, and records
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
                    <Input placeholder="airtableResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Name to store the result (e.g., airtableResult)
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
                  <FormLabel>Airtable Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Airtable credential" />
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
                                src="/logos/airtable.svg"
                                alt="Airtable"
                                width={16}
                                height={16}
                                unoptimized
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
                    Select your Airtable Personal Access Token credential
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
                      <SelectItem value="base">Base</SelectItem>
                      <SelectItem value="record">Record</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the Airtable resource type
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

            {/* Base ID - required for most operations */}
            {(resource === "base" && operation === "getSchema") || resource === "record" ? (
              <FormField
                control={form.control}
                name="baseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base ID</FormLabel>
                    <FormControl>
                      <Input placeholder="appXXXXXXXXXXXXXX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Your Airtable Base ID (starts with "app")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {/* Table ID or Name - for record operations */}
            {resource === "record" && (
              <FormField
                control={form.control}
                name="tableIdOrName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table ID or Name</FormLabel>
                    <FormControl>
                      <Input placeholder="tblXXXXXXXXXXXXXX or Table Name" {...field} />
                    </FormControl>
                    <FormDescription>
                      Table ID (starts with "tbl") or the table name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Record ID - for get, update, delete */}
            {resource === "record" && ["get", "update", "delete"].includes(operation) && (
              <FormField
                control={form.control}
                name="recordId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record ID</FormLabel>
                    <FormControl>
                      <Input placeholder="recXXXXXXXXXXXXXX" {...field} />
                    </FormControl>
                    <FormDescription>
                      Record ID (starts with "rec")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Fields - for create and update */}
            {resource === "record" && ["create", "update"].includes(operation) && (
              <FormField
                control={form.control}
                name="fields"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fields (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"Name": "New Record", "Status": "Active"}'
                        className="min-h-[100px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Record fields as JSON (supports Handlebars templates)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Filter By Formula - for list */}
            {resource === "record" && operation === "list" && (
              <>
                <FormField
                  control={form.control}
                  name="filterByFormula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filter By Formula (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="{Status} = 'Active'" {...field} />
                      </FormControl>
                      <FormDescription>
                        Airtable formula to filter records
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxRecords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Records</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" {...field} />
                      </FormControl>
                      <FormDescription>
                        Maximum number of records to return
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="view"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>View (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Grid view" {...field} />
                      </FormControl>
                      <FormDescription>
                        Name of the view to use
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
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
