"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectItem, SelectContent
} from "@/components/ui/select";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";

const airbnbSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().min(1, "Credential is required"),
  resource: z.string().min(1, "Resource is required"),
  operation: z.string().min(1, "Operation is required"),
  listingId: z.string().optional(),
  reservationId: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.string().optional(),
  location: z.string().optional(),
});

export type AirbnbFormValues = z.infer<typeof airbnbSchema>;

interface AirbnbDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AirbnbFormValues) => void;
  defaultValues?: Partial<AirbnbFormValues>;
}

export function AirbnbDialog({ open, onOpenChange, onSubmit, defaultValues }: AirbnbDialogProps) {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.AIRBNB);

  const form = useForm<AirbnbFormValues>({
    resolver: zodResolver(airbnbSchema) as any,
    defaultValues: {
      variableName: defaultValues?.variableName || "airbnbResult",
      credentialId: defaultValues?.credentialId || "",
      resource: defaultValues?.resource || "listing",
      operation: defaultValues?.operation || "search",
      listingId: defaultValues?.listingId || "",
      reservationId: defaultValues?.reservationId || "",
      checkIn: defaultValues?.checkIn || "",
      checkOut: defaultValues?.checkOut || "",
      guests: defaultValues?.guests || "",
      location: defaultValues?.location || "",
    },
  });

  const resource = form.watch("resource");
  const operation = form.watch("operation");

  const getOperations = () => {
    switch (resource) {
      case "listing":
        return [
          { value: "search", label: "Search Listings" },
          { value: "get", label: "Get Listing" },
        ];
      case "availability":
        return [{ value: "get", label: "Get Availability" }];
      case "pricing":
        return [{ value: "get", label: "Get Pricing" }];
      case "reservation":
        return [
          { value: "create", label: "Create Reservation" },
          { value: "get", label: "Get Reservation" },
          { value: "update", label: "Update Reservation" },
          { value: "cancel", label: "Cancel Reservation" },
        ];
      default:
        return [];
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Image src="/logos/airbnb.svg" alt="Airbnb" width={24} height={24} />
            <DialogTitle>Airbnb</DialogTitle>
          </div>
          <DialogDescription>
            Manage listings, reservations, and availability. Note: Requires Airbnb Partner API access.
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
                  <FormControl><Input placeholder="airbnbResult" {...field} /></FormControl>
                  <FormDescription>
                    Access result later as <code className="bg-muted px-1 rounded">{`{{${field.value || "airbnbResult"}}}`}</code>
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
                  <FormLabel>Airbnb Credential</FormLabel>
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
                            <Image src="/logos/airbnb.svg" alt="" width={16} height={16} />
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
                      <SelectItem value="listing">Listing</SelectItem>
                      <SelectItem value="availability">Availability</SelectItem>
                      <SelectItem value="pricing">Pricing</SelectItem>
                      <SelectItem value="reservation">Reservation</SelectItem>
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
                      {getOperations().map((op) => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Fields */}

            {/* Listing ID - required for most operations except listing search */}
            {(resource !== "listing" || operation === "get") && (
              <FormField
                name="listingId"
                control={form.control as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listing ID</FormLabel>
                    <FormControl><Input placeholder="{{listingId}}" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Location - for listing search */}
            {resource === "listing" && operation === "search" && (
              <FormField
                name="location"
                control={form.control as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl><Input placeholder="New York, NY" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Reservation ID - for reservation operations (except create) */}
            {resource === "reservation" && operation !== "create" && (
              <FormField
                name="reservationId"
                control={form.control as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reservation ID</FormLabel>
                    <FormControl><Input placeholder="{{reservationId}}" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Check-in / Check-out dates */}
            {(resource === "availability" || resource === "pricing" || resource === "reservation" || (resource === "listing" && operation === "search")) && (
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

            {/* Guests */}
            {(resource === "listing" || resource === "pricing" || resource === "reservation") && (
              <FormField
                name="guests"
                control={form.control as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Guests</FormLabel>
                    <FormControl><Input type="number" min="1" placeholder="2" {...field} /></FormControl>
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
