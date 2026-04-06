import { z } from "zod";

/**
 * Zod schema for widget settings form validation
 * Validates greeting message, default suggestions, and VAPI settings
 */
export const widgetSettingsSchema = z.object({
  // Greeting message is required and cannot be empty
  greetMessage: z
    .string()
    .min(1, "Greeting message is required")
    .max(500, "Greeting message must be less than 500 characters"),

  // Default suggestions (optional, up to 3)
  defaultSuggestions: z.object({
    suggestion1: z
      .string()
      .max(100, "Suggestion must be less than 100 characters")
      .optional()
      .or(z.literal("")),
    suggestion2: z
      .string()
      .max(100, "Suggestion must be less than 100 characters")
      .optional()
      .or(z.literal("")),
    suggestion3: z
      .string()
      .max(100, "Suggestion must be less than 100 characters")
      .optional()
      .or(z.literal("")),
  }),

  // VAPI settings (optional, only shown if VAPI is connected)
  vapiSettings: z.object({
    assistantId: z.string().optional().or(z.literal("")),
    phoneNumber: z.string().optional().or(z.literal("")),
  }),
});

// TypeScript type inferred from the schema
export type WidgetSettingsFormData = z.infer<typeof widgetSettingsSchema>;
