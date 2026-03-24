import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";

const DAILY_LEAD_LIMIT = 20;

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id as string;

    // Get today's date (date only, no time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check or create daily quota record for this user
    let quotaRecord = await prisma.dailyLeadQuota.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: today,
        },
      },
    });

    if (!quotaRecord) {
      quotaRecord = await prisma.dailyLeadQuota.create({
        data: {
          userId: userId,
          date: today,
          leadsGenerated: 0,
        },
      });
    }

    const remaining = DAILY_LEAD_LIMIT - quotaRecord.leadsGenerated;

    return NextResponse.json({
      limit: DAILY_LEAD_LIMIT,
      used: quotaRecord.leadsGenerated,
      remaining: remaining,
    });
  } catch (error) {
    console.error("Error fetching daily quota:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily quota" },
      { status: 500 }
    );
  }
}
