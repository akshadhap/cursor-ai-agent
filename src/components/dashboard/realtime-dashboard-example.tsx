// Example: Stream multiple collections at once
// Usage in your dashboard or admin pages

"use client";

import { useRealtimeData } from "@/hooks/use-realtime-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RealtimeDashboard() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Stream multiple collections simultaneously
  const { data, isConnected, error } = useRealtimeData({
    apiUrl,
    collections: ["entities", "products", "employees"],
    autoConnect: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Real-time Dashboard</h1>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="text-sm text-green-600">● Live</span>
          ) : (
            <span className="text-sm text-orange-600">● {error || "Connecting..."}</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Entities */}
        <Card>
          <CardHeader>
            <CardTitle>Entities ({data.entities?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.entities?.slice(0, 5).map((entity) => (
                <li key={entity.id} className="text-sm">
                  {entity.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader>
            <CardTitle>Products ({data.products?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.products?.slice(0, 5).map((product) => (
                <li key={product.id} className="text-sm">
                  {product.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Employees */}
        <Card>
          <CardHeader>
            <CardTitle>Employees ({data.employees?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.employees?.slice(0, 5).map((employee) => (
                <li key={employee.id} className="text-sm">
                  {employee.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
