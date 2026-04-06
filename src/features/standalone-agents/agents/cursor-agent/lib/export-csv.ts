/**
 * CSV Export Utility
 * Export activity data to CSV file
 */

interface ActivityItem {
    id: string;
    type: string;
    details: any;
    url?: string;
    timestamp: string;
}

export function exportActivityToCSV(activities: ActivityItem[], filename: string = "cursor-ai-activity.csv") {
    if (activities.length === 0) {
        throw new Error("No activities to export");
    }

    // Define CSV headers
    const headers = ["ID", "Type", "Details", "URL", "Timestamp", "Date", "Time"];

    // Convert activities to CSV rows
    const rows = activities.map((activity) => {
        const date = new Date(activity.timestamp);
        const details = typeof activity.details === "string"
            ? activity.details
            : JSON.stringify(activity.details);

        return [
            activity.id,
            activity.type,
            `"${details.replace(/"/g, '""')}"`, // Escape quotes
            activity.url || "N/A",
            activity.timestamp,
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
        ];
    });

    // Combine header and rows
    const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Export analytics data to CSV
 */
interface Analytics {
    totalActions: number;
    actionsByType: Record<string, number>;
    dailyUsage: Record<string, number>;
    lastActive: string | null;
}

export function exportAnalyticsToCSV(analytics: Analytics, filename: string = "cursor-ai-analytics.csv") {
    // Actions by Type CSV
    const typeHeaders = ["Action Type", "Count"];
    const typeRows = Object.entries(analytics.actionsByType).map(([type, count]) => [type, count.toString()]);

    const typeCSV = [typeHeaders.join(","), ...typeRows.map((row) => row.join(","))].join("\n");

    // Daily Usage CSV
    const dailyHeaders = ["Date", "Actions"];
    const dailyRows = Object.entries(analytics.dailyUsage).map(([date, count]) => [date, count.toString()]);

    const dailyCSV = [dailyHeaders.join(","), ...dailyRows.map((row) => row.join(","))].join("\n");

    // Combined CSV
    const csvContent = [
        "CURSOR AI ANALYTICS REPORT",
        "",
        `Total Actions: ${analytics.totalActions}`,
        `Last Active: ${analytics.lastActive || "Never"}`,
        `Report Generated: ${new Date().toLocaleString()}`,
        "",
        "ACTIONS BY TYPE",
        typeCSV,
        "",
        "DAILY USAGE",
        dailyCSV,
    ].join("\n");

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
