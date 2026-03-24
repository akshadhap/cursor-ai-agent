"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import { useTheme } from "next-themes";

/* =========================
   SCHEMA
========================= */

const expediaFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().min(1, "Credential is required"),
  resource: z.enum(["property", "availability", "pricing", "booking"]),
  operation: z.enum(["search", "get", "create", "cancel"]),
  propertyId: z.string().optional(),
  bookingId: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  adults: z.string().optional(),
  rooms: z.string().optional(),
  currency: z.string().optional(),
});

export type ExpediaFormValues = z.infer<typeof expediaFormSchema>;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: ExpediaFormValues) => void;
  defaultValues?: Partial<ExpediaFormValues>;
};

/* =========================
   COMPONENT
========================= */

export function ExpediaDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: Props) {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.EXPEDIA);
  const { theme, systemTheme } = useTheme();

  const currentTheme = theme === "system" ? systemTheme : theme;
  const expediaLogo = currentTheme === "dark"
    ? "/logos/expedia-white.svg"
    : "/logos/expedia.svg";

  const form = useForm<ExpediaFormValues>({
    resolver: zodResolver(expediaFormSchema) as any,
    defaultValues: {
      variableName: defaultValues?.variableName ?? "expediaResult",
      credentialId: defaultValues?.credentialId ?? "",
      resource: defaultValues?.resource ?? "property",
      operation: defaultValues?.operation ?? "search",
      propertyId: defaultValues?.propertyId ?? "",
      bookingId: defaultValues?.bookingId ?? "",
      checkIn: defaultValues?.checkIn ?? "",
      checkOut: defaultValues?.checkOut ?? "",
      adults: defaultValues?.adults ?? "",
      rooms: defaultValues?.rooms ?? "",
      currency: defaultValues?.currency ?? "USD",
      ...defaultValues,
    },
  });

  const resource = form.watch("resource");
  const operation = form.watch("operation");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Image src={expediaLogo} alt="Expedia" width={24} height={24} />
            <DialogTitle>Expedia</DialogTitle>
          </div>
          <DialogDescription>
            Search properties, check availability, get pricing, and manage bookings via Expedia Rapid API
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Variable Name */}
            <FormField
              name="variableName"
              control={form.control as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Store result as</FormLabel>
                  <FormControl><Input placeholder="expediaResult" {...field} /></FormControl>
                  <FormDescription>
                    Access result later as <code className="bg-muted px-1 rounded">{`{{${field.value || "expediaResult"}}}`}</code>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Credential */}
            <FormField
              name="credentialId"
              control={form.control as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expedia Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Loading..." : "Select credential"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {credentials?.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          <div className="flex items-center gap-2">
                            <Image src={expediaLogo} alt="" width={16} height={16} />
                            {cred.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Resource */}
            <FormField
              name="resource"
              control={form.control as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource</FormLabel>
                  <Select onValueChange={(val) => { field.onChange(val); form.setValue("operation", "get"); }} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select resource" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="property">Property</SelectItem>
                      <SelectItem value="availability">Availability</SelectItem>
                      <SelectItem value="pricing">Pricing</SelectItem>
                      <SelectItem value="booking">Booking</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Operation */}
            <FormField
              name="operation"
              control={form.control as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select operation" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {resource === "property" && (
                        <>
                          <SelectItem value="search">Search Properties</SelectItem>
                          <SelectItem value="get">Get Property Details</SelectItem>
                        </>
                      )}
                      {resource === "availability" && (
                        <SelectItem value="get">Check Availability</SelectItem>
                      )}
                      {resource === "pricing" && (
                        <SelectItem value="get">Get Pricing</SelectItem>
                      )}
                      {resource === "booking" && (
                        <>
                          <SelectItem value="create">Create Booking</SelectItem>
                          <SelectItem value="get">Get Booking</SelectItem>
                          <SelectItem value="cancel">Cancel Booking</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property ID - required for most operations except property search */}
            {(resource !== "property" || operation === "get") && (
              <FormField
                name="propertyId"
                control={form.control as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property ID</FormLabel>
                    <FormControl><Input placeholder="{{propertyId}}" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Booking ID - for booking operations except create */}
            {resource === "booking" && operation !== "create" && (
              <FormField
                name="bookingId"
                control={form.control as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking ID</FormLabel>
                    <FormControl><Input placeholder="{{bookingId}}" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Check-in / Check-out dates */}
            {((resource === "property" && operation === "search") || resource === "availability" || resource === "pricing" || resource === "booking") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="checkIn"
                  control={form.control as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-in Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="checkOut"
                  control={form.control as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check-out Date</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Adults and Rooms */}
            {((resource === "property" && operation === "search") || resource === "availability" || resource === "booking") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  name="adults"
                  control={form.control as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Adults</FormLabel>
                      <FormControl><Input type="number" min="1" placeholder="2" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="rooms"
                  control={form.control as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Rooms</FormLabel>
                      <FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Currency */}
            {(resource === "property" || resource === "pricing") && (
              <FormField
                name="currency"
                control={form.control as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl><Input placeholder="USD" {...field} /></FormControl>
                    <FormDescription>ISO 4217 currency code (e.g., USD, EUR, GBP)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button type="submit" className="w-full">Save Configuration</Button>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
