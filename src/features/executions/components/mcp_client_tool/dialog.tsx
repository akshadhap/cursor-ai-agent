"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MonitorCog, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { z } from "zod";

// form schema
const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message: "Must start with a letter/_ and contain only letters, numbers, _ or $",
    }),
  serverUrl: z.string().url("Must be a valid URL").min(1, "Server URL is required"),
  toolName: z.string().min(1, "Tool name is required"),
  argsJson: z.string().optional(),
  apiKey: z.string().optional(),
  timeout: z.string().optional(), // Changed to string to avoid React Hook Form Control type issues
  retryOnError: z.string().optional(), // Changed to string
});

export type McpClientToolFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: McpClientToolFormValues) => void;
  defaultValues?: Partial<McpClientToolFormValues>;
}

export const McpClientToolDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<McpClientToolFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "mcpToolResult",
      serverUrl: defaultValues.serverUrl ?? "",
      toolName: defaultValues.toolName ?? "",
      argsJson: defaultValues.argsJson ?? "{}",
      apiKey: defaultValues.apiKey ?? "",
      timeout: defaultValues.timeout ?? "30",
      retryOnError: defaultValues.retryOnError ?? "false",
    },
  });

  // Reset when dialog re-opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName ?? "mcpToolResult",
        serverUrl: defaultValues.serverUrl ?? "",
        toolName: defaultValues.toolName ?? "",
        argsJson: defaultValues.argsJson ?? "{}",
        apiKey: defaultValues.apiKey ?? "",
        timeout: defaultValues.timeout ?? "30",
        retryOnError: defaultValues.retryOnError ?? "false",
      });
    }
  }, [open, defaultValues, form]);

  const watchedVarName = form.watch("variableName") || "mcpToolResult";

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <MonitorCog className="size-5" />
            <DialogTitle>MCP Client Tool</DialogTitle>
          </div>
          <DialogDescription>
            Execute a specific tool from an MCP server. The tool will be called with the provided arguments.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Variable Name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store result as</FormLabel>
                  <FormControl>
                    <Input placeholder="mcpToolResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Access result later as <code className="bg-muted px-1 rounded">{`{{${watchedVarName}}}`}</code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Server URL */}
            <FormField
              control={form.control}
              name="serverUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MCP Server URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://your-mcp-server.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    The base URL of your MCP server (e.g., http://localhost:3001)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tool Name */}
            <FormField
              control={form.control}
              name="toolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool Name</FormLabel>
                  <FormControl>
                    <Input placeholder="searchFiles, readDocument, etc." {...field} />
                  </FormControl>
                  <FormDescription>
                    The exact name of the MCP tool to execute
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Arguments JSON */}
            <FormField
              control={form.control}
              name="argsJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arguments (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={'{\n  "query": "{{searchTerm}}",\n  "limit": 10\n}'}
                      className="font-mono text-sm min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    JSON object with tool arguments. Supports Handlebars templates like {`{{variable}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API Key */}
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key (optional)</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Bearer token or API key" {...field} />
                  </FormControl>
                  <FormDescription>
                    Authentication token sent as Authorization header
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Timeout */}
            <FormField
              control={form.control}
              name="timeout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timeout (seconds)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      placeholder="30"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum time to wait for the tool response (1-300 seconds)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Save Configuration
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
