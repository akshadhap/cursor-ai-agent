"use client";

import { Suspense, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceAgentsList } from "./voiceagents-list";
import { useSuspenseVoiceAgents } from "../hooks/use-voiceagents";
import { useRouter } from "next/navigation";

export default function VoiceAgentPageClient() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [createOpen, setCreateOpen] = useState(false);

//   const { data: agents } = useSuspenseVoiceAgents();
  const router = useRouter();
  // FILTER
  // const filtered = agents.filter((agent) => {
  //   const query = search.trim().toLowerCase();
  //   const matchesQuery =
  //     query === "" ||
  //     agent.name.toLowerCase().includes(query) ||
  //     agent.phone.toLowerCase().includes(query) ||
  //     agent.assistantId.toLowerCase().includes(query);

  //   const matchesStatus = filterStatus === "all" || agent.status === filterStatus;

  //   return matchesQuery && matchesStatus;
  // });

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Agent</h1>
          <p className="text-muted-foreground text-sm">
            Create and deploy intelligent voice agents for your business needs.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg">
              <Plus className="h-4 w-4 mr-2" /> Create Agent
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Choose Agent Type</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 pt-4">
              <Card className="cursor-pointer rounded-2xl border border-primary/20 shadow-lg"
                onClick={() => {
                  setCreateOpen(false);
                //   window.location.href = "/customvoiceagent"; // same behavior as old react
                router.push("/customvoiceagent");

                }}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Support Agent</CardTitle>
                      <CardDescription>
                        Customer service assistant with advanced capabilities
                      </CardDescription>
                    </div>
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex gap-2">
                    <Badge variant="secondary">Advanced</Badge>
                    <Badge variant="secondary">Custom</Badge>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button className="w-full">Start Building</Button>
                </CardFooter>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Agent..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as any)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AGENT LIST */}
      {/* <VoiceAgentsList agents={filtered} /> */}

      <Suspense fallback={<div className="text-center py-10">Loading agents...</div>}>
        {/* <VoiceAgentsList /> */}
        <VoiceAgentsList search={search} filterStatus={filterStatus} />
      </Suspense>

    </div>
  );
}
