var y=Object.defineProperty;var w=(s,e,t)=>e in s?y(s,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):s[e]=t;var u=(s,e,t)=>w(s,typeof e!="symbol"?e+"":e,t);class k{constructor(){u(this,"container",null);u(this,"shadowRoot",null);u(this,"activeTab","ask");u(this,"activeAction",null);u(this,"isVisible",!1);u(this,"selectedText","");this.createPanel(),this.setupMessageListener()}setupMessageListener(){var e;(e=chrome.runtime)==null||e.onMessage.addListener((t,i,r)=>{t.type==="OPEN_PANEL"&&(this.open(),t.tab&&this.switchTab(t.tab))})}createPanel(){this.container=document.createElement("div"),this.container.id="spinabot-ai-panel",this.container.style.cssText=`
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
      </div>

      <div class="panel-content" id="panel-content">
        <!-- Dynamic content will be rendered here -->
      </div>
    `}attachEventListeners(){var t,i,r,n,a;const e=(t=this.shadowRoot)==null?void 0:t.querySelectorAll(".tab");e==null||e.forEach(o=>{o.addEventListener("click",c=>{e.forEach(p=>p.classList.remove("active")),c.currentTarget.classList.add("active"),this.activeTab=c.currentTarget.dataset.tab,this.renderContent()})}),(r=(i=this.shadowRoot)==null?void 0:i.getElementById("close-btn"))==null||r.addEventListener("click",()=>this.close()),(a=(n=this.shadowRoot)==null?void 0:n.getElementById("minimize-btn"))==null||a.addEventListener("click",()=>this.minimize())}renderContent(){var t;const e=(t=this.shadowRoot)==null?void 0:t.getElementById("panel-content");if(e)switch(e.innerHTML="",e.classList.add("fade-in"),this.activeTab){case"ask":this.renderAskTab(e);break;case"actions":this.renderActionsTab(e);break;case"email":this.renderEmailTab(e);break}}renderAskTab(e){var i,r;e.innerHTML=`
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
    `,(i=e.querySelector("#summarize-page-btn"))==null||i.addEventListener("click",()=>{this.handleSummarize(),this.hideIntro()}),(r=e.querySelector("#send-chat-btn"))==null||r.addEventListener("click",()=>this.handleChat());const t=e.querySelector("#chat-input");t&&(t.addEventListener("keydown",n=>{n.key==="Enter"&&!n.shiftKey&&(n.preventDefault(),this.handleChat())}),t.addEventListener("input",function(){this.style.height="auto",this.style.height=Math.min(this.scrollHeight,150)+"px"}),t.focus())}hideIntro(){var t;const e=(t=this.shadowRoot)==null?void 0:t.getElementById("chat-intro");e&&(e.style.display="none")}renderActionsTab(e){this.activeAction?this.renderActionForm(e,this.activeAction):(e.innerHTML=`
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
      `,e.querySelectorAll(".action-card").forEach(t=>{t.addEventListener("click",i=>{this.activeAction=i.currentTarget.dataset.action,this.renderContent()})}))}renderActionForm(e,t){var r,n,a,o;let i=`
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
          <div style="background: var(--secondary); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            <div style="font-size: 12px; color: var(--muted-foreground);">
              <strong>🌐 Scraping Tool:</strong> Scraping Dog (Dedciated API & Basic Fallback)
            </div>
          </div>
          <button class="btn" id="scrape-btn">Scrape Data</button>
        </div>
        <div id="scrape-result" class="result-box hidden"></div>
      `:t==="enrich"&&(i+=`
        <div class="card">
          <div class="card-title">💎 Enrich Lead Information</div>
          <div class="card-description">Get detailed insights about a person or company</div>
          <div class="input-group">
            <label class="label">Context / Bio</label>
          <textarea id="enrich-text" placeholder="Paste bio or text to enrich..." rows="5">${this.selectedText||""}</textarea>
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
      `),e.innerHTML=i,(r=e.querySelector("#back-to-actions"))==null||r.addEventListener("click",()=>{this.activeAction=null,this.renderContent()}),t==="task"?(n=e.querySelector("#create-task-btn"))==null||n.addEventListener("click",()=>this.handleCreateTask()):t==="scrape"?(a=e.querySelector("#scrape-btn"))==null||a.addEventListener("click",()=>this.handleScrape()):t==="enrich"&&((o=e.querySelector("#enrich-btn"))==null||o.addEventListener("click",()=>this.handleEnrich()))}renderEmailTab(e){var t,i;e.innerHTML=`
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
          <textarea id="email-context" placeholder="What should the email be about?" rows="5">${this.selectedText||""}</textarea>
        </div>
        <button class="btn" id="generate-email-btn">✨ Generate Draft</button>
      </div>
      <div id="email-result" class="hidden result-box"></div>
    `,(t=e.querySelector("#generate-email-btn"))==null||t.addEventListener("click",()=>this.handleGenerateEmail()),(i=e.querySelector("#back-to-actions"))==null||i.addEventListener("click",()=>{this.activeTab="actions",this.renderContent()})}async handleSummarize(){var t;const e=(t=this.shadowRoot)==null?void 0:t.getElementById("summary-result");if(e){e.classList.remove("hidden"),e.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Summarizing page...</div></div>';try{const i=document.body.innerText.substring(0,5e3),r=await this.callAPI("summarize",{text:i});if(r.success)e.innerHTML=`
          <div class="card">
            <div class="card-title">📝 Summary</div>
            <div class="result-box">${r.data.result}</div>
            <button class="btn btn-secondary mt-16" onclick="navigator.clipboard.writeText('${r.data.result.replace(/'/g,"\\'")}')">
              📋 Copy Summary
            </button>
          </div>
        `;else throw new Error(r.error||"Failed to summarize")}catch(i){e.innerHTML=`<div class="alert alert-error">❌ ${i.message}</div>`}}}async handleChat(){var a,o,c,p;const e=(a=this.shadowRoot)==null?void 0:a.getElementById("chat-input"),t=(o=this.shadowRoot)==null?void 0:o.getElementById("chat-messages");if(!e||!t||!e.value.trim())return;const i=e.value.trim();e.value="",this.hideIntro(),t.innerHTML+=`
      <div class="message user" style="align-self: flex-end; background: var(--primary); color: #ffffff; padding: 10px 14px; border-radius: 12px 12px 0 12px; max-width: 85%; margin-bottom: 12px; font-size: 14px; line-height: 1.5; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
        ${i}
      </div>`,t.scrollTop=t.scrollHeight;const r="loading-"+Date.now();t.innerHTML+=`
      <div class="message ai" id="${r}" style="display: flex; gap: 8px;">
        <div style="width: 24px; height: 24px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">✨</div>
        <div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></div>
      </div>`,t.scrollTop=t.scrollHeight;const n=document.body.innerText.substring(0,1e4);try{const h=await this.callAPI("chat",{text:i,context:n}),l=(c=this.shadowRoot)==null?void 0:c.getElementById(r);l&&(h.success?l.innerHTML=`
            <div style="width: 24px; height: 24px; background: var(--primary); color: white; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; margin-top: 2px;">✨</div>
            <div style="flex: 1; min-width: 0; white-space: pre-wrap; line-height: 1.5;">${(h.data.result||"").trim()}</div>
          `:l.innerHTML=`<span style="color:var(--destructive)">Error: ${h.error}</span>`)}catch(h){const l=(p=this.shadowRoot)==null?void 0:p.getElementById(r);l&&(l.innerHTML=`<span style="color:var(--error)">Error: ${h.message}</span>`)}t.scrollTop=t.scrollHeight}async handleCreateTask(){var n,a,o,c,p,h,l;const e=(a=(n=this.shadowRoot)==null?void 0:n.getElementById("task-title"))==null?void 0:a.value,t=(c=(o=this.shadowRoot)==null?void 0:o.getElementById("task-desc"))==null?void 0:c.value,i=(h=(p=this.shadowRoot)==null?void 0:p.getElementById("task-tool"))==null?void 0:h.value,r=(l=this.shadowRoot)==null?void 0:l.getElementById("task-result");if(!(!e||!r)){r.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Generating task structure...</div></div>';try{await new Promise(v=>setTimeout(v,800)),r.innerHTML=`
        <div class="alert alert-success">
          ✅ Task prepared for ${i.charAt(0).toUpperCase()+i.slice(1)}!
        </div>
        <div class="card">
          <div class="result-box" style="background: var(--muted); border: 1px solid var(--border); padding: 12px; border-radius: var(--radius-sm);">
            <div style="font-weight: 600; margin-bottom: 4px;">${e}</div>
            <div style="font-size: 13px; color: var(--muted-foreground); white-space: pre-wrap;">${t}</div>
          </div>
          <button class="btn btn-secondary mt-4" onclick="navigator.clipboard.writeText(\`${e}\\n\\n${t}\`)">
            📋 Copy to Clipboard
          </button>
        </div>
      `}catch(v){r.innerHTML=`<div class="alert alert-error">❌ ${v.message}</div>`}}}async handleScrape(){var i,r,n;const e=((r=(i=this.shadowRoot)==null?void 0:i.getElementById("scrape-url"))==null?void 0:r.value)||window.location.href,t=(n=this.shadowRoot)==null?void 0:n.getElementById("scrape-result");if(t){t.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Scraping data...</div></div>';try{const a=await this.callAPI("scrape",{text:e});if(a.success){const o=a.data.result,c=(o.summary||"No summary available.").replace(/</g,"&lt;").replace(/>/g,"&gt;");t.innerHTML=`
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
${c}
            </div>
            
            <div style="
              flex-shrink: 0; 
              padding: 12px 16px 16px 16px; 
              border-top: 1px solid var(--border); 
              background: var(--muted);
              z-index: 10;
            ">
              <div class="card-title" style="font-size: 14px; margin-bottom: 8px;">📄 Page Details</div>
              <div style="font-size: 12px; color: var(--muted-foreground); margin-bottom: 4px;"><strong>Title:</strong> ${o.title}</div>
              <div style="font-size: 12px; color: var(--muted-foreground);"><strong>URL:</strong> <a href="${o.url}" target="_blank" style="color: var(--primary); text-decoration: none;">${o.url?o.url.substring(0,40)+"...":"N/A"}</a></div>
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
                <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px; line-height: 1.4;">${o.title}</div>
                <a href="${o.url}" target="_blank" style="font-size: 12px; color: var(--primary); text-decoration: none; display: block; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${o.url}</a>
                <div style="display: flex; gap: 12px; font-size: 11px; color: var(--text-muted);">
                  <span>📝 ${o.contentLength} chars</span>
                  <span>🕒 ${new Date(o.scrapedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <button class="btn btn-secondary mt-16" style="width: 100%; margin-top: 12px;" onclick="navigator.clipboard.writeText('${(o.summary||"").replace(/'/g,"\\'")}')">
                📋 Copy Summary
              </button>
            </div>
          </div>
        `}else throw new Error(a.error||"Failed to scrape")}catch(a){a.message==="CONTEXT_INVALIDATED"?this.showContextInvalidatedError(t):this.showError(t,a.message||"Failed to scrape")}}}async handleEnrich(){var i,r,n;const e=(r=(i=this.shadowRoot)==null?void 0:i.getElementById("enrich-text"))==null?void 0:r.value,t=(n=this.shadowRoot)==null?void 0:n.getElementById("enrich-result");if(!(!e||!t)){t.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Enriching profile with SERP API...</div></div>';try{const a=await this.callAPI("enrich",{text:e});if(a.success){const o=a.data.result;let c="";o.sources&&o.sources.length>0&&(c=`
            <div class="card-title" style="margin-top: 16px;">📚 Sources</div>
            <div style="font-size: 11px;">
              ${o.sources.map(p=>`
                <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
                  <div style="font-weight: 600; margin-bottom: 2px;">${p.title}</div>
                  <a href="${p.link}" target="_blank" style="color: var(--primary); text-decoration: none;">${new URL(p.link).hostname}</a>
                </div>
              `).join("")}
            </div>
          `),t.innerHTML=`
          <div class="alert alert-success">✅ Profile enriched successfully!</div>
          <div class="card">
            <div class="card-title">💎 Enriched Profile</div>
            
            <div style="display: flex; gap: 12px; margin-bottom: 16px;">
              <div style="flex: 1;">
            <div style="font-size: 11px; color: var(--muted-foreground);">Name</div>
                <div style="font-weight: 600;">${o.name}</div>
              </div>
              <div style="flex: 1;">
                <div style="font-size: 11px; color: var(--muted-foreground);">Role</div>
                <div style="font-weight: 600;">${o.role}</div>
              </div>
            </div>

            <div style="margin-bottom: 16px;">
              <div style="font-size: 11px; color: var(--muted-foreground);">Company</div>
              <div style="font-weight: 600;">${o.company}</div>
            </div>

            <div class="card-title">🔑 Key Points</div>
            <ul style="padding-left: 20px; font-size: 12px; margin-bottom: 0;">
              ${o.keyPoints.map(p=>`<li style="margin-bottom: 6px;">${p}</li>`).join("")}
            </ul>

            ${c}
          </div>
        `}else throw new Error(a.error||"Failed to enrich")}catch(a){a.message==="CONTEXT_INVALIDATED"?this.showContextInvalidatedError(t):this.showError(t,a.message||"Failed to enrich")}}}async handleGenerateEmail(){var r,n,a,o,c,p,h;const e=(n=(r=this.shadowRoot)==null?void 0:r.getElementById("email-context"))==null?void 0:n.value,t=(o=(a=this.shadowRoot)==null?void 0:a.getElementById("email-tone"))==null?void 0:o.value,i=(c=this.shadowRoot)==null?void 0:c.getElementById("email-result");if(!(!e||!i)){i.classList.remove("hidden"),i.innerHTML='<div class="loading"><div class="spinner"></div><div class="loading-text">Generating email...</div></div>';try{const l=await this.callAPI("generate-email",{text:e,tone:t||"professional"});if(l.success){const v=((p=l.data)==null?void 0:p.result)||l.result,g=(v==null?void 0:v.subject)||"No Subject",m=(v==null?void 0:v.body)||"No content generated";i.innerHTML=`
          <div class="card">
            <div class="card-title">✉️ Email Draft</div>
            <div class="input-group">
              <label class="label">Subject</label>
              <input type="text" id="email-subject" value="${g}">
            </div>
            <div class="input-group">
              <label class="label">Body</label>
              <textarea id="email-body" rows="10">${m}</textarea>
            </div>
            <div style="display:flex;gap:12px;">
              <button class="btn btn-secondary" style="flex:1;background:var(--secondary);" onclick="navigator.clipboard.writeText('Subject: ${g}\\n\\n${m}')">
                📋 Copy
              </button>
              <button class="btn" style="flex:1;" id="send-email-btn">
                📤 Send Email
              </button>
            </div>
          </div>
        `,(h=i.querySelector("#send-email-btn"))==null||h.addEventListener("click",()=>this.handleSendEmail())}else throw new Error(l.error||"Failed to generate email")}catch(l){console.error("[Spinabot] Email generation error:",l),l.message==="CONTEXT_INVALIDATED"?this.showContextInvalidatedError(i):this.showError(i,l.message||"Failed to generate email")}}}async handleSendEmail(){var r,n,a,o;const e=(n=(r=this.shadowRoot)==null?void 0:r.getElementById("email-subject"))==null?void 0:n.value,t=(o=(a=this.shadowRoot)==null?void 0:a.getElementById("email-body"))==null?void 0:o.value;if(!e||!t)return;const i=`mailto:?subject=${encodeURIComponent(e)}&body=${encodeURIComponent(t)}`;window.open(i,"_blank")}async callAPI(e,t){var i;try{if(!((i=chrome.runtime)!=null&&i.id))throw new Error("CONTEXT_INVALIDATED");return new Promise((r,n)=>{chrome.runtime.sendMessage({type:"API_REQUEST",payload:{action:e,...t}},a=>{if(chrome.runtime.lastError){const o=chrome.runtime.lastError.message;console.error("[Spinabot] Runtime error:",o),o&&(o.includes("Extension context invalidated")||o.includes("message port closed")||o.includes("Receiving end does not exist"))?n(new Error("CONTEXT_INVALIDATED")):n(new Error(o||"Unknown error"))}else a?a.error?n(new Error(a.error)):r(a):n(new Error("No response from background script"))})})}catch(r){throw console.error("[Spinabot] callAPI error:",r),r}}showContextInvalidatedError(e){e.innerHTML=`
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
    `}open(){this.container&&(this.container.style.transform="translateX(0)",this.isVisible=!0)}close(){this.container&&(this.container.style.transform="translateX(100%)",this.isVisible=!1)}minimize(){this.container&&(this.container.style.transform="translateX(calc(100% - 60px))")}toggle(){this.isVisible?this.close():this.open()}switchTab(e){var i;this.activeTab=e;const t=(i=this.shadowRoot)==null?void 0:i.querySelectorAll(".tab");t==null||t.forEach(r=>{r.classList.remove("active"),r.dataset.tab===e&&r.classList.add("active")}),this.renderContent()}setSelectedText(e){this.selectedText=e}}class E{constructor(e){u(this,"container",null);u(this,"shadowRoot",null);u(this,"selectedText","");u(this,"onFeatureSelect",null);this.onFeatureSelect=e,this.createMenu()}createMenu(){this.container=document.createElement("div"),this.container.id="spinabot-quick-menu",this.container.style.cssText=`
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
        `,this.shadowRoot.appendChild(t),this.shadowRoot.querySelectorAll(".menu-item").forEach(r=>{r.addEventListener("click",n=>{const a=n.currentTarget.dataset.feature;a&&this.onFeatureSelect&&(this.onFeatureSelect(a,this.selectedText),this.hide())})}),document.body.appendChild(this.container)}show(e){this.container&&(this.selectedText=e.selectedText,this.container.style.left=`${e.x}px`,this.container.style.top=`${e.y}px`,this.container.style.display="block")}hide(){this.container&&(this.container.style.display="none")}destroy(){this.container&&this.container.parentNode&&this.container.parentNode.removeChild(this.container)}}const x={triggers:{textSelection:!0,rightClick:!0,hover:!1},capabilities:{translate:!0,summarize:!0,explain:!0,rewrite:!0,generateTask:!0,generateEmail:!0}};function T(){try{const s=localStorage.getItem("spinabot-settings");if(s)return{...x,...JSON.parse(s)}}catch(s){console.error("Error reading settings:",s)}return x}let d=null,b=null;function f(){console.log("🚀 Spinabot AI Assistant V2 initialized"),d=new k,d==null||d.close(),b=new E((s,e)=>{d==null||d.open(),d==null||d.switchTab(s),d==null||d.setSelectedText(e),setTimeout(()=>{const t=document.getElementById("spinabot-ai-panel");if(t&&t.shadowRoot){if(s==="ask"){const i=t.shadowRoot.querySelector("#chat-input");i&&(i.value=`Summarize this: "${e}"`,i.focus())}else if(s==="email"){const i=t.shadowRoot.querySelector("#email-context");i&&i.focus()}}},100)}),S()}function S(){document.addEventListener("mouseup",L),document.addEventListener("keydown",s=>{s.altKey&&s.key==="s"&&(s.preventDefault(),d==null||d.toggle())}),chrome.runtime.onMessage.addListener(s=>{console.log("Content script received message:",s),s.type==="SHOW_AI_MENU"&&s.text?(d==null||d.open(),d==null||d.switchTab("ask"),setTimeout(()=>{const e=document.getElementById("spinabot-ai-panel");if(e&&e.shadowRoot){const t=e.shadowRoot.querySelector("#chat-input");t&&(t.value=`Explain this: "${s.text}"`,t.focus())}},100)):s.type==="TOGGLE_SIDE_PANEL"?d==null||d.toggle():s.type==="OPEN_PANEL"&&(d==null||d.open(),s.tab&&(d==null||d.switchTab(s.tab)))})}function L(s){if(!T().triggers.textSelection)return;const t=s.target;t.id==="spinabot-ai-panel"||t.closest("#spinabot-ai-panel")||t.id==="spinabot-quick-menu"||t.closest("#spinabot-quick-menu")||setTimeout(()=>{const i=window.getSelection(),r=i==null?void 0:i.toString().trim();if(r&&r.length>0){const a=i.getRangeAt(0).getBoundingClientRect();b==null||b.show({x:a.left+a.width/2,y:a.bottom+window.scrollY+10,selectedText:r})}else b==null||b.hide()},10)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",f):f();
