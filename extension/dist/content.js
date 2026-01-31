var C=Object.defineProperty;var z=(n,e,t)=>e in n?C(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var g=(n,e,t)=>z(n,typeof e!="symbol"?e+"":e,t);class R{constructor(){g(this,"container",null);g(this,"shadowRoot",null);g(this,"activeTab","ask");g(this,"activeAction",null);g(this,"isVisible",!1);g(this,"selectedText","");g(this,"config",{apiKeys:{notion:"",jira:"",slack:"",apify:"",scrapingbee:"",hunter:"",clearbit:""},email:{provider:"gmail",address:"",password:""}});this.loadConfig(),this.createPanel(),this.setupMessageListener()}loadConfig(){chrome.storage&&chrome.storage.local&&chrome.storage.local.get(["spinabot_config"],e=>{e.spinabot_config&&(this.config={...this.config,...e.spinabot_config})})}saveConfig(){chrome.storage&&chrome.storage.local&&chrome.storage.local.set({spinabot_config:this.config})}setupMessageListener(){var e;(e=chrome.runtime)==null||e.onMessage.addListener((t,i,a)=>{t.type==="OPEN_PANEL"&&(this.open(),t.tab&&this.switchTab(t.tab))})}createPanel(){this.container=document.createElement("div"),this.container.id="spinabot-ai-panel",this.container.style.cssText=`
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      z-index: 2147483647;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `,this.shadowRoot=this.container.attachShadow({mode:"open"});const e=document.createElement("style");e.textContent=this.getPremiumStyles(),this.shadowRoot.appendChild(e);const t=document.createElement("div");t.className="spinabot-panel",t.innerHTML=this.getPanelHTML(),this.shadowRoot.appendChild(t),document.body.appendChild(this.container),this.container.style.transform="translateX(100%)",this.attachEventListeners(),this.renderContent()}getPremiumStyles(){return`
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
    `}getPanelHTML(){return`
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
    `}attachEventListeners(){var t,i,a,o,s;const e=(t=this.shadowRoot)==null?void 0:t.querySelectorAll(".tab");e==null||e.forEach(r=>{r.addEventListener("click",c=>{e.forEach(d=>d.classList.remove("active")),c.currentTarget.classList.add("active"),this.activeTab=c.currentTarget.dataset.tab,this.renderContent()})}),(a=(i=this.shadowRoot)==null?void 0:i.getElementById("close-btn"))==null||a.addEventListener("click",()=>this.close()),(s=(o=this.shadowRoot)==null?void 0:o.getElementById("minimize-btn"))==null||s.addEventListener("click",()=>this.minimize())}renderContent(){var t;const e=(t=this.shadowRoot)==null?void 0:t.getElementById("panel-content");if(e)switch(e.innerHTML="",e.classList.add("fade-in"),this.activeTab){case"ask":this.renderAskTab(e);break;case"actions":this.renderActionsTab(e);break;case"email":this.renderEmailTab(e);break;case"settings":this.renderSettingsTab(e);break}}renderAskTab(e){var t,i,a;e.innerHTML=`
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
    `,(t=e.querySelector("#summarize-page-btn"))==null||t.addEventListener("click",()=>this.handleSummarize()),(i=e.querySelector("#send-chat-btn"))==null||i.addEventListener("click",()=>this.handleChat()),(a=e.querySelector("#chat-input"))==null||a.addEventListener("keydown",o=>{o.key==="Enter"&&!o.shiftKey&&(o.preventDefault(),this.handleChat())})}renderActionsTab(e){this.activeAction?this.renderActionForm(e,this.activeAction):(e.innerHTML=`
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
      `,e.querySelectorAll(".action-card").forEach(t=>{t.addEventListener("click",i=>{this.activeAction=i.currentTarget.dataset.action,this.renderContent()})}))}renderActionForm(e,t){var a,o,s,r;let i=`
      <button class="btn btn-secondary btn-small mb-16" id="back-to-actions">
        ← Back to Actions
      </button>
    `;t==="task"?i+=`
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
      `:t==="scrape"?i+=`
        <div class="card">
          <div class="card-title">🌐 Scrape Link</div>
          <div class="card-description">Extract data from any webpage</div>
          <div class="input-group">
            <label class="label">URL (leave empty for current page)</label>
            <input type="text" id="scrape-url" placeholder="https://example.com">
          </div>
          <div style="background: var(--bg-alt); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--text-muted);">
              <strong>🌐 Scraping Tool:</strong> Scraping Dog (Anti-bot protection enabled)
            </div>
          </div>
          <button class="btn" id="scrape-btn">Scrape Data</button>
        </div>
        <div id="scrape-result"></div>
      `:t==="enrich"&&(i+=`
        <div class="card">
          <div class="card-title">💎 Enrich Lead Information</div>
          <div class="card-description">Get detailed insights about a person or company</div>
          <div class="input-group">
            <label class="label">Lead Information</label>
            <textarea id="enrich-text" placeholder="Paste bio, LinkedIn profile, or company info..." rows="5"></textarea>
          </div>
          <div style="background: var(--bg-alt); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--text-muted);">
              <strong>💎 Enrichment Tool:</strong> SERP API (Web search & data enrichment)
            </div>
          </div>
          <button class="btn" id="enrich-btn">Enrich Profile</button>
        </div>
        <div id="enrich-result"></div>
      `),e.innerHTML=i,(a=e.querySelector("#back-to-actions"))==null||a.addEventListener("click",()=>{this.activeAction=null,this.renderContent()}),t==="task"?(o=e.querySelector("#create-task-btn"))==null||o.addEventListener("click",()=>this.handleCreateTask()):t==="scrape"?(s=e.querySelector("#scrape-btn"))==null||s.addEventListener("click",()=>this.handleScrape()):t==="enrich"&&((r=e.querySelector("#enrich-btn"))==null||r.addEventListener("click",()=>this.handleEnrich()))}renderEmailTab(e){var t;e.innerHTML=`
      <div class="card">
        <div class="card-title">✉️ Draft Email</div>
        <div class="card-description">Generate professional emails with AI</div>
        <div class="input-group">
          <label class="label">Email Context / Topic</label>
          <textarea id="email-context" placeholder="What is this email about?" rows="4">${this.selectedText}</textarea>
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
    `,(t=e.querySelector("#generate-email-btn"))==null||t.addEventListener("click",()=>this.handleGenerateEmail())}renderSettingsTab(e){var t;e.innerHTML=`
      <div class="card">
        <div class="card-title">🔒 Core APIs (Server-Side)</div>
        <div class="card-description" style="margin-bottom: 16px;">
          These APIs are configured securely in the server environment and cannot be changed from the extension.
        </div>
        
        <div style="background: var(--bg-alt); padding: 16px; border-radius: var(--radius); margin-bottom: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 14px; color: var(--text);">🌐 Scraping Dog API</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Web scraping with anti-bot protection</div>
            </div>
            <div style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">
              ACTIVE
            </div>
          </div>
          <div style="font-family: monospace; font-size: 12px; color: var(--text-muted); background: var(--bg); padding: 8px 12px; border-radius: 4px; margin-top: 8px;">
            697c4e...8450
          </div>
        </div>

        <div style="background: var(--bg-alt); padding: 16px; border-radius: var(--radius);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 14px; color: var(--text);">💎 SERP API</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Web search and data enrichment</div>
            </div>
            <div style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">
              ACTIVE
            </div>
          </div>
          <div style="font-family: monospace; font-size: 12px; color: var(--text-muted); background: var(--bg); padding: 8px 12px; border-radius: 4px; margin-top: 8px;">
            de514c...d41a7
          </div>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: var(--radius-sm); margin-top: 16px;">
          <div style="font-size: 12px; color: #1e40af; line-height: 1.5;">
            <strong>🔒 Security:</strong> API keys are stored in server environment variables (.env.local) and never exposed to the browser for maximum security.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">🔧 Optional Integrations</div>
        <div class="card-description" style="margin-bottom: 16px;">
          Configure third-party integrations for task creation (optional)
        </div>
        
        <div class="input-group">
          <label class="label">Notion API Key</label>
          <input type="password" id="key-notion" value="${this.config.apiKeys.notion}" placeholder="secret_...">
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">For creating tasks in Notion databases</div>
        </div>
        <div class="input-group">
          <label class="label">Jira API Token</label>
          <input type="password" id="key-jira" value="${this.config.apiKeys.jira}" placeholder="Enter Jira API token">
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">For creating issues in Jira projects</div>
        </div>
        <div class="input-group">
          <label class="label">Slack Bot Token</label>
          <input type="password" id="key-slack" value="${this.config.apiKeys.slack}" placeholder="xoxb-...">
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">For sending messages to Slack channels</div>
        </div>
      </div>

      <button class="btn" id="save-settings-btn">💾 Save Configuration</button>
    `,(t=e.querySelector("#save-settings-btn"))==null||t.addEventListener("click",()=>this.handleSaveSettings())}async handleSummarize(){var t;const e=(t=this.shadowRoot)==null?void 0:t.getElementById("summary-result");if(e){e.classList.remove("hidden"),e.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Summarizing page...</div></div>';try{const i=document.body.innerText.substring(0,5e3),a=await this.callAPI("summarize",{text:i});if(a.success)e.innerHTML=`
          <div class="card">
            <div class="card-title">📝 Summary</div>
            <div class="result-box">${a.data.result}</div>
            <button class="btn btn-secondary mt-16" onclick="navigator.clipboard.writeText('${a.data.result.replace(/'/g,"\\'")}')">
              📋 Copy Summary
            </button>
          </div>
        `;else throw new Error(a.error||"Failed to summarize")}catch(i){e.innerHTML=`<div class="alert alert-error">❌ ${i.message}</div>`}}}async handleChat(){var o,s,r,c;const e=(o=this.shadowRoot)==null?void 0:o.getElementById("chat-input"),t=(s=this.shadowRoot)==null?void 0:s.getElementById("chat-messages");if(!e||!t||!e.value.trim())return;const i=e.value.trim();e.value="",t.innerHTML+=`<div class="message user">${i}</div>`,t.scrollTop=t.scrollHeight;const a="loading-"+Date.now();t.innerHTML+=`<div class="message ai" id="${a}"><div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div></div>`,t.scrollTop=t.scrollHeight;try{const d=await this.callAPI("chat",{text:i}),p=(r=this.shadowRoot)==null?void 0:r.getElementById(a);p&&(d.success?p.innerHTML=d.data.result:p.innerHTML=`<span style="color:var(--error)">Error: ${d.error}</span>`)}catch(d){const p=(c=this.shadowRoot)==null?void 0:c.getElementById(a);p&&(p.innerHTML=`<span style="color:var(--error)">Error: ${d.message}</span>`)}t.scrollTop=t.scrollHeight}async handleCreateTask(){var o,s,r,c,d,p,h;const e=(s=(o=this.shadowRoot)==null?void 0:o.getElementById("task-title"))==null?void 0:s.value,t=(c=(r=this.shadowRoot)==null?void 0:r.getElementById("task-desc"))==null?void 0:c.value,i=(p=(d=this.shadowRoot)==null?void 0:d.getElementById("task-tool"))==null?void 0:p.value,a=(h=this.shadowRoot)==null?void 0:h.getElementById("task-result");if(!(!e||!a)){a.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Creating task...</div></div>';try{const v=await this.callAPI(`actions/task/${i}`,{text:`Title: ${e}
Description: ${t}`,options:{apiKey:this.config.apiKeys[i]}});if(v.success)a.innerHTML=`
          <div class="alert alert-success">
            ✅ Task created successfully in ${i.charAt(0).toUpperCase()+i.slice(1)}!
          </div>
          <div class="card">
            <div class="result-box"><pre>${JSON.stringify(v.data.result,null,2)}</pre></div>
          </div>
        `;else throw new Error(v.error||"Failed to create task")}catch(v){a.innerHTML=`<div class="alert alert-error">❌ ${v.message}</div>`}}}async handleScrape(){var i,a,o;const e=((a=(i=this.shadowRoot)==null?void 0:i.getElementById("scrape-url"))==null?void 0:a.value)||window.location.href,t=(o=this.shadowRoot)==null?void 0:o.getElementById("scrape-result");if(t){t.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Scraping data with Scraping Dog...</div></div>';try{const s=await this.callAPI("scrape",{text:e});if(s.success){const r=s.data.result,c=(r.summary||"No summary available.").replace(/</g,"&lt;").replace(/>/g,"&gt;");t.innerHTML=`
          <div class="alert alert-success" style="margin-bottom: 12px; flex-shrink: 0;">✅ Data scraped successfully!</div>
          
          <div class="card" style="display: flex; flex-direction: column; height: 500px; padding: 0; overflow: hidden;">
            <div style="flex-shrink: 0; padding: 16px 16px 8px 16px; border-bottom: 1px solid var(--border); background: var(--bg);">
              <div class="card-title" style="margin: 0;">📝 Summary</div>
            </div>
            
            <div style="
              flex-grow: 1;
              min-height: 0; /* CRITICAL FIX: Enables scrolling in flex column */
              overflow-y: auto; 
              padding: 16px; 
              font-size: 13px; 
              line-height: 1.6; 
              color: var(--text);
              background: var(--bg);
              white-space: pre-wrap; /* This preserves AI's bullets and newlines perfectly */
            ">
${c}
            </div>
            
            <div style="
              flex-shrink: 0; 
              padding: 12px 16px 16px 16px; 
              border-top: 1px solid var(--border); 
              background: var(--bg);
              z-index: 10;
            ">
              <div class="card-title" style="font-size: 14px; margin-bottom: 8px;">📄 Page Details</div>
              <div style="background: var(--bg-alt); padding: 12px; border-radius: var(--radius-sm);">
                <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; line-height: 1.4;">${r.title}</div>
                <a href="${r.url}" target="_blank" style="font-size: 12px; color: var(--primary); text-decoration: none; display: block; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.url}</a>
                <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                  <span>📝 ${r.contentLength} chars</span>
                  <span>🕒 ${new Date(r.scrapedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <button class="btn btn-secondary mt-16" style="width: 100%; margin-top: 12px;" onclick="navigator.clipboard.writeText('${(r.summary||"").replace(/'/g,"\\'")}')">
                📋 Copy Summary
              </button>
            </div>
          </div>
        `}else throw new Error(s.error||"Failed to scrape")}catch(s){s.message==="CONTEXT_INVALIDATED"?this.showContextInvalidatedError(t):this.showError(t,s.message||"Failed to scrape")}}}async handleEnrich(){var i,a,o;const e=(a=(i=this.shadowRoot)==null?void 0:i.getElementById("enrich-text"))==null?void 0:a.value,t=(o=this.shadowRoot)==null?void 0:o.getElementById("enrich-result");if(!(!e||!t)){t.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Enriching profile with SERP API...</div></div>';try{const s=await this.callAPI("enrich",{text:e});if(s.success){const r=s.data.result;let c="";r.sources&&r.sources.length>0&&(c=`
            <div class="card-title" style="margin-top: 16px;">📚 Sources</div>
            <div style="font-size: 11px;">
              ${r.sources.map(d=>`
                <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                  <div style="font-weight: 600; margin-bottom: 2px;">${d.title}</div>
                  <a href="${d.link}" target="_blank" style="color: var(--primary); text-decoration: none;">${new URL(d.link).hostname}</a>
                </div>
              `).join("")}
            </div>
          `),t.innerHTML=`
          <div class="alert alert-success">✅ Profile enriched successfully!</div>
          <div class="card">
            <div class="card-title">💎 Enriched Profile</div>
            
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1;">
                <div style="font-size: 11px; color: var(--text-muted);">Name</div>
                <div style="font-weight: 600;">${r.name}</div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 11px; color: var(--text-muted);">Role</div>
                <div style="font-weight: 600;">${r.role}</div>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 11px; color: var(--text-muted);">Company</div>
              <div style="font-weight: 600;">${r.company}</div>
            </div>

            <div class="card-title">🔑 Key Points</div>
            <ul style="padding-left: 20px; font-size: 12px; margin-bottom: 0;">
              ${r.keyPoints.map(d=>`<li style="margin-bottom: 6px;">${d}</li>`).join("")}
            </ul>

            ${c}
          </div>
        `}else throw new Error(s.error||"Failed to enrich")}catch(s){s.message==="CONTEXT_INVALIDATED"?this.showContextInvalidatedError(t):this.showError(t,s.message||"Failed to enrich")}}}async handleGenerateEmail(){var a,o,s,r,c,d,p;const e=(o=(a=this.shadowRoot)==null?void 0:a.getElementById("email-context"))==null?void 0:o.value,t=(r=(s=this.shadowRoot)==null?void 0:s.getElementById("email-tone"))==null?void 0:r.value,i=(c=this.shadowRoot)==null?void 0:c.getElementById("email-draft");if(!(!e||!i)){i.classList.remove("hidden"),i.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Generating email...</div></div>';try{const h=await this.callAPI("generate-email",{text:e,tone:t||"professional"});if(h.success){const v=((d=h.data)==null?void 0:d.result)||h.result,b=(v==null?void 0:v.subject)||"No Subject",m=(v==null?void 0:v.body)||"No content generated";i.innerHTML=`
          <div class="card">
            <div class="card-title">✉️ Email Draft</div>
            <div class="input-group">
              <label class="label">Subject</label>
              <input type="text" id="email-subject" value="${b}">
            </div>
            <div class="input-group">
              <label class="label">Body</label>
              <textarea id="email-body" rows="10">${m}</textarea>
            </div>
            <div style="display:flex;gap:12px;">
              <button class="btn btn-secondary" style="flex:1;background:var(--secondary);" onclick="navigator.clipboard.writeText('Subject: ${b}\\n\\n${m}')">
                📋 Copy
              </button>
              <button class="btn" style="flex:1;" id="send-email-btn">
                📤 Send Email
              </button>
            </div>
          </div>
        `,(p=i.querySelector("#send-email-btn"))==null||p.addEventListener("click",()=>this.handleSendEmail())}else throw new Error(h.error||"Failed to generate email")}catch(h){console.error("[Spinabot] Email generation error:",h),h.message==="CONTEXT_INVALIDATED"?this.showContextInvalidatedError(i):this.showError(i,h.message||"Failed to generate email")}}}async handleSendEmail(){var a,o,s,r,c;const e=(o=(a=this.shadowRoot)==null?void 0:a.getElementById("email-subject"))==null?void 0:o.value,t=(r=(s=this.shadowRoot)==null?void 0:s.getElementById("email-body"))==null?void 0:r.value,i=(c=this.shadowRoot)==null?void 0:c.getElementById("email-draft");if(!(!e||!t||!i)){if(!this.config.email.address||!this.config.email.password){alert("Please configure your email settings in the Settings tab first!");return}i.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Sending email...</div></div>';try{const d=await this.callAPI(`email/send-${this.config.email.provider}`,{text:t,options:{subject:e,from:this.config.email.address,password:this.config.email.password}});if(d.success)i.innerHTML='<div class="alert alert-success">✅ Email sent successfully!</div>';else throw new Error(d.error||"Failed to send email")}catch(d){i.innerHTML=`<div class="alert alert-error">❌ ${d.message}</div>`}}}handleSaveSettings(){var t,i,a,o,s,r,c,d,p,h,v,b,m,x,f,y,w,k,E,T,S;this.config.apiKeys.notion=((i=(t=this.shadowRoot)==null?void 0:t.getElementById("key-notion"))==null?void 0:i.value)||"",this.config.apiKeys.jira=((o=(a=this.shadowRoot)==null?void 0:a.getElementById("key-jira"))==null?void 0:o.value)||"",this.config.apiKeys.slack=((r=(s=this.shadowRoot)==null?void 0:s.getElementById("key-slack"))==null?void 0:r.value)||"",this.config.apiKeys.apify=((d=(c=this.shadowRoot)==null?void 0:c.getElementById("key-apify"))==null?void 0:d.value)||"",this.config.apiKeys.scrapingbee=((h=(p=this.shadowRoot)==null?void 0:p.getElementById("key-scrapingbee"))==null?void 0:h.value)||"",this.config.apiKeys.hunter=((b=(v=this.shadowRoot)==null?void 0:v.getElementById("key-hunter"))==null?void 0:b.value)||"",this.config.apiKeys.clearbit=((x=(m=this.shadowRoot)==null?void 0:m.getElementById("key-clearbit"))==null?void 0:x.value)||"",this.config.email.provider=(y=(f=this.shadowRoot)==null?void 0:f.getElementById("email-provider"))==null?void 0:y.value,this.config.email.address=((k=(w=this.shadowRoot)==null?void 0:w.getElementById("email-address"))==null?void 0:k.value)||"",this.config.email.password=((T=(E=this.shadowRoot)==null?void 0:E.getElementById("email-password"))==null?void 0:T.value)||"",this.saveConfig();const e=(S=this.shadowRoot)==null?void 0:S.getElementById("save-settings-btn");if(e){const A=e.textContent;e.textContent="✅ Saved!",setTimeout(()=>{e.textContent=A},2e3)}}async callAPI(e,t){var i;try{if(!((i=chrome.runtime)!=null&&i.id))throw new Error("CONTEXT_INVALIDATED");return new Promise((a,o)=>{chrome.runtime.sendMessage({type:"API_REQUEST",payload:{action:e,...t}},s=>{if(chrome.runtime.lastError){const r=chrome.runtime.lastError.message;console.error("[Spinabot] Runtime error:",r),r&&(r.includes("Extension context invalidated")||r.includes("message port closed")||r.includes("Receiving end does not exist"))?o(new Error("CONTEXT_INVALIDATED")):o(new Error(r||"Unknown error"))}else s?s.error?o(new Error(s.error)):a(s):o(new Error("No response from background script"))})})}catch(a){throw console.error("[Spinabot] callAPI error:",a),a}}showContextInvalidatedError(e){e.innerHTML=`
      <div class="alert alert-error">
        <div style="font-weight: 600; margin-bottom: 8px;">⚠️ Extension Reloaded</div>
        <div style="font-size: 13px; line-height: 1.5; margin-bottom: 12px;">
          The extension was updated or reloaded. Please refresh this page to continue using Spinabot.
        </div>
        <button class="btn" style="width: 100%;" onclick="window.location.reload()">
          🔄 Refresh Page
        </button>
      </div>
    `}showError(e,t){e.innerHTML=`
      <div class="alert alert-error">
        <div style="font-weight: 600; margin-bottom: 4px;">❌ Error</div>
        <div style="font-size: 13px;">${t}</div>
      </div>
    `}open(){this.container&&(this.container.style.transform="translateX(0)",this.isVisible=!0)}close(){this.container&&(this.container.style.transform="translateX(100%)",this.isVisible=!1)}minimize(){this.container&&(this.container.style.transform="translateX(calc(100% - 60px))")}toggle(){this.isVisible?this.close():this.open()}switchTab(e){var i;this.activeTab=e;const t=(i=this.shadowRoot)==null?void 0:i.querySelectorAll(".tab");t==null||t.forEach(a=>{a.classList.remove("active"),a.dataset.tab===e&&a.classList.add("active")}),this.renderContent()}setSelectedText(e){this.selectedText=e}}class B{constructor(e){g(this,"container",null);g(this,"shadowRoot",null);g(this,"selectedText","");g(this,"onFeatureSelect",null);this.onFeatureSelect=e,this.createMenu()}createMenu(){this.container=document.createElement("div"),this.container.id="spinabot-quick-menu",this.container.style.cssText=`
            position: absolute;
            z-index: 2147483647;
            display: none;
            user-select: none;
            -webkit-user-select: none;
        `,this.shadowRoot=this.container.attachShadow({mode:"open"});const e=document.createElement("style");e.textContent=`
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
        `,this.shadowRoot.appendChild(e);const t=document.createElement("div");t.className="menu-container",t.innerHTML=`
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
        `,this.shadowRoot.appendChild(t),this.shadowRoot.querySelectorAll(".menu-item").forEach(a=>{a.addEventListener("click",o=>{const s=o.currentTarget.dataset.feature;s&&this.onFeatureSelect&&(this.onFeatureSelect(s,this.selectedText),this.hide())})}),document.body.appendChild(this.container)}show(e){this.container&&(this.selectedText=e.selectedText,this.container.style.left=`${e.x}px`,this.container.style.top=`${e.y}px`,this.container.style.display="block")}hide(){this.container&&(this.container.style.display="none")}destroy(){this.container&&this.container.parentNode&&this.container.parentNode.removeChild(this.container)}}const I={triggers:{textSelection:!0,rightClick:!0,hover:!1},capabilities:{translate:!0,summarize:!0,explain:!0,rewrite:!0,generateTask:!0,generateEmail:!0}};function M(){try{const n=localStorage.getItem("spinabot-settings");if(n)return{...I,...JSON.parse(n)}}catch(n){console.error("Error reading settings:",n)}return I}let l=null,u=null;function L(){console.log("🚀 Spinabot AI Assistant V2 initialized"),l=new R,l==null||l.close(),u=new B((n,e)=>{l==null||l.open(),l==null||l.switchTab(n),l==null||l.setSelectedText(e),setTimeout(()=>{const t=document.getElementById("spinabot-ai-panel");if(t&&t.shadowRoot){if(n==="ask"){const i=t.shadowRoot.querySelector("#chat-input");i&&(i.value=`Summarize this: "${e}"`,i.focus())}else if(n==="email"){const i=t.shadowRoot.querySelector("#email-context");i&&i.focus()}}},100)}),$()}function $(){document.addEventListener("mouseup",H),document.addEventListener("keydown",n=>{n.altKey&&n.key==="s"&&(n.preventDefault(),l==null||l.toggle())}),chrome.runtime.onMessage.addListener(n=>{console.log("Content script received message:",n),n.type==="SHOW_AI_MENU"&&n.text?(l==null||l.open(),l==null||l.switchTab("ask"),setTimeout(()=>{const e=document.getElementById("spinabot-ai-panel");if(e&&e.shadowRoot){const t=e.shadowRoot.querySelector("#chat-input");t&&(t.value=`Explain this: "${n.text}"`,t.focus())}},100)):n.type==="TOGGLE_SIDE_PANEL"?l==null||l.toggle():n.type==="OPEN_PANEL"&&(l==null||l.open(),n.tab&&(l==null||l.switchTab(n.tab)))})}function H(n){if(!M().triggers.textSelection)return;const t=n.target;t.id==="spinabot-ai-panel"||t.closest("#spinabot-ai-panel")||t.id==="spinabot-quick-menu"||t.closest("#spinabot-quick-menu")||setTimeout(()=>{const i=window.getSelection(),a=i==null?void 0:i.toString().trim();if(a&&a.length>0){const s=i.getRangeAt(0).getBoundingClientRect();u==null||u.show({x:s.left+s.width/2,y:s.bottom+window.scrollY+10,selectedText:a})}else u==null||u.hide()},10)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",L):L();
