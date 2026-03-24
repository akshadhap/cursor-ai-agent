"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useCallback, useEffect } from "react";

// ✅ BetterAuth
import { authClient } from "@/lib/auth-client";
// ✅ Convex users lookup
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import {
  BeyPluginForm,
  BeyPluginRemoveForm,
} from "@/chatbot/modules/plugins/ui/views/ai-avatar-view";
import {
  VapiPluginForm,
  VapiPluginRemoveForm,
} from "@/chatbot/modules/plugins/ui/views/vapi-view";

const connectionCardClassName =
  "relative flex items-center justify-between p-4 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer w-full text-left";

const ConnectionCard = ({
  title,
  logo,
  isLinked,
  onClick,
}: {
  title: string;
  logo: string;
  isLinked: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className={`${connectionCardClassName} ${
        isLinked
          ? "border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/20"
          : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-neutral-400 dark:hover:border-neutral-600"
      }`}
      type="button"
    >
      <div className="flex items-center gap-3">
        <div className="size-8 flex items-center justify-center">
          <Image src={logo} alt={title} width={24} height={24} />
        </div>
        <div>
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {title}
          </div>
          <div
            className={`text-xs mt-0.5 ${
              isLinked
                ? "text-green-600 dark:text-green-400 font-medium"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {isLinked ? "Linked" : "Click to Link"}
          </div>
        </div>
      </div>
      <div className="size-10 flex items-center justify-center opacity-50">
        <Image
          src={logo}
          alt=""
          width={32}
          height={32}
          className="grayscale opacity-60"
        />
      </div>
    </button>
  );
};

const ZohoDeskDisconnectDialog = ({
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
  const disconnect = useAction((api as any).private.zohoDesk.disconnect);
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
      toast.success("Zoho Desk disconnected");
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
          <DialogTitle>Disconnect Zoho Desk</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to disconnect your Zoho Desk integration?
        </DialogDescription>
        <DialogFooter>
          <Button onClick={handleRemove} variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ZohoDeskConnectDialog = ({
  open,
  setOpen,
  configured,
  connected,
  onConnect,
  onDisconnect,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  configured: boolean;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) => {
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zoho Desk</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {configured
            ? connected
              ? "Zoho Desk is connected for your organization."
              : "Zoho Desk is configured but not connected yet."
            : "Zoho Desk is not configured yet."}
        </DialogDescription>
        <DialogFooter>
          {connected ? (
            <Button variant="destructive" onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={onConnect}>Connect</Button>
          )}
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
          <Button onClick={handleRemove} variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
        setWebhookUrlCreated(
          typeof urls?.webhookUrlCreated === "string" ? urls.webhookUrlCreated : "",
        );
        setWebhookUrlEscalated(
          typeof urls?.webhookUrlEscalated === "string" ? urls.webhookUrlEscalated : "",
        );
        setWebhookUrlResolved(
          typeof urls?.webhookUrlResolved === "string" ? urls.webhookUrlResolved : "",
        );
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
          Configure a webhook URL to receive events when a case is created, escalated, or resolved.
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

const SalesforceConnectDialog = ({
  open,
  setOpen,
  configured,
  connected,
  onConnect,
  onDisconnect,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  configured: boolean;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) => {
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salesforce</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {configured
            ? connected
              ? "Salesforce is connected for your organization."
              : "Salesforce is configured but not connected yet."
            : "Salesforce is not configured yet."}
        </DialogDescription>
        <DialogFooter>
          {connected ? (
            <Button variant="destructive" onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={onConnect} disabled={!configured}>
              Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SlackDisconnectDialog = ({
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
  const disconnect = useAction((api as any).private.slack.disconnect);
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
      toast.success("Slack disconnected");
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
          <DialogTitle>Disconnect Slack</DialogTitle>
        </DialogHeader>
        <DialogDescription>Are you sure you want to disconnect your Slack integration?</DialogDescription>
        <DialogFooter>
          <Button onClick={handleRemove} variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SlackConnectDialog = ({
  open,
  setOpen,
  configured,
  connected,
  onConnect,
  onDisconnect,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  configured: boolean;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) => {
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slack</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {configured
            ? connected
              ? "Slack is connected for your organization."
              : "Slack is configured but not connected yet."
            : "Slack is not configured yet."}
        </DialogDescription>
        <DialogFooter>
          {connected ? (
            <Button variant="destructive" onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={onConnect} disabled={!configured}>
              Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CloverDisconnectDialog = ({
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
  const disconnect = useAction((api as any).private.clover.disconnect);
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
      toast.success("Clover disconnected");
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
          <DialogTitle>Disconnect Clover</DialogTitle>
        </DialogHeader>
        <DialogDescription>Are you sure you want to disconnect your Clover integration?</DialogDescription>
        <DialogFooter>
          <Button onClick={handleRemove} variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const HubSpotDisconnectDialog = ({
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
  const disconnect = useAction((api as any).private.hubspot.disconnect);
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
      toast.success("HubSpot disconnected");
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
          <DialogTitle>Disconnect HubSpot</DialogTitle>
        </DialogHeader>
        <DialogDescription>Are you sure you want to disconnect your HubSpot integration?</DialogDescription>
        <DialogFooter>
          <Button onClick={handleRemove} variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? "Disconnecting..." : "Disconnect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const HubSpotConnectDialog = ({
  open,
  setOpen,
  configured,
  connected,
  onConnect,
  onDisconnect,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  configured: boolean;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) => {
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>HubSpot</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {configured
            ? connected
              ? "HubSpot is connected for your organization."
              : "HubSpot is configured but not connected yet."
            : "HubSpot is not configured yet."}
        </DialogDescription>
        <DialogFooter>
          {connected ? (
            <Button variant="destructive" onClick={onDisconnect}>
              Disconnect
            </Button>
          ) : (
            <Button onClick={onConnect} disabled={!configured}>
              Connect
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type SalesforceConnectionStatus = {
  configured: boolean;
  connected: boolean;
};

type ZohoDeskConnectionStatus = {
  configured: boolean;
  connected: boolean;
};

type SlackConnectionStatus = {
  configured: boolean;
  connected: boolean;
};

type CloverConnectionStatus = {
  configured: boolean;
  connected: boolean;
  oauthConfigured?: boolean;
  merchantId?: string;
  authType?: string;
};

type HubSpotConnectionStatus = {
  configured: boolean;
  connected: boolean;
};

const CloverConnectDialog = ({
  open,
  setOpen,
  entityId,
  oauthConfigured,
  connected,
  onConnect,
  onDisconnect,
  onConnected,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  entityId: string | null;
  oauthConfigured: boolean;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onConnected: () => void;
}) => {
  const setManualCredentials = useAction((api as any).private.clover.setManualCredentials);

  const [tab, setTab] = useState<"oauth" | "api_token">("oauth");
  const [merchantId, setMerchantId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(oauthConfigured ? "oauth" : "api_token");
    setMerchantId("");
    setApiToken("");
    setApiBaseUrl("");
    setIsSaving(false);
  }, [open, oauthConfigured]);

  const handleSaveManual = async () => {
    if (!entityId) {
      toast.error("Entity ID missing. Please re-login.");
      return;
    }

    try {
      setIsSaving(true);
      await setManualCredentials({
        entityId,
        merchantId,
        apiToken,
        apiBaseUrl: apiBaseUrl.trim() ? apiBaseUrl.trim() : undefined,
      });
      toast.success("Clover connected");
      setOpen(false);
      onConnected();
    } catch (error) {
      void error;
      toast.error("Failed to save Clover credentials");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clover</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {connected ? "Clover is connected for your organization." : "Connect Clover."}
        </DialogDescription>

        {connected ? (
          <DialogFooter>
            <Button variant="destructive" onClick={onDisconnect}>
              Disconnect
            </Button>
          </DialogFooter>
        ) : (
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="oauth">OAuth</TabsTrigger>
                <TabsTrigger value="api_token">API token</TabsTrigger>
              </TabsList>

              <TabsContent value="oauth" className="space-y-3">
                <div className="text-sm text-muted-foreground">Connect Clover using OAuth.</div>
                <DialogFooter>
                  <Button onClick={onConnect} disabled={!oauthConfigured}>
                    Connect with OAuth
                  </Button>
                </DialogFooter>
                {!oauthConfigured ? (
                  <div className="text-xs text-muted-foreground">
                    OAuth is not configured on this deployment.
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="api_token" className="space-y-3">
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label>Merchant ID</Label>
                    <Input
                      value={merchantId}
                      onChange={(e) => setMerchantId(e.target.value)}
                      placeholder="e.g. 3D19QN31ANYR5"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>API token</Label>
                    <Input
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                      placeholder="Paste Clover API token"
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>API base URL (optional)</Label>
                    <Input
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      placeholder="https://api.clover.com"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleSaveManual}
                    disabled={isSaving || !merchantId.trim() || !apiToken.trim()}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const IntegrationsView = () => {
  const [beyConnectOpen, setBeyConnectOpen] = useState(false);
  const [beyRemoveOpen, setBeyRemoveOpen] = useState(false);
  const [vapiConnectOpen, setVapiConnectOpen] = useState(false);
  // ...
  const [vapiRemoveOpen, setVapiRemoveOpen] = useState(false);
  const [salesforceRemoveOpen, setSalesforceRemoveOpen] = useState(false);
  const [salesforceConnectOpen, setSalesforceConnectOpen] = useState(false);
  const [salesforceWebhooksOpen, setSalesforceWebhooksOpen] = useState(false);
  const [zohoDeskRemoveOpen, setZohoDeskRemoveOpen] = useState(false);
  const [zohoDeskConnectOpen, setZohoDeskConnectOpen] = useState(false);
  const [slackRemoveOpen, setSlackRemoveOpen] = useState(false);
  const [slackConnectOpen, setSlackConnectOpen] = useState(false);
  const [cloverRemoveOpen, setCloverRemoveOpen] = useState(false);
  const [cloverConnectOpen, setCloverConnectOpen] = useState(false);
  const [hubspotRemoveOpen, setHubspotRemoveOpen] = useState(false);
  const [hubspotConnectOpen, setHubspotConnectOpen] = useState(false);

  // 🟢 Get BetterAuth user
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // 🟢 Get Convex user to map → orgId
  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);

  const entityId = currentConvexUser?.entityId ?? "";

  const beyPlugin = useQuery(
    api.private.plugins.getOne,
    entityId
      ? {
          service: "beyond_presence",
          entityId,
        }
      : "skip",
  );

  const vapiPlugin = useQuery(
    api.private.plugins.getOne,
    entityId
      ? {
          service: "vapi",
          entityId,
        }
      : "skip",
  );

  const getConnectionStatus = useAction((api as any).private.salesforce.getConnectionStatus);
  const [salesforceStatus, setSalesforceStatus] = useState<SalesforceConnectionStatus | null>(null);

  const getZohoDeskConnectionStatus = useAction(
    (api as any).private.zohoDesk.getConnectionStatus,
  );
  const [zohoDeskStatus, setZohoDeskStatus] = useState<ZohoDeskConnectionStatus | null>(null);

  const getSlackConnectionStatus = useAction(
    (api as any).private.slack.getConnectionStatus,
  );
  const [slackStatus, setSlackStatus] = useState<SlackConnectionStatus | null>(null);

  const getCloverConnectionStatus = useAction(
    (api as any).private.clover.getConnectionStatus,
  );
  const [cloverStatus, setCloverStatus] = useState<CloverConnectionStatus | null>(null);

  const getHubSpotConnectionStatus = useAction(
    (api as any).private.hubspot.getConnectionStatus,
  );
  const [hubspotStatus, setHubspotStatus] = useState<HubSpotConnectionStatus | null>(null);

  const refreshSalesforceConnectionStatus = useCallback(() => {
    if (!entityId) {
      setSalesforceStatus({ configured: false, connected: false });
      return;
    }

    let cancelled = false;
    void getConnectionStatus({ entityId })
      .then((s: any) => {
        if (cancelled) return;
        setSalesforceStatus({
          configured: Boolean(s?.configured),
          connected: Boolean(s?.connected),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSalesforceStatus({ configured: false, connected: false });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, getConnectionStatus]);

  const refreshZohoDeskConnectionStatus = useCallback(() => {
    if (!entityId) {
      setZohoDeskStatus({ configured: false, connected: false });
      return;
    }

    let cancelled = false;
    void getZohoDeskConnectionStatus({ entityId })
      .then((s: any) => {
        if (cancelled) return;
        setZohoDeskStatus({
          configured: Boolean(s?.configured),
          connected: Boolean(s?.connected),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setZohoDeskStatus({ configured: false, connected: false });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, getZohoDeskConnectionStatus]);

  const refreshSlackConnectionStatus = useCallback(() => {
    if (!entityId) {
      setSlackStatus({ configured: false, connected: false });
      return;
    }

    let cancelled = false;
    void getSlackConnectionStatus({ entityId })
      .then((s: any) => {
        if (cancelled) return;
        setSlackStatus({
          configured: Boolean(s?.configured),
          connected: Boolean(s?.connected),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSlackStatus({ configured: false, connected: false });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, getSlackConnectionStatus]);

  const refreshCloverConnectionStatus = useCallback(() => {
    if (!entityId) {
      setCloverStatus({ configured: false, connected: false });
      return;
    }

    let cancelled = false;
    void getCloverConnectionStatus({ entityId })
      .then((s: any) => {
        if (cancelled) return;
        setCloverStatus({
          configured: Boolean(s?.configured),
          connected: Boolean(s?.connected),
          oauthConfigured: Boolean(s?.oauthConfigured),
          merchantId: typeof s?.merchantId === "string" ? s.merchantId : undefined,
          authType: typeof s?.authType === "string" ? s.authType : undefined,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setCloverStatus({ configured: false, connected: false });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, getCloverConnectionStatus]);

  const refreshHubSpotConnectionStatus = useCallback(() => {
    if (!entityId) {
      setHubspotStatus({ configured: false, connected: false });
      return;
    }

    let cancelled = false;
    void getHubSpotConnectionStatus({ entityId })
      .then((s: any) => {
        if (cancelled) return;
        setHubspotStatus({
          configured: Boolean(s?.configured),
          connected: Boolean(s?.connected),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setHubspotStatus({ configured: false, connected: false });
      });

    return () => {
      cancelled = true;
    };
  }, [entityId, getHubSpotConnectionStatus]);

  useEffect(() => {
    const cleanup = refreshSalesforceConnectionStatus();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [refreshSalesforceConnectionStatus]);

  useEffect(() => {
    const cleanup = refreshZohoDeskConnectionStatus();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [refreshZohoDeskConnectionStatus]);

  useEffect(() => {
    const cleanup = refreshSlackConnectionStatus();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [refreshSlackConnectionStatus]);

  useEffect(() => {
    const cleanup = refreshCloverConnectionStatus();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [refreshCloverConnectionStatus]);

  useEffect(() => {
    const cleanup = refreshHubSpotConnectionStatus();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [refreshHubSpotConnectionStatus]);

  const salesforceConfigured = Boolean(salesforceStatus?.configured);
  const salesforceConnected = Boolean(salesforceStatus?.connected);

  const zohoDeskConfigured = Boolean(zohoDeskStatus?.configured);
  const zohoDeskConnected = Boolean(zohoDeskStatus?.connected);

  const slackConfigured = Boolean(slackStatus?.configured);
  const slackConnected = Boolean(slackStatus?.connected);

  const cloverConfigured = Boolean(cloverStatus?.configured);
  const cloverConnected = Boolean(cloverStatus?.connected);

  const hubspotConfigured = Boolean(hubspotStatus?.configured);
  const hubspotConnected = Boolean(hubspotStatus?.connected);

  return (
    <>
      <BeyPluginForm
        open={beyConnectOpen}
        setOpen={setBeyConnectOpen}
        entityId={entityId || null}
      />
      <BeyPluginRemoveForm
        open={beyRemoveOpen}
        setOpen={setBeyRemoveOpen}
        entityId={entityId || null}
      />

      <VapiPluginForm
        open={vapiConnectOpen}
        setOpen={setVapiConnectOpen}
        entityId={entityId || null}
      />
      <VapiPluginRemoveForm
        open={vapiRemoveOpen}
        setOpen={setVapiRemoveOpen}
        entityId={entityId || null}
      />
      <SalesforceDisconnectDialog
        open={salesforceRemoveOpen}
        setOpen={setSalesforceRemoveOpen}
        entityId={entityId || null}
        onDisconnected={refreshSalesforceConnectionStatus}
      />

      <ZohoDeskDisconnectDialog
        open={zohoDeskRemoveOpen}
        setOpen={setZohoDeskRemoveOpen}
        entityId={entityId || null}
        onDisconnected={refreshZohoDeskConnectionStatus}
      />

      <SlackDisconnectDialog
        open={slackRemoveOpen}
        setOpen={setSlackRemoveOpen}
        entityId={entityId || null}
        onDisconnected={refreshSlackConnectionStatus}
      />

      <CloverDisconnectDialog
        open={cloverRemoveOpen}
        setOpen={setCloverRemoveOpen}
        entityId={entityId || null}
        onDisconnected={refreshCloverConnectionStatus}
      />

      <HubSpotDisconnectDialog
        open={hubspotRemoveOpen}
        setOpen={setHubspotRemoveOpen}
        entityId={entityId || null}
        onDisconnected={refreshHubSpotConnectionStatus}
      />

      <SalesforceWebhooksDialog
        open={salesforceWebhooksOpen}
        setOpen={setSalesforceWebhooksOpen}
        entityId={entityId || null}
      />

      <SalesforceConnectDialog
        open={salesforceConnectOpen}
        setOpen={setSalesforceConnectOpen}
        configured={salesforceConfigured}
        connected={salesforceConnected}
        onConnect={() => {
          setSalesforceConnectOpen(false);
          const returnTo = "/integrations";
          const url = `/api/oauth/salesforce/authorize?returnTo=${encodeURIComponent(returnTo)}`;
          window.location.href = url;
        }}
        onDisconnect={() => {
          setSalesforceConnectOpen(false);
          setSalesforceRemoveOpen(true);
        }}
      />

      <ZohoDeskConnectDialog
        open={zohoDeskConnectOpen}
        setOpen={setZohoDeskConnectOpen}
        configured={zohoDeskConfigured}
        connected={zohoDeskConnected}
        onConnect={() => {
          setZohoDeskConnectOpen(false);
          const returnTo = "/integrations";
          const url = `/api/oauth/zoho-desk/authorize?returnTo=${encodeURIComponent(returnTo)}`;
          window.location.href = url;
        }}
        onDisconnect={() => {
          setZohoDeskConnectOpen(false);
          setZohoDeskRemoveOpen(true);
        }}
      />

      <SlackConnectDialog
        open={slackConnectOpen}
        setOpen={setSlackConnectOpen}
        configured={slackConfigured}
        connected={slackConnected}
        onConnect={() => {
          setSlackConnectOpen(false);
          const returnTo = "/integrations";
          const url = `/api/oauth/slack/authorize?returnTo=${encodeURIComponent(returnTo)}`;
          window.location.href = url;
        }}
        onDisconnect={() => {
          setSlackConnectOpen(false);
          setSlackRemoveOpen(true);
        }}
      />

      <CloverConnectDialog
        open={cloverConnectOpen}
        setOpen={setCloverConnectOpen}
        entityId={entityId || null}
        oauthConfigured={Boolean(cloverStatus?.oauthConfigured ?? cloverStatus?.configured)}
        connected={cloverConnected}
        onConnect={() => {
          setCloverConnectOpen(false);
          const returnTo = "/integrations";
          const url = `/api/oauth/clover/authorize?returnTo=${encodeURIComponent(returnTo)}`;
          window.location.href = url;
        }}
        onDisconnect={() => {
          setCloverConnectOpen(false);
          setCloverRemoveOpen(true);
        }}
        onConnected={refreshCloverConnectionStatus}
      />

      <HubSpotConnectDialog
        open={hubspotConnectOpen}
        setOpen={setHubspotConnectOpen}
        configured={hubspotConfigured}
        connected={hubspotConnected}
        onConnect={() => {
          setHubspotConnectOpen(false);
          const returnTo = "/integrations";
          const url = `/api/oauth/hubspot/authorize?returnTo=${encodeURIComponent(returnTo)}`;
          window.location.href = url;
        }}
        onDisconnect={() => {
          setHubspotConnectOpen(false);
          setHubspotRemoveOpen(true);
        }}
      />

      <div className="flex h-full flex-col bg-muted">
        <PageHeader
          title="Setup & Integrations"
          description="Choose the integration that's right for you"
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-3xl">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-lg">Connections</Label>
                <p className="text-muted-foreground text-sm">
                  Connect optional integrations like voice, AI avatar, and Salesforce.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ConnectionCard
                    title="AI Avatar"
                    logo="/avatar.svg"
                    isLinked={Boolean(beyPlugin)}
                    onClick={() => {
                      if (beyPlugin) {
                        setBeyRemoveOpen(true);
                      } else {
                        setBeyConnectOpen(true);
                      }
                    }}
                  />
                  <ConnectionCard
                    title="Voice Assistant"
                    logo="/vapi.png"
                    isLinked={Boolean(vapiPlugin)}
                    onClick={() => {
                      if (vapiPlugin) {
                        setVapiRemoveOpen(true);
                      } else {
                        setVapiConnectOpen(true);
                      }
                    }}
                  />
                  <ConnectionCard
                    title="Salesforce"
                    logo="/logos/salesforce.png"
                    isLinked={salesforceConnected}
                    onClick={() => {
                      setSalesforceConnectOpen(true);
                    }}
                  />
                  <ConnectionCard
                    title="Zoho Desk"
                    logo="/logos/zoho-crm.svg"
                    isLinked={zohoDeskConnected}
                    onClick={() => {
                      setZohoDeskConnectOpen(true);
                    }}
                  />
                  <ConnectionCard
                    title="Slack"
                    logo="/logos/slack.svg"
                    isLinked={slackConnected}
                    onClick={() => {
                      setSlackConnectOpen(true);
                    }}
                  />
                  <ConnectionCard
                    title="Clover"
                    logo="/logos/clover.svg"
                    isLinked={cloverConnected}
                    onClick={() => {
                      setCloverConnectOpen(true);
                    }}
                  />
                  <ConnectionCard
                    title="HubSpot"
                    logo="/logos/hubspot.svg"
                    isLinked={hubspotConnected}
                    onClick={() => {
                      setHubspotConnectOpen(true);
                    }}
                  />
                  <ConnectionCard
                    title="Webhooks"
                    logo="/logos/webhooks.svg"
                    isLinked={false}
                    onClick={() => {
                      setSalesforceWebhooksOpen(true);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
