"use server";

import { generateSlug } from "random-word-slugs";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function createDeveloperInboundLeadToDealWorkflow(templateId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  // Special handling for inbound lead → deal template
  if (templateId === "inbound-lead-to-deal") {
    const workflow = await prisma.workflow.create({
      data: {
        name: "Inbound lead to deal " + generateSlug(2),
        userId,
         isDeveloper: true,
      },
    });

    //
    // 1) Default company config + followup config
    //
    const templateConfig = {
      companyName: "Your Company",
      companyDescription:
        "We help B2B teams automate follow-ups and close more deals with AI-powered workflows.",
      calendlyUrl: "https://calendly.com/your-company/demo",
      numberOfFollowups: 3,
      followups: [
        {
          daysOffset: 2,
          subjectTemplate: "Quick follow-up about {{lead.company}}",
          bodyTemplate: `
Hi {{lead.name}},

Just checking in on my last email about how {{templateConfig.companyName}} can help {{lead.company}}.

Best,  
{{templateConfig.companyName}}
          `.trim(),
        },
        {
          daysOffset: 5,
          subjectTemplate: "Still relevant for {{lead.company}}?",
          bodyTemplate: `
Hi {{lead.name}},

Wanted to quickly check whether it still makes sense to explore {{templateConfig.companyName}} for {{lead.company}}.

Best,  
{{templateConfig.companyName}}
          `.trim(),
        },
        {
          daysOffset: 10,
          subjectTemplate: "Last quick check-in",
          bodyTemplate: `
Hi {{lead.name}},

This will be my last check-in for now – happy to reconnect whenever timing is better.

Best,  
{{templateConfig.companyName}}
          `.trim(),
        },
      ],
    };

    //
    // 2) Google Form trigger node (entry point, stores templateConfig)
    //
    const googleFormNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.GOOGLE_FORM_TRIGGER,
        name: "Google Form Submission",
        position: { x: 0, y: 0 },
        data: {
          templateId,
          templateConfig,
        },
      },
    });

    //
    // 3) Gemini node – normalize lead, score, and generate ALL emails
    //
    const geminiNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.GEMINI,
        name: "Score lead & generate emails (Gemini)",
        position: { x: 320, y: 0 },
        data: {
          variableName: "leadAnalysis",
          credentialId: "", // user selects in UI
          systemPrompt:
            "You are a B2B sales assistant. You analyze inbound leads, score them, and write concise, high-conversion cold emails. Always respond with strict JSON only.",
          userPrompt: `
You are given raw Google Form responses from an inbound B2B lead:

RAW_RESPONSES:
{{json googleForm.responses}}

You are also given the company configuration, including follow-up templates and scheduling preferences:

TEMPLATE_CONFIG:
{{json templateConfig}}

The typical Google Form keys may look like (but can vary slightly):
- "Full Name"
- "Email Address"
- "Company Name"
- "Company Size"
- "Your Role / Job Title"
- "Estimated Monthly Budget"
- "How soon are you planning to start?"
- "How did you hear about us?"
- "Phone Number (Optional)"
- "What are you looking for / main use case?"

--------------------------------
1) Build a normalized lead object
--------------------------------

Create:

lead = {
  name: string,
  email: string,
  company: string | null,
  companySize: string | null,
  role: string | null,
  budget: string | null,
  timeline: string | null,
  heardFrom: string | null,
  phone: string | null,
  message: string | null
}

--------------------------------
2) Score the lead from 0–100
--------------------------------

Create:

- score: number (0–100)
- reason: short string

Consider budget, company size, role, and any timing hints when scoring.

--------------------------------
3) Generate the initial & follow-up emails
--------------------------------

Use:
- templateConfig.companyName
- templateConfig.companyDescription
- templateConfig.calendlyUrl
- templateConfig.followups[*].subjectTemplate and bodyTemplate as GUIDES for tone/style, but you must write full subjects and bodies yourself.

You must generate:
- emails.initial: { subject, body }
- emails.followup1..emails.followup5: each either { subject, body } or null.

Use templateConfig.numberOfFollowups to decide how many followups are non-null.
For followup k, use templateConfig.followups[k-1] as style inspiration
(e.g. similar tone, but not necessarily the exact same text).

The email bodies should:
- Mention the lead's name and company where possible.
- Reference templateConfig.companyName and optionally templateConfig.companyDescription.
- Optionally include templateConfig.calendlyUrl as a call-to-action link.

--------------------------------
4) Final JSON shape
--------------------------------

Return STRICT JSON:

{
  "lead": {
    "name": string,
    "email": string,
    "company": string | null,
    "companySize": string | null,
    "role": string | null,
    "budget": string | null,
    "timeline": string | null,
    "heardFrom": string | null,
    "phone": string | null,
    "message": string | null
  },
  "score": number,
  "reason": string,
  "emails": {
    "initial": {
      "subject": string,
      "body": string
    },
    "followup1": {
      "subject": string,
      "body": string
    } | null,
    "followup2": {
      "subject": string,
      "body": string
    } | null,
    "followup3": {
      "subject": string,
      "body": string
    } | null,
    "followup4": {
      "subject": string,
      "body": string
    } | null,
    "followup5": {
      "subject": string,
      "body": string
    } | null
  }
}

Rules:
- No backticks, no markdown, no code fences.
- Do not rename or add fields.
- Unknown values → null.
          `.trim(),
        },
      },
    });

    //
    // 4) First email (immediate)
    //
    const firstEmailNode = await prisma.node.create({
      data: {
        workflowId: workflow.id,
        type: NodeType.SENDGRID,
        name: "Send Initial Email",
        position: { x: 640, y: 0 },
        data: {
          variableName: "sentFirstEmail",
          to: "{{leadAnalysis.lead.email}}",
          subject: "{{leadAnalysis.emails.initial.subject}}",
          body: `
{{{leadAnalysis.emails.initial.body}}}
          `.trim(),
        },
      },
    });

    //
    // 5) Followup chains: Wait → SendGrid
    //
    
        const followups = templateConfig.followups.slice(
      0,
      templateConfig.numberOfFollowups,
    );

    let previousNode = firstEmailNode;

    for (let i = 0; i < followups.length; i++) {
      const follow = followups[i];
      const followKey = `followup${i + 1}`; // emails.followup1, emails.followup2, ...

      // Wait node for this followup
      const waitNode = await prisma.node.create({
        data: {
          workflowId: workflow.id,
          type: NodeType.WAIT,
          name: `Wait before followup #${i + 1}`,
          position: { x: 960, y: i * 160 },
          data: {
            delayDays: follow.daysOffset ?? 0,
            delayHours: 0,
            delayMinutes: 0,
            followupIndex: i, // 👈 NEW — used by template-config-button.tsx
          },
        },
      });

      // Followup email node – uses Gemini-generated subject/body
      const followEmailNode = await prisma.node.create({
        data: {
          workflowId: workflow.id,
          type: NodeType.SENDGRID,
          name: `Followup Email #${i + 1}`,
          position: { x: 1280, y: i * 160 },
          data: {
            variableName: `sentFollowup_${i + 1}`,
            to: "{{leadAnalysis.lead.email}}",
            subject: `{{leadAnalysis.emails.${followKey}.subject}}`,
            body: `
{{{leadAnalysis.emails.${followKey}.body}}}
            `.trim(),
            followupIndex: i, // 👈 NEW — so Config can update subject/body
          },
        },
      });

      // previous → wait → followup
      await prisma.connection.create({
        data: {
          workflowId: workflow.id,
          fromNodeId: previousNode.id,
          toNodeId: waitNode.id,
          fromOutput: "main",
          toInput: "main",
        },
      });

      await prisma.connection.create({
        data: {
          workflowId: workflow.id,
          fromNodeId: waitNode.id,
          toNodeId: followEmailNode.id,
          fromOutput: "main",
          toInput: "main",
        },
      });

      previousNode = followEmailNode;
    }


    //
    // 6) Wire initial chain: Google Form → Gemini → First Email
    //
    await prisma.connection.createMany({
      data: [
        {
          workflowId: workflow.id,
          fromNodeId: googleFormNode.id,
          toNodeId: geminiNode.id,
          fromOutput: "main",
          toInput: "main",
        },
        {
          workflowId: workflow.id,
          fromNodeId: geminiNode.id,
          toNodeId: firstEmailNode.id,
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
