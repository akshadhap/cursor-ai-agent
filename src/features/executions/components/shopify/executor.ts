import ky from "ky";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";

import type { NodeExecutor } from "@/features/executions/types";
import type { ShopifyFormValues } from "./dialog";
import { shopifyChannel } from "@/inngest/channels/shopify";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (ctx) => {
  return new Handlebars.SafeString(JSON.stringify(ctx, null, 2));
});

// Helper to compile handlebars templates
const compileTemplate = (template: string | undefined, context: Record<string, unknown>): string => {
  if (!template || template.trim().length === 0) return "";
  const compiled = Handlebars.compile(template)(context);
  return decode(compiled);
};

// Helper to parse JSON with template support
const parseJsonTemplate = (jsonStr: string | undefined, context: Record<string, unknown>): unknown => {
  if (!jsonStr || jsonStr.trim().length === 0) return null;
  const compiled = compileTemplate(jsonStr, context);
  try {
    return JSON.parse(compiled);
  } catch {
    return compiled;
  }
};

// API version for Shopify
const API_VERSION = "2024-01";

export const shopifyExecutor: NodeExecutor<ShopifyFormValues> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    shopifyChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.credentialId) {
    await publish(
      shopifyChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Shopify node: Credential is required");
  }

  if (!data.variableName) {
    await publish(
      shopifyChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Shopify node: variableName is required");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-shopify-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      shopifyChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Shopify node: Credential not found");
  }

  // Decrypt and parse the credential data
  const decryptedData = await step.run("decrypt-shopify-credential", async () => {
    const decrypted = await decrypt(credential.value);
    return JSON.parse(decrypted) as { storeUrl: string; accessToken: string };
  });

  const { storeUrl, accessToken } = decryptedData;

  if (!storeUrl || !accessToken) {
    await publish(
      shopifyChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Shopify node: Invalid credential data (missing storeUrl or accessToken)");
  }

  // Log credential info for debugging (without exposing the token)
  console.log(`[Shopify] Using store URL: ${storeUrl}`);
  console.log(`[Shopify] Access token present: ${accessToken ? 'Yes' : 'No'}`);
  console.log(`[Shopify] Access token length: ${accessToken?.length || 0}`);
  console.log(`[Shopify] Access token starts with: ${accessToken?.substring(0, 10)}...`);

  const baseUrl = `${storeUrl}/admin/api/${API_VERSION}`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  try {
    const result = await step.run("shopify-api-call", async () => {
      const operation = data.operation;

      // ============ PRODUCT OPERATIONS ============
      if (operation === "listProducts") {
        const params = new URLSearchParams();
        if (data.limit) params.append("limit", String(data.limit));
        if (data.pageInfo) params.append("page_info", compileTemplate(data.pageInfo, context));
        const url = `${baseUrl}/products.json?${params.toString()}`;
        return ky.get(url, { headers }).json();
      }

      if (operation === "getProduct") {
        if (!data.productId || data.productId.trim() === "") throw new NonRetriableError("Product ID is required");
        const productId = compileTemplate(data.productId, context).trim();
        return ky.get(`${baseUrl}/products/${productId}.json`, { headers }).json();
      }

      if (operation === "createProduct") {
        const product: Record<string, unknown> = {};
        if (data.title) product.title = compileTemplate(data.title, context);
        if (data.bodyHtml) product.body_html = compileTemplate(data.bodyHtml, context);
        if (data.vendor) product.vendor = compileTemplate(data.vendor, context);
        if (data.productType) product.product_type = compileTemplate(data.productType, context);
        if (data.tags) product.tags = compileTemplate(data.tags, context);
        if (data.variants) product.variants = parseJsonTemplate(data.variants, context);
        
        return ky.post(`${baseUrl}/products.json`, { headers, json: { product } }).json();
      }

      if (operation === "updateProduct") {
        if (!data.productId || data.productId.trim() === "") throw new NonRetriableError("Product ID is required");
        const productId = compileTemplate(data.productId, context).trim();
        const product: Record<string, unknown> = { id: productId };
        if (data.title) product.title = compileTemplate(data.title, context);
        if (data.bodyHtml) product.body_html = compileTemplate(data.bodyHtml, context);
        if (data.vendor) product.vendor = compileTemplate(data.vendor, context);
        if (data.productType) product.product_type = compileTemplate(data.productType, context);
        if (data.tags) product.tags = compileTemplate(data.tags, context);
        
        return ky.put(`${baseUrl}/products/${productId}.json`, { headers, json: { product } }).json();
      }

      if (operation === "deleteProduct") {
        if (!data.productId || data.productId.trim() === "") throw new NonRetriableError("Product ID is required");
        const productId = compileTemplate(data.productId, context).trim();
        await ky.delete(`${baseUrl}/products/${productId}.json`, { headers });
        return { success: true, deletedProductId: productId };
      }

      if (operation === "listProductVariants") {
        if (!data.productId || data.productId.trim() === "") throw new NonRetriableError("Product ID is required");
        const productId = compileTemplate(data.productId, context).trim();
        return ky.get(`${baseUrl}/products/${productId}/variants.json`, { headers }).json();
      }

      if (operation === "createProductVariant") {
        if (!data.productId || data.productId.trim() === "") throw new NonRetriableError("Product ID is required");
        const productId = compileTemplate(data.productId, context).trim();
        const variant = parseJsonTemplate(data.variantData, context);
        return ky.post(`${baseUrl}/products/${productId}/variants.json`, { headers, json: { variant } }).json();
      }

      if (operation === "updateProductVariant") {
        if (!data.variantId || data.variantId.trim() === "") throw new NonRetriableError("Variant ID is required");
        const variantId = compileTemplate(data.variantId, context).trim();
        const variant = parseJsonTemplate(data.variantData, context);
        return ky.put(`${baseUrl}/variants/${variantId}.json`, { headers, json: { variant } }).json();
      }

      if (operation === "searchProducts") {
        const params = new URLSearchParams();
        if (data.query) params.append("title", compileTemplate(data.query, context));
        if (data.limit) params.append("limit", String(data.limit));
        return ky.get(`${baseUrl}/products.json?${params.toString()}`, { headers }).json();
      }

      // ============ ORDER OPERATIONS ============
      if (operation === "listOrders") {
        const params = new URLSearchParams();
        if (data.status && data.status !== "any") params.append("status", data.status);
        if (data.financialStatus && data.financialStatus !== "any") params.append("financial_status", data.financialStatus);
        if (data.fulfillmentStatus && data.fulfillmentStatus !== "any") params.append("fulfillment_status", data.fulfillmentStatus);
        if (data.limit) params.append("limit", String(data.limit));
        if (data.createdAtMin) params.append("created_at_min", data.createdAtMin);
        if (data.createdAtMax) params.append("created_at_max", data.createdAtMax);
        return ky.get(`${baseUrl}/orders.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "getOrder") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        return ky.get(`${baseUrl}/orders/${orderId}.json`, { headers }).json();
      }

      if (operation === "createOrder") {
        const order: Record<string, unknown> = {};
        if (data.lineItems) order.line_items = parseJsonTemplate(data.lineItems, context);
        if (data.customer) order.customer = parseJsonTemplate(data.customer, context);
        if (data.shippingAddress) order.shipping_address = parseJsonTemplate(data.shippingAddress, context);
        if (data.billingAddress) order.billing_address = parseJsonTemplate(data.billingAddress, context);
        if (data.financialStatus) order.financial_status = data.financialStatus;
        if (data.email) order.email = compileTemplate(data.email, context);
        if (data.note) order.note = compileTemplate(data.note, context);
        
        return ky.post(`${baseUrl}/orders.json`, { headers, json: { order } }).json();
      }

      if (operation === "updateOrder") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        const order: Record<string, unknown> = { id: orderId };
        if (data.note) order.note = compileTemplate(data.note, context);
        if (data.tags) order.tags = compileTemplate(data.tags, context);
        if (data.email) order.email = compileTemplate(data.email, context);
        
        return ky.put(`${baseUrl}/orders/${orderId}.json`, { headers, json: { order } }).json();
      }

      if (operation === "cancelOrder") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        const body: Record<string, unknown> = {};
        if (data.reason) body.reason = data.reason;
        if (data.refund !== undefined) body.refund = data.refund;
        if (data.restock !== undefined) body.restock = data.restock;
        
        return ky.post(`${baseUrl}/orders/${orderId}/cancel.json`, { headers, json: body }).json();
      }

      if (operation === "closeOrder") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        return ky.post(`${baseUrl}/orders/${orderId}/close.json`, { headers }).json();
      }

      if (operation === "reopenOrder") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        return ky.post(`${baseUrl}/orders/${orderId}/open.json`, { headers }).json();
      }

      if (operation === "getOrderCount") {
        const params = new URLSearchParams();
        if (data.status && data.status !== "any") params.append("status", data.status);
        if (data.financialStatus && data.financialStatus !== "any") params.append("financial_status", data.financialStatus);
        return ky.get(`${baseUrl}/orders/count.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "getOrderTransactions") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        return ky.get(`${baseUrl}/orders/${orderId}/transactions.json`, { headers }).json();
      }

      // ============ CUSTOMER OPERATIONS ============
      if (operation === "listCustomers") {
        const params = new URLSearchParams();
        if (data.limit) params.append("limit", String(data.limit));
        if (data.createdAtMin) params.append("created_at_min", data.createdAtMin);
        if (data.createdAtMax) params.append("created_at_max", data.createdAtMax);
        return ky.get(`${baseUrl}/customers.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "getCustomer") {
        if (!data.customerId || data.customerId.trim() === "") throw new NonRetriableError("Customer ID is required");
        const customerId = compileTemplate(data.customerId, context).trim();
        return ky.get(`${baseUrl}/customers/${customerId}.json`, { headers }).json();
      }

      if (operation === "createCustomer") {
        const customer: Record<string, unknown> = {};
        if (data.email) customer.email = compileTemplate(data.email, context);
        if (data.firstName) customer.first_name = compileTemplate(data.firstName, context);
        if (data.lastName) customer.last_name = compileTemplate(data.lastName, context);
        if (data.phone) customer.phone = compileTemplate(data.phone, context);
        if (data.addresses) customer.addresses = parseJsonTemplate(data.addresses, context);
        if (data.tags) customer.tags = compileTemplate(data.tags, context);
        if (data.note) customer.note = compileTemplate(data.note, context);
        
        return ky.post(`${baseUrl}/customers.json`, { headers, json: { customer } }).json();
      }

      if (operation === "updateCustomer") {
        if (!data.customerId || data.customerId.trim() === "") throw new NonRetriableError("Customer ID is required");
        const customerId = compileTemplate(data.customerId, context).trim();
        const customer: Record<string, unknown> = { id: customerId };
        if (data.email) customer.email = compileTemplate(data.email, context);
        if (data.firstName) customer.first_name = compileTemplate(data.firstName, context);
        if (data.lastName) customer.last_name = compileTemplate(data.lastName, context);
        if (data.phone) customer.phone = compileTemplate(data.phone, context);
        if (data.tags) customer.tags = compileTemplate(data.tags, context);
        if (data.note) customer.note = compileTemplate(data.note, context);
        
        return ky.put(`${baseUrl}/customers/${customerId}.json`, { headers, json: { customer } }).json();
      }

      if (operation === "deleteCustomer") {
        if (!data.customerId || data.customerId.trim() === "") throw new NonRetriableError("Customer ID is required");
        const customerId = compileTemplate(data.customerId, context).trim();
        await ky.delete(`${baseUrl}/customers/${customerId}.json`, { headers });
        return { success: true, deletedCustomerId: customerId };
      }

      if (operation === "searchCustomers") {
        const params = new URLSearchParams();
        if (data.query) params.append("query", compileTemplate(data.query, context));
        if (data.limit) params.append("limit", String(data.limit));
        return ky.get(`${baseUrl}/customers/search.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "getCustomerOrders") {
        if (!data.customerId || data.customerId.trim() === "") throw new NonRetriableError("Customer ID is required");
        const customerId = compileTemplate(data.customerId, context).trim();
        const params = new URLSearchParams();
        if (data.status && data.status !== "any") params.append("status", data.status);
        return ky.get(`${baseUrl}/customers/${customerId}/orders.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "sendInvite") {
        if (!data.customerId || data.customerId.trim() === "") throw new NonRetriableError("Customer ID is required");
        const customerId = compileTemplate(data.customerId, context).trim();
        return ky.post(`${baseUrl}/customers/${customerId}/send_invite.json`, { headers, json: {} }).json();
      }

      // ============ INVENTORY OPERATIONS ============
      if (operation === "listInventoryLevels") {
        const params = new URLSearchParams();
        if (data.locationIds) params.append("location_ids", compileTemplate(data.locationIds, context));
        if (data.inventoryItemIds) params.append("inventory_item_ids", compileTemplate(data.inventoryItemIds, context));
        if (data.limit) params.append("limit", String(data.limit));
        return ky.get(`${baseUrl}/inventory_levels.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "getInventoryLevel") {
        if (!data.inventoryItemId || !data.locationId) {
          throw new NonRetriableError("Inventory Item ID and Location ID are required");
        }
        const inventoryItemId = compileTemplate(data.inventoryItemId, context).trim();
        const locationId = compileTemplate(data.locationId, context).trim();
        return ky.get(`${baseUrl}/inventory_levels.json?inventory_item_ids=${inventoryItemId}&location_ids=${locationId}`, { headers }).json();
      }

      if (operation === "adjustInventory") {
        if (!data.inventoryItemId || !data.locationId || data.adjustment === undefined) {
          throw new NonRetriableError("Inventory Item ID, Location ID, and Adjustment are required");
        }
        return ky.post(`${baseUrl}/inventory_levels/adjust.json`, {
          headers,
          json: {
            inventory_item_id: Number(compileTemplate(data.inventoryItemId, context).trim()),
            location_id: Number(compileTemplate(data.locationId, context).trim()),
            available_adjustment: data.adjustment,
          },
        }).json();
      }

      if (operation === "setInventoryLevel") {
        if (!data.inventoryItemId || !data.locationId || data.available === undefined) {
          throw new NonRetriableError("Inventory Item ID, Location ID, and Available quantity are required");
        }
        return ky.post(`${baseUrl}/inventory_levels/set.json`, {
          headers,
          json: {
            inventory_item_id: Number(compileTemplate(data.inventoryItemId, context).trim()),
            location_id: Number(compileTemplate(data.locationId, context).trim()),
            available: data.available,
          },
        }).json();
      }

      if (operation === "listLocations") {
        return ky.get(`${baseUrl}/locations.json`, { headers }).json();
      }

      if (operation === "getLocation") {
        if (!data.locationId || data.locationId.trim() === "") throw new NonRetriableError("Location ID is required");
        const locationId = compileTemplate(data.locationId, context).trim();
        return ky.get(`${baseUrl}/locations/${locationId}.json`, { headers }).json();
      }

      if (operation === "listInventoryItems") {
        const params = new URLSearchParams();
        if (data.ids) params.append("ids", compileTemplate(data.ids, context));
        if (data.limit) params.append("limit", String(data.limit));
        return ky.get(`${baseUrl}/inventory_items.json?${params.toString()}`, { headers }).json();
      }

      // ============ COLLECTION OPERATIONS ============
      if (operation === "listCollections") {
        const params = new URLSearchParams();
        if (data.limit) params.append("limit", String(data.limit));
        return ky.get(`${baseUrl}/custom_collections.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "getCollection") {
        if (!data.collectionId || data.collectionId.trim() === "") throw new NonRetriableError("Collection ID is required");
        const collectionId = compileTemplate(data.collectionId, context).trim();
        return ky.get(`${baseUrl}/custom_collections/${collectionId}.json`, { headers }).json();
      }

      if (operation === "createCollection") {
        const collection: Record<string, unknown> = {};
        if (data.title) collection.title = compileTemplate(data.title, context);
        if (data.bodyHtml) collection.body_html = compileTemplate(data.bodyHtml, context);
        if (data.image) collection.image = { src: compileTemplate(data.image, context) };
        if (data.published !== undefined) collection.published = data.published;
        
        return ky.post(`${baseUrl}/custom_collections.json`, { headers, json: { custom_collection: collection } }).json();
      }

      if (operation === "updateCollection") {
        if (!data.collectionId || data.collectionId.trim() === "") throw new NonRetriableError("Collection ID is required");
        const collectionId = compileTemplate(data.collectionId, context).trim();
        const collection: Record<string, unknown> = { id: collectionId };
        if (data.title) collection.title = compileTemplate(data.title, context);
        if (data.bodyHtml) collection.body_html = compileTemplate(data.bodyHtml, context);
        
        return ky.put(`${baseUrl}/custom_collections/${collectionId}.json`, { headers, json: { custom_collection: collection } }).json();
      }

      if (operation === "deleteCollection") {
        if (!data.collectionId || data.collectionId.trim() === "") throw new NonRetriableError("Collection ID is required");
        const collectionId = compileTemplate(data.collectionId, context).trim();
        await ky.delete(`${baseUrl}/custom_collections/${collectionId}.json`, { headers });
        return { success: true, deletedCollectionId: collectionId };
      }

      if (operation === "listCollectionProducts") {
        if (!data.collectionId || data.collectionId.trim() === "") throw new NonRetriableError("Collection ID is required");
        const collectionId = compileTemplate(data.collectionId, context).trim();
        const params = new URLSearchParams();
        if (data.limit) params.append("limit", String(data.limit));
        return ky.get(`${baseUrl}/collections/${collectionId}/products.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "addProductToCollection") {
        if (!data.collectionId || !data.productId) {
          throw new NonRetriableError("Collection ID and Product ID are required");
        }
        const collectionId = compileTemplate(data.collectionId, context).trim();
        const productId = compileTemplate(data.productId, context).trim();
        return ky.post(`${baseUrl}/collects.json`, {
          headers,
          json: { collect: { collection_id: collectionId, product_id: productId } },
        }).json();
      }

      if (operation === "removeProductFromCollection") {
        if (!data.collectionId || !data.productId) {
          throw new NonRetriableError("Collection ID and Product ID are required");
        }
        const collectionId = compileTemplate(data.collectionId, context).trim();
        const productId = compileTemplate(data.productId, context).trim();
        // First find the collect
        const collectsResp = await ky.get(`${baseUrl}/collects.json?collection_id=${collectionId}&product_id=${productId}`, { headers }).json() as { collects: { id: string }[] };
        if (collectsResp.collects && collectsResp.collects.length > 0) {
          await ky.delete(`${baseUrl}/collects/${collectsResp.collects[0].id}.json`, { headers });
        }
        return { success: true, removedProductId: productId };
      }

      // ============ DISCOUNT/PRICE RULE OPERATIONS ============
      if (operation === "listPriceRules") {
        const params = new URLSearchParams();
        if (data.limit) params.append("limit", String(data.limit));
        return ky.get(`${baseUrl}/price_rules.json?${params.toString()}`, { headers }).json();
      }

      if (operation === "getPriceRule") {
        if (!data.priceRuleId || data.priceRuleId.trim() === "") throw new NonRetriableError("Price Rule ID is required");
        const priceRuleId = compileTemplate(data.priceRuleId, context).trim();
        return ky.get(`${baseUrl}/price_rules/${priceRuleId}.json`, { headers }).json();
      }

      if (operation === "createPriceRule") {
        const priceRule: Record<string, unknown> = {
          target_type: data.targetType || "line_item",
          target_selection: data.targetSelection || "all",
          allocation_method: data.allocationMethod || "across",
          value_type: data.valueType || "fixed_amount",
          customer_selection: "all",
        };
        if (data.title) priceRule.title = compileTemplate(data.title, context);
        if (data.value) priceRule.value = data.value;
        if (data.startsAt) priceRule.starts_at = data.startsAt;
        if (data.endsAt) priceRule.ends_at = data.endsAt;
        
        return ky.post(`${baseUrl}/price_rules.json`, { headers, json: { price_rule: priceRule } }).json();
      }

      if (operation === "updatePriceRule") {
        if (!data.priceRuleId || data.priceRuleId.trim() === "") throw new NonRetriableError("Price Rule ID is required");
        const priceRuleId = compileTemplate(data.priceRuleId, context).trim();
        const priceRule: Record<string, unknown> = { id: priceRuleId };
        if (data.title) priceRule.title = compileTemplate(data.title, context);
        if (data.value) priceRule.value = data.value;
        
        return ky.put(`${baseUrl}/price_rules/${priceRuleId}.json`, { headers, json: { price_rule: priceRule } }).json();
      }

      if (operation === "deletePriceRule") {
        if (!data.priceRuleId || data.priceRuleId.trim() === "") throw new NonRetriableError("Price Rule ID is required");
        const priceRuleId = compileTemplate(data.priceRuleId, context).trim();
        await ky.delete(`${baseUrl}/price_rules/${priceRuleId}.json`, { headers });
        return { success: true, deletedPriceRuleId: priceRuleId };
      }

      if (operation === "listDiscountCodes") {
        if (!data.priceRuleId || data.priceRuleId.trim() === "") throw new NonRetriableError("Price Rule ID is required");
        const priceRuleId = compileTemplate(data.priceRuleId, context).trim();
        return ky.get(`${baseUrl}/price_rules/${priceRuleId}/discount_codes.json`, { headers }).json();
      }

      if (operation === "createDiscountCode") {
        if (!data.priceRuleId || !data.code) {
          throw new NonRetriableError("Price Rule ID and Code are required");
        }
        const priceRuleId = compileTemplate(data.priceRuleId, context).trim();
        const code = compileTemplate(data.code, context).trim();
        return ky.post(`${baseUrl}/price_rules/${priceRuleId}/discount_codes.json`, {
          headers,
          json: { discount_code: { code } },
        }).json();
      }

      if (operation === "deleteDiscountCode") {
        if (!data.priceRuleId || !data.discountCodeId) {
          throw new NonRetriableError("Price Rule ID and Discount Code ID are required");
        }
        const priceRuleId = compileTemplate(data.priceRuleId, context).trim();
        const discountCodeId = compileTemplate(data.discountCodeId, context).trim();
        await ky.delete(`${baseUrl}/price_rules/${priceRuleId}/discount_codes/${discountCodeId}.json`, { headers });
        return { success: true, deletedDiscountCodeId: discountCodeId };
      }

      // ============ FULFILLMENT OPERATIONS ============
      if (operation === "listFulfillments") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        return ky.get(`${baseUrl}/orders/${orderId}/fulfillments.json`, { headers }).json();
      }

      if (operation === "getFulfillment") {
        if (!data.orderId || !data.fulfillmentId) {
          throw new NonRetriableError("Order ID and Fulfillment ID are required");
        }
        const orderId = compileTemplate(data.orderId, context).trim();
        const fulfillmentId = compileTemplate(data.fulfillmentId, context).trim();
        return ky.get(`${baseUrl}/orders/${orderId}/fulfillments/${fulfillmentId}.json`, { headers }).json();
      }

      if (operation === "createFulfillment") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        const fulfillment: Record<string, unknown> = {};
        if (data.locationId) fulfillment.location_id = Number(compileTemplate(data.locationId, context).trim());
        if (data.trackingNumber) fulfillment.tracking_number = compileTemplate(data.trackingNumber, context);
        if (data.trackingCompany) fulfillment.tracking_company = data.trackingCompany;
        if (data.trackingUrl) fulfillment.tracking_url = compileTemplate(data.trackingUrl, context);
        if (data.lineItems) fulfillment.line_items = parseJsonTemplate(data.lineItems, context);
        if (data.notifyCustomer !== undefined) fulfillment.notify_customer = data.notifyCustomer;
        
        return ky.post(`${baseUrl}/orders/${orderId}/fulfillments.json`, { headers, json: { fulfillment } }).json();
      }

      if (operation === "updateFulfillment") {
        if (!data.orderId || !data.fulfillmentId) {
          throw new NonRetriableError("Order ID and Fulfillment ID are required");
        }
        const orderId = compileTemplate(data.orderId, context).trim();
        const fulfillmentId = compileTemplate(data.fulfillmentId, context).trim();
        const fulfillment: Record<string, unknown> = {};
        if (data.trackingNumber) fulfillment.tracking_number = compileTemplate(data.trackingNumber, context);
        if (data.trackingCompany) fulfillment.tracking_company = data.trackingCompany;
        if (data.trackingUrl) fulfillment.tracking_url = compileTemplate(data.trackingUrl, context);
        
        return ky.put(`${baseUrl}/orders/${orderId}/fulfillments/${fulfillmentId}.json`, { headers, json: { fulfillment } }).json();
      }

      if (operation === "cancelFulfillment") {
        if (!data.orderId || !data.fulfillmentId) {
          throw new NonRetriableError("Order ID and Fulfillment ID are required");
        }
        const orderId = compileTemplate(data.orderId, context).trim();
        const fulfillmentId = compileTemplate(data.fulfillmentId, context).trim();
        return ky.post(`${baseUrl}/orders/${orderId}/fulfillments/${fulfillmentId}/cancel.json`, { headers }).json();
      }

      if (operation === "completeFulfillment") {
        if (!data.fulfillmentId || data.fulfillmentId.trim() === "") throw new NonRetriableError("Fulfillment ID is required");
        const fulfillmentId = compileTemplate(data.fulfillmentId, context).trim();
        return ky.post(`${baseUrl}/fulfillments/${fulfillmentId}/complete.json`, { headers }).json();
      }

      if (operation === "listFulfillmentOrders") {
        if (!data.orderId || data.orderId.trim() === "") throw new NonRetriableError("Order ID is required");
        const orderId = compileTemplate(data.orderId, context).trim();
        return ky.get(`${baseUrl}/orders/${orderId}/fulfillment_orders.json`, { headers }).json();
      }

      // ============ WEBHOOK OPERATIONS ============
      if (operation === "listWebhooks") {
        return ky.get(`${baseUrl}/webhooks.json`, { headers }).json();
      }

      if (operation === "getWebhook") {
        if (!data.webhookId || data.webhookId.trim() === "") throw new NonRetriableError("Webhook ID is required");
        const webhookId = compileTemplate(data.webhookId, context).trim();
        return ky.get(`${baseUrl}/webhooks/${webhookId}.json`, { headers }).json();
      }

      if (operation === "createWebhook") {
        if (!data.topic || !data.address) {
          throw new NonRetriableError("Topic and Address are required");
        }
        const webhook = {
          topic: data.topic,
          address: compileTemplate(data.address, context),
          format: data.format || "json",
        };
        return ky.post(`${baseUrl}/webhooks.json`, { headers, json: { webhook } }).json();
      }

      if (operation === "updateWebhook") {
        if (!data.webhookId || data.webhookId.trim() === "") throw new NonRetriableError("Webhook ID is required");
        const webhookId = compileTemplate(data.webhookId, context).trim();
        const webhook: Record<string, unknown> = { id: webhookId };
        if (data.address) webhook.address = compileTemplate(data.address, context);
        
        return ky.put(`${baseUrl}/webhooks/${webhookId}.json`, { headers, json: { webhook } }).json();
      }

      if (operation === "deleteWebhook") {
        if (!data.webhookId || data.webhookId.trim() === "") throw new NonRetriableError("Webhook ID is required");
        const webhookId = compileTemplate(data.webhookId, context).trim();
        await ky.delete(`${baseUrl}/webhooks/${webhookId}.json`, { headers });
        return { success: true, deletedWebhookId: webhookId };
      }

      throw new NonRetriableError(`Shopify: unknown operation "${operation}"`);
    });

    await publish(
      shopifyChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(
      shopifyChannel().status({
        nodeId,
        status: "error",
      }),
    );
    
    // Handle specific HTTP errors with better messages
    if (error instanceof Error && 'response' in error) {
      const httpError = error as { response?: { status?: number } };
      if (httpError.response?.status === 401) {
        throw new NonRetriableError(
          `Shopify Authentication Failed (401): Your access token is invalid or expired. ` +
          `Please verify your Shopify credentials:\n` +
          `1. Check that your access token is correct\n` +
          `2. Ensure the token has not expired\n` +
          `3. Verify the token has the required API scopes\n` +
          `4. Confirm the store URL matches: ${storeUrl}\n\n` +
          `Original error: ${error.message}`
        );
      }
    }
    
    throw error;
  }
};
