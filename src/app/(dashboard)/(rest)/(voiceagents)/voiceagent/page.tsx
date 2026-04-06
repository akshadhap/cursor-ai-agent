
// "use client"

import { HydrateClient } from "@/trpc/server";
import { requireAuth } from "@/lib/auth-utils";
import VoiceAgentPageClient from "@/voiceagent/modules/components/voiceagents-page-client";
import { prefetchVoiceAgents } from "@/voiceagent/modules/server/prefetch";
import { SubscriptionGuard } from "@/components/subscription-guard";

export default async function Page() {
  await requireAuth();
  // await prefetchVoiceAgents();

   try {
      await prefetchVoiceAgents();
    } catch (prefetchError) {
      console.warn("Prefetch failed, will fetch on client:", prefetchError);
    
    }

  return (
    <SubscriptionGuard product="voice_agent" landingUrl="/voice-landing">
      <HydrateClient>
        <VoiceAgentPageClient />
      </HydrateClient>
    </SubscriptionGuard>
  );
}
