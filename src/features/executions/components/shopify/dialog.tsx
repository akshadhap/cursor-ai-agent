"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";

// Webhook topics available in Shopify
const webhookTopics = [
  "orders/create", "orders/updated", "orders/paid", "orders/cancelled", "orders/fulfilled",
  "products/create", "products/update", "products/delete",
  "customers/create", "customers/update", "customers/delete",
  "carts/create", "carts/update",
  "checkouts/create", "checkouts/update",
  "fulfillments/create", "fulfillments/update",
  "inventory_levels/update", "inventory_items/update",
  "refunds/create", "shop/update",
];

const shopifyFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().min(1, "Credential is required"),
  resource: z.enum(["product", "order", "customer", "inventory", "collection", "discount", "fulfillment", "webhook"]),
  operation: z.string().min(1, "Operation is required"),
  
  // Common fields
  limit: z.coerce.number().optional(),
  pageInfo: z.string().optional(),
  query: z.string().optional(),
  
  // Product fields
  productId: z.string().optional(),
  title: z.string().optional(),
  bodyHtml: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.string().optional(),
  variants: z.string().optional(),
  variantId: z.string().optional(),
  variantData: z.string().optional(),
  
  // Order fields
  orderId: z.string().optional(),
  status: z.string().optional(),
  financialStatus: z.string().optional(),
  fulfillmentStatus: z.string().optional(),
  createdAtMin: z.string().optional(),
  createdAtMax: z.string().optional(),
  lineItems: z.string().optional(),
  customer: z.string().optional(),
  shippingAddress: z.string().optional(),
  billingAddress: z.string().optional(),
  note: z.string().optional(),
  email: z.string().optional(),
  reason: z.string().optional(),
  refund: z.boolean().optional(),
  restock: z.boolean().optional(),
  
  // Customer fields
  customerId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  addresses: z.string().optional(),
  
  // Inventory fields
  inventoryItemId: z.string().optional(),
  locationId: z.string().optional(),
  locationIds: z.string().optional(),
  inventoryItemIds: z.string().optional(),
  adjustment: z.coerce.number().optional(),
  available: z.coerce.number().optional(),
  ids: z.string().optional(),
  
  // Collection fields
  collectionId: z.string().optional(),
  image: z.string().optional(),
  published: z.boolean().optional(),
  
  // Discount fields
  priceRuleId: z.string().optional(),
  targetType: z.string().optional(),
  targetSelection: z.string().optional(),
  allocationMethod: z.string().optional(),
  valueType: z.string().optional(),
  value: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  code: z.string().optional(),
  discountCodeId: z.string().optional(),
  
  // Fulfillment fields
  fulfillmentId: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingCompany: z.string().optional(),
  trackingUrl: z.string().optional(),
  notifyCustomer: z.boolean().optional(),
  
  // Webhook fields
  webhookId: z.string().optional(),
  topic: z.string().optional(),
  address: z.string().optional(),
  format: z.string().optional(),
});

export type ShopifyFormValues = z.infer<typeof shopifyFormSchema>;

type ShopifyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ShopifyFormValues) => void;
  defaultValues?: Partial<ShopifyFormValues>;
};

