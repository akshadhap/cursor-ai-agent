"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  oldPassword: string;
  onCompleted?: (newPassword: string) => void;
};

export default function UpdatePasswordModal({ open, onOpenChange, email, oldPassword, onCompleted }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const isPending = form.formState.isSubmitting;

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/auth/email/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          oldPassword,
          newPassword: values.newPassword,
        }),
      });

      // Try to parse JSON first, fall back to text
      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        try {
          data = { message: await res.text() };
        } catch (e2) {
          data = { message: "Unknown error" };
        }
      }

      if (!res.ok) {
        console.error("Update password failed", { status: res.status, body: data });
        const msg = data?.error || data?.message || "Failed to update password";
        toast.error(msg);
        return;
      }

      toast.success("Password updated successfully");
      onOpenChange(false);
      if (onCompleted) onCompleted(values.newPassword);
    } catch (err: any) {
      console.error("Update password error", err);
      toast.error(err?.message || "Failed to update password");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update your password</DialogTitle>
          <DialogDescription>Set a new password for <b>{email}</b></DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="New password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Confirm password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Updating..." : "Update password"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
