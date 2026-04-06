'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';

type Product = 'workflows' | 'chatbot_builder' | 'voice_agent' | 'slm';

type SubscriptionGuardProps = {
  product: Product;
  landingUrl: string;
  children: React.ReactNode;
};

const ShimmerSkeleton = () => (
  <div className="p-8 space-y-6 animate-fade-in">
    {/* Header Shimmer */}
    <div className="flex items-center justify-between mb-8">
      <div className="space-y-3">
        <div className="h-9 w-56 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg animate-shimmer bg-[length:200%_100%] shadow-sm" />
        <div className="h-4 w-40 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
      </div>
      <div className="h-11 w-36 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg animate-shimmer bg-[length:200%_100%] shadow-sm" />
    </div>

    {/* Stats Cards Shimmer */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-5 rounded-xl border border-border bg-card shadow-sm">
          <div className="h-4 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%] mb-3" />
          <div className="h-8 w-32 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
        </div>
      ))}
    </div>

    {/* Content List Shimmer */}
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="h-14 w-14 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-xl animate-shimmer bg-[length:200%_100%] flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-5 w-3/4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
            <div className="h-4 w-1/2 bg-gradient-to-r from-muted via-muted/50 to-muted rounded animate-shimmer bg-[length:200%_100%]" />
          </div>
          <div className="h-9 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted rounded-lg animate-shimmer bg-[length:200%_100%]" />
        </div>
      ))}
    </div>
  </div>
);

export const SubscriptionGuard = ({ product, landingUrl, children }: SubscriptionGuardProps) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // Get entity by email using Convex (safe query)
  const employeeDataList = useQuery(
    api.public.entities.findEntitiesWithEmployeeEmail,
    currentEmail ? { email: currentEmail } : "skip"
  );

  // Extract first entity/employee if available
  const employeeData = employeeDataList?.[0] ? {
    entityId: employeeDataList[0].entityId,
    employeeId: employeeDataList[0].employees?.[0]?.employeeId
  } : null;

  // Get entity details using Convex
  const entityDetails = useQuery(
    api.public.entities.getEntity,
    employeeData?.entityId ? { entityId: employeeData.entityId } : "skip"
  );

  useEffect(() => {
    if (!currentEmail) {
      console.log('[SubscriptionGuard] No email, staying on landing');
      setIsChecking(false);
      setHasAccess(false);
      return;
    }

    // Wait for data to load
    if (employeeDataList === undefined || (employeeData && entityDetails === undefined)) {
      setIsChecking(true);
      return;
    }

    // Handle errors or missing data
    if (!employeeData || !entityDetails) {
      console.error('[SubscriptionGuard] Failed to fetch entity data');
      setIsChecking(false);
      setHasAccess(false);
      router.push(landingUrl);
      return;
    }

    // Check subscription
    const activePlans = entityDetails?.activePlans || {};
    const planValue = activePlans[product];
    const hasSubscription = planValue !== null && planValue !== undefined;

    console.log('[SubscriptionGuard] Subscription check:', { product, planValue, hasSubscription });

    if (hasSubscription) {
      setHasAccess(true);
      setIsChecking(false);
    } else {
      console.log('[SubscriptionGuard] No subscription, redirecting to:', landingUrl);
      setHasAccess(false);
      setIsChecking(false);
      router.push(landingUrl);
    }
  }, [currentEmail, employeeData, entityDetails, product, landingUrl, router]);

  // Show loading while checking or redirecting
  if (isChecking || !hasAccess) {
    return <ShimmerSkeleton />;
  }

  return <>{children}</>;
};
