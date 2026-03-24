export const CURSOR_AGENT_CONFIG = {
    id: "cursor-agent",
    name: "Spinabot Cursor AI",
    description: "AI-powered cursor assistance for browsing with 9 intelligent capabilities",
    version: "1.0.0",

    capabilities: [
        "Chat with AI using page context",
        "Summarize selected text",
        "Explain complex concepts",
        "Generate tasks from text",
        "Draft professional emails",
        "Scrape and summarize web pages",
        "Enrich profile data",
    ],

    integrations: {
        notion: { enabled: false, comingSoon: true },
        gmail: { enabled: false, comingSoon: true },
        slack: { enabled: false, comingSoon: true },
        jira: { enabled: false, comingSoon: true },
    },

    triggers: {
        textSelection: true,
        rightClickMenu: true,
        keyboardShortcut: "Alt+S",
    },

    backend: {
        url: "http://localhost:3000",
        apiPrefix: "/api/agent",
    },

    extension: {
        manifestVersion: 3,
        permissions: ["activeTab", "contextMenus", "storage", "scripting"],
        hostPermissions: ["http://localhost:3000/*", "https://*/*"],
    },
};

export type CursorAgentConfig = typeof CURSOR_AGENT_CONFIG;
