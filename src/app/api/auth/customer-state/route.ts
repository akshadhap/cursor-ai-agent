import { cookies } from "next/headers";
import { getPolarClient } from "@/lib/polar";

export async function GET() {
  const cookieStore = await cookies();
  const email = cookieStore.get("email")?.value;

  if (!email) {
    return Response.json({ data: null }, { status: 200 });
  }

  try {
    const polarClient = getPolarClient();
    // Get customer state from Polar.sh
    const customer = await polarClient.customers.getStateExternal({
      externalId: email,
    });

    return Response.json({
      data: {
        activeSubscriptions: customer.activeSubscriptions || [],
        customer: customer,
      },
    });
  } catch (error: any) {
    // If customer doesn't exist in Polar, return empty state
    console.log(`No Polar customer found for ${email}`);
    return Response.json({
      data: {
        activeSubscriptions: [],
      },
    });
  }
}
