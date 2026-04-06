import { inngest } from "./client";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Exclude AGENT from available node types
const AVAILABLE_NODE_TYPES = Object.values(NodeType).filter(
  (type) => type !== NodeType.AGENT
);

interface WorkflowNode {
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  credentialId?: string;
}

interface WorkflowConnection {
  fromNodeIndex: number;
  toNodeIndex: number;
  fromOutput?: string;
  toInput?: string;
}

interface GeneratedWorkflow {
  name?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  actionFile?: string;
  recommendations?: string[];
}

/**
 * Background job to generate workflow from AI code
 */
export const generateWorkflowFromAI = inngest.createFunction(
  { id: "ai-workflow-generator", name: "AI Workflow Generator" },
  { event: "workflow/ai-generate" },
  async ({ event, step }) => {
    const { workflowId, userPrompt, userId, conversationHistory } = event.data;

    console.log('🚀 Starting workflow generation for:', workflowId);

    // Send initial progress (outside step.run)
    await step.sendEvent('progress-10', {
      name: 'workflow/generation-progress',
      data: {
        workflowId,
        userId,
        progress: 10,
        step: 'Starting AI workflow generation...',
      },
    });

    // Send progress for generation
    await step.sendEvent('progress-20', {
      name: 'workflow/generation-progress',
      data: {
        workflowId,
        userId,
        progress: 20,
        step: 'Generating workflow structure with AI...',
      },
    });

    // Step 1: Generate workflow structure using Gemini
    const workflowStructure = await step.run(
      "generate-workflow-structure",
      async () => {
        // Load existing nodes for context
        const existingNodes = await prisma.node.findMany({
          where: { workflowId },
          select: { id: true, name: true, type: true, position: true, data: true },
        });

        // Determine if this is a fresh generation or adding to existing workflow
        // If user prompt suggests creating a new workflow (not adding/modifying), start fresh
        const isCreatingNew = 
          userPrompt.toLowerCase().includes('create') ||
          userPrompt.toLowerCase().includes('build') ||
          userPrompt.toLowerCase().includes('generate') ||
          userPrompt.toLowerCase().includes('make') ||
          userPrompt.includes('बनाएं') ||
          userPrompt.includes('बनाओ') ||
          userPrompt.includes('उருவाక்கவும்') ||
          userPrompt.includes('సృష్టించండి') ||
          userPrompt.includes('ರಚಿಸಿ') ||
          userPrompt.toLowerCase().includes('crear') ||
          userPrompt.toLowerCase().includes('construir') ||
          userPrompt.toLowerCase().includes('generar') ||
          userPrompt.toLowerCase().includes('créer') ||
          userPrompt.toLowerCase().includes('construire') ||
          userPrompt.toLowerCase().includes('générer') ||
          userPrompt.toLowerCase().includes('erstellen') ||
          userPrompt.toLowerCase().includes('bauen') ||
          userPrompt.toLowerCase().includes('generieren') ||
          userPrompt.includes('إنشاء') ||
          userPrompt.includes('بناء') ||
          userPrompt.includes('توليد');
        
        const isModifying = 
          userPrompt.toLowerCase().includes('add') ||
          userPrompt.toLowerCase().includes('modify') ||
          userPrompt.toLowerCase().includes('update') ||
          userPrompt.toLowerCase().includes('change') ||
          userPrompt.includes('जोड़ें') ||
          userPrompt.includes('சேர்க்கவும்') ||
          userPrompt.includes('జోడించండి') ||
          userPrompt.includes('ಸೇರಿಸಿ') ||
          userPrompt.toLowerCase().includes('agregar') ||
          userPrompt.toLowerCase().includes('añadir') ||
          userPrompt.toLowerCase().includes('modificar') ||
          userPrompt.toLowerCase().includes('ajouter') ||
          userPrompt.toLowerCase().includes('modifier') ||
          userPrompt.toLowerCase().includes('hinzufügen') ||
          userPrompt.toLowerCase().includes('ändern') ||
          userPrompt.includes('إضافة') ||
          userPrompt.includes('تعديل');

        let startX = 0;
        let existingContext = '';
        
        // Only keep existing nodes if explicitly modifying
        if (existingNodes.length > 0 && isModifying && !isCreatingNew) {
          // Calculate rightmost position for new nodes
          const rightmostX = Math.max(...existingNodes.map(n => (n.position as any)?.x ?? 0));
          startX = rightmostX + 320;
          
          existingContext = `\n\n## EXISTING WORKFLOW NODES\nThe workflow already has ${existingNodes.length} nodes. Position new nodes starting from x: ${startX} to avoid overlap.\n${existingNodes.map((n, i) => `${i + 1}. ${n.name} (${n.type}) at x: ${(n.position as any)?.x ?? 0}, y: ${(n.position as any)?.y ?? 0}${(n.data as any)?.variableName ? ` - outputs: ${(n.data as any).variableName}` : ''}`).join('\n')}\n\nIMPORTANT: Start your new nodes at x: ${startX} or higher. You can reference existing node variables in your new nodes.`;
        }

        const model = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
        });

        const prompt = `You are a workflow automation expert. Generate a complete workflow with proper variable tracking and smart positioning.

**IMPORTANT: DO NOT generate sticky notes. Only generate nodes, connections, recommendations, and action file.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌍 LANGUAGE RULE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use the conversation history to understand the user's preferred language.
Prefer the language of the CURRENT user request when deciding output language.
If the conversation mixes languages, follow the current request unless the user explicitly asks to keep a prior language.
If the current request is in English, use English for the workflow name and recommendations.
Generate workflow name and recommendations in the same language as the current user request.
Keep node names, variable names, prompts, email content, and action file code in English.

Examples:
• English conversation → name: "Lead Scoring Workflow", recommendations: ["Add error handling"]
• Hindi conversation → name: "लीड स्कोरिंग वर्कफ़्लो", recommendations: ["त्रुटि प्रबंधन जोड़ें"]
• Spanish conversation → name: "Flujo de puntuación de leads", recommendations: ["Agregar manejo de errores"]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## CONVERSATION ID: ${workflowId}

## USER REQUEST
${userPrompt}${existingContext}

## PREVIOUS CONVERSATION
${conversationHistory?.map((msg: { role: string; content: string }) => `${msg.role}: ${msg.content}`).join('\n') || 'None'}

## REQUIRED JSON OUTPUT
Return ONLY valid JSON with this EXACT structure:

{
  "name": "Workflow Name (can be in user's language: Hindi/Tamil/Telugu/Kannada/Spanish/French/German/Arabic/English)",
  "nodes": [
    {
      "type": "NODE_TYPE",
      "name": "Descriptive Node Name (ENGLISH ONLY)",
      "position": { "x": 0, "y": 0 },
      "data": {
        "variableName": "outputVariableName (ENGLISH ONLY)",
        // Node-specific configuration (ENGLISH ONLY)
      }
    }
  ],
  "connections": [
    {
      "fromNodeIndex": 0,
      "toNodeIndex": 1,
      "fromOutput": "main",
      "toInput": "main"
    }
  ],
  "recommendations": [
    "First contextual suggestion for what to do next (match user's language)",
    "Second contextual suggestion (match user's language)",
    "Third contextual suggestion (match user's language)"
  ],
  "actionFile": "Complete TypeScript server action code (ENGLISH ONLY)"
}

## CRITICAL RULES

**ABSOLUTELY DO NOT GENERATE:**
- ❌ NO sticky notes - do not include any stickyNotes or stickyNote fields
- ❌ NO comments or descriptions outside the JSON structure
- ❌ NO additional fields beyond: name, nodes, connections, recommendations, actionFile

### 0. LANGUAGE REQUIREMENT
**IMPORTANT: Only the workflow name can be in the user's language. Everything else MUST be English:**
- ✅ Workflow name: Can match user's language (Hindi: "स्वागत ईमेल वर्कफ़्लो", Tamil: "வரவேற்பு மின்னஞ்சல் பணிப்பாய்வு", Spanish: "Flujo de correo de bienvenida", French: "Flux d'e-mail de bienvenue", German: "Willkommens-E-Mail-Workflow", Arabic: "سير عمل البريد الترحيبي", etc.)
- ❌ Node names: English only (e.g., "Send Welcome Email", NOT "स्वागत ईमेल भेजें" or "Enviar correo de bienvenida")
- ❌ Variable names: English only (e.g., "userData", NOT "उपयोगकर्ताडेटा" or "datosUsuario")
- ❌ Prompts: English only
- ❌ Email subjects/bodies: English only
- ❌ Action file code: English only

### 1. AVAILABLE NODE TYPES (NO AGENT!)
${AVAILABLE_NODE_TYPES.join(", ")}

### 2. SMART POSITIONING
- Start trigger at x: 0, y: 0
- Space nodes horizontally by 320px (x: 0, 320, 640, 960, 1280...)
- For parallel branches, offset y by 200px per branch:
  * Main branch: y: 0
  * Branch 1: y: 200  
  * Branch 2: y: 400
- For loops/sequences, continue horizontally
- Keep related nodes close together

### 2.5 CONNECTIONS (CRITICAL)
- Every node (except the first trigger) MUST have at least one incoming connection.
- Connect nodes in the same order as the nodes array using fromNodeIndex/toNodeIndex.
- Use fromOutput "main" and toInput "main" unless a node requires a specific port.
- Avoid orphan nodes; if you add branches, ensure each branch is connected.

### 3. VARIABLE TRACKING (ENGLISH ONLY)
- Each node that produces output MUST have "variableName" in data
- Use descriptive ENGLISH variable names: "leadData", "emailAnalysis", "userScore"
- Reference previous variables: "{{variableName.property}}"
- Common patterns:
  * Triggers: formData, webhookPayload, stripeEvent
  * AI nodes: aiAnalysis, generatedContent, leadScore
  * Wait nodes: waitResult
  * Email nodes: emailSent

### 4. NODE DATA STRUCTURES (ALL TEXT IN ENGLISH)

**TRIGGER NODES (GOOGLE_FORM_TRIGGER, WEBHOOK_TRIGGER, STRIPE_TRIGGER):**
{
  "variableName": "triggerData", // English only
  "webhookPath": "/webhook/path"
}

**AI NODES (GEMINI, OPENAI, ANTHROPIC):**
{
  "variableName": "aiOutput", // English only
  "credentialId": "",
  "systemPrompt": "Clear instructions for AI", // English only
  "userPrompt": "Process {{previousVariable.field}} and return JSON: {...}" // English only
}

**EMAIL NODES (SENDGRID, SMTP2GO):**
{
  "variableName": "emailResult", // English only
  "to": "{{triggerData.email}}",
  "subject": "Your Subject", // English only
  "body": "Email body with {{variables}}" // English only
}

**MESSAGING NODES (SLACK, DISCORD):**
{
  "variableName": "messageResult",
  "channel": "#general",
  "message": "Notification: {{details}}"
}

**WAIT NODES:**
{
  "variableName": "waitComplete",
  "delayDays": 0,
  "delayHours": 0,
  "delayMinutes": 5
}

### 5. RECOMMENDATIONS (MATCH USER'S LANGUAGE)
- Generate 3-5 contextual suggestions for what user might want to do next
- Suggestions should be in the SAME LANGUAGE as the user's request
- Be specific to the workflow just created
- Examples by language:

  **English:**
  - "Add error handling for failed requests"
  - "Add retry logic with exponential backoff"
  - "Add Slack notification when workflow completes"
  - "Add email notification on errors"
  - "Add data validation step"
  - "Add logging for debugging"
  - "Add conditional branching based on response"

  **Hindi (हिंदी):**
  - "विफल अनुरोधों के लिए त्रुटि प्रबंधन जोड़ें"
  - "पुनः प्रयास तर्क जोड़ें"
  - "वर्कफ़्लो पूर्ण होने पर Slack सूचना जोड़ें"
  - "त्रुटियों पर ईमेल सूचना जोड़ें"
  - "डेटा सत्यापन चरण जोड़ें"

  **Tamil (தமிழ்):**
  - "தோல்வியுற்ற கோரிக்கைகளுக்கு பிழை கையாளுதலைச் சேர்க்கவும்"
  - "மீண்டும் முயற்சி தர்க்கத்தைச் சேர்க்கவும்"
  - "பணிப்பாய்வு முடிந்ததும் Slack அறிவிப்பைச் சேர்க்கவும்"
  - "பிழைகளில் மின்னஞ்சல் அறிவிப்பைச் சேர்க்கவும்"
  - "தரவு சரிபார்ப்பு படியைச் சேர்க்கவும்"

  **Telugu (తెలుగు):**
  - "విఫలమైన అభ్యర్థనల కోసం ఎర్రర్ హ్యాండ్లింగ్ జోడించండి"
  - "రీట్రై లాజిక్ జోడించండి"
  - "వర్క్‌ఫ్లో పూర్తయినప్పుడు Slack నోటిఫికేషన్ జోడించండి"
  - "ఎర్రర్లపై ఇమెయిల్ నోటిఫికేషన్ జోడించండి"
  - "డేటా వ్యాలిడేషన్ స్టెప్ జోడించండి"

  **Kannada (ಕನ್ನಡ):**
  - "ವಿಫಲವಾದ ವಿನಂತಿಗಳಿಗೆ ದೋಷ ನಿರ್ವಹಣೆಯನ್ನು ಸೇರಿಸಿ"
  - "ಮರುಪ್ರಯತ್ನ ತರ್ಕವನ್ನು ಸೇರಿಸಿ"
  - "ವರ್ಕ್‌ಫ್ಲೋ ಪೂರ್ಣಗೊಂಡಾಗ Slack ಅಧಿಸೂಚನೆಯನ್ನು ಸೇರಿಸಿ"
  - "ದೋಷಗಳ ಮೇಲೆ ಇಮೇಲ್ ಅಧಿಸೂಚನೆಯನ್ನು ಸೇರಿಸಿ"
  - "ಡೇಟಾ ಮೌಲ್ಯೀಕರಣ ಹಂತವನ್ನು ಸೇರಿಸಿ"

  **Spanish (Español):**
  - "Agregar manejo de errores para solicitudes fallidas"
  - "Agregar lógica de reintento con retroceso exponencial"
  - "Agregar notificación de Slack cuando se complete el flujo"
  - "Agregar notificación por correo electrónico en errores"
  - "Agregar paso de validación de datos"
  - "Agregar registro para depuración"
  - "Agregar ramificación condicional según la respuesta"

  **French (Français):**
  - "Ajouter la gestion des erreurs pour les requêtes échouées"
  - "Ajouter une logique de nouvelle tentative avec backoff exponentiel"
  - "Ajouter une notification Slack lorsque le flux est terminé"
  - "Ajouter une notification par e-mail en cas d'erreur"
  - "Ajouter une étape de validation des données"
  - "Ajouter la journalisation pour le débogage"
  - "Ajouter un branchement conditionnel basé sur la réponse"

  **German (Deutsch):**
  - "Fehlerbehandlung für fehlgeschlagene Anfragen hinzufügen"
  - "Wiederholungslogik mit exponentiellem Backoff hinzufügen"
  - "Slack-Benachrichtigung hinzufügen, wenn Workflow abgeschlossen ist"
  - "E-Mail-Benachrichtigung bei Fehlern hinzufügen"
  - "Datenvalidierungsschritt hinzufügen"
  - "Protokollierung zum Debuggen hinzufügen"
  - "Bedingte Verzweigung basierend auf Antwort hinzufügen"

  **Arabic (العربية):**
  - "إضافة معالجة الأخطاء للطلبات الفاشلة"
  - "إضافة منطق إعادة المحاولة مع التراجع الأسي"
  - "إضافة إشعار Slack عند اكتمال سير العمل"
  - "إضافة إشعار بريد إلكتروني عند الأخطاء"
  - "إضافة خطوة التحقق من صحة البيانات"
  - "إضافة التسجيل لتصحيح الأخطاء"
  - "إضافة التفرع الشرطي بناءً على الاستجابة"

### 6. ACTION FILE (ENGLISH ONLY)
Generate complete TypeScript using this template with ENGLISH names and comments:

\`\`\`typescript
"use server";

import { generateSlug } from "random-word-slugs";
import prisma from "@/lib/db";
import { NodeType } from "@/generated/prisma";
import { requireAuth } from "@/lib/auth-utils";

export async function createDeveloper{CamelCaseName}Workflow(templateId: string) {
  const session = await requireAuth();
  const userId = session.user.id as string;

  const workflow = await prisma.workflow.create({
    data: {
      name: "{Workflow Name} " + generateSlug(2),
      userId,
      isDeveloper: true,
    },
  });

  // Create each node with exact positions
  const node1 = await prisma.node.create({
    data: {
      workflowId: workflow.id,
      type: NodeType.{NODE_TYPE},
      name: "{Node Name}",
      position: { x: 0, y: 0 },
      data: {
        // node configuration
      },
    },
  });

  // ... more nodes ...

  // Create connections
  await prisma.connection.create({
    data: {
      workflowId: workflow.id,
      fromNodeId: node1.id,
      toNodeId: node2.id,
      fromOutput: "main",
      toInput: "main",
    },
  });

  return workflow.id;
}
\`\`\`

### 7. OUTPUT FORMAT - CRITICAL JSON REQUIREMENTS
- Return ONLY the JSON object
- NO markdown code blocks (\`\`\`json)
- NO explanatory text before/after
- NO asterisks, bold, or formatting
- Just pure, valid JSON
- ALWAYS close ALL strings with matching quotes
- ALWAYS close ALL objects with matching braces
- Use double quotes for all strings
- Escape quotes inside strings: \\"
- Use simple strings - avoid complex text that needs escaping
- Keep all text content simple and clean
- Test your JSON is valid before returning it
- COMPLETE the entire JSON structure - do not truncate

## EXAMPLE OUTPUT
${JSON.stringify({
  name: "Welcome Email Workflow",
  nodes: [
    {
      type: "WEBHOOK_TRIGGER",
      name: "New User Signup",
      position: { x: 0, y: 0 },
      data: { variableName: "newUser", webhookPath: "/webhook/signup" }
    },
    {
      type: "SENDGRID",
      name: "Send Welcome Email",
      position: { x: 320, y: 0 },
      data: {
        variableName: "welcomeEmailSent",
        to: "{{newUser.email}}",
        subject: "Welcome to our platform!",
        body: "Hi {{newUser.name}}, welcome aboard!"
      }
    }
  ],
  connections: [
    { fromNodeIndex: 0, toNodeIndex: 1, fromOutput: "main", toInput: "main" }
  ],
  recommendations: [
    "Add error handling",
    "Add Slack notification for team",
    "Add delay before sending email"
  ]
}, null, 2)}

Now generate for: ${userPrompt}

Return ONLY the JSON:`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        console.log('🤖 Raw AI response:', response.substring(0, 500));

        // Extract JSON from response - try to find the cleanest JSON block
        let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          // Found JSON in code block
          const jsonStr = jsonMatch[1].trim();
          try {
            return JSON.parse(jsonStr) as GeneratedWorkflow;
          } catch (err) {
            console.error('❌ Failed to parse JSON from code block:', err);
            console.error('Raw JSON:', jsonStr.substring(0, 1000));
          }
        }

        // Try to extract raw JSON object - find the first complete { } pair
        const firstBrace = response.indexOf('{');
        if (firstBrace === -1) {
          console.error('❌ No JSON found in response:', response);
          throw new Error("Failed to extract JSON from AI response");
        }

        // Find matching closing brace
        let braceCount = 0;
        let lastBrace = -1;
        for (let i = firstBrace; i < response.length; i++) {
          if (response[i] === '{') braceCount++;
          if (response[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              lastBrace = i;
              break;
            }
          }
        }

        if (lastBrace === -1) {
          console.error('❌ Incomplete JSON in response - no matching closing brace');
          throw new Error("Incomplete JSON response from AI");
        }

        let jsonStr = response.substring(firstBrace, lastBrace + 1);
        
        // Clean up common escape issues
        try {
          return JSON.parse(jsonStr) as GeneratedWorkflow;
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.error('Problematic JSON:', jsonStr.substring(0, 1000));
          
          // Try to fix common issues
          // Remove any trailing commas before closing braces/brackets
          jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
          
          // Fix improperly escaped quotes in strings
          jsonStr = jsonStr.replace(/([^\\])"([^",:}\]]*)"([^,:}\]]*)/g, '$1\\"$2\\"$3');
          
          try {
            return JSON.parse(jsonStr) as GeneratedWorkflow;
          } catch (secondError) {
            console.error('❌ Still failed after cleanup:', secondError);
            throw new Error(`JSON parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Check console for details.`);
          }
        }
      }
    );

    console.log('📝 Generated structure:', JSON.stringify(workflowStructure, null, 2));
    console.log('💡 Recommendations from LLM:', workflowStructure.recommendations);

    // Send progress before validation
    await step.sendEvent('progress-40', {
      name: 'workflow/generation-progress',
      data: {
        workflowId,
        userId,
        progress: 40,
        step: 'Validating workflow structure...',
      },
    });

    // Step 2: Validate workflow structure
    const validatedWorkflow = await step.run(
      "validate-workflow",
      async (): Promise<GeneratedWorkflow> => {
        if (!workflowStructure.nodes || workflowStructure.nodes.length === 0) {
          throw new Error("Workflow must have at least one node");
        }

        // Validate node types
        for (const node of workflowStructure.nodes) {
          if (!Object.values(NodeType).includes(node.type)) {
            throw new Error(`Invalid node type: ${node.type}`);
          }
        }

        const normalizedConnections =
          workflowStructure.connections?.map((conn) => ({
            fromNodeIndex: conn.fromNodeIndex,
            toNodeIndex: conn.toNodeIndex,
            fromOutput: conn.fromOutput || "main",
            toInput: conn.toInput || "main",
          })) ?? [];

        if (normalizedConnections.length === 0 && workflowStructure.nodes.length > 1) {
          const sequentialConnections = [];
          for (let i = 0; i < workflowStructure.nodes.length - 1; i++) {
            sequentialConnections.push({
              fromNodeIndex: i,
              toNodeIndex: i + 1,
              fromOutput: "main",
              toInput: "main",
            });
          }
          return { ...workflowStructure, connections: sequentialConnections };
        }

        return { ...workflowStructure, connections: normalizedConnections };
      }
    );

    console.log('✅ Validated workflow:', validatedWorkflow.name);

    // Send progress before creating nodes
    await step.sendEvent('progress-60', {
      name: 'workflow/generation-progress',
      data: {
        workflowId,
        userId,
        progress: 60,
        step: `Creating ${validatedWorkflow.nodes.length} nodes...`,
      },
    });

    // Step 3: Delete existing nodes if creating fresh (not modifying)
    await step.run("cleanup-existing-nodes", async () => {
      const existingNodes = await prisma.node.findMany({
        where: { workflowId },
        select: { id: true },
      });

      if (existingNodes.length > 0) {
        // Check if user wants to modify or create fresh
        const isModifying = 
          userPrompt.toLowerCase().includes('add') ||
          userPrompt.toLowerCase().includes('modify') ||
          userPrompt.toLowerCase().includes('update') ||
          userPrompt.toLowerCase().includes('change') ||
          userPrompt.includes('जोड़ें') ||
          userPrompt.includes('சேர்க்கவும்') ||
          userPrompt.includes('జోడించండి') ||
          userPrompt.includes('ಸೇರಿಸಿ') ||
          userPrompt.toLowerCase().includes('agregar') ||
          userPrompt.toLowerCase().includes('añadir') ||
          userPrompt.toLowerCase().includes('modificar') ||
          userPrompt.toLowerCase().includes('ajouter') ||
          userPrompt.toLowerCase().includes('modifier') ||
          userPrompt.toLowerCase().includes('hinzufügen') ||
          userPrompt.toLowerCase().includes('ändern') ||
          userPrompt.includes('إضافة') ||
          userPrompt.includes('تعديل');
        
        const isCreatingNew = 
          userPrompt.toLowerCase().includes('create') ||
          userPrompt.toLowerCase().includes('build') ||
          userPrompt.toLowerCase().includes('generate') ||
          userPrompt.toLowerCase().includes('make') ||
          userPrompt.includes('बनाएं') ||
          userPrompt.includes('बनाओ') ||
          userPrompt.includes('உருவாக்கவும்') ||
          userPrompt.includes('సృష్టించండి') ||
          userPrompt.includes('ರಚಿಸಿ') ||
          userPrompt.toLowerCase().includes('crear') ||
          userPrompt.toLowerCase().includes('construir') ||
          userPrompt.toLowerCase().includes('generar') ||
          userPrompt.toLowerCase().includes('créer') ||
          userPrompt.toLowerCase().includes('construire') ||
          userPrompt.toLowerCase().includes('générer') ||
          userPrompt.toLowerCase().includes('erstellen') ||
          userPrompt.toLowerCase().includes('bauen') ||
          userPrompt.toLowerCase().includes('generieren') ||
          userPrompt.includes('إنشاء') ||
          userPrompt.includes('بناء') ||
          userPrompt.includes('توليد');

        // Delete existing nodes if creating new (not modifying)
        if (isCreatingNew && !isModifying) {
          // Delete connections first (foreign key constraint)
          await prisma.connection.deleteMany({
            where: { workflowId },
          });
          
          // Delete nodes
          await prisma.node.deleteMany({
            where: { workflowId },
          });
          
          console.log(`🗑️ Deleted ${existingNodes.length} existing nodes (creating fresh workflow)`);
        } else {
          console.log(`✅ Keeping ${existingNodes.length} existing nodes (modifying workflow)`);
        }
      }
    });

    // Step 4: Create nodes in database
    const createdNodes = await step.run("create-nodes", async () => {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow || workflow.userId !== userId) {
        throw new Error("Workflow not found or unauthorized");
      }

      const nodes = await Promise.all(
        validatedWorkflow.nodes.map((node) =>
          prisma.node.create({
            data: {
              workflowId,
              type: node.type,
              name: node.name,
              position: node.position,
              data: node.data || {},
              credentialId: node.credentialId,
            },
          })
        )
      );

      return nodes;
    });

    console.log(`✅ Created ${createdNodes.length} nodes`);

    // Send progress before creating connections
    await step.sendEvent('progress-80', {
      name: 'workflow/generation-progress',
      data: {
        workflowId,
        userId,
        progress: 80,
        step: 'Connecting nodes...',
      },
    });

    // Step 5: Create connections
    const createdConnections = await step.run(
      "create-connections",
      async () => {
        if (!validatedWorkflow.connections || validatedWorkflow.connections.length === 0) {
          return [];
        }

        // Validate all connections have valid node indices
        const validConnections = validatedWorkflow.connections.filter((conn) => {
          const fromNode = createdNodes[conn.fromNodeIndex];
          const toNode = createdNodes[conn.toNodeIndex];
          
          if (!fromNode || !toNode) {
            console.warn(
              `⚠️ Skipping invalid connection: fromIndex ${conn.fromNodeIndex} -> toIndex ${conn.toNodeIndex} (total nodes: ${createdNodes.length})`
            );
            return false;
          }
          
          return true;
        });

        if (validConnections.length === 0) {
          console.warn('⚠️ No valid connections to create');
          return [];
        }

        const connections = await Promise.all(
          validConnections.map((conn) =>
            prisma.connection.create({
              data: {
                workflowId,
                fromNodeId: createdNodes[conn.fromNodeIndex].id,
                toNodeId: createdNodes[conn.toNodeIndex].id,
                fromOutput: conn.fromOutput || "main",
                toInput: conn.toInput || "main",
              },
            })
          )
        );

        return connections;
      }
    );

    // Step 6: Update workflow name, save action file, return recommendations
    const recommendations = await step.run("update-workflow-metadata", async () => {
      // Get recommendations first
      const finalRecommendations = validatedWorkflow.recommendations || [];
      console.log('✅ Recommendations to return:', finalRecommendations);
      
      // Update workflow name if provided
      if (validatedWorkflow.name) {
        await prisma.workflow.update({
          where: { id: workflowId },
          data: { name: validatedWorkflow.name },
        });
      }

      // Save action file metadata if provided
      if (validatedWorkflow.actionFile) {
        const currentWorkflow = await prisma.workflow.findUnique({
          where: { id: workflowId },
          select: { stickyNotes: true },
        });

        const existingNotes = Array.isArray(currentWorkflow?.stickyNotes)
          ? (currentWorkflow.stickyNotes as any[])
          : [];

        // Keep existing notes but replace action file metadata
        const updatedNotes = [
          ...existingNotes.filter((n: any) => !n.__actionFile),
          {
            __actionFile: validatedWorkflow.actionFile,
            __actionFileGeneratedAt: new Date().toISOString(),
            __lastNodesCreated: createdNodes.length,
            __lastConnectionsCreated: createdConnections.length,
            __recommendations: finalRecommendations,
          },
        ];

        await prisma.workflow.update({
          where: { id: workflowId },
          data: {
            stickyNotes: updatedNotes,
          },
        });
      }

      // Return recommendations for UI
      return finalRecommendations;
    });

    console.log('📡 Sending recommendations in workflow-update event:', recommendations);

    // Send workflow-update event for real-time canvas refresh
    await step.sendEvent('workflow-update', {
      name: 'workflow/generation-progress',
      data: {
        workflowId,
        userId,
        type: 'workflow-update',
        newNodes: createdNodes.length,
        newConnections: createdConnections.length,
        nodeCount: createdNodes.length,
        connectionCount: createdConnections.length,
        progress: 100,
        recommendations: recommendations,
      },
    });

    // Send completion progress (outside step.run)
    await step.sendEvent('progress-100', {
      name: 'workflow/generation-progress',
      data: {
        workflowId,
        userId,
        progress: 100,
        step: 'Workflow generated successfully!',
        completed: true,
      },
    });

    // Send final completion event
    await step.sendEvent('completion', {
      name: 'workflow/generation-complete',
      data: {
        workflowId,
        userId,
        nodeCount: createdNodes.length,
        connectionCount: createdConnections.length,
      },
    });

    // CRITICAL: Final return to end function execution
    const result = {
      success: true,
      workflowId,
      nodesCreated: createdNodes.length,
      connectionsCreated: createdConnections.length,
      hasActionFile: !!validatedWorkflow.actionFile,
      recommendations: recommendations,
    };

    console.log('🎉 Workflow generation completed:', result);
    return result;
  }
);

/**
 * Background job to execute code generated by AI
 */
export const executeAIGeneratedCode = inngest.createFunction(
  { id: "ai-code-executor", name: "AI Code Executor" },
  { event: "workflow/ai-execute-code" },
  async ({ event, step }) => {
    const { workflowId, code, userId } = event.data;

    // This is more advanced - would require safe code execution
    // For now, we'll just parse and extract workflow creation logic

    await step.run("execute-code", async () => {
      // Security note: In production, this should run in a sandboxed environment
      // For now, we'll extract structured data instead of executing arbitrary code

      console.log("Code to execute:", code);

      // Extract and create workflow based on the code structure
      // This is a simplified version - in production you'd want proper code parsing

      return {
        success: true,
        message: "Code execution simulated",
      };
    });

    return { success: true, workflowId };
  }
);
