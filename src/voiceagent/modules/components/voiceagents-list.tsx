

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AgentCard from "@/components/agent-card";
import apiClient from "@/lib/keycloak/interceptor";
import { toast } from "sonner";
import { Bot } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface VoiceAgentsListProps {
  search: string;
  filterStatus: "all" | "active" | "inactive";
}

const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

export const VoiceAgentsList = ({
  search,
  filterStatus,
}: VoiceAgentsListProps) => {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* -----------------------------------------
     FETCH VOICE AGENTS (AFTER TOKEN)
  ----------------------------------------- */
  useEffect(() => {
    if (sessionPending) return;
    if (!session?.token) {
      setLoading(false);
      return;
    }

    const fetchAgents = async () => {
      setLoading(true);

      try {
        const [phonesRes, assistantsRes] = await Promise.all([
          apiClient.get(`/voice/tenant/${TENANT_ID}/phones`),
          apiClient.get(`/voice/tenant/${TENANT_ID}/assistants`),
        ]);

        const phones = phonesRes.data?.phones ?? [];
        const assistants = assistantsRes.data?.assistants ?? [];

        const assistantMap = new Map(
          assistants.map((a: any) => [a.id, a.name])
        );

        const mappedAgents = phones
          .filter((p: any) => p.assistant_id)
          .map((p: any) => ({
            id: p.id,
            name: assistantMap.get(p.assistant_id) ?? "Voice Agent",
            assistantId: p.assistant_id,
            phone: p.number,
            status: "active",
            type: "Support",
          }));

        setAgents(mappedAgents);
      } catch (err: any) {
        if (err?.response?.status === 401) {
          // router.push("/login");
          return;
        }
        toast.error("Failed to load voice agents");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, [session?.token, sessionPending, router]);

  /* -----------------------------------------
     DELETE AGENT
  ----------------------------------------- */
  const handleDelete = async (agent: any) => {
    const toastId = toast.loading("Deleting agent...");

    try {
      await Promise.all([
        apiClient.delete(`/voice/phone/${agent.id}`),
        apiClient.delete(`/voice/assistant/${agent.assistantId}`),
      ]);

      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      toast.success("Agent deleted successfully", { id: toastId });
    } catch {
      toast.error("Failed to delete agent", { id: toastId });
    }
  };

  /* -----------------------------------------
     FILTERING
  ----------------------------------------- */
  const filtered = agents.filter((agent) => {
    const query = search.trim().toLowerCase();

    const matchesQuery =
      query === "" ||
      agent.name.toLowerCase().includes(query) ||
      agent.phone.toLowerCase().includes(query) ||
      agent.assistantId.toLowerCase().includes(query);

    const matchesStatus =
      filterStatus === "all" || agent.status === filterStatus;

    return matchesQuery && matchesStatus;
  });

  /* -----------------------------------------
     LOADING STATE (TOKEN + DATA)
  ----------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading voice agents…
      </div>
    );
  }

  /* -----------------------------------------
     EMPTY STATE
  ----------------------------------------- */
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-muted/50 p-6 mb-4">
          <Bot className="h-12 w-12 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium mb-2">
          {search ? "No matching agents" : "No voice agents yet"}
        </p>
        <p className="text-sm text-muted-foreground">
          {search
            ? "Try adjusting your search or filters"
            : "Create your first voice agent to get started"}
        </p>
      </div>
    );
  }

  /* -----------------------------------------
     RENDER
  ----------------------------------------- */
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
      {filtered.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          onDelete={() => handleDelete(agent)}
        />
      ))}
    </div>
  );
};

export default VoiceAgentsList;
