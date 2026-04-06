/**
 * Quick Selection Menu - Minimal menu for text selection
 * Shows 3 main features: Summarize, Actions, Email
 */

export class QuickMenu {
    private container: HTMLDivElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private selectedText: string = "";
    private onFeatureSelect: ((feature: 'ask' | 'actions' | 'email', text: string) => void) | null = null;

    constructor(onSelect: (feature: 'ask' | 'actions' | 'email', text: string) => void) {
        this.onFeatureSelect = onSelect;
        this.createMenu();
    }

    private createMenu() {
        // Create container
        this.container = document.createElement("div");
        this.container.id = "spinabot-quick-menu";
        this.container.style.cssText = `
            position: absolute;
            z-index: 2147483647;
            display: none;
            user-select: none;
            -webkit-user-select: none;
        `;

        // Attach shadow DOM
        this.shadowRoot = this.container.attachShadow({ mode: "open" });

        // Add styles
        const style = document.createElement("style");
        style.textContent = `
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            .menu-container {
                position: relative;
                transform: translateX(-50%);
            }

            .menu {
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
                padding: 6px;
                display: flex;
                gap: 4px;
                animation: slideUp 0.2s ease;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .menu-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                padding: 12px 16px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s ease;
                background: white;
                border: none;
                min-width: 80px;
            }

            .menu-item:hover {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
            }

            .menu-item:hover .icon {
                color: white;
            }

            .menu-item:hover .label {
                color: white;
            }

            .icon {
                width: 20px;
                height: 20px;
                color: #6366f1;
                transition: color 0.15s ease;
            }

            .label {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 12px;
                font-weight: 500;
                color: #1f2937;
                transition: color 0.15s ease;
            }

            .arrow {
                position: absolute;
                bottom: -6px;
                left: 50%;
                transform: translateX(-50%);
                width: 12px;
                height: 12px;
                background: white;
                box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
                transform: translateX(-50%) rotate(45deg);
                z-index: -1;
            }
        `;

        this.shadowRoot.appendChild(style);

        // Create menu HTML
        const menuContainer = document.createElement("div");
        menuContainer.className = "menu-container";
        menuContainer.innerHTML = `
            <div class="menu">
                <button class="menu-item" data-feature="ask">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <span class="label">Summarize</span>
                </button>
                <button class="menu-item" data-feature="actions">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <span class="label">Actions</span>
                </button>
                <button class="menu-item" data-feature="email">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span class="label">Email</span>
                </button>
            </div>
            <div class="arrow"></div>
        `;

        this.shadowRoot.appendChild(menuContainer);

        // Add event listeners
        const menuItems = this.shadowRoot.querySelectorAll(".menu-item");
        menuItems.forEach((item) => {
            item.addEventListener("click", (e) => {
                const feature = (e.currentTarget as HTMLElement).dataset.feature as 'ask' | 'actions' | 'email';
                if (feature && this.onFeatureSelect) {
                    this.onFeatureSelect(feature, this.selectedText);
                    this.hide();
                }
            });
        });

        // Add to page
        document.body.appendChild(this.container);
    }

    public show(options: { x: number; y: number; selectedText: string }) {
        if (!this.container) return;

        this.selectedText = options.selectedText;
        this.container.style.left = `${options.x}px`;
        this.container.style.top = `${options.y}px`;
        this.container.style.display = "block";
    }

    public hide() {
        if (!this.container) return;
        this.container.style.display = "none";
    }

    public destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
