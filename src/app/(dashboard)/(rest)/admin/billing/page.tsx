"use client";

import React from "react";
import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { formatNumber, formatTokens } from "@/lib/billing/format";
import { adjustTokens, inviteMember, toggleSeat } from "./actions";
import type { ProductKey } from "@/lib/billing/catalog";
import { PRODUCT_CATALOG } from "@/lib/billing/catalog";
import { Crown, Shield, User, Eye, CheckCircle2, Clock, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRealtimeEmployees } from "@/hooks/use-realtime-employees";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";

const REFRESH_INTERVAL_MS = 10000;

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }
  return date.toLocaleTimeString();
};

// Mock AdminSnapshot type
type AdminSnapshot = {
  store: {
    organization: {
      name: string;
      polarCustomerExternalId: string | null;
      adminId: string;
    };
    members: Array<{
      id: string;
      name: string;
      email: string;
      role: "admin" | "member";
      status?: "ACTIVE" | "INVITED" | "INACTIVE";
      isOwner?: boolean;
      allocations: Record<
        ProductKey,
        {
          seat: boolean;
          tokens: number;
        }
      >;
    }>;
  };
  catalog: Array<{
    key: ProductKey;
    label: string;
    tagline: string;
    description: string;
    highlights: string[];
    meterId?: string;
    tiers: Array<{
      key: string;
      label: string;
      tokens: number;
      seats: number;
      priceLabel: string;
      polarProductId?: string;
      accent?: string;
    }>;
  }>;
  subscriptionStatus: Record<ProductKey, boolean>;
  usage: Record<
    ProductKey,
    {
      productKey: ProductKey;
      tierKey: string;
      tokensTotal: number;
      tokensAllocated: number;
      seatsTotal: number;
      seatsUsed: number;
    }
  >;
  nonAdminTokens: Record<ProductKey, number>;
  adminTokenPool: Record<ProductKey, number>;
  metersByProduct: Record<
    ProductKey,
    {
      meterId: string;
      balance: number;
      consumedUnits: number;
      creditedUnits: number;
    } | null
  >;
  updatedAt: string;
};

// Initial empty snapshot - real data loaded from Polar and Entity API
const getInitialSnapshot = (): AdminSnapshot => ({
  store: {
    organization: {
      name: "Your Organization",
      polarCustomerExternalId: null,
      adminId: "",
    },
    members: [],
  },
  catalog: [
    {
      key: "workflows",
      label: "Workflows",
      tagline: "Automate multi-step operations with guardrails.",
      description: "Orchestrate retries, approvals, and routing for every execution.",
      highlights: ["Versioned pipelines", "Retry playbooks", "Audit timelines"],
      meterId: undefined,
      tiers: [],
    },
    {
      key: "chatbot-builder",
      label: "Chatbot Builder",
      tagline: "Launch channel-ready bots in hours.",
      description: "Design flows, ground responses, and deploy to every touchpoint.",
      highlights: ["Multichannel launch", "Knowledge sources", "Fallback rules"],
      meterId: undefined,
      tiers: [],
    },
    {
      key: "voice-agent-builder",
      label: "Voice Agent Builder",
      tagline: "Low-latency voice agents with compliance.",
      description: "Build telephony-ready agents with monitoring and safety layers.",
      highlights: ["Telephony routing", "Latency tuning", "Safety playbooks"],
      meterId: undefined,
      tiers: [],
    },
  ],
  subscriptionStatus: {
    workflows: false,
    "chatbot-builder": false,
    "voice-agent-builder": false,
    slm: false,
  },
  usage: {
    workflows: {
      productKey: "workflows",
      tierKey: "",
      tokensTotal: 0,
      tokensAllocated: 0,
      seatsTotal: 0,
      seatsUsed: 0,
    },
    "chatbot-builder": {
      productKey: "chatbot-builder",
      tierKey: "",
      tokensTotal: 0,
      tokensAllocated: 0,
      seatsTotal: 0,
      seatsUsed: 0,
    },
    "voice-agent-builder": {
      productKey: "voice-agent-builder",
      tierKey: "",
      tokensTotal: 0,
      tokensAllocated: 0,
      seatsTotal: 0,
      seatsUsed: 0,
    },
    slm: {
      productKey: "slm",
      tierKey: "",
      tokensTotal: 0,
      tokensAllocated: 0,
      seatsTotal: 0,
      seatsUsed: 0,
    },
  },
  nonAdminTokens: {
    workflows: 0,
    "chatbot-builder": 0,
    "voice-agent-builder": 0,
    slm: 0,
  },
  adminTokenPool: {
    workflows: 0,
    "chatbot-builder": 0,
    "voice-agent-builder": 0,
    slm: 0,
  },
  metersByProduct: {
    workflows: null,
    "chatbot-builder": null,
    "voice-agent-builder": null,
    slm: null,
  },
  updatedAt: new Date().toISOString(),
});

