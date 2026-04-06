"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw,
  Search,
  Eye,
  PhoneOutgoing,
  Info,
  ChevronUp,
  PhoneCall,
  Clock,
  Gauge,
  Zap,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import apiClient from "@/lib/keycloak/interceptor";
import CallDetailsDrawer from "@/voiceagent/modules/components/CallDetailsDrawer";

/* -------------------------------------------------- */
/* CONFIG */
/* -------------------------------------------------- */
const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

/* -------------------------------------------------- */
/* COMPONENT */
/* -------------------------------------------------- */
export default function CallLogs() {
  const [activeTab, setActiveTab] = useState("outbound");
  const [isOutboundDialogOpen, setIsOutboundDialogOpen] = useState(false);

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState("");
  const [label, setLabel] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedCall, setSelectedCall] = useState<any>(null);

  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);

  const [isLoadingCalls, setIsLoadingCalls] = useState(true);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [makingCall, setMakingCall] = useState(false);

  /* -------------------------------------------------- */
  /* FETCH CALL LOGS */
  /* -------------------------------------------------- */
  const fetchCallLogs = async () => {
    try {
      setIsLoadingCalls(true);

      const res = await apiClient.get(
        `/voice/tenant/${TENANT_ID}/calls`
      );

      const data = Array.isArray(res.data?.calls)
        ? res.data.calls
        : Array.isArray(res.data)
        ? res.data
        : [];

      setCallLogs(data);
    } catch {
      toast.error("Failed to load call logs");
    } finally {
      setIsLoadingCalls(false);
    }
  };

  /* -------------------------------------------------- */
  /* FETCH OUTBOUND NUMBERS */
  /* -------------------------------------------------- */
  const fetchOutboundNumbers = async () => {
    try {
      setLoadingNumbers(true);

      const [phonesRes, assistantsRes] = await Promise.all([
        apiClient.get(`/voice/tenant/${TENANT_ID}/phones`),
        apiClient.get(`/voice/tenant/${TENANT_ID}/assistants`),
      ]);

      const phones = phonesRes.data?.phones ?? [];
      const assistants = assistantsRes.data?.assistants ?? [];

      const merged = phones.map((p: any) => ({
        ...p,
        assistant_name:
          assistants.find((a: any) => a.id === p.assistant_id)?.name ??
          "Voice Agent",
      }));

      setAvailableNumbers(merged);
    } catch {
      toast.error("Failed to load outbound numbers");
    } finally {
      setLoadingNumbers(false);
    }
  };

  /* -------------------------------------------------- */
  /* INITIAL LOAD */
  /* -------------------------------------------------- */
  useEffect(() => {
    fetchCallLogs();
    fetchOutboundNumbers();
  }, []);

  useEffect(() => {
    setIsOutboundDialogOpen(activeTab === "outbound");
  }, [activeTab]);

  useEffect(() => {
    if (availableNumbers.length > 0) {
      setSelectedAgentId(availableNumbers[0].id.toString());
    }
  }, [availableNumbers]);

  /* -------------------------------------------------- */
  /* MAKE CALL */
  /* -------------------------------------------------- */

  const handleMakeCall = async () => {
  if (!phone || !customer || !selectedAgentId) {
    toast.warning("Missing required fields");
    return;
  }

  const selectedPhone = availableNumbers.find(
    (n) => n.id.toString() === selectedAgentId
  );

  if (!selectedPhone) {
    toast.error("Invalid agent selected");
    return;
  }

  try {
    setMakingCall(true);

    await apiClient.post(`/voice/outbound/${TENANT_ID}`, {
      number: phone,
      name: customer,
      label: label || "Outbound call",
      phone_id: selectedPhone.id,
      assistant_id: selectedPhone.assistant_id,
    });

    toast.success("Call Initiated!");
    setPhone("");
    setCustomer("");
    setLabel("");

    setTimeout(fetchCallLogs, 2000);
  } catch (err: any) {
    const backendMessage =
      err?.response?.data?.detail ||   // 👈 your backend uses this
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Call failed. Please try again.";

    toast.error(backendMessage);
  } finally {
    setMakingCall(false);
  }
};


  /* -------------------------------------------------- */
  /* TRANSFORM DATA (MEMOIZED) */
  /* -------------------------------------------------- */
  const transformedCalls = useMemo(() => {
    return callLogs.map((call: any) => {
      const created = new Date(call.created_at);
      const ended = call.ended_at ? new Date(call.ended_at) : null;

      let duration = "N/A";
      if (ended) {
        const secs = Math.floor(
          (ended.getTime() - created.getTime()) / 1000
        );
        duration = `${Math.floor(secs / 60)}m ${secs % 60}s`;
      }

      const callerName =
        call.raw_artifact?.variables?.customer?.name?.trim() || "Unknown";

      return {
        ...call,
        date: created.toLocaleDateString("en-GB"),
        callerName,
        callType: callerName === "Unknown" ? "Inbound" : "Outbound",
        duration,
        status: call.ended_at ? "Completed" : "Pending",
      };
    });
  }, [callLogs]);

  const inboundCalls = transformedCalls.filter(
    (c) => c.callType === "Inbound"
  );
  const outboundCalls = transformedCalls.filter(
    (c) => c.callType === "Outbound"
  );

  /* -------------------------------------------------- */
  /* UI */
  /* -------------------------------------------------- */
  return (
    <>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* HEADER */}
        <div className="flex items-start justify-between">
          <div className="mr-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Call Logs</h1>
            <p className="text-sm md:text-base text-muted-foreground">Monitor and manage all customer interactions</p>
          </div>
        </div>

     

        {/* SEARCH + FILTERS */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Call Logs..."
              className="pl-10 w-full bg-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-56 bg-muted">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

         <Button 
  onClick={fetchCallLogs}
  size="sm"
  className="text-foreground bg-background border border-primary/20 hover:text-white hover:bg-primary/80"
>
  <RefreshCw className="h-4 w-4" />
</Button>

        </div>

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-9 w-full">
          <div className="w-full">
            <div className="flex items-center justify-between w-full">
              <TabsList className="flex w-full bg-background rounded-none border-b p-0">
                <TabsTrigger
                  value="outbound"
                  className="flex-1 justify-center bg-background border-b-border data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:border-b-background h-full rounded-none rounded-t border border-transparent data-[state=active]:-mb-0.5 data-[state=active]:shadow-none"
                >
                  Outbound Calls
                </TabsTrigger>
                <TabsTrigger
                  value="inbound"
                  className="flex-1 justify-center bg-background border-b-border data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:border-b-background h-full rounded-none rounded-t border border-transparent data-[state=active]:-mb-0.5 data-[state=active]:shadow-none"
                >
                  Inbound Calls
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* OUTBOUND CALL BOX */}
          {isOutboundDialogOpen && (
            <Card className="border-border/50">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <PhoneOutgoing className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold">Make Outbound Call</h3>
                      <p className="text-sm text-muted-foreground">Use your voice agent to make outbound calls</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsOutboundDialogOpen(false)}
                    className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  >
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Close 
                  </Button>
                </div>

                <div className="w-full grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer">Customer Name *</Label>
                      <Input
                        id="customer"
                        placeholder="John Doe"
                        value={customer}
                        onChange={(e) => setCustomer(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="label">Call Label (Optional)</Label>
                      <Input
                        id="label"
                        placeholder="e.g., Reservation, Follow-up"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agent">Select Agent *</Label>
                      <Select 
                        value={selectedAgentId} 
                        onValueChange={setSelectedAgentId}
                        disabled={loadingNumbers || availableNumbers?.length === 0}
                      >
                        <SelectTrigger id="agent" className="w-full">
                          <SelectValue placeholder={
                            loadingNumbers ? "Loading agents..." : 
                            availableNumbers?.length === 0 ? "No agents available" :
                            "Select an agent"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {availableNumbers?.map((num: any) => (
                            <SelectItem key={num.id} value={num.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {num.assistant_name} - {num.number}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-end justify-end">
                    <Button 
                      onClick={handleMakeCall} 
                      disabled={makingCall || !phone || !customer || !selectedAgentId || loadingNumbers}
                      className="w-full md:w-40 inline-flex items-center justify-center py-2"
                      type="button"
                    >
                      {makingCall ? (
  <>
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
    Calling...
  </>
) : (
  <>
    <PhoneOutgoing className="mr-2 h-4 w-4" />
    Start Call
  </>
)}

                    </Button>
                  </div>
                </div>

                <Card className="bg-primary/5 border border-primary/20 rounded-lg w-full">
                  <CardContent className="pt-2 pb-2 px-4 bg-primary/10">
                    <div className="flex gap-3 items-start w-full">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0">
                        <Info className="h-4 w-4 text-primary" />
                      </div>
                      <div className="space-y-1 w-full">
                        <h4 className="font-medium text-sm">Call Preview</h4>
                        <p className="text-xs text-muted-foreground">
                          Your selected agent will introduce itself and follow the configured script. You can monitor the call in real-time.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          )}

          {/* INBOUND TABLE */}
          <TabsContent value="inbound" className="space-y-4 min-h-[calc(100vh-4rem)]">
            <Card className="border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Caller Name</TableHead>
                    <TableHead>Call Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCalls ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading calls...</p>
                      </TableCell>
                    </TableRow>
                  ) : inboundCalls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <p className="text-muted-foreground">No inbound calls found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    inboundCalls.map((call: any) => (
                      <TableRow key={call.id}>
                        <TableCell className="font-medium">{call.date}</TableCell>
                        <TableCell>{call.callerName}</TableCell>
                        <TableCell>{call.duration}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={call.status === "Completed" ? "default" : "secondary"} 
                            className="capitalize"
                          >
                            {call.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedCall(call)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* OUTBOUND TABLE */}
          <TabsContent value="outbound" className="space-y-6 min-h-[calc(100vh-4rem)]">
            {!isOutboundDialogOpen && (
              <div className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8">
                <div className="text-center">
                  <PhoneOutgoing className="mx-auto h-9 w-9 text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Want to Make an Outbound Call?</p>
                </div>
                <Button onClick={() => setIsOutboundDialogOpen(true)} className="px-10 py-3">
                  <PhoneOutgoing className="mr-2 h-5 w-5" />
                  Make Outbound Call
                </Button>
              </div>
            )}

            <Card className="border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Call Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingCalls ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading calls...</p>
                      </TableCell>
                    </TableRow>
                  ) : outboundCalls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <p className="text-muted-foreground">No outbound calls found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    outboundCalls.map((call: any) => (
                      <TableRow key={call.id}>
                        <TableCell className="font-medium">{call.date}</TableCell>
                        <TableCell>{call.callerName}</TableCell>
                        <TableCell>{call.duration}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={call.status === "Completed" ? "default" : "secondary"}
                            className="capitalize"
                          >
                            {call.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedCall(call)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CALL DETAILS DRAWER */}
        <CallDetailsDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
      </div>
    </>
  );
}