export const ShopifyDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: ShopifyDialogProps) => {
  const { 
    data: credentials,
    isLoading: isLoadingCredentials,
  } = useCredentialsByType(CredentialType.SHOPIFY);

  const form = useForm<ShopifyFormValues>({
    resolver: zodResolver(shopifyFormSchema) as any,
    defaultValues: {
      variableName: defaultValues?.variableName || "shopifyResult",
      credentialId: defaultValues?.credentialId || "",
      resource: defaultValues?.resource || "product",
      operation: defaultValues?.operation || "listProducts",
      limit: defaultValues?.limit || 50,
      pageInfo: defaultValues?.pageInfo || "",
      query: defaultValues?.query || "",
      productId: defaultValues?.productId || "",
      title: defaultValues?.title || "",
      bodyHtml: defaultValues?.bodyHtml || "",
      vendor: defaultValues?.vendor || "",
      productType: defaultValues?.productType || "",
      tags: defaultValues?.tags || "",
      variants: defaultValues?.variants || "",
      variantId: defaultValues?.variantId || "",
      variantData: defaultValues?.variantData || "",
      orderId: defaultValues?.orderId || "",
      status: defaultValues?.status || "any",
      financialStatus: defaultValues?.financialStatus || "any",
      fulfillmentStatus: defaultValues?.fulfillmentStatus || "any",
      createdAtMin: defaultValues?.createdAtMin || "",
      createdAtMax: defaultValues?.createdAtMax || "",
      lineItems: defaultValues?.lineItems || "",
      customer: defaultValues?.customer || "",
      shippingAddress: defaultValues?.shippingAddress || "",
      billingAddress: defaultValues?.billingAddress || "",
      note: defaultValues?.note || "",
      email: defaultValues?.email || "",
      reason: defaultValues?.reason || "",
      refund: defaultValues?.refund || false,
      restock: defaultValues?.restock || false,
      customerId: defaultValues?.customerId || "",
      firstName: defaultValues?.firstName || "",
      lastName: defaultValues?.lastName || "",
      phone: defaultValues?.phone || "",
      addresses: defaultValues?.addresses || "",
      inventoryItemId: defaultValues?.inventoryItemId || "",
      locationId: defaultValues?.locationId || "",
      locationIds: defaultValues?.locationIds || "",
      inventoryItemIds: defaultValues?.inventoryItemIds || "",
      adjustment: defaultValues?.adjustment,
      available: defaultValues?.available,
      ids: defaultValues?.ids || "",
      collectionId: defaultValues?.collectionId || "",
      image: defaultValues?.image || "",
      published: defaultValues?.published || false,
      priceRuleId: defaultValues?.priceRuleId || "",
      targetType: defaultValues?.targetType || "line_item",
      targetSelection: defaultValues?.targetSelection || "all",
      allocationMethod: defaultValues?.allocationMethod || "across",
      valueType: defaultValues?.valueType || "fixed_amount",
      value: defaultValues?.value || "",
      startsAt: defaultValues?.startsAt || "",
      endsAt: defaultValues?.endsAt || "",
      code: defaultValues?.code || "",
      discountCodeId: defaultValues?.discountCodeId || "",
      fulfillmentId: defaultValues?.fulfillmentId || "",
      trackingNumber: defaultValues?.trackingNumber || "",
      trackingCompany: defaultValues?.trackingCompany || "",
      trackingUrl: defaultValues?.trackingUrl || "",
      notifyCustomer: defaultValues?.notifyCustomer || true,
      webhookId: defaultValues?.webhookId || "",
      topic: defaultValues?.topic || "",
      address: defaultValues?.address || "",
      format: defaultValues?.format || "json",
    },
  });

  const resource = form.watch("resource");
  const operation = form.watch("operation");

  // Get available operations for selected resource
  const getOperations = () => {
    const operations: Record<string, { value: string; label: string }[]> = {
      product: [
        { value: "listProducts", label: "List Products" },
        { value: "getProduct", label: "Get Product" },
        { value: "createProduct", label: "Create Product" },
        { value: "updateProduct", label: "Update Product" },
        { value: "deleteProduct", label: "Delete Product" },
        { value: "listProductVariants", label: "List Variants" },
        { value: "createProductVariant", label: "Create Variant" },
        { value: "updateProductVariant", label: "Update Variant" },
        { value: "searchProducts", label: "Search Products" },
      ],
      order: [
        { value: "listOrders", label: "List Orders" },
        { value: "getOrder", label: "Get Order" },
        { value: "createOrder", label: "Create Order" },
        { value: "updateOrder", label: "Update Order" },
        { value: "cancelOrder", label: "Cancel Order" },
        { value: "closeOrder", label: "Close Order" },
        { value: "reopenOrder", label: "Reopen Order" },
        { value: "getOrderCount", label: "Get Order Count" },
        { value: "getOrderTransactions", label: "Get Transactions" },
      ],
      customer: [
        { value: "listCustomers", label: "List Customers" },
        { value: "getCustomer", label: "Get Customer" },
        { value: "createCustomer", label: "Create Customer" },
        { value: "updateCustomer", label: "Update Customer" },
        { value: "deleteCustomer", label: "Delete Customer" },
        { value: "searchCustomers", label: "Search Customers" },
        { value: "getCustomerOrders", label: "Get Customer Orders" },
        { value: "sendInvite", label: "Send Account Invite" },
      ],
      inventory: [
        { value: "listInventoryLevels", label: "List Inventory Levels" },
        { value: "getInventoryLevel", label: "Get Inventory Level" },
        { value: "adjustInventory", label: "Adjust Inventory" },
        { value: "setInventoryLevel", label: "Set Inventory Level" },
        { value: "listLocations", label: "List Locations" },
        { value: "getLocation", label: "Get Location" },
        { value: "listInventoryItems", label: "List Inventory Items" },
      ],
      collection: [
        { value: "listCollections", label: "List Collections" },
        { value: "getCollection", label: "Get Collection" },
        { value: "createCollection", label: "Create Collection" },
        { value: "updateCollection", label: "Update Collection" },
        { value: "deleteCollection", label: "Delete Collection" },
        { value: "listCollectionProducts", label: "List Collection Products" },
        { value: "addProductToCollection", label: "Add Product to Collection" },
        { value: "removeProductFromCollection", label: "Remove Product from Collection" },
      ],
      discount: [
        { value: "listPriceRules", label: "List Price Rules" },
        { value: "getPriceRule", label: "Get Price Rule" },
        { value: "createPriceRule", label: "Create Price Rule" },
        { value: "updatePriceRule", label: "Update Price Rule" },
        { value: "deletePriceRule", label: "Delete Price Rule" },
        { value: "listDiscountCodes", label: "List Discount Codes" },
        { value: "createDiscountCode", label: "Create Discount Code" },
        { value: "deleteDiscountCode", label: "Delete Discount Code" },
      ],
      fulfillment: [
        { value: "listFulfillments", label: "List Fulfillments" },
        { value: "getFulfillment", label: "Get Fulfillment" },
        { value: "createFulfillment", label: "Create Fulfillment" },
        { value: "updateFulfillment", label: "Update Fulfillment" },
        { value: "cancelFulfillment", label: "Cancel Fulfillment" },
        { value: "completeFulfillment", label: "Complete Fulfillment" },
        { value: "listFulfillmentOrders", label: "List Fulfillment Orders" },
      ],
      webhook: [
        { value: "listWebhooks", label: "List Webhooks" },
        { value: "getWebhook", label: "Get Webhook" },
        { value: "createWebhook", label: "Create Webhook" },
        { value: "updateWebhook", label: "Update Webhook" },
        { value: "deleteWebhook", label: "Delete Webhook" },
      ],
    };
    return operations[resource] || [];
  };

  // Render conditional fields based on resource and operation
  const renderConditionalFields = () => {
    const fields: React.ReactElement[] = [];

    // Product fields
    if (resource === "product") {
      if (["getProduct", "updateProduct", "deleteProduct", "listProductVariants", "createProductVariant", "updateProductVariant"].includes(operation)) {
        fields.push(
          <FormField
            key="productId"
            control={form.control as any}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{productId}} or 1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["createProduct", "updateProduct"].includes(operation)) {
        fields.push(
          <FormField
            key="title"
            control={form.control as any}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Title</FormLabel>
                <FormControl>
                  <Input placeholder="My Product" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="bodyHtml"
            control={form.control as any}
            name="bodyHtml"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (HTML)</FormLabel>
                <FormControl>
                  <Textarea placeholder="<p>Product description here</p>" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <div key="vendor-type" className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor</FormLabel>
                  <FormControl>
                    <Input placeholder="Brand Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type</FormLabel>
                  <FormControl>
                    <Input placeholder="Electronics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        fields.push(
          <FormField
            key="tags"
            control={form.control as any}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="tag1, tag2, tag3" {...field} />
                </FormControl>
                <FormDescription>Comma-separated list of tags</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "createProduct") {
        fields.push(
          <FormField
            key="variants"
            control={form.control as any}
            name="variants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variants (JSON)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='[{"title": "Default", "price": "19.99"}]' 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>JSON array of product variants</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["updateProductVariant"].includes(operation)) {
        fields.push(
          <FormField
            key="variantId"
            control={form.control as any}
            name="variantId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variant ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{variantId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["createProductVariant", "updateProductVariant"].includes(operation)) {
        fields.push(
          <FormField
            key="variantData"
            control={form.control as any}
            name="variantData"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variant Data (JSON)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='{"price": "29.99", "sku": "SKU-001"}' 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["listProducts", "searchProducts"].includes(operation)) {
        fields.push(
          <FormField
            key="limit"
            control={form.control as any}
            name="limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormDescription>Maximum number of results</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "searchProducts") {
        fields.push(
          <FormField
            key="query"
            control={form.control as any}
            name="query"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search Query</FormLabel>
                <FormControl>
                  <Input placeholder="title:shoes" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
    }

    // Order fields
    if (resource === "order") {
      if (["getOrder", "updateOrder", "cancelOrder", "closeOrder", "reopenOrder", "getOrderTransactions"].includes(operation)) {
        fields.push(
          <FormField
            key="orderId"
            control={form.control as any}
            name="orderId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{orderId}} or 1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["listOrders", "getOrderCount"].includes(operation)) {
        fields.push(
          <div key="status-filters" className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="financialStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Financial Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="authorized">Authorized</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
        fields.push(
          <FormField
            key="limit"
            control={form.control as any}
            name="limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "updateOrder") {
        fields.push(
          <FormField
            key="note"
            control={form.control as any}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order Note</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add a note to this order" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="tags"
            control={form.control as any}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="vip, urgent" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "createOrder") {
        fields.push(
          <FormField
            key="lineItems"
            control={form.control as any}
            name="lineItems"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Line Items (JSON)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='[{"variant_id": 123, "quantity": 1}]' 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>JSON array of order line items</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="customer"
            control={form.control as any}
            name="customer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer (JSON)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder='{"id": 123} or {"email": "customer@example.com"}' 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "cancelOrder") {
        fields.push(
          <FormField
            key="reason"
            control={form.control as any}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cancellation Reason</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="customer">Customer Request</SelectItem>
                    <SelectItem value="fraud">Fraud</SelectItem>
                    <SelectItem value="inventory">Inventory</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
    }

    // Customer fields
    if (resource === "customer") {
      if (["getCustomer", "updateCustomer", "deleteCustomer", "getCustomerOrders", "sendInvite"].includes(operation)) {
        fields.push(
          <FormField
            key="customerId"
            control={form.control as any}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{customerId}} or 1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["createCustomer", "updateCustomer"].includes(operation)) {
        fields.push(
          <FormField
            key="email"
            control={form.control as any}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="customer@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <div key="name-fields" className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
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
              control={form.control as any}
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
          </div>
        );
        fields.push(
          <FormField
            key="phone"
            control={form.control as any}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="tags"
            control={form.control as any}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <Input placeholder="vip, wholesale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["listCustomers", "searchCustomers"].includes(operation)) {
        fields.push(
          <FormField
            key="limit"
            control={form.control as any}
            name="limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "searchCustomers") {
        fields.push(
          <FormField
            key="query"
            control={form.control as any}
            name="query"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Search Query</FormLabel>
                <FormControl>
                  <Input placeholder="email:*@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
    }

    // Inventory fields
    if (resource === "inventory") {
      if (["getInventoryLevel", "adjustInventory", "setInventoryLevel"].includes(operation)) {
        fields.push(
          <FormField
            key="inventoryItemId"
            control={form.control as any}
            name="inventoryItemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inventory Item ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{inventoryItemId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="locationId"
            control={form.control as any}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{locationId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "adjustInventory") {
        fields.push(
          <FormField
            key="adjustment"
            control={form.control as any}
            name="adjustment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adjustment</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5 or -5" {...field} />
                </FormControl>
                <FormDescription>Positive to add, negative to subtract</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "setInventoryLevel") {
        fields.push(
          <FormField
            key="available"
            control={form.control as any}
            name="available"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Available Quantity</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "getLocation") {
        fields.push(
          <FormField
            key="locationId"
            control={form.control as any}
            name="locationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{locationId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["listInventoryLevels", "listInventoryItems"].includes(operation)) {
        fields.push(
          <FormField
            key="limit"
            control={form.control as any}
            name="limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
    }

    // Collection fields
    if (resource === "collection") {
      if (["getCollection", "updateCollection", "deleteCollection", "listCollectionProducts", "addProductToCollection", "removeProductFromCollection"].includes(operation)) {
        fields.push(
          <FormField
            key="collectionId"
            control={form.control as any}
            name="collectionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collection ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{collectionId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["addProductToCollection", "removeProductFromCollection"].includes(operation)) {
        fields.push(
          <FormField
            key="productId"
            control={form.control as any}
            name="productId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{productId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["createCollection", "updateCollection"].includes(operation)) {
        fields.push(
          <FormField
            key="title"
            control={form.control as any}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collection Title</FormLabel>
                <FormControl>
                  <Input placeholder="Summer Collection" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="bodyHtml"
            control={form.control as any}
            name="bodyHtml"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (HTML)</FormLabel>
                <FormControl>
                  <Textarea placeholder="<p>Collection description</p>" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["listCollections", "listCollectionProducts"].includes(operation)) {
        fields.push(
          <FormField
            key="limit"
            control={form.control as any}
            name="limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
    }

    // Discount/Price Rule fields
    if (resource === "discount") {
      if (["getPriceRule", "updatePriceRule", "deletePriceRule", "listDiscountCodes", "createDiscountCode", "deleteDiscountCode"].includes(operation)) {
        fields.push(
          <FormField
            key="priceRuleId"
            control={form.control as any}
            name="priceRuleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price Rule ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{priceRuleId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["createPriceRule", "updatePriceRule"].includes(operation)) {
        fields.push(
          <FormField
            key="title"
            control={form.control as any}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Summer Sale" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <div key="value-fields" className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control as any}
              name="valueType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Value</FormLabel>
                  <FormControl>
                    <Input placeholder="-10.00" {...field} />
                  </FormControl>
                  <FormDescription>Use negative for discounts</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      }

      if (operation === "createDiscountCode") {
        fields.push(
          <FormField
            key="code"
            control={form.control as any}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Code</FormLabel>
                <FormControl>
                  <Input placeholder="SUMMER20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "deleteDiscountCode") {
        fields.push(
          <FormField
            key="discountCodeId"
            control={form.control as any}
            name="discountCodeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Discount Code ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{discountCodeId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "listPriceRules") {
        fields.push(
          <FormField
            key="limit"
            control={form.control as any}
            name="limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Limit</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
    }

    // Fulfillment fields
    if (resource === "fulfillment") {
      if (["listFulfillments", "getFulfillment", "createFulfillment", "updateFulfillment", "cancelFulfillment", "listFulfillmentOrders"].includes(operation)) {
        fields.push(
          <FormField
            key="orderId"
            control={form.control as any}
            name="orderId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Order ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{orderId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["getFulfillment", "updateFulfillment", "cancelFulfillment", "completeFulfillment"].includes(operation)) {
        fields.push(
          <FormField
            key="fulfillmentId"
            control={form.control as any}
            name="fulfillmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fulfillment ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{fulfillmentId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["createFulfillment", "updateFulfillment"].includes(operation)) {
        fields.push(
          <FormField
            key="trackingNumber"
            control={form.control as any}
            name="trackingNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Number</FormLabel>
                <FormControl>
                  <Input placeholder="1Z999AA10123456784" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="trackingCompany"
            control={form.control as any}
            name="trackingCompany"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Company</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="USPS">USPS</SelectItem>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="trackingUrl"
            control={form.control as any}
            name="trackingUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://tracking.example.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "createFulfillment") {
        fields.push(
          <FormField
            key="notifyCustomer"
            control={form.control as any}
            name="notifyCustomer"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4"
                  />
                </FormControl>
                <FormLabel className="mt-0!">Notify Customer</FormLabel>
              </FormItem>
            )}
          />
        );
      }
    }

    // Webhook fields
    if (resource === "webhook") {
      if (["getWebhook", "updateWebhook", "deleteWebhook"].includes(operation)) {
        fields.push(
          <FormField
            key="webhookId"
            control={form.control as any}
            name="webhookId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook ID</FormLabel>
                <FormControl>
                  <Input placeholder="{{webhookId}}" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (["createWebhook", "updateWebhook"].includes(operation)) {
        fields.push(
          <FormField
            key="address"
            control={form.control as any}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Webhook URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://your-app.com/webhooks/shopify" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }

      if (operation === "createWebhook") {
        fields.push(
          <FormField
            key="topic"
            control={form.control as any}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Topic</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {webhookTopics.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        fields.push(
          <FormField
            key="format"
            control={form.control as any}
            name="format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "json"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      }
    }

    return fields;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Shopify Node</DialogTitle>
          <DialogDescription>
            Manage products, orders, customers, and more in your Shopify store
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
            <FormField
              control={form.control as any}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="shopifyResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Access result as: {`{{${field.value || "shopifyResult"}}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shopify Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Shopify credential" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingCredentials ? (
                        <SelectItem value="loading" disabled>
                          Loading credentials...
                        </SelectItem>
                      ) : credentials && credentials.length > 0 ? (
                        credentials.map((credential) => (
                          <SelectItem key={credential.id} value={credential.id}>
                            <div className="flex items-center gap-2">
                              <Image
                                src="/logos/shopify.svg"
                                alt="Shopify"
                                width={16}
                                height={16}
                              />
                              {credential.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No credentials found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select your Shopify store credential
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="resource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resource</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset operation when resource changes
                      const ops = getOperations();
                      if (ops.length > 0) {
                        form.setValue("operation", ops[0].value);
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a resource" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="order">Order</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="inventory">Inventory</SelectItem>
                      <SelectItem value="collection">Collection</SelectItem>
                      <SelectItem value="discount">Discount</SelectItem>
                      <SelectItem value="fulfillment">Fulfillment</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the Shopify resource type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an operation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getOperations().map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the operation to perform
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Fields based on resource and operation */}
            {renderConditionalFields()}

            <Button type="submit" className="w-full">
              Save Configuration
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
