"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Plus, Minus, Workflow, MessageSquare, Phone, Settings2, TrendingUp, Search, Crown } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useRealtimeEmployees } from "@/hooks/use-realtime-employees";
import { authClient } from "@/lib/auth-client";

type ProductType = "workflow" | "chatbot" | "voice";

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
}

export function TokenManagement() {
  const { data: session } = authClient.useSession();
  const [entityId, setEntityId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Use real-time SSE hook for live employee token data
  const { employees: liveEmployees } = useRealtimeEmployees({
    apiUrl: "",
    entityId: entityId ?? undefined,
    autoConnect: !!entityId,
  });

  const employees = liveEmployees;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [tokenAmount, setTokenAmount] = useState("");
  const [action, setAction] = useState<"add" | "remove">("add");
  const [productType, setProductType] = useState<ProductType>("workflow");
  const [isLoading, setIsLoading] = useState(false);

  // Get fresh employee data from live array
  const selectedEmployee = selectedEmployeeId 
    ? employees.find(emp => emp.id === selectedEmployeeId) || null
    : null;

  const products = [
    { value: "workflow" as ProductType, label: "Workflow", icon: Workflow, color: "text-purple-600" },
    { value: "chatbot" as ProductType, label: "Chatbot", icon: MessageSquare, color: "text-blue-600" },
    { value: "voice" as ProductType, label: "Voice", icon: Phone, color: "text-green-600" },
  ];

  const openDialog = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setTokenAmount("");
    setAction("add");
    // Keep the current tab's product type, don't reset it
    setDialogOpen(true);
  };

  const getCurrentTokens = () => {
    if (!selectedEmployee) return 0;
    switch (productType) {
      case "workflow":
        return selectedEmployee.workflowTokens;
      case "chatbot":
        return selectedEmployee.chatbotTokens;
      case "voice":
        return selectedEmployee.voiceTokens;
      default:
        return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !entityId) return;
    
    setIsLoading(true);

    try {
      const amount = parseInt(tokenAmount);
      const currentTokens = getCurrentTokens();
      const newAmount = action === "add" ? currentTokens + amount : Math.max(0, currentTokens - amount);
      
      // Map product type to product ID for the API
      const productIdMap = {
        workflow: "workflows",
        chatbot: "chatbot_builder",
        voice: "voice_agent"
      };
      
      const productId = productIdMap[productType];
      
      // Update employee tokens via Next.js API proxy (bypasses CORS)
      const res = await fetch(`/api/employees/${selectedEmployee.id}/tokens`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          productId,
          allocated: newAmount
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update tokens: ${res.status}`);
      }
      
      const product = products.find((p) => p.value === productType);
      toast.success("Tokens updated", {
        description: `${action === "add" ? "Added" : "Removed"} ${tokenAmount} ${product?.label} tokens ${action === "add" ? "to" : "from"} ${selectedEmployee.name}. Updates will reflect in real-time.`,
      });
      
      setDialogOpen(false);
      setTokenAmount("");
    } catch (error) {
      console.error("Token update error:", error);
      toast.error("Failed to update tokens", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsLoading(false);
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

  const formatTokens = (tokens: number) => {
    return tokens.toLocaleString();
  };

  const getUsagePercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return (used / total) * 100;
  };

  const getTokensForProduct = (employee: Employee, product: ProductType) => {
    switch (product) {
      case "workflow": 
        return { allocated: employee.workflowTokens, consumed: employee.workflowUsed };
      case "chatbot": 
        return { allocated: employee.chatbotTokens, consumed: employee.chatbotUsed };
      case "voice": 
        return { allocated: employee.voiceTokens, consumed: employee.voiceUsed };
    }
  };

  const getTotalTokensForProduct = (product: ProductType) => {
    return employees.reduce((sum, emp) => sum + getTokensForProduct(emp, product).allocated, 0);
  };

  const getTotalConsumedForProduct = (product: ProductType) => {
    return employees.reduce((sum, emp) => sum + getTokensForProduct(emp, product).consumed, 0);
  };

  // Filter employees to only show those with tokens for the current product, sorted by owner first
  const getEmployeesWithProduct = (product: ProductType) => {
    const filtered = employees.filter(emp => {
      const tokens = getTokensForProduct(emp, product);
      return tokens.allocated > 0;
    });

    // Sort: owner first, then alphabetically
    return filtered.sort((a, b) => {
      if (entityData?.createdBy === a.id) return -1;
      if (entityData?.createdBy === b.id) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  // Apply search filter to employees with product
  const getFilteredEmployeesWithProduct = (product: ProductType) => {
    const employeesWithProduct = getEmployeesWithProduct(product);
    
    if (!searchQuery.trim()) return employeesWithProduct;
    
    const query = searchQuery.toLowerCase();
    return employeesWithProduct.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    );
  };

  // Show loading state while fetching entity ID
  if (!entityId) {
    return (
      <div className="w-full space-y-6">
        <div className="h-96 rounded-xl border bg-card animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <Tabs value={productType} onValueChange={(value) => setProductType(value as ProductType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          {products.map((product) => {
            const Icon = product.icon;
            const totalTokens = getTotalTokensForProduct(product.value);
            
            return (
              <TabsTrigger 
                key={product.value} 
                value={product.value}
                className="flex flex-col gap-2 py-3 data-[state=active]:bg-background"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${product.color}`} />
                  <span className="font-semibold">{product.label}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTokens(totalTokens)} tokens allocated
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {products.map((product) => {
          const Icon = product.icon;
          const employeesWithTokens = getFilteredEmployeesWithProduct(product.value);
          const totalAllocated = getTotalTokensForProduct(product.value);
          const totalConsumed = getTotalConsumedForProduct(product.value);
          const totalRemaining = totalAllocated - totalConsumed;
          
          return (
            <TabsContent key={product.value} value={product.value} className="mt-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Product Summary Card */}
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${
                      product.value === "workflow" ? "from-purple-500/20 to-purple-600/20" :
                      product.value === "chatbot" ? "from-blue-500/20 to-blue-600/20" :
                      "from-green-500/20 to-green-600/20"
                    }`}>
                      <Icon className={`h-6 w-6 ${product.color}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{product.label} Tokens</h3>
                      <p className="text-sm text-muted-foreground">
                        {employeesWithTokens.length} employee{employeesWithTokens.length !== 1 ? 's' : ''} • {formatTokens(totalRemaining)} remaining
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {formatTokens(totalAllocated)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatTokens(totalConsumed)} consumed
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee Token Table for this product */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="min-w-[200px] font-semibold">Employee</TableHead>
                        <TableHead className="min-w-[220px] font-semibold">Email</TableHead>
                        <TableHead className="min-w-[120px] text-right font-semibold">
                          <div className="flex items-center justify-end gap-2">
                            <Icon className={`h-4 w-4 ${product.color}`} />
                            <span>Allocated</span>
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[120px] text-right font-semibold">Consumed</TableHead>
                        <TableHead className="min-w-[180px] text-right font-semibold">Usage</TableHead>
                        <TableHead className="min-w-[120px] font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeesWithTokens.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center">
                            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                              <Coins className="h-8 w-8 opacity-50" />
                              <p className="font-medium">
                                {searchQuery ? "No employees match your search" : `No employees with ${product.label.toLowerCase()} tokens`}
                              </p>
                              <p className="text-xs">
                                {searchQuery ? "Try a different search term" : "Assign tokens to employees to see them here"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        employeesWithTokens.map((employee) => {
                          const tokens = getTokensForProduct(employee, product.value);
                          const remaining = tokens.allocated - tokens.consumed;
                          const usagePercent = tokens.allocated > 0 ? (tokens.consumed / tokens.allocated) * 100 : 0;
                          const isOwner = entityData?.createdBy === employee.id;
                          
                          return (
                            <TableRow key={employee.id} className={isOwner ? "bg-yellow-50 dark:bg-yellow-950/10 hover:bg-yellow-100 dark:hover:bg-yellow-950/20" : "hover:bg-muted/30"}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
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
                              <TableCell className="text-right">
                                <Badge 
                                  variant="outline" 
                                  className={`font-mono text-sm px-3 py-1 ${
                                    product.value === "workflow" ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800" :
                                    product.value === "chatbot" ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800" :
                                    "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                  }`}
                                >
                                  {formatTokens(tokens.allocated)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-mono text-sm text-muted-foreground">
                                  {formatTokens(tokens.consumed)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="space-y-1 min-w-[120px]">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium">
                                      {usagePercent.toFixed(1)}%
                                    </span>
                                    <span className="text-muted-foreground">
                                      {formatTokens(remaining)} left
                                    </span>
                                  </div>
                                  <Progress value={usagePercent} className="h-1.5" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDialog(employee)}
                                  className="gap-2 hover:bg-primary/10"
                                >
                                  <Settings2 className="h-4 w-4" />
                                  Manage
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {(() => {
                const Icon = products.find(p => p.value === productType)?.icon || Coins;
                return <Icon className={`h-5 w-5 ${products.find(p => p.value === productType)?.color}`} />;
              })()}
              Manage {products.find(p => p.value === productType)?.label} Tokens
            </DialogTitle>
            <DialogDescription>
              Adjust token allocation for <span className="font-semibold text-foreground">{selectedEmployee?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4">
              {/* Current Token Display */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const product = products.find(p => p.value === productType);
                      const Icon = product?.icon || Coins;
                      return (
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          productType === "workflow" ? "bg-purple-100 dark:bg-purple-950/50" :
                          productType === "chatbot" ? "bg-blue-100 dark:bg-blue-950/50" :
                          "bg-green-100 dark:bg-green-950/50"
                        }`}>
                          <Icon className={`h-5 w-5 ${product?.color}`} />
                        </div>
                      );
                    })()}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Current Allocation</p>
                      <p className="text-2xl font-bold">{formatTokens(getCurrentTokens())}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Select Action</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={action === "add" ? "default" : "outline"}
                    className={`h-auto py-4 ${action === "add" ? "bg-green-600 hover:bg-green-700" : ""}`}
                    onClick={() => setAction("add")}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="h-5 w-5" />
                      <span className="font-medium">Add Tokens</span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={action === "remove" ? "default" : "outline"}
                    className={`h-auto py-4 ${action === "remove" ? "bg-red-600 hover:bg-red-700" : ""}`}
                    onClick={() => setAction("remove")}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Minus className="h-5 w-5" />
                      <span className="font-medium">Remove Tokens</span>
                    </div>
                  </Button>
                </div>
              </div>

              {/* Token Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">
                  Token Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={action === "remove" ? getCurrentTokens() : undefined}
                  placeholder={`Enter amount (${action === "remove" ? `max ${formatTokens(getCurrentTokens())}` : "e.g., 1000"})`}
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="h-11 text-base"
                  required
                />
                {action === "remove" && parseInt(tokenAmount) > getCurrentTokens() && (
                  <p className="text-sm text-red-600">
                    Cannot remove more than {formatTokens(getCurrentTokens())} tokens
                  </p>
                )}
              </div>

              {/* Preview */}
              {tokenAmount && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">New Total:</span>
                    <span className="text-lg font-bold">
                      {formatTokens(
                        action === "add" 
                          ? getCurrentTokens() + parseInt(tokenAmount || "0")
                          : Math.max(0, getCurrentTokens() - parseInt(tokenAmount || "0"))
                      )} tokens
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !tokenAmount || (action === "remove" && parseInt(tokenAmount) > getCurrentTokens())} 
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {action === "add" ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    <span>{action === "add" ? "Add" : "Remove"} Tokens</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}