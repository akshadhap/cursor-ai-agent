/**
 * Analytics Charts Component
 * Visual analytics using Recharts
 */

"use client";

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsChartsProps {
    actionsByType: Record<string, number>;
    dailyUsage: Record<string, number>;
}

const COLORS = [
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#f59e0b", // amber
    "#10b981", // green
    "#06b6d4", // cyan
    "#f97316", // orange
];

const ACTION_LABELS: Record<string, string> = {
    chat: "Chat",
    summarize: "Summarize",
    explain: "Explain",
    task: "Tasks",
    email: "Emails",
    scrape: "Web Scrape",
    enrich: "Enrich Data",
};

export function AnalyticsCharts({ actionsByType, dailyUsage }: AnalyticsChartsProps) {
    // Prepare data for actions by type chart
    const actionsData = Object.entries(actionsByType).map(([type, count]) => ({
        name: ACTION_LABELS[type] || type,
        value: count,
    }));

    // Prepare data for daily usage chart (last 7 days)
    const dailyData = Object.entries(dailyUsage)
        .slice(-7)
        .map(([date, count]) => ({
            date: new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
            }),
            actions: count,
        }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actions by Type Bar Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Actions by Type</CardTitle>
                    <CardDescription>Distribution of your AI actions</CardDescription>
                </CardHeader>
                <CardContent>
                    {actionsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={actionsData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12 }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {actionsData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            <p>No data available yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Daily Usage Line Chart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Daily Usage (Last 7 Days)</CardTitle>
                    <CardDescription>Your activity trend over time</CardDescription>
                </CardHeader>
                <CardContent>
                    {dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="actions"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            <p>No daily data available yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
