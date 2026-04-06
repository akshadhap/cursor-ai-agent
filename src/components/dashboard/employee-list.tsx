"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Mail, Calendar, Workflow, MessageSquare, Phone, Search, Filter, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useRealtimeEmployees } from "@/hooks/use-realtime-employees";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  name: string;
  email: string;
  workflowTokens: number;
  workflowUsed: number;
  chatbotTokens: number;
  chatbotUsed: number;
  voiceTokens: number;
  voiceUsed: number;
  joinedAt: string;
  status?: string;
}

interface EmployeeListProps {
  entityId?: string;
  mockData?: Employee[]; // Optional mock data for when API is unavailable
}

export function EmployeeList({ entityId, mockData }: EmployeeListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [entityData, setEntityData] = useState<{ createdBy?: string } | null>(null);

  // Fetch entity data to identify owner
  useEffect(() => {
    if (!entityId) return;

    (async () => {
      try {
        const response = await fetch(`/api/entities/${entityId}`);
        if (response.ok) {
          const data = await response.json();
          setEntityData(data);
        }
      } catch (error) {
        console.error("Failed to fetch entity data:", error);
      }
    })();
  }, [entityId]);

  // Use real-time SSE hook for live updates
  const { employees: liveEmployees } = useRealtimeEmployees({
    apiUrl: "", // Not used anymore, we use Next.js proxy
    entityId,
    autoConnect: true, // Always auto-connect (uses local proxy)
  });
  
  // Use live employees if connected, otherwise fall back to mock data
  const rawEmployees = liveEmployees.length > 0 ? liveEmployees : (mockData || []);

  // Sort employees: owner first, then by name
  const employees = useMemo(() => {
    const sorted = [...rawEmployees].sort((a, b) => {
      // Owner always first
      if (entityData?.createdBy === a.id) return -1;
      if (entityData?.createdBy === b.id) return 1;
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [rawEmployees, entityData]);

  // Filter employees based on search and status
  const filteredEmployees = useMemo(() => {
    let filtered = employees;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(emp => emp.status?.toUpperCase() === statusFilter);
    }

    return filtered;
  }, [employees, searchQuery, statusFilter]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUsagePercentage = (used: number, total: number) => {
    return total > 0 ? (used / total) * 100 : 0;
  };

  const getStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
        return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
      case "INVITED":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Invited</Badge>;
      case "SUSPENDED":
        return <Badge variant="outline" className="text-red-600 border-red-600">Suspended</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {filteredEmployees.length} {filteredEmployees.length === 1 ? "member" : "members"} {searchQuery || statusFilter !== "all" ? "found" : "in your team"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active Only</SelectItem>
              <SelectItem value="INVITED">Invited Only</SelectItem>
              <SelectItem value="SUSPENDED">Suspended Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Employee Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Member</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-40">Workflow Tokens</TableHead>
                <TableHead className="min-w-40">Chatbot Tokens</TableHead>
                <TableHead className="min-w-40">Voice Tokens</TableHead>
                <TableHead className="min-w-[120px]">Joined</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {searchQuery || statusFilter !== "all" ? "No employees match your filters" : "No employees found. Start by inviting team members."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  const isOwner = entityData?.createdBy === employee.id;
                  return (
                    <TableRow key={employee.id} className={isOwner ? "bg-yellow-50 dark:bg-yellow-950/10" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{employee.name}</span>
                              {isOwner && (
                                <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  <Crown className="h-3 w-3" />
                                  Owner
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Workflow className="h-3 w-3 text-purple-600" />
                              <span className="font-medium">{employee.workflowUsed.toLocaleString()}</span>
                              <span className="text-muted-foreground">/ {employee.workflowTokens.toLocaleString()}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {getUsagePercentage(employee.workflowUsed, employee.workflowTokens).toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(employee.workflowUsed, employee.workflowTokens)} 
                            className="h-1.5"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-blue-600" />
                              <span className="font-medium">{employee.chatbotUsed.toLocaleString()}</span>
                              <span className="text-muted-foreground">/ {employee.chatbotTokens.toLocaleString()}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {getUsagePercentage(employee.chatbotUsed, employee.chatbotTokens).toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(employee.chatbotUsed, employee.chatbotTokens)} 
                            className="h-1.5"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[140px]">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-green-600" />
                              <span className="font-medium">{employee.voiceUsed.toLocaleString()}</span>
                              <span className="text-muted-foreground">/ {employee.voiceTokens.toLocaleString()}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {getUsagePercentage(employee.voiceUsed, employee.voiceTokens).toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={getUsagePercentage(employee.voiceUsed, employee.voiceTokens)} 
                            className="h-1.5"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(employee.joinedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(employee.status)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
