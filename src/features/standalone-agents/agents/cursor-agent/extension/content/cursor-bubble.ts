// Cursor bubble component for Spinabot Cursor AI

export class CursorBubble {
    private bubble: HTMLElement | null = null;
    private onClick: () => void;

    constructor(onClick: () => void) {
        this.onClick = onClick;
    }

    /**
     * Show bubble near cursor position
     */
    show(x: number, y: number): void {
        if (!this.bubble) {
            this.createBubble();
        }

        if (this.bubble) {
            // Position bubble near cursor with offset
            const offsetX = 10;
            const offsetY = 10;

            this.bubble.style.left = `${x + offsetX}px`;
            this.bubble.style.top = `${y + offsetY}px`;
            this.bubble.style.display = "block";
            this.bubble.style.opacity = "0";

            // Trigger animation
            setTimeout(() => {
                if (this.bubble) {
                    this.bubble.style.opacity = "1";
                }
            }, 10);
        }
    }

    /**
     * Hide bubble
     */
    hide(): void {
        if (this.bubble) {
            this.bubble.style.opacity = "0";
            setTimeout(() => {
                if (this.bubble) {
                    this.bubble.style.display = "none";
                }
            }, 200);
        }
    }

    /**
     * Remove bubble from DOM
     */
    destroy(): void {
        if (this.bubble) {
            this.bubble.remove();
            this.bubble = null;
        }
    }

    /**
     * Create bubble element
     */
    private createBubble(): void {
        this.bubble = document.createElement("div");
        this.bubble.id = "spinabot-cursor-bubble";

        // Styles
        Object.assign(this.bubble.style, {
            position: "fixed",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
            cursor: "pointer",
            zIndex: "2147483646",
            display: "none",
            opacity: "0",
            transition: "all 0.2s ease-out",
            border: "2px solid rgba(255, 255, 255, 0.2)",
        });

        // Add icon
        this.bubble.innerHTML = `
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="white" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round"
        style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
        <path d="M2 17l10 5 10-5"></path>
        <path d="M2 12l10 5 10-5"></path>
      </svg>
    `;

        // Hover effect
        this.bubble.addEventListener("mouseenter", () => {
            if (this.bubble) {
                this.bubble.style.transform = "scale(1.15)";
                this.bubble.style.boxShadow = "0 6px 16px rgba(99, 102, 241, 0.5)";
            }
        });

        this.bubble.addEventListener("mouseleave", () => {
            if (this.bubble) {
                this.bubble.style.transform = "scale(1)";
                this.bubble.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.4)";
            }
        });

        // Click handler
        this.bubble.addEventListener("click", (e) => {
            e.stopPropagation();
            this.onClick();
        });

        document.body.appendChild(this.bubble);
    }
}
