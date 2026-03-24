"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Crown, User, Eye, Users, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useRealtimeEmployees } from "@/hooks/use-realtime-employees";
import { authClient } from "@/lib/auth-client";

interface Employee {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  status?: string;
}

export function RoleManagement() {
  const { data: session } = authClient.useSession();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [updatingRoles, setUpdatingRoles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [entityData, setEntityData] = useState<{ createdBy?: string } | null>(null);

  // Fetch entity ID from session
  useEffect(() => {
    let mounted = true;

    (async () => {
      const email = session?.user?.email ?? null;
      if (!email) return;

      try {
        const res = await fetch(`/api/auth/entity-by-email?email=${encodeURIComponent(email)}`);
        if (!res.ok) {
          console.warn("Failed to resolve entity by email", res.status);
          return;
        }

        const json = await res.json().catch(() => null);
        const entId = json?.entityId ?? json?.entity_id ?? null;

        if (!mounted) return;
        setEntityId(entId ?? null);
      } catch (e) {
        console.error("Error resolving entity by email", e);
      }
    })();

    return () => { mounted = false; };
  }, [session?.user?.email]);

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

  // Use real-time SSE hook for live employee data
  const { employees: liveEmployees, error, isConnected } = useRealtimeEmployees({
    apiUrl: "",
    entityId: entityId ?? undefined,
    autoConnect: !!entityId,
  });

  const isLoading = !entityId || (!isConnected && liveEmployees.length === 0 && !error);

  // Sort and filter employees
  const filteredEmployees = useMemo(() => {
    let filtered = [...liveEmployees];

    // Sort: owner first, then alphabetically
    filtered.sort((a, b) => {
      if (entityData?.createdBy === a.id) return -1;
      if (entityData?.createdBy === b.id) return 1;
      return a.name.localeCompare(b.name);
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(emp => {
        const primaryRole = getPrimaryRole(emp);
        return primaryRole === roleFilter;
      });
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(emp => emp.status?.toUpperCase() === statusFilter);
    }

    return filtered;
  }, [liveEmployees, searchQuery, roleFilter, statusFilter, entityData]);

  const roles = [
    { value: "ADMIN", label: "Admin", icon: Crown, color: "text-yellow-600", description: "Full system access" },
    { value: "MANAGER", label: "Manager", icon: Shield, color: "text-blue-600", description: "Manage team members" },
    { value: "AGENT", label: "Agent", icon: User, color: "text-green-600", description: "Standard access" },
    { value: "VIEWER", label: "Viewer", icon: Eye, color: "text-gray-600", description: "Read-only access" },
  ];

  const getRoleData = (roleValue: string) => {
    return roles.find(r => r.value === roleValue.toUpperCase());
  };

  const getPrimaryRole = (employee: Employee): string => {
    if (!employee.roles || employee.roles.length === 0) return "AGENT";
    // Prioritize roles: ADMIN > MANAGER > AGENT > VIEWER
    if (employee.roles.includes("ADMIN")) return "ADMIN";
    if (employee.roles.includes("MANAGER")) return "MANAGER";
    if (employee.roles.includes("AGENT")) return "AGENT";
    if (employee.roles.includes("VIEWER")) return "VIEWER";
    return employee.roles[0];
  };

  const handleRoleChange = async (employeeId: string, newRole: string) => {
    if (!entityId) return;

    try {
      setUpdatingRoles(prev => new Set(prev).add(employeeId));

      const response = await fetch(`/api/employees/${employeeId}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          roles: [newRole], // Send as array
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update role");
      }

      const employee = liveEmployees.find(e => e.id === employeeId);
      const role = getRoleData(newRole);

      toast.success("Role updated", {
        description: `${employee?.name} is now ${role?.label}`,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setUpdatingRoles(prev => {
        const next = new Set(prev);
        next.delete(employeeId);
        return next;
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    const upperRole = role.toUpperCase();
    switch (upperRole) {
      case "ADMIN":
        return "default";
      case "MANAGER":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleStats = () => {
    const stats = {
      ADMIN: 0,
      MANAGER: 0,
      AGENT: 0,
      VIEWER: 0,
    };

    liveEmployees.forEach(emp => {
      const primaryRole = getPrimaryRole(emp);
      if (stats.hasOwnProperty(primaryRole)) {
        stats[primaryRole as keyof typeof stats]++;
      }
    });

    return stats;
  };

  const roleStats = getRoleStats();

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Failed to load employee data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>


      <CardContent className="space-y-6">
        {/* Role Stats */}
        <div className="grid grid-cols-4 gap-4">
          {roles.map(role => {
            const Icon = role.icon;
            const count = roleStats[role.value as keyof typeof roleStats];
            return (
              <div key={role.value} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${role.color}`} />
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <p className="text-sm font-medium mt-2">{role.label}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
            );
          })}
        </div>

        {/* Search and Filters */}
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
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="ADMIN">Admin Only</SelectItem>
              <SelectItem value="MANAGER">Manager Only</SelectItem>
              <SelectItem value="AGENT">Agent Only</SelectItem>
              <SelectItem value="VIEWER">Viewer Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Status" />
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
                <TableHead className="min-w-[200px]">Member</TableHead>
                <TableHead className="min-w-[220px]">Email</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[140px]">Current Role</TableHead>
                <TableHead className="min-w-[200px]">Change Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-10 w-[180px]" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {searchQuery || roleFilter !== "all" || statusFilter !== "all" ? "No employees match your filters" : "No employees found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => {
                  const primaryRole = getPrimaryRole(employee);
                  const roleData = getRoleData(primaryRole);
                  const RoleIcon = roleData?.icon || User;
                  const isUpdating = updatingRoles.has(employee.id);
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
                      <TableCell className="text-sm text-muted-foreground">
                        {employee.email}
                      </TableCell>
                      <TableCell>
                        {employee.status === "ACTIVE" ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>
                        ) : employee.status === "INVITED" ? (
                          <Badge variant="secondary">Invited</Badge>
                        ) : employee.status === "SUSPENDED" ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="outline">{employee.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(primaryRole)} className="capitalize flex items-center gap-1.5 w-fit">
                          <RoleIcon className={`h-3.5 w-3.5 ${roleData?.color}`} />
                          {roleData?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={primaryRole}
                          onValueChange={(newRole) => handleRoleChange(employee.id, newRole)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => {
                              const Icon = role.icon;
                              return (
                                <SelectItem key={role.value} value={role.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className={`h-4 w-4 ${role.color}`} />
                                    <span>{role.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
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
