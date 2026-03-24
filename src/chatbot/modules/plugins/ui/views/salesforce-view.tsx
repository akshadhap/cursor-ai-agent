"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

import { PageHeader } from "@/components/page-header";
import { authClient } from "@/lib/auth-client";

import { useAction, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SalesforceConnectionStatus = {
  configured: boolean;
  connected: boolean;
};

const SalesforceWebhooksDialog = ({
  open,
  setOpen,
  entityId,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  entityId: string | null;
}) => {
  const getWebhookUrls = useAction((api as any).private.salesforce.getWebhookUrls);
  const setWebhookUrls = useAction((api as any).private.salesforce.setWebhookUrls);

  const [webhookUrlCreated, setWebhookUrlCreated] = useState("");
  const [webhookUrlEscalated, setWebhookUrlEscalated] = useState("");
  const [webhookUrlResolved, setWebhookUrlResolved] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!entityId) return;

    let cancelled = false;
    setIsLoading(true);
    void getWebhookUrls({ entityId })
      .then((urls: any) => {
        if (cancelled) return;
        setWebhookUrlCreated(typeof urls?.webhookUrlCreated === "string" ? urls.webhookUrlCreated : "");
        setWebhookUrlEscalated(
          typeof urls?.webhookUrlEscalated === "string" ? urls.webhookUrlEscalated : "",
        );
        setWebhookUrlResolved(typeof urls?.webhookUrlResolved === "string" ? urls.webhookUrlResolved : "");
      })
      .catch(() => {
        if (cancelled) return;
        setWebhookUrlCreated("");
        setWebhookUrlEscalated("");
        setWebhookUrlResolved("");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, entityId, getWebhookUrls]);

  const handleSave = async () => {
    if (!entityId) {
      toast.error("Entity ID missing. Please re-login.");
      return;
    }

    try {
      setIsSaving(true);
      await setWebhookUrls({
        entityId,
        webhookUrlCreated,
        webhookUrlEscalated,
        webhookUrlResolved,
      });
      toast.success("Webhook saved");
      setOpen(false);
    } catch (error) {
      void error;
      toast.error("Failed to save webhook");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Webhooks</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Configure a webhook URL to receive events when a case is created, escalated, or
          resolved.
        </DialogDescription>

        <div className="space-y-4">
          <div className="rounded-md border bg-background p-3 text-sm">
            <div className="font-medium">Events sent</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                <div className="text-muted-foreground">case.created</div>
                <Input
                  value={webhookUrlCreated}
                  onChange={(e) => setWebhookUrlCreated(e.target.value)}
                  placeholder="https://your-domain.com/webhook-created"
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                <div className="text-muted-foreground">case.escalated</div>
                <Input
                  value={webhookUrlEscalated}
                  onChange={(e) => setWebhookUrlEscalated(e.target.value)}
                  placeholder="https://your-domain.com/webhook-escalated"
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                <div className="text-muted-foreground">case.resolved</div>
                <Input
                  value={webhookUrlResolved}
                  onChange={(e) => setWebhookUrlResolved(e.target.value)}
                  placeholder="https://your-domain.com/webhook-resolved"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SalesforceDisconnectDialog = ({
  open,
  setOpen,
  entityId,
  onDisconnected,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  entityId: string | null;
  onDisconnected: () => void;
}) => {
  const disconnect = useAction((api as any).private.salesforce.disconnect);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async () => {
    if (!entityId) {
      toast.error("Entity ID missing. Please re-login.");
      return;
    }

    try {
      setIsSubmitting(true);
      await disconnect({ entityId });
      setOpen(false);
      toast.success("Salesforce disconnected");
      onDisconnected();
    } catch (error) {
      void error;
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Salesforce</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to disconnect your Salesforce integration?
        </DialogDescription>
        <DialogFooter>
          <Button
            onClick={handleRemove}
            variant="destructive"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const SalesforceView = () => {
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const searchParams = useSearchParams();

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  const salesforcePlugin = useQuery(
    (api as any).private.plugins.getOne,
    entityId
      ? {
          service: "salesforce",
          entityId,
        }
      : "skip",
  );

  const getConnectionStatus = useAction((api as any).private.salesforce.getConnectionStatus);

  const [status, setStatus] = useState<SalesforceConnectionStatus | null>(null);

  const isConfigured = Boolean(status?.configured);
  const isConnected = Boolean(status?.connected);

  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [webhooksOpen, setWebhooksOpen] = useState(false);

  const refreshConnectionStatus = useCallback(() => {
    if (!entityId) {
      setStatus({ configured: false, connected: false });
      return;
    }

    let cancelled = false;
    void getConnectionStatus({ entityId })
      .then((s: any) => {
        if (cancelled) return;
        setStatus({
          configured: Boolean(s?.configured),
          connected: Boolean(s?.connected),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus({ configured: false, connected: false });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, getConnectionStatus]);

  useEffect(() => {
    const didConnect = searchParams?.get("connected");
    if (didConnect === "true") {
      toast.success("Salesforce connected");
    }

    const err = searchParams?.get("error");
    if (!err) return;

    toast.error(err);
  }, [searchParams]);

  const startAuthorize = () => {
    const returnTo = "/integrations";
    const url = `/api/oauth/salesforce/authorize?returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = url;
  };

  useEffect(() => {
    const cleanup = refreshConnectionStatus();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [refreshConnectionStatus, salesforcePlugin]);

  const escalatedConversations = usePaginatedQuery(
    (api as any).private.conversations.getMany,
    entityId
      ? {
          entityId,
          status: "escalated",
        }
      : "skip",
    { initialNumItems: 20 },
  );

  return (
    <>
      <SalesforceDisconnectDialog
        open={disconnectOpen}
        setOpen={setDisconnectOpen}
        entityId={entityId}
        onDisconnected={refreshConnectionStatus}
      />
      <SalesforceWebhooksDialog
        open={webhooksOpen}
        setOpen={setWebhooksOpen}
        entityId={entityId}
      />

      <div className="flex h-full flex-col bg-muted">
        <PageHeader
          title="Salesforce"
          description="Create, list, and manage Salesforce cases"
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-screen-lg space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-lg border bg-background">
                      <Image
                        src="/logos/salesforce.png"
                        alt="Salesforce"
                        width={28}
                        height={28}
                      />
                    </div>
                    <div>
                      <CardTitle>Salesforce Integration</CardTitle>
                      <CardDescription>
                        Cases are created + escalated automatically from conversations
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {isConnected
                        ? "Connected"
                        : isConfigured
                          ? "Configured"
                          : "Not configured"}
                    </Badge>

                    {isConnected ? (
                      <>
                        <Button
                          onClick={() => setWebhooksOpen(true)}
                          size="sm"
                          variant="secondary"
                        >
                          Webhooks
                        </Button>

                        <Button
                          onClick={() => setDisconnectOpen(true)}
                          size="sm"
                          variant="destructive"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={startAuthorize}
                        size="sm"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {!isConnected ? (
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Click Connect to link your Salesforce account.
                  </div>
                </CardContent>
              ) : null}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Escalated conversations</CardTitle>
                    <CardDescription>
                      These are conversations marked escalated (and Salesforce is escalated in the backend)
                    </CardDescription>
                  </div>
                  {escalatedConversations.status === "CanLoadMore" ? (
                    <Button
                      onClick={() => escalatedConversations.loadMore(20)}
                      type="button"
                      variant="secondary"
                    >
                      Load more
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Case</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(escalatedConversations.results) &&
                    escalatedConversations.results.length > 0 ? (
                      escalatedConversations.results.map((c: any) => (
                        <TableRow key={c._id}>
                          <TableCell>
                            <div className="font-medium">{c.contactSession?.name ?? "-"}</div>
                            <div className="text-xs text-muted-foreground">
                              {c.contactSession?.email ?? ""}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{c.caseId ?? "-"}</TableCell>
                          <TableCell>
                            <Badge>{c.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDistanceToNow(c._creationTime)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/conversations/${c._id}`}>Open</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell className="text-center" colSpan={5}>
                          No escalated conversations
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};
