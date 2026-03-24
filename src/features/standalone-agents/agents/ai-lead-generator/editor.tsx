"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BotIcon,
  Loader2Icon,
  SendIcon,
  ExternalLinkIcon,
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  GlobeIcon,
  UsersIcon,
  MapPinIcon,
  BriefcaseIcon,
  TrendingUpIcon,
} from "lucide-react";
import { parseNaturalLanguageQuery } from "./config-new";
import type { StandaloneAgentEditorProps } from "../../lib/get-standalone-agent-editor";

export default function AiLeadGeneratorEditor(props: StandaloneAgentEditorProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 20;

  const [quota, setQuota] = useState<{
    limit: number;
    used: number;
    remaining: number;
  } | null>(null);

  // Calculate pagination
  const totalPages = Math.ceil(leads.length / leadsPerPage);
  const startIndex = (currentPage - 1) * leadsPerPage;
  const endIndex = startIndex + leadsPerPage;
  const paginatedLeads = leads.slice(startIndex, endIndex);

  // Load existing leads on mount
  useEffect(() => {
    const loadExistingLeads = async () => {
      try {
        const response = await fetch(`/api/standalone-agents/${props.agentId}`);
        if (response.ok) {
          const agentData = await response.json();
          if (agentData.data && agentData.data.leads) {
            setLeads(agentData.data.leads);
            if (agentData.data.lastPrompt) {
              setPrompt(agentData.data.lastPrompt);
            }
          }
        }
      } catch (error) {
        console.error("Error loading existing leads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingLeads();
  }, [props.agentId]);

  // Fetch daily quota on mount
  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const response = await fetch("/api/daily-quota");
        if (response.ok) {
          const data = await response.json();
          if (data.limit !== undefined) {
            setQuota(data);
          }
        }
      } catch (error) {
        console.error("Error fetching quota:", error);
      }
    };

    fetchQuota();
  }, []);

  const handleGenerateLeads = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      // Parse the natural language query
      const filters = parseNaturalLanguageQuery(prompt);

      // Call API to generate leads
      const response = await fetch(
        "/api/standalone-agents/ai-lead-generator/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            filters,
            agentId: props.agentId,
          }),
        }
      );

      const data = await response.json();

      // Handle quota limit error
      if (response.status === 429) {
        toast.error(data.message || "Daily lead limit reached", {
          duration: 6000,
          description: `You've used ${data.used}/${data.limit} leads today. Try again tomorrow!`,
        });
        if (data.limit && data.used !== undefined) {
          setQuota({ limit: data.limit, used: data.used, remaining: 0 });
        }
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate leads");
      }

      const newLeads = data.leads || [];

      // Update quota info if provided
      if (data.quota) {
        setQuota(data.quota);
      }

      if (data.duplicatesSkipped) {
        toast.info(
          `${data.duplicatesSkipped} duplicate leads skipped. Generated ${newLeads.length} new unique leads.`
        );
      } else if (newLeads.length > 0) {
        const quotaInfo = data.quota
          ? ` (${data.quota.remaining}/${data.quota.limit} remaining today)`
          : "";
        toast.success(
          `Generated ${newLeads.length} fresh leads! Total: ${
            leads.length + newLeads.length
          }${quotaInfo}`,
          {
            duration: 5000,
          }
        );
      }

      // Append new leads to existing ones in real-time
      setLeads((prevLeads) => [...prevLeads, ...newLeads]);
    } catch (error) {
      console.error("Error generating leads:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate leads"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewLead = (lead: any) => {
    setSelectedLead(lead);
  };

  const quotaPercent =
    quota && quota.limit > 0 ? Math.min(100, (quota.used / quota.limit) * 100) : 0;
  
  const isQuotaLow = quota && quota.remaining <= 3;
  const isQuotaExhausted = quota && quota.remaining === 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-8 max-w-[1200px] mx-auto">
          <div className="space-y-6">
            {/* Modern Quota Card */}
            {quota && (
              <Card className="relative overflow-hidden border-2 shadow-lg bg-linear-to-br from-card via-card to-primary/5 dark:to-primary/2">
                {/* Animated background gradient */}
                <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-linear-to-br from-primary/10 to-purple-500/10 blur-3xl" />
                
                <CardContent className="p-6 relative">
                  <div className="flex items-start justify-between gap-6">
                    {/* Left side - Info */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <TrendingUpIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-foreground">
                            Daily Lead Quota
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Resets every 24 hours
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isQuotaExhausted 
                                ? 'bg-linear-to-r from-red-500 to-red-600' 
                                : isQuotaLow 
                                ? 'bg-linear-to-r from-amber-500 to-orange-500'
                                : 'bg-linear-to-r from-primary to-purple-600'
                            }`}
                            style={{ width: `${quotaPercent}%` }}
                          />
                        </div>

                        {/* Status message */}
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-medium ${
                            isQuotaExhausted 
                              ? 'text-red-600 dark:text-red-400' 
                              : isQuotaLow 
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-muted-foreground'
                          }`}>
                            {isQuotaExhausted
                              ? "⚠️ Daily limit reached"
                              : isQuotaLow
                              ? "⚡ Running low - use wisely"
                              : "✓ Ready to generate leads"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Numbers */}
                    <div className="text-right space-y-1">
                      <div className="inline-flex items-baseline gap-1">
                        <span className="text-3xl font-bold bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                          {quota.remaining}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">
                          / {quota.limit}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        leads remaining
                      </p>
                      <Badge 
                        variant={isQuotaExhausted ? "destructive" : isQuotaLow ? "secondary" : "default"}
                        className="text-[10px] mt-2"
                      >
                        {quota.used} used today
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Prompt Card */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold tracking-tight">
                  Describe your ideal leads
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Include industry, location, job titles, and hiring intent.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Find me fintech startups in Bangalore with engineering managers who are hiring"
                  className="min-h-[120px] resize-none"
                  disabled={isGenerating}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    💡 Tip: Be specific about industry, location, job titles. You
                    can generate up to 20 unique leads per day.
                  </p>
                  <Button
                    onClick={handleGenerateLeads}
                    disabled={isGenerating || !prompt.trim()}
                    size="lg"
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2Icon className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <SendIcon className="w-4 h-4" />
                        Generate Leads
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2Icon className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Generated Leads Table */}
            {!isLoading && leads.length > 0 && (
              <Card className="border shadow-md overflow-hidden">
                <CardHeader className="bg-card border-b px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUpIcon className="w-5 h-5 text-primary" />
                        Generated Leads
                        <Badge variant="secondary" className="ml-2">
                          {leads.length}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Page {currentPage} of {totalPages}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Top Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/10 dark:bg-muted/5">
                      <p className="text-sm text-muted-foreground font-medium">
                        Showing {startIndex + 1}-{Math.min(endIndex, leads.length)}{" "}
                        of {leads.length} leads
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="pagination-button"
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((page) => {
                              return (
                                page === 1 ||
                                page === totalPages ||
                                Math.abs(page - currentPage) <= 1
                              );
                            })
                            .map((page, idx, arr) => {
                              const showEllipsis =
                                idx > 0 && page - arr[idx - 1] > 1;
                              return (
                                <div key={page} className="flex items-center">
                                  {showEllipsis && (
                                    <span className="px-2 text-muted-foreground">
                                      ...
                                    </span>
                                  )}
                                  <Button
                                    variant={
                                      currentPage === page ? "default" : "outline"
                                    }
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className="pagination-button"
                                  >
                                    {page}
                                  </Button>
                                </div>
                              );
                            })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="pagination-button"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                          <TableHead className="font-semibold text-foreground/90 px-4 py-3.5 w-[200px] text-sm">
                            Contact
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/90 px-4 py-3.5 w-[220px] text-sm">
                            Company
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/90 px-4 py-3.5 w-[160px] text-sm">
                            Role
                          </TableHead>
                          <TableHead className="font-semibold text-foreground/90 px-4 py-3.5 w-[180px] text-sm">
                            Contact Info
                          </TableHead>
                          <TableHead className="text-center font-semibold text-foreground/90 px-4 py-3.5 w-[100px] text-sm">
                            Links
                          </TableHead>
                          <TableHead className="text-right font-semibold text-foreground/90 px-4 py-3.5 w-[100px] text-sm">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {paginatedLeads.map((lead, index) => (
                          <TableRow
                            key={lead.uniqueId || `${lead.id}-${index}`}
                            className="hover:bg-muted/40 transition-all duration-200 border-b border-border/40 last:border-0 group"
                          >
                            {/* Contact */}
                            <TableCell className="px-4 py-4 max-w-[200px]">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/90 via-accent/70 to-accent/50 flex items-center justify-center font-semibold text-accent-foreground text-sm border border-accent/60 shadow-sm flex-shrink-0 transition-all">
                                  {(lead.contactPerson || lead.contact || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                  <span
                                    className="font-medium text-foreground text-sm leading-tight truncate max-w-full"
                                    title={lead.contactPerson || lead.contact}
                                  >
                                    {lead.contactPerson || lead.contact}
                                  </span>
                                  {lead.seniority && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] w-fit capitalize border-border/50 bg-muted/30 px-1.5 py-0.5 max-w-full truncate"
                                    >
                                      <span className="truncate">
                                        {lead.seniority}
                                      </span>
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Company */}
                            <TableCell className="px-4 py-4 max-w-[220px]">
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <BuildingIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  <span
                                    className="font-medium text-foreground text-sm leading-tight truncate"
                                    title={lead.companyName || lead.name}
                                  >
                                    {lead.companyName || lead.name}
                                  </span>
                                </div>
                                {lead.industry && (
                                  <span
                                    className="text-xs text-muted-foreground leading-tight truncate ml-5"
                                    title={lead.industry}
                                  >
                                    {lead.industry}
                                  </span>
                                )}
                                {lead.employeeCount && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1.5 ml-5 min-w-0">
                                    <UsersIcon className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">
                                      {lead.employeeCount.toLocaleString()} employees
                                    </span>
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Role */}
                            <TableCell className="px-4 py-4 max-w-[160px]">
                              <div className="flex flex-col gap-1.5 min-w-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <BriefcaseIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  <span
                                    className="text-sm font-medium text-foreground leading-tight truncate"
                                    title={lead.title || "N/A"}
                                  >
                                    {lead.title || "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                  <MapPinIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  <span
                                    className="text-xs text-muted-foreground leading-tight truncate"
                                    title={lead.location || "N/A"}
                                  >
                                    {lead.location || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            {/* Contact Info */}
                            <TableCell className="px-4 py-4 max-w-[180px]">
                              <div className="flex flex-col gap-2 min-w-0">
                                {lead.email && lead.email !== "N/A" && (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="text-xs text-primary hover:text-primary/70 flex items-center gap-2 hover:underline transition-all group/email min-w-0"
                                    title={lead.email}
                                  >
                                    <div className="w-6 h-6 rounded-md bg-primary/8 dark:bg-primary/12 border border-primary/20 dark:border-primary/30 flex items-center justify-center transition-all flex-shrink-0 shadow-sm">
                                      <MailIcon className="w-3 h-3 text-primary" />
                                    </div>
                                    <span className="truncate">{lead.email}</span>
                                  </a>
                                )}
                                {lead.phone && (
                                  <div className="text-xs text-foreground flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-md bg-muted/50 dark:bg-muted/30 border border-border/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                                      <PhoneIcon className="w-3 h-3 text-muted-foreground" />
                                    </div>
                                    <span className="truncate">{lead.phone}</span>
                                  </div>
                                )}
                                {!lead.email && !lead.phone && (
                                  <span className="text-xs text-muted-foreground italic">
                                    No contact
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Links */}
                            <TableCell className="px-4 py-4 max-w-[100px]">
                              <div className="flex items-center justify-center gap-2 min-w-0">
                                {lead.linkedinUrl && (
                                  <a
                                    href={lead.linkedinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/linkedin hover:scale-105 transition-all"
                                    title="LinkedIn Profile"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/8 dark:bg-[#0A66C2]/15 border border-[#0A66C2]/20 dark:border-[#0A66C2]/30 hover:bg-[#0A66C2]/15 dark:hover:bg-[#0A66C2]/25 hover:border-[#0A66C2]/30 dark:hover:border-[#0A66C2]/40 flex items-center justify-center transition-all shadow-sm hover:shadow">
                                      <Image
                                        src="/linkedin.svg"
                                        alt="LinkedIn"
                                        width={16}
                                        height={16}
                                        className="opacity-90 transition-opacity"
                                      />
                                    </div>
                                  </a>
                                )}

                                {lead.companyWebsite && (
                                  <a
                                    href={
                                      lead.companyWebsite.startsWith("http")
                                        ? lead.companyWebsite
                                        : `https://${lead.companyWebsite}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/website hover:scale-105 transition-all"
                                    title="Company Website"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-muted/40 dark:bg-muted/20 border border-border/50 hover:bg-muted/60 dark:hover:bg-muted/30 hover:border-border/70 flex items-center justify-center transition-all shadow-sm hover:shadow">
                                      <GlobeIcon className="w-3.5 h-3.5 text-muted-foreground transition-colors" />
                                    </div>
                                  </a>
                                )}

                                {!lead.linkedinUrl && !lead.companyWebsite && (
                                  <span className="text-xs text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right px-4 py-4 max-w-[100px]">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleViewLead(lead)}
                                className="text-xs h-8 px-3 shadow-sm hover:shadow-md transition-all opacity-90 group-hover:opacity-100 w-full max-w-full"
                              >
                                <span className="truncate">View</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Bottom Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10 dark:bg-muted/5">
                      <p className="text-sm text-muted-foreground font-medium">
                        Showing {startIndex + 1}-{Math.min(endIndex, leads.length)}{" "}
                        of {leads.length} leads
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="pagination-button"
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={currentPage === totalPages}
                          className="pagination-button"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && leads.length === 0 && !isGenerating && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <BotIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No leads yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Enter a prompt above to generate leads. Our AI will analyze
                    your requirements and find matching prospects.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <UsersIcon className="w-4 h-4" />
                  Contact Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedLead.contactPerson || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="font-medium">{selectedLead.title || "N/A"}</p>
                  </div>

                  {selectedLead.email && selectedLead.email !== "N/A" && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${selectedLead.email}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <MailIcon className="w-3 h-3" />
                        {selectedLead.email}
                      </a>
                    </div>
                  )}

                  {selectedLead.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-1">
                        <PhoneIcon className="w-3 h-3" />
                        {selectedLead.phone}
                      </p>
                    </div>
                  )}

                  {selectedLead.linkedinUrl && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">LinkedIn</p>
                      <a
                        href={selectedLead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLinkIcon className="w-3 h-3" />
                        View Profile
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BuildingIcon className="w-4 h-4" />
                  Company Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">
                      {selectedLead.companyName || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <Badge variant="secondary">{selectedLead.industry || "N/A"}</Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedLead.location || "N/A"}</p>
                  </div>

                  {selectedLead.employeeCount && (
                    <div>
                      <p className="text-sm text-muted-foreground">Employee Count</p>
                      <p className="font-medium">
                        {selectedLead.employeeCount.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {selectedLead.companyWebsite && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a
                        href={
                          selectedLead.companyWebsite.startsWith("http")
                            ? selectedLead.companyWebsite
                            : `https://${selectedLead.companyWebsite}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <GlobeIcon className="w-3 h-3" />
                        {selectedLead.companyWebsite}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {(selectedLead.seniority || selectedLead.departments?.length > 0) && (
                <div>
                  <h3 className="font-semibold mb-3">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLead.seniority && (
                      <div>
                        <p className="text-sm text-muted-foreground">Seniority</p>
                        <Badge>{selectedLead.seniority}</Badge>
                      </div>
                    )}

                    {selectedLead.departments && selectedLead.departments.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground mb-2">
                          Departments
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedLead.departments.map((dept: string, idx: number) => (
                            <Badge key={idx} variant="outline">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
