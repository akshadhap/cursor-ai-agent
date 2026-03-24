/**
 * Background Service Worker
 * Handles context menu creation and message passing between content script and API
 */

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "spinabot-ask-ai",
        title: "Ask Spinabot AI",
        contexts: ["selection"],
    });

    console.log("Spinabot AI Assistant V2 installed!");
});

// Handle context menu clicks - opens panel directly
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log("Context menu clicked:", info);

    if (info.menuItemId === "spinabot-ask-ai" && tab?.id) {
        console.log("Opening Spinabot panel for tab:", tab.id);

        try {
            // Send message to open panel with selected text
            await sendMessageToTab(tab.id, {
                type: "SHOW_AI_MENU",
                text: info.selectionText,
            });
            console.log("Panel opened successfully");
        } catch (error) {
            console.warn("Message failed, attempting to inject script...", error);

            // If failed, try to inject script and retry
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["content.js"],
                });

                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ["content.css"],
                });

                console.log("Script injected, retrying message...");

                // Wait small amount for script to init
                await new Promise(r => setTimeout(r, 100));

                await sendMessageToTab(tab.id, {
                    type: "SHOW_AI_MENU",
                    text: info.selectionText,
                });
                console.log("Panel opened successfully after injection");
            } catch (injectionError) {
                console.error("Failed to recover:", injectionError);
            }
        }
    }
});

// Handle extension icon click - toggles panel
chrome.action.onClicked.addListener(async (tab) => {
    console.log("Extension icon clicked for tab:", tab.id);

    if (tab?.id) {
        try {
            // Send message to toggle panel
            await sendMessageToTab(tab.id, {
                type: "TOGGLE_SIDE_PANEL"
            });
            console.log("Panel toggled successfully");
        } catch (error) {
            console.warn("Message failed, attempting to inject script...", error);

            // If failed, try to inject script and retry
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ["content.js"],
                });

                await chrome.scripting.insertCSS({
                    target: { tabId: tab.id },
                    files: ["content.css"],
                });

                console.log("Script injected, retrying message...");

                // Wait small amount for script to init
                await new Promise(r => setTimeout(r, 100));

                await sendMessageToTab(tab.id, {
                    type: "TOGGLE_SIDE_PANEL"
                });
                console.log("Panel toggled successfully after injection");
            } catch (injectionError) {
                console.error("Failed to recover:", injectionError);
            }
        }
    }
});

/**
 * Helper to send message with Promise wrapper
 */
function sendMessageToTab(tabId: number, message: any): Promise<any> {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "API_REQUEST") {
        handleApiRequest(message.payload)
            .then((response) => sendResponse({ success: true, data: response }))
            .catch((error) => sendResponse({ success: false, error: error.message }));

        return true; // Keep message channel open for async response
    }
});

/**
 * Make API request to backend with retry logic
 */
async function handleApiRequest(payload: {
    action: string;
    text: string;
    options?: Record<string, any>;
}): Promise<any> {
    const API_URL = "http://localhost:3000";
    const { action, text, options = {} } = payload;

    const endpoint = `${API_URL}/api/agent/${action}`;

    console.log(`[Spinabot] Making API request to: ${endpoint}`);
    console.log(`[Spinabot] Payload:`, { text: text.substring(0, 100) + '...', ...options });

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text, ...options }),
        });

        console.log(`[Spinabot] Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Spinabot] API error:`, errorText);
            throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[Spinabot] Response data:`, data);
        return data;
    } catch (error: any) {
        console.error("[Spinabot] API request error:", error);

        // Provide helpful error messages
        if (error.message.includes('fetch')) {
            throw new Error('Cannot connect to server. Make sure the web app is running on http://localhost:3000');
        }

        throw error;
    }
}

export { };
