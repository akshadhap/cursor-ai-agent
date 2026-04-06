import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { notFound } from "next/navigation";
import { EditorError, EditorLoading } from "@/features/editor/components/editor";
import { getStandaloneAgentEditor } from "@/features/standalone-agents/lib/get-standalone-agent-editor";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { HydrateClient } from "@/trpc/server";

interface PageProps {
  params: Promise<{
    agentId: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  const session = await requireAuth();
  const { agentId } = await params;

  const agent = await prisma.standaloneAgent.findFirst({
    where: {
      id: agentId,
      userId: session.user.id as string,
    },
  });

  if (!agent) {
    notFound();
  }

  const EditorComponent = getStandaloneAgentEditor(agent.type);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<EditorError />}>
        <Suspense fallback={<EditorLoading />}>
          <EditorComponent agentId={agent.id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
