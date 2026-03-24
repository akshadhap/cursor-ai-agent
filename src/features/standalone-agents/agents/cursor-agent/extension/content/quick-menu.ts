// Quick menu component for Spinabot Cursor AI

export type QuickMenuAction = "ask-ai" | "actions" | "email";

export class QuickMenu {
    private menu: HTMLElement | null = null;
    private onAction: (action: QuickMenuAction) => void;

    constructor(onAction: (action: QuickMenuAction) => void) {
        this.onAction = onAction;
    }

    /**
     * Show menu below selected text
     */
    show(x: number, y: number): void {
        if (!this.menu) {
            this.createMenu();
        }

        if (this.menu) {
            // Position menu below selection
            const offsetY = 40;

            this.menu.style.left = `${x}px`;
            this.menu.style.top = `${y + offsetY}px`;
            this.menu.style.display = "flex";
            this.menu.style.opacity = "0";
            this.menu.style.transform = "translateX(-50%) translateY(-10px)";

            // Trigger animation
            setTimeout(() => {
                if (this.menu) {
                    this.menu.style.opacity = "1";
                    this.menu.style.transform = "translateX(-50%) translateY(0)";
                }
            }, 10);
        }
    }

    /**
     * Hide menu
     */
    hide(): void {
        if (this.menu) {
            this.menu.style.opacity = "0";
            this.menu.style.transform = "translateY(-10px)";
            setTimeout(() => {
                if (this.menu) {
                    this.menu.style.display = "none";
                }
            }, 200);
        }
    }

    /**
     * Remove menu from DOM
     */
    destroy(): void {
        if (this.menu) {
            this.menu.remove();
            this.menu = null;
        }
    }

    /**
     * Create menu element
     */
    private createMenu(): void {
        this.menu = document.createElement("div");
        this.menu.id = "spinabot-quick-menu";

        // Styles
        Object.assign(this.menu.style, {
            position: "fixed",
            display: "none",
            gap: "8px",
            padding: "8px",
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(12px)",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
            zIndex: "2147483647",
            opacity: "0",
            transition: "all 0.2s ease-out",
            border: "1px solid rgba(0, 0, 0, 0.1)",
        });

        // Create buttons
        const buttons = [
            {
                action: "ask-ai" as QuickMenuAction,
                label: "Ask AI",
                icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
                color: "#4285f4",
            },
            {
                action: "actions" as QuickMenuAction,
                label: "Actions",
                icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
                color: "#fbbc04",
            },
            {
                action: "email" as QuickMenuAction,
                label: "Email",
                icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
                color: "#ea4335",
            },
        ];

        buttons.forEach((btn) => {
            const button = this.createButton(btn.label, btn.icon, btn.color, btn.action);
            this.menu!.appendChild(button);
        });

        document.body.appendChild(this.menu);
    }

    /**
     * Create button element
     */
    private createButton(
        label: string,
        icon: string,
        color: string,
        action: QuickMenuAction
    ): HTMLElement {
        const button = document.createElement("button");

        Object.assign(button.style, {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            padding: "12px 16px",
            background: "white",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "12px",
            fontWeight: "500",
            color: "#1f2937",
        });

        button.innerHTML = `
      <div style="color: ${color};">${icon}</div>
      <span>${label}</span>
    `;

        // Hover effect
        button.addEventListener("mouseenter", () => {
            button.style.background = "#f9fafb";
            button.style.transform = "translateY(-2px)";
            button.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
        });

        button.addEventListener("mouseleave", () => {
            button.style.background = "white";
            button.style.transform = "translateY(0)";
            button.style.boxShadow = "none";
        });

        // Click handler
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            this.onAction(action);
            this.hide();
        });

        return button;
    }
}
