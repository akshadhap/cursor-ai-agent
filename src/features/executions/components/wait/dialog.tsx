// src/app/features/executions/components/wait/dialog.tsx
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
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  delayDays: z.coerce.number().int().min(0).default(0),
  delayHours: z.coerce.number().int().min(0).max(23).default(0),
  delayMinutes: z.coerce.number().int().min(0).max(59).default(0),
});

export type WaitFormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: WaitFormValues) => void;
  defaultValues?: Partial<WaitFormValues>;
}

export const WaitDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: Props) => {
  const form = useForm<WaitFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      delayDays: 0,
      delayHours: 0,
      delayMinutes: 0,
      ...defaultValues, // safely override with incoming values
    },
  });

  // Reset form whenever dialog opens or defaultValues change
  useEffect(() => {
    if (open) {
      form.reset({
        delayDays: defaultValues?.delayDays ?? 0,
        delayHours: defaultValues?.delayHours ?? 0,
        delayMinutes: defaultValues?.delayMinutes ?? 0,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: WaitFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wait Configuration</DialogTitle>
          <DialogDescription>
            Pause the workflow before running the next node.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 overflow-y-auto max-h-[60vh]">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-8 mt-4"
            >
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="delayDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Days</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delayHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={23} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delayMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minutes</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={59} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormDescription className="text-xs text-muted-foreground">
                Total delay = days × 24h + hours + minutes.
              </FormDescription>

              <DialogFooter className="mt-6">
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};