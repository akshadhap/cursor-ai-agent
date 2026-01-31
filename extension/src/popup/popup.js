/**
 * Popup Script
 * Handles popup UI interactions
 */

// Update status on load
document.addEventListener("DOMContentLoaded", () => {
    updateStatus();
    setupEventListeners();
});

/**
 * Update extension status
 */
function updateStatus() {
    // Get actions count from storage
    chrome.storage.local.get(["actionsCount"], (result) => {
        const count = result.actionsCount || 0;
        const countElement = document.getElementById("actions-count");
        if (countElement) {
            countElement.textContent = count.toString();
        }
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Open dashboard button
    const dashboardBtn = document.getElementById("open-dashboard");
    dashboardBtn?.addEventListener("click", async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDE_PANEL" });
        }
    });

    // View settings button
    const settingsBtn = document.getElementById("view-settings");
    settingsBtn?.addEventListener("click", () => {
        chrome.tabs.create({ url: "http://localhost:3000" });
    });
}
