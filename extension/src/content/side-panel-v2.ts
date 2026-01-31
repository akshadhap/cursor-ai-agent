/**
 * Spinabot AI Panel V2 - Premium Production Version
 * High-standard UI with comprehensive features
 */

export class SpinabotPanel {
    private container: HTMLDivElement | null = null;
    private shadowRoot: ShadowRoot | null = null;
    private activeTab: 'ask' | 'actions' | 'email' | 'settings' = 'ask';
    private activeAction: 'task' | 'scrape' | 'enrich' | null = null;
    private isVisible: boolean = true;

    // Configuration
    private config: {
        apiKeys: {
            notion: string;
            jira: string;
            slack: string;
            apify: string;
            scrapingbee: string;
            hunter: string;
            clearbit: string;
        };
        email: {
            provider: 'gmail' | 'outlook' | 'smtp';
            address: string;
            password: string;
            smtpHost?: string;
            smtpPort?: number;
        };
    } = {
            apiKeys: {
                notion: '',
                jira: '',
                slack: '',
                apify: '',
                scrapingbee: '',
                hunter: '',
                clearbit: ''
            },
            email: {
                provider: 'gmail',
                address: '',
                password: ''
            }
        };

    constructor() {
        this.loadConfig();
        this.createPanel();
        this.setupMessageListener();
    }

