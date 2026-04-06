// AI Lead Generator - Main exports

export { default as AiLeadGeneratorEditor } from "./editor";
export {
  createAiLeadGeneratorAgent,
  updateAiLeadGeneratorConfig,
  activateAiLeadGeneratorAgent,
} from "./actions";
export {
  AI_LEAD_GENERATOR_CONFIG,
  DEFAULT_CONFIG,
  EXTRACTION_INTERVALS,
  HOT_LEAD_ACTIONS,
  COLD_LEAD_ACTIONS,
  parseNaturalLanguageQuery,
} from "./config-new";
export type {
  AiLeadGeneratorConfig,
  HotLeadAction,
  ColdLeadAction,
} from "./config-new";
