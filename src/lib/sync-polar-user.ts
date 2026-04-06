import { ensureCustomerByExternalId, getPolarClientOrNull } from "./polar";

/**
 * Syncs a Keycloak user to Polar.sh and creates a customer if needed
 * Only creates customer if user is the entity owner/admin
 */
export async function syncUserToPolar(email: string, name?: string) {
  try {
    console.log(`[Polar Sync] Starting sync for ${email}`);
    
    // Use the internal API route which proxies to Entity API
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    let entityId: string | null = null;
    let entityName: string | null = name || null;
    let isOwner = false;

    try {
      // First, get basic entity info (entityId, employeeId)
      const entityResponse = await fetch(`${apiUrl}/api/auth/entity-by-email?email=${encodeURIComponent(email)}`);
      console.log(`[Polar Sync] Entity API response status: ${entityResponse.status}`);
      
      if (entityResponse.ok) {
        const basicEntityData = await entityResponse.json();
        console.log(`[Polar Sync] Basic entity data:`, JSON.stringify(basicEntityData, null, 2));
        
        entityId = basicEntityData.entityId;
        const userEmployeeId = basicEntityData.employeeId;
        
        if (entityId) {
          // Fetch detailed entity information to get createdBy
          const detailsResponse = await fetch(`${apiUrl}/api/auth/entities/${entityId}/details`);
          console.log(`[Polar Sync] Details API response status: ${detailsResponse.status}`);
          
          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            console.log(`[Polar Sync] Detailed entity data:`, JSON.stringify(detailsData, null, 2));
            
            // Extract entity name and createdBy from the nested entity object
            entityName = detailsData.entity?.name || basicEntityData.name || name || email.split("@")[0];
            const entityCreatedBy = detailsData.entity?.createdBy;
            
            console.log(`[Polar Sync] Extracted values - entityId: ${entityId}, employeeId: ${userEmployeeId}, createdBy: ${entityCreatedBy}`);
            
            // User is owner only if they created the entity
            isOwner = !!userEmployeeId && !!entityCreatedBy && userEmployeeId === entityCreatedBy;
            console.log(`[Polar Sync] Is owner (creator): ${isOwner} (employeeId: ${userEmployeeId}, createdBy: ${entityCreatedBy})`);
          } else {
            console.warn(`[Polar Sync] Failed to fetch entity details: ${detailsResponse.status}`);
          }
        }
        
        console.log(`[Polar Sync] Found entity for ${email}: ${entityId}`);
      } else {
        const errorText = await entityResponse.text();
        console.warn(`[Polar Sync] Entity API returned ${entityResponse.status}: ${errorText}`);
      }
    } catch (error) {
      console.warn("[Polar Sync] Failed to fetch entity info, using email as fallback:", error);
    }

    // Only create Polar customer if user is the owner (creator)
    if (!isOwner) {
      console.log(`[Polar Sync] ⚠️ User ${email} is not the entity owner, skipping Polar customer creation`);
      return null;
    }

    // Use entityId if available, otherwise fallback to email
    const externalId = entityId || email;
    
    console.log(`[Polar Sync] Creating/fetching customer with externalId: ${externalId}`);
    
    // Create or get customer in Polar using the proper function
    const customer = await ensureCustomerByExternalId(externalId, {
      email: email,
      name: entityName,
    });
    
    console.log(`[Polar Sync] ✅ Successfully synced Polar customer for ${email} (externalId: ${externalId})`);
    return customer;
  } catch (error) {
    console.error("[Polar Sync] ❌ Failed to sync user to Polar:", error);
    throw error; // Re-throw to see the error in the calling code
  }
}

/**
 * Checks if a user has an active subscription
 */
export async function hasActiveSubscription(email: string): Promise<boolean> {
  try {
    const polar = getPolarClientOrNull();
    if (!polar) {
      return false;
    }

    // Use the internal API route
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let externalId = email;

    try {
      const entityResponse = await fetch(`${apiUrl}/api/auth/entity-by-email?email=${encodeURIComponent(email)}`);
      if (entityResponse.ok) {
        const entityData = await entityResponse.json();
        externalId = entityData.entityId || email;
      }
    } catch {
      // Use email as fallback
    }

    const customer = await polar.customers.getStateExternal({
      externalId: externalId,
    });

    return (
      customer.activeSubscriptions !== undefined &&
      customer.activeSubscriptions.length > 0
    );
  } catch (error) {
    console.error("Failed to check subscription status:", error);
    return false;
  }
}
