"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { shopifyChannel } from "@/inngest/channels/shopify";
import { inngest } from "@/inngest/client";

export type ShopifyToken = Realtime.Token<typeof shopifyChannel, ["status"]>;

export async function fetchShopifyRealtimeToken(): Promise<ShopifyToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: shopifyChannel(),
    topics: ["status"],
  });

  return token;
}