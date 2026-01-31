/**
 * Side Panel Component
 * Premium slide-in panel for Spinabot Agent
 */

export class SidePanel {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private activeTab: 'home' | 'actions' | 'tools' = 'home';
  private apiKeys: Record<string, string> = { notion: '', jira: '', slack: '' };

  constructor() {
    this.createPanel();
    this.loadSettings();
  }

  private loadSettings() {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['spinabot_api_keys'], (result) => {
        if (result.spinabot_api_keys) {
          this.apiKeys = result.spinabot_api_keys;
        }
      });
    }
  }

  private saveSettings() {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ spinabot_api_keys: this.apiKeys });
    }
  }

  /**
   * Create the side panel UI using Shadow DOM
   */
  private createPanel() {
    this.container = document.createElement("div");
    this.container.id = "spinabot-side-panel";
    this.container.style.cssText = `
      position: fixed; top: 0; right: -420px; width: 420px; height: 100vh;
      z-index: 2147483646; transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: -10px 0 30px rgba(0,0,0,0.1);
    `;

    this.shadowRoot = this.container.attachShadow({ mode: "open" });

    // Styles
    const style = document.createElement("style");
    style.textContent = `
      :host {
        --primary: #6366f1;
        --primary-hover: #4f46e5;
        --bg: #ffffff;
        --bg-alt: #f8fafc;
        --text: #0f172a;
        --text-muted: #64748b;
        --border: #e2e8f0;
        --success: #10b981;
        --error: #ef4444;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      .panel {
        width: 100%; height: 100%; background: var(--bg);
        display: flex; flex-direction: column;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text);
      }

      /* Header */
      .header {
        padding: 24px; border-bottom: 1px solid var(--border);
        display: flex; justify-content: space-between; align-items: center;
        background: rgba(255,255,255,0.8); backdrop-filter: blur(8px);
        position: sticky; top: 0; z-index: 10;
      }
      .brand { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 20px; color: var(--text); }
      .brand-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }
      .close-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 8px; border-radius: 8px; transition: 0.2s; }
      .close-btn:hover { background: var(--bg-alt); color: var(--text); }

      /* Tabs */
      .tabs { display: flex; padding: 0 24px; gap: 24px; border-bottom: 1px solid var(--border); background: var(--bg); }
      .tab {
        padding: 16px 0; font-size: 14px; font-weight: 600; color: var(--text-muted);
        cursor: pointer; position: relative; transition: 0.2s;
      }
      .tab:hover { color: var(--text); }
      .tab.active { color: var(--primary); }
      .tab.active::after {
        content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
        background: var(--primary); border-radius: 2px 2px 0 0;
      }

      /* Content Area */
      .content { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
      
      /* Cards & inputs */
      .card { background: var(--bg-alt); border-radius: 16px; padding: 20px; border: 1px solid var(--border); transition: 0.2s; }
      .card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      
      .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .action-card {
        background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
        padding: 20px; cursor: pointer; text-align: center; transition: 0.2s;
        display: flex; flex-direction: column; align-items: center; gap: 12px;
      }
      .action-card:hover { border-color: var(--primary); background: #f5f3ff; }
      .action-icon { width: 40px; height: 40px; background: #e0e7ff; color: var(--primary); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
      .action-label { font-weight: 600; font-size: 14px; }

      .input-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
      input, textarea, select {
        width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;
        font-family: inherit; font-size: 14px; transition: 0.2s; background: var(--bg);
      }
      input:focus, textarea:focus, select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
      
      .btn {
        width: 100%; padding: 12px; background: var(--primary); color: white; border: none;
        border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .btn:hover { background: var(--primary-hover); }
      .btn-secondary { background: white; border: 1px solid var(--border); color: var(--text); }
      .btn-secondary:hover { background: var(--bg-alt); border-color: var(--text-muted); }

      /* Loading */
      .loading { text-align: center; padding: 40px 0; }
      .spinner { width: 32px; height: 32px; border: 3px solid #e0e7ff; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* Results */
      .result-box { background: white; border-radius: 12px; padding: 16px; border: 1px solid var(--border); font-size: 14px; line-height: 1.6; }
      .result-header { display: flex; justify-content: space-between; margin-bottom: 12px; color: var(--text-muted); font-size: 12px; font-weight: 600; }
      
      /* Chat */
      .chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; min-height: 200px; max-height: 400px; }
      .message { padding: 12px 16px; border-radius: 12px; max-width: 85%; font-size: 14px; line-height: 1.5; }
      .message.user { background: var(--primary); color: white; align-self: flex-end; border-bottom-right-radius: 4px; }
      .message.ai { background: var(--bg-alt); border: 1px solid var(--border); align-self: flex-start; border-bottom-left-radius: 4px; }
    `;

    this.shadowRoot.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "panel";
    panel.innerHTML = `
      <div class="header">
        <div class="brand">
          <div class="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          Spinabot
        </div>
        <button class="close-btn" id="close-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      
      <div class="tabs">
        <div class="tab active" data-tab="home">Ask AI</div>
        <div class="tab" data-tab="actions">Actions</div>
        <div class="tab" data-tab="tools">Tools</div>
      </div>

      <div class="content" id="panel-content">
        <!-- Dynamic Content -->
      </div>
    `;

    this.shadowRoot.appendChild(panel);

    // Event Listeners
    this.shadowRoot.getElementById("close-btn")?.addEventListener("click", () => this.close());

    const tabs = this.shadowRoot.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        (e.target as HTMLElement).classList.add('active');
        this.activeTab = (e.target as HTMLElement).dataset.tab as any;
        this.render();
      });
    });

    document.body.appendChild(this.container);
    this.render();
  }

  public open() {
    if (this.container) this.container.style.right = "0";
  }

  public close() {
    if (this.container) this.container.style.right = "-420px";
  }

  // --- Rendering Logic ---

  private render() {
    const content = this.shadowRoot?.getElementById("panel-content");
    if (!content) return;
    content.innerHTML = '';

    if (this.activeTab === 'home') this.renderHome(content);
    else if (this.activeTab === 'actions') this.renderActions(content);
    else if (this.activeTab === 'tools') this.renderTools(content);
  }

  private renderHome(container: HTMLElement) {
    container.innerHTML = `
      <div id="welcome-card" class="card" style="text-align: center; padding: 30px 20px;">
        <div style="font-size: 32px; margin-bottom: 16px;">👋</div>
        <h3 style="margin-bottom: 8px;">Hi, I'm Spinabot</h3>
        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">I can summarize this page, draft emails, or help with tasks.</p>
        <button class="btn" id="summarize-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
          Summarize Page
        </button>
      </div>
      
      <div class="result-box" id="home-result" style="display: none; margin-bottom: 20px;"></div>

      <div id="chat-container" class="chat-messages" style="display: none;"></div>

      <div class="chat-input-area" style="margin-top: auto;">
        <div class="input-group">
          <textarea id="ask-input" placeholder="Ask Spinabot AI..." rows="2" style="resize: none;"></textarea>
        </div>
        <button class="btn btn-secondary" id="ask-btn">Send</button>
      </div>
    `;

    container.querySelector('#summarize-btn')?.addEventListener('click', () => {
      const welcome = this.shadowRoot?.getElementById('welcome-card');
      if (welcome) welcome.style.display = 'none';
      this.handleSummarize();
    });

    container.querySelector('#ask-btn')?.addEventListener('click', () => {
      const input = this.shadowRoot?.getElementById('ask-input') as HTMLTextAreaElement;
      const msg = input.value;
      if (msg) {
        input.value = '';

        const welcome = this.shadowRoot?.getElementById('welcome-card');
        if (welcome) welcome.style.display = 'none';

        const chatContainer = this.shadowRoot?.getElementById('chat-container');
        if (chatContainer) {
          chatContainer.style.display = 'flex';
          // Add user message
          chatContainer.innerHTML += `<div class="message user">${msg}</div>`;
          chatContainer.scrollTop = chatContainer.scrollHeight;

          // Add loading
          const loadingId = 'loading-' + Date.now();
          chatContainer.innerHTML += `<div id="${loadingId}" class="message ai"><span class="spinner" style="width:16px; height:16px; border-width:2px; display:inline-block; margin:0;"></span></div>`;
          chatContainer.scrollTop = chatContainer.scrollHeight;

          this.dispatch('chat', { text: msg }, loadingId);
        }
      }
    });

    // Enter key support
    container.querySelector('#ask-input')?.addEventListener('keydown', (e: Event) => {
      if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
        e.preventDefault();
        (container.querySelector('#ask-btn') as HTMLElement).click();
      }
    });
  }

  private renderActions(container: HTMLElement) {
    container.innerHTML = `
      <div class="action-grid" id="action-grid">
        <div class="action-card" data-action="task">
          <div class="action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
          <div class="action-label">Create Task</div>
        </div>
        <div class="action-card" data-action="scrape">
           <div class="action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9"/></svg></div>
           <div class="action-label">Scrape Link</div>
        </div>
        <div class="action-card" data-action="enrich">
           <div class="action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
           <div class="action-label">Enrich Info</div>
        </div>
        <div class="action-card" data-action="email">
           <div class="action-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
           <div class="action-label">Draft Email</div>
        </div>
      </div>
      <div id="action-form-container"></div>
    `;

    container.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        this.renderActionForm(action!);
      });
    });
  }

  private renderActionForm(action: string) {
    const container = this.shadowRoot?.getElementById('action-form-container');
    const grid = this.shadowRoot?.getElementById('action-grid');
    if (!container || !grid) return;

    grid.style.display = 'none';

    let formHtml = `<button class="btn btn-secondary" id="back-btn" style="margin-bottom: 20px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> Back</button>`;

    if (action === 'task') {
      formHtml += `
            <h3>Create Task</h3>
            <div class="input-group"><label class="label">Title</label><input type="text" id="task-title"></div>
            <div class="input-group"><label class="label">Description</label><textarea id="task-desc" rows="3"></textarea></div>
            <div class="input-group">
                <label class="label">Integration</label>
                <select id="task-integration">
                    <option value="notion">Notion</option>
                    <option value="jira">Jira</option>
                    <option value="slack">Slack</option>
                </select>
            </div>
            <button class="btn" id="submit-task">Create Task</button>
        `;
    } else if (action === 'scrape') {
      formHtml += `
            <h3>Scrape Link</h3>
            <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">Enter a URL or scrape current page</p>
            <div class="input-group"><label class="label">URL (Optional)</label><input type="text" id="scrape-url" placeholder="https://..."></div>
            <button class="btn" id="submit-scrape">Scrape Data</button>
        `;
    } else if (action === 'enrich') {
      formHtml += `
            <h3>Enrich Lead</h3>
            <div class="input-group"><label class="label">Lead Info / Bio</label><textarea id="enrich-text" rows="5" placeholder="Paste bio or info..."></textarea></div>
            <button class="btn" id="submit-enrich">Enrich Profile</button>
        `;
    } else if (action === 'email') {
      formHtml += `
            <h3>Draft Email</h3>
            <div class="input-group"><label class="label">Details / Topic</label><textarea id="email-text" rows="4"></textarea></div>
            <div class="input-group"><label class="label">Tone</label><select id="email-tone"><option>Professional</option><option>Friendly</option><option>Urgent</option></select></div>
            <button class="btn" id="submit-email">Generate Draft</button>
        `;
    }

    formHtml += `<div id="action-result" style="margin-top: 20px;"></div>`;
    container.innerHTML = formHtml;

    // Listeners
    container.querySelector('#back-btn')?.addEventListener('click', () => {
      container.innerHTML = '';
      grid.style.display = 'grid';
    });

    if (action === 'task') container.querySelector('#submit-task')?.addEventListener('click', () => this.handleTaskSubmit());
    if (action === 'scrape') container.querySelector('#submit-scrape')?.addEventListener('click', () => this.handleScrapeSubmit());
    if (action === 'enrich') container.querySelector('#submit-enrich')?.addEventListener('click', () => this.handleEnrichSubmit());
    if (action === 'email') container.querySelector('#submit-email')?.addEventListener('click', () => this.handleEmailSubmit());
  }

  private renderTools(container: HTMLElement) {
    container.innerHTML = `
      <h3>Tools & Integrations</h3>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Configure your external tool API keys here.</p>
      
      <div class="card">
        <div class="input-group">
            <label class="label">Notion API Key</label>
            <input type="password" id="key-notion" value="${this.apiKeys.notion || ''}">
        </div>
        <div class="input-group">
            <label class="label">Jira API Token</label>
            <input type="password" id="key-jira" value="${this.apiKeys.jira || ''}">
        </div>
        <div class="input-group">
            <label class="label">Slack Bot Token</label>
            <input type="password" id="key-slack" value="${this.apiKeys.slack || ''}">
        </div>
        <button class="btn" id="save-tools">Save Configuration</button>
      </div>
    `;

    container.querySelector('#save-tools')?.addEventListener('click', () => {
      this.apiKeys = {
        notion: (this.shadowRoot?.getElementById('key-notion') as HTMLInputElement).value,
        jira: (this.shadowRoot?.getElementById('key-jira') as HTMLInputElement).value,
        slack: (this.shadowRoot?.getElementById('key-slack') as HTMLInputElement).value,
      };
      this.saveSettings();
      const btn = container.querySelector('#save-tools') as HTMLButtonElement;
      btn.textContent = 'Saved!';
      setTimeout(() => btn.textContent = 'Save Configuration', 2000);
    });
  }

  // --- Handlers ---

  private async dispatch(action: string, data: any, loadingId?: string) {
    // Show loading
    const resultContainer = this.shadowRoot?.getElementById(this.activeTab === 'home' ? 'home-result' : 'action-result');
    if (resultContainer && action !== 'chat') {
      resultContainer.style.display = 'block';
      resultContainer.innerHTML = `<div class="loading"><div class="spinner"></div>Processing...</div>`;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "API_REQUEST",
        payload: { action, text: data.text, options: data.options }
      });

      if (response.success) {
        if (action === 'chat' && loadingId) {
          const loader = this.shadowRoot?.getElementById(loadingId);
          if (loader) {
            loader.innerHTML = response.data.result;
          }
        } else {
          this.renderResult(response.data.result, action, resultContainer || null);
        }
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (e: any) {
      if (action === 'chat' && loadingId) {
        const loader = this.shadowRoot?.getElementById(loadingId);
        if (loader) loader.innerHTML = `<span style="color:var(--error)">Error: ${e.message}</span>`;
      } else if (resultContainer) {
        resultContainer.innerHTML = `<div style="color:var(--error); padding:16px;">Error: ${e.message}</div>`;
      }
    }
  }

  private renderResult(result: any, action: string, container: HTMLElement | null) {
    if (!container) return;

    let html = '';
    if (action === 'summarize') {
      html = `<h4>Summary</h4><p>${result}</p>`;
    } else if (action === 'generate-task') {
      html = `<h4>Task Created</h4>
            <div style="background:#f0fdf4; padding:12px; border-radius:8px; border:1px solid #bbf7d0; margin-top:8px;">
               <strong>${result.title}</strong><br>
               <div class="priority-badge" style="display:inline-block; font-size:10px; background:#16a34a; color:white; padding:2px 6px; border-radius:4px; margin-top:4px;">${result.priority}</div>
               <p style="margin-top:8px; font-size:13px;">${result.description}</p>
            </div>
          `;
    } else if (action === 'scrape') {
      html = `<h4>Scraped Data</h4>
            <div style="font-size:12px; margin-top:8px;">
                <strong>Title:</strong> ${result.title}<br>
                <strong>Preview:</strong> ${result.preview.substring(0, 100)}...
            </div>`;
    } else if (action === 'enrich') {
      html = `<h4>Enriched Profile</h4>
             <div class="card" style="margin-top:8px;">
                <strong>${result.name}</strong> (${result.role})<br>
                <div style="color:var(--text-muted); font-size:12px;">${result.company}</div>
                <ul style="margin-top:8px; padding-left:20px; font-size:12px;">
                    ${result.keyPoints.map((p: string) => `<li>${p}</li>`).join('')}
                </ul>
             </div>
           `;
    } else if (action === 'generate-email') {
      html = `<h4>Draft Email</h4>
             <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; margin-top:8px; white-space:pre-wrap;">Subject: ${result.subject}\n\n${result.body}</div>
             <button class="btn" style="margin-top:8px;" onclick="navigator.clipboard.writeText(\`${result.subject}\\n\\n${result.body}\`)">Copy to Clipboard</button>
          `;
    } else {
      html = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
    }

    container.innerHTML = html;
  }

  private handleSummarize() {
    const text = document.body.innerText.substring(0, 5000);
    this.dispatch('summarize', { text });
  }

  private handleTaskSubmit() {
    const title = (this.shadowRoot?.getElementById('task-title') as HTMLInputElement).value;
    const desc = (this.shadowRoot?.getElementById('task-desc') as HTMLTextAreaElement).value;
    const integration = (this.shadowRoot?.getElementById('task-integration') as HTMLSelectElement).value;

    this.dispatch('generate-task', {
      text: `Title: ${title}\nDescription: ${desc}`,
      options: { integration, apiKey: this.apiKeys[integration] }
    });
  }

  private handleScrapeSubmit() {
    const url = (this.shadowRoot?.getElementById('scrape-url') as HTMLInputElement).value;
    if (url) {
      this.dispatch('scrape', { text: url });
    } else {
      // Scrape current page
      const text = document.body.innerText.substring(0, 1000);
      this.renderResult({ title: document.title, preview: text, url: window.location.href }, 'scrape', (this.shadowRoot?.getElementById('action-result') || null) as HTMLElement | null);
    }
  }

  private handleEnrichSubmit() {
    const text = (this.shadowRoot?.getElementById('enrich-text') as HTMLTextAreaElement).value;
    const finalText = text || window.getSelection()?.toString() || "User profile data";
    this.dispatch('enrich', { text: finalText });
  }

  private handleEmailSubmit() {
    const text = (this.shadowRoot?.getElementById('email-text') as HTMLTextAreaElement).value;
    const tone = (this.shadowRoot?.getElementById('email-tone') as HTMLSelectElement).value;
    this.dispatch('generate-email', { text, options: { tone } });
  }

  // Exposed methods
  public showResult(action: string, data: any) {
    this.open();
    // Implementation for external trigger
    console.log("External result", action, data);
  }
}
