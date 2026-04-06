import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { NodeExecutor } from "@/features/executions/types";
import { geminiChannel } from "@/inngest/channels/gemini";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import type { Credential } from "@/generated/prisma";
Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type GeminiData = {
  variableName?: string;
  credentialId?: string;
  systemPrompt?: string;
  userPrompt?: string;
};

export const geminiExecutor: NodeExecutor<GeminiData> = async ({
  data,
  nodeId,
  userId,
  context,
  step,
  publish,
}) => {
  await publish(
    geminiChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  // ----------------------------
  // VALIDATION
  // ----------------------------
  if (!data.variableName) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Gemini node: Variable name is missing");
  }

  if (!data.credentialId) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Gemini node: Credential is required");
  }

  if (!data.userPrompt) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Gemini node: User prompt is missing");
  }

  // ----------------------------
  // BUILD PROMPTS WITH HANDLEBARS
  // ----------------------------
  const systemPrompt = data.systemPrompt
    ? Handlebars.compile(data.systemPrompt)(context)
    : "You are a helpful assistant.";

  const userPrompt = Handlebars.compile(data.userPrompt)(context);

  // ----------------------------
  // FETCH CREDENTIAL
  // ----------------------------
  const credential = await step.run("get-credential", () => {
    return prisma.credential.findUnique({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  }) as Credential | null;

  if (!credential) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Gemini node: Credential not found");
  }

  const apiKey = await decrypt(credential.value);
  const google = createGoogleGenerativeAI({
    apiKey: await decrypt(credential.value),
  });

  // ----------------------------
  // RUN GEMINI
  // ----------------------------
  try {
    const { steps } = await step.ai.wrap(
      "gemini-generate-text",
      generateText,
      {
        model: google("gemini-2.0-flash"),
        system: systemPrompt,
        prompt: userPrompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      },
    );

    // ----------------------------
    // EXTRACT RAW TEXT RESPONSE
    // ----------------------------
    let rawText = "";

    const firstStep = steps?.[0];
    if (firstStep?.content) {
      for (const part of firstStep.content) {
        if (part.type === "text") {
          rawText += part.text;
        }
      }
    }

    rawText = rawText.trim();

    // ----------------------------
    // CLEAN JSON: STRIP CODE FENCES IF PRESENT
    // ----------------------------
    let cleaned = rawText;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/, "")
        .trim();
    }

    // ----------------------------
    // TRY PARSE JSON
    // ----------------------------
    let value: any = { text: rawText };

    try {
      const parsed = JSON.parse(cleaned);

      if (parsed && typeof parsed === "object") {
        // Merge parsed JSON on top, keep .text for convenience
        value = {
          text: rawText,
          ...parsed,
        };
      }
    } catch {
      // Not valid JSON → just keep text + raw
      value = {
        text: rawText,
        raw: rawText,
      };
    }

    await publish(
      geminiChannel().status({
        nodeId,
        status: "success",
      }),
    );

    // ----------------------------
    // RETURN MERGED CONTEXT WITH STEPS FOR TOKEN TRACKING
    // ----------------------------
    return {
      ...context,
      [data.variableName]: value,
      steps, // Include steps for token extraction
    };
  } catch (error) {
    await publish(
      geminiChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
