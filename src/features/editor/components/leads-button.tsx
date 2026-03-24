"use client";

import { useState, useMemo } from "react";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type LeadStatus = "qualified" | "not_qualified" | "in_review";
type EmailStatus = "not_sent" | "sent" | "delivered" | "opened" | "bounced";
type LeadSource = "webform" | "excel" | "crm";

type LeadRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  score: number;
  status: LeadStatus;
  emailStatus: EmailStatus;
  followupsSent: number;
  lastActivityAt?: string; // ISO string
  source: LeadSource;
};

export const LeadsButton = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  const wf = (workflow || {}) as any;

  const [open, setOpen] = useState(false);

  const isDeveloper = wf.isDeveloper ?? true;
  const isGuided = !isDeveloper;

  // 🔒 Only show this button in guided mode
  if (!isGuided) return null;

  // Map workflow.leads (Prisma) → LeadRow[]
  const leads: LeadRow[] = useMemo(() => {
    const rawLeads = wf.leads as any[] | undefined;
    if (!rawLeads || rawLeads.length === 0) return [];

    return rawLeads.map((lead) => {
      const status = (lead.status?.toLowerCase() || "in_review") as LeadStatus;
      const emailStatus = (lead.emailStatus?.toLowerCase() ||
        "not_sent") as EmailStatus;
      const source = (lead.source?.toLowerCase() || "webform") as LeadSource;

      return {
        id: lead.id,
        name: lead.name || "Unnamed lead",
        company: lead.company || "",
        email: lead.email || "",
        score: lead.score ?? 0,
        status,
        emailStatus,
        followupsSent: lead.followupsSent ?? 0,
        lastActivityAt: lead.lastActivityAt
          ? new Date(lead.lastActivityAt).toISOString()
          : undefined,
        source,
      } satisfies LeadRow;
    });
  }, [wf]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LeadStatus>("all");

  const summary = useMemo(() => {
    const total = leads.length;
    const qualified = leads.filter((l) => l.status === "qualified").length;
    const opened = leads.filter((l) => l.emailStatus === "opened").length;

    return { total, qualified, opened };
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (!search.trim()) return true;

      const q = search.toLowerCase();
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.company.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q)
      );
    });
  }, [leads, search, statusFilter]);

  const formatStatus = (status: LeadStatus) => {
    switch (status) {
      case "qualified":
        return "Qualified";
      case "not_qualified":
        return "Not qualified";
      case "in_review":
        return "In review";
    }
  };

  const formatEmailStatus = (status: EmailStatus) => {
    switch (status) {
      case "not_sent":
        return "Not sent";
      case "sent":
        return "Sent";
      case "delivered":
        return "Delivered";
      case "opened":
        return "Opened";
      case "bounced":
        return "Bounced";
    }
  };

  const statusBadgeVariant = (
    status: LeadStatus
  ): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "qualified":
        return "default";
      case "in_review":
        return "secondary";
      case "not_qualified":
        return "outline";
      default:
        return "secondary";
    }
  };

  const emailBadgeVariant = (
    status: EmailStatus
  ): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "opened":
        return "default";
      case "delivered":
      case "sent":
        return "secondary";
      case "not_sent":
        return "outline";
      case "bounced":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Leads
        </Button>
      </DialogTrigger>

      {/* Single-scroll, modern modal layout */}
      <DialogContent className="w-[95vw] max-w-5xl p-0 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Fixed header area (no scroll) */}
        <div className="border-b bg-background/80 backdrop-blur px-6 pt-6 pb-4 space-y-2">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-semibold">
              Leads for this workflow
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              View lead status, scores, and email engagement for all leads
              entering this workflow.
            </p>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-5">
          {/* Summary chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border bg-muted/40 px-3 py-2.5">
              <div className="text-muted-foreground">Total leads</div>
              <div className="text-lg font-semibold">{summary.total}</div>
            </div>
            <div className="rounded-xl border bg-muted/40 px-3 py-2.5">
              <div className="text-muted-foreground">Qualified</div>
              <div className="text-lg font-semibold">{summary.qualified}</div>
            </div>
            <div className="rounded-xl border bg-muted/40 px-3 py-2.5">
              <div className="text-muted-foreground">Opened email</div>
              <div className="text-lg font-semibold">{summary.opened}</div>
            </div>
          </div>

          <Separator />

          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Search by name, company, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs sm:max-w-xs"
            />

            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 rounded-md border bg-background px-2 text-xs"
              >
                <option value="all">All</option>
                <option value="qualified">Qualified</option>
                <option value="in_review">In review</option>
                <option value="not_qualified">Not qualified</option>
              </select>
            </div>
          </div>

          {/* Desktop: table view */}
          <div className="hidden md:block rounded-lg border bg-card/40">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-[200px]">Lead</TableHead>
                  <TableHead className="w-[80px]">Score</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[130px]">Email status</TableHead>
                  <TableHead className="w-[110px]">Follow-ups</TableHead>
                  <TableHead className="w-[90px]">Source</TableHead>
                  <TableHead className="w-[160px]">Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-xs text-muted-foreground"
                    >
                      No leads yet. Once you ingest leads (webform, Excel, or
                      CRM), they will appear here with their qualification and
                      email status.
                    </TableCell>
                  </TableRow>
                )}

                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="text-xs">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {lead.name || "Unnamed lead"}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {lead.company || "—"}
                        </span>
                        <span className="text-muted-foreground text-[11px] truncate">
                          {lead.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium">{lead.score}</span>
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusBadgeVariant(lead.status)}>
                        {formatStatus(lead.status)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge variant={emailBadgeVariant(lead.emailStatus)}>
                        {formatEmailStatus(lead.emailStatus)}
                      </Badge>
                    </TableCell>

                    <TableCell>{lead.followupsSent}</TableCell>

                    <TableCell className="capitalize">
                      {lead.source}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-[11px]">
                      {lead.lastActivityAt
                        ? new Date(lead.lastActivityAt).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: card view (no horizontal scroll) */}
          <div className="space-y-3 md:hidden">
            {filteredLeads.length === 0 && (
              <div className="rounded-lg border bg-muted/40 px-4 py-5 text-xs text-muted-foreground text-center">
                No leads yet. Once you ingest leads (webform, Excel, or CRM),
                they will appear here with their qualification and email status.
              </div>
            )}

            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border bg-card/60 p-3 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {lead.name || "Unnamed lead"}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {lead.company || "—"}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {lead.email}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold">
                    Score: {lead.score}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusBadgeVariant(lead.status)}>
                    {formatStatus(lead.status)}
                  </Badge>
                  <Badge variant={emailBadgeVariant(lead.emailStatus)}>
                    {formatEmailStatus(lead.emailStatus)}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Follow-ups: {lead.followupsSent}
                  </span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    Source: {lead.source}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Last activity:{" "}
                  {lead.lastActivityAt
                    ? new Date(lead.lastActivityAt).toLocaleString()
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
