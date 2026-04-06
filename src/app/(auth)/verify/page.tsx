"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [resending, setResending] = useState(false);

  const userId = searchParams.get("userId") || "";
  const email = searchParams.get("email") || "";
  const password = searchParams.get("password") || "";
  const autoLogin = searchParams.get("autoLogin") === "true";
  const redirectUrl = searchParams.get("redirect") || "/workflows";

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const isPending = form.formState.isSubmitting;

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      router.push("/login");
    }
  }, [userId, router]);

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
        window.location.href = redirectUrl;
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

  if (!userId) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            We've sent a verification code to <b>{email}</b>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
