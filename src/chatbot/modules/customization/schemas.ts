import z from "zod";

export const widgetSettingsSchema = z.object({
  chatbotName: z.string().optional(),
  greetMessage: z.string().min(1, "Greeting message is required"),
  customSystemPrompt: z.string().optional(),
  aiAvatarEnabled: z.boolean().optional(),
  beyondPresenceAgentId: z.string().optional(),
  appearance: z.object({
    primaryColor: z.string().optional(),
    size: z.number().optional(),
  }).optional(),
  defaultSuggestions: z.object({
    suggestion1: z.string().optional(),
    suggestion2: z.string().optional(),
    suggestion3: z.string().optional(),
  }),
  vapiSettings: z.object({
    assistantId: z.string().optional(),
    phoneNumber: z.string().optional(),
  }),
});