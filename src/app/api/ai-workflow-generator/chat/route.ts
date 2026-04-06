import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  createSystemPrompt,
  getWorkflowContext,
} from "@/features/editor/actions/ai-generator-actions";
import { 
  applyWorkflowChanges,
  triggerAIWorkflowGeneration 
} from "@/features/editor/actions/workflow-mutations";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id as string;
    const { workflowId, message } = await request.json();

    if (!workflowId || !message) {
      return new Response("Missing required fields", { status: 400 });
    }

    // Verify workflow ownership
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      return new Response("Workflow not found", { status: 404 });
    }

    // Load chat history directly from workflow messages
    let messages: any[] = [];
    try {
      messages = await prisma.aIConversationMessage.findMany({
        where: { workflowId },
        orderBy: [
          { sequence: "asc" },
          { createdAt: "asc" },
        ],
      });
    } catch (err: any) {
      // If the table is missing (migration not applied), proceed without history
      if (err?.code === "P2021" || /does not exist/i.test(err?.message || "")) {
        console.warn("AIConversationMessage table missing; continuing without history");
        messages = [];
      } else {
        throw err;
      }
    }

    const fullHistory = messages.map((msg) => ({
      role: msg.role.toLowerCase() as "user" | "assistant",
      content: msg.content,
      timestamp: msg.createdAt,
      metadata: msg.metadata,
    }));
    const fullHistoryWithCurrent = [
      ...fullHistory,
      { role: "user" as const, content: message, timestamp: new Date() },
    ];

    // Get conversation metadata from workflow
    const conversationMeta = (workflow.conversationMetadata as any) || {};
    const detectedLanguage = conversationMeta.language;
    const isFirstMessage = messages.length === 0;
    
    console.log(`📊 Conversation Context: ID=${workflowId}, Messages=${messages.length}, Language=${detectedLanguage || 'detecting...'}, IsFirst=${isFirstMessage}`);

    // Get system prompt with all context
    const systemPrompt = await createSystemPrompt(workflowId, fullHistory);
    
    // Build metadata-driven language instruction with support for any language
    const commonLanguageMap: Record<string, string> = {
      en: 'English',
      hi: 'Hindi (हिन्दी)',
      ta: 'Tamil (தமிழ்)',
      te: 'Telugu (తెలుగు)',
      kn: 'Kannada (ಕನ್ನಡ)',
      es: 'Spanish (Español)',
      fr: 'French (Français)',
      de: 'German (Deutsch)',
      it: 'Italian (Italiano)',
      pt: 'Portuguese (Português)',
      ja: '日本語 (Japanese)',
      ko: '한국어 (Korean)',
      zh: '中文 (Chinese)',
      ar: 'العربية (Arabic)',
      ru: 'Русский (Russian)',
      bn: 'Bengali (বাংলা)',
      mr: 'Marathi (मराठी)',
      gu: 'Gujarati (ગુજરાતી)',
      ml: 'Malayalam (മലയാളം)',
      pa: 'Punjabi (ਪੰਜਾਬੀ)',
    };
    
    // Support any language - not just predefined ones
    const getLanguageName = (langCode: string | undefined) => {
      if (!langCode) return 'detecting...';
      return commonLanguageMap[langCode] || langCode.toUpperCase();
    };
    
    // Build message history with metadata for context
    const messageHistoryWithMetadata = fullHistory.length > 0 
      ? fullHistory.map((msg, idx) => ({
          messageNumber: idx + 1,
          role: msg.role,
          timestamp: msg.timestamp,
          hasMetadata: !!msg.metadata,
          metadata: msg.metadata || {},
        }))
      : [];

    const languageInstruction = `\n\n
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION METADATA CONTEXT:
${JSON.stringify({
  conversationId: workflowId,
  language: detectedLanguage || 'auto-detect',
  languageName: getLanguageName(detectedLanguage),
  totalMessages: messages.length,
  isFirstMessage,
  messageCount: conversationMeta.messageCount || 0,
  firstMessageAt: conversationMeta.firstMessageAt,
  lastMessageAt: conversationMeta.lastMessageAt,
}, null, 2)}

MESSAGE HISTORY METADATA:
${messageHistoryWithMetadata.length > 0 
  ? JSON.stringify(messageHistoryWithMetadata, null, 2)
  : 'No previous messages'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${isFirstMessage ? `🌐 FIRST MESSAGE - UNIVERSAL LANGUAGE DETECTION:
