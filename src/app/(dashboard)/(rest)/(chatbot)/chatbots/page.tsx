import { requireAuth } from "@/lib/auth-utils";
import { ChatbotsPageClient } from "./chatbots-page-client";
import { SubscriptionGuard } from "@/components/subscription-guard";

const Page = async () => {
  // Protect this route on the server side
  await requireAuth();

  return (
    <SubscriptionGuard product="chatbot_builder" landingUrl="/chatbot-landing">
      <ChatbotsPageClient />
    </SubscriptionGuard>
  );
};

export default Page;