export default function AdminConsole() {
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;
  
  // Convex queries
  const entityIdData = useQuery(
    api.public.entities.getEntityIdByEmail,
    currentEmail ? { email: currentEmail } : "skip"
  );
  const entityId = entityIdData?.entityId ?? null;
  
  const entityData = useQuery(
    api.public.entities.getEntity,
    entityId ? { entityId } : "skip"
  );
  
  const employeesData = useQuery(
    api.public.entities.listEmployees,
    entityId ? { entityId } : "skip"
  );
  
  const productsData = useQuery(
    api.public.entities.listProducts,
    entityId ? { entityId } : "skip"
  );
  
  // Convex mutations
  const updateEmployee = useMutation(api.public.entities.updateEmployee);
  const assignProductToEmployee = useMutation(api.public.entities.assignProductToEmployee);
  const addEmployee = useMutation(api.public.entities.addEmployee);
  
  const [snapshot, setSnapshot] = useState<AdminSnapshot>(getInitialSnapshot());
  const [refreshState, setRefreshState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [invitePending, startInviteTransition] = useTransition();
  const inviteFormRef = useRef<HTMLFormElement | null>(null);
  const isActiveRef = useRef(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [openRoleDropdown, setOpenRoleDropdown] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [keycloakStatuses, setKeycloakStatuses] = useState<Record<string, string>>({});
  const [roleChanging, setRoleChanging] = useState<string | null>(null);
  const [productAccessLoading, setProductAccessLoading] = useState<string | null>(null);
  const [keycloakInviteStatuses, setKeycloakInviteStatuses] = useState<Record<string, string>>({});
  const [polarSubscriptions, setPolarSubscriptions] = useState<any[]>([]);
  const [polarMeters, setPolarMeters] = useState<any[]>([]);
  const [polarDataLoading, setPolarDataLoading] = useState(true);
  const [employeeProductAccess, setEmployeeProductAccess] = useState<Record<string, any[]>>({});
  const [employeeTokens, setEmployeeTokens] = useState<Record<string, Record<string, number>>>({});
  const [employeeRoles, setEmployeeRoles] = useState<Record<string, string[]>>({});
  const [employeeStatusLoading, setEmployeeStatusLoading] = useState(false);

  // Derive data from Convex instead of Entity API
  const inviterEntityId = entityId;
  const authUserId = session?.user?.id ?? null;
  const entityName = entityData?.name || "Your Organization";
  const employees = employeesData || [];
  const realProducts = productsData || [];
  
  // Find current user's employeeId for invites
  const currentUserEmployee = employees.find(
    (emp: any) => emp.userId === authUserId || emp.email === currentEmail
  );

  const inviterEmployeeId = currentUserEmployee?.employeeId ?? null;

  useEffect(() => {
  if (!inviterEmployeeId || !entityId) return;

  const syncInvites = async () => {
    try {
      await fetch("/api/auth/invites/sync-entity-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterUid: inviterEmployeeId,
          entityId,
        }),
      });
    } catch (e) {
      console.error("Invite sync failed", e);
    }
  };

  syncInvites();
}, [inviterEmployeeId, entityId]);


  // Handle role change
  const handleRoleChange = async (employeeId: string, newRole: string) => {
    if (!inviterEntityId) {
      toast.error("Entity ID not available");
      return;
    }

    setRoleChanging(employeeId);
    setOpenRoleDropdown(null);

    try {
      // Use Convex mutation instead of Entity API
      await updateEmployee({
        entityId: inviterEntityId,
        employeeId,
        roles: [newRole],
      });

      toast.success(`Role updated to ${newRole}`);
    } catch (error) {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role");
    } finally {
      setRoleChanging(null);
    }
  };

  const refreshSnapshot = useCallback(async () => {
    setRefreshState("loading");
    try {
      // Mock refresh - in production, fetch from API
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isActiveRef.current) {
        setSnapshot((prev) => ({
          ...prev,
          updatedAt: new Date().toISOString(),
        }));
        setRefreshState("idle");
      }
    } catch (error) {
      void error;
      if (isActiveRef.current) {
        setRefreshState("error");
      }
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = true;
    void refreshSnapshot();
    const interval = setInterval(refreshSnapshot, REFRESH_INTERVAL_MS);
    return () => {
      isActiveRef.current = false;
      clearInterval(interval);
    };
  }, [refreshSnapshot]);



  // Update snapshot with entity data from Convex
  useEffect(() => {
    if (!entityData || !entityId) return;
    
    setSnapshot(prev => ({
      ...prev,
      store: {
        ...prev.store,
        organization: {
          ...prev.store.organization,
          name: entityData.name || "Your Organization",
          polarCustomerExternalId: entityId || null,
          adminId: authUserId || ""
        }
      }
    }));
    setLoading(false);
  }, [entityData, entityId, authUserId]);

  // Sync employee roles from Convex data
  useEffect(() => {
    if (!employees || employees.length === 0) {
      setEmployeeStatusLoading(false);
      return;
    }

    const rolesMap: Record<string, string[]> = {};
    const statusMap: Record<string, string> = {};
    
    employees.forEach((emp: any) => {
      rolesMap[emp.employeeId] = emp.roles || [];
      statusMap[emp.employeeId] = emp.status?.toUpperCase() || 'ACTIVE';
    });
    
    setEmployeeRoles(rolesMap);
    setKeycloakStatuses(statusMap);
    setEmployeeStatusLoading(false);
  }, [employees]);



  // Fetch Polar subscriptions and meters
  useEffect(() => {
    const fetchPolarData = async () => {
      if (!inviterEntityId) return;

      try {
        setPolarDataLoading(true);
        const polarResponse = await fetch(`/api/auth/entities/${inviterEntityId}/polar-state`);
        if (polarResponse.ok) {
          const polarData = await polarResponse.json();
          
          // DEBUG: Log raw Polar data
          console.log('🔍 [DEBUG] Raw Polar API Response:', JSON.stringify(polarData, null, 2));
          console.log('🔍 [DEBUG] Active Subscriptions:', polarData.activeSubscriptions);
          console.log('🔍 [DEBUG] Active Meters:', polarData.activeMeters);
          
          setPolarSubscriptions(polarData.activeSubscriptions || []);
          setPolarMeters(polarData.activeMeters || []);
          
          // Update snapshot with Polar data as source of truth
          const updatedUsage: any = {};
          const updatedNonAdminTokens: any = {};
          const updatedAdminTokenPool: any = {};
          const updatedSubscriptionStatus: any = {};
          const updatedMetersByProduct: any = {};
          
          // Create a map of meters by meterId for fast lookup
          const metersByMeterId = new Map();
          (polarData.activeMeters || []).forEach((meter: any) => {
            metersByMeterId.set(meter.meterId, meter);
            console.log(`🔍 [DEBUG] Mapping meterId ${meter.meterId} to meter with balance: ${meter.balance}, credited: ${meter.creditedUnits}`);
          });
          
          console.log('🔍 [DEBUG] All meters by ID:', Object.fromEntries(metersByMeterId));
          console.log('🔍 [DEBUG] Product Catalog meterIds:', PRODUCT_CATALOG.map(p => ({ key: p.key, meterId: p.meterId })));
          
          // Create a map of active subscriptions by product key
          const activeProductKeys = new Set();
          
          (polarData.activeSubscriptions || []).forEach((sub: any) => {
            const productKey = sub.metadata?.productKey;
            if (!productKey) return;
            
            activeProductKeys.add(productKey);
            
            // Find the corresponding product in catalog to get its meterId
            const catalogProduct = PRODUCT_CATALOG.find(p => p.key === productKey);
            
            console.log(`🔍 [DEBUG] Matching subscription for product: ${productKey}`);
            console.log(`🔍 [DEBUG] Catalog product found:`, catalogProduct ? `Yes (meterId: ${catalogProduct.meterId})` : 'No');
            
            if (!catalogProduct?.meterId) {
              console.warn(`⚠️ No meterId found for product: ${productKey}`);
              return;
            }
            
            // Find the meter that matches this product's meterId
            const meter = metersByMeterId.get(catalogProduct.meterId);
            
            console.log(`🔍 [DEBUG] Product: ${productKey}, Looking for MeterId: ${catalogProduct.meterId}, Found Meter:`, meter ? `✅ ${meter.creditedUnits} tokens` : '❌ Not found');
            
            if (meter) {
              updatedUsage[productKey] = {
                productKey,
                tierKey: sub.metadata?.tierKey || 'basic',
                tokensTotal: meter.creditedUnits,
                tokensAllocated: meter.creditedUnits,
                seatsTotal: 20, // Default, should come from subscription tier
                seatsUsed: 1,
              };
              
              updatedNonAdminTokens[productKey] = meter.consumedUnits;
              updatedAdminTokenPool[productKey] = meter.balance;
              updatedMetersByProduct[productKey] = {
                meterId: meter.meterId,
                balance: meter.balance,
                consumedUnits: meter.consumedUnits,
                creditedUnits: meter.creditedUnits,
              };
            }
          });
          
          // Set subscription status for all products
          const allProductKeys: ProductKey[] = ['workflows', 'chatbot-builder', 'voice-agent-builder', 'slm'];
          allProductKeys.forEach(key => {
            updatedSubscriptionStatus[key] = activeProductKeys.has(key);
          });
          
          setSnapshot(prev => ({
            ...prev,
            usage: { ...prev.usage, ...updatedUsage },
            nonAdminTokens: { ...prev.nonAdminTokens, ...updatedNonAdminTokens },
            adminTokenPool: { ...prev.adminTokenPool, ...updatedAdminTokenPool },
            subscriptionStatus: updatedSubscriptionStatus,
            metersByProduct: { ...prev.metersByProduct, ...updatedMetersByProduct },
          }));
        }
      } catch (error) {
        console.error('Error fetching Polar data:', error);
      } finally {
        setPolarDataLoading(false);
      }
    };

    fetchPolarData();
  }, [inviterEntityId]);


  // Build employee product access from Convex products data
  useEffect(() => {
    if (!employees || employees.length === 0) return;
    
    const accessMap: Record<string, any[]> = {};
    const tokensMap: Record<string, Record<string, number>> = {};
    
    employees.forEach((emp: any) => {
      const empId = emp.employeeId;
      const empProducts = emp.products || {};
      
      accessMap[empId] = [];
      tokensMap[empId] = {};
      
      Object.entries(empProducts).forEach(([productId, productData]: [string, any]) => {
        const allocated = productData?.allocated || 0;
        // Check both enabled and isEnabled fields (from customFields)
        const isEnabled = productData?.enabled || productData?.isEnabled || 
                         productData?.customFields?.isEnabled || false;
        
        // Store with both normalized (underscore) and hyphenated keys for compatibility
        const hyphenatedKey = productId.replace(/_/g, '-');
        
        accessMap[empId].push({
          productKey: hyphenatedKey,
          isActive: isEnabled,
          allocatedTokens: allocated
        });
        
        // Store tokens with both formats
        tokensMap[empId][productId] = allocated;
        tokensMap[empId][hyphenatedKey] = allocated;
      });
      
      // DEBUG: Log employee token mappings
      console.log(`🔍 [DEBUG] Employee ${empId} (${emp.email}) tokens:`, tokensMap[empId]);
    });
    
    console.log('🔍 [DEBUG] Final employeeTokens map:', tokensMap);
    
    setEmployeeProductAccess(accessMap);
    setEmployeeTokens(tokensMap);
  }, [employees]);





  // Handle product access toggle using Convex
  const handleProductAccessToggle = async (employeeId: string, productKey: string, currentAccess: boolean) => {
    if (!inviterEntityId) return;

    setProductAccessLoading(`${employeeId}-${productKey}`);

    try {
      // Normalize product key to product ID (chatbot-builder -> chatbot_builder)
      const productId = productKey.replace(/-/g, '_');
      
      // Only toggle enabled status, don't change allocated tokens
      await assignProductToEmployee({
        entityId: inviterEntityId,
        employeeId,
        productId,
        customFields: { isEnabled: !currentAccess }
      });

      toast.success(`Product access ${!currentAccess ? 'granted' : 'revoked'}`);
    } catch (error) {
      console.error('Error toggling product access:', error);
      toast.error('Failed to update product access');
    } finally {
      setProductAccessLoading(null);
    }
  };

  // Server actions for seat and token management
  const toggleSeat = async (formData: FormData) => {
    const entityId = formData.get('entityId') as string;
    const memberId = formData.get('memberId') as string;
    const productKey = formData.get('productKey') as string;
    const nextSeat = formData.get('nextSeat') === 'true';
    
    if (!entityId) return;
    
    try {
      // Normalize product key to product ID (chatbot-builder -> chatbot_builder)
      const productId = productKey.replace(/-/g, '_');
      
      // Only toggle enabled status, don't change allocated tokens
      await assignProductToEmployee({
        entityId,
        employeeId: memberId,
        productId,
        customFields: { isEnabled: nextSeat }
      });
      toast.success(nextSeat ? 'Access granted' : 'Access revoked');
    } catch (error) {
      console.error('Error toggling seat:', error);
      toast.error('Failed to update access');
    }
  };

  const adjustTokens = async (formData: FormData) => {
    const entityId = formData.get('entityId') as string;
    const memberId = formData.get('memberId') as string;
    const productKey = formData.get('productKey') as string;
    const direction = formData.get('direction') as string;
    const delta = parseInt(formData.get('delta') as string) || 10000;
    const currentAllocated = parseInt(formData.get('currentAllocated') as string) || 0;
    const ownerId = formData.get('ownerId') as string;
    const ownerAllocated = parseInt(formData.get('ownerAllocated') as string) || 0;
    
    if (!entityId) return;
    
    if (direction === 'increase' && delta > ownerAllocated) {
      toast.error('Not enough tokens in owner pool');
      return;
    }
    if (direction === 'decrease' && delta > currentAllocated) {
      toast.error('Cannot remove more than allocated');
      return;
    }

    const newAllocated = direction === 'increase'
      ? currentAllocated + delta
      : Math.max(0, currentAllocated - delta);
    const newOwnerAllocated = direction === 'increase'
      ? Math.max(0, ownerAllocated - delta)
      : ownerAllocated + delta;
    
    try {
      // Normalize product key to product ID (chatbot-builder -> chatbot_builder)
      const productId = productKey.replace(/-/g, '_');
      
      await assignProductToEmployee({
        entityId,
        employeeId: memberId,
        productId,
        allocated: newAllocated,
        customFields: { isEnabled: true }
      });

      if (ownerId) {
        await assignProductToEmployee({
          entityId,
          employeeId: ownerId,
          productId,
          allocated: newOwnerAllocated,
          customFields: { isEnabled: true }
        });
      }

      toast.success(`Tokens ${direction === 'increase' ? 'added' : 'removed'}`);
    } catch (error) {
      console.error('Error adjusting tokens:', error);
      toast.error('Failed to adjust tokens');
    }
  };

  const handleInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startInviteTransition(async () => {
      try {
        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const email = formData.get("email") as string;
        const name = `${firstName} ${lastName}`.trim();

        if (!inviterEmployeeId || !inviterEntityId) {
          toast.error("Unable to determine inviter. Please refresh and try again.");
          return;
        }

        // Check if employee already exists in current entity
        const existingInCurrentEntity = employees.find(
          (emp: any) => emp.email.toLowerCase() === email.toLowerCase()
        );

        if (existingInCurrentEntity) {
          toast.error(`${email} is already a member of your organization`);
          return;
        }

        // Check if employee exists in other entities via API
        const checkEmailRes = await fetch(
          `/api/auth/employees/by-email?email=${encodeURIComponent(email)}`
        );

        if (checkEmailRes.ok) {
          const data = await checkEmailRes.json();
          if (data.found && data.entityId && data.entityId !== inviterEntityId) {
            toast.error(`${email} is already registered in another organization`);
            return;
          }
        }

        // Create employee in Convex using mutation
        const newEmployeeId = `emp_${Date.now()}`;
        
        console.log("[Invite] Creating employee in Convex:", { entityId: inviterEntityId, employeeId: newEmployeeId, email });
        
        await addEmployee({
          entityId: inviterEntityId,
          employeeId: newEmployeeId,
          email,
          firstName: firstName || "",
          lastName: lastName || "",
          displayName: name || email,
          profileImageUrl: "https://picsum.photos/128",
          roles: ["AGENT"],
          status: "INVITED",
        });
        
        console.log("[Invite] Employee created successfully in Convex");

        // Send Keycloak invite via Next.js API route (proxies to Keycloak)
        console.log("[Invite] Sending Keycloak invite for:", email);
        
        const inviteRes = await fetch("/api/auth/invites/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inviterUid: inviterEmployeeId,
            email,
            firstName: firstName || "",
            lastName: lastName || "",
          }),
        });
        
        console.log("[Invite] Keycloak invite response status:", inviteRes.status);

        if (!inviteRes.ok) {
          const data = await inviteRes.json().catch(() => ({}));
          toast.error(data.error || "Failed to send invite");
          return;
        }

        toast.success("Employee invited", {
          description: `Invitation sent to ${email}`,
        });

        form.reset();
        await refreshSnapshot();
      } catch (error) {
        console.error(error);
        toast.error("Failed to invite employee");
        setRefreshState("error");
      }
    });
  };

  const {
    store,
    catalog,
    subscriptionStatus,
    usage,
    nonAdminTokens,
    adminTokenPool,
    metersByProduct,
  } = snapshot;
  const visibleCatalog = catalog.filter((product) => product.key !== "slm");

  // Calculate active employees count from Convex
  const activeEmployeesCount = employees.filter((emp: any) => {
    const status = emp.status?.toUpperCase() || 'ACTIVE';
    return status === 'ACTIVE';
  }).length;

  const getAccessEnabledMembers = (productKey: string) => {
    return employees.filter((emp: any) => {
      const access = getEmployeeProductAccess(emp.employeeId, productKey);
      return !!access?.isActive;
    });
  };

  // Map real employees to member format
  const realMembers = employees.map((emp: any) => {
    // Check if this employee is the owner by matching userId or email
    const isOwner = emp.userId === authUserId || emp.email === currentEmail;
    const entityRoles = emp.roles || [];
    const hasAdminRole = entityRoles.includes('ADMIN');
    
    return {
      id: emp.employeeId || "",
      name: emp.name || emp.displayName || "",
      email: emp.email || "",
      role: (isOwner || hasAdminRole ? "admin" : "member") as "admin" | "member",
      status: (emp.status?.toUpperCase() || "ACTIVE") as "ACTIVE" | "INVITED" | "INACTIVE",
      isOwner,
      allocations: {
        workflows: { seat: false, tokens: 0 },
        "chatbot-builder": { seat: false, tokens: 0 },
        "voice-agent-builder": { seat: false, tokens: 0 },
        slm: { seat: false, tokens: 0 },
      },
    };
  });

  // Sort to show owner on top, then by name
  const sortedRealMembers = [...realMembers].sort((a, b) => {
    if (a.isOwner) return -1;
    if (b.isOwner) return 1;
    return a.name.localeCompare(b.name);
  });

  // Use real employees if available, otherwise fall back to mock
  const displayMembers = employees.length > 0 ? sortedRealMembers : store.members;
  const externalCustomerId = entityId;
  const updatedLabel = formatTime(snapshot.updatedAt);
  const isRefreshing = refreshState === "loading";
  const refreshTone =
    refreshState === "error"
      ? "bg-rose-500"
      : isRefreshing
        ? "bg-amber-500"
        : "bg-emerald-500";

  // Filter members based on search and role filter
  const filteredMembers = displayMembers.filter((member) => {
    const searchTerm = searchQuery.trim().toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      member.name.toLowerCase().includes(searchTerm) ||
      member.email.toLowerCase().includes(searchTerm);
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleMember = (memberId: string) => {
    setExpandedMembers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  // Helper to get employee's access for a product
  const getEmployeeProductAccess = (employeeId: string, productKey: string) => {
    const access = employeeProductAccess[employeeId];
    if (!access || !Array.isArray(access)) return null;
    return access.find((item: any) => item.productKey === productKey);
  };

  // Helper to get product tier name from real products
  const getProductTier = (productKey: string) => {
    if (!Array.isArray(realProducts)) return null;
    const product = realProducts.find((p: any) => p.key === productKey || p.productKey === productKey);
    if (!product || !product.plans || product.plans.length === 0) return null;
    return product.plans[0]?.planKey || product.plans[0]?.key || null;
  };

  const roleOptions = [
    { value: "admin", label: "Admin", description: "Full system access", icon: Crown, color: "text-yellow-600" },
    { value: "manager", label: "Manager", description: "Manage team members", icon: Shield, color: "text-blue-600" },
    { value: "agent", label: "Agent", description: "Standard access", icon: User, color: "text-green-600" },
    { value: "viewer", label: "Viewer", description: "Read-only access", icon: Eye, color: "text-gray-600" },
  ];

  return (
    <div className="min-h-screen px-6 pb-16 pt-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex items-center">
          <Link
            href="/workflows"
            className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-black/70 transition hover:border-black hover:text-black"
          >
            ← Back to Dashboard
          </Link>
        </div>
        <header className="flex flex-col gap-6 border-b border-black/10 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
              Admin Console
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-black">
              Product access and token management
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-black/60">
              Control which products each teammate can access and allocate
              tokens from the shared pool.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/catalogue"
              className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-black/70 transition hover:border-black hover:text-black"
            >
              Back to catalog
            </Link>
            
            {externalCustomerId ? (
              <a
                href={`/api/polar/customer-portal?externalCustomerId=${externalCustomerId}`}
                className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Manage billing
              </a>
            ) : null}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {polarDataLoading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-3xl border border-black/10 bg-white/70 p-5 shadow-sm animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-black/10 rounded"></div>
                  <div className="h-5 w-16 bg-black/10 rounded-full"></div>
                </div>
                <div className="mt-4 h-3 w-32 bg-black/10 rounded"></div>
                <div className="mt-1 h-3 w-48 bg-black/10 rounded"></div>
                <div className="mt-2 h-2 w-full rounded-full bg-black/10"></div>
                <div className="mt-4 h-3 w-28 bg-black/10 rounded"></div>
                <div className="mt-2 h-2 w-full rounded-full bg-black/10"></div>
              </div>
            ))
          ) : (
            visibleCatalog.map((product) => {
              const summary = usage[product.key];
              const hasSubscription = subscriptionStatus[product.key];
              const meter = metersByProduct[product.key];
              
              // Get token data from Polar meters - this is the source of truth
              const tokensAllocated = meter?.creditedUnits || 0; // Total tokens credited from Polar
              const tokensConsumed = meter?.consumedUnits || 0; // Tokens consumed tracked by Polar
              const tokensRemaining = meter?.balance || 0; // Available balance from Polar
              
              // DEBUG: Log display values
              console.log(`🔍 [DEBUG] Display for ${product.key}:`, {
                meter,
                tokensAllocated,
                tokensConsumed,
                tokensRemaining,
              });
              
              const accessEnabledMembers = getAccessEnabledMembers(product.key);
              const seatsUsed = accessEnabledMembers.length;
              const seatsTotal = employees.length;
              
              const tokenPercent =
                tokensAllocated > 0
                  ? Math.min(100, (tokensConsumed / tokensAllocated) * 100)
                  : 0;
              const seatPercent =
                seatsTotal > 0
                  ? Math.min(100, (seatsUsed / seatsTotal) * 100)
                  : 0;

              return (
                <div
                  key={product.key}
                  className={`rounded-3xl border p-5 shadow-sm transition ${
                    hasSubscription
                      ? "border-black/10 bg-white/70"
                      : "border-black/5 bg-black/5 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-semibold ${
                      hasSubscription ? "text-black" : "text-black/40"
                    }`}>
                      {product.label}
                    </h3>
                    {hasSubscription ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                        {summary?.tierKey || 'active'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40">
                        Inactive
                      </span>
                    )}
                  </div>
                  
                  <div className={`mt-4 text-xs font-semibold ${
                    hasSubscription ? "text-black/60" : "text-black/30"
                  }`}>
                    Tokens allocated: {formatNumber(tokensAllocated)}
                  </div>
                  <div className={`mt-1 text-xs font-medium ${
                    hasSubscription ? "text-black/50" : "text-black/30"
                  }`}>
                    Consumed: {formatNumber(tokensConsumed)} • Remaining: {formatNumber(tokensRemaining)}
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-black/10">
                    <div
                      className={hasSubscription ? "h-2 rounded-full bg-emerald-500" : "h-2 rounded-full bg-black/20"}
                      style={{ width: `${tokenPercent}%` }}
                    />
                  </div>
                  
                  <div className={`mt-4 text-xs font-semibold ${
                    hasSubscription ? "text-black/60" : "text-black/30"
                  }`}>
                    {employeeStatusLoading ? (
                      <div className="flex items-center gap-2">
                        <span>Access enabled</span>
                        <div className="h-3 w-16 bg-black/10 rounded animate-pulse"></div>
                      </div>
                    ) : (
                      <>Access enabled {formatNumber(seatsUsed)} /{" "}
                      {formatNumber(seatsTotal)}</>
                    )}
                  </div>
                  {!employeeStatusLoading && seatsUsed > 0 && (
                    <div className={`mt-1 text-[11px] font-semibold ${
                      hasSubscription ? "text-black/45" : "text-black/30"
                    }`}>
                    </div>
                  )}
                  <div className="mt-2 h-2 w-full rounded-full bg-black/10">
                    <div
                      className={hasSubscription ? "h-2 rounded-full bg-black" : "h-2 rounded-full bg-black/20"}
                      style={{ width: `${seatPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="font-display text-2xl font-semibold text-black">
              Team allocations
            </h2>
            <p className="text-sm font-semibold text-black/50">
              {formatNumber(filteredMembers.length)} of {formatNumber(displayMembers.length)} members
            </p>
          </div>

          {/* Search and Filters */}
          <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <svg
                  className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-11 pr-4 text-sm font-semibold text-black shadow-sm transition focus:border-black/30 focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRoleFilter("all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                    roleFilter === "all"
                      ? "bg-black text-white"
                      : "border border-black/20 text-black/60 hover:border-black hover:text-black"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setRoleFilter("admin")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                    roleFilter === "admin"
                      ? "bg-black text-white"
                      : "border border-black/20 text-black/60 hover:border-black hover:text-black"
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => setRoleFilter("member")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] transition ${
                    roleFilter === "member"
                      ? "bg-black text-white"
                      : "border border-black/20 text-black/60 hover:border-black hover:text-black"
                  }`}
                >
                  Member
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50">
                  Invite teammate
                </p>
                <p className="mt-2 text-sm font-semibold text-black/60">
                  Add a demo teammate to this organization. Invites show up in
                  the list instantly.
                </p>
              </div>
            </div>
            <form
              ref={inviteFormRef}
              onSubmit={handleInvite}
              className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black shadow-sm"
                required
                disabled={invitePending}
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black shadow-sm"
                required
                disabled={invitePending}
              />
              <input
                type="email"
                name="email"
                placeholder="teammate@company.com"
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black shadow-sm"
                required
                disabled={invitePending}
              />
              <button
                type="submit"
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-black/40"
                disabled={invitePending || !inviterEmployeeId || !inviterEntityId}
              >
                {invitePending ? "Inviting..." : "Send invite"}
              </button>
            </form>
          </div>

          {/* Employee Table */}
          {loading || employees.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-white/80 p-12 text-center shadow-sm">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-black/10 border-t-black"></div>
              <p className="mt-4 text-sm font-semibold text-black/60">
                Loading employee details...
              </p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="rounded-3xl border border-black/10 bg-white/80 p-12 text-center shadow-sm">
              <svg
                className="mx-auto h-12 w-12 text-black/20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="mt-4 text-sm font-semibold text-black/60">
                No members found
              </p>
              <p className="mt-1 text-xs font-semibold text-black/40">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white/80 shadow-sm">
              <table className="w-full">
                <thead className="border-b border-black/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                      Role
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => {
                    const isAdminMember = member.id === store.organization.adminId;
                    const isExpanded = expandedMembers.has(member.id);
                    const currentRole = roleOptions.find(r => r.value === member.role) || roleOptions[0];
                    const isDropdownOpen = openRoleDropdown === member.id;
                    const keycloakStatus = keycloakStatuses[member.id];

                    return (
                      <React.Fragment key={member.id}>
                        <tr className="border-b border-black/10">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <p className="text-sm font-semibold text-black">
                                {member.name}
                              </p>
                              {member.isOwner && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm">
                                  <Crown className="h-3 w-3" />
                                  Owner
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-black/40" />
                              <p className="text-xs font-semibold text-black/50">
                                {member.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {member.status === "INVITED" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-700">
                                  <Clock className="h-3 w-3" />
                                  Invited
                                </span>
                              )}
                              {member.status === "ACTIVE" && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Active
                                </span>
                              )}
                              {!member.status && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-700">
                                  Unknown
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <button
                                onClick={() => !member.isOwner && isExpanded && setOpenRoleDropdown(isDropdownOpen ? null : member.id)}
                                disabled={roleChanging === member.id || member.isOwner}
                                className={`group flex min-w-[100px] items-center justify-between gap-2 rounded-xl bg-gradient-to-br from-black to-black/90 px-3 py-1.5 text-left shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isExpanded && !member.isOwner ? "hover:shadow-lg hover:scale-[1.02] cursor-pointer" : "cursor-default"
                                }`}>
                                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white">
                                  {roleChanging === member.id ? "Updating..." : (employeeRoles[member.id]?.[0] || currentRole.label)}
                                </p>
                                {isExpanded && !member.isOwner && (
                                  <svg
                                    className={`h-3 w-3 text-white/70 transition-transform duration-300 group-hover:text-white ${
                                      isDropdownOpen ? "rotate-180" : ""
                                    }`}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                )}
                              </button>

                              {isDropdownOpen && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-[100]" 
                                    onClick={() => setOpenRoleDropdown(null)}
                                  />
                                  <div className="absolute top-full left-0 mt-1 z-[101] w-56 rounded-xl border border-black/10 bg-white p-1 shadow-2xl">
                                    <div className="border-b border-black/5 px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-black/50">
                                        Change Role
                                      </p>
                                    </div>
                                    <div className="p-1">
                                      {roleOptions.map((role) => {
                                        const RoleIcon = role.icon;
                                        return (
                                          <button
                                            key={role.value}
                                            onClick={() => handleRoleChange(member.id, role.value)}
                                            disabled={role.value === member.role}
                                            className={`group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all disabled:cursor-not-allowed ${
                                              role.value === member.role 
                                                ? "bg-emerald-500 shadow-sm" 
                                                : "hover:bg-black/5"
                                            }`}
                                          >
                                            <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${
                                              role.value === member.role
                                                ? "bg-white/20"
                                                : "bg-black/5 group-hover:bg-black/10"
                                            }`}>
                                              {role.value === member.role ? (
                                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                              ) : (
                                                <RoleIcon className={`h-3.5 w-3.5 ${role.color}`} />
                                              )}
                                            </div>
                                            <div className="flex-1">
                                              <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${
                                                role.value === member.role ? "text-white" : "text-black"
                                              }`}>
                                                {role.label}
                                              </p>
                                              <p className={`text-[10px] font-semibold ${
                                                role.value === member.role ? "text-white/80" : "text-black/50"
                                              }`}>
                                                {role.description}
                                              </p>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => toggleMember(member.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-black/60 transition hover:border-black hover:bg-black/5 hover:text-black"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                <svg
                                  className={`h-4 w-4 transition-transform duration-300 ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="border-b border-black/10 bg-black/5 p-6">
                              <div className="mb-4 text-sm font-semibold text-black/70">
                                Product Access & Token Allocation
                              </div>
                              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {visibleCatalog.map((product) => {
                                  const allocation = member.allocations[product.key];
                                  const summary = usage[product.key];
                                  const hasSubscription = subscriptionStatus[product.key];
                                  
                                  // Get current member status
                                  const memberStatus = keycloakStatuses[member.id];
                                  const isInvited = memberStatus === 'INVITED';
                                  const isActive = memberStatus === 'ACTIVE';
                                  
                                  // Get real product access from Convex
                                  const realAccess = getEmployeeProductAccess(member.id, product.key);
                                  const hasRealAccess = realAccess?.isActive || false;
                                  
                                  // Get token allocation for this employee-product
                                  const allocatedTokens = employeeTokens[member.id]?.[product.key] || 0;
                                  
                                  // Owner always has access when subscription is active (forced on)
                                  const isOwnerWithSubscription = member.isOwner && hasSubscription;
                                  const seatOn = isOwnerWithSubscription ? true : hasRealAccess;
                                  
                                  // Disable toggle for owner (can't be turned off) or no subscription
                                  const seatToggleDisabled = member.isOwner || !hasSubscription;
                                  const tokensRemaining = inviterEmployeeId
                                    ? (employeeTokens[inviterEmployeeId]?.[product.key] || 0)
                                    : 0;
                                  
                                  // Can adjust tokens if access is enabled and subscription is active
                                  const canAdjustTokens = seatOn && hasSubscription && tokensRemaining > 0;

                                  // Get product tier from real products
                                  const realTier = getProductTier(product.key);

                                  return (
                                    <div
                                      key={product.key}
                                      className="rounded-2xl border border-black/10 bg-white p-4"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                                            {product.label}
                                          </p>
                                          <p className="text-xs font-semibold text-black/50">
                                            {realAccess ? (
                                              <span className="flex items-center gap-1">
                                                Tier: {realAccess.planId || realTier || summary.tierKey}
                                                {realAccess.isActive && (
                                                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-700">
                                                    Active
                                                  </span>
                                                )}
                                              </span>
                                            ) : hasSubscription ? (
                                              `Tier ${summary.tierKey}`
                                            ) : (
                                              "No subscription"
                                            )}
                                          </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <form action={toggleSeat}>
                                            <input type="hidden" name="entityId" value={inviterEntityId || ""} />
                                            <input type="hidden" name="memberId" value={member.id} />
                                            <input type="hidden" name="productKey" value={product.key} />
                                            <input type="hidden" name="nextSeat" value={seatOn ? "false" : "true"} />
                                            <button
                                              className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
                                                seatToggleDisabled ? "cursor-not-allowed text-black/40" : "text-black"
                                              }`}
                                              type="submit"
                                              disabled={seatToggleDisabled}
                                              role="switch"
                                              aria-checked={seatOn}
                                            >
                                              <span>Access</span>
                                              <span
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full border transition ${
                                                  seatOn ? "border-black bg-black" : "border-black/20 bg-black/10"
                                                }`}
                                              >
                                                <span
                                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                    seatOn ? "translate-x-4" : "translate-x-1"
                                                  }`}
                                                />
                                              </span>
                                            </button>
                                          </form>
                                        </div>
                                      </div>

                                      <div className="mt-4 text-xs font-semibold text-black/60">
                                        {realAccess ? (
                                          <>
                                            Allocated {formatNumber(realAccess.allocatedTokens || 0)}
                                            ({formatNumber(realAccess.usedTokens || 0)} used, {formatNumber((realAccess.allocatedTokens || 0) - (realAccess.usedTokens || 0))} remaining)
                                          </>
                                        ) : (
                                          <>
                                            Allocated {formatNumber(allocation.tokens)} / {formatNumber(summary.tokensTotal)}
                                          </>
                                        )}
                                      </div>
                                      <div className="mt-1 text-[10px] font-semibold text-black/45">
                                        {formatNumber(tokensRemaining)} tokens left in pool
                                      </div>

                                      {/* Show token management for everyone except owner */}
                                      {!member.isOwner && (
                                        <form action={adjustTokens} className="mt-3 flex items-center gap-2">
                                        <input type="hidden" name="entityId" value={inviterEntityId || ""} />
                                        <input type="hidden" name="memberId" value={member.id} />
                                        <input type="hidden" name="productKey" value={product.key} />
                                        <input type="hidden" name="currentAllocated" value={allocatedTokens.toString()} />
                                        <input type="hidden" name="ownerId" value={inviterEmployeeId || ""} />
                                        <input type="hidden" name="ownerAllocated" value={tokensRemaining.toString()} />
                                        <input
                                          type="number"
                                          name="delta"
                                          min={1000}
                                          step={1000}
                                          defaultValue={10000}
                                          className="w-20 rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] text-black"
                                          disabled={!seatOn}
                                        />
                                        <button
                                          name="direction"
                                          value="increase"
                                          className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white disabled:cursor-not-allowed disabled:bg-emerald-500/40"
                                          type="submit"
                                          disabled={!seatOn || tokensRemaining <= 0}
                                        >
                                          Add
                                        </button>
                                        <button
                                          name="direction"
                                          value="decrease"
                                          className="rounded-full border border-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-black disabled:cursor-not-allowed disabled:text-black/40"
                                          type="submit"
                                          disabled={!seatOn || allocatedTokens <= 0}
                                        >
                                          Remove
                                        </button>
                                      </form>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <div className="h-50" />
      </div>
    </div>
  );
}