This is the first message in this conversation. You MUST:
1. Automatically detect the language of the user's message (ANY language you support)
2. Respond in that EXACT SAME language
3. Start your response with [LANGUAGE:XX] where XX is the ISO 639-1 language code

Supported: English (en), Hindi (hi), Tamil (ta), Telugu (te), Kannada (kn), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Japanese (ja), Korean (ko), Chinese (zh), Arabic (ar), Russian (ru), Bengali (bn), Marathi (mr), Gujarati (gu), Malayalam (ml), Punjabi (pa), and ANY other language you support.
` : `🌐 ESTABLISHED CONVERSATION LANGUAGE: ${commonLanguageMap[detectedLanguage] || detectedLanguage}

⚠️ CRITICAL: This entire conversation is in ${commonLanguageMap[detectedLanguage] || detectedLanguage}.
You MUST respond ONLY in ${getLanguageName(detectedLanguage)}.
Do NOT switch languages.
The user expects consistency in ${getLanguageName(detectedLanguage)}.
`}

If the user is asking you to CREATE, BUILD, GENERATE, or MODIFY a workflow, 
start your response with the special marker: [TRIGGER_WORKFLOW]

Examples that should include [TRIGGER_WORKFLOW]:
- "Create a workflow to send welcome emails"
- "Build an automation for lead scoring"
- "बनाएं एक वर्कफ़्लो स्वागत ईमेल भेजने के लिए" (Hindi)
- "ಹೊಸ ಬಳಕೆದಾರರಿಗೆ ಸ್ವಾಗತ ಇಮೇಲ್ ಕಳುಹಿಸಲು ವರ್ಕ್‌ಫ್ಲೋ ರಚಿಸಿ" (Kannada)
- "Crear flujo para notificaciones" (Spanish)
- Any request to create/build/add/modify workflow nodes

Examples that should NOT include [TRIGGER_WORKFLOW]:
- General questions: "What is a workflow?"
- Clarifications: "Can you explain how this works?"
- "Tell me about the workflow"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Convert history to Gemini format
    const chatHistory = fullHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));
    const conversationTranscript = fullHistoryWithCurrent
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

          // Start chat with history
          const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
            },
          });

          // Send progress update
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                progress: 10,
                step: "Analyzing your request...",
              })}\n\n`
            )
          );

          // Construct the prompt with metadata context - chat history is in startChat()
          const fullMessage = `${systemPrompt}${languageInstruction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 CURRENT USER MESSAGE:
${message}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

          // Stream the response
          const result = await chat.sendMessageStream(fullMessage);

          let fullResponse = "";
          let chunkCount = 0;

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullResponse += chunkText;
            chunkCount++;

            // Strip language marker and workflow trigger from display (keep in fullResponse for processing)
            const displayText = chunkText
              .replace(/\[LANGUAGE:\w+\]/g, '')
              .replace(/\[TRIGGER_WORKFLOW\]/g, '')
              .trim();
            
            // Only send non-empty content chunks
            if (displayText) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "content",
                    content: displayText,
                  })}\n\n`
                )
              );
            }

            // Send progress updates periodically
            if (chunkCount % 5 === 0) {
              const progress = Math.min(10 + chunkCount * 2, 90);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    progress,
                    step: "Generating workflow...",
                  })}\n\n`
                )
              );
            }
          }

          // Check if LLM indicated workflow creation is needed
          // LLM will add [TRIGGER_WORKFLOW] marker if user wants to create/modify workflow
          const isWorkflowCreation = fullResponse.includes('[TRIGGER_WORKFLOW]');
          
          console.log(`🔍 LLM workflow trigger check: isWorkflowCreation=${isWorkflowCreation}`);
          if (isWorkflowCreation) {
            // Trigger background job to actually create the workflow
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  progress: 95,
                  step: "Creating workflow nodes...",
                })}\n\n`
              )
            );

            try {
              // Trigger Inngest background job with the user's request
              await triggerAIWorkflowGeneration(
                workflowId,
                message,
                fullHistoryWithCurrent.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                }))
              );
              
              // Notify that creation is in progress
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "progress",
                    progress: 98,
                    step: "Workflow nodes will appear shortly...",
                  })}\n\n`
                )
              );
            } catch (error) {
              console.error("Failed to trigger background generation:", error);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "error",
                    error: "Failed to create workflow. Please try again.",
                  })}\n\n`
                )
              );
            }
          }

          // Send completion
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                fullResponse,
              })}\n\n`
            )
          );

          // Clean response and extract language metadata
          let responseLanguage = detectedLanguage;
          let cleanResponse = fullResponse.replace('[TRIGGER_WORKFLOW]', '').trim();
          
          if (isFirstMessage && cleanResponse.includes('[LANGUAGE:')) {
            const langMatch = cleanResponse.match(/\[LANGUAGE:(\w+)\]/);
            if (langMatch) {
              responseLanguage = langMatch[1].toLowerCase();
              cleanResponse = cleanResponse.replace(/\[LANGUAGE:\w+\]/, '').trim();
              
              const now = new Date();
              const newMetadata = {
                language: responseLanguage,
                firstMessageAt: now,
                lastMessageAt: now,
                messageCount: 2, // first user + assistant message
                languageDetectedAt: now,
              };
              
              // Store language in workflow metadata for future use
              await prisma.workflow.update({
                where: { id: workflowId },
                data: { conversationMetadata: newMetadata },
              });
              
              console.log(`🌐 Language detected and stored in metadata: ${responseLanguage}, Full metadata:`, newMetadata);
            }
          } else if (detectedLanguage) {
            // Build FULL conversation history for context (save everything)
            const conversationSummary = [
              ...fullHistory.map(msg => ({ // ALL messages, not just last 5
                role: msg.role,
                content: msg.content, // Full content, not just preview
                timestamp: msg.timestamp,
                metadata: msg.metadata,
              })),
              {
                role: 'user',
                content: message, // Full message
                timestamp: new Date(),
              },
              {
                role: 'assistant',
                content: cleanResponse, // Full response
                timestamp: new Date(),
              }
            ];

            // Update existing conversation metadata with FULL history
            const now = new Date();
            const updatedMetadata = {
              ...conversationMeta,
              language: detectedLanguage,
              lastMessageAt: now,
              messageCount: (conversationMeta.messageCount || 0) + 2,
              conversationHistory: conversationSummary, // Full conversation
              lastUserMessage: message, // Full message
              lastAssistantMessage: cleanResponse, // Full response
            };
            
            await prisma.workflow.update({
              where: { id: workflowId },
              data: { conversationMetadata: updatedMetadata },
            });
            
            console.log(`🔄 Conversation metadata updated with history: Messages=${updatedMetadata.messageCount}, Language=${detectedLanguage}`);
          }

          // Save messages with language metadata from workflow context
          try {
            const messageMetadata = responseLanguage ? {
              language: responseLanguage,
              conversationId: workflowId,
              timestamp: new Date().toISOString(),
            } : undefined; // Use undefined instead of null for Prisma Json fields
            
            // Save user message
            const userMessageData = await prisma.aIConversationMessage.create({
              data: {
                workflowId,
                role: "USER",
                content: message,
                metadata: messageMetadata,
              },
            });
            
            console.log(`💬 User message saved: ID=${userMessageData.id}, ConversationID=${workflowId}, Language=${responseLanguage || 'detecting'}`);
            
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Save assistant message
            const assistantMessageData = await prisma.aIConversationMessage.create({
              data: {
                workflowId,
                role: "ASSISTANT",
                content: cleanResponse,
                metadata: messageMetadata,
              },
            });
            
            console.log(`🤖 Assistant message saved: ID=${assistantMessageData.id}, Language=${responseLanguage || 'auto'}, TotalInConversation=${(conversationMeta.messageCount || 0) + 2}`);
          } catch (err: any) {
            if (err?.code === "P2021" || /does not exist/i.test(err?.message || "")) {
              console.warn("AIConversationMessage table missing; skipping message persistence");
            } else {
              throw err;
            }
          }

          // Ensure stream is properly closed
          try {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } catch (e) {
            console.warn('Controller already closed or error enqueueing final message');
          } finally {
            try {
              controller.close();
            } catch (e) {
              console.warn('Controller close error (likely already closed)');
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "error",
                  error:
                    error instanceof Error ? error.message : "An error occurred",
                })}\n\n`
              )
            );
          } catch (e) {
            console.warn('Failed to send error message, controller may be closed');
          } finally {
            try {
              controller.close();
            } catch (e) {
              console.warn('Controller close error in error handler');
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
