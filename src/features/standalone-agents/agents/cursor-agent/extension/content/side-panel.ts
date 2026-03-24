// Side panel component for Spinabot Cursor AI
// This is the main UI component with 4 tabs: Ask AI, Actions, Email, Settings

import * as API from "./action-executor";
import { loadSettings, saveSettings, type Settings } from "./settings";

export type PanelTab = "ask" | "actions" | "email";

export class SidePanel {
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private currentTab: PanelTab = "ask";
  private currentActionView: "list" | "tasks" | "scrape" | "enrich" = "list";
  private isMinimized = false;
  private chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
  private prefilledText = "";
  private draftText = ""; // New: Persist user input across renders

  constructor() {
    this.createPanel();
  }

  /**
   * Open panel with optional tab and prefilled text
   */
  open(tab?: PanelTab, prefilledText?: string): void {
    if (tab) {
      this.currentTab = tab;
    }
    if (prefilledText) {
      this.prefilledText = prefilledText;
    }

    if (this.container) {
      this.container.style.display = "block";
      this.isMinimized = false;
      this.render();
    }
  }

  /**
   * Close panel
   */
  close(): void {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  /**
   * Toggle panel visibility
   */
  toggle(): void {
    if (this.container) {
      if (this.container.style.display === "none") {
        this.open();
      } else {
        this.close();
      }
    }
  }

  /**
   * Destroy panel
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }

  /**
   * Create panel container with Shadow DOM
   */
  private createPanel(): void {
    this.container = document.createElement("div");
    this.container.id = "spinabot-side-panel-container";

    Object.assign(this.container.style, {
      position: "fixed",
      right: "0",
      top: "0",
      height: "100vh",
      width: "380px",
      zIndex: "2147483647",
      display: "none",
    });

    // Create Shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: "open" });

    document.body.appendChild(this.container);
    this.render();
  }

  /**
   * Render panel content
   */
  private render(): void {
    if (!this.shadowRoot) return;

    const width = this.isMinimized ? "48px" : "400px";

    this.shadowRoot.innerHTML = `
      <style>
        ${this.getStyles()}
      </style>
      <div class="panel" style="width: ${width};">
        ${this.isMinimized ? this.renderMinimized() : this.renderFull()}
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render minimized panel
   */
  private renderMinimized(): string {
    return `
      <div class="minimized-strip">
        <button class="expand-btn" data-action="expand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Render full panel
   */
  private renderFull(): string {
    return `
      <div class="panel-header">
        <div class="header-content">
          <div class="header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m8.66-15.66l-4.24 4.24m-4.24 4.24l-4.24 4.24m15.66-8.66l-6 0m-6 0l-6 0m15.66 8.66l-4.24-4.24m-4.24-4.24l-4.24-4.24"/>
            </svg>
          </div>
          <div>
            <div class="header-title">Spinabot Cursor</div>
            <div class="header-subtitle">AI Assistant</div>
          </div>
        </div>
        <div class="header-controls">
          <button class="control-btn" data-action="minimize">−</button>
          <button class="control-btn" data-action="close">×</button>
        </div>
      </div>

      <div class="tab-bar">
        <button class="tab ${this.currentTab === "ask" ? "active" : ""}" data-tab="ask">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Ask AI
        </button>
        <button class="tab ${this.currentTab === "actions" ? "active" : ""}" data-tab="actions">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          Actions
        </button>
        <button class="tab ${this.currentTab === "email" ? "active" : ""}" data-tab="email">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          Email
        </button>
      </div>

      <div class="tab-content">
        ${this.renderTabContent()}
      </div>
    `;
  }

  /**
   * Render current tab content
   */
  private renderTabContent(): string {
    switch (this.currentTab) {
      case "ask":
        return this.renderAskTab();
      case "actions":
        return this.renderActionsTab();
      case "email":
        return this.renderEmailTab();
      default:
        return "";
    }
  }

  /**
   * Render Ask AI tab
   */
  private renderAskTab(): string {
    const chatMessages = this.chatHistory
      .map((msg) => {
        const isUser = msg.role === "user";
        const contentHtml = isUser ? this.escapeHtml(msg.content) : this.renderMarkdown(msg.content);
        return `
          <div class="chat-message ${isUser ? "user" : "assistant"}">
            <div class="message-content">${contentHtml}</div>
          </div>
        `;
      })
      .join("");

    return `
      <div class="ask-tab">
        <div class="welcome-container" id="welcome-container" style="${this.chatHistory.length > 0 ? 'display: none;' : 'display: flex;}'}">
          <h2 class="welcome-title">Find information</h2>
          <p class="welcome-subtitle">Ask me anything about this page or let me help you find specific details from the content below.</p>
          
          <button class="summarize-page-btn" data-action="summarize-page">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8.5L15.5 3z" />
              <path d="M15 3v6h6" />
            </svg>
            Summarize this page
          </button>
        </div>

        <div class="chat-history" id="chat-history">
          ${chatMessages}
        </div>

        <div class="chat-input-container">
          <div class="chat-input-wrapper">
            <textarea 
              id="chat-input" 
              class="chat-input" 
              placeholder="Ask Spinabot..."
              rows="1"
            >${this.escapeHtml(this.draftText || this.prefilledText)}</textarea>
            <button class="send-btn ${this.draftText || this.prefilledText ? 'has-content' : ''}" data-action="send-chat" id="send-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
          <div class="chat-footer-info">Spinabot in Workspace can make mistakes. <a href="#" style="color: inherit;">Learn more</a></div>
        </div>
      </div>
    `;
  }

  /**
   * Render Actions tab
   */
  private renderActionsTab(): string {
    if (this.currentActionView === "tasks") return this.renderTasksView();
    if (this.currentActionView === "scrape") return this.renderScrapeView();
    if (this.currentActionView === "enrich") return this.renderEnrichView();

    return `
      <div class="actions-list-view">
        <div class="action-card">
          <div class="action-card-header">
            <svg class="action-icon-bolt" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span class="action-card-title">Choose an Action</span>
          </div>
          <div class="action-card-subtitle">Select what you'd like to do</div>
        </div>

        <div class="actions-grid">
          <div class="grid-item" data-view="tasks">
            <div class="grid-icon bg-black">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M12 11h4" />
                <path d="M12 16h4" />
                <path d="M8 11h.01" />
                <path d="M8 16h.01" />
              </svg>
            </div>
            <span class="grid-label">Create Task</span>
          </div>
          
          <div class="grid-item" data-view="scrape">
            <div class="grid-icon bg-black">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span class="grid-label">Scrape Link</span>
          </div>
          
          <div class="grid-item" data-view="enrich">
            <div class="grid-icon bg-black">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 3h12l4 9-10 10L2 12l4-9z" />
                <path d="M11 3L8 12h8l-3-9" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <span class="grid-label">Enrich Info</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderTasksView(): string {
    const settings = loadSettings();
    return `
      <div class="action-subview">
        <button class="back-to-actions" data-action="back-to-list">
          ← Back to Actions
        </button>

        <div class="form-container">
          <div class="form-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="M12 11h4" />
              <path d="M12 16h4" />
              <path d="M8 11h.01" />
              <path d="M8 16h.01" />
            </svg>
            <span class="form-title">Create Task</span>
          </div>
          
          <div class="input-group">
            <label class="form-label">TASK TITLE</label>
            <input type="text" id="task-title" class="form-input" placeholder="Enter task title..." value="${this.escapeHtml(this.prefilledText.slice(0, 50))}${this.prefilledText.length > 50 ? '...' : ''}">
          </div>

          <div class="input-group">
            <label class="form-label">DESCRIPTION</label>
            <textarea id="task-description" class="form-textarea" placeholder="Describe the task...">${this.escapeHtml(this.prefilledText)}</textarea>
          </div>

          <div class="input-group">
            <label class="form-label">PRIORITY</label>
            <select id="task-priority" class="form-select">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div class="input-group">
            <label class="form-label">SYNC TO TOOL</label>
            <select id="task-tool" class="form-select">
              <option value="notion">Notion</option>
              <option value="jira">Jira</option>
              <option value="slack" selected>Slack</option>
            </select>
          </div>

          <button class="submit-btn" data-action="submit-task">
            Create Task
          </button>

          <div id="task-result" class="result-container"></div>
        </div>
      </div>
    `;
  }

  private renderScrapeView(): string {
    return `
      <div class="action-subview">
        <button class="back-to-actions" data-action="back-to-list">
          ← Back to Actions
        </button>

        <div class="form-container">
          <div class="form-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span class="form-title">Scrape Link</span>
          </div>
          <div class="form-subtitle">Extract data from any webpage</div>
          
          <div class="input-group">
            <label class="form-label">URL</label>
            <input type="text" id="scrape-url" class="form-input" placeholder="Leave empty to scrape current page">
          </div>

          <button class="submit-btn" data-action="submit-scrape">
            Scrape Data
          </button>

          <div id="scrape-result" class="result-container"></div>
        </div>
      </div>
    `;
  }

  private renderEnrichView(): string {
    return `
      <div class="action-subview">
        <button class="back-to-actions" data-action="back-to-list">
          ← Back to Actions
        </button>

        <div class="form-container">
          <div class="form-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 3h12l4 9-10 10L2 12l4-9z" />
              <path d="M11 3L8 12h8l-3-9" />
              <path d="M2 12h20" />
            </svg>
            <span class="form-title">Enrich Lead Information</span>
          </div>
          <div class="form-subtitle">Get detailed insights about a person or company</div>
          
          <div class="input-group">
            <label class="form-label">CONTEXT / BIO</label>
            <textarea id="enrich-input" class="form-textarea" placeholder="Leave empty to search based on page title/URL data.">${this.escapeHtml(this.prefilledText)}</textarea>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Leave empty to search based on page title/URL data.</div>
          </div>

          <button class="submit-btn" data-action="submit-enrich">
            Enrich Profile
          </button>

          <div id="enrich-result" class="result-container"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render Email tab
   */
  private renderEmailTab(): string {
    return `
      <div class="action-subview">
        <button class="back-to-actions" data-action="back-to-list">
          ← Back
        </button>

        <div class="form-container">
          <div class="form-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span class="form-title">Draft Email</span>
          </div>
          <div class="form-subtitle">Auto-generate an email from context</div>
          
          <div class="input-group">
            <label class="form-label">TONE</label>
            <select id="email-tone" class="form-select">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div class="input-group">
            <label class="form-label">CONTEXT / POINTS</label>
            <textarea id="email-context" class="form-textarea" placeholder="What should the email be about?">${this.escapeHtml(this.prefilledText)}</textarea>
          </div>

          <button class="submit-btn" data-action="generate-email">
            <span>✨</span> Generate Draft
          </button>

          <div id="email-result" class="result-container"></div>
        </div>
      </div>
    `;
  }

  /**
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" ${settings.ask_ai ? "checked" : ""} data-setting="ask_ai" />
              Ask AI
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" ${settings.email ? "checked" : ""} data-setting="email" />
              Email Drafting
            </label>
          </div>
        </div>

        <button class="action-btn primary" data-action="save-settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Save Settings
        </button>
      </div>
    `;
  }

  /**
   * Get panel styles
   */
  private getStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .panel {
        height: 100vh;
        background: #ffffff;
        border-left: 1px solid #dadce0;
        display: flex;
        flex-direction: column;
        color: #202124;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        transition: width 0.3s ease;
      }

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #1a1a1a;
        border-bottom: 1px solid #2a2a2a;
      }

      .header-content {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .header-icon {
        width: 32px;
        height: 32px;
        background: #2a2a2a;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .header-icon svg {
        fill: #ffffff;
      }

      .header-title {
        font-size: 16px;
        font-weight: 500;
        color: #ffffff;
      }

      .header-subtitle {
        font-size: 12px;
        color: #b0b0b0;
      }

      .header-controls {
        display: flex;
        gap: 4px;
      }

      .control-btn {
        width: 32px;
        height: 32px;
        background: transparent;
        border: none;
        border-radius: 50%;
        color: #b0b0b0;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .control-btn:hover {
        background: #2a2a2a;
        color: #ffffff;
      }

      .tab-bar {
        display: flex;
        background: #ffffff;
        border-bottom: 1px solid #e8eaed;
        padding: 0 16px;
      }

      .tab {
        flex: 1;
        background: transparent;
        border: none;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #5f6368;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        position: relative;
        transition: color 0.2s;
      }

      .tab:hover {
        color: #202124;
      }

      .tab.active {
        color: #000000;
        font-weight: 600;
      }

      .tab.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: #000000;
        border-radius: 3px 3px 0 0;
      }

      .tab-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0;
      }

      /* Ask Tab Content */
      .ask-tab {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: white; /* Gemini is mostly white */
        overflow: hidden; /* Contain chat history scrolling */
      }

      .welcome-container {
        padding: 80px 24px 40px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
      }

      .welcome-title {
        font-size: 28px;
        font-weight: 500;
        color: #444746;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
      }

      .welcome-subtitle {
        font-size: 15px;
        color: #444746;
        line-height: 1.6;
        margin-bottom: 32px;
        max-width: 360px; /* Increased for wider panel */
        opacity: 0.8;
      }

      .summarize-page-btn {
        background: #f0f4f9;
        color: #1f1f1f;
        border: 1px solid #c4c7c5;
        padding: 10px 20px;
        border-radius: 100px; /* Capsule shape */
        font-weight: 500;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .summarize-page-btn:hover {
        background: #e1e5ea;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }

      .chat-history {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex: 1;
        overflow-y: auto;
      }

      /* Less visible scrollbar */
      .chat-history::-webkit-scrollbar {
        width: 6px;
      }

      .chat-history::-webkit-scrollbar-track {
        background: transparent;
      }

      .chat-history::-webkit-scrollbar-thumb {
        background: #e0e0e0;
        border-radius: 3px;
      }

      .chat-history::-webkit-scrollbar-thumb:hover {
        background: #d0d0d0;
      }

      .chat-message {
        max-width: 85%;
        padding: 12px 16px;
        font-size: 14px;
        line-height: 1.6;
      }

      .chat-message.user {
        background: #f1f3f4;
        color: #202124;
        align-self: flex-end;
        border-radius: 18px 18px 4px 18px;
      }

      .chat-message.assistant {
        background: transparent;
        color: #202124;
        align-self: flex-start;
        padding-left: 0;
        max-width: 100%;
      }

      .message-content h1, .message-content h2, .message-content h3 {
        margin: 16px 0 8px 0;
        color: #202124;
        font-weight: 600;
      }

      .message-content p {
        margin-bottom: 12px;
      }

      .message-content ul, .message-content ol {
        margin: 8px 0;
        padding-left: 20px;
      }

      .message-content li {
        margin-bottom: 6px;
      }

      .chat-input-container {
        padding: 20px;
        background: #fafafa;
        border-top: 1px solid #e0e0e0;
      }

      .chat-input-wrapper {
        display: flex;
        flex-direction: row;
        align-items: center;
        background: #f5f5f5;
        border-radius: 12px;
        padding: 14px 18px;
        transition: all 0.2s;
        border: 1px solid #d0d0d0;
        min-height: 52px;
      }

      .chat-input-wrapper:focus-within {
        background: #ffffff;
        border-color: #000000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }

      .chat-input {
        flex: 1;
        border: none;
        background: transparent;
        color: #000000;
        font-size: 16px;
        line-height: 1.5;
        padding: 6px 8px;
        outline: none;
        resize: none;
        max-height: 200px;
        min-height: 24px;
        font-family: inherit;
      }

      .chat-input::placeholder {
        color: #757575;
        font-weight: 400;
      }


      .send-btn {
        background: #ffffff;
        color: #000000;
        border: 2px solid #000000;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
        margin-left: 8px;
      }

      .send-btn.has-content {
        background: #000000;
        color: white;
        border-color: #000000;
      }

      .send-btn:hover:not(:disabled) {
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }

      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .chat-footer-info {
        font-size: 11px;
        color: #757575;
        text-align: center;
        margin-top: 12px;
        opacity: 0.8;
      }

      /* Actions List View */
      .actions-list-view {
        padding: 16px;
        overflow-y: auto;
        height: 100%;
      }

      .action-view-container {
        padding: 16px;
        overflow-y: auto;
        height: 100%;
      }

      .email-tab {
        padding: 16px;
        overflow-y: auto;
        height: 100%;
      }

      /* Subtle scrollbar for all scrollable areas */
      .actions-list-view::-webkit-scrollbar,
      .action-view-container::-webkit-scrollbar,
      .email-tab::-webkit-scrollbar {
        width: 6px;
      }

      .actions-list-view::-webkit-scrollbar-track,
      .action-view-container::-webkit-scrollbar-track,
      .email-tab::-webkit-scrollbar-track {
        background: transparent;
      }

      .actions-list-view::-webkit-scrollbar-thumb,
      .action-view-container::-webkit-scrollbar-thumb,
      .email-tab::-webkit-scrollbar-thumb {
        background: #e0e0e0;
        border-radius: 3px;
      }

      .actions-list-view::-webkit-scrollbar-thumb:hover,
      .action-view-container::-webkit-scrollbar-thumb:hover,
      .email-tab::-webkit-scrollbar-thumb:hover {
        background: #d0d0d0;
      }

      .result-container {
        margin-top: 16px;
        overflow-y: auto;
      }

      .action-card {
        background: white;
        border-radius: 8px;
        padding: 16px;
        border: 1px solid #e5e7eb;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }

      .action-card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .action-icon-bolt {
        color: #f59e0b;
        font-size: 18px;
      }

      .action-card-title {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
      }

      .action-card-subtitle {
        font-size: 13px;
        color: #6b7280;
      }

      .actions-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      }

      .grid-item {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .grid-item:hover {
        border-color: #9ca3af;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        transform: translateY(-1px);
      }

      .grid-icon-container {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .grid-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .bg-black { background: #000; }
      .bg-blue { background: #0084ff; }
      .bg-cyan { background: #00c2ff; }

      .grid-label {
        font-size: 12px;
        font-weight: 600;
        color: #111827;
        text-align: center;
      }

      /* Action Subviews */
      .action-subview {
        padding: 16px;
        height: 100%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }

      /* Subtle scrollbar for action subviews */
      .action-subview::-webkit-scrollbar {
        width: 6px;
      }

      .action-subview::-webkit-scrollbar-track {
        background: transparent;
      }

      .action-subview::-webkit-scrollbar-thumb {
        background: #e0e0e0;
        border-radius: 3px;
      }

      .action-subview::-webkit-scrollbar-thumb:hover {
        background: #d0d0d0;
      }

      .back-to-actions {
        background: transparent;
        border: none;
        color: #111827;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
      }

      .form-container {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }

      .form-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .form-icon {
        font-size: 18px;
      }

      .form-title {
        font-size: 16px;
        font-weight: 700;
        color: #111827;
      }

      .form-subtitle {
        font-size: 13px;
        color: #6b7280;
        margin-bottom: 20px;
      }

      .input-group {
        margin-bottom: 12px;
      }

      .form-label {
        display: block;
        font-size: 11px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 6px;
      }

      .form-input, .form-textarea, .form-select {
        width: 100%;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 10px 12px;
        font-size: 14px;
        color: #111827;
        background: white;
        outline: none;
      }

      .form-textarea {
        min-height: 100px;
        resize: vertical;
      }

      .form-select {
        appearance: auto;
      }

      .submit-btn {
        width: 100%;
        background: #000;
        color: white;
        border: none;
        padding: 14px;
        border-radius: 6px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        margin-top: 8px;
        transition: background 0.2s;
      }

      .submit-btn:hover {
        background: #333;
      }

      .info-box {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #6b7280;
        padding: 12px;
        border-radius: 6px;
        color: white;
        font-size: 13px;
        margin-bottom: 20px;
        line-height: 1.4;
      }

      .info-icon {
        font-size: 16px;
      }

      .result-container {
        margin-top: 20px;
        padding: 16px;
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-size: 13px;
        display: none;
      }

      .result-container.visible {
        display: block;
      }

      /* Scrollbar */
      .tab-content::-webkit-scrollbar {
        width: 6px;
      }
      .tab-content::-webkit-scrollbar-track {
        background: transparent;
      }
      .tab-content::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 10px;
      }
      .tab-content::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.shadowRoot) return;

    // Control buttons
    const minimizeBtn = this.shadowRoot.querySelector('[data-action="minimize"]');
    const closeBtn = this.shadowRoot.querySelector('[data-action="close"]');
    const expandBtn = this.shadowRoot.querySelector('[data-action="expand"]');

    minimizeBtn?.addEventListener("click", () => {
      this.isMinimized = true;
      this.render();
    });

    closeBtn?.addEventListener("click", () => this.close());
    expandBtn?.addEventListener("click", () => {
      this.isMinimized = false;
      this.render();
    });

    // Tab buttons
    this.shadowRoot.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const tabName = target.getAttribute("data-tab") as PanelTab;
        if (tabName) {
          this.currentTab = tabName;
          this.prefilledText = ""; // Clear prefilled text when switching tabs
          this.currentActionView = "list"; // Reset action view
          this.render();
        }
      });
    });

    // Action Grid clicks
    this.shadowRoot.querySelectorAll(".grid-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        const view = target.getAttribute("data-view") as any;
        if (view) {
          this.currentActionView = view;
          this.render();
        }
      });
    });

