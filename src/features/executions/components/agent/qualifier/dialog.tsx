// src/features/executions/components/agent/qualifier/dialog.tsx
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

import { useForm } from "react-hook-form";
import { useEffect } from "react";

export type QualifierFormValues = {
  minimumScore: number;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: QualifierFormValues) => void;
  defaultValues?: Partial<QualifierFormValues>;
}

export const LeadQualifierDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const form = useForm<QualifierFormValues>({
    // 👇 no resolver at all
    defaultValues: {
      minimumScore: defaultValues.minimumScore ?? 70,
    },
  });

  // Reset when dialog opens with new defaults
  useEffect(() => {
    if (open) {
      form.reset({
        minimumScore: defaultValues.minimumScore ?? 70,
      });
    }
  }, [open, defaultValues, form]);

  const handleSubmit = (values: QualifierFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border border-border/60 from-background to-muted/40 shadow-xl">
        <DialogHeader className="space-y-2">
          <DialogTitle>Lead Qualifier</DialogTitle>
          <DialogDescription>
            Set the minimum score to treat a lead as qualified.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-8 mt-4"
          >
            <FormField
              control={form.control}
              name="minimumScore"
              // ✅ use RHF validation rules instead of resolver
              rules={{
                required: "Minimum score is required",
                min: {
                  value: 0,
                  message: "Must be at least 0",
                },
                max: {
                  value: 100,
                  message: "Must be at most 100",
                },
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualified score ≥</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={field.value ?? ""} // handle undefined while typing
                      onChange={(e) => {
                        const val = e.target.value;
                        // convert to number but allow empty for user editing
                        field.onChange(
                          val === "" ? undefined : Number(val)
                        );
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Leads with a score greater than or equal to this value will
                    be considered qualified.
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
