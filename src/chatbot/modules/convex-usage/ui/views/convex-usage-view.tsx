"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function msToReadable(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export const ConvexUsageView = () => {
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  const usage = useQuery(
    (api as any).private.convexUsageEstimated.getMonthToDate,
    entityId ? { entityId } : "skip",
  );

  const totals = usage?.total;

  const derived = useMemo(() => {
    const db = totals?.databaseBytes ?? 0;
    const vector = totals?.vectorBytes ?? 0;
    const file = totals?.fileBytes ?? 0;

    return {
      dbBytes: db,
      vectorBytes: vector,
      fileBytes: file,
    };
  }, [totals]);

  return (
    <div className="flex h-full flex-col bg-muted">
      <PageHeader
        title="Convex Usage"
        description="Estimated usage (Free plan): based on in-app instrumentation of file reads and vector operations."
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto w-full max-w-screen-lg space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Database bandwidth</div>
                  <div className="text-2xl font-semibold">{formatBytes(derived.dbBytes)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Vector bandwidth</div>
                  <div className="text-2xl font-semibold">{formatBytes(derived.vectorBytes)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">File bandwidth</div>
                  <div className="text-2xl font-semibold">{formatBytes(derived.fileBytes)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
