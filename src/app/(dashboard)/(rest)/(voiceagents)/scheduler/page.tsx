
"use client";

import React, { useEffect, useState } from "react";
import {
  Calendar,
  Trash2,
  Plus,
  Loader2,
  Upload,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import apiClient from "@/lib/keycloak/interceptor";

/* -------------------------------------------------- */
/* TYPES */
/* -------------------------------------------------- */
interface Contact {
  name: string;
  number: string;
}

interface OutboundNumber {
  id: string;
  number: string;
  assistant_id: string;
  assistant_name: string;
  is_primary?: boolean;
}

/* -------------------------------------------------- */
/* CONFIG */
/* -------------------------------------------------- */
const TENANT_ID = "119d1380-2cf1-4df9-9ad6-3692fd26afe3";

/* -------------------------------------------------- */
/* COMPONENT */
/* -------------------------------------------------- */
export default function BatchCallScheduler() {
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "", number: "" },
  ]);

  const [availableNumbers, setAvailableNumbers] =
    useState<OutboundNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  const [selectedPhoneId, setSelectedPhoneId] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const [earliestAt, setEarliestAt] = useState("");
  const [latestAt, setLatestAt] = useState("");

  const [isScheduling, setIsScheduling] = useState(false);

  /* -------------------------------------------------- */
  /* FETCH OUTBOUND NUMBERS (NO TOKEN WAIT) */
  /* -------------------------------------------------- */
  useEffect(() => {
    const fetchOutboundNumbers = async () => {
      try {
        setLoadingNumbers(true);

        const [phonesRes, assistantsRes] = await Promise.all([
          apiClient.get(`/voice/tenant/${TENANT_ID}/phones`),
          apiClient.get(`/voice/tenant/${TENANT_ID}/assistants`),
        ]);

        const phones = phonesRes.data?.phones ?? [];
        const assistants = assistantsRes.data?.assistants ?? [];

        const assistantMap: Record<string, string> = {};
        assistants.forEach((a: any) => {
          assistantMap[a.id] = a.name;
        });

        const merged: OutboundNumber[] = phones
          .filter((p: any) => p.number && p.assistant_id)
          .map((p: any) => ({
            id: String(p.id),
            number: p.number,
            assistant_id: p.assistant_id,
            assistant_name:
              assistantMap[p.assistant_id] || "Unknown Assistant",
            is_primary: p.is_primary ?? false,
          }));

        setAvailableNumbers(merged);

        if (merged.length > 0) {
          setSelectedPhoneId(merged[0].id);
          setSelectedAgentId(merged[0].assistant_id);
        }
      } catch {
        toast.error("Failed to load outbound numbers");
      } finally {
        setLoadingNumbers(false);
      }
    };

    fetchOutboundNumbers();
  }, []);

  /* -------------------------------------------------- */
  /* CONTACT HELPERS */
  /* -------------------------------------------------- */
  const addContact = () =>
    setContacts([...contacts, { name: "", number: "" }]);

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  const updateContact = (
    index: number,
    field: "name" | "number",
    value: string
  ) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  /* -------------------------------------------------- */
  /* CSV HELPERS */
  /* -------------------------------------------------- */
  const importCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter(Boolean);

        const imported: Contact[] = [];
        for (let i = 1; i < lines.length; i++) {
          const [name, number] = lines[i]
            .split(",")
            .map((s) => s.trim());
          if (name && number) imported.push({ name, number });
        }

        if (imported.length > 0) {
          setContacts(imported);
          toast.success("Contacts Imported", {
            description: `${imported.length} contacts added`,
          });
        }
      };

      reader.readAsText(file);
    };

    input.click();
  };

  const downloadTemplate = () => {
    const csv = "Name,Phone Number\nJohn Doe,+1234567890";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "batch_template.csv";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  /* -------------------------------------------------- */
  /* SCHEDULE BATCH */
  /* -------------------------------------------------- */
  const handleScheduleBatch = async () => {
    const validContacts = contacts.filter(
      (c) => c.name.trim() && c.number.trim()
    );

    if (!validContacts.length) {
      toast.error("No valid contacts");
      return;
    }

    if (!selectedPhoneId || !selectedAgentId) {
      toast.error("Please select an agent");
      return;
    }

    if (!earliestAt || !latestAt) {
      toast.error("Select time window");
      return;
    }

    try {
      setIsScheduling(true);

      await apiClient.post(`/voice/batch_call/${TENANT_ID}`, {
        contacts: validContacts,
        assistant_id: selectedAgentId,
        phone_id: selectedPhoneId,
        earliest_at: new Date(earliestAt).toISOString(),
        latest_at: new Date(latestAt).toISOString(),
      });

      toast.success("Batch Scheduled", {
        description: `${validContacts.length} calls scheduled`,
      });

      setContacts([{ name: "", number: "" }]);
      setEarliestAt("");
      setLatestAt("");
    } catch (err: any) {
      toast.error("Scheduling failed", {
        description:
          err?.response?.data?.message || "Server error",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const totalContacts = contacts.filter(
    (c) => c.name.trim() && c.number.trim()
  ).length;

  /* -------------------------------------------------- */
  /* UI */
  /* -------------------------------------------------- */
  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold">Batch Call Scheduler</h1>

      <Card>
        <CardContent className="space-y-6 pt-6">
          {/* AGENT + TIME */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Select Agent *</Label>
              <Select
                value={selectedPhoneId}
                onValueChange={(value) => {
                  setSelectedPhoneId(value);
                  const selected = availableNumbers.find(
                    (n) => n.id === value
                  );
                  if (selected)
                    setSelectedAgentId(selected.assistant_id);
                }}
                disabled={loadingNumbers}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingNumbers
                        ? "Loading..."
                        : "Select number"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableNumbers.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.assistant_name} — {n.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Earliest *</Label>
              <Input
                type="datetime-local"
                value={earliestAt}
                onChange={(e) => setEarliestAt(e.target.value)}
              />
            </div>

            <div>
              <Label>Latest *</Label>
              <Input
                type="datetime-local"
                value={latestAt}
                onChange={(e) => setLatestAt(e.target.value)}
              />
            </div>
          </div>

          {/* CONTACTS */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <h3 className="font-semibold">Contacts</h3>
              <Badge>{totalContacts} Valid</Badge>
            </div>

            {contacts.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) =>
                    updateContact(i, "name", e.target.value)
                  }
                />
                <Input
                  placeholder="Phone"
                  value={c.number}
                  onChange={(e) =>
                    updateContact(i, "number", e.target.value)
                  }
                />
                {contacts.length > 1 && (
                  <Button
                    variant="ghost"
                    onClick={() => removeContact(i)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}

            <div className="flex gap-2">
              <Button variant="outline" onClick={addContact}>
                <Plus /> Add
              </Button>
              <Button variant="outline" onClick={importCSV}>
                <Upload /> Import CSV
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download /> Template
              </Button>
            </div>
          </div>

          {/* SUBMIT */}
          <div className="flex justify-end">
            <Button
              onClick={handleScheduleBatch}
              disabled={isScheduling || totalContacts === 0}
            >
              {isScheduling ? (
                <>
                  <Loader2 className="animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="mr-2" />
                  Schedule {totalContacts} Call
                  {totalContacts !== 1 && "s"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
