"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Workflow, MessageSquare, Phone, Plus, Trash2, Search, Filter, UserCheck, UserX, Crown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeEmployees } from "@/hooks/use-realtime-employees";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

type ProductType = "workflows" | "chatbot_builder" | "voice_agent";

export function ProductManagement() {
  const { data: session } = authClient.useSession();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [productType, setProductType] = useState<ProductType>("workflows");
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
  const { employees, error, isConnected } = useRealtimeEmployees({
    apiUrl: "",
    entityId: entityId ?? undefined,
    autoConnect: !!entityId,
  });

  // Show loading until we have entityId AND either have employees or an error
  const isLoading = !entityId || (!isConnected && employees.length === 0 && !error);

  const products = [
    { 
      value: "workflows" as ProductType, 
      label: "Workflow Automation", 
      icon: Workflow,
      color: "text-purple-600"
    },
    { 
      value: "chatbot_builder" as ProductType, 
      label: "AI Chatbot", 
      icon: MessageSquare,
      color: "text-blue-600"
    },
    { 
      value: "voice_agent" as ProductType, 
      label: "Voice Assistant", 
      icon: Phone,
      color: "text-green-600"
    },
  ];

  const getTokensForProduct = (employee: any, product: ProductType) => {
    // First check raw products object for any product type
    const productData = employee.products?.[product];
    
    if (productData) {
      // Handle token-based products
      if ('allocated' in productData || 'consumed' in productData) {
        return {
          allocated: productData.allocated ?? 0,
          consumed: productData.consumed ?? 0,
        };
      }
      // Handle feature flag products (no tokens, just enabled/disabled)
      if ('enabled' in productData) {
        return {
          allocated: productData.enabled ? 1 : 0, // Represent as 1/0 for UI
          consumed: 0,
        };
      }
      // Handle custom products (show as assigned if any data exists)
      if (Object.keys(productData).length > 0) {
        return {
          allocated: 1, // Show as assigned
          consumed: 0,
        };
      }
    }

    // Fallback to legacy mapped fields
    switch (product) {
      case "workflows":
        return { 
          allocated: employee.workflowTokens ?? 0, 
          consumed: employee.workflowUsed ?? 0 
        };
      case "chatbot_builder":
        return { 
          allocated: employee.chatbotTokens ?? 0, 
          consumed: employee.chatbotUsed ?? 0 
        };
      case "voice_agent":
        return { 
          allocated: employee.voiceTokens ?? 0, 
          consumed: employee.voiceUsed ?? 0 
        };
      default:
        return { allocated: 0, consumed: 0 };
    }
  };

  const getTotalTokensForProduct = (product: ProductType) => {
    return employees.reduce((sum, emp) => {
      const tokens = getTokensForProduct(emp, product);
      return sum + tokens.allocated;
    }, 0);
  };

  const getTotalConsumedForProduct = (product: ProductType) => {
    return employees.reduce((sum, emp) => {
      const tokens = getTokensForProduct(emp, product);
      return sum + tokens.consumed;
    }, 0);
  };

  const getActiveUsersForProduct = (product: ProductType) => {
    return employees.filter(emp => {
      const tokens = getTokensForProduct(emp, product);
      return tokens.allocated > 0;
    }).length;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUsagePercentage = (consumed: number, allocated: number) => {
    return allocated > 0 ? (consumed / allocated) * 100 : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case "INVITED":
        return <Badge variant="secondary">Invited</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"assign" | "remove">("assign");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "assigned" | "unassigned">("all");
  const [alertOpen, setAlertOpen] = useState(false);

  const selectedEmployee = selectedEmployeeId 
    ? employees.find(emp => emp.id === selectedEmployeeId) || null
    : null;

  // Filtered employees based on search and filter, sorted with owner first
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

    // Apply assignment filter
    if (filterMode !== "all") {
      filtered = filtered.filter(emp => {
        const tokens = getTokensForProduct(emp, productType);
        if (filterMode === "assigned") return tokens.allocated > 0;
        if (filterMode === "unassigned") return tokens.allocated === 0;
        return true;
      });
    }

    // Sort: owner first, then alphabetically
    return filtered.sort((a, b) => {
      if (entityData?.createdBy === a.id) return -1;
      if (entityData?.createdBy === b.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [employees, searchQuery, filterMode, productType, entityData]);

  const openAssignDialog = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setDialogMode("assign");
    setTokenAmount("");
    setDialogOpen(true);
  };

  const openRemoveDialog = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setDialogMode("remove");
    setAlertOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !entityId) return;

    const productIdMap: Record<ProductType, string> = {
      workflows: "workflows",
      chatbot_builder: "chatbot_builder",
      voice_agent: "voice_agent",
    };

    const productId = productIdMap[productType];

    try {
      setIsSubmitting(true);

      if (dialogMode === "assign") {
        // Assign product with token allocation
        const allocated = parseInt(tokenAmount) || 0;

        const response = await fetch(
          `/api/employees/${selectedEmployee.id}/products/${productId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entityId,
              allocated,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to assign product");
        }

        toast.success("Product assigned", {
          description: `Assigned ${tokenAmount} tokens to ${selectedEmployee.name}`,
        });
      } else {
        // Remove product
        const response = await fetch(
          `/api/employees/${selectedEmployee.id}/products/${productId}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entityId }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to remove product");
        }

        toast.success("Product removed", {
          description: `Removed product access from ${selectedEmployee.name}`,
        });
      }

      setDialogOpen(false);
      setAlertOpen(false);
      setTokenAmount("");
      setSelectedEmployeeId(null);
    } catch (error) {
      console.error(`Error ${dialogMode}ing product:`, error);
      toast.error(`Failed to ${dialogMode} product`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmRemove = () => {
    setAlertOpen(false);
    handleSubmit();
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Failed to load product data
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={productType} onValueChange={(value) => setProductType(value as ProductType)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {products.map((product) => {
              const ProductIcon = product.icon;
              const totalTokens = getTotalTokensForProduct(product.value);
              const consumedTokens = getTotalConsumedForProduct(product.value);
              const activeUsers = getActiveUsersForProduct(product.value);
              
              return (
                <TabsTrigger key={product.value} value={product.value} className="gap-2">
                  <ProductIcon className={`h-4 w-4 ${product.color}`} />
                  <span className="hidden sm:inline">{product.label}</span>
                  <span className="sm:hidden">{product.label.split(' ')[0]}</span>
                  <Badge variant="secondary" className="ml-2">
                    {activeUsers}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {products.map((product) => {
            const totalTokens = getTotalTokensForProduct(product.value);
            const consumedTokens = getTotalConsumedForProduct(product.value);
            const activeUsers = getActiveUsersForProduct(product.value);
            const ProductIcon = product.icon;

            return (
              <TabsContent key={product.value} value={product.value} className="space-y-4">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Allocated</p>
                          <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
                        </div>
                        <ProductIcon className={`h-8 w-8 ${product.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Consumed</p>
                          <p className="text-2xl font-bold">{consumedTokens.toLocaleString()}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {totalTokens > 0 ? `${((consumedTokens / totalTokens) * 100).toFixed(1)}%` : '0%'}
                        </div>
                      </div>
                      <Progress 
                        value={getUsagePercentage(consumedTokens, totalTokens)} 
                        className="mt-2 h-2"
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                          <p className="text-2xl font-bold">{activeUsers}</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          of {employees.length}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search and Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterMode} onValueChange={(value: any) => setFilterMode(value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Employees</SelectItem>
                      <SelectItem value="assigned">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4" />
                          Assigned Only
                        </div>
                      </SelectItem>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <UserX className="h-4 w-4" />
                          Unassigned Only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Employee Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Allocated</TableHead>
                        <TableHead>Consumed</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        // Shimmer loading state
                        Array.from({ length: 5 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2">
                                  <Skeleton className="h-4 w-32" />
                                  <Skeleton className="h-3 w-48" />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-16" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-20" />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2 min-w-[200px]">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-2 w-full" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Skeleton className="h-9 w-24" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              {searchQuery || filterMode !== "all" ? (
                                <>
                                  <Search className="h-8 w-8" />
                                  <p>No employees found matching your criteria</p>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => {
                                      setSearchQuery("");
                                      setFilterMode("all");
                                    }}
                                  >
                                    Clear filters
                                  </Button>
                                </>
                              ) : (
                                <p>No employees found</p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map((employee) => {
                          const tokens = getTokensForProduct(employee, product.value);
                          const remaining = tokens.allocated - tokens.consumed;
                          const usagePercent = getUsagePercentage(tokens.consumed, tokens.allocated);
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
                                    <div className="text-xs text-muted-foreground">{employee.email}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(employee.status ?? "UNKNOWN")}
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-sm">
                                  {tokens.allocated.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-sm">
                                  {tokens.consumed.toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2 min-w-[200px]">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium">
                                      {usagePercent.toFixed(1)}%
                                    </span>
                                    <span className="text-muted-foreground">
                                      {remaining.toLocaleString()} remaining
                                    </span>
                                  </div>
                                  <Progress 
                                    value={usagePercent} 
                                    className="h-2"
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  {tokens.allocated > 0 ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openRemoveDialog(employee.id)}
                                      className="gap-2 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Remove
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => openAssignDialog(employee.id)}
                                      className="gap-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Assign Product
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Assign Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Assign {products.find(p => p.value === productType)?.label}
              </DialogTitle>
              <DialogDescription>
                Set the initial token allocation for {selectedEmployee?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tokens">Token Amount</Label>
                <Input
                  id="tokens"
                  type="number"
                  placeholder="e.g., 1000"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  min="1"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the number of tokens to allocate for this product
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !tokenAmount || parseInt(tokenAmount) <= 0}
              >
                {isSubmitting ? "Assigning..." : "Assign Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Confirmation Dialog */}
        <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Product Access?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {products.find(p => p.value === productType)?.label} access from{" "}
                <span className="font-semibold">{selectedEmployee?.name}</span>? This will set their allocated tokens to 0.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmRemove}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
