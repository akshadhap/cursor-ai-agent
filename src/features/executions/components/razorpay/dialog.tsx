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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";

export const RazorpayFormSchema = z
  .object({
    credentialId: z.string().min(1, "Credential is required"),
    action: z.enum([
      "CREATE_ORDER",
      "CREATE_PAYMENT_LINK",
      "FETCH_PAYMENT",
      "FETCH_ORDER",
      "FETCH_PAYMENT_LINK",
      "CREATE_REFUND",
      "FETCH_REFUND",
    ]),
    amount: z.string().optional(),
    currency: z.string().optional(),
    description: z.string().optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional(),
    customerContact: z.string().optional(),
    orderId: z.string().optional(),
    paymentId: z.string().optional(),
    paymentLinkId: z.string().optional(),
    refundAmount: z.string().optional(),
    refundId: z.string().optional(),
    variableName: z.string().min(1, "Variable name is required"),
  })
  .refine(
    (data) => {
      // If action requires amount, make sure it's provided
      if (
        data.action === "CREATE_ORDER" ||
        data.action === "CREATE_PAYMENT_LINK"
      ) {
        return data.amount && data.amount.length > 0;
      }
      return true;
    },
    {
      message: "Amount is required for this action",
      path: ["amount"],
    }
  );

export type RazorpayFormValues = z.infer<typeof RazorpayFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: RazorpayFormValues) => void;
  defaultValues?: Partial<RazorpayFormValues>;
}

