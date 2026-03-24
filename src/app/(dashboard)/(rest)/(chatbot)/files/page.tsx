"use client";

import { FilesView } from "@/chatbot/modules/views/files-view";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "convex/react";
import { api } from "@/../convex/_generated/api";

const Page = () => {
  // BetterAuth session
  const { data: session } = authClient.useSession();
  const currentEmail = session?.user?.email ?? null;

  // Get entityId from Convex users table
  const users = useQuery(api.users.getMany);
  const currentConvexUser = users?.find((u: { email: string }) => u.email === currentEmail);
  const entityId = currentConvexUser?.entityId ?? null;

  if (!entityId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return <FilesView entityId={entityId} />;
};

export default Page;