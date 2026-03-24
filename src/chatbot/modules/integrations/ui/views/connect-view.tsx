"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { IntegrationId, INTEGRATIONS } from "../../constants";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { createScript } from "../../utils";

// ✅ BetterAuth
import { authClient } from "@/lib/auth-client";
// ✅ Convex users lookup
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { PageHeader } from "@/components/page-header";

export const ConnectView = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState("");
  const [selectedChatbotId, setSelectedChatbotId] = useState<string>("");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationId | null>(null);

  // 🟢 Get BetterAuth user
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // 🟢 Get Convex user to map → orgId
  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);

  const entityId = currentConvexUser?.entityId ?? "";

  // Get chatbots for dropdown
  const chatbots = usePaginatedQuery(
    api.private.chatbots.getMany,
    entityId ? { entityId } : "skip",
    { initialNumItems: 50 },
  );

  const defaultChatbot = useMemo(
    () => chatbots?.results?.find((c) => c.isDefault),
    [chatbots?.results],
  );

  useEffect(() => {
    if (selectedChatbotId) return;
    if (!defaultChatbot) return;
    setSelectedChatbotId(defaultChatbot._id);
  }, [defaultChatbot, selectedChatbotId]);

  const selectedChatbot = useMemo(
    () => chatbots?.results?.find((c) => c._id === selectedChatbotId),
    [chatbots?.results, selectedChatbotId],
  );

  const handleIntegrationClick = (integrationId: IntegrationId) => {
    if (!entityId) {
      toast.error("Entity ID not found");
      return;
    }

    if (!selectedChatbotId || !selectedChatbot) {
      toast.error("Please select a chatbot first");
      return;
    }

    // Use the string chatbotId field for embed snippets, fallback to _id
    const chatbotIdForEmbed = selectedChatbot.chatbotId || selectedChatbot._id;

    const snippet = createScript(integrationId, entityId, chatbotIdForEmbed);
    setSelectedSnippet(snippet);
    setSelectedIntegration(integrationId);
    setDialogOpen(true);
  };

  const handleCopyOrgId = async () => {
    try {
      await navigator.clipboard.writeText(entityId);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyChatbotId = async () => {
    try {
      // Use the string chatbotId field, not _id
      const chatbotId = (selectedChatbot?.chatbotId || selectedChatbot?._id) ?? "";
      await navigator.clipboard.writeText(chatbotId);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <>
      <ConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        snippet={selectedSnippet}
        integrationTitle={
          selectedIntegration
            ? INTEGRATIONS.find((i) => i.id === selectedIntegration)?.title
            : ""
        }
        chatbotName={selectedChatbot?.name}
      />

      <div className="flex h-full flex-col bg-muted">
        <PageHeader
          title="Connect"
          description="Generate an embed snippet to add your chatbot to your website"
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-3xl">
            <div className="space-y-6">
              {/* Entity ID */}
              <div className="flex items-center gap-4">
                <Label className="w-34" htmlFor="entity-id">
                  Entity ID
                </Label>

                <Input
                  disabled
                  id="entity-id"
                  readOnly
                  value={entityId}
                  className="flex-1 bg-background font-mono text-sm"
                />

                <Button className="gap-2" onClick={handleCopyOrgId} size="sm">
                  <CopyIcon className="size-4" />
                  Copy
                </Button>
              </div>

              <Separator className="my-8" />

              {/* Chatbot Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Label className="w-34" htmlFor="chatbot-select">
                    Chatbot <span className="text-destructive">*</span>
                  </Label>
                  <Select value={selectedChatbotId} onValueChange={setSelectedChatbotId}>
                    <SelectTrigger
                      id="chatbot-select"
                      className={`flex-1 ${!selectedChatbotId ? "border-destructive" : ""}`}
                    >
                      <SelectValue placeholder="Select a chatbot to get started" />
                    </SelectTrigger>
                    <SelectContent>
                      {chatbots?.results &&
                        chatbots.results.map((chatbot) => (
                          <SelectItem key={chatbot._id} value={chatbot._id}>
                            <div className="flex items-center gap-2">
                              <span>{chatbot.name}</span>
                              {chatbot.isDefault && (
                                <span className="text-primary text-xs font-medium bg-primary/10 px-2 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedChatbotId && (
                  <p className="text-destructive text-sm ml-[152px]">
                    Please select a chatbot to generate integration code
                  </p>
                )}

                {/* Show Chatbot ID when chatbot selected */}
                {selectedChatbotId && selectedChatbot && (
                  <div className="flex items-center gap-4">
                    <Label className="w-34" htmlFor="chatbot-id">
                      Chatbot ID
                    </Label>
                    <Input
                      disabled
                      id="chatbot-id"
                      readOnly
                      value={selectedChatbot.chatbotId || selectedChatbot._id}
                      className="flex-1 bg-background font-mono text-sm"
                    />
                    <Button className="gap-2" onClick={handleCopyChatbotId} size="sm">
                      <CopyIcon className="size-4" />
                      Copy
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <Label className="text-lg">Integrations</Label>
                  <p className="text-muted-foreground text-sm">
                    {selectedChatbotId
                      ? "Select a platform to get the integration code for your website"
                      : "Select a chatbot above to enable integrations"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {INTEGRATIONS.map((integration) => (
                    <button
                      key={integration.id}
                      onClick={() => handleIntegrationClick(integration.id)}
                      type="button"
                      disabled={!selectedChatbotId}
                      className={`flex items-center gap-4 rounded-lg border bg-background p-4 transition-all ${
                        selectedChatbotId
                          ? "hover:bg-accent hover:border-primary/50 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <Image
                        alt={integration.title}
                        height={32}
                        src={integration.icon}
                        width={32}
                      />
                      <p className="text-sm">{integration.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ConnectDialog = ({
  open,
  onOpenChange,
  snippet,
  integrationTitle,
  chatbotName,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  snippet: string;
  integrationTitle?: string;
  chatbotName?: string;
}) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="space-y-3 border-b px-6 py-5">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {integrationTitle ? `${integrationTitle} Integration` : "Website Integration"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground/80">
            {chatbotName && (
              <span className="block mb-2">
                Integrating chatbot: <span className="font-semibold text-foreground">{chatbotName}</span>
              </span>
            )}
            Add the chatbox to your website in two simple steps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          {/* Step 1 */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                <span className="font-semibold text-primary text-sm">1</span>
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="font-semibold text-base">Copy the code snippet</h3>
                <p className="text-muted-foreground text-sm">
                  Click the button below to copy the integration code to your clipboard
                </p>
              </div>
            </div>

            <div className="ml-[52px]">
              <div className="overflow-hidden rounded-lg border shadow-sm">
                <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-red-500/60" />
                    <div className="size-2.5 rounded-full bg-yellow-500/60" />
                    <div className="size-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <Button
                    className="gap-2 h-8 hover:bg-primary hover:text-primary-foreground"
                    onClick={handleCopy}
                    size="sm"
                    variant="ghost"
                  >
                    <CopyIcon className="size-3.5" />
                    <span className="text-xs font-medium">Copy</span>
                  </Button>
                </div>
                <div className="bg-card">
                  <pre className="max-h-80 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
                    {snippet}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                <span className="font-semibold text-primary text-sm">2</span>
              </div>
              <div className="space-y-1 pt-0.5">
                <h3 className="font-semibold text-base">Paste into your website</h3>
                <p className="text-muted-foreground text-sm">
                  Add the code to your HTML file to activate the chatbox
                </p>
              </div>
            </div>

            <div className="ml-[52px]">
              <div className="space-y-3 rounded-lg border bg-muted/30 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-primary/10 p-2">
                    <svg
                      className="size-4 text-primary"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm leading-relaxed">
                      Paste the snippet into your HTML file, ideally before the closing{" "}
                      <code className="rounded-md border bg-background px-2 py-0.5 font-mono text-xs font-medium">
                        &lt;/head&gt;
                      </code>{" "}
                      tag or at the end of the{" "}
                      <code className="rounded-md border bg-background px-2 py-0.5 font-mono text-xs font-medium">
                        &lt;body&gt;
                      </code>{" "}
                      section.
                    </p>
                    <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
                      <svg
                        className="size-4 shrink-0 text-primary"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-muted-foreground text-xs">
                        Your chatbox will go live immediately after deployment
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
