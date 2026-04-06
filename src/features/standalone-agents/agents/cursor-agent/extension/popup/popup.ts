/// <reference types="chrome" />
// Popup script for Spinabot Cursor AI

document.addEventListener("DOMContentLoaded", () => {
    const openDashboardBtn = document.getElementById("open-dashboard");

    if (openDashboardBtn) {
        openDashboardBtn.addEventListener("click", () => {
            chrome.tabs.create({
                url: "http://localhost:3000",
            });
        });
    }
});
