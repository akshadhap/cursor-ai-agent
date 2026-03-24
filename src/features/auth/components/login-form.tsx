
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Moon, Sun, Eye, EyeOff } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

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

import VerifyEmailModal from "@/components/verify-email-modal";
import UpdatePasswordModal from "@/components/update-password-modal";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginForm() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [showPassword, setShowPassword] = useState(false);

  const [verifyUserId, setVerifyUserId] = useState<string | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState<string>("");
  const [verifyPassword, setVerifyPassword] = useState<string>("");

  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateEmail, setUpdateEmail] = useState<string>("");
  const [updateOldPassword, setUpdateOldPassword] = useState<string>("");

  const form = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isPending = form.formState.isSubmitting;

  // --------------------------------------------------
  // AUTH ERROR MAPPER (IMPORTANT)
  // --------------------------------------------------
  const getLoginErrorMessage = (error: any): string => {
    const message =
      error?.message ||
      error?.data?.message ||
      error?.response?.data?.message ||
      "";

    const reason =
      error?.reason ||
      error?.response?.data?.reason ||
      "";

    // Invalid credentials (most common)
    if (
      message.includes("upstream request failed") ||
      message.includes("403") ||
      message.includes("401") ||
      reason.includes("FORBIDDEN") ||
      reason.includes("UNAUTHORIZED")
    ) {
      return "Invalid email or password";
    }

    // Account disabled / locked
    if (message.toLowerCase().includes("disabled")) {
      return "Your account is disabled. Please contact support.";
    }

    return "Login failed. Please try again.";
  };

  // ---------------------------------------------
  // EMAIL + PASSWORD LOGIN
  // ---------------------------------------------
  const onSubmit = async (values: LoginFormValues) => {
    if (!values.email || !values.password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      const res: any = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      const actions: string[] = Array.isArray(res?.data?.actions)
        ? res.data.actions
        : res?.data?.action
          ? [res.data.action]
          : [];

      const needsVerify = actions.includes("VERIFY_EMAIL");
      const needsUpdatePassword = actions.includes("UPDATE_PASSWORD");

      if (actions.length > 0) {
        setVerifyUserId(res.data?.userId ?? null);
        setVerifyEmail(values.email);

        if (needsUpdatePassword) {
          setUpdateEmail(values.email);
          setUpdateOldPassword(values.password);
          setUpdateOpen(true);
          toast.info("You must update your password before continuing.");
          return;
        }

        if (needsVerify) {
          setVerifyPassword(values.password);
          setVerifyOpen(true);
          toast.info("Please verify your email with the code sent to your inbox");
          return;
        }
      }

      if (!res.ok) {
        console.error("Login failed details:", {
            status: res.status,
            data: res.data,
            headers: res.headers
        });
        const errorMessage = res.data?.error || res.data?.message || res.data?.reason || `Login failed (${res.status})`;
        throw new Error(errorMessage);
      }

      toast.success("Login successful!");
      router.push("/workflows");
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(getLoginErrorMessage(error));
    }
  };

  const handleUpdateCompleted = async (newPassword: string) => {
    try {
      await authClient.signIn.email({
        email: updateEmail,
        password: newPassword,
      });
      window.location.href = "/workflows";
    } catch (err: any) {
      toast.error(getLoginErrorMessage(err));
    }
  };

  /* --------------------------------------------------
     HYDRATION FIX
  -------------------------------------------------- */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // Prevents ID mismatch during hydration
  }

  return (
    <div className="flex flex-col gap-6">

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Login to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="grid gap-6">
                  {/* EMAIL */}
                  <FormField
                    control={form.control}
                    name="email"
                    rules={{ required: "Email is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="m@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* PASSWORD */}
                  <FormField
                    control={form.control}
                    name="password"
                    rules={{ required: "Password is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Password</FormLabel>
                          <Link
                            href="/forgot-password"
                            className="text-xs underline underline-offset-4"
                          >
                            Forgot password?
                          </Link>
                        </div>

                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="********"
                              {...field}
                              className="pr-10"
                            />

                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                              aria-label={
                                showPassword
                                  ? "Hide password"
                                  : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? "Logging in..." : "Login"}
                  </Button>
                </div>

                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/signup"
                    className="underline underline-offset-4"
                  >
                    Sign up
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Theme toggle */}
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full shadow-lg"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      {/* Verification Modal */}
      <VerifyEmailModal
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        userId={verifyUserId || ""}
        email={verifyEmail}
        password={verifyPassword}
        autoLogin
      />

      {/* Update Password Modal */}
      <UpdatePasswordModal
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        email={updateEmail}
        oldPassword={updateOldPassword}
        onCompleted={handleUpdateCompleted}
      />
    </div>
  );
}
