import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";
import { authRequest } from "@/lib/authHttpClient";
import { getAuthApi } from "@/lib/getAuthApi";

export async function POST(req: NextRequest) {
  const INVITES_API = getAuthApi();
  try {
    const { inviterUid, entityId } = await req.json();

    if (!inviterUid || !entityId) {
      return NextResponse.json(
        { error: "inviterUid and entityId are required" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------
       🔐 FETCH INVITES
    -------------------------------------------------- */
    const invitesRes = await authRequest(INVITES_API, {
      url: `${INVITES_API}/auth/invites/by-inviter?uid=${encodeURIComponent(
        inviterUid
      )}`,
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const invites = invitesRes.data ?? [];
    const results: Array<{
      inviteId: string;
      updated?: boolean;
      error?: string;
    }> = [];

    /* --------------------------------------------------
       🔌 CONVEX SETUP
    -------------------------------------------------- */
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        { error: "Convex not configured" },
        { status: 503 }
      );
    }

    const convex = new ConvexHttpClient(
      process.env.NEXT_PUBLIC_CONVEX_URL
    );

    const employees = await convex.query(
      api.public.entities.listEmployees,
      { entityId }
    );

    const emailToEmployeeId = new Map<string, string>();
    for (const emp of Array.isArray(employees) ? employees : []) {
      if (emp?.email && emp?.employeeId) {
        emailToEmployeeId.set(
          String(emp.email).toLowerCase(),
          String(emp.employeeId)
        );
      }
    }

    /* --------------------------------------------------
       🔄 RECONCILE INVITES → EMPLOYEES
    -------------------------------------------------- */
    for (const inv of Array.isArray(invites) ? invites : []) {
      const inviteId = inv.inviteId || inv.invite_id;
      const invitedEmail =
        inv.invitedEmail ?? inv.invited_email ?? null;
      const status = inv.status ?? null;

      const accepted = !!(
        inv.acceptedAt ||
        inv.accepted_at ||
        (typeof status === "string" &&
          ["active", "SUCCESS", "success"].includes(status))
      );

      if (!accepted) continue;

      if (!invitedEmail) {
        results.push({
          inviteId,
          updated: false,
          error: "Invite missing email",
        });
        continue;
      }

      const employeeId = emailToEmployeeId.get(
        String(invitedEmail).toLowerCase()
      );

      if (!employeeId) {
        results.push({
          inviteId,
          updated: false,
          error: `No employee matched email ${invitedEmail}`,
        });
        continue;
      }

      try {
        await convex.mutation(api.public.entities.updateEmployee, {
          entityId,
          employeeId,
          status: "ACTIVE",
        });

        results.push({ inviteId, updated: true });
      } catch (e: any) {
        results.push({
          inviteId,
          updated: false,
          error: e?.message || String(e),
        });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error(
      "sync-entity-status error",
      err.response?.data || err
    );

    return NextResponse.json(
      { error: err?.message || "Failed to sync invites" },
      { status: err.response?.status || 500 }
    );
  }
}
