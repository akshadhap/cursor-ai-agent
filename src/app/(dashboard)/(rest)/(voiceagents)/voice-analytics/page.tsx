
// "use client";

// import { useEffect, useState } from "react";
// import {
//   RefreshCw,
//   TrendingUp,
//   PhoneCall,
//   Clock,
//   BarChart3,
//   Activity,
//   Loader2,
//   Zap,
// } from "lucide-react";

// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Badge } from "@/components/ui/badge";
// import {
//   AreaChart,
//   Area,
//   BarChart,
//   Bar,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
//   LabelList,
// } from "recharts";

// import apiClient from "@/lib/keycloak/interceptor";
// import { toast } from "sonner";

// /* -------------------------------------------------- */
// /* CONFIG */
// /* -------------------------------------------------- */
// const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

// /* -------------------------------------------------- */
// /* STATS CARD */
// /* -------------------------------------------------- */
// const StatsCard = ({ title, value, icon: Icon, description, change }: any) => (
//   <Card className="border-border/50 hover:border-primary/50 transition-all duration-200">
//     <CardContent className="p-6">
//       <div className="flex items-center justify-between">
//         <div className="space-y-1 flex-1">
//           <p className="text-sm font-medium text-muted-foreground">{title}</p>
//           <div className="flex items-baseline gap-2">
//             <p className="text-2xl font-bold">{value}</p>
//             {change && (
//               <Badge
//                 variant={change.positive ? "default" : "destructive"}
//                 className="text-xs"
//               >
//                 {change.positive ? "+" : ""}
//                 {change.value}
//               </Badge>
//             )}
//           </div>
//           {description && (
//             <p className="text-xs text-muted-foreground">{description}</p>
//           )}
//         </div>
//         <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
//           <Icon className="h-6 w-6 text-primary" />
//         </div>
//       </div>
//     </CardContent>
//   </Card>
// );

// /* -------------------------------------------------- */
// /* COMPONENT */
// /* -------------------------------------------------- */
// export default function Analytics() {
//   const [artifacts, setArtifacts] = useState<any[]>([]);
//   const [isLoading, setIsLoading] = useState(true);

//   const [metricsData, setMetricsData] = useState<any[]>([]);
//   const [hourlyData, setHourlyData] = useState<any[]>([]);
//   const [stats, setStats] = useState({
//     activeCalls: "0",
//     totalCalls: "0",
//     avgResponse: "0s",
//     successRate: "0%",
//     totalCallsCard: "0",
//     avgDurationCard: "0s",
//     successRateCard: "0%",
//   });

//   /* -------------------------------------------------- */
//   /* FETCH ARTIFACTS (NO TOKEN WAIT) */
//   /* -------------------------------------------------- */
//   const fetchArtifacts = async () => {
//     try {
//       setIsLoading(true);

//       const res = await apiClient.get(
//         `/voice/artifacts?tenant_id=${TENANT_ID}`
//       );

//       setArtifacts(res.data ?? []);
//     } catch {
//       toast.error("Failed to load analytics data");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchArtifacts();
//   }, []);

//   /* -------------------------------------------------- */
//   /* PROCESS DATA */
//   /* -------------------------------------------------- */
//   useEffect(() => {
//     if (!artifacts.length) return;

//     const totalCalls = artifacts.length;

//     const successful = artifacts.filter(
//       (c) => c.analysis?.successEvaluation === "true"
//     ).length;

//     const successRate = ((successful / totalCalls) * 100).toFixed(1);

//     const avgLatency =
//       artifacts.reduce(
//         (sum, c) => sum + (c.performance_metrics?.turnLatencyAverage || 0),
//         0
//       ) / totalCalls;

//     const totalDuration = artifacts.reduce((sum, c) => {
//       const start = new Date(c.created_at).getTime();
//       const end = new Date(c.ended_at).getTime();
//       return sum + (end - start);
//     }, 0);

