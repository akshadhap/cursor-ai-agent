"use client";

import Image from "next/image";
import Link from "next/link";
import { BotIcon, SettingsIcon, UnplugIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { BeyAgentsTab } from "./bey-agents-tab";

interface BeyConnectedViewProps {
  onDisconnect: () => void;
}

export const BeyConnectedView = ({ onDisconnect }: BeyConnectedViewProps) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                alt="Beyond Presence"
                className="rounded-lg object-contain"
                height={48}
                width={48}
                src="/avatar.svg"
              />
              <div>
                <CardTitle>AI Avatar Integration</CardTitle>
                <CardDescription>Manage your AI Avatar agents</CardDescription>
              </div>
            </div>
            <Button onClick={onDisconnect} size="sm" variant="destructive">
              <UnplugIcon />
              Disconnect
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg border bg-muted">
                <SettingsIcon className="size-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Widget Configuration</CardTitle>
                <CardDescription>
                  Select an AI Avatar agent in customization
                </CardDescription>
              </div>
            </div>
            <Button asChild>
              <Link href="/customization">
                <SettingsIcon />
                Configure
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="overflow-hidden rounded-lg border bg-background">
        <Tabs
          className="gap-0"
          defaultValue="agents"
        >
          <TabsList className="grid h-12 w-full grid-cols-1 p-0">
            <TabsTrigger className="h-full rounded-none" value="agents">
              <BotIcon />
              Agents
            </TabsTrigger>
          </TabsList>
          <TabsContent value="agents">
            <BeyAgentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
