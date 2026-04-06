"use server";

import { generateSlug } from "random-word-slugs";
import prisma from "@/lib/db";
import { NodeType, AgentType } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function createNonDeveloperInboundLeadToDealWorkflow(templateId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Special handling for inbound lead → deal template
  if (templateId === "inbound-lead-to-deal") {
    const workflow = await prisma.workflow.create({
      data: {
        name: "Inbound lead to deal " + generateSlug(2),
        userId,
        isDeveloper: false,
      },
    });

    //
    // 1) Default company config + followup config
    //
    const templateConfig = {
      companyName: "Non-Dev Company",
      companyDescription:
        "We help B2B teams automate follow-ups and close more deals with AI-powered workflows.",
      calendlyUrl: "https://calendly.com/your-company/demo",
      numberOfFollowups: 3,
      followups: [
        {
          daysOffset: 2,
          // ✅ No variables, generic non-dev subject
          subjectTemplate: "Quick follow-up on my earlier message",
          bodyTemplate: `

Just checking in on my previous email about how we can help your team automate follow-ups and close more deals.

If this is something you’re exploring, I’d be happy to share a short overview or set up a quick call.

          `.trim(),
        },
        {
          daysOffset: 5,
          // ✅ Still generic, friendly, no {{lead.company}}
          subjectTemplate: "Would improving your follow-ups still be relevant?",
          bodyTemplate: `
I wanted to quickly check whether it still makes sense to explore ways to improve your sales follow-ups and lead management.

If now isn’t the right time, no worries at all—just let me know and I’ll pause outreach.

          `.trim(),
        },
        {
          daysOffset: 10,
          // ✅ Simple “last check-in”, no variables
          subjectTemplate: "Last quick check-in from my side",
          bodyTemplate: `

This will be my last check-in for now. If improving your follow-up process becomes a priority later, you can always reply to this email and we can pick things up again.

Thanks for your time either way.

          `.trim(),
        },
      ],
    };

    //
    // 2) Manual trigger node (entry point, stores templateConfig)
    //
    const manualTriggerNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.MANUAL_TRIGGER,
        name: "Manual trigger",
        position: { x: 0, y: 0 },
        data: {
          templateId,
          templateConfig,
        },
      },
    });

    //
    // 3) Agent nodes – non-dev abstraction pipeline
    //
    const ingestionAgentNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.AGENT,
        agentType: AgentType.LEAD_INGESTION,
        name: "Ingestion Agent",
        position: { x: 260, y: 100 },
        data: {
          agentType: AgentType.LEAD_INGESTION,
          label: "Ingestion",
          description:
            "Collects leads from forms, CRMs, and webhooks into one place.",
        },
      },
    });

    const qualifierAgentNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.AGENT,
        agentType: AgentType.LEAD_QUALIFIER,
        name: "Qualifier Agent",
        position: { x: 560, y: 220 },
        data: {
          agentType: AgentType.LEAD_QUALIFIER,
          label: "Qualifier",
          description:
            "Scores and qualifies leads based on fit, intent, and past interactions.",
        },
      },
    });

    const prioritizerAgentNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.AGENT,
        agentType: AgentType.LEAD_PRIORITIZER,
        name: "Prioritizer Agent",
        position: { x: 860, y: 100 },
        data: {
          agentType: AgentType.LEAD_PRIORITIZER,
          label: "Prioritizer",
          description:
            "Ranks leads so sales teams know who to talk to first.",
        },
      },
    });

    const coldOutreachAgentNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.AGENT,
        agentType: AgentType.LEAD_COLD_OUTREACH,
        name: "Cold Outreach Agent",
        position: { x: 1160, y: 220 },
        data: {
          agentType: AgentType.LEAD_COLD_OUTREACH,
          label: "Cold Outreach",
          description:
            "Drafts and sends cold outreach emails based on your product and persona.",
        },
      },
    });

    const followupAgentNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.AGENT,
        agentType: AgentType.LEAD_FOLLOWUP,
        name: "Followup Agent",
        position: { x: 1460, y: 140 },
        data: {
          agentType: AgentType.LEAD_FOLLOWUP,
          label: "Followups",
          description:
            "Schedules and sends follow-up emails to keep leads warm automatically.",
        },
      },
    });

    //
    // 4) Wire the chain:
    // Manual trigger → Ingestion → Qualifier → Prioritizer → Cold Outreach → Followups
    //
    await prisma.connection.createMany({
      data: [
        {
          workflowId: workflow.id,
          fromNodeId: manualTriggerNode.id,
          toNodeId: ingestionAgentNode.id,
          fromOutput: "main",
          toInput: "main",
        },
        {
          workflowId: workflow.id,
          fromNodeId: ingestionAgentNode.id,
          toNodeId: qualifierAgentNode.id,
          fromOutput: "main",
          toInput: "main",
        },
        {
          workflowId: workflow.id,
          fromNodeId: qualifierAgentNode.id,
          toNodeId: prioritizerAgentNode.id,
          fromOutput: "main",
          toInput: "main",
        },
        {
          workflowId: workflow.id,
          fromNodeId: prioritizerAgentNode.id,
          toNodeId: coldOutreachAgentNode.id,
          fromOutput: "main",
          toInput: "main",
        },
        {
          workflowId: workflow.id,
          fromNodeId: coldOutreachAgentNode.id,
          toNodeId: followupAgentNode.id,
          fromOutput: "main",
          toInput: "main",
        },
      ],
    });

    return workflow.id;
  }

  // Fallback for other templates – default behaviour
  const workflow = await prisma.workflow.create({
    data: {
      name: generateSlug(3),
      userId,
      nodes: {
        create: {
          type: NodeType.INITIAL,
          position: { x: 0, y: 0 },
          name: NodeType.INITIAL,
        },
      },
    },
  });

  return workflow.id;
}