    private loadConfig() {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.get(['spinabot_config'], (result) => {
                if (result.spinabot_config) {
                    this.config = { ...this.config, ...result.spinabot_config };
                }
            });
        }
    }

    private saveConfig() {
        if (chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ spinabot_config: this.config });
        }
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
        --primary: #6366f1;
        --primary-dark: #4f46e5;
        --primary-light: #818cf8;
        --secondary: #a855f7;
        --bg: #ffffff;
        --bg-alt: #f8fafc;
        --bg-hover: #f1f5f9;
        --text: #0f172a;
        --text-muted: #64748b;
        --text-light: #94a3b8;
        --border: #e2e8f0;
        --border-light: #f1f5f9;
        --success: #10b981;
        --error: #ef4444;
        --warning: #f59e0b;
        --shadow: rgba(0, 0, 0, 0.1);
        --shadow-lg: rgba(0, 0, 0, 0.15);
        --radius: 12px;
        --radius-sm: 8px;
        --radius-lg: 16px;
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
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
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
        background: linear-gradient(90deg, var(--primary), var(--secondary));
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
        background: linear-gradient(135deg, var(--primary), var(--secondary));
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
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      }

      .btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
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
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05));
        transform: translateY(-4px);
        box-shadow: 0 8px 16px var(--shadow);
      }

      .action-card.active {
        border-color: var(--primary);
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
      }

      .action-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, var(--primary), var(--secondary));
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
        border: 1px solid #fecaca;
        color: #991b1b;
      }

      /* ===== UTILITIES ===== */
      .text-center { text-align: center; }
      .mb-16 { margin-bottom: 16px; }
      .mt-16 { margin-top: 16px; }
      .hidden { display: none; }
      
      .fade-in {
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
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
        <button class="tab" data-tab="settings">
          <span class="tab-icon">⚙️</span>
          <span>Settings</span>
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
            case 'settings':
                this.renderSettingsTab(content);
                break;
        }
    }

    // ===== TAB RENDERERS =====

    private renderAskTab(container: HTMLElement) {
        container.innerHTML = `
      <div class="card">
        <div class="card-title">👋 Hi, I'm Spinabot</div>
        <div class="card-description">
          I can help you summarize pages, answer questions, and assist with your tasks.
        </div>
        <button class="btn" id="summarize-page-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="21" y1="10" x2="3" y2="10"/>
            <line x1="21" y1="6" x2="3" y2="6"/>
            <line x1="21" y1="14" x2="3" y2="14"/>
            <line x1="21" y1="18" x2="3" y2="18"/>
          </svg>
          Summarize This Page
        </button>
      </div>

      <div id="summary-result" class="hidden"></div>

      <div class="card">
        <div class="card-title">💬 Chat with AI</div>
        <div class="chat-messages" id="chat-messages"></div>
        <div class="input-group">
          <textarea id="chat-input" placeholder="Ask me anything..." rows="3"></textarea>
        </div>
        <button class="btn btn-secondary" id="send-chat-btn">Send Message</button>
      </div>
    `;

        // Event listeners
        container.querySelector('#summarize-page-btn')?.addEventListener('click', () => this.handleSummarize());
        container.querySelector('#send-chat-btn')?.addEventListener('click', () => this.handleChat());

        // Enter to send
        container.querySelector('#chat-input')?.addEventListener('keydown', (e: Event) => {
            if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
                e.preventDefault();
                this.handleChat();
            }
        });
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
          <div class="input-group">
            <label class="label">Scraping Tool</label>
            <select id="scrape-tool">
              <option value="builtin">Built-in (Free)</option>
              <option value="apify">Apify (Advanced)</option>
              <option value="scrapingbee">ScrapingBee</option>
            </select>
          </div>
          <button class="btn" id="scrape-btn">Scrape Data</button>
        </div>
        <div id="scrape-result"></div>
      `;
        } else if (action === 'enrich') {
            formHTML += `
        <div class="card">
          <div class="card-title">💎 Enrich Lead Information</div>
          <div class="card-description">Get detailed insights about a person or company</div>
          <div class="input-group">
            <label class="label">Lead Information</label>
            <textarea id="enrich-text" placeholder="Paste bio, LinkedIn profile, or company info..." rows="5"></textarea>
          </div>
          <div class="input-group">
            <label class="label">Enrichment Tool</label>
            <select id="enrich-tool">
              <option value="ai">AI Analysis (Free)</option>
              <option value="hunter">Hunter.io</option>
              <option value="clearbit">Clearbit</option>
            </select>
          </div>
          <button class="btn" id="enrich-btn">Enrich Profile</button>
        </div>
        <div id="enrich-result"></div>
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
      <div class="card">
        <div class="card-title">✉️ Draft Email</div>
        <div class="card-description">Generate professional emails with AI</div>
        <div class="input-group">
          <label class="label">Email Context / Topic</label>
          <textarea id="email-context" placeholder="What is this email about?" rows="4"></textarea>
        </div>
        <div class="input-group">
          <label class="label">Tone</label>
          <select id="email-tone">
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
          </select>
        </div>
        <button class="btn" id="generate-email-btn">Generate Draft</button>
      </div>

      <div id="email-draft" class="hidden"></div>
    `;

        container.querySelector('#generate-email-btn')?.addEventListener('click', () => this.handleGenerateEmail());
    }

    private renderSettingsTab(container: HTMLElement) {
        container.innerHTML = `
      <div class="card">
        <div class="card-title">🔧 Task Management Tools</div>
        <div class="input-group">
          <label class="label">Notion API Key</label>
          <input type="password" id="key-notion" value="${this.config.apiKeys.notion}" placeholder="secret_...">
        </div>
        <div class="input-group">
          <label class="label">Jira API Token</label>
          <input type="password" id="key-jira" value="${this.config.apiKeys.jira}">
        </div>
        <div class="input-group">
          <label class="label">Slack Bot Token</label>
          <input type="password" id="key-slack" value="${this.config.apiKeys.slack}" placeholder="xoxb-...">
        </div>
      </div>

      <div class="card">
        <div class="card-title">🌐 Scraping Tools</div>
        <div class="input-group">
          <label class="label">Apify API Key</label>
          <input type="password" id="key-apify" value="${this.config.apiKeys.apify}">
        </div>
        <div class="input-group">
          <label class="label">ScrapingBee API Key</label>
          <input type="password" id="key-scrapingbee" value="${this.config.apiKeys.scrapingbee}">
        </div>
      </div>

      <div class="card">
        <div class="card-title">💎 Enrichment Tools</div>
        <div class="input-group">
          <label class="label">Hunter.io API Key</label>
          <input type="password" id="key-hunter" value="${this.config.apiKeys.hunter}">
        </div>
        <div class="input-group">
          <label class="label">Clearbit API Key</label>
          <input type="password" id="key-clearbit" value="${this.config.apiKeys.clearbit}">
        </div>
      </div>

      <div class="card">
        <div class="card-title">✉️ Email Configuration</div>
        <div class="input-group">
          <label class="label">Email Provider</label>
          <select id="email-provider">
            <option value="gmail" ${this.config.email.provider === 'gmail' ? 'selected' : ''}>Gmail</option>
            <option value="outlook" ${this.config.email.provider === 'outlook' ? 'selected' : ''}>Outlook</option>
            <option value="smtp" ${this.config.email.provider === 'smtp' ? 'selected' : ''}>SMTP</option>
          </select>
        </div>
        <div class="input-group">
          <label class="label">Email Address</label>
          <input type="email" id="email-address" value="${this.config.email.address}">
        </div>
        <div class="input-group">
          <label class="label">App Password</label>
          <input type="password" id="email-password" value="${this.config.email.password}">
        </div>
      </div>

      <button class="btn" id="save-settings-btn">💾 Save Configuration</button>
    `;

        container.querySelector('#save-settings-btn')?.addEventListener('click', () => this.handleSaveSettings());
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

        // Add user message
        messagesDiv.innerHTML += `<div class="message user">${userMessage}</div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Add loading
        const loadingId = 'loading-' + Date.now();
        messagesDiv.innerHTML += `<div class="message ai" id="${loadingId}"><div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div></div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            const response = await this.callAPI('chat', { text: userMessage });
            const loadingMsg = this.shadowRoot?.getElementById(loadingId);

            if (loadingMsg) {
                if (response.success) {
                    loadingMsg.innerHTML = response.data.result;
                } else {
                    loadingMsg.innerHTML = `<span style="color:var(--error)">Error: ${response.error}</span>`;
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

        resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Creating task...</div></div>';

        try {
            const response = await this.callAPI(`actions/task/${tool}`, {
                text: `Title: ${title}\nDescription: ${desc}`,
                options: { apiKey: this.config.apiKeys[tool as keyof typeof this.config.apiKeys] }
            });

            if (response.success) {
                resultDiv.innerHTML = `
          <div class="alert alert-success">
            ✅ Task created successfully in ${tool.charAt(0).toUpperCase() + tool.slice(1)}!
          </div>
          <div class="card">
            <div class="result-box"><pre>${JSON.stringify(response.data.result, null, 2)}</pre></div>
          </div>
        `;
            } else {
                throw new Error(response.error || 'Failed to create task');
            }
        } catch (error: any) {
            resultDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    private async handleScrape() {
        const url = (this.shadowRoot?.getElementById('scrape-url') as HTMLInputElement)?.value || window.location.href;
        const tool = (this.shadowRoot?.getElementById('scrape-tool') as HTMLSelectElement)?.value;
        const resultDiv = this.shadowRoot?.getElementById('scrape-result');

        if (!resultDiv) return;

        resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Scraping data...</div></div>';

        try {
            const response = await this.callAPI(`actions/scrape/${tool}`, {
                text: url,
                options: { apiKey: this.config.apiKeys[tool as keyof typeof this.config.apiKeys] }
            });

            if (response.success) {
                resultDiv.innerHTML = `
          <div class="alert alert-success">✅ Data scraped successfully!</div>
          <div class="card">
            <div class="card-title">Scraped Data</div>
            <div class="result-box"><pre>${JSON.stringify(response.data.result, null, 2)}</pre></div>
          </div>
        `;
            } else {
                throw new Error(response.error || 'Failed to scrape');
            }
        } catch (error: any) {
            resultDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    private async handleEnrich() {
        const text = (this.shadowRoot?.getElementById('enrich-text') as HTMLTextAreaElement)?.value;
        const tool = (this.shadowRoot?.getElementById('enrich-tool') as HTMLSelectElement)?.value;
        const resultDiv = this.shadowRoot?.getElementById('enrich-result');

        if (!text || !resultDiv) return;

        resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Enriching profile...</div></div>';

        try {
            const response = await this.callAPI(`actions/enrich/${tool}`, {
                text,
                options: { apiKey: this.config.apiKeys[tool as keyof typeof this.config.apiKeys] }
            });

            if (response.success) {
                resultDiv.innerHTML = `
          <div class="alert alert-success">✅ Profile enriched successfully!</div>
          <div class="card">
            <div class="card-title">Enriched Information</div>
            <div class="result-box"><pre>${JSON.stringify(response.data.result, null, 2)}</pre></div>
          </div>
        `;
            } else {
                throw new Error(response.error || 'Failed to enrich');
            }
        } catch (error: any) {
            resultDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    private async handleGenerateEmail() {
        const context = (this.shadowRoot?.getElementById('email-context') as HTMLTextAreaElement)?.value;
        const tone = (this.shadowRoot?.getElementById('email-tone') as HTMLSelectElement)?.value;
        const draftDiv = this.shadowRoot?.getElementById('email-draft');

        if (!context || !draftDiv) return;

        draftDiv.classList.remove('hidden');
        draftDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Generating email...</div></div>';

        try {
            const response = await this.callAPI('email/draft', {
                text: context,
                options: { tone }
            });

            if (response.success) {
                const { subject, body } = response.data.result;
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
              <button class="btn btn-secondary" style="flex:1;" onclick="navigator.clipboard.writeText('Subject: ${subject}\\n\\n${body}')">
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
            draftDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    private async handleSendEmail() {
        const subject = (this.shadowRoot?.getElementById('email-subject') as HTMLInputElement)?.value;
        const body = (this.shadowRoot?.getElementById('email-body') as HTMLTextAreaElement)?.value;
        const draftDiv = this.shadowRoot?.getElementById('email-draft');

        if (!subject || !body || !draftDiv) return;

        if (!this.config.email.address || !this.config.email.password) {
            alert('Please configure your email settings in the Settings tab first!');
            return;
        }

        draftDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">Sending email...</div></div>';

        try {
            const response = await this.callAPI(`email/send-${this.config.email.provider}`, {
                text: body,
                options: {
                    subject,
                    from: this.config.email.address,
                    password: this.config.email.password
                }
            });

            if (response.success) {
                draftDiv.innerHTML = `<div class="alert alert-success">✅ Email sent successfully!</div>`;
            } else {
                throw new Error(response.error || 'Failed to send email');
            }
        } catch (error: any) {
            draftDiv.innerHTML = `<div class="alert alert-error">❌ ${error.message}</div>`;
        }
    }

    private handleSaveSettings() {
        // Collect all settings
        this.config.apiKeys.notion = (this.shadowRoot?.getElementById('key-notion') as HTMLInputElement)?.value || '';
        this.config.apiKeys.jira = (this.shadowRoot?.getElementById('key-jira') as HTMLInputElement)?.value || '';
        this.config.apiKeys.slack = (this.shadowRoot?.getElementById('key-slack') as HTMLInputElement)?.value || '';
        this.config.apiKeys.apify = (this.shadowRoot?.getElementById('key-apify') as HTMLInputElement)?.value || '';
        this.config.apiKeys.scrapingbee = (this.shadowRoot?.getElementById('key-scrapingbee') as HTMLInputElement)?.value || '';
        this.config.apiKeys.hunter = (this.shadowRoot?.getElementById('key-hunter') as HTMLInputElement)?.value || '';
        this.config.apiKeys.clearbit = (this.shadowRoot?.getElementById('key-clearbit') as HTMLInputElement)?.value || '';

        this.config.email.provider = (this.shadowRoot?.getElementById('email-provider') as HTMLSelectElement)?.value as any;
        this.config.email.address = (this.shadowRoot?.getElementById('email-address') as HTMLInputElement)?.value || '';
        this.config.email.password = (this.shadowRoot?.getElementById('email-password') as HTMLInputElement)?.value || '';

        this.saveConfig();

        // Show success message
        const btn = this.shadowRoot?.getElementById('save-settings-btn');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✅ Saved!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }
    }

    // ===== API COMMUNICATION =====

    private async callAPI(action: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'API_REQUEST',
                payload: { action, ...data }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
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
}
