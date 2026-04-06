// AI Lead Generator Configuration

export const AI_LEAD_GENERATOR_CONFIG = {
  name: "AI Lead Generator",
  description: "Extract and qualify hot & cold leads automatically",
  type: "AI_LEAD_GENERATOR" as const,
  defaultApiKey: "lShupJrywrczAtsV9LJtza0jmwCgJmtbytzqtukzk2o",
} as const;

// Type definitions
export interface AiLeadGeneratorConfig {
  apiKey: string;
  sourceId: string;
  extractionInterval: "15min" | "30min" | "hourly" | "daily";
  qualificationCriteria: {
    hotLeadKeywords: string[];
    coldLeadKeywords: string[];
    customRules: any[];
  };
  routing: {
    hotLeadsAction: HotLeadAction;
    coldLeadsAction: ColdLeadAction;
  };
}

export type HotLeadAction = 
  | "SEND_TO_SALES" 
  | "IMMEDIATE_EMAIL" 
  | "CRM_HIGH_PRIORITY" 
  | "SLACK_NOTIFICATION";

export type ColdLeadAction = 
  | "NURTURE_SEQUENCE" 
  | "CRM_LOW_PRIORITY" 
  | "EMAIL_DRIP" 
  | "DO_NOTHING";

// Default configuration
export const DEFAULT_CONFIG: AiLeadGeneratorConfig = {
  apiKey: AI_LEAD_GENERATOR_CONFIG.defaultApiKey,
  sourceId: "",
  extractionInterval: "hourly",
  qualificationCriteria: {
    hotLeadKeywords: ["interested", "demo", "pricing", "quote", "urgent", "asap"],
    coldLeadKeywords: ["maybe", "later", "not now", "thinking"],
    customRules: [],
  },
  routing: {
    hotLeadsAction: "SEND_TO_SALES",
    coldLeadsAction: "NURTURE_SEQUENCE",
  },
};

// Extraction interval options
export const EXTRACTION_INTERVALS = [
  { value: "15min", label: "Every 15 minutes" },
  { value: "30min", label: "Every 30 minutes" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Daily" },
] as const;

// Hot lead action options
export const HOT_LEAD_ACTIONS = [
  { value: "SEND_TO_SALES", label: "Send to Sales Team" },
  { value: "IMMEDIATE_EMAIL", label: "Send Immediate Email" },
  { value: "CRM_HIGH_PRIORITY", label: "Add to CRM (High Priority)" },
  { value: "SLACK_NOTIFICATION", label: "Slack Notification" },
] as const;

// Cold lead action options
export const COLD_LEAD_ACTIONS = [
  { value: "NURTURE_SEQUENCE", label: "Add to Nurture Sequence" },
  { value: "CRM_LOW_PRIORITY", label: "Add to CRM (Low Priority)" },
  { value: "EMAIL_DRIP", label: "Start Email Drip Campaign" },
  { value: "DO_NOTHING", label: "Do Nothing" },
] as const;
// Deprecated: Use config-new.ts for all config, types, and parsing logic.
export * from "./config-new";