export const RazorpayDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const { data: credentials, isLoading } = useCredentialsByType(CredentialType.RAZORPAY);

  const form = useForm<RazorpayFormValues>({
    resolver: zodResolver(RazorpayFormSchema) as any,
    defaultValues: {
      credentialId: defaultValues.credentialId || "",
      action: defaultValues.action || "CREATE_PAYMENT_LINK",
      amount: defaultValues.amount || "",
      currency: defaultValues.currency || "INR",
      description: defaultValues.description || "",
      customerName: defaultValues.customerName || "",
      customerEmail: defaultValues.customerEmail || "",
      customerContact: defaultValues.customerContact || "",
      orderId: defaultValues.orderId || "",
      paymentId: defaultValues.paymentId || "",
      paymentLinkId: defaultValues.paymentLinkId || "",
      refundAmount: defaultValues.refundAmount || "",
      refundId: defaultValues.refundId || "",
      variableName: defaultValues.variableName || "myRazorpay",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        credentialId: defaultValues.credentialId || "",
        action: defaultValues.action || "CREATE_PAYMENT_LINK",
        amount: defaultValues.amount || "",
        currency: defaultValues.currency || "INR",
        description: defaultValues.description || "",
        customerName: defaultValues.customerName || "",
        customerEmail: defaultValues.customerEmail || "",
        customerContact: defaultValues.customerContact || "",
        orderId: defaultValues.orderId || "",
        paymentId: defaultValues.paymentId || "",
        paymentLinkId: defaultValues.paymentLinkId || "",
        refundAmount: defaultValues.refundAmount || "",
        refundId: defaultValues.refundId || "",
        variableName: defaultValues.variableName || "myRazorpay",
      });
    }
  }, [open, defaultValues, form]);

  const watchAction = form.watch("action");
  const watchVariableName = form.watch("variableName") || "myRazorpay";

  const handleSubmit = (values: RazorpayFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Razorpay</DialogTitle>
          <DialogDescription>
            {watchAction === "CREATE_PAYMENT_LINK" && "Create a payment link that can be shared with customers"}
            {watchAction === "CREATE_ORDER" && "Create an order for payment processing"}
            {watchAction === "FETCH_PAYMENT" && "Fetch details of an existing payment"}
            {watchAction === "FETCH_ORDER" && "Retrieve order details and status"}
            {watchAction === "FETCH_PAYMENT_LINK" && "Get payment link details and status"}
            {watchAction === "CREATE_REFUND" && "Process a full or partial refund"}
            {watchAction === "FETCH_REFUND" && "Check refund status and details"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 mt-4"
          >
            {/* Credential Selector */}
            <FormField
              control={form.control as any}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razorpay Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoading ? "Loading..." : "Select credential"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {credentials?.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Selector */}
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CREATE_PAYMENT_LINK">
                        Create Payment Link
                      </SelectItem>
                      <SelectItem value="CREATE_ORDER">
                        Create Order
                      </SelectItem>
                      <SelectItem value="FETCH_PAYMENT">
                        Fetch Payment
                      </SelectItem>
                      <SelectItem value="FETCH_ORDER">
                        Fetch Order
                      </SelectItem>
                      <SelectItem value="FETCH_PAYMENT_LINK">
                        Fetch Payment Link
                      </SelectItem>
                      <SelectItem value="CREATE_REFUND">
                        Create Refund
                      </SelectItem>
                      <SelectItem value="FETCH_REFUND">
                        Fetch Refund
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the Razorpay action to perform
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CREATE PAYMENT LINK - More fields */}
            {watchAction === "CREATE_PAYMENT_LINK" && (
              <>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (in paise) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 50000 for ₹500"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter amount in paise. You can use variables like{" "}
                        {`{{variables.amount}}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="INR" />
                      </FormControl>
                      <FormDescription>
                        Currency code (default: INR)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., Payment for order #123"
                          rows={2}
                        />
                      </FormControl>
                      <FormDescription>
                        Brief description of the payment link
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., John Doe or {{variables.customerName}}"
                        />
                      </FormControl>
                      <FormDescription>
                        Pre-fill customer name in payment form
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., customer@example.com"
                        />
                      </FormControl>
                      <FormDescription>
                        Pre-fill customer email in payment form
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Contact (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., +919876543210"
                        />
                      </FormControl>
                      <FormDescription>
                        Pre-fill customer phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* CREATE ORDER - Simple fields */}
            {watchAction === "CREATE_ORDER" && (
              <>
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (in paise) *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 50000 for ₹500"
                        />
                      </FormControl>
                      <FormDescription>
                        Order amount in paise (e.g., 50000 = ₹500). Use
                        variables: {`{{variables.amount}}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="INR" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Currency code (default: INR)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* FETCH PAYMENT */}
            {watchAction === "FETCH_PAYMENT" && (
              <FormField
                control={form.control}
                name="paymentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., pay_xxxxx or {{variables.paymentId}}"
                      />
                    </FormControl>
                    <FormDescription>
                      The Razorpay payment ID to fetch details for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* FETCH ORDER */}
            {watchAction === "FETCH_ORDER" && (
              <FormField
                control={form.control}
                name="orderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., order_xxxxx or {{variables.orderId}}"
                      />
                    </FormControl>
                    <FormDescription>
                      The Razorpay order ID to fetch details for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* FETCH PAYMENT LINK */}
            {watchAction === "FETCH_PAYMENT_LINK" && (
              <FormField
                control={form.control}
                name="paymentLinkId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Link ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., plink_xxxxx or {{variables.paymentLinkId}}"
                      />
                    </FormControl>
                    <FormDescription>
                      The Razorpay payment link ID to fetch
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* CREATE REFUND */}
            {watchAction === "CREATE_REFUND" && (
              <>
                <FormField
                  control={form.control}
                  name="paymentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment ID *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., pay_xxxxx or {{variables.paymentId}}"
                        />
                      </FormControl>
                      <FormDescription>
                        The payment ID to refund
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="refundAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund Amount (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Leave empty for full refund"
                        />
                      </FormControl>
                      <FormDescription>
                        Amount in paise. Leave empty for full refund
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* FETCH REFUND */}
            {watchAction === "FETCH_REFUND" && (
              <FormField
                control={form.control}
                name="refundId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Refund ID *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., rfnd_xxxxx or {{variables.refundId}}"
                      />
                    </FormControl>
                    <FormDescription>
                      The Razorpay refund ID to check status
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Variable Name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="myRazorpay" />
                  </FormControl>
                  <FormDescription>
                    Result available as {`{{variables.${watchVariableName}}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Configuration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};