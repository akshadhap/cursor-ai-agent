"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { Check, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { WorkflowBuilderAnimation } from "./animations/WorkflowBuilderAnimation";
import { ChatbotBuilderAnimation } from "./animations/ChatbotBuilderAnimation";
import { SLMAnimation } from "./animations/SLMAnimation";
import { VoiceAgentAnimation } from "./animations/VoiceAgentAnimation";
import { EmailVerificationAnimation } from "./animations/EmailVerificationAnimation";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    entityName: z.string().min(1, "Entity name is required"),
    entityEmail: z.string().email("Please enter a valid email address"),
    // entityWebsite: z.string().optional(),
   entityWebsite: z
  .string()
  .min(1, "Entity website is required")
  .refine(
    (val) => /^https?:\/\/.+\..+/.test(val),
    { message: "Website must be a valid URL (e.g. https://www.example.com)" }
  ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    countryCode: z.string(),
    phoneNumber: z.string().min(1, "Phone number is required"),
    street: z.string().min(1, "Street is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    zipCode: z.string().min(1, "Zip code is required"),
    notARobot: z.boolean().refine((val) => val === true, {
      message: "Please confirm you're not a robot",
    }),
    verificationCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const steps = [
  { id: 1, name: "Personal Info", description: "Tell us about yourself" },
  { id: 2, name: "Company Details", description: "Your organization information" },
  { id: 3, name: "Security", description: "Create a secure password" },
  { id: 4, name: "Contact & Address", description: "How can we reach you?" },
  { id: 5, name: "Verify Email", description: "Confirm your email address" },
];

export function RegisterForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const { theme, setTheme } = useTheme();
  const [userId, setUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false)

  const createEntity = useMutation(api.public.entities.createEntity);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      entityName: "",
      entityEmail: "",
      entityWebsite: "",
      password: "",
      confirmPassword: "",
      countryCode: "us +1",
      phoneNumber: "",
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
      notARobot: false,
      verificationCode: "",
    },
    mode: "onChange",
  });

  // --- functionality unchanged ---
  const signInGithub = async () => {
    try {
      await authClient.signIn.social({ provider: "github" });
      router.push("/");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const signInGoogle = async () => {
    try {
      await authClient.signIn.social({ provider: "google" });
      router.push("/");
    } catch {
      toast.error("Something went wrong");
    }
  };



const getSignupErrorMessage = (error: any): string => {
  // Case 1: authClient throws a structured object
  if (error?.status === 409) {
    return "An account with this email, or website already exists.";
  }

  // Case 2: authClient throws fetch-like error
  if (error?.message?.includes("409")) {
    return "An account with this email, or website already exists.";
  }

  // Case 3: backend error payload
  if (typeof error?.data?.error === "string") {
    return error.data.error;
  }

  // Case 4: normal Error
  if (typeof error?.message === "string") {
    return error.message;
  }

  return "Signup failed. Please try again.";
};




  const onSubmit = async (values: RegisterFormValues) => {
    // Step 5: Verify email
    if (currentStep === 5) {
      if (!userId || !values.verificationCode) {
        toast.error("Verification code is required");
        return;
      }

      try {
        const res = await fetch(`/api/auth/verify-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            code: values.verificationCode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Verification failed");
          return;
        }


        
        const resp : any= await authClient.signIn.email({
                email: values.entityEmail,
                password: values.password,
              });

        if(!resp.ok){
          toast.error("login failed");
        }      

        toast.success("Account created and verified successfully!");
        router.push("/workflows");
        
        // router.push("/login")
      } catch (error: any) {
        // toast.error(error.message || "Verification failed");
        toast.error(getSignupErrorMessage(error));

      }
      return;
    }

    // Step 4: Create account and send verification email
    try {

      const formatPhone = (countryCodeStr: string, phone: string) => {
        // Extract the dial code portion (e.g. "+1" from "us +1")
       const dialMatch = countryCodeStr.match(/\+?\d+/);
        const dial = dialMatch ? dialMatch[0] : "";
        // Remove all non-digit characters from phone
        const digits = phone.replace(/\D/g, "");
        // Ensure result has a leading +
        const result = `${dial.startsWith("+") ? "" : "+"}${dial}${digits}`.replace(/\+\+/, "+");
        return result;
      };

      const normalizedPhone = formatPhone(values.countryCode, values.phoneNumber);
      if (!/^\+?[0-9]{7,15}$/.test(normalizedPhone)) {
        toast.error("Phone number is invalid. Please enter a valid number.");
        return;
      }
      const payload = {
        email: values.entityEmail,
        username: values.entityEmail,
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password,

        entityName: values.entityName,
        websiteUrl: values.entityWebsite || "",

        phoneNumber: normalizedPhone,

        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          zipCode: values.zipCode,
          country: values.country,
        },

        autoRechargeEnabled: false,
      };
      console.log("🚀 Signing up user:", payload);

      // Step 1: Signup with Keycloak FIRST to get userId
      let keycloakUserId = null;
      try {
        const response = await authClient.signUp.email(payload as any);
        console.log("Keycloak signup response:", response);

        if (response && "userId" in response) {
          keycloakUserId = (response as any).userId;
          console.log("✅ Keycloak signup complete, userId:", keycloakUserId);
        } else {
          toast.error("Signup failed - no user ID returned from Keycloak");
          return;
        }
      } catch (keycloakError: any) {
        console.error("❌ Keycloak signup failed:", keycloakError);
        toast.error(getSignupErrorMessage(keycloakError));
        return;
      }

      // Step 2: Create entity in Convex with userId from Keycloak
      let createdEntityId = null;
      let createdEmployeeId = null;
      try {
        const entityResult = await createEntity({
          name: values.entityName,
          email: values.entityEmail,
          firstName: values.firstName,
          lastName: values.lastName,
          phoneNumber: normalizedPhone,
          websiteUrl: values.entityWebsite || undefined,
          address: {
            line1: values.street,
            city: values.city,
            state: values.state,
            zip: values.zipCode,
            country: values.country,
          },
          autoRechargeEnabled: false,
          userId: keycloakUserId, // Pass userId from Keycloak
        });
        createdEntityId = entityResult.entityId;
        createdEmployeeId = entityResult.employeeId;
        console.log("✅ Entity created in Convex:", { entityId: createdEntityId, employeeId: createdEmployeeId });
      } catch (entityError: any) {
        console.error("❌ Entity creation failed:", entityError);
        toast.error(entityError.message || "Failed to create organization");
        return;
      }

      // Step 3: Create Polar customer with entityId and employeeId
      try {
        const polarRes = await fetch("/api/polar/create-customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityId: createdEntityId,
            employeeId: createdEmployeeId,
            email: values.entityEmail,
            name: `${values.firstName} ${values.lastName}`.trim(),
          }),
        });

        if (!polarRes.ok) {
          const polarData = await polarRes.json().catch(() => ({}));
          console.warn("Failed to create Polar customer:", polarData);
        } else {
          console.log("✅ Polar customer created");
        }
      } catch (polarError) {
        console.warn("Failed to call Polar create customer:", polarError);
        // Don't fail signup if Polar fails
      }

      // Step 4: Sync to Convex users table
      try {
        const syncRes = await fetch("/api/auth/sync-convex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: keycloakUserId,
            email: values.entityEmail,
            name: `${values.firstName} ${values.lastName}`.trim(),
            entityId: createdEntityId,
          }),
        });

        if (!syncRes.ok) {
          const syncData = await syncRes.json().catch(() => ({}));
          console.warn("Failed to sync Convex:", syncData);
        }
      } catch (e) {
        console.warn("Failed to call /api/auth/sync-convex:", e);
      }

      setUserId(keycloakUserId);
      toast.success("Verification code sent to your email!");
      setCurrentStep(5); // Move to verification step
    } catch (error: any) {
      toast.error(getSignupErrorMessage(error));
    }
  };
  // --- end functionality unchanged ---

  const activeStep = useMemo(() => steps[currentStep - 1], [currentStep]);

  const getFieldsForStep = (step: number): (keyof RegisterFormValues)[] => {
    switch (step) {
      case 1:
        return ["firstName", "lastName"];
      case 2:
        return ["entityName", "entityEmail", "entityWebsite"];
      case 3:
        return ["password", "confirmPassword"];
      case 4:
        return [
          "countryCode",
          "phoneNumber",
          "street",
          "city",
          "state",
          "country",
          "zipCode",
          "notARobot",
        ];
      case 5:
        return ["verificationCode"];
      default:
        return [];
    }
  };

  const nextStep = async () => {
    const fields = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fields);

    if (isValid) {
      // Step 4 triggers form submission to create account
      if (currentStep === 4) {
        form.handleSubmit(onSubmit)();
      } else if (currentStep < steps.length) {
        setCurrentStep((s) => s + 1);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  // ---------------------------------------------
// RESEND VERIFICATION CODE (REGISTER)
// ---------------------------------------------
const handleResendVerificationCode = async () => {
  if (!userId) {
    toast.error("User ID missing. Please try signing up again.");
    return;
  }

  try {
    await fetch("/api/auth/resend-verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    toast.success("Verification code resent to your email");
  } catch {
    toast.error("Failed to resend verification code");
  }
};


  const isPending = form.formState.isSubmitting;

  return (
    <div className="h-full w-full">
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-5">
        {/* LEFT: Form area */}
        <div className="flex h-full w-full items-start justify-start overflow-y-auto px-6 py-10 lg:px-8 lg:col-span-2">
          <div className="w-full max-w-xl pb-8">
            {/* Step indicators */}
            <div className="mb-6">
              <div className="flex items-center gap-5">
                {steps.map((s) => {
                  const isActive = s.id === currentStep;
                  const isDone = s.id < currentStep;

                  return (
                    <div key={s.id} className="flex items-center">
                      <div
                        className={[
                          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                            : isDone
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {isDone ? <Check className="h-5 w-5" /> : s.id}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-sm text-muted-foreground">
                Step{" "}
                <span className="font-medium text-foreground">{currentStep}</span>{" "}
                of <span className="font-medium text-foreground">{steps.length}</span>
              </div>
            </div>

            <Card className="mt-16 rounded-2xl shadow-sm">
              <CardHeader>
                <motion.div
                  key={`left-header-${currentStep}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <CardTitle className="text-xl">{activeStep.name}</CardTitle>
                  <CardDescription>{activeStep.description}</CardDescription>
                </motion.div>
              </CardHeader>

              <CardContent>
                {/* Social buttons kept (UI only); uncomment if you want them visible */}
                {/* <div className="mb-6 flex flex-col gap-3">
                  <Button
                    onClick={signInGithub}
                    variant="outline"
                    className="w-full rounded-xl"
                    type="button"
                    disabled={isPending}
                  >
                    Continue with GitHub
                  </Button>
                  <Button
                    onClick={signInGoogle}
                    variant="outline"
                    className="w-full rounded-xl"
                    type="button"
                    disabled={isPending}
                  >
                    Continue with Google
                  </Button>
                </div> */}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`step-${currentStep}`}
                        initial={{ opacity: 0, x: 16 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.25 }}
                        className="space-y-4"
                      >
                        {/* Step 1 */}
                        {currentStep === 1 && (
                          <>
                            <FormField
                              control={form.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Last Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Doe" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {/* Step 2 */}
                        {currentStep === 2 && (
                          <>
                            <FormField
                              control={form.control}
                              name="entityName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Acme Inc." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="entityEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity Email</FormLabel>
                                  <FormControl>
                                    <Input type="email" placeholder="john@acme.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="entityWebsite"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Entity Website</FormLabel>
                                  <FormControl>
                                    <Input type="url" placeholder="https://acme.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {/* Step 3 */}
                        {currentStep === 3 && (
                          <>
                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
    <FormItem>
      <FormLabel>Password</FormLabel>
      <FormControl>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            {...field}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

                           <FormField
  control={form.control}
  name="confirmPassword"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Confirm Password</FormLabel>
      <FormControl>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            {...field}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

                          </>
                        )}

                        {/* Step 4 */}
                        {currentStep === 4 && (
                          <>
                            <div className="grid grid-cols-3 gap-3">
                              <FormField
                                control={form.control}
                                name="countryCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Code</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Code" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="us +1">US +1</SelectItem>
                                        <SelectItem value="uk +44">UK +44</SelectItem>
                                        <SelectItem value="in +91">IN +91</SelectItem>
                                        <SelectItem value="au +61">AU +61</SelectItem>
                                        <SelectItem value="ca +1">CA +1</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="phoneNumber"
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                      <Input placeholder="123-456-7890" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="street"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Street</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123 Main St" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name="city"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>City</FormLabel>
                                    <FormControl>
                                      <Input placeholder="New York" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="state"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>State</FormLabel>
                                    <FormControl>
                                      <Input placeholder="NY" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name="country"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Country</FormLabel>
                                    <FormControl>
                                      <Input placeholder="United States" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="zipCode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Zip Code</FormLabel>
                                    <FormControl>
                                      <Input placeholder="10001" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="notARobot"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>I'm not a robot</FormLabel>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {/* Step 5 */}
                        {currentStep === 5 && (
                          <>
                            <div className="text-center space-y-2 mb-4">
                              <p className="text-sm text-muted-foreground">
                                We've sent a verification code to{" "}
                                <strong className="text-foreground">{form.watch("entityEmail")}</strong>
                              </p>
                            </div>
                            <FormField
                              control={form.control}
                              name="verificationCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Verification Code</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter 6-digit code"
                                      type="text"
                                      autoComplete="one-time-code"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="text-center text-sm text-muted-foreground">
                              Didn't receive a code?{" "}
                              <button
                                type="button"
                                className="text-foreground underline underline-offset-4"
                                // onClick={() => {
                                //   toast.info("Resend functionality coming soon");
                                // }}
                                 onClick={handleResendVerificationCode}
                              >
                                Resend
                              </button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Buttons */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        disabled={currentStep === 1 || isPending || currentStep === 5}
                        className="rounded-xl"
                      >
                        Previous
                      </Button>

                      {currentStep < 4 ? (
                        <Button
                          type="button"
                          onClick={nextStep}
                          disabled={isPending}
                          className="rounded-xl"
                        >
                          Next
                        </Button>
                      ) : currentStep === 4 ? (
                        <Button
                          type="button"
                          onClick={nextStep}
                          disabled={isPending}
                          className="rounded-xl"
                        >
                          {isPending ? "Creating Account..." : "Create Account"}
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={isPending}
                          className="rounded-xl"
                        >
                          {isPending ? "Verifying..." : "Verify & Complete"}
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>

                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-foreground underline underline-offset-4">
                    Login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

       {/* RIGHT: Product showcase panel */}
<div className="relative hidden h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-muted/50 via-background to-muted/30 lg:flex lg:col-span-3">
  <AnimatePresence mode="wait">
    <motion.div
      key={`preview-${currentStep}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="relative w-full max-w-3xl px-12"
    >
      {currentStep === 1 && <WorkflowBuilderAnimation />}
      {currentStep === 2 && <ChatbotBuilderAnimation />}
      {currentStep === 3 && <VoiceAgentAnimation />}
      {currentStep === 4 && <SLMAnimation />}
      {currentStep === 5 && <EmailVerificationAnimation />}
    </motion.div>
  </AnimatePresence>
</div>

      </div>

      {/* Theme toggle - Fixed bottom left */}
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
    </div>
  );
}
