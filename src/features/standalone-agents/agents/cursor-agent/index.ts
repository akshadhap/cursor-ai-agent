// Cursor Agent - Main exports
export { default as CursorAgentEditor } from "./editor";

// Server actions
export {
    createCursorAgent,
    updateCursorAgentConfig,
    completeOnboarding,
    saveCursorAgentActivity,
    getCursorAgentActivity,
    getCursorAgentAnalytics,
    activateCursorAgent,
    getCursorAgent,
} from "./actions";

// Configuration
export { CURSOR_AGENT_CONFIG } from "./config";
export type { CursorAgentConfig } from "./config";
