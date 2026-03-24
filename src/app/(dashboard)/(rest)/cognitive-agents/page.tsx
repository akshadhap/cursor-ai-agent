import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { CognitiveAgentsClient } from "./cognitive-agents-client";

const Page = async () => {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Fetch all user's agents with their data
  const agents = await prisma.standaloneAgent.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      data: true,
    },
  });

  // Extract lead counts from agent data
  const leadCounts: Record<string, number> = {};
  
  for (const agent of agents) {
    const agentData = agent.data as any;
    const leads = agentData?.leads || [];
    leadCounts[agent.type] = Array.isArray(leads) ? leads.length : 0;
  }

  return <CognitiveAgentsClient leadCounts={leadCounts} />;
};

export default Page;
