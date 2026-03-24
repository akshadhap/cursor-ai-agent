// src/features/executions/components/agent/outreach/dialog.tsx
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
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * UX requirement:
 *  - Only show subject + body template
 *  - All other config (inputPath, variableName, etc.) are internal defaults,
 *    handled in the executor.
 */
const formSchema = z.object({
  subjectTemplate: z.string().min(1, "Subject is required"),
  bodyTemplate: z.string().min(1, "Body is required"),
});

export type OutreachFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OutreachFormValues) => void;
  defaultValues?: Partial<OutreachFormValues>;
}

export const LeadOutreachDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<OutreachFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subjectTemplate:
        defaultValues.subjectTemplate ||
        "Quick question about what you're building",
      bodyTemplate:
        defaultValues.bodyTemplate ||
        "I wanted to reach out and follow up on our previous conversation. Let me know if you would like more details or have any questions.",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        subjectTemplate:
          defaultValues.subjectTemplate ||
          "Quick question about what you're building",
        bodyTemplate:
           defaultValues.bodyTemplate ||
        "I wanted to follow up and see if you had a chance to review my earlier message. Feel free to reply whenever it’s convenient.",
    });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: OutreachFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
  <DialogTitle>Cold Outreach</DialogTitle>
  <DialogDescription>
    Write the subject and body for the cold outreach email that will be sent to your leads.
  </DialogDescription>
</DialogHeader>


        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6 mt-4"
          >
            {/* Subject template */}
            {/* Subject */}
<FormField
  control={form.control}
  name="subjectTemplate"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email subject</FormLabel>
      <FormControl>
        <Input placeholder="e.g. Quick question about what you're building" {...field} />
      </FormControl>
      <FormDescription>
        This subject will be used for your cold outreach emails.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>


            {/* Body template */}
          {/* Body */}
<FormField
  control={form.control}
  name="bodyTemplate"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email body</FormLabel>
      <FormControl>
        <Textarea
          rows={10}
          placeholder={`Hi there,

I came across what you're working on and thought this might be relevant...`}
          {...field}
        />
      </FormControl>
      <FormDescription>
        This is the main content of the email that will be sent to each lead.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>


            <DialogFooter className="mt-4">
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
