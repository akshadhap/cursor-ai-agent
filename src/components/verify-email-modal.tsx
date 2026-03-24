"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";

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
import { authClient } from "@/lib/auth-client";

const verifySchema = z.object({
  code: z.string().min(6, "Verification code must be at least 6 characters"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
  password?: string;
  autoLogin?: boolean;
};

export default function VerifyEmailModal({
  open,
  onOpenChange,
  userId,
  email,
  password,
  autoLogin = false,
}: Props) {
  const [resending, setResending] = useState(false);

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const isPending = form.formState.isSubmitting;

  // ---------------- VERIFY CODE ----------------
  const onSubmit = async (values: VerifyFormValues) => {
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          code: values.code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }

      toast.success("Email verified successfully");

      // 🔁 AUTO LOGIN (LOGIN FLOW ONLY)
      if (autoLogin && password) {
        await authClient.signIn.email({ email, password });
        window.location.href = "/workflows";
      } else {
        window.location.href = "/login";
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }
  };

  // ---------------- RESEND CODE ----------------
  const handleResend = async () => {
    try {
      setResending(true);

      await fetch("/api/auth/resend-verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId }),
      });

      toast.success("Verification code resent");
    } catch {
      toast.error("Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify your email</DialogTitle>
          <DialogDescription>
            We've sent a verification code to <b>{email}</b>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter 6-digit code"
                      autoComplete="one-time-code"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Verifying..." : "Verify Email"}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-xs underline text-center w-full"
            >
              {resending ? "Resending..." : "Resend code"}
            </button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
