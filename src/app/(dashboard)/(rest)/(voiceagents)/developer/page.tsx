
"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Key,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

import apiClient from "@/lib/keycloak/interceptor";

/* ---------------------------------- */
/* CONFIG */
/* ---------------------------------- */
const TENANT_ID = "f1760e39-4e58-453c-8c7a-bc3a350dbd94";

export default function Page() {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyDescription, setNewKeyDescription] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  /* ---------------------------------- */
  /* FETCH API KEYS */
  /* ---------------------------------- */
  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/voice/tenant/${TENANT_ID}/api-keys`);

      setApiKeys(res.data?.api_keys ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch API keys");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  /* ---------------------------------- */
  /* CREATE API KEY */
  /* ---------------------------------- */
  const createApiKey = async () => {
    if (!newKeyDescription.trim()) {
      toast.error("Description is required");
      return;
    }

    try {
      const res = await apiClient.post(
        `/voice/tenant/${TENANT_ID}/api-keys`,
        null,
        {
          params: { description: newKeyDescription },
        }
      );

      setNewlyCreatedKey(res.data.api_key);
      setNewKeyDescription("");
      await fetchApiKeys();

      toast.success("API key created");
    } catch (err) {
      console.error(err);
      toast.error("Failed to create API key");
    }
  };

  /* ---------------------------------- */
  /* REVOKE API KEY */
  /* ---------------------------------- */
  const deleteApiKey = async (keyId: string) => {
    if (!confirm("Revoke this API key?")) return;

    try {
      setDeletingId(keyId);

      await apiClient.delete(`/voice/tenant/${TENANT_ID}/api-keys/${keyId}`);

      toast.success("API key revoked");
      await fetchApiKeys();
    } catch (err) {
      console.error(err);
      toast.error("Failed to revoke API key");
    } finally {
      setDeletingId(null);
    }
  };

  /* ---------------------------------- */
  /* HELPERS */
  /* ---------------------------------- */
  const copyToClipboard = (text: string, keyId?: string) => {
    navigator.clipboard.writeText(text);
    toast.success("API key copied to clipboard");
    
    if (keyId) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      next.has(keyId) ? next.delete(keyId) : next.add(keyId);
      return next;
    });
  };

  const formatDate = (date: string | null) =>
    date
      ? new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Never";

  const maskApiKey = (key: string) =>
    key.length <= 8
      ? key
      : `${key.slice(0, 4)}${"•".repeat(key.length - 8)}${key.slice(-4)}`;

  /* ---------------------------------- */
  /* UI */
  /* ---------------------------------- */
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Voice Agent API keys
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create API Key
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Keep your API keys secure. Treat them like passwords and never share them publicly.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Your API Keys</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading..."
              : apiKeys.length === 0
              ? "No API keys created yet"
              : `You have ${apiKeys.length} API key${
                  apiKeys.length > 1 ? "s" : ""
                }`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No API keys yet</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Your First API Key
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{key.description}</h4>
                      {key.revoked && <Badge variant="destructive">Revoked</Badge>}
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created: {formatDate(key.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last used: {formatDate(key.last_used)}
                      </span>
                    </div>

                    {key.api_key && (
                      <div className="mt-3 flex items-center gap-2">
                        <code className="bg-muted px-3 py-2 rounded text-xs font-mono flex-1 max-w-md">
                          {visibleKeys.has(key.id)
                            ? key.api_key
                            : maskApiKey(key.api_key)}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="h-8 w-8 p-0"
                        >
                          {visibleKeys.has(key.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(key.api_key, key.id)}
                          className="h-8 px-3"
                        >
                          {copiedKey === key.id ? (
                            <>
                              <Check className="h-4 w-4 mr-1 text-green-600" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!key.revoked && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={deletingId === key.id}
                        onClick={() => deleteApiKey(key.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              You'll only see the full key once. Make sure to copy it now.
            </DialogDescription>
          </DialogHeader>

          {newlyCreatedKey ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  API key created successfully! Copy it now — it won't be shown again.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <Input value={newlyCreatedKey} readOnly className="font-mono" />
                  <Button
                    onClick={() => copyToClipboard(newlyCreatedKey)}
                    variant="outline"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setNewlyCreatedKey(null);
                    setShowCreateDialog(false);
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newKeyDescription}
                  onChange={(e) => setNewKeyDescription(e.target.value)}
                  placeholder="e.g., Production API, Testing, Development"
                />
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createApiKey} disabled={!newKeyDescription.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}