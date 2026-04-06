"use client";

import { useEffect, useState, useCallback } from "react";

interface SSEEvent {
  type: "added" | "modified" | "removed";
  id: string;
  collection: string;
  data: any;
  timestamp: string;
}

interface UseRealtimeDataOptions {
  apiUrl: string;
  collections: string[];
  autoConnect?: boolean;
}

/**
 * Hook to stream multiple collections in real-time using SSE
 * 
 * @example
 * const data = useRealtimeData({
 *   apiUrl: 'https://your-api.run.app',
 *   collections: ['entities', 'products']
 * });
 * 
 * // Access data by collection name
 * data.entities // Array of entities
 * data.products // Array of products
 */
export function useRealtimeData(options: UseRealtimeDataOptions) {
  const { apiUrl, collections, autoConnect = true } = options;
  
  const [data, setData] = useState<Record<string, any[]>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSource) {
      console.log("Already connected to SSE");
      return;
    }

    try {
      const collectionsParam = collections.join(",");
      // Use Next.js API proxy to bypass CORS
      const url = `/api/stream/all?collections=${collectionsParam}`;

      console.log("[SSE] Connecting to:", url);
      console.log("[SSE] Using Next.js proxy (bypasses CORS)");
      const es = new EventSource(url);

      // Initialize data structure for all collections
      setData(collections.reduce((acc, col) => ({ ...acc, [col]: [] }), {}));

      es.addEventListener("connected", (e) => {
        console.log("Connected to multi-collection stream");
        setIsConnected(true);
        setError(null);
      });

      es.addEventListener("update", (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data);
          console.log("Received update:", event);

          setData((prev) => {
            const collection = prev[event.collection] || [];
            
            let updated: any[];
            switch (event.type) {
              case "added":
                // Avoid duplicates
                if (collection.some((item) => item.id === event.id)) {
                  updated = collection;
                } else {
                  updated = [...collection, { id: event.id, ...event.data }];
                }
                break;

              case "modified":
                updated = collection.map((item) =>
                  item.id === event.id ? { id: event.id, ...event.data } : item
                );
                break;

              case "removed":
                updated = collection.filter((item) => item.id !== event.id);
                break;

              default:
                console.warn("Unknown event type:", event.type);
                updated = collection;
            }
            
            return { ...prev, [event.collection]: updated };
          });
        } catch (err) {
          console.error("Error parsing SSE event:", err);
          setError("Failed to parse update event");
        }
      });

      es.onerror = (err) => {
        console.error("SSE error:", err);
        setIsConnected(false);
        setError("Connection lost. Reconnecting...");
        // EventSource automatically attempts to reconnect
      };

      setEventSource(es);
    } catch (err) {
      console.error("Failed to create EventSource:", err);
      setError("Failed to connect to server");
    }
  }, [apiUrl, collections, eventSource]);

  const disconnect = useCallback(() => {
    if (eventSource) {
      console.log("Disconnecting from SSE");
      eventSource.close();
      setEventSource(null);
      setIsConnected(false);
    }
  }, [eventSource]);

  useEffect(() => {
    if (autoConnect && collections.length > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, collections.length, connect, disconnect]);

  return {
    data,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
