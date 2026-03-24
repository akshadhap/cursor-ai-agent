import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { createOrGetAgent } from "@/features/standalone-agents/lib/agent-actions";
import { agentIdToType } from "@/features/standalone-agents/lib/agent-registry";

interface PageProps {
  params: Promise<{
    agentType: string;
  }>;
}

const Page = async ({ params }: PageProps) => {
  await requireAuth();
  const { agentType } = await params;

  // Convert agent ID to type and create or get the agent
  const type = agentIdToType(agentType);
  const agentId = await createOrGetAgent(type);

  // Redirect to the agent page
  if (agentId) {
    redirect(`/cognitive-agents/${agentId}`);
  }

  // If no agentId, redirect back to marketplace
  redirect("/cognitive-agents");
};

export default Page;
