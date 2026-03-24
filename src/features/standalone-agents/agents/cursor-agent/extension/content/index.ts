/// <reference types="chrome" />
// Main content script coordinator for Spinabot Cursor AI

import { CursorBubble } from "./cursor-bubble";
import { QuickMenu, type QuickMenuAction } from "./quick-menu";
import { SidePanel, type PanelTab } from "./side-panel";
import { loadSettings } from "./settings";

// Initialize components
const cursorBubble = new CursorBubble(() => handleBubbleClick());
const quickMenu = new QuickMenu((action) => handleQuickMenuAction(action));
const sidePanel = new SidePanel();

let selectedText = "";
let selectionPosition = { x: 0, y: 0 };
let selectionTimeout: number | null = null;

/**
 * Handle text selection
 */
function handleTextSelection(): void {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";

    // Clear existing timeout
    if (selectionTimeout) {
        clearTimeout(selectionTimeout);
    }

    // Hide bubble and menu if no selection
    if (!text || text.length < 2) {
        cursorBubble.hide();
        quickMenu.hide();
        selectedText = "";
        return;
    }

    // Debounce selection handling
    selectionTimeout = window.setTimeout(() => {
        const settings = loadSettings();

        // Only show if text selection trigger is enabled
        if (!settings.textSelection) {
            return;
        }

        selectedText = text;

        // Get selection position
        const range = selection?.getRangeAt(0);
        if (range) {
            const rect = range.getBoundingClientRect();
            selectionPosition = {
                x: rect.left + rect.width / 2,
                y: rect.bottom,
            };

            // Show quick menu directly
            cursorBubble.hide();
            quickMenu.show(selectionPosition.x, selectionPosition.y);
        }
    }, 150); // Snappy 150ms debounce
}

/**
 * Handle bubble click
 */
function handleBubbleClick(): void {
    cursorBubble.hide();
    quickMenu.show(selectionPosition.x, selectionPosition.y);
}

/**
 * Handle quick menu action
 */
function handleQuickMenuAction(action: QuickMenuAction): void {
    quickMenu.hide();

    const tabMap: Record<QuickMenuAction, PanelTab> = {
        "ask-ai": "ask",
        actions: "actions",
        email: "email",
    };

    const tab = tabMap[action];
    // For ask-ai, just autofill the selected text without any prefix
    const prefill = selectedText;
    sidePanel.open(tab, prefill);
}

/**
 * Handle click outside
 */
function handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    // Check if click is outside bubble and menu
    if (
        !target.closest("#spinabot-cursor-bubble") &&
        !target.closest("#spinabot-quick-menu") &&
        !target.closest("#spinabot-side-panel-container")
    ) {
        // Only hide if there's no active text selection
        const selection = window.getSelection();
        const hasSelection = selection && selection.toString().trim().length > 0;

        if (!hasSelection) {
            cursorBubble.hide();
            quickMenu.hide();
        }
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(event: KeyboardEvent): void {
    const settings = loadSettings();

    // Alt+S to toggle panel
    if (settings.keyboardShortcut && event.altKey && event.key === "s") {
        event.preventDefault();
        sidePanel.toggle();
    }
}

/**
 * Handle messages from background script
 */
function handleMessage(message: any): void {
    if (message.action === "openPanel") {
        const tab = (message.tab as PanelTab) || "ask";
        const text = message.text || "";
        sidePanel.open(tab, text);
    }

    if (message.action === "togglePanel") {
        sidePanel.toggle();
    }
}

/**
 * Initialize event listeners
 */
function initialize(): void {
    // Text selection
    document.addEventListener("mouseup", handleTextSelection);

    // Click outside
    document.addEventListener("click", handleClickOutside);

    // Keyboard shortcuts
    document.addEventListener("keydown", handleKeyDown);

    // Messages from background
    chrome.runtime.onMessage.addListener(handleMessage);

    console.log("Spinabot Cursor AI content script loaded");
}

/**
 * Cleanup on unload
 */
function cleanup(): void {
    document.removeEventListener("mouseup", handleTextSelection);
    document.removeEventListener("selectionchange", handleTextSelection);
    document.removeEventListener("click", handleClickOutside);
    document.removeEventListener("keydown", handleKeyDown);

    cursorBubble.destroy();
    quickMenu.destroy();
    sidePanel.destroy();
}

// Initialize
initialize();

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);
