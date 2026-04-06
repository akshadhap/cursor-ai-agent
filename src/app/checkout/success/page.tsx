"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const checkoutId = searchParams.get("checkout_id");
  const productKey = searchParams.get("product_key");
  const tierKey = searchParams.get("tier_key");
  const externalCustomerId = searchParams.get("external_customer_id");
  const redirectTo = searchParams.get("redirect_to");
  const agentId = searchParams.get("agent_id");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
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
  
  // Get the creator/owner employeeId
  const creatorEmployeeId = entityData?.createdBy ?? null;

  // Convex mutations
  const upsertPlan = useMutation(api.public.entities.upsertPlan);
  const assignProductToEmployee = useMutation(api.public.entities.assignProductToEmployee);
  
  // State to track if tokens have been allocated
  const [tokensAllocated, setTokensAllocated] = useState(false);

  // List of 4 celebration videos in the public folder
  const videos = [
    "/videos/celebration1.mp4",
    "/videos/celebration2.mp4",
    "/videos/celebration3.mp4",
    "/videos/celebration4.mp4",
  ];

  useEffect(() => {
    // Select a random video
    const randomIndex = Math.floor(Math.random() * videos.length);
    setSelectedVideo(videos[randomIndex]);

    // Activate plan in Convex after successful checkout
    const updateEntityPlan = async () => {
      if (!productKey || !tierKey || !entityId || !creatorEmployeeId) {
        console.log('[Checkout Success] Missing required data:', { productKey, tierKey, entityId, creatorEmployeeId });
        return;
      }

      try {
        // Check if this is a cognitive agent product
        const isCognitiveAgent = productKey.startsWith('cognitive-');
        
        if (isCognitiveAgent) {
          // For cognitive agents, directly assign to the purchasing employee
          // This works for ALL agents: ai-lead-generator, gmail-classifier, linkedin-scheduler, etc.
          const normalizedProductKey = productKey.replace(/-/g, '_');
          
          console.log('[Checkout Success] Processing cognitive agent for ALL agents:', { 
            originalProductKey: productKey, 
            normalizedProductKey,
            externalCustomerId,
            entityId,
            employeeId,
            creatorEmployeeId,
          });
          
          const purchasingEmployeeId = externalCustomerId && externalCustomerId !== entityId
            ? externalCustomerId
            : (employeeId || creatorEmployeeId);
          
          console.log('[Checkout Success] Assigning to employee:', purchasingEmployeeId);
          
          // Assign cognitive agent product to employee with no token limits (enabled access)
          await assignProductToEmployee({
            entityId,
            employeeId: purchasingEmployeeId,
            productId: normalizedProductKey,
            allocated: 0, // No token limits for cognitive agents
            customFields: {
              isEnabled: true,
            },
          });

          console.log('[Checkout Success] ✅ Cognitive agent successfully assigned:', {
            productKey: normalizedProductKey,
            employeeId: purchasingEmployeeId,
            isEnabled: true,
            message: 'Product should now appear in employee products with isEnabled=true',
          });
          
          // Set flag to indicate tokens allocated (for cognitive agents, it's access granted)
          setTokensAllocated(true);
          
          return; // Skip the rest of the plan activation logic
        }
        
        // Normalize product key from Polar format (chatbot-builder) to our format (chatbot_builder)
        const normalizedProductKey = productKey
          .replace('chatbot-builder', 'chatbot_builder')
          .replace('voice-agent-builder', 'voice_agent')
          .replace('voice-agent', 'voice_agent');
        
        console.log('[Checkout Success] Product key normalized:', { 
          original: productKey, 
          normalized: normalizedProductKey 
        });
        
        console.log('[Checkout Success] Fetching subscription data for:', { entityId, productKey, tierKey });
        
        // Fetch subscription details from Polar to get pricing info
        const subscriptionsResponse = await fetch(`/api/polar/subscriptions?customerId=${entityId}`);
        
        let subscriptionData = null;
        let tokenAllocation = 0;
        
        if (subscriptionsResponse.ok) {
          const subscriptions = await subscriptionsResponse.json();
          // Find the subscription for this specific product
          subscriptionData = subscriptions.find(
            (sub: any) => sub.metadata?.productKey === productKey && sub.metadata?.tierKey === tierKey
          );
          
          if (subscriptionData) {
            console.log('[Checkout Success] Found subscription data:', subscriptionData);
          }
        }
        
        // Fetch subscription and meters to get token allocation
        console.log('[Checkout Success] Fetching subscription and meters from Polar');
        try {
          const polarStateResponse = await fetch(`/api/auth/entities/${entityId}/polar-state`);
          
          if (polarStateResponse.ok) {
            const polarData = await polarStateResponse.json();
            const activeSubscriptions = polarData.activeSubscriptions || [];
            const activeMeters = polarData.activeMeters || [];
            
            // Find the subscription for this product/tier
            subscriptionData = activeSubscriptions.find(
              (sub: any) => sub.metadata?.productKey === productKey && sub.metadata?.tierKey === tierKey
            );
            
            if (subscriptionData && activeMeters.length > 0) {
              // Match meter to subscription by timestamp (same logic as catalogue sync)
              const subscriptionStartTime = new Date(subscriptionData.startedAt).getTime();
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
              
              if (customerMeter) {
                tokenAllocation = customerMeter.creditedUnits || 0;
                console.log('[Checkout Success] Token allocation from meter:', tokenAllocation);
              }
            }
          }
        } catch (error) {
          console.error('[Checkout Success] Error fetching Polar data:', error);
        }
        
        // 1. Activate the plan using Convex
        // Normalize billing cycle: Polar returns "month" or "year", Convex expects "monthly" or "annual"
        const billingCycle = subscriptionData?.recurringInterval === 'year' ? 'annual' : 'monthly';
        
        await upsertPlan({
          entityId,
          productId: normalizedProductKey,
          planId: tierKey,
          name: `${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)} Plan`,
          price: subscriptionData?.amount ? subscriptionData.amount / 100 : 0,
          currency: subscriptionData?.currency?.toUpperCase() || 'USD',
          billingCycle,
          trialDays: 0,
          features: [],
          limits: tokenAllocation > 0 ? { tokens: tokenAllocation } : {},
          overage: {},
          entitlements: {},
          isActive: true,
        });

        console.log('[Checkout Success] Plan activated successfully');
        
        // 2. Assign product to owner with tokens and enable it
        await assignProductToEmployee({
          entityId,
          employeeId: creatorEmployeeId,
          productId: normalizedProductKey,
          allocated: tokenAllocation,
          customFields: {
            isEnabled: true,
          },
        });

        console.log('[Checkout Success] Product assigned to owner with tokens:', {
          productKey: normalizedProductKey,
          allocated: tokenAllocation,
          isEnabled: true,
        });
      } catch (error) {
        console.error('[Checkout Success] Error activating plan:', error);
      }
    };

    updateEntityPlan();
  }, [productKey, tierKey, entityId, creatorEmployeeId, employeeId, externalCustomerId, upsertPlan, assignProductToEmployee]);

  // Toggle audio on/off
  const toggleAudio = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      videoRef.current.volume = 1.0;
      setIsMuted(newMutedState);
      
      if (!newMutedState) {
        videoRef.current.play();
      }
    }
  };

  // Handle video metadata load to set redirect timer
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      const randomExtra = 0.2 + Math.random() * 0.3; // Random between 0.2 to 0.5
      const totalPlayTime = duration * (1 + randomExtra);
      
      // Redirect after calculated time
      const redirectTimer = setTimeout(() => {
        // Check for custom redirect destination
        if (redirectTo === 'cognitive-agents' && agentId) {
          // Redirect to cognitive agents page with success message
          router.push(`/cognitive-agents?checkout_success=true&agent_id=${agentId}`);
        } else if (productKey?.startsWith('cognitive-')) {
          // Fallback for cognitive agents if redirect_to not specified
          const extractedAgentId = productKey?.replace(/^cognitive-/, '');
          router.push(`/cognitive-agents?checkout_success=true&agent_id=${extractedAgentId}`);
        } else {
          // Regular product, redirect to catalogue
          router.push("/admin/catalogue");
        }
      }, totalPlayTime * 1000);

      return () => clearTimeout(redirectTimer);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden bg-white">
      {/* Background Video - same video with object-cover */}
      {selectedVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={selectedVideo} type="video/mp4" />
        </video>
      )}

      {/* Foreground Video - positioned slightly down with increased width */}
      {selectedVideo && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          className="relative z-10 h-[110%] w-full object-contain"
          style={{ transform: 'translateY(2%)' }}
        >
          <source src={selectedVideo} type="video/mp4" />
        </video>
      )}

      {/* Audio toggle button on left */}
      <button
        onClick={toggleAudio}
        className="absolute left-8 top-8 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition hover:scale-110 hover:bg-white"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        <span className="text-xl">{isMuted ? "🔇" : "🔊"}</span>
      </button>

      {/* Payment successful text at bottom */}
      <div className="absolute bottom-8 left-0 right-0 z-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-3 backdrop-blur-md shadow-lg">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
          <p className="text-sm font-medium text-gray-800">
            Payment successful, redirecting...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
            <p className="mt-4 text-lg font-semibold text-gray-700">
              Loading...
            </p>
          </div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
