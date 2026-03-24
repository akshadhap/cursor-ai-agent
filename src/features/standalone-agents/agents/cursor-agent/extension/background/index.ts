/// <reference types="chrome" />
// Background service worker for Spinabot Cursor AI

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "spinabot-open",
        title: "Open in Spinabot",
        contexts: ["selection"],
    });

    console.log("Spinabot Cursor AI installed successfully");
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "spinabot-open" && tab?.id) {
        const selectedText = info.selectionText || "";

        // Send message to content script to open panel with selected text
        chrome.tabs.sendMessage(tab.id, {
            action: "openPanel",
            text: selectedText,
            tab: "ask", // Default to Ask AI tab
        }).catch((error) => {
            console.error("Failed to send message to content script:", error);
        });
    }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: "togglePanel",
        }).catch((error) => {
            console.error("Failed to toggle panel:", error);
        });
    }
});

// Handle keyboard shortcut (Alt+S)
chrome.commands.onCommand.addListener((command, tab) => {
    if (command === "toggle-panel" && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
            action: "togglePanel",
        }).catch((error) => {
            console.error("Failed to toggle panel:", error);
        });
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "getSettings") {
        // Retrieve settings from storage
        chrome.storage.local.get("spinabot-cursor-settings", (result) => {
            sendResponse(result["spinabot-cursor-settings"] || {});
        });
        return true; // Keep channel open for async response
    }

    if (message.action === "saveSettings") {
        // Save settings to storage
        chrome.storage.local.set({
            "spinabot-cursor-settings": message.settings,
        }, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    return false;
});


console.log("Spinabot Cursor AI background service worker loaded");
