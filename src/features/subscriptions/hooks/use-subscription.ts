import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const useSubscription = () => {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data } = await authClient.customer.state();
      return data;
    },
  });
};

export const useHasActiveSubscription = () => {
  const { data: session } = authClient.useSession();
  
  return useQuery({
    queryKey: ["hasActiveSubscription", session?.user?.email],
    queryFn: async () => {
      try {
        // Get current user email from session
        if (!session?.user?.email) {
          console.log('[Subscription] No user email in session');
          return { hasActiveSubscription: false, subscription: null };
        }

        const currentEmail = session.user.email;
        console.log('[Subscription] Checking for email:', currentEmail);

        // Get entity ID from email
        const entityResponse = await fetch(`/api/entities/by-email?email=${encodeURIComponent(currentEmail)}`);
        if (!entityResponse.ok) {
          console.log('[Subscription] Failed to get entity by email:', entityResponse.status);
          return { hasActiveSubscription: false, subscription: null };
        }

        const entityData = await entityResponse.json();
        const entityId = entityData.entityId;
        console.log('[Subscription] Entity ID:', entityId);

        if (!entityId) {
          console.log('[Subscription] No entity ID found');
          return { hasActiveSubscription: false, subscription: null };
        }

        // Get entity data
        const entityDetailResponse = await fetch(`/api/entities/${entityId}`);
        if (!entityDetailResponse.ok) {
          console.log('[Subscription] Failed to get entity details:', entityDetailResponse.status);
          return { hasActiveSubscription: false, subscription: null };
        }

        const entityDetail = await entityDetailResponse.json();
        const activePlans = entityDetail?.entity?.activePlans || {};
        console.log('[Subscription] Active plans:', activePlans);

        // Check if workflows plan exists and has a value (not null/undefined)
        const hasActiveSubscription = activePlans.workflows !== null && activePlans.workflows !== undefined;
        const isPro = activePlans.workflows !== null && activePlans.workflows !== undefined;
        
        console.log('[Subscription] Has active subscription:', hasActiveSubscription);
        console.log('[Subscription] Is pro:', isPro);
        console.log('[Subscription] Workflows plan:', activePlans.workflows);

        return {
          hasActiveSubscription,
          subscription: hasActiveSubscription ? { plan: activePlans.workflows } : null,
          entityData: entityDetail,
          activePlans,
          isPro
        };
      } catch (error) {
        console.error('Error checking subscription status:', error);
        return { hasActiveSubscription: false, subscription: null };
      }
    },
    enabled: !!session?.user?.email, // Only run query if user email exists
  });
};