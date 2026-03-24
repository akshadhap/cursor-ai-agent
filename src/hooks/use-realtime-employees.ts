"use client";

import { useEffect, useState, useCallback, useRef } from "react";

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
  products?: Record<string, any>; // Raw products object for flexible product structures
}

interface SSEEvent {
  type: "added" | "modified" | "removed";
  id: string;
  collection: string;
  data: Omit<Employee, "id">;
  timestamp: string;
}

interface UseRealtimeEmployeesOptions {
  apiUrl: string;
  entityId?: string;
  autoConnect?: boolean;
}

export function useRealtimeEmployees(options: UseRealtimeEmployeesOptions) {
  const { apiUrl, entityId, autoConnect = true } = options;
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log("[SSE] Disconnecting from SSE");
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setEventSource(null);
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (eventSourceRef.current?.readyState === EventSource.OPEN || eventSourceRef.current?.readyState === EventSource.CONNECTING) {
      console.log("[SSE] Connection already active, skipping");
      return;
    }

    // Clean up any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Use Next.js API proxy to bypass CORS
      const url = entityId
        ? `/api/stream/employees?entity_id=${entityId}`
        : `/api/stream/employees`;

      console.log("[SSE] Attempting to connect to:", url);
      console.log("[SSE] Using Next.js proxy (bypasses CORS)");

      const es = new EventSource(url);

      es.onopen = () => {
        console.log("[SSE] Connection opened successfully");
      };

      es.addEventListener("connected", (e) => {
        console.log("[SSE] Received 'connected' event from server");
        setIsConnected(true);
        setError(null);
      });

      es.addEventListener("update", (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data);
          console.log("[SSE] Received employee update:", event);

          // Map Firestore structure to Employee interface
          const mapEmployeeData = (data: any) => ({
            name: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email,
            status: data.status || 'UNKNOWN',
            workflowTokens: data.products?.workflows?.allocated || 0,
            workflowUsed: data.products?.workflows?.consumed || 0,
            chatbotTokens: data.products?.chatbot_builder?.allocated || 0,
            chatbotUsed: data.products?.chatbot_builder?.consumed || 0,
            voiceTokens: data.products?.voice_agent?.allocated || 0,
            voiceUsed: data.products?.voice_agent?.consumed || 0,
            joinedAt: data.createdDate || new Date().toISOString(),
            products: data.products || {}, // Preserve raw products object
            roles: data.roles || [], // Preserve roles array
          });

          setEmployees((prev) => {
            switch (event.type) {
              case "added":
                // Avoid duplicates
                if (prev.some((emp) => emp.id === event.id)) {
                  return prev;
                }
                return [...prev, { id: event.id, ...mapEmployeeData(event.data) }];

              case "modified":
                return prev.map((emp) =>
                  emp.id === event.id ? { id: event.id, ...mapEmployeeData(event.data) } : emp
                );

              case "removed":
                return prev.filter((emp) => emp.id !== event.id);

              default:
                console.warn("[SSE] Unknown event type:", event.type);
                return prev;
            }
          });
        } catch (err) {
          console.error("[SSE] Error parsing event:", err);
          setError("Failed to parse update event");
        }
      });

      es.addEventListener("message", (e) => {
        console.log("[SSE] Received generic message:", e.data);
      });

      es.onerror = (err) => {
        console.error("[SSE] Connection error. This usually means:");
        console.error("  1. The Flask API is not running or not reachable");
        console.error("  2. NEXT_PUBLIC_API_URL is not configured in .env");
        console.error("  3. The Flask SSE endpoint doesn't exist: /v1/stream/employees");
        console.error("  4. The API returned an HTTP error status");
        console.error("[SSE] EventSource readyState:", es.readyState);
        console.error("  0 = CONNECTING, 1 = OPEN, 2 = CLOSED");
        
        setIsConnected(false);
        
        if (es.readyState === EventSource.CLOSED) {
          setError("API endpoint unavailable. Check if Flask API is running.");
        } else {
          setError("Connection interrupted. Reconnecting...");
        }
      };

      setEventSource(es);
      eventSourceRef.current = es;
    } catch (err) {
      console.error("[SSE] Failed to create EventSource:", err);
      setError("Failed to connect to server");
    }
  }, [apiUrl, entityId]); // Removed eventSource from dependencies

  useEffect(() => {
    if (!autoConnect || !entityId) {
      return;
    }

    connect();

    return () => {
      // Close connection on unmount
      if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.CLOSED) {
        console.log("[SSE] Cleanup: closing connection");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [autoConnect, entityId, connect]); // Only reconnect when entityId changes

  return {
    employees,
    isConnected,
    error,
    connect,
    disconnect,
    setEmployees, // Allow manual initialization if needed
  };
}
