"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

import {
  GlobeIcon,
  PhoneCallIcon,
  PhoneIcon,
  WorkflowIcon,
} from "lucide-react";
import { type Feature, PluginCard } from "../components/plugin-card";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { PageHeader } from "@/components/page-header";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { VapiConnectedView } from "../components/vapi-connected-view";

/* ─────────────────────────────────────────────── */
/* REMOVE Voice agentFORM (NO UI CHANGES) */
/* ─────────────────────────────────────────────── */

export const VapiPluginRemoveForm = ({
  open,
  setOpen,
  entityId,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  entityId: string | null;
}) => {
  const removePlugin = useMutation(api.private.plugins.remove);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRemove = async () => {
    if (!entityId) {
      toast.error("Entity ID missing. Please re-login.");
      return;
    }

    try {
      setIsSubmitting(true);
      await removePlugin({
        service: "vapi",
        entityId,
      });
      setOpen(false);
      toast.success("Voice agent Plugin removed");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disconnect Voice agent</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to Disconnect Voice agent ?
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

/* ─────────────────────────────────────────────── */
/* CONNECT Voice agentFORM (NO UI CHANGES) */
/* ─────────────────────────────────────────────── */

const vapiFeatures: Feature[] = [
  {
    icon: GlobeIcon,
    label: "Web voice calls",
    description: "Voice chat directly in your app",
  },
  {
    icon: PhoneIcon,
    label: "Phone numbers",
    description: "Get dedicated business lines",
  },
  {
    icon: PhoneCallIcon,
    label: "Outbound calls",
    description: "Automated customer outreach",
  },
  {
    icon: WorkflowIcon,
    label: "workflows",
    description: "Custom conversation flows",
  },
];

const formSchema = z.object({
  publicApiKey: z.string().min(1, { message: "Public API key is required" }),
  privateApiKey: z.string().min(1, { message: "Private API key is required" }),
});

export const VapiPluginForm = ({
  open,
  setOpen,
  entityId,
}: {
  open: boolean;
  setOpen: (value: boolean) => void;
  entityId: string | null;
}) => {
  const upsertSecret = useAction(api.private.secrets.upsert);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      publicApiKey: "",
      privateApiKey: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!entityId) {
      toast.error("Organization not found. Please refresh and try again.");
      return;
    }

    try {
      await upsertSecret({
        service: "vapi",
        value: {
          publicApiKey: values.publicApiKey,
          privateApiKey: values.privateApiKey,
        },
        entityId,
      });
      setOpen(false);
      toast.success("Voice agentconnected successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect Vapi. Please check your API keys.");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable Vapi</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <DialogDescription>
            Connect to voice agent by providing your API keys.
          </DialogDescription>
        </div>
        <Form {...form}>
          <form
            className="flex flex-col gap-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="publicApiKey"
              render={({ field }) => (
                <FormItem>
                  <Label>Public API key</Label>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="privateApiKey"
              render={({ field }) => (
                <FormItem>
                  <Label>Private API key</Label>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                disabled={form.formState.isSubmitting}
                type="submit"
              >
                {form.formState.isSubmitting
                  ? "Connecting..."
                  : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

/* ─────────────────────────────────────────────── */
/* MAIN VIEW (NO LAYOUT CHANGES) */
/* ─────────────────────────────────────────────── */

export const VapiView = () => {
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find(
    (u) => u.email === currentEmail
  );
  const entityId = currentConvexUser?.entityId ?? null;

  const vapiPlugin = useQuery(
    api.private.plugins.getOne,
    entityId
      ? {
          service: "vapi",
          entityId,
        }
      : "skip"
  );

  const [connectOpen, setConnectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const handleSubmit = () => {
    if (vapiPlugin) {
      setRemoveOpen(true);
    } else {
      setConnectOpen(true);
    }
  };

  return (
    <>
      <VapiPluginForm
        open={connectOpen}
        setOpen={setConnectOpen}
        entityId={entityId}
      />

      <VapiPluginRemoveForm
        open={removeOpen}
        setOpen={setRemoveOpen}
        entityId={entityId}
      />

      <div className="flex h-full flex-col bg-muted">
        <PageHeader
          title="Voice agent Plugin"
          description="Connect Voice agent to enable AI voice calls and phone support"
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-screen-md">
            <div className="space-y-6">
              {vapiPlugin ? (
                <VapiConnectedView onDisconnect={handleSubmit} />
              ) : (
                <PluginCard
                  serviceImage="/vapi.png"
                  serviceName="Vapi"
                  features={vapiFeatures}
                  isDisabled={vapiPlugin === undefined}
                  onSubmit={handleSubmit}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
