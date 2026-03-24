import { cookies } from "next/headers";
import { getPolarClient } from "@/lib/polar";

export async function POST() {
  const cookieStore = await cookies();
  const email = cookieStore.get("email")?.value;

  if (!email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const polarClient = getPolarClient();
    // Get customer portal URL from Polar
    const customer = await polarClient.customers.getStateExternal({
      externalId: email,
    });

    // Polar doesn't have a direct portal URL, redirect to their dashboard
    // You might need to customize this based on your Polar setup
    const portalUrl = `https://polar.sh/customers/${customer.id}`;

    return Response.json({ url: portalUrl });
  } catch (error: any) {
    console.error("Polar portal error:", error);
    return Response.json(
      { error: error.message || "Failed to get portal URL" },
      { status: 500 }
    );
  }
}