    // Back to actions list
    const backBtn = this.shadowRoot.querySelector('[data-action="back-to-list"]');
    backBtn?.addEventListener("click", () => {
      this.currentActionView = "list";
      this.render();
    });

    // Summarize page button
    const summarizePageBtn = this.shadowRoot.querySelector('[data-action="summarize-page"]');
    summarizePageBtn?.addEventListener("click", () => this.handleSummarizePage());

    // Ask tab - send chat
    const sendChatBtn = this.shadowRoot.querySelector('[data-action="send-chat"]');
    sendChatBtn?.addEventListener("click", () => this.handleSendChat());

    // Chat input auto-resize and state tracking
    const chatInput = this.shadowRoot.querySelector("#chat-input") as HTMLTextAreaElement;
    if (chatInput) {
      // Auto-resize
      const resize = () => {
        chatInput.style.height = "auto";
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
      };

      // Initial resize if content exists
      if (chatInput.value) resize();

      chatInput.addEventListener("input", () => {
        this.draftText = chatInput.value; // Persist state
        resize();

        // Update send button state
        const sendBtn = this.shadowRoot?.querySelector("#send-btn");
        if (sendBtn) {
          if (chatInput.value.trim().length > 0) {
            sendBtn.classList.add("has-content");
          } else {
            sendBtn.classList.remove("has-content");
          }
        }
      });

      // Handle Enter key to send
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSendChat();
        }
      });
    }

    // Submit actions
    const submitTaskBtn = this.shadowRoot.querySelector('[data-action="submit-task"]');
    submitTaskBtn?.addEventListener("click", () => this.handleGenerateTask());

    const submitScrapeBtn = this.shadowRoot.querySelector('[data-action="submit-scrape"]');
    submitScrapeBtn?.addEventListener("click", () => this.handleScrapeURL());

    const submitEnrichBtn = this.shadowRoot.querySelector('[data-action="submit-enrich"]');
    submitEnrichBtn?.addEventListener("click", () => this.handleEnrichData());

    // Email tab - generate email
    const generateEmailBtn = this.shadowRoot.querySelector('[data-action="generate-email"]');
    generateEmailBtn?.addEventListener("click", () => this.handleGenerateEmail());
  }

  /**
   * Handle summarize page
   */
  private async handleSummarizePage(): Promise<void> {
    const welcomeContainer = this.shadowRoot?.querySelector(".welcome-container") as HTMLElement;
    if (welcomeContainer) welcomeContainer.style.display = "none";

    // Add user message to history
    this.chatHistory.push({ role: "user", content: "Please summarize this page." });

    // Add temporary loading message
    this.chatHistory.push({ role: "assistant", content: "..." });
    this.render();

    try {
      const context = document.body.innerText.slice(0, 15000);
      const response = await API.chatWithAI("Please summarize this page.", context);

      this.chatHistory.pop(); // Remove loading message
      this.chatHistory.push({ role: "assistant", content: response });
      this.render();

      const chatHistory = this.shadowRoot?.querySelector("#chat-history");
      if (chatHistory) {
        setTimeout(() => {
          chatHistory.scrollTo({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      }
    } catch (error) {
      console.error("Summarize failed:", error);
      this.chatHistory.pop(); // Remove loading message
      this.chatHistory.push({
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to summarize page"}`
      });
      this.render();
    }
  }

  /**
   * Handle send chat
   */
  private async handleSendChat(): Promise<void> {
    const input = this.shadowRoot?.querySelector("#chat-input") as HTMLTextAreaElement;
    if (!input || !input.value.trim()) return;

    const welcomeContainer = this.shadowRoot?.querySelector(".welcome-container") as HTMLElement;
    if (welcomeContainer) welcomeContainer.style.display = "none";

    const userMessage = input.value.trim();
    input.value = "";
    this.prefilledText = "";
    this.draftText = ""; // Clear draft

    // Reset send button state
    const sendBtn = this.shadowRoot?.querySelector("#send-btn");
    if (sendBtn) sendBtn.classList.remove("has-content");


    // Add user message to history
    this.chatHistory.push({ role: "user", content: userMessage });

    // Add temporary loading message
    this.chatHistory.push({ role: "assistant", content: "..." });
    this.render();

    try {
      // Get page context
      const context = document.body.innerText.slice(0, 12000);

      // Call API
      const response = await API.chatWithAI(userMessage, context);

      // Remove loading message and add real response
      this.chatHistory.pop();
      this.chatHistory.push({ role: "assistant", content: response });
      this.render();

      // Smooth scroll to bottom
      const chatHistory = this.shadowRoot?.querySelector("#chat-history");
      if (chatHistory) {
        setTimeout(() => {
          chatHistory.scrollTo({
            top: chatHistory.scrollHeight,
            behavior: 'smooth'
          });
        }, 50);
      }
    } catch (error) {
      console.error("Chat flow failed:", error);
      this.chatHistory.pop(); // Remove loading message
      this.chatHistory.push({
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to get response from AI"}`
      });
      this.render();
    }
  }

  /**
   * Handle generate task
   */
  private async handleGenerateTask(): Promise<void> {
    const titleInput = this.shadowRoot?.querySelector("#task-title") as HTMLInputElement;
    const descInput = this.shadowRoot?.querySelector("#task-description") as HTMLTextAreaElement;
    const toolSelect = this.shadowRoot?.querySelector("#task-tool") as HTMLSelectElement;
    const prioritySelect = this.shadowRoot?.querySelector("#task-priority") as HTMLSelectElement;
    const resultContainer = this.shadowRoot?.querySelector("#task-result");

    if (!titleInput || !descInput || !resultContainer) return;

    // Get the values
    const selectedTool = toolSelect?.value || "notion";
    const selectedPriority = prioritySelect?.value || "medium";

    try {
      resultContainer.innerHTML = '<div class="loading">Generating task...</div>';
      resultContainer.classList.add("visible");

      const result = await API.generateTask(
        descInput.value.trim(),
        selectedTool,
        titleInput.value.trim(),
        selectedPriority
      );

      resultContainer.innerHTML = `
        <div class="result-item" style="margin-bottom: 12px;">
          <div style="font-weight: 700; font-size: 11px; color: #6b7280; margin-bottom: 4px;">TASK CREATED</div>
          <div style="font-size: 14px; font-weight: 600;">${this.escapeHtml(result.title)}</div>
          <div style="font-size: 13px; color: #4b5563; margin-top: 4px;">${this.escapeHtml(result.description)}</div>
          <div style="font-size: 11px; margin-top: 8px; color: ${result.syncStatus?.synced ? '#10b981' : '#ef4444'}; font-weight: 700;">
            ${this.escapeHtml(result.syncStatus?.message || "Not synced")}
          </div>
        </div>
      `;
    } catch (error) {
      this.showError("Failed to generate task");
      resultContainer.innerHTML = '<div class="error">Failed to generate task</div>';
    }
  }

  /**
   * Handle scrape URL
   */
  private async handleScrapeURL(): Promise<void> {
    const input = this.shadowRoot?.querySelector("#scrape-url") as HTMLInputElement;
    const resultContainer = this.shadowRoot?.querySelector("#scrape-result");

    if (!input || !resultContainer) return;

    // Use current page URL if input is empty
    const urlToScrape = input.value.trim() || window.location.href;

    try {
      resultContainer.innerHTML = '<div class="loading">Scraping URL...</div>';
      resultContainer.classList.add("visible");

      const result = await API.scrapeURL(urlToScrape);

      const data = result.data || {};
      const keyInsights = (data.key_insights || []).map((point: string) => `<li>${this.escapeHtml(point)}</li>`).join("");

      // Format structured data as a small table/list if exists
      let structuredDataHtml = "";
      if (data.structured_data && Object.keys(data.structured_data).length > 0) {
        structuredDataHtml = `<div style="margin-top: 12px; border-top: 1px solid #e5e7eb; padding-top: 8px;">`;
        for (const [key, value] of Object.entries(data.structured_data)) {
          if (Array.isArray(value) && value.length > 0) {
            structuredDataHtml += `
                    <div style="margin-bottom: 4px;">
                        <span style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: #6b7280;">${this.escapeHtml(key.replace(/_/g, " "))}:</span>
                        <span style="font-size: 12px; color: #374151;">${this.escapeHtml(value.join(", "))}</span>
                    </div>`;
          }
        }
        structuredDataHtml += `</div>`;
      }

      const sentimentColor =
        data.sentiment?.toLowerCase().includes("positive") ? "#10b981" :
          data.sentiment?.toLowerCase().includes("negative") ? "#ef4444" :
            data.sentiment?.toLowerCase().includes("suspicious") ? "#f59e0b" : "#6b7280";

      // Trust score visualization
      const trustScore = data.trust_score || 50;
      const trustColor = trustScore >= 80 ? "#10b981" : trustScore >= 60 ? "#3b82f6" : trustScore >= 40 ? "#f59e0b" : "#ef4444";
      const trustLabel = trustScore >= 80 ? "Highly Credible" : trustScore >= 60 ? "Moderately Credible" : trustScore >= 40 ? "Low Credibility" : "Very Low Credibility";

      // Fraud indicators
      const fraudIndicators = (data.fraud_indicators || []).map((indicator: string) =>
        `<li style="color: #dc2626;">${this.escapeHtml(indicator)}</li>`
      ).join("");

      const redFlags = (data.red_flags || []).map((flag: string) =>
        `<li style="color: #ea580c;">${this.escapeHtml(flag)}</li>`
      ).join("");

      const warningSection = (fraudIndicators || redFlags) ? `
        <div style="margin-top: 12px; padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px;">
          <div style="font-weight: 700; font-size: 11px; color: #dc2626; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
            ⚠️ SECURITY WARNINGS
          </div>
          ${fraudIndicators ? `<div style="font-weight: 600; font-size: 10px; color: #991b1b; margin-bottom: 2px;">FRAUD INDICATORS:</div><ul style="margin: 0; padding-left: 16px; font-size: 11px;">${fraudIndicators}</ul>` : ""}
          ${redFlags ? `<div style="font-weight: 600; font-size: 10px; color: #9a3412; margin-top: 6px; margin-bottom: 2px;">RED FLAGS:</div><ul style="margin: 0; padding-left: 16px; font-size: 11px;">${redFlags}</ul>` : ""}
        </div>
      ` : "";

      resultContainer.innerHTML = `
        <div class="result-item">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div style="font-weight: 700; font-size: 11px; color: #6b7280;">SCRAPE SUMMARY</div>
            <div style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #f3f4f6; color: #4b5563;">
              ${this.escapeHtml(data.category || "General")}
            </div>
          </div>
          
          <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">${this.escapeHtml(result.title)}</div>
          
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <div style="flex: 1; background: #f3f4f6; border-radius: 6px; padding: 8px;">
              <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px;">TRUST SCORE</div>
              <div style="font-size: 16px; font-weight: 700; color: ${trustColor};">${trustScore}/100</div>
              <div style="font-size: 9px; color: #6b7280;">${trustLabel}</div>
            </div>
            <div style="flex: 1; background: #f3f4f6; border-radius: 6px; padding: 8px;">
              <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px;">SENTIMENT</div>
              <div style="font-size: 14px; font-weight: 700; color: ${sentimentColor};">${this.escapeHtml(data.sentiment || "Neutral")}</div>
            </div>
          </div>

          ${warningSection}
          
          <div style="font-size: 13px; color: #374151; line-height: 1.5; margin-bottom: 12px; margin-top: 12px;">
            ${this.escapeHtml(data.executive_summary || "No summary available.")}
          </div>

          <div style="font-weight: 600; font-size: 11px; color: #4b5563; margin-bottom: 4px;">KEY INSIGHTS</div>
          <ul style="margin-top: 4px; font-size: 12px; color: #4b5563; padding-left: 16px; margin-bottom: 12px;">
            ${keyInsights}
          </ul>

          ${data.credibility_assessment ? `
            <div style="margin-top: 12px; padding: 8px; background: #f9fafb; border-radius: 4px; border-left: 3px solid ${trustColor};">
              <div style="font-size: 10px; font-weight: 600; color: #6b7280; margin-bottom: 2px;">CREDIBILITY ASSESSMENT</div>
              <div style="font-size: 12px; color: #374151;">${this.escapeHtml(data.credibility_assessment)}</div>
            </div>
          ` : ""}

          ${structuredDataHtml}
        </div>
      `;
    } catch (error) {
      this.showError("Failed to scrape URL");
      resultContainer.innerHTML = '<div class="error">Failed to scrape URL</div>';
    }
  }

  /**
   * Handle enrich data
   */
  private async handleEnrichData(): Promise<void> {
    const input = this.shadowRoot?.querySelector("#enrich-input") as HTMLTextAreaElement;
    const resultContainer = this.shadowRoot?.querySelector("#enrich-result");

    if (!resultContainer) return;

    // Use page title if input is empty
    const textToEnrich = input?.value.trim() || document.title || window.location.href;

    try {
      resultContainer.innerHTML = '<div class="loading">Enriching information...</div>';
      resultContainer.classList.add("visible");

      const result = await API.enrichData(textToEnrich);

      const keyPoints = result.keyPoints.map((point) => `<li>${this.escapeHtml(point)}</li>`).join("");

      const profiles = result.social_profiles || {};
      const socialLinks = [];
      if (profiles.linkedin) socialLinks.push(`<a href="${this.escapeHtml(profiles.linkedin)}" target="_blank" style="color: #0077b5; text-decoration: none; margin-right: 8px;">LinkedIn</a>`);
      if (profiles.twitter) socialLinks.push(`<a href="${this.escapeHtml(profiles.twitter)}" target="_blank" style="color: #1da1f2; text-decoration: none; margin-right: 8px;">Twitter</a>`);
      if (profiles.github) socialLinks.push(`<a href="${this.escapeHtml(profiles.github)}" target="_blank" style="color: #333; text-decoration: none; margin-right: 8px;">GitHub</a>`);
      if (result.website) socialLinks.push(`<a href="${this.escapeHtml(result.website)}" target="_blank" style="color: #4b5563; text-decoration: none; margin-right: 8px;">Website</a>`);

      resultContainer.innerHTML = `
        <div class="result-item">
          <div style="font-weight: 700; font-size: 11px; color: #6b7280; margin-bottom: 4px;">ENRICHED PROFILE</div>
          <div style="font-size: 14px; font-weight: 700;">${this.escapeHtml(result.name)}</div>
          <div style="font-size: 13px; color: #111827; margin-bottom: 2px;">${this.escapeHtml(result.role)} at ${this.escapeHtml(result.company)}</div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">📍 ${this.escapeHtml(result.location || "Location unknown")}</div>
          
          <div style="font-size: 13px; color: #374151; line-height: 1.4; margin-bottom: 12px; font-style: italic;">
            ${this.escapeHtml(result.bio || "")}
          </div>

          ${result.email ? `<div style="font-size: 13px; color: #3b82f6; margin-bottom: 8px;">📧 ${this.escapeHtml(result.email)}</div>` : ""}
          
          ${socialLinks.length > 0 ? `<div style="font-size: 12px; margin-bottom: 12px;">${socialLinks.join("")}</div>` : ""}

          <div style="font-weight: 600; font-size: 11px; color: #4b5563; margin-bottom: 4px;">KEY HIGHLIGHTS</div>
          <ul style="margin-top: 4px; font-size: 12px; color: #4b5563; padding-left: 16px;">
            ${keyPoints}
          </ul>
        </div>
      `;
    } catch (error) {
      this.showError("Failed to enrich data");
      resultContainer.innerHTML = '<div class="error">Failed to enrich data</div>';
    }
  }

  /**
   * Handle generate email
   */
  private async handleGenerateEmail(): Promise<void> {
    const contextInput = this.shadowRoot?.querySelector("#email-context") as HTMLTextAreaElement;
    const toneSelect = this.shadowRoot?.querySelector("#email-tone") as HTMLSelectElement;
    const resultContainer = this.shadowRoot?.querySelector("#email-result");

    if (!contextInput || !contextInput.value.trim() || !toneSelect || !resultContainer) return;

    try {
      resultContainer.innerHTML = '<div class="loading">Drafting email...</div>';
      resultContainer.classList.add("visible");

      const result = await API.generateEmail(contextInput.value.trim(), toneSelect.value);

      resultContainer.innerHTML = `
        <div class="result-item">
          <div style="font-weight: 700; font-size: 11px; color: #6b7280; margin-bottom: 12px;">EMAIL DRAFT</div>
          
          <div class="input-group" style="margin-bottom: 8px;">
            <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px;">To:</label>
            <input type="email" id="email-to" class="form-input" placeholder="recipient@example.com" style="width: 100%;">
          </div>

          <div class="input-group" style="margin-bottom: 8px;">
            <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px;">Subject:</label>
            <input type="text" id="email-subject" class="form-input" value="${this.escapeHtml(result.subject)}" style="width: 100%;">
          </div>

          <div class="input-group" style="margin-bottom: 12px;">
            <label style="font-size: 11px; font-weight: 600; display: block; margin-bottom: 4px;">Body:</label>
            <textarea id="email-body" class="form-textarea" style="min-height: 120px;">${this.escapeHtml(result.body)}</textarea>
          </div>

          <button id="btn-send-email" class="submit-btn" style="background: #000; color: #fff;">
            Send Email
          </button>
        </div>
      `;

      // Attach listener to new button
      const sendBtn = resultContainer.querySelector("#btn-send-email");
      sendBtn?.addEventListener("click", () => this.handleSendEmail());

    } catch (error) {
      this.showError("Failed to generate email");
      resultContainer.innerHTML = '<div class="error">Failed to generate email</div>';
    }
  }

  /**
   * Handle send email
   */
  private async handleSendEmail(): Promise<void> {
    const resultContainer = this.shadowRoot?.querySelector("#email-result");
    if (!resultContainer) return;

    const toInput = resultContainer.querySelector("#email-to") as HTMLInputElement;
    const subjectInput = resultContainer.querySelector("#email-subject") as HTMLInputElement;
    const bodyInput = resultContainer.querySelector("#email-body") as HTMLTextAreaElement;
    const sendBtn = resultContainer.querySelector("#btn-send-email") as HTMLButtonElement;

    if (!toInput?.value || !subjectInput?.value || !bodyInput?.value) {
      alert("Please fill in all email fields.");
      return;
    }

    if (sendBtn) {
      sendBtn.textContent = "Sending...";
      sendBtn.disabled = true;
      sendBtn.style.opacity = "0.7";
    }

    try {
      await API.sendEmail(toInput.value, subjectInput.value, bodyInput.value);

      resultContainer.innerHTML = `
            <div class="result-item" style="text-align: center; padding: 24px 16px;">
               <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
               <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">Email Sent!</div>
               <div style="font-size: 13px; color: #6b7280;">Your email has been successfully sent via SMTP2GO.</div>
               <button class="submit-btn" style="margin-top: 16px; background: #f3f4f6; color: #1f2937; border: 1px solid #e5e7eb;" onclick="this.closest('.result-item').remove()">Close</button>
            </div>
          `;
    } catch (error) {
      console.error(error);
      alert("Failed to send email. Check console for details.");
      if (sendBtn) {
        sendBtn.textContent = "Send Email";
        sendBtn.disabled = false;
        sendBtn.style.opacity = "1";
      }
    }
  }

  private showError(message: string): void {
    console.error(message);
  }

  private showSuccess(message: string): void {
    console.log(message);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Simple markdown to HTML renderer for clean AI responses
   */
  private renderMarkdown(text: string): string {
    if (!text) return "";

    // First, escape HTML to prevent XSS
    let html = this.escapeHtml(text);

    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/(^|[^\*])\*(?!\*)(.*?)\*(?!\*)([^\*]|$)/g, '$1<em>$2</em>$3');

    // Headers: ###, ##, #
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Horizontal rule: ===, ---
    html = html.replace(/^[\-=]{3,}$/gm, '<hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 12px 0;">');

    // Bullet points: * or - at start of line
    // Handle multiple bullets by capturing groups
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li>$1</li>');

    // Numbered lists: 1. at start of line
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, '<li>$1</li>');

    // Group adjacent <li> items into <ul>
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // Line breaks to paragraphs (excluding inside headers/lists)
    const lines = html.split('\n');
    html = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br>';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<hr')) {
        return trimmed;
      }
      return `<p>${trimmed}</p>`;
    }).join("");

    return html;
  }
}
