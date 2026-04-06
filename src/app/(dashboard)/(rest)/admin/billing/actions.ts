"use server";

import { revalidatePath } from "next/cache";

export const adjustTokens = async (formData: FormData) => {
  const entityId = formData.get("entityId") as string;
  const memberId = formData.get("memberId") as string;
  const productKey = formData.get("productKey") as string;
  const delta = formData.get("delta") as string;
  const direction = formData.get("direction") as string;
  const currentAllocatedStr = formData.get("currentAllocated") as string;
  
  if (!entityId || !memberId || !productKey || !delta || !direction || !currentAllocatedStr) {
    console.error("Missing required fields for adjustTokens");
    return;
  }

  const deltaAmount = parseInt(delta, 10);
  const currentAllocated = parseInt(currentAllocatedStr, 10);
  
  if (isNaN(deltaAmount) || deltaAmount <= 0) {
    console.error("Invalid delta amount");
    return;
  }

  if (isNaN(currentAllocated)) {
    console.error("Invalid current allocation");
    return;
  }

  try {
    // Calculate new allocation based on current value (passed from client)
    let newAllocated: number;
    if (direction === "increase") {
      newAllocated = currentAllocated + deltaAmount;
    } else if (direction === "decrease") {
      newAllocated = Math.max(0, currentAllocated - deltaAmount);
    } else {
      console.error("Invalid direction");
      return;
    }

    console.log('Adjusting tokens:', { memberId, productKey, currentAllocated, deltaAmount, direction, newAllocated });

    // Update token allocation via Entity API via Next.js proxy
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const putUrl = `${baseUrl}/api/auth/entities/${encodeURIComponent(entityId)}/employees/${encodeURIComponent(memberId)}/tokens/${encodeURIComponent(productKey)}`;
    
    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allocated: newAllocated,
      }),
    });

    console.log('Adjust tokens response status:', response.status);

    if (!response.ok) {
      const responseText = await response.text();
      console.error('Adjust tokens error response:', responseText);
      
      let errorData: any = { error: 'Unknown error' };
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText || response.statusText };
      }
      
      throw new Error(`Failed to adjust tokens: ${errorData.error || response.statusText}`);
    }

    const responseData = await response.json().catch(() => ({}));
    console.log("✓ Tokens adjusted:", { memberId, productKey, newAllocated, response: responseData });
  } catch (error) {
    console.error("Error adjusting tokens:", error);
    throw error;
  }
  
  revalidatePath("/admin/billing");
};

export const toggleSeat = async (formData: FormData) => {
  const entityId = formData.get("entityId") as string;
  const memberId = formData.get("memberId") as string;
  const productKey = formData.get("productKey") as string;
  const nextSeat = formData.get("nextSeat") as string;
  
  if (!entityId || !memberId || !productKey) {
    console.error("Missing required fields for toggleSeat");
    return;
  }

  const hasAccess = nextSeat === "true";
  
  try {
    // Update product access via Entity API
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/auth/entities/${entityId}/employees/${memberId}/products/${productKey}`;
    
    console.log('Toggle seat request:', { apiUrl, entityId, memberId, productKey, hasAccess });
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isActive: hasAccess,
      }),
    });

    console.log('Toggle seat response status:', response.status, response.statusText);

    if (!response.ok) {
      // Try to get the response text first to see what we're dealing with
      const responseText = await response.text();
      console.error('Toggle seat error response:', responseText);
      
      let errorData: any = { error: 'Unknown error' };
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        // If not JSON, use the text as error
        errorData = { error: responseText || response.statusText };
      }
      
      throw new Error(`Failed to toggle product access: ${errorData.error || response.statusText}`);
    }

    console.log("✓ Product access toggled:", { memberId, productKey, hasAccess });
  } catch (error) {
    console.error("Error toggling product access:", error);
    throw error;
  }
  
  revalidatePath("/admin/billing");
};

export const inviteMember = async (formData: FormData) => {
  // Mock implementation - replace with actual logic
  const name = formData.get("name");
  const email = formData.get("email");
  
  console.log("Invite member:", { name, email });
  
  revalidatePath("/admin/billing");
};
