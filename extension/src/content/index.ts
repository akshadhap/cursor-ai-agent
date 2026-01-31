/**
 * Content Script - Main Entry Point V2
 * Premium Spinabot AI Panel with Quick Selection Menu
 */

import { SidePanel } from "./side-panel";
import { QuickMenu } from "./quick-menu";
import { getSettings } from "./settings";

// Initialize components
let sidePanel: SidePanel | null = null;
let quickMenu: QuickMenu | null = null;

// Initialize extension
function init() {
    console.log("🚀 Spinabot AI Assistant V2 initialized");

    // Create premium AI panel (hidden by default)
    sidePanel = new SidePanel();
    sidePanel?.close(); // Ensure panel is closed on initialization

    // Create quick menu for text selection
    quickMenu = new QuickMenu((feature, text) => {
        // When user selects a feature from quick menu, open panel to that tab
        sidePanel?.open();
        sidePanel?.switchTab(feature);

        // Set the selected text for auto-fill
        sidePanel?.setSelectedText(text);

        // Pre-fill based on feature
        setTimeout(() => {
            const panel = document.getElementById('spinabot-ai-panel');
            if (panel && panel.shadowRoot) {
                if (feature === 'ask') {
                    // For summarize, pre-fill chat input with selected text
                    const chatInput = panel.shadowRoot.querySelector('#chat-input') as HTMLTextAreaElement;
                    if (chatInput) {
                        chatInput.value = `Summarize this: "${text}"`;
                        chatInput.focus();
                    }
                } else if (feature === 'email') {
                    // Email context is now auto-filled via selectedText property
                    // Just focus the field
                    const emailContext = panel.shadowRoot.querySelector('#email-context') as HTMLTextAreaElement;
                    if (emailContext) {
                        emailContext.focus();
                    }
                }
            }
        }, 100);
    });

    // Set up event listeners
    setupEventListeners();

    // DO NOT auto-open panel - only open on user interaction
}

/**
 * Set up event listeners for text selection and other triggers
 */
function setupEventListeners() {
    // Text selection listener - shows quick menu
    document.addEventListener("mouseup", handleTextSelection);

    // Keyboard shortcut: Alt+S to toggle panel
    document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key === 's') {
            e.preventDefault();
            sidePanel?.toggle();
        }
    });

    // Listen for messages from background script or popup
    chrome.runtime.onMessage.addListener((message) => {
        console.log("Content script received message:", message);

        if (message.type === "SHOW_AI_MENU" && message.text) {
            // Open panel with selected text
            sidePanel?.open();
            sidePanel?.switchTab('ask');

            setTimeout(() => {
                const panel = document.getElementById('spinabot-ai-panel');
                if (panel && panel.shadowRoot) {
                    const chatInput = panel.shadowRoot.querySelector('#chat-input') as HTMLTextAreaElement;
                    if (chatInput) {
                        chatInput.value = `Explain this: "${message.text}"`;
                        chatInput.focus();
                    }
                }
            }, 100);
        } else if (message.type === "TOGGLE_SIDE_PANEL") {
            sidePanel?.toggle();
        } else if (message.type === "OPEN_PANEL") {
            sidePanel?.open();
            if (message.tab) {
                sidePanel?.switchTab(message.tab);
            }
        }
    });
}

/**
 * Handle text selection - shows quick menu
 */
function handleTextSelection(event: MouseEvent) {
    const settings = getSettings();

    if (!settings.triggers.textSelection) {
        return;
    }

    // Check if click was inside the panel or quick menu
    const target = event.target as HTMLElement;
    if (
        target.id === "spinabot-ai-panel" ||
        target.closest("#spinabot-ai-panel") ||
        target.id === "spinabot-quick-menu" ||
        target.closest("#spinabot-quick-menu")
    ) {
        return;
    }

    // Small delay to ensure selection is complete
    setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText && selectedText.length > 0) {
            // Show quick menu near the selection
            const range = selection!.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Position menu below the selection
            quickMenu?.show({
                x: rect.left + rect.width / 2,
                y: rect.bottom + window.scrollY + 10,
                selectedText,
            });
        } else {
            // Hide menu if no text selected
            quickMenu?.hide();
        }
    }, 10);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

export { };
