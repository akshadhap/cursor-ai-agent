"use client";

import { NotificationsBell } from "@/components/notifications-bell";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { CopyIcon, CheckIcon } from "lucide-react";
import { useState } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader = ({
  title,
  description,
  children,
  className,
}: PageHeaderProps) => {
  const { data: session } = authClient.useSession();
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (session?.token) {
      navigator.clipboard.writeText(session.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {/* {session?.token && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5">
            <code className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">
              {session.token.substring(0, 20)}...
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleCopyToken}
              title="Copy full token"
            >
              {copied ? (
                <CheckIcon className="h-3 w-3 text-green-600" />
              ) : (
                <CopyIcon className="h-3 w-3" />
              )}
            </Button>
          </div>
        )} */}
        {children}
        <NotificationsBell />
      </div>
    </div>
  );
};
