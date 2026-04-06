
"use client";

import { useEffect, useState } from "react";
import {
  X,
  Clock,
  Copy,
  Download,
  Headphones,
  Loader2,
  Check,
} from "lucide-react";

import apiClient from "@/lib/keycloak/interceptor";
import { toast } from "sonner";

interface CallLog {
  call_id: string;
  callerName: string;
  duration?: string;
  callType: "Inbound" | "Outbound";
  created_at: string;
  transcript?: string;
  recording_url?: string;
  analysis?: any;
  costs?: any[];
}

interface CallDetailsDrawerProps {
  call: CallLog | null;
  onClose: () => void;
}

export default function CallDetailsDrawer({
  call,
  onClose,
}: CallDetailsDrawerProps) {
  const [drawerTab, setDrawerTab] = useState<
    "TRANSCRIPT" | "METRICS" | "SUMMARY"
  >("TRANSCRIPT");

  const [copied, setCopied] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* -------------------------------------------------- */
  /* FETCH TRANSCRIPT */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!call?.call_id || drawerTab !== "TRANSCRIPT") return;

    const fetchTranscript = async () => {
      try {
        setLoadingTranscript(true);

        const res = await apiClient.get(
          `/voice/call/${call.call_id}/transcript`
        );

        setTranscript(res.data?.transcript ?? "");
      } catch {
        toast.error("Failed to load transcript");
      } finally {
        setLoadingTranscript(false);
      }
    };

    fetchTranscript();
  }, [call?.call_id, drawerTab]);

  /* -------------------------------------------------- */
  /* DOWNLOAD RECORDING */
  /* -------------------------------------------------- */
  const handleDownloadRecording = async () => {
    if (!call?.call_id) return;

    try {
      setDownloading(true);

      const res = await apiClient.get(
        `/voice/call/${call.call_id}/recording`,
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], { type: "audio/wav" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${call.call_id}.wav`;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download recording");
    } finally {
      setDownloading(false);
    }
  };

  // Don't render anything if no call
  if (!call) return null;

  /* -------------------------------------------------- */
  /* HELPERS */
  /* -------------------------------------------------- */
  const handleCopy = () => {
    navigator.clipboard.writeText(call.call_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseTranscript = (text: string) =>
    text
      .split("\n")
      .filter(Boolean)
      .map((line, index) => {
        const [role, ...msg] = line.split(":");
        return {
          id: index,
          role: role.trim().toLowerCase(),
          message: msg.join(":").trim(),
        };
      });

  const messages = transcript ? parseTranscript(transcript) : [];

  const totalCost =
    call.costs?.reduce((sum, c) => sum + (c.cost || 0), 0) ?? 0;

  /* -------------------------------------------------- */
  /* UI */
  /* -------------------------------------------------- */
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-end">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* DRAWER */}
      <div className="relative h-full w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* HEADER */}
        <div className="p-5 border-b border-border flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{call.callerName}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3" /> {call.duration}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ACTIONS */}
        <div className="p-4 border-b border-border flex gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2 transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="text-xs font-mono">
              {call.call_id.slice(0, 8)}…
            </span>
          </button>
        </div>

        {/* RECORDING */}
        {call.recording_url && (
          <div className="p-4 border-b border-border shrink-0">
            <button
              onClick={handleDownloadRecording}
              disabled={downloading}
              className="w-full flex items-center justify-between px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3">
                <Headphones className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {downloading ? "Downloading..." : "Download Recording"}
                </span>
              </div>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Download className="h-4 w-4 text-primary" />
              )}
            </button>
          </div>
        )}

        {/* TABS */}
        <div className="px-5 border-b border-border flex gap-4 shrink-0">
          {["TRANSCRIPT", "METRICS", "SUMMARY"].map((tab) => (
            <button
              key={tab}
              onClick={() => setDrawerTab(tab as any)}
              className={`px-2 py-3 text-sm font-medium transition-colors relative ${
                drawerTab === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
              {drawerTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-5">
          {drawerTab === "TRANSCRIPT" && (
            <>
              {loadingTranscript ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading transcript...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-center text-muted-foreground">
                    No transcript available
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const isAgent = ["agent", "assistant", "ai"].includes(
                      m.role
                    );
                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isAgent ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-3 rounded-lg text-sm ${
                            isAgent
                              ? "bg-muted text-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1 opacity-70 uppercase">
                            {isAgent ? "Agent" : "User"}
                          </p>
                          {m.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {drawerTab === "METRICS" && (
            <div className="space-y-3">
              <Metric label="Call Type" value={call.callType} />
              <Metric label="Duration" value={call.duration} />
              <Metric label="Cost" value={`$${totalCost.toFixed(4)}`} />
              <Metric
                label="Date"
                value={new Date(call.created_at).toLocaleString()}
              />
            </div>
          )}

          {drawerTab === "SUMMARY" && (
            <div className="prose prose-sm max-w-none">
              {call.analysis?.summary ? (
                <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                  <p className="text-sm leading-relaxed">{call.analysis.summary}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16">
                  <p className="text-center text-muted-foreground">
                    No summary available
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const Metric = ({ label, value }: any) => (
  <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border/50">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold">{value}</span>
  </div>
);