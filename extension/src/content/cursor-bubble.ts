/**
 * Cursor Bubble Component
 * Minimal, reactive bubble that appears near selected text
 */

import { executeAction } from "./action-executor";
import { getEnabledActions } from "./settings";

export class CursorBubble {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private currentText: string = "";
  private isExpanded: boolean = false;

  constructor() {
    this.createBubble();
  }

  /**
   * Create the bubble UI using Shadow DOM
   */
  private createBubble() {
    // Create container
    this.container = document.createElement("div");
    this.container.id = "spinabot-cursor-bubble";
    this.container.style.cssText = `
      position: absolute;
      z-index: 2147483647;
      display: none;
      user-select: none;
      -webkit-user-select: none;
    `;

    // Attach shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: "open" });

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .bubble-container {
        position: relative;
        transform: translateX(-50%);
        margin-top: 0;
      }

      .bubble {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 20px;
        padding: 8px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
      }

      .bubble:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .bubble-icon {
        width: 16px;
        height: 16px;
      }

      .menu {
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-top: 8px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        padding: 8px;
        min-width: 200px;
        display: none;
      }

      .menu.visible {
        display: block;
        animation: slideDown 0.2s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.15s ease;
        color: #1f2937;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
      }

      .menu-item:hover {
        background: #f3f4f6;
      }

      .menu-item-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .menu-item-label {
        flex: 1;
      }
    `;

    this.shadowRoot.appendChild(style);

    // Create bubble HTML
    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = "bubble-container";
    bubbleContainer.innerHTML = `
      <div class="bubble" id="bubble-trigger">
        <svg class="bubble-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span>AI</span>
      </div>
      <div class="menu" id="bubble-menu">
        ${this.renderMenuItems()}
      </div>
    `;

    this.shadowRoot.appendChild(bubbleContainer);

    // Add event listeners
    const trigger = this.shadowRoot.getElementById("bubble-trigger");
    if (trigger) {
      this.setupDraggable(trigger);
    }

    // Add to page
    document.body.appendChild(this.container);
  }

  /**
   * Setup draggable behavior
   */
  private setupDraggable(element: HTMLElement) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let hasMoved = false;

    // Mouse Down - Start Drag
    element.addEventListener("mousedown", (e) => {
      if (!this.container) return;
      isDragging = true;
      hasMoved = false;

      // Get current position
      const rect = this.container.getBoundingClientRect();
      initialLeft = rect.left + window.scrollX;
      initialTop = rect.top + window.scrollY;

      startX = e.clientX;
      startY = e.clientY;

      this.container.style.cursor = "grabbing";
      element.style.cursor = "grabbing";

      // Prevent default to stop text selection while dragging
      e.preventDefault();
    });

    // Mouse Move - Dragging
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !this.container) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Only count as moved if dragged more than 3px
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true;
      }

      this.container.style.left = `${initialLeft + dx}px`;
      this.container.style.top = `${initialTop + dy}px`;
    };

    // Mouse Up - Stop Drag
    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;

      if (this.container) {
        this.container.style.cursor = "default";
      }
      element.style.cursor = "pointer";
    };

    // Click - Toggle Menu (only if not dragged)
    element.addEventListener("click", () => {
      if (!hasMoved) {
        this.toggleMenu();
      }
    });

    // Attach global listeners
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  /**
   * Render menu items based on enabled actions
   */
  private renderMenuItems(): string {
    const actions = getEnabledActions();
    const actionConfig: Record<string, { label: string; icon: string }> = {
      translate: {
        label: "Translate",
        icon: '<path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14.5 18h6"/>',
      },
      summarize: {
        label: "Summarize",
        icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
      },
      explain: {
        label: "Explain",
        icon: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      },
      rewrite: {
        label: "Rewrite",
        icon: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
      },
      "generate-task": {
        label: "Create Task",
        icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
      },
      "generate-email": {
        label: "Create Email",
        icon: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
      },
    };

    return actions
      .map((action) => {
        const config = actionConfig[action];
        if (!config) return "";

        return `
        <div class="menu-item" data-action="${action}">
          <svg class="menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${config.icon}
          </svg>
          <span class="menu-item-label">${config.label}</span>
        </div>
      `;
      })
      .join("");
  }

  /**
   * Show the bubble at specified position
   */
  public show(options: { x: number; y: number; selectedText: string }) {
    if (!this.container) return;

    this.currentText = options.selectedText;
    this.container.style.left = `${options.x}px`;
    this.container.style.top = `${options.y}px`;
    this.container.style.display = "block";

    // Add click handlers to menu items
    const menuItems = this.shadowRoot?.querySelectorAll(".menu-item");
    menuItems?.forEach((item) => {
      item.addEventListener("click", (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        if (action) {
          this.handleAction(action);
        }
      });
    });
  }

  /**
   * Hide the bubble
   */
  public hide() {
    if (!this.container) return;
    this.container.style.display = "none";
    this.isExpanded = false;
    const menu = this.shadowRoot?.getElementById("bubble-menu");
    menu?.classList.remove("visible");
  }

  /**
   * Toggle menu visibility
   */
  private toggleMenu() {
    this.isExpanded = !this.isExpanded;
    const menu = this.shadowRoot?.getElementById("bubble-menu");

    if (this.isExpanded) {
      menu?.classList.add("visible");
    } else {
      menu?.classList.remove("visible");
    }
  }

  /**
   * Expand menu (public method for external use)
   */
  public expandMenu() {
    this.isExpanded = true;
    const menu = this.shadowRoot?.getElementById("bubble-menu");
    menu?.classList.add("visible");
  }

  /**
   * Handle action selection
   */
  private async handleAction(action: string) {
    this.hide();

    try {
      await executeAction(action, this.currentText);
    } catch (error) {
      console.error("Action failed:", error);
    }
  }
}
