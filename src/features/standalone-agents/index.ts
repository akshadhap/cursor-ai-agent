/**
 * Public API for Standalone Agents
 * Import from this file for clean, stable imports
 */

// Registry and Types
export {
  AGENT_TYPES,
  AGENT_STATUS,
  AGENT_REGISTRY,
  getAllAgents,
  getAgentMetadata,
  agentIdToType,
  agentTypeToId,
  type AgentType,
  type AgentStatus,
  type AgentMetadata,
} from "./lib/agent-registry";

// Actions
export {
  createOrGetAgent,
  createAiLeadGeneratorAgent,
  createColdWriterAgent,
  createFollowUpProAgent,
  createCrmLoggerAgent,
  createInsightBotAgent,
  createEmailClassifierAgent,
  createCursorAgent,
  createSeoGeoAeoAgent,
} from "./lib/agent-actions";

// Editor Resolution
export {
  getStandaloneAgentEditor,
  type StandaloneAgentEditorProps,
} from "./lib/get-standalone-agent-editor";

// React Hooks
export { useUserAgents } from "./hooks/use-agents";

// Specific Agent Editors (for direct imports if needed)
export { default as AiLeadGeneratorEditor } from "./agents/ai-lead-generator/editor";