//     const avgDuration = totalDuration / totalCalls / 1000;

//     setStats({
//       activeCalls: "0",
//       totalCalls: totalCalls.toString(),
//       avgResponse: `${(avgLatency / 1000).toFixed(2)}s`,
//       successRate: `${successRate}%`,
//       totalCallsCard: `${totalCalls}`,
//       avgDurationCard: `${Math.floor(avgDuration / 60)}m ${Math.floor(
//         avgDuration % 60
//       )}s`,
//       successRateCard: `${successRate}%`,
//     });

//     generateMetricsData(artifacts);
//     generateHourlyData(artifacts);
//   }, [artifacts]);

//   /* -------------------------------------------------- */
//   /* CHART HELPERS */
//   /* -------------------------------------------------- */
//   const generateMetricsData = (data: any[]) => {
//     const map: any = {};

//     data.forEach((c) => {
//       const key = new Date(c.created_at).toLocaleDateString("en-US", {
//         month: "short",
//         day: "numeric",
//       });

//       if (!map[key]) map[key] = { calls: 0, latency: [], cost: [] };

//       map[key].calls++;
//       map[key].latency.push(c.performance_metrics?.turnLatencyAverage || 0);
//       map[key].cost.push(
//         c.costs?.reduce((s: number, x: any) => s + x.cost, 0) * 100 || 0
//       );
//     });

//     setMetricsData(
//       Object.keys(map).map((k) => ({
//         date: k,
//         calls: map[k].calls,
//         latency: Math.round(
//           map[k].latency.reduce((a: number, b: number) => a + b, 0) /
//             map[k].latency.length
//         ),
//         cost: Math.round(
//           map[k].cost.reduce((a: number, b: number) => a + b, 0) /
//             map[k].cost.length
//         ),
//       }))
//     );
//   };

//   const generateHourlyData = (data: any[]) => {
//     const bucket: any = {};
//     data.forEach((c) => {
//       const h = new Date(c.created_at).getHours();
//       bucket[h] = (bucket[h] || 0) + 1;
//     });

//     const result = [];
//     for (let i = 0; i < 24; i += 3) {
//       result.push({
//         hour: `${i.toString().padStart(2, "0")}:00`,
//         calls: bucket[i] || 0,
//       });
//     }

//     setHourlyData(result);
//   };

//   /* -------------------------------------------------- */
//   /* LOADING */
//   /* -------------------------------------------------- */
//   if (isLoading && artifacts.length === 0) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <Loader2 className="h-8 w-8 animate-spin text-primary" />
//       </div>
//     );
//   }

//   /* -------------------------------------------------- */
//   /* UI (UNCHANGED) */
//   /* -------------------------------------------------- */
//   return (
//     <div className="p-4 md:p-6 space-y-6">
//       {/* HEADER */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
//             Analytics Dashboard
//           </h1>
//           <p className="text-sm md:text-base text-muted-foreground">
//             Real-time system monitoring and comprehensive insights
//           </p>
//         </div>

//         <Button 
//           onClick={fetchArtifacts} 
//           size="sm" 
//           variant="outline"
//           className="rounded-lg h-10 px-4"
//           disabled={isLoading}
//         >
//           <RefreshCw
//             className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
//           />
//           Refresh Data
//         </Button>
//       </div>

//       {/* STATS */}
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//         <StatsCard 
//           title="Active Calls" 
//           value={stats.activeCalls} 
//           icon={PhoneCall}
//           description="Currently in progress"
//         />
//         <StatsCard 
//           title="Total Calls" 
//           value={stats.totalCalls} 
//           icon={BarChart3}
//           description="All time"
//           change={{ value: "+12%", positive: true }}
//         />
//         <StatsCard 
//           title="Avg Response Time" 
//           value={stats.avgResponse} 
//           icon={Clock}
//           description="System latency"
//         />
//         <StatsCard 
//           title="Success Rate" 
//           value={stats.successRate} 
//           icon={TrendingUp}
//           description="Call completion"
//           change={{ value: "+5%", positive: true }}
//         />
//       </div>

