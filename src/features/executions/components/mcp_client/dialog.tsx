"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
import { Button } from "@/components/ui/button";

import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";

const METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, "Variable name is required")
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Must start with a letter/_ and contain only letters, numbers, _ or $",
    }),
  serverUrl: z.string().url("Must be a valid URL").min(1, "Server URL is required"),
  endpoint: z.string().min(1, "Endpoint is required"),
  method: z.enum(METHODS),
  payload: z.string().optional(),
  apiKey: z.string().optional(),
});

export type McpClientFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: McpClientFormValues) => void;
  defaultValues?: Partial<McpClientFormValues>;
}

export const McpClientDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<McpClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName ?? "mcpResult",
      serverUrl: defaultValues.serverUrl ?? "",
      endpoint: defaultValues.endpoint ?? "",
      method: defaultValues.method ?? "POST",
      payload: defaultValues.payload ?? "",
      apiKey: defaultValues.apiKey ?? "",
    },
  });

  // Reset when dialog re-opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName ?? "mcpResult",
        serverUrl: defaultValues.serverUrl ?? "",
        endpoint: defaultValues.endpoint ?? "",
        method: defaultValues.method ?? "POST",
        payload: defaultValues.payload ?? "",
        apiKey: defaultValues.apiKey ?? "",
      });
    }
  }, [open, defaultValues, form]);

  const watchedVarName = form.watch("variableName") || "mcpResult";

  const handleSubmit = (values: McpClientFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>MCP Client</DialogTitle>
          <DialogDescription>
            Configure the MCP tool server request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Variable name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store result as</FormLabel>
                  <FormControl>
                    <Input placeholder="mcpResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Later you can access it as{" "}
                    <code>{`{{${watchedVarName}.response}}`}</code>
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
                    The base URL of your MCP server.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Endpoint */}
            <FormField
              control={form.control}
              name="endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint (path)</FormLabel>
                  <FormControl>
                    <Input placeholder="/tools/call" {...field} />
                  </FormControl>
                  <FormDescription>
                    The API path to call on the server.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Method */}
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>HTTP method</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded border px-2 py-1 bg-background"
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(e.target.value as (typeof METHODS)[number])
                      }
                    >
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API key */}
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API key (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Sent as Bearer token"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Will be sent as{" "}
                    <code>Authorization: Bearer &lt;apiKey&gt;</code>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payload */}
            <FormField
              control={form.control}
              name="payload"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payload (JSON, optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="font-mono text-sm min-h-[80px]"
                      placeholder={`{"query": "Hello {{user.name}}"} `}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This is JSON. You can reference workflow values, e.g.{" "}
                    <code>{"{{previousNode.text}}"}</code>.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
