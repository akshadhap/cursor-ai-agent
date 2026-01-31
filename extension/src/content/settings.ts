/**
 * Settings Management
 * Reads user settings from localStorage (synced from dashboard)
 */

export interface Settings {
    triggers: {
        textSelection: boolean;
        rightClick: boolean;
        hover: boolean;
    };
    capabilities: {
        translate: boolean;
        summarize: boolean;
        explain: boolean;
        rewrite: boolean;
        generateTask: boolean;
        generateEmail: boolean;
    };
}

const DEFAULT_SETTINGS: Settings = {
    triggers: {
        textSelection: true,
        rightClick: true,
        hover: false,
    },
    capabilities: {
        translate: true,
        summarize: true,
        explain: true,
        rewrite: true,
        generateTask: true,
        generateEmail: true,
    },
};

/**
 * Get current settings from localStorage
 */
export function getSettings(): Settings {
    try {
        const stored = localStorage.getItem("spinabot-settings");
        if (stored) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error("Error reading settings:", error);
    }
    return DEFAULT_SETTINGS;
}

/**
 * Get enabled actions based on capabilities
 */
export function getEnabledActions(): string[] {
    const settings = getSettings();
    const actions: string[] = [];

    if (settings.capabilities.translate) actions.push("translate");
    if (settings.capabilities.summarize) actions.push("summarize");
    if (settings.capabilities.explain) actions.push("explain");
    if (settings.capabilities.rewrite) actions.push("rewrite");
    if (settings.capabilities.generateTask) actions.push("generate-task");
    if (settings.capabilities.generateEmail) actions.push("generate-email");

    return actions;
}
