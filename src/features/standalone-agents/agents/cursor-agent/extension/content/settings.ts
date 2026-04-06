// Settings management for Spinabot Cursor AI

export interface Settings {
    // Triggers
    textSelection: boolean;
    rightClickMenu: boolean;
    keyboardShortcut: boolean;

    // Capabilities
    chat: boolean;
    ask_ai: boolean;
    tasks: boolean;
    scraping: boolean;
    enrichment: boolean;
    email: boolean;

    // Integrations
    notion: boolean;
    gmail: boolean;
    slack: boolean;
    jira: boolean;
}

const defaultSettings: Settings = {
    textSelection: true,
    rightClickMenu: true,
    keyboardShortcut: true,
    chat: true,
    ask_ai: true,
    tasks: true,
    scraping: true,
    enrichment: true,
    email: true,
    notion: false,
    gmail: false,
    slack: false,
    jira: false,
};

/**
 * Load settings from localStorage
 */
export function loadSettings(): Settings {
    try {
        const stored = localStorage.getItem("spinabot-cursor-settings");
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...defaultSettings, ...parsed };
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }
    return defaultSettings;
}

/**
 * Save settings to localStorage
 */
export function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem("spinabot-cursor-settings", JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings:", error);
    }
}

/**
 * Get default settings
 */
export function getDefaultSettings(): Settings {
    return { ...defaultSettings };
}
