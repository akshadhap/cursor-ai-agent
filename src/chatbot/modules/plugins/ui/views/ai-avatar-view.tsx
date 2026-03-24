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

import { BotIcon, GlobeIcon } from "lucide-react";
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
import { BeyConnectedView } from "../components/bey-connected-view";

export const BeyPluginRemoveForm = ({
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
        service: "beyond_presence",
        entityId,
      });
      setOpen(false);
      toast.success("Beyond Presence disconnected");
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
          <DialogTitle>Disconnect AI Avatar</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Are you sure you want to disconnect your AI Avatar integration?
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

const beyFeatures: Feature[] = [
  {
    icon: BotIcon,
    label: "AI Avatar agents",
    description: "Use AI Avatar real-time agents",
  },
  {
    icon: GlobeIcon,
    label: "Widget integration",
    description: "Select an agent per chatbot",
  },
];

const formSchema = z.object({
  apiKey: z.string().min(1, { message: "API key is required" }),
  baseUrl: z.string().optional(),
});

export const BeyPluginForm = ({
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
      apiKey: "",
      baseUrl: "https://api.bey.dev",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!entityId) {
      toast.error("Organization not found. Please refresh and try again.");
      return;
    }

    try {
      await upsertSecret({
        service: "beyond_presence",
        value: {
          apiKey: values.apiKey,
          baseUrl: values.baseUrl || undefined,
        },
        entityId,
      });

      setOpen(false);
      toast.success("AI Avatar connected successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect AI Avatar. Please check your API key.");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable AI Avatar</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <DialogDescription>
            Connect your AI Avatar account by providing your API key.
          </DialogDescription>
        </div>
        <Form {...form}>
          <form
            className="flex flex-col gap-y-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <Label>API key</Label>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <Label>Base URL (optional)</Label>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}
            <DialogFooter>
              <Button disabled={form.formState.isSubmitting} type="submit">
                {form.formState.isSubmitting ? "Connecting..." : "Connect"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const AiAvatarView = () => {
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  const beyPlugin = useQuery(
    api.private.plugins.getOne,
    entityId
      ? {
          service: "beyond_presence",
          entityId,
        }
      : "skip",
  );

  const [connectOpen, setConnectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const handleSubmit = () => {
    if (beyPlugin) {
      setRemoveOpen(true);
    } else {
      setConnectOpen(true);
    }
  };

  return (
    <>
      <BeyPluginForm
        open={connectOpen}
        setOpen={setConnectOpen}
        entityId={entityId}
      />

      <BeyPluginRemoveForm
        open={removeOpen}
        setOpen={setRemoveOpen}
        entityId={entityId}
      />

      <div className="flex h-full flex-col bg-muted">
        <PageHeader
          title="AI Avatar"
          description="Manage AI Avatar agents"
        />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto w-full max-w-screen-md">
            <div className="space-y-6">
              {beyPlugin ? (
                <BeyConnectedView onDisconnect={handleSubmit} />
              ) : (
                <PluginCard
                  serviceImage="/avatar.svg"
                  serviceName="Beyond Presence"
                  features={beyFeatures}
                  isDisabled={beyPlugin === undefined}
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
