"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { razorpayChannel } from "@/inngest/channels/razorpay";
import { inngest } from "@/inngest/client";

export type RazorpayToken = Realtime.Token<
  ReturnType<typeof razorpayChannel>,
  ["status"]
>;

export async function fetchRazorpayRealtimeToken(): Promise<RazorpayToken> {
  return getSubscriptionToken(inngest, {
    channel: razorpayChannel(),
    topics: ["status"],
  });
}