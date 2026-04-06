"use client";

import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Loader2Icon } from "lucide-react";
import type { Id } from "@/../convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { PageHeader } from "@/components/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CHATBOT_ANALYTICS_KEY = "analytics-chatbot-id";

type RangePreset = "7d" | "30d" | "90d";

const msToReadable = (ms: number | null) => {
  if (!ms || ms <= 0) return "-";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

const pct = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
};

const pctTick = (value: unknown) => {
  if (typeof value !== "number") return "";
  return `${Math.round(value * 100)}%`;
};

const msTick = (value: unknown) => {
  if (typeof value !== "number") return "";
  return msToReadable(value);
};

const intTick = (value: unknown) => {
  if (typeof value !== "number") return "";
  return String(Math.round(value));
};

export const AnalyticsView = () => {
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  const chatbotsResult = useQuery(
    api.private.chatbots.getMany,
    entityId
      ? { entityId, paginationOpts: { numItems: 100, cursor: null } }
      : "skip"
  );

  const chatbots = chatbotsResult?.page ?? [];

  const [selectedChatbotId, setSelectedChatbotId] = useState<
    Id<"chatbots"> | "all" | null
  >(null);
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);

  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!entityId) {
      setSelectedChatbotId(null);
      setHasInitializedSelection(false);
      return;
    }

    const scopedKey = `${CHATBOT_ANALYTICS_KEY}:${entityId}`;
    const stored = localStorage.getItem(scopedKey);

    if (stored === "all") {
      setSelectedChatbotId("all");
    } else {
      setSelectedChatbotId((stored as Id<"chatbots"> | null) ?? "all");
    }

    setHasInitializedSelection(true);
  }, [entityId]);

  useEffect(() => {
    if (!hasInitializedSelection) return;
    if (typeof window === "undefined") return;
    if (!entityId) return;

    const scopedKey = `${CHATBOT_ANALYTICS_KEY}:${entityId}`;
    localStorage.setItem(scopedKey, selectedChatbotId ?? "all");
  }, [entityId, selectedChatbotId, hasInitializedSelection]);

  const { from, to } = useMemo(() => {
    const now = Date.now();
    const days = rangePreset === "7d" ? 7 : rangePreset === "30d" ? 30 : 90;
    return { from: now - days * 24 * 60 * 60 * 1000, to: now };
  }, [rangePreset]);

  const kpis = useQuery(
    api.private.analytics.getKpis,
    entityId && selectedChatbotId && hasInitializedSelection
      ? {
          entityId,
          chatbotId:
            selectedChatbotId === "all"
              ? undefined
              : (selectedChatbotId as Id<"chatbots">),
          from,
          to,
        }
      : "skip"
  );

  const trends = useQuery(
    api.private.analytics.getKpiTrends,
    entityId && selectedChatbotId && hasInitializedSelection
      ? {
          entityId,
          chatbotId:
            selectedChatbotId === "all"
              ? undefined
              : (selectedChatbotId as Id<"chatbots">),
          from,
          to,
        }
      : "skip",
  );

  const trendPoints = trends?.points ?? [];

  const isLoading =
    chatbotsResult === undefined ||
    users === undefined ||
    entityId === null ||
    !hasInitializedSelection ||
    (entityId && selectedChatbotId && (kpis === undefined || trends === undefined));

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-y-2 bg-muted p-8">
        <Loader2Icon className="animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-muted">
      <PageHeader
        title="Analytics"
        description="Track key performance indicators for your chatbot"
      />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-screen-lg mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chatbot-select">Chatbot</Label>
              <Select
                value={selectedChatbotId ?? "all"}
                onValueChange={(value) =>
                  setSelectedChatbotId(value === "all" ? "all" : (value as Id<"chatbots">))
                }
              >
                <SelectTrigger id="chatbot-select">
                  <SelectValue placeholder="Select a chatbot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All chatbots</SelectItem>
                  {chatbots.map((chatbot) => (
                    <SelectItem key={chatbot._id} value={chatbot._id}>
                      {chatbot.name}
                      {chatbot.isDefault && " (Default)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="range-select">Date range</Label>
              <Select value={rangePreset} onValueChange={(v) => setRangePreset(v as RangePreset)}>
                <SelectTrigger id="range-select">
                  <SelectValue placeholder="Select a range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 space-y-1">
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground cursor-help">Sessions</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Total number of chat sessions started in the selected date range.
                  </TooltipContent>
                </UiTooltip>
                <div className="text-2xl font-semibold">{kpis?.sessions ?? 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground cursor-help">Resolution rate</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Share of sessions marked resolved (resolved sessions ÷ total sessions) in this range.
                  </TooltipContent>
                </UiTooltip>
                <div className="text-2xl font-semibold">{pct(kpis?.resolutionRate ?? null)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground cursor-help">Containment rate</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Share of sessions handled by the chatbot without escalation to a human agent.
                  </TooltipContent>
                </UiTooltip>
                <div className="text-2xl font-semibold">{pct(kpis?.containmentRate ?? null)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground cursor-help">Avg response time</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={6}>
                    Average time between a user message and the assistant reply.
                  </TooltipContent>
                </UiTooltip>
                <div className="text-2xl font-semibold">
                  {msToReadable(kpis?.avgResponseTimeMs ?? null)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="mb-3 text-sm font-medium">KPI trends</div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendPoints} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                    <YAxis yAxisId="rate" tickFormatter={pctTick} domain={[0, 1]} />
                    <YAxis yAxisId="time" orientation="right" tickFormatter={msTick} />
                    <YAxis yAxisId="count" orientation="right" tickFormatter={intTick} width={60} />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const key = String(name);
                        if (key === "resolutionRate" || key === "containmentRate") {
                          return pct(typeof value === "number" ? value : null);
                        }
                        if (key === "avgResponseTimeMs") {
                          return msToReadable(typeof value === "number" ? value : null);
                        }
                        if (key === "sessions") {
                          return typeof value === "number" ? Math.round(value) : value;
                        }
                        return value;
                      }}
                      labelFormatter={(label: any) => String(label)}
                    />
                    <Legend
                      formatter={(value: any) => {
                        if (value === "sessions") return "Sessions";
                        if (value === "resolutionRate") return "Resolution rate";
                        if (value === "containmentRate") return "Containment rate";
                        if (value === "avgResponseTimeMs") return "Avg response time";
                        return String(value);
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sessions"
                      yAxisId="count"
                      stroke="#64748b"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="resolutionRate"
                      yAxisId="rate"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="containmentRate"
                      yAxisId="rate"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="avgResponseTimeMs"
                      yAxisId="time"
                      stroke="#a855f7"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
