"use client";

import Link from "next/link";
import { PRODUCT_CATALOG } from "@/lib/billing/catalog";
import { formatTokens } from "@/lib/billing/format";
import { CheckoutButton } from "@/components/billing/CheckoutButton";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";

const formatNumber = (num: number) => num.toLocaleString();

type EntityData = {
  name: string;
  createdBy: string;
  entityId: string;
  employeeId: string;
  email: string;
  activePlans?: {
    [key: string]: string; // productKey: tierKey
  };
};

type EntityDetails = {
  id: string;
  name: string;
  createdBy: string;
  employees?: EmployeeData[];
  products?: any[];
  entity?: {
    name: string;
    createdBy: string;
    activePlans?: {
      [key: string]: string;
    };
  };
};

type EmployeeData = {
  employeeId: string;
  displayName: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: string;
  profileImageUrl: string | null;
  products?: any;
  createdDate?: string;
  updatedDate?: string;
};

type ProductAccess = {
  productId: string;
  productKey: string;
  planId: string;
  allocatedTokens: number;
  usedTokens: number;
  isActive: boolean;
};

export default function CataloguePage() {
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;
  
  // Convex queries
  const entityIdData = useQuery(
    api.public.entities.getEntityIdByEmail,
    currentEmail ? { email: currentEmail } : "skip"
  );
  const entityId = entityIdData?.entityId ?? null;
  const employeeId = entityIdData?.employeeId ?? null;

  const entityData = useQuery(
    api.public.entities.getEntity,
    entityId ? { entityId } : "skip"
  );

  const employeesData = useQuery(
    api.public.entities.listEmployees,
    entityId ? { entityId } : "skip"
  );

  const currentUserEmployee = useQuery(
    api.public.entities.getEmployee,
    entityId && employeeId ? { entityId, employeeId } : "skip"
  );

  const productsData = useQuery(
    api.public.entities.listProducts,
    entityId ? { entityId } : "skip"
  );

  const currentUserProductsData = useQuery(
    api.public.entities.listEmployeeProducts,
    entityId && employeeId ? { entityId, employeeId, assignedOnly: true } : "skip"
  );

  // Convex mutations
  const assignProductToEmployee = useMutation(api.public.entities.assignProductToEmployee);

  const [polarSubscriptions, setPolarSubscriptions] = useState<any[]>([]);
  const [polarMeters, setPolarMeters] = useState<any[]>([]);
  const [polarOrgId, setPolarOrgId] = useState<string | null>(null);
  const [polarProductIds, setPolarProductIds] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loading = entityIdData === undefined || entityData === undefined;
  const employees = employeesData || [];
  const activeProducts = productsData?.filter((p: any) => p.status === 'active').length || 0;
  const currentUserAccess = currentUserProductsData?.products || [];
  
  // Find admin employee
  const adminEmployee = employees.find((emp: any) => 
    emp.roles?.includes('ADMIN') || emp.employeeId === entityData?.createdBy
  ) || null;

  // Construct legacy entityData format for compatibility with existing code
  const legacyEntityData = entityIdData && entityData && currentUserEmployee ? {
    name: entityData.name,
    createdBy: entityData.createdBy,
    entityId: entityId!,
    employeeId: employeeId!,
    email: currentEmail!,
  } : null;

  // Construct entityDetails for compatibility
  const entityDetails = entityData ? {
    id: entityId,
    name: entityData.name,
    createdBy: entityData.createdBy,
    employees: employees,
    products: productsData,
    entity: entityData
  } : null;

  useEffect(() => {  
    const fetchPolarData = async () => {
      if (!entityId) return;

      try {
        // Fetch Polar subscription data using entityId as externalId
        const polarResponse = await fetch(`/api/auth/entities/${entityId}/polar-state`);
        if (polarResponse.ok) {
          const polarData = await polarResponse.json();
          setPolarSubscriptions(polarData.activeSubscriptions || []);
          setPolarMeters(polarData.activeMeters || []);
          console.log('Polar data:', polarData);
          
          // TODO: Remove this sync logic - tokens are now allocated immediately in checkout success page
          // Keeping this commented out for backup/manual sync if needed
          
          // Sync tokens from Polar meters to Convex
          // Use the creator/owner employee ID since they own the subscription
          // const ownerEmployeeId = entityData?.createdBy || employeeId;
          // if (ownerEmployeeId) {
          //   console.log('[Polar] Using owner employee ID for token sync:', ownerEmployeeId);
          //   await syncTokensFromPolar(polarData, ownerEmployeeId);
          // } else {
          //   console.warn('[Polar] No owner employee ID found, skipping token sync');
          // }
        } else {
          console.warn('No Polar data found for entity:', entityId);
        }

        // Fetch Polar organization info
        const polarInfoResponse = await fetch(`/api/polar/info`);
        if (polarInfoResponse.ok) {
          const polarInfo = await polarInfoResponse.json();
          setPolarOrgId(polarInfo.organizationId);
          setPolarProductIds(polarInfo.products);
          console.log('Polar info:', polarInfo);
        }
      } catch (error) {
        console.error('Error fetching Polar data:', error);
      }
    };

    fetchPolarData();
  }, [entityId, employeeId]);

  // Sync tokens from Polar meters to Convex
  const syncTokensFromPolar = async (polarData: any, targetEmployeeId: string) => {
    if (!entityId || !targetEmployeeId) return;
    
    setSyncing(true);
    console.log('[Token Sync] ====== Starting Token Sync ======');
    console.log('[Token Sync] Entity ID:', entityId);
    console.log('[Token Sync] Employee ID (Owner):', targetEmployeeId);
    
    try {
      if (!polarData.activeSubscriptions) {
        console.warn('[Token Sync] ⚠️ Cannot sync - missing subscriptions');
        return;
      }

      const activeSubscriptions = polarData.activeSubscriptions || [];
      const activeMeters = polarData.activeMeters || [];
      
      console.log('[Token Sync] Active Subscriptions:', activeSubscriptions.length);
      console.log('[Token Sync] Active Meters:', activeMeters.length);
      console.log('[Token Sync] Subscriptions:', JSON.stringify(activeSubscriptions, null, 2));
      console.log('[Token Sync] Meters:', JSON.stringify(activeMeters, null, 2));

      // Process each subscription
      for (const subscription of activeSubscriptions) {
        console.log('[Token Sync] Processing subscription:', subscription.id);
        console.log('[Token Sync] Subscription status:', subscription.status);
        console.log('[Token Sync] Subscription metadata:', subscription.metadata);
        
        if (subscription.status !== 'active' || !subscription.metadata?.productKey) {
          console.warn('[Token Sync] ⚠️ Skipping inactive/invalid subscription:', subscription.id);
          continue;
        }

        const productKey = subscription.metadata.productKey;
        const normalizedProductKey = productKey
          .replace('chatbot-builder', 'chatbot_builder')
          .replace('voice-agent-builder', 'voice_agent');
        
        console.log('[Token Sync] Product Key (original):', productKey);
        console.log('[Token Sync] Product Key (normalized):', normalizedProductKey);

        // Match meter to subscription by finding the meter whose modifiedAt is closest to subscription startedAt
        // This works because Polar credits the meter shortly after the subscription starts
        const subscriptionStartTime = new Date(subscription.startedAt).getTime();
        
        let customerMeter = null;
        let minTimeDiff = Infinity;
        
        for (const meter of activeMeters) {
          if (meter.balance === 0 || !meter.modifiedAt) continue;
          
          const meterModifiedTime = new Date(meter.modifiedAt).getTime();
          const timeDiff = Math.abs(meterModifiedTime - subscriptionStartTime);
          
          // Meter should be modified within 10 seconds of subscription start
          if (timeDiff < 10000 && timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            customerMeter = meter;
          }
        }
        
        if (!customerMeter) {
          console.warn(`[Token Sync] ⚠️ No matching meter found for subscription:`, subscription.id);
          console.warn(`[Token Sync] Subscription started at:`, subscription.startedAt);
          continue;
        }
        
        console.log(`[Token Sync] ✓ Found active meter for ${normalizedProductKey}`);
        console.log(`[Token Sync] Meter ID:`, customerMeter.meterId);
        console.log(`[Token Sync] Credited Units:`, customerMeter.creditedUnits);
        console.log(`[Token Sync] Consumed Units:`, customerMeter.consumedUnits);
        console.log(`[Token Sync] Balance:`, customerMeter.balance);

        console.log(`[Token Sync] Updating tokens via Convex mutation`);
        console.log(`[Token Sync] Product:`, normalizedProductKey);
        console.log(`[Token Sync] Allocated:`, customerMeter.creditedUnits);
        
        // Use Convex mutation directly - no need for Entity API
        try {
          await assignProductToEmployee({
            entityId,
            employeeId: targetEmployeeId,
            productId: normalizedProductKey,
            allocated: customerMeter.creditedUnits,
            enabled: true,
          });
          
          console.log(`[Token Sync] ✓✓✓ SUCCESS - Synced ${customerMeter.creditedUnits} tokens for ${normalizedProductKey}`);
        } catch (error) {
          console.error(`[Token Sync] ✗✗✗ FAILED - Could not sync tokens for ${normalizedProductKey}:`, error);
        }
      }
      console.log('[Token Sync] ====== Token Sync Complete ======');
    } catch (error) {
      console.error('[Token Sync] ✗✗✗ FATAL ERROR during token sync:', error);
      console.error('[Token Sync] Error stack:', (error as Error).stack);
    } finally {
      setSyncing(false);
    }
  };

  const getUserAccessForProduct = (productKey: string) => {
    if (!Array.isArray(currentUserAccess)) return null;
    return currentUserAccess.find(access => access.productId === productKey);
  };

  // Get the active tier for a product from Polar subscriptions
  const getActiveTierForProduct = (productKey: string): string | null => {
    // Find all active subscriptions for this product from Polar data
    const activeSubscriptionsForProduct = polarSubscriptions.filter(
      (sub: any) => sub.status === 'active' && sub.metadata?.productKey === productKey
    );
    
    // If multiple subscriptions exist (e.g., after upgrading), return the most recent one
    if (activeSubscriptionsForProduct.length === 0) return null;
    
    const latestSubscription = activeSubscriptionsForProduct.reduce((latest: any, current: any) => {
      const latestTime = new Date(latest.startedAt).getTime();
      const currentTime = new Date(current.startedAt).getTime();
      return currentTime > latestTime ? current : latest;
    });
    
    return latestSubscription?.metadata?.tierKey || null;
  };

  // Tier hierarchy: basic < pro < enterprise
  const getTierLevel = (tierKey: string): number => {
    const tierLevels: Record<string, number> = {
      basic: 1,
      pro: 2,
      enterprise: 3,
    };
    return tierLevels[tierKey] || 0;
  };

  // Check if a tier should be disabled (can't downgrade to lower tiers)
  const isTierDisabled = (productKey: string, tierKey: string, activeTierKey: string | null): boolean => {
    if (!activeTierKey) return false; // No active tier, all tiers available
    if (activeTierKey === tierKey) return true; // Current tier is disabled
    
    // Disable lower tiers (can't downgrade)
    const currentLevel = getTierLevel(activeTierKey);
    const targetLevel = getTierLevel(tierKey);
    return targetLevel < currentLevel;
  };
  
  const visibleCatalog = PRODUCT_CATALOG.filter((product) => product.key !== "slm");
  // Use entityId as the external customer ID for Polar checkout
  const externalCustomerId = entityId;

  return (
    <div className="min-h-screen relative">
      {/* Full-page syncing overlay */}
      {syncing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
            <p className="mt-4 text-lg font-semibold text-gray-900">Syncing...</p>
            <p className="mt-2 text-sm text-gray-600">Please wait while we update your account</p>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-black/30" />
            <p className="mt-4 text-sm font-semibold text-black/50">Loading catalogue data...</p>
          </div>
        </div>
      ) : (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-10">
        
        {/* Debug Section - Raw JSON Data */}
        {process.env.NODE_ENV === 'development' && (
          <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
            <h3 className="mb-3 text-lg font-bold text-red-900">Debug: Raw API Data</h3>
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-bold text-red-800">legacyEntityData (API format):</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(legacyEntityData, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">entityData (Convex):</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(entityData, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">entityDetails:</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(entityDetails, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">employees (count: {employees.length}):</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(employees, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">adminEmployee:</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(adminEmployee, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">currentUserEmployee:</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(currentUserEmployee, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">activeProducts:</p>
                <pre className="overflow-auto rounded bg-white p-2">{activeProducts}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">currentUserAccess:</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(currentUserAccess, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">polarSubscriptions (count: {polarSubscriptions.length}):</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(polarSubscriptions, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">polarMeters (count: {polarMeters.length}):</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(polarMeters, null, 2)}</pre>
              </div>
              <div>
                <p className="font-bold text-red-800">polarOrganizationId:</p>
                <pre className="overflow-auto rounded bg-white p-2">{polarOrgId || 'Not fetched'}</pre>
              </div>
              {/* <div>
                <p className="font-bold text-red-800">polarProducts (count: {polarProductIds.length}):</p>
                <pre className="overflow-auto rounded bg-white p-2">{JSON.stringify(polarProductIds, null, 2)}</pre>
              </div> */}
            </div>
          </div>
        )}

        <div className="flex items-center">
          <Link
            href="/workflows"
            className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-black/70 transition hover:border-black hover:text-black"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <header className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
              Product Catalogue
            </p>
            <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight text-black md:text-5xl">
              Build an AI suite with shared token pools and admin control.
            </h1>
            <p className="mt-4 text-lg font-semibold text-black/70">
              Offer four modular products with two tiers each. Admins can
              grant access, manage tokens per user, and gate access per product.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/admin/billing"
                className="rounded-full bg-black px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5"
              >
                Admin console
              </Link>
              <a
                href="#catalog"
                className="rounded-full border border-black/20 px-6 py-2 text-sm font-semibold text-black/80 transition hover:border-black hover:text-black"
              >
                Explore tiers
              </a>
            </div>
          </div>
          <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/70 p-6 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
              Active organization
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                Live
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-black">
              {entityData?.name || legacyEntityData?.name || "Your Organization"}
            </h2>
            <p className="mt-2 text-sm font-semibold text-black/60">
              Admin: {(entityData?.createdBy === currentUserEmployee?.employeeId) 
                ? currentUserEmployee?.displayName 
                : (adminEmployee?.displayName || "Admin User")}
            </p>
            <div className="mt-5 grid gap-4 text-sm font-semibold">
              <div className="flex items-center justify-between">
                <span className="text-black/60">Total members</span>
                <span className="font-semibold text-black">
                  {formatNumber(employees.length)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/60">Products live</span>
                <span className="font-semibold text-black">
                  {formatNumber(activeProducts)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-black/60">Product access</span>
                <span className="font-semibold text-black">
                  Access control
                </span>
              </div>
            </div>
          </div>
        </header>

        <section id="catalog" className="space-y-14">
          {visibleCatalog.map((product) => {
            const userAccess = getUserAccessForProduct(product.key);
            const activeTierKey = getActiveTierForProduct(product.key);
            
            return (
            <div key={product.key} className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-3xl font-semibold text-black">
                      {product.label}
                    </h2>
                    {activeTierKey && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-2xl text-base font-semibold text-black/65">
                    {product.description}
                  </p>
                  {userAccess && (
                    <p className="mt-2 text-sm font-semibold text-black/50">
                      Your allocation: {formatTokens(userAccess.allocatedTokens)} tokens 
                      ({formatTokens(userAccess.usedTokens)} used, {formatTokens(userAccess.allocatedTokens - userAccess.usedTokens)} remaining)
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-black/40">
                  {product.highlights.map((highlight) => (
                    <span
                      key={highlight}
                      className="rounded-full border border-black/10 px-3 py-1 font-semibold"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {product.tiers.map((tier) => {
                  const isActiveTier = activeTierKey === tier.key;
                  const hasActiveSubscription = !!activeTierKey;
                  const isDisabled = isTierDisabled(product.key, tier.key, activeTierKey);
                  const isUpgrade = activeTierKey && getTierLevel(tier.key) > getTierLevel(activeTierKey);
                  
                  return (
                  <div
                    key={tier.key}
                    className={`flex h-full flex-col justify-between rounded-3xl border-2 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)] transition-all ${
                      isActiveTier 
                        ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20' 
                        : isDisabled
                        ? 'border-black/5 bg-zinc-50/50 opacity-60'
                        : 'border-black/10 bg-white/80 hover:border-black/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-[0.25em] text-black/60">
                          {tier.label}
                        </span>
                        {isActiveTier ? (
                          <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                            Current Plan
                          </span>
                        ) : tier.accent ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                            {tier.accent}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 font-display text-3xl font-semibold text-black">
                        {tier.priceLabel}
                      </div>
                      <p className="mt-2 text-sm font-semibold text-black/60">
                        {formatTokens(tier.tokens)} token pool
                      </p>
                      <ul className="mt-5 space-y-2 text-sm font-semibold text-black/70">
                        <li>Shared token pool with admin overrides</li>
                        <li>Access assignments per teammate</li>
                        <li>{product.tagline}</li>
                      </ul>
                    </div>
                    <div className="mt-6 space-y-3">
                      <CheckoutButton
                        productKey={product.key}
                        tierKey={tier.key}
                        externalCustomerId={externalCustomerId ?? undefined}
                        customerEmail={currentEmail ?? undefined}
                        customerName={entityData?.name || legacyEntityData?.name || undefined}
                        disabled={!tier.polarProductId || isDisabled}
                        label={
                          isActiveTier
                            ? "Current plan"
                            : isDisabled && !isActiveTier
                            ? "Not available"
                            : tier.priceLabel === "Talk to sales"
                            ? "Request access"
                            : isUpgrade
                            ? `Upgrade to ${tier.label}`
                            : "Start checkout"
                        }
                      />
                      {!tier.polarProductId && !isActiveTier ? (
                        <p className="text-xs font-semibold text-black/50">
                          Add the Polar product ID to enable checkout.
                        </p>
                      ) : isDisabled && !isActiveTier ? (
                        <p className="text-xs font-semibold text-black/50">
                          You already have {activeTierKey && activeTierKey.charAt(0).toUpperCase() + activeTierKey.slice(1)} tier
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
                })}
              </div>
            </div>
          )
          })}
        </section>
      </div>
      )}
    </div>
  );
}
