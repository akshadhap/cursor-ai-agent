/**
 * Action Executor
 * Handles execution of AI actions and communication with background script
 */

let sidePanel: any = null;

export function setSidePanel(panel: any) {
    sidePanel = panel;
}

/**
 * Handle AI action execution
 */
export async function executeAction(
    action: string,
    text: string,
    options: Record<string, any> = {}
): Promise<any> {
    // Show loading in side panel
    sidePanel?.showLoading(action);

    try {
        // Send message to background script to make API request
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    type: "API_REQUEST",
                    payload: { action, text, options },
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }

                    if (response && response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response?.error || "Unknown error"));
                    }
                }
            );
        });

        // Show result in side panel
        sidePanel?.showResult(action, response);

        return response;
    } catch (error) {
        console.error("Action execution error:", error);

        let errorMessage = error instanceof Error ? error.message : "Unknown error";

        // Handle context invalidation (happens after extension reload)
        if (errorMessage.includes("Extension context invalidated")) {
            errorMessage = "Extension updated. Please refresh this page to continue.";
        }

        sidePanel?.showError(errorMessage);
        throw error;
    }
}