//       {/* TABS */}
//       <Tabs defaultValue="overview" className="space-y-6">
//         <TabsList className="grid w-full md:w-auto md:inline-flex bg-muted rounded-lg p-1">
//           <TabsTrigger value="overview" className="rounded-md">Overview</TabsTrigger>
//           <TabsTrigger value="performance" className="rounded-md">Performance</TabsTrigger>
//           <TabsTrigger value="trends" className="rounded-md">Trends</TabsTrigger>
//         </TabsList>

//         {/* OVERVIEW */}
//         <TabsContent value="overview" className="space-y-4">
//           <Card className="border-border/50">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <BarChart3 className="h-5 w-5 text-primary" />
//                 Voice Agent Metrics Overview
//               </CardTitle>
//               <CardDescription>Track calls, latency, and costs over time</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {metricsData.length > 0 ? (
//                 <ResponsiveContainer width="100%" height={350}>
//                   <AreaChart data={metricsData}>
//                     <defs>
//                       <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
//                         <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
//                       </linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
//                     <XAxis 
//                       dataKey="date" 
//                       className="text-xs"
//                       stroke="hsl(var(--muted-foreground))"
//                     />
//                     <YAxis 
//                       className="text-xs"
//                       stroke="hsl(var(--muted-foreground))"
//                     />
//                     <Tooltip 
//                       contentStyle={{
//                         backgroundColor: "hsl(var(--popover))",
//                         border: "1px solid hsl(var(--border))",
//                         borderRadius: "var(--radius)",
//                       }}
//                     />
//                     <Legend />
//                     <Area 
//                       type="monotone" 
//                       dataKey="calls" 
//                       stroke="hsl(var(--primary))" 
//                       fillOpacity={1}
//                       fill="url(#colorCalls)"
//                       strokeWidth={2}
//                       name="Total Calls"
//                     />
//                     <Area 
//                       type="monotone" 
//                       dataKey="cost" 
//                       stroke="hsl(var(--chart-3))" 
//                       fillOpacity={0.2}
//                       fill="hsl(var(--chart-3))"
//                       strokeWidth={2}
//                       name="Cost (¢)"
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               ) : (
//                 <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
//                   <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
//                   <p className="text-sm">No data available for the selected period</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>

//           {/* Small cards */}
//           <div className="grid gap-4 md:grid-cols-3">
//             <Card className="border-border/50 hover:shadow-lg transition-shadow">
//               <CardHeader className="pb-3">
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-base">Total Calls</CardTitle>
//                   <div className="p-2 bg-primary/10 rounded-lg">
//                     <PhoneCall className="h-4 w-4 text-primary" />
//                   </div>
//                 </div>
//                 <CardDescription>Last 30 days</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="text-3xl font-bold">{stats.totalCallsCard}</div>
//                 <Badge variant="secondary" className="mt-2 text-xs">
//                   <TrendingUp className="h-3 w-3 mr-1" />
//                   +12% from last month
//                 </Badge>
//               </CardContent>
//             </Card>

//             <Card className="border-border/50 hover:shadow-lg transition-shadow">
//               <CardHeader className="pb-3">
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-base">Avg Duration</CardTitle>
//                   <div className="p-2 bg-primary/10 rounded-lg">
//                     <Clock className="h-4 w-4 text-primary" />
//                   </div>
//                 </div>
//                 <CardDescription>Per call</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="text-3xl font-bold">{stats.avgDurationCard}</div>
//                 <Badge variant="secondary" className="mt-2 text-xs">
//                   <Activity className="h-3 w-3 mr-1" />
//                   Optimal range
//                 </Badge>
//               </CardContent>
//             </Card>

//             <Card className="border-border/50 hover:shadow-lg transition-shadow">
//               <CardHeader className="pb-3">
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-base">Success Rate</CardTitle>
//                   <div className="p-2 bg-primary/10 rounded-lg">
//                     <TrendingUp className="h-4 w-4 text-primary" />
//                   </div>
//                 </div>
//                 <CardDescription>Completion rate</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="text-3xl font-bold">{stats.successRateCard}</div>
//                 <Badge variant="default" className="mt-2 text-xs">
//                   <Zap className="h-3 w-3 mr-1" />
//                   {parseFloat(stats.successRateCard) >= 90 ? "Excellent" : "Good"}
//                 </Badge>
//               </CardContent>
//             </Card>
//           </div>
//         </TabsContent>

//         {/* PERFORMANCE */}
//         <TabsContent value="performance" className="space-y-4">
//           <Card className="border-border/50">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Activity className="h-5 w-5 text-primary" />
//                 Latency Performance
//               </CardTitle>
//               <CardDescription>Average response times by date</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {metricsData.length > 0 ? (
//                 <ResponsiveContainer width="100%" height={350}>
//                   <BarChart data={metricsData} barCategoryGap={32}>
//                     <defs>
//                       <linearGradient id="barLatency" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
//                         <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
//                       </linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
//                     <XAxis 
//                       dataKey="date" 
//                       className="text-xs"
//                       stroke="hsl(var(--muted-foreground))"
//                     />
//                     <YAxis 
//                       className="text-xs"
//                       stroke="hsl(var(--muted-foreground))"
//                     />
//                     <Tooltip 
//                       contentStyle={{
//                         backgroundColor: "hsl(var(--popover))",
//                         border: "1px solid hsl(var(--border))",
//                         borderRadius: "var(--radius)",
//                       }}
//                     />
//                     <Legend />
//                     <Bar 
//                       dataKey="latency" 
//                       name="Latency (ms)" 
//                       fill="url(#barLatency)" 
//                       radius={[8, 8, 0, 0]}
//                     >
//                       <LabelList dataKey="latency" position="top" fill="hsl(var(--primary))" fontSize={12} />
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               ) : (
//                 <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
//                   <Activity className="h-12 w-12 mb-4 opacity-50" />
//                   <p className="text-sm">No performance data available</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>

//         {/* TRENDS */}
//         <TabsContent value="trends" className="space-y-4">
//           <Card className="border-border/50">
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <Activity className="h-5 w-5 text-primary" />
//                 Hourly Call Distribution
//               </CardTitle>
//               <CardDescription>Analyze peak calling hours and patterns</CardDescription>
//             </CardHeader>
//             <CardContent>
//               {hourlyData.length > 0 ? (
//                 <ResponsiveContainer width="100%" height={320}>
//                   <LineChart data={hourlyData}>
//                     <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
//                     <XAxis 
//                       dataKey="hour" 
//                       className="text-xs"
//                       stroke="hsl(var(--muted-foreground))"
//                     />
//                     <YAxis 
//                       className="text-xs"
//                       stroke="hsl(var(--muted-foreground))"
//                     />
//                     <Tooltip 
//                       contentStyle={{
//                         backgroundColor: "hsl(var(--popover))",
//                         border: "1px solid hsl(var(--border))",
//                         borderRadius: "var(--radius)",
//                       }}
//                     />
//                     <Line
//                       type="monotone"
//                       dataKey="calls"
//                       stroke="hsl(var(--primary))"
//                       strokeWidth={3}
//                       dot={{ fill: "hsl(var(--primary))", r: 4 }}
//                       activeDot={{ r: 6 }}
//                       name="Calls per Hour"
//                     />
//                   </LineChart>
//                 </ResponsiveContainer>
//               ) : (
//                 <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
//                   <Clock className="h-12 w-12 mb-4 opacity-50" />
//                   <p className="text-sm">No hourly data available</p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }





"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  PhoneCall,
  Clock,
  BarChart3,
  Activity,
  Loader2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

import apiClient from "@/lib/keycloak/interceptor";
import { toast } from "sonner";

/* -------------------------------------------------- */
/* CONFIG */
/* -------------------------------------------------- */
const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

/* -------------------------------------------------- */
/* STATS CARD */
/* -------------------------------------------------- */
const StatsCard = ({ title, value, icon: Icon, description, change }: any) => (
  <Card className="border-border/50 hover:border-primary/50 transition-all duration-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <Badge
                variant={change.positive ? "default" : "destructive"}
                className="text-xs"
              >
                {change.positive ? "+" : ""}
                {change.value}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);

/* -------------------------------------------------- */
/* COMPONENT */
/* -------------------------------------------------- */
export default function Analytics() {
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeCalls: "0",
    totalCalls: "0",
    avgResponse: "0s",
    successRate: "0%",
    totalCallsCard: "0",
    avgDurationCard: "0s",
    successRateCard: "0%",
  });

  /* -------------------------------------------------- */
  /* FETCH ARTIFACTS (NO TOKEN WAIT) */
  /* -------------------------------------------------- */
  const fetchArtifacts = async () => {
    try {
      setIsLoading(true);

      const res = await apiClient.get(
        `/voice/artifacts?tenant_id=${TENANT_ID}`
      );

      setArtifacts(res.data ?? []);
    } catch {
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, []);

  /* -------------------------------------------------- */
  /* PROCESS DATA */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!artifacts.length) return;

    const totalCalls = artifacts.length;

    const successful = artifacts.filter(
      (c) => c.analysis?.successEvaluation === "true"
    ).length;

    const successRate = ((successful / totalCalls) * 100).toFixed(1);

    const avgLatency =
      artifacts.reduce(
        (sum, c) => sum + (c.performance_metrics?.turnLatencyAverage || 0),
        0
      ) / totalCalls;

    const totalDuration = artifacts.reduce((sum, c) => {
      const start = new Date(c.created_at).getTime();
      const end = new Date(c.ended_at).getTime();
      return sum + (end - start);
    }, 0);

    const avgDuration = totalDuration / totalCalls / 1000;

    setStats({
      activeCalls: "0",
      totalCalls: totalCalls.toString(),
      avgResponse: `${(avgLatency / 1000).toFixed(2)}s`,
      successRate: `${successRate}%`,
      totalCallsCard: `${totalCalls}`,
      avgDurationCard: `${Math.floor(avgDuration / 60)}m ${Math.floor(
        avgDuration % 60
      )}s`,
      successRateCard: `${successRate}%`,
    });

    generateMetricsData(artifacts);
    generateHourlyData(artifacts);
  }, [artifacts]);

  /* -------------------------------------------------- */
  /* CHART HELPERS */
  /* -------------------------------------------------- */
  const generateMetricsData = (data: any[]) => {
    const map: any = {};

    data.forEach((c) => {
      const key = new Date(c.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!map[key]) map[key] = { calls: 0, latency: [], cost: [] };

      map[key].calls++;
      map[key].latency.push(c.performance_metrics?.turnLatencyAverage || 0);
      map[key].cost.push(
        c.costs?.reduce((s: number, x: any) => s + x.cost, 0) * 100 || 0
      );
    });

    setMetricsData(
      Object.keys(map).map((k) => ({
        date: k,
        calls: map[k].calls,
        latency: Math.round(
          map[k].latency.reduce((a: number, b: number) => a + b, 0) /
            map[k].latency.length
        ),
        cost: Math.round(
          map[k].cost.reduce((a: number, b: number) => a + b, 0) /
            map[k].cost.length
        ),
      }))
    );
  };

  const generateHourlyData = (data: any[]) => {
    const bucket: any = {};
    data.forEach((c) => {
      const h = new Date(c.created_at).getHours();
      bucket[h] = (bucket[h] || 0) + 1;
    });

    const result = [];
    for (let i = 0; i < 24; i += 3) {
      result.push({
        hour: `${i.toString().padStart(2, "0")}:00`,
        calls: bucket[i] || 0,
      });
    }

    setHourlyData(result);
  };

  /* -------------------------------------------------- */
  /* LOADING */
  /* -------------------------------------------------- */
  if (isLoading && artifacts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* UI */
  /* -------------------------------------------------- */
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">
            Analytics Dashboard
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Real-time system monitoring and comprehensive insights
          </p>
        </div>

        <Button 
          onClick={fetchArtifacts} 
          size="sm" 
          variant="outline"
          className="rounded-lg h-10 px-4"
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh Data
        </Button>
      </div>

      {/* STATS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Active Calls" 
          value={stats.activeCalls} 
          icon={PhoneCall}
          description="Currently in progress"
        />
        <StatsCard 
          title="Total Calls" 
          value={stats.totalCalls} 
          icon={BarChart3}
          description="All time"
          change={{ value: "+12%", positive: true }}
        />
        <StatsCard 
          title="Avg Response Time" 
          value={stats.avgResponse} 
          icon={Clock}
          description="System latency"
        />
        <StatsCard 
          title="Success Rate" 
          value={stats.successRate} 
          icon={TrendingUp}
          description="Call completion"
          change={{ value: "+5%", positive: true }}
        />
      </div>

      {/* TABS */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full md:w-auto md:inline-flex bg-muted rounded-lg p-1">
          <TabsTrigger value="overview" className="rounded-md">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-md">Performance</TabsTrigger>
          <TabsTrigger value="trends" className="rounded-md">Trends</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Voice Agent Metrics Overview
              </CardTitle>
              <CardDescription>Track calls, latency, and costs over time</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={metricsData}>
                    <defs>
                      <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e5e7eb" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#e5e7eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#9ca3af" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      className="text-xs"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#e5e7eb"
                      fillOpacity={1}
                      fill="url(#colorCalls)"
                      strokeWidth={2}
                      name="Total Calls"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cost" 
                      stroke="#9ca3af"
                      fillOpacity={1}
                      fill="url(#colorCost)"
                      strokeWidth={2}
                      name="Cost (cents)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No data available for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Small cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Total Calls</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <PhoneCall className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardDescription>Last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalCallsCard}</div>
                <Badge variant="secondary" className="mt-2 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from last month
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Avg Duration</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardDescription>Per call</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.avgDurationCard}</div>
                <Badge variant="secondary" className="mt-2 text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Optimal range
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Success Rate</CardTitle>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <CardDescription>Completion rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.successRateCard}</div>
                <Badge variant="default" className="mt-2 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  {parseFloat(stats.successRateCard) >= 90 ? "Excellent" : "Good"}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PERFORMANCE */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Latency Performance
              </CardTitle>
              <CardDescription>Average response times by date</CardDescription>
            </CardHeader>
            <CardContent>
              {metricsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={metricsData} barCategoryGap={32}>
                    <defs>
                      <linearGradient id="barLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      className="text-xs"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="latency" 
                      name="Latency (ms)" 
                      fill="url(#barLatency)" 
                      radius={[8, 8, 0, 0]}
                    >
                      <LabelList dataKey="latency" position="top" fill="hsl(var(--primary))" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                  <Activity className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No performance data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRENDS */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Hourly Call Distribution
              </CardTitle>
              <CardDescription>Analyze peak calling hours and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="hour" 
                      className="text-xs"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      className="text-xs"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#d1d5db"
                      strokeWidth={3}
                      dot={{ fill: "#d1d5db", r: 4 }}
                      activeDot={{ r: 6, fill: "#e5e7eb" }}
                      name="Calls per Hour"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
                  <Clock className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No hourly data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
