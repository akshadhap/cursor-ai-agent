/**
 * Spinabot AI Panel V2 - Premium Production Version
 * High-standard UI with comprehensive features
 */

export class SidePanel {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private activeTab: 'ask' | 'actions' | 'email' | 'settings' = 'ask';
  private activeAction: 'task' | 'scrape' | 'enrich' | null = null;
  private isVisible: boolean = false;
  private selectedText: string = ''; // Store selected text for auto-fill

  constructor() {
    this.createPanel();
    this.setupMessageListener();
  }

  private setupMessageListener() {
    // Listen for messages from background script
    chrome.runtime?.onMessage.addListener((message, _sender, _sendResponse) => {
      if (message.type === 'OPEN_PANEL') {
        this.open();
        if (message.tab) this.switchTab(message.tab);
      }
    });
  }

  /**
   * Create the premium side panel UI
   */
  private createPanel() {
    this.container = document.createElement('div');
    this.container.id = 'spinabot-ai-panel';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      z-index: 2147483647;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Inject premium styles
    const style = document.createElement('style');
    style.textContent = this.getPremiumStyles();
    this.shadowRoot.appendChild(style);

    // Create main panel structure
    const panel = document.createElement('div');
    panel.className = 'spinabot-panel';
    panel.innerHTML = this.getPanelHTML();

    this.shadowRoot.appendChild(panel);
    document.body.appendChild(this.container);

    // Start panel hidden (off-screen to the right)
    this.container.style.transform = 'translateX(100%)';

    // Attach event listeners
    this.attachEventListeners();

    // Render initial content
    this.renderContent();
  }

  private getPremiumStyles(): string {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :host {
        /* Black & White Theme */
        --primary: #000000;
        --primary-dark: #1a1a1a;
        --primary-light: #333333;
        --secondary: #666666;
        --bg: #ffffff;
        --bg-alt: #f5f5f5;
        --bg-hover: #e5e5e5;
        --text: #000000;
        --text-muted: #666666;
        --text-light: #999999;
        --border: #e0e0e0;
        --border-light: #f0f0f0;
        --success: #000000;
        --error: #000000;
        --warning: #000000;
        --shadow: rgba(0, 0, 0, 0.1);
        --shadow-lg: rgba(0, 0, 0, 0.15);
        --radius: 8px;
        --radius-sm: 4px;
        --radius-lg: 12px;
      }

      .spinabot-panel {
        width: 100%;
        height: 100%;
        background: var(--bg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* ===== HEADER ===== */
      .panel-header {
        padding: 20px 24px;
        background: var(--primary);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
        position: relative;
        z-index: 10;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .brand-icon {
        width: 36px;
        height: 36px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border-radius: var(--radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }

      .brand-text h1 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }

      .brand-text p {
        font-size: 11px;
        opacity: 0.9;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }

      .icon-btn {
        width: 32px;
        height: 32px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        border-radius: var(--radius-sm);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .icon-btn:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.05);
      }

      /* ===== TABS ===== */
      .panel-tabs {
        display: flex;
        background: var(--bg);
        border-bottom: 2px solid var(--border-light);
        padding: 0 16px;
        gap: 4px;
      }

      .tab {
        flex: 1;
        padding: 14px 12px;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .tab:hover {
        color: var(--text);
        background: var(--bg-hover);
      }

      .tab.active {
        color: var(--primary);
      }

      .tab.active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 3px;
        background: var(--primary);
        border-radius: 3px 3px 0 0;
      }

      .tab-icon {
        font-size: 16px;
      }

      /* ===== CONTENT AREA ===== */
      .panel-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 24px;
        background: var(--bg-alt);
      }

      .panel-content::-webkit-scrollbar {
        width: 6px;
      }

      .panel-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .panel-content::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 3px;
      }

      .panel-content::-webkit-scrollbar-thumb:hover {
        background: var(--text-light);
      }

      /* ===== CARDS ===== */
      .card {
        background: var(--bg);
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 16px;
        border: 1px solid var(--border);
        transition: all 0.2s;
      }

      .card:hover {
        border-color: var(--primary-light);
        box-shadow: 0 4px 12px var(--shadow);
      }

      .card-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 8px;
      }

