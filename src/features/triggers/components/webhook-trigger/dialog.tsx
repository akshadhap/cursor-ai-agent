"use client";

import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { CopyIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

const formSchema = z.object({
  outputVariable: z
    .string()
    .min(1, { message: "Output variable is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  // you can add more fields here later:
  // description: z.string().optional(),
});

export type WebhookTriggerFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WebhookTriggerFormValues) => void;
  defaultValues?: Partial<WebhookTriggerFormValues>;
}

export const WebhookTriggerDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const params = useParams();
  const workflowId = params.workflowId as string;

  // Use window.location.origin in browser (works without env var)
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_APP_URL || '';
  const webhookUrl = `${baseUrl}/api/webhooks/webhook?workflowId=${workflowId}`;

  const form = useForm<WebhookTriggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      outputVariable: defaultValues.outputVariable || "webhook",
    },
  });

  // keep form in sync when reopening with different defaults
  useEffect(() => {
    if (open) {
      form.reset({
        outputVariable: defaultValues.outputVariable || "webhook",
      });
    }
  }, [open, defaultValues, form]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL copied to clipboard");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  const handleSubmit = (values: WebhookTriggerFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const watchOutputVariable = form.watch("outputVariable") || "webhook";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhook Trigger Configuration</DialogTitle>
          <DialogDescription>
            Use this URL in any frontend or backend to trigger this workflow
            with a simple HTTP POST.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Webhook URL section */}
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={copyToClipboard}
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* Config form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="outputVariable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output Variable</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="webhook"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The whole webhook body will be stored under this name in the
                      workflow context. For example, you can use:
                      <br />
                      <code className="text-xs">
                        {`{{json ${watchOutputVariable}}}`}
                      </code>{" "}
                      or{" "}
                      <code className="text-xs">
                        {`{{${watchOutputVariable}.raw.email}}`}
                      </code>
                      .
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Example usage */}
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm text-muted-foreground">
                <p className="font-medium">Example usage from another frontend:</p>
                <pre className="whitespace-pre-wrap break-words text-xs">
{`fetch("${webhookUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
});`}
                </pre>
              </div>

              <DialogFooter className="mt-2">
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