      .card-description {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 16px;
        line-height: 1.5;
      }

      /* ===== BUTTONS ===== */
      .btn {
        width: 100%;
        padding: 12px 20px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--radius-sm);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        background: var(--primary-dark);
      }

      .btn:active {
        transform: translateY(0);
      }

      .btn-secondary {
        background: var(--bg);
        color: var(--text);
        border: 1px solid var(--border);
        box-shadow: none;
      }

      .btn-secondary:hover {
        background: var(--bg-hover);
        border-color: var(--primary);
      }

      .btn-small {
        padding: 8px 16px;
        font-size: 13px;
      }

      /* ===== INPUTS ===== */
      .input-group {
        margin-bottom: 16px;
      }

      .label {
        display: block;
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      input, textarea, select {
        width: 100%;
        padding: 12px 14px;
        background: var(--bg);
        border: 1.5px solid var(--border);
        border-radius: var(--radius-sm);
        font-size: 14px;
        color: var(--text);
        font-family: inherit;
        transition: all 0.2s;
      }

      input:focus, textarea:focus, select:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.1);
      }

      textarea {
        resize: vertical;
        min-height: 80px;
        line-height: 1.5;
      }

      /* ===== ACTION GRID ===== */
      .action-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      }

      .action-card {
        background: var(--bg);
        border: 2px solid var(--border);
        border-radius: var(--radius);
        padding: 20px 12px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }

      .action-card:hover {
        border-color: var(--primary);
        background: var(--bg-hover);
        transform: translateY(-4px);
        box-shadow: 0 8px 16px var(--shadow);
      }

      .action-card.active {
        border-color: var(--primary);
        background: var(--bg-hover);
      }

      .action-icon {
        width: 48px;
        height: 48px;
        background: var(--primary);
        color: white;
        border-radius: var(--radius);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }

      .action-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }

      /* ===== LOADING ===== */
      .loading {
        text-align: center;
        padding: 40px 20px;
      }

      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--border-light);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 16px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .loading-text {
        font-size: 14px;
        color: var(--text-muted);
      }

      /* ===== RESULT BOX ===== */
      .result-box {
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        margin-top: 16px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--text);
      }

      .result-box pre {
        background: var(--bg-alt);
        padding: 12px;
        border-radius: var(--radius-sm);
        overflow-x: auto;
        font-size: 12px;
      }

      /* ===== CHAT ===== */
      .chat-messages {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 16px;
        max-height: 400px;
        overflow-y: auto;
      }

      .message {
        padding: 12px 16px;
        border-radius: var(--radius);
        max-width: 85%;
        font-size: 14px;
        line-height: 1.5;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .message.user {
        background: linear-gradient(135deg, var(--primary), var(--secondary));
        color: white;
        align-self: flex-end;
        border-bottom-right-radius: 4px;
      }

      .message.ai {
        background: var(--bg);
        border: 1px solid var(--border);
        align-self: flex-start;
        border-bottom-left-radius: 4px;
      }

      /* ===== SUCCESS/ERROR MESSAGES ===== */
      .alert {
        padding: 12px 16px;
        border-radius: var(--radius-sm);
        margin-bottom: 16px;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .alert-success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }

      .alert-error {
        background: #fef2f2;
        background-color: #ecfdf5;
        color: #047857;
      }

      .alert-error {
        background-color: #fef2f2;
        color: #b91c1c;
      }
      
      .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid var(--border);
        border-top-color: var(--primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 0.5rem;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .loading { text-align: center; padding: 2rem; }
      .loading-text { font-size: 0.875rem; color: var(--muted-foreground); }
      .hidden { display: none; }
      .mb-4 { margin-bottom: 1rem; }
      .mt-4 { margin-top: 1rem; }
    `;
  }

  private getPanelHTML(): string {
    return `
      <div class="panel-header">
        <div class="brand">
          <div class="brand-icon">✨</div>
          <div class="brand-text">
            <h1>Spinabot</h1>
            <p>AI Assistant</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-btn" id="minimize-btn" title="Minimize">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="icon-btn" id="close-btn" title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="panel-tabs">
        <button class="tab active" data-tab="ask">
          <span class="tab-icon">💬</span>
          <span>Ask AI</span>
        </button>
        <button class="tab" data-tab="actions">
          <span class="tab-icon">⚡</span>
          <span>Actions</span>
        </button>
        <button class="tab" data-tab="email">
          <span class="tab-icon">✉️</span>
          <span>Email</span>
        </button>
      </div>

      <div class="panel-content" id="panel-content">
        <!-- Dynamic content will be rendered here -->
      </div>
    `;
  }

  private attachEventListeners() {
    // Tab switching
    const tabs = this.shadowRoot?.querySelectorAll('.tab');
    tabs?.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.activeTab = (e.currentTarget as HTMLElement).dataset.tab as any;
        this.renderContent();
      });
    });

    // Close/minimize buttons
    this.shadowRoot?.getElementById('close-btn')?.addEventListener('click', () => this.close());
    this.shadowRoot?.getElementById('minimize-btn')?.addEventListener('click', () => this.minimize());
  }

  private renderContent() {
    const content = this.shadowRoot?.getElementById('panel-content');
    if (!content) return;

    content.innerHTML = '';
    content.classList.add('fade-in');

    switch (this.activeTab) {
      case 'ask':
        this.renderAskTab(content);
        break;
      case 'actions':
        this.renderActionsTab(content);
        break;
      case 'email':
        this.renderEmailTab(content);
        break;
    }
  }

  // ===== TAB RENDERERS =====

  private renderAskTab(container: HTMLElement) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; position: relative;">
        <div class="chat-messages" id="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; padding-bottom: 20px; display: flex; flex-direction: column; gap: 16px;">
          <!-- Intro State -->
          <div id="chat-intro" style="text-align: center; padding: 40px 20px; color: var(--muted-foreground); margin-top: auto; margin-bottom: auto;">
            <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
            <h3 style="font-size: 18px; font-weight: 600; color: var(--foreground); margin-bottom: 8px;">Hi, I'm Spinabot</h3>
            <p style="font-size: 14px; margin-bottom: 24px; line-height: 1.5;">
              I'm reading the current page. Ask me to summarize it, find specific details, or answer questions.
            </p>
            <button class="btn btn-secondary" id="summarize-page-btn" style="width: auto; margin: 0 auto; display: inline-flex; background: var(--secondary); color: var(--secondary-foreground); border: 1px solid var(--border);">
              <span style="font-size: 16px;">📝</span> Summarize This Page
            </button>
          </div>
        </div>

        <div style="padding: 12px 16px 16px; border-top: 1px solid var(--border); background: var(--background);">
          <div style="position: relative; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); overflow: hidden; transition: border-color 0.2s;">
            <textarea id="chat-input" 
              placeholder="Ask about this page..." 
              rows="1" 
              style="
                width: 100%;
                padding: 12px 48px 12px 12px; 
                resize: none; 
                overflow-y: auto; 
                min-height: 46px; 
                max-height: 150px;
                border: none;
                background: transparent;
                font-size: 14px;
                line-height: 1.5;
                color: var(--foreground);
                display: block;
              "
            ></textarea>
            <button id="send-chat-btn" style="
              position: absolute; 
              right: 6px; 
              bottom: 6px; 
              width: 32px; 
              height: 32px; 
              border-radius: var(--radius-sm); 
              background: #18181b; 
              color: #ffffff; 
              border: none; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              cursor: pointer;
              transition: opacity 0.2s;
              z-index: 10;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          <div style="font-size: 10px; color: var(--muted-foreground); text-align: center; margin-top: 8px;">
            AI can make mistakes. Check important info.
          </div>
        </div>
      </div>
    `;

    // Event listeners
    container.querySelector('#summarize-page-btn')?.addEventListener('click', () => {
      this.handleSummarize();
      // Hide intro after action
      this.hideIntro();
    });

    container.querySelector('#send-chat-btn')?.addEventListener('click', () => this.handleChat());

    // Enter to send & Auto-resize
    const input = container.querySelector('#chat-input') as HTMLTextAreaElement;
    if (input) {
      input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleChat();
        }
      });

      input.addEventListener('input', function () {
        this.style.height = 'auto'; // Reset height
        this.style.height = Math.min(this.scrollHeight, 150) + 'px'; // Grow up to 150px
      });

      // Auto-focus
      input.focus();
    }
  }

  private hideIntro() {
    const intro = this.shadowRoot?.getElementById('chat-intro');
    if (intro) intro.style.display = 'none';
  }

  private renderActionsTab(container: HTMLElement) {
    if (this.activeAction) {
      this.renderActionForm(container, this.activeAction);
    } else {
      container.innerHTML = `
        <div class="card">
          <div class="card-title">⚡ Choose an Action</div>
          <div class="card-description">Select what you'd like to do</div>
        </div>

        <div class="action-grid">
          <div class="action-card" data-action="task">
            <div class="action-icon">📋</div>
            <div class="action-label">Create Task</div>
          </div>
          <div class="action-card" data-action="scrape">
            <div class="action-icon">🌐</div>
            <div class="action-label">Scrape Link</div>
          </div>
          <div class="action-card" data-action="enrich">
            <div class="action-icon">💎</div>
            <div class="action-label">Enrich Info</div>
          </div>
        </div>
      `;

      // Action card listeners
      container.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', (e) => {
          this.activeAction = (e.currentTarget as HTMLElement).dataset.action as any;
          this.renderContent();
        });
      });
    }
  }

  private renderActionForm(container: HTMLElement, action: string) {
    let formHTML = `
      <button class="btn btn-secondary btn-small mb-16" id="back-to-actions">
        ← Back to Actions
      </button>
    `;

    if (action === 'task') {
      formHTML += `
        <div class="card">
          <div class="card-title">📋 Create Task</div>
          <div class="input-group">
            <label class="label">Task Title</label>
            <input type="text" id="task-title" placeholder="Enter task title...">
          </div>
          <div class="input-group">
            <label class="label">Description</label>
            <textarea id="task-desc" placeholder="Describe the task..." rows="4"></textarea>
          </div>
          <div class="input-group">
            <label class="label">Create In</label>
            <select id="task-tool">
              <option value="notion">Notion</option>
              <option value="jira">Jira</option>
              <option value="slack">Slack</option>
            </select>
          </div>
          <button class="btn" id="create-task-btn">Create Task</button>
        </div>
        <div id="task-result"></div>
      `;
    } else if (action === 'scrape') {
      formHTML += `
        <div class="card">
          <div class="card-title">🌐 Scrape Link</div>
          <div class="card-description">Extract data from any webpage</div>
          <div class="input-group">
            <label class="label">URL (leave empty for current page)</label>
            <input type="text" id="scrape-url" placeholder="https://example.com">
          </div>
          <div style="background: var(--secondary); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--muted-foreground);">
              <strong>🌐 Scraping Tool:</strong> Scraping Dog (Dedciated API & Basic Fallback)
            </div>
          </div>
          <button class="btn" id="scrape-btn">Scrape Data</button>
        </div>
        <div id="scrape-result" class="result-box hidden"></div>
      `;
    } else if (action === 'enrich') {
      formHTML += `
        <div class="card">
          <div class="card-title">💎 Enrich Lead Information</div>
          <div class="card-description">Get detailed insights about a person or company</div>
          <div class="input-group">
            <label class="label">Context / Bio</label>
          <textarea id="enrich-text" placeholder="Paste bio or text to enrich..." rows="5">${this.selectedText || ''}</textarea>
          <div style="font-size: 11px; color: var(--muted-foreground); margin-top: 4px;">Leave empty to search based on page title/URL data.</div>
          </div>
          <div style="background: var(--secondary); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--muted-foreground);">
              <strong>💎 Enrichment Tool:</strong> SERP API (Web search & data enrichment)
            </div>
          </div>
          <button class="btn" id="enrich-btn">Enrich Profile</button>
        </div>
        <div id="enrich-result" class="result-box hidden"></div>
      `;
    }

    container.innerHTML = formHTML;

    // Back button
    container.querySelector('#back-to-actions')?.addEventListener('click', () => {
      this.activeAction = null;
      this.renderContent();
    });

    // Action-specific listeners
    if (action === 'task') {
      container.querySelector('#create-task-btn')?.addEventListener('click', () => this.handleCreateTask());
    } else if (action === 'scrape') {
      container.querySelector('#scrape-btn')?.addEventListener('click', () => this.handleScrape());
    } else if (action === 'enrich') {
      container.querySelector('#enrich-btn')?.addEventListener('click', () => this.handleEnrich());
    }
  }

  private renderEmailTab(container: HTMLElement) {
    container.innerHTML = `
      <button class="btn btn-secondary mb-4" id="back-to-actions">
        ← Back
      </button>
      <div class="card">
        <div class="card-title">✉️ Draft Email</div>
        <div class="card-description">Auto-generate an email from context</div>
        
        <div class="input-group">
          <label class="label">Tone</label>
          <select id="email-tone">
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="persuasive">Persuasive</option>
          </select>
        </div>
        <div class="input-group">
          <label class="label">Context / Points</label>
          <textarea id="email-context" placeholder="What should the email be about?" rows="5">${this.selectedText || ''}</textarea>
        </div>
        <button class="btn" id="generate-email-btn">✨ Generate Draft</button>
      </div>
      <div id="email-result" class="hidden result-box"></div>
    `;

    container.querySelector('#generate-email-btn')?.addEventListener('click', () => this.handleGenerateEmail());
    container.querySelector('#back-to-actions')?.addEventListener('click', () => {
      this.activeTab = 'actions'; // Assuming 'actions' is the previous tab or a default
      this.renderContent();
    });
  }


  // ===== ACTION HANDLERS =====

  private async handleSummarize() {
    const resultDiv = this.shadowRoot?.getElementById('summary-result');
    if (!resultDiv) return;

    resultDiv.classList.remove('hidden');
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Summarizing page...</div></div>';

    try {
      const pageText = document.body.innerText.substring(0, 5000);
      const response = await this.callAPI('summarize', { text: pageText });

      if (response.success) {
        resultDiv.innerHTML = `
          <div class="card">
            <div class="card-title">📝 Summary</div>
            <div class="result-box">${response.data.result}</div>
            <button class="btn btn-secondary mt-16" onclick="navigator.clipboard.writeText('${response.data.result.replace(/'/g, "\\'")}')">
              📋 Copy Summary
            </button>
          </div>
        `;
      } else {
        throw new Error(response.error || 'Failed to summarize');
      }
    } catch (error: any) {
      resultDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
    }
  }

  private async handleChat() {
    const input = this.shadowRoot?.getElementById('chat-input') as HTMLTextAreaElement;
    const messagesDiv = this.shadowRoot?.getElementById('chat-messages');

    if (!input || !messagesDiv || !input.value.trim()) return;

    const userMessage = input.value.trim();
    input.value = '';

    // Hide intro
    this.hideIntro();

    // Add user message
    messagesDiv.innerHTML += `
      <div class="message user" style="align-self: flex-end; background: var(--primary); color: #ffffff; padding: 10px 14px; border-radius: 12px 12px 0 12px; max-width: 85%; margin-bottom: 12px; font-size: 14px; line-height: 1.5; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        ${userMessage}
      </div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Add loading
    const loadingId = 'loading-' + Date.now();
    messagesDiv.innerHTML += `
      <div class="message ai" id="${loadingId}" style="display: flex; gap: 8px;">
        <div style="width: 24px; height: 24px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">✨</div>
        <div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></div>
      </div>`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    // Capture Page Context
    const pageContext = document.body.innerText.substring(0, 10000); // 10k chars context

    try {
      const response = await this.callAPI('chat', {
        text: userMessage,
        context: pageContext
      });

      const loadingMsg = this.shadowRoot?.getElementById(loadingId);

      if (loadingMsg) {
        if (response.success) {
          // Replace loading with content (and keep avatar)
          loadingMsg.innerHTML = `
            <div style="width: 24px; height: 24px; background: var(--primary); color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; margin-top: 2px;">✨</div>
            <div style="flex: 1; min-width: 0; white-space: pre-wrap; line-height: 1.5;">${(response.data.result || "").trim()}</div>
          `;
        } else {
          loadingMsg.innerHTML = `<span style="color:var(--destructive)">Error: ${response.error}</span>`;
        }
      }
    } catch (error: any) {

      const loadingMsg = this.shadowRoot?.getElementById(loadingId);
      if (loadingMsg) {
        loadingMsg.innerHTML = `<span style="color:var(--error)">Error: ${error.message}</span>`;
      }
    }

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  private async handleCreateTask() {
    const title = (this.shadowRoot?.getElementById('task-title') as HTMLInputElement)?.value;
    const desc = (this.shadowRoot?.getElementById('task-desc') as HTMLTextAreaElement)?.value;
    const tool = (this.shadowRoot?.getElementById('task-tool') as HTMLSelectElement)?.value;
    const resultDiv = this.shadowRoot?.getElementById('task-result');

    if (!title || !resultDiv) return;

    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Generating task structure...</div></div>';

    try {
      // Simulate success (or call a simple AI enrichment endpoint if needed)
      // For now, we just present the task beautifully to copy
      await new Promise(resolve => setTimeout(resolve, 800)); // Fake loading

      resultDiv.innerHTML = `
        <div class="alert alert-success">
          ✅ Task prepared for ${tool.charAt(0).toUpperCase() + tool.slice(1)}!
        </div>
        <div class="card">
          <div class="result-box" style="background: var(--muted); border: 1px solid var(--border); padding: 12px; border-radius: var(--radius-sm);">
            <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 13px; color: var(--muted-foreground); white-space: pre-wrap;">${desc}</div>
          </div>
          <button class="btn btn-secondary mt-4" onclick="navigator.clipboard.writeText(\`${title}\\n\\n${desc}\`)">
            📋 Copy to Clipboard
          </button>
        </div>
      `;

    } catch (error: any) {
      resultDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
    }
  }

  private async handleScrape() {
    const url = (this.shadowRoot?.getElementById('scrape-url') as HTMLInputElement)?.value || window.location.href;
    const resultDiv = this.shadowRoot?.getElementById('scrape-result');

    if (!resultDiv) return;

    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Scraping data...</div></div>';

    try {
      // Use 'scrape' action directly, server uses SCRAPING_DOG_API_KEY
      const response = await this.callAPI('scrape', {
        text: url
      });

      if (response.success) {
        const data = response.data.result;

        // Fix: Use simple formatting to prevent HTML structure breakage
        const safeSummary = (data.summary || "No summary available.")
          .replace(/</g, "&lt;").replace(/>/g, "&gt;"); // Basic sanitization

        resultDiv.innerHTML = `
          <div class="alert alert-success" style="margin-bottom: 12px; flex-shrink: 0;">✅ Data scraped successfully!</div>
          
          <div class="card" style="display: flex; flex-direction: column; height: 500px; padding: 0; overflow: hidden;">
            <div style="flex-shrink: 0; padding: 12px 16px 8px 16px; border-bottom: 1px solid var(--border); background: var(--card);">
              <div class="card-title" style="margin: 0;">📝 Summary</div>
            </div>
            
            <div style="
              flex-grow: 1;
              min-height: 0;
              overflow-y: auto; 
              padding: 16px; 
              font-size: 13px; 
              line-height: 1.6; 
              color: var(--card-foreground);
              background: var(--card);
              white-space: pre-wrap;
            ">
${safeSummary}
            </div>
            
            <div style="
              flex-shrink: 0; 
              padding: 12px 16px 16px 16px; 
              border-top: 1px solid var(--border); 
              background: var(--muted);
              z-index: 10;
            ">
              <div class="card-title" style="font-size: 14px; margin-bottom: 8px;">📄 Page Details</div>
              <div style="font-size: 12px; color: var(--muted-foreground); margin-bottom: 4px;"><strong>Title:</strong> ${data.title}</div>
              <div style="font-size: 12px; color: var(--muted-foreground);"><strong>URL:</strong> <a href="${data.url}" target="_blank" style="color: var(--primary); text-decoration: none;">${data.url ? data.url.substring(0, 40) + '...' : 'N/A'}</a></div>
            </div>
            
            <div style="
              flex-shrink: 0; 
              padding: 12px 16px 16px 16px; 
              border-top: 1px solid var(--border); 
              background: var(--muted);
              z-index: 10;
            ">
              <div class="card-title" style="font-size: 14px; margin-bottom: 8px;">📄 Page Details</div>
              <div style="background: var(--bg-alt); padding: 12px; border-radius: var(--radius-sm);">
                <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; line-height: 1.4;">${data.title}</div>
                <a href="${data.url}" target="_blank" style="font-size: 12px; color: var(--primary); text-decoration: none; display: block; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.url}</a>
                <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                  <span>📝 ${data.contentLength} chars</span>
                  <span>🕒 ${new Date(data.scrapedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <button class="btn btn-secondary mt-16" style="width: 100%; margin-top: 12px;" onclick="navigator.clipboard.writeText('${(data.summary || "").replace(/'/g, "\\'")}')">
                📋 Copy Summary
              </button>
            </div>
          </div>
        `;
      } else {
        throw new Error(response.error || 'Failed to scrape');
      }
    } catch (error: any) {
      if (error.message === 'CONTEXT_INVALIDATED') {
        this.showContextInvalidatedError(resultDiv);
      } else {
        this.showError(resultDiv, error.message || 'Failed to scrape');
      }
    }
  }

  private async handleEnrich() {
    const text = (this.shadowRoot?.getElementById('enrich-text') as HTMLTextAreaElement)?.value;
    const resultDiv = this.shadowRoot?.getElementById('enrich-result');

    if (!text || !resultDiv) return;

    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Enriching profile with SERP API...</div></div>';

    try {
      // Use 'enrich' action directly, server uses SERP_API_KEY
      const response = await this.callAPI('enrich', {
        text
      });

      if (response.success) {
        const data = response.data.result;

        let sourcesHtml = '';
        if (data.sources && data.sources.length > 0) {
          sourcesHtml = `
            <div class="card-title" style="margin-top: 16px;">📚 Sources</div>
            <div style="font-size: 11px;">
              ${data.sources.map((s: any) => `
                <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                  <div style="font-weight: 600; margin-bottom: 2px;">${s.title}</div>
                  <a href="${s.link}" target="_blank" style="color: var(--primary); text-decoration: none;">${new URL(s.link).hostname}</a>
                </div>
              `).join('')}
            </div>
          `;
        }

        resultDiv.innerHTML = `
          <div class="alert alert-success">✅ Profile enriched successfully!</div>
          <div class="card">
            <div class="card-title">💎 Enriched Profile</div>
            
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1;">
            <div style="font-size: 11px; color: var(--muted-foreground);">Name</div>
                <div style="font-weight: 600;">${data.name}</div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 11px; color: var(--muted-foreground);">Role</div>
                <div style="font-weight: 600;">${data.role}</div>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 11px; color: var(--muted-foreground);">Company</div>
              <div style="font-weight: 600;">${data.company}</div>
            </div>

            <div class="card-title">🔑 Key Points</div>
            <ul style="padding-left: 20px; font-size: 12px; margin-bottom: 0;">
              ${data.keyPoints.map((p: string) => `<li style="margin-bottom: 6px;">${p}</li>`).join('')}
            </ul>

            ${sourcesHtml}
          </div>
        `;
      } else {
        throw new Error(response.error || 'Failed to enrich');
      }
    } catch (error: any) {
      if (error.message === 'CONTEXT_INVALIDATED') {
        this.showContextInvalidatedError(resultDiv);
      } else {
        this.showError(resultDiv, error.message || 'Failed to enrich');
      }
    }
  }

  private async handleGenerateEmail() {
    const context = (this.shadowRoot?.getElementById('email-context') as HTMLTextAreaElement)?.value;
    const tone = (this.shadowRoot?.getElementById('email-tone') as HTMLSelectElement)?.value;
    const draftDiv = this.shadowRoot?.getElementById('email-result'); // Changed from email-draft to email-result

    if (!context || !draftDiv) return;

    draftDiv.classList.remove('hidden');
    draftDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Generating email...</div></div>';

    try {
      const response = await this.callAPI('generate-email', {
        text: context,
        tone: tone || 'professional'
      });

      if (response.success) {
        // API returns { success: true, data: { result: { subject, body } } }
        const emailData = response.data?.result || response.result;
        const subject = emailData?.subject || 'No Subject';
        const body = emailData?.body || 'No content generated';

        draftDiv.innerHTML = `
          <div class="card">
            <div class="card-title">✉️ Email Draft</div>
            <div class="input-group">
              <label class="label">Subject</label>
              <input type="text" id="email-subject" value="${subject}">
            </div>
            <div class="input-group">
              <label class="label">Body</label>
              <textarea id="email-body" rows="10">${body}</textarea>
            </div>
            <div style="display:flex;gap:12px;">
              <button class="btn btn-secondary" style="flex:1;background:var(--secondary);" onclick="navigator.clipboard.writeText('Subject: ${subject}\\n\\n${body}')">
                📋 Copy
              </button>
              <button class="btn" style="flex:1;" id="send-email-btn">
                📤 Send Email
              </button>
            </div>
          </div>
        `;

        draftDiv.querySelector('#send-email-btn')?.addEventListener('click', () => this.handleSendEmail());
      } else {
        throw new Error(response.error || 'Failed to generate email');
      }
    } catch (error: any) {
      console.error('[Spinabot] Email generation error:', error);

      if (error.message === 'CONTEXT_INVALIDATED') {
        this.showContextInvalidatedError(draftDiv);
      } else {
        this.showError(draftDiv, error.message || 'Failed to generate email');
      }
    }
  }

  private async handleSendEmail() {
    const subject = (this.shadowRoot?.getElementById('email-subject') as HTMLInputElement)?.value;
    const body = (this.shadowRoot?.getElementById('email-body') as HTMLTextAreaElement)?.value;

    if (!subject || !body) return;

    // Use mailto for client-side sending (no server config needed)
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
  }


  // ===== API COMMUNICATION =====

  private async callAPI(action: string, data: any): Promise<any> {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        throw new Error('CONTEXT_INVALIDATED');
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'API_REQUEST',
          payload: { action, ...data }
        }, (response) => {
          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message;
            console.error('[Spinabot] Runtime error:', error);

            // Check if context was invalidated
            if (error && (error.includes('Extension context invalidated') ||
              error.includes('message port closed') ||
              error.includes('Receiving end does not exist'))) {
              reject(new Error('CONTEXT_INVALIDATED'));
            } else {
              reject(new Error(error || 'Unknown error'));
            }
          } else if (!response) {
            reject(new Error('No response from background script'));
          } else if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error: any) {
      console.error('[Spinabot] callAPI error:', error);
      throw error;
    }
  }

  // ===== ERROR HANDLING =====

  private showContextInvalidatedError(container: HTMLElement) {
    container.innerHTML = `
      <div class="alert alert-error">
        <div style="font-weight: 600; margin-bottom: 8px;">⚠️ Extension Reloaded</div>
        <div style="font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
          The extension was updated or reloaded. Please refresh this page to continue using Spinabot.
        </div>
        <button class="btn" style="width: 100%;" onclick="window.location.reload()">
          🔄 Refresh Page
        </button>
      </div>
    `;
  }

  private showError(container: HTMLElement, message: string) {
    container.innerHTML = `
      <div class="alert alert-error">
        <div style="font-weight: 600; margin-bottom: 4px;">❌ Error</div>
        <div style="font-size: 13px;">${message}</div>
      </div>
    `;
  }

  // ===== PANEL CONTROLS =====

  public open() {
    if (this.container) {
      this.container.style.transform = 'translateX(0)';
      this.isVisible = true;
    }
  }

  public close() {
    if (this.container) {
      this.container.style.transform = 'translateX(100%)';
      this.isVisible = false;
    }
  }

  public minimize() {
    if (this.container) {
      this.container.style.transform = 'translateX(calc(100% - 60px))';
    }
  }

  public toggle() {
    if (this.isVisible) {
      this.close();
    } else {
      this.open();
    }
  }

  public switchTab(tab: 'ask' | 'actions' | 'email' | 'settings') {
    this.activeTab = tab;
    const tabs = this.shadowRoot?.querySelectorAll('.tab');
    tabs?.forEach(t => {
      t.classList.remove('active');
      if ((t as HTMLElement).dataset.tab === tab) {
        t.classList.add('active');
      }
    });
    this.renderContent();
  }

  public setSelectedText(text: string) {
    this.selectedText = text;
  }
}
