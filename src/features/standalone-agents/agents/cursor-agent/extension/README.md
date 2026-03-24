# Spinabot Cursor AI - Chrome Extension

AI-powered cursor assistance for browsing with 9 intelligent capabilities powered by Groq AI.

## 🎯 Features

- **Chat AI**: Conversational AI with page context awareness
- **Summarize**: Condense long text into key points
- **Explain**: Simplify complex concepts
- **Generate Tasks**: Convert text into structured tasks
- **Draft Emails**: Auto-generate emails with customizable tone
- **Web Scraping**: Extract and summarize webpage content
- **Data Enrichment**: Extract structured profile information

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Google Chrome** browser
- **Groq API Key** ([Get one here](https://console.groq.com))
- **Next.js Backend** running on localhost:3000

## 🚀 Setup Instructions

### Step 1: Backend Setup

1. **Navigate to the main project root**:
   ```bash
   cd c:\Users\aksha\Downloads\spinabot-nextjs-main\spinabot-nextjs-main
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

3. **Add required dependencies for Groq and scraping**:
   ```bash
   npm install groq-sdk axios cheerio
   npm install --save-dev @types/cheerio
   ```

4. **Configure environment variables**:
   Create or update `.env.local` in the project root:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

   The backend should now be running at `http://localhost:3000`

6. **Verify backend health**:
   Open `http://localhost:3000/api/agent/health` in your browser.
   You should see: `{"status":"ok","message":"Backend is healthy and ready"}`

### Step 2: Extension Setup

1. **Navigate to the extension folder**:
   ```bash
   cd src\features\standalone-agents\agents\cursor-agent\extension
   ```

2. **Install extension dependencies**:
   ```bash
   npm install
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

   This will create a `dist/` folder with the compiled extension.

### Step 3: Load Extension in Chrome

1. **Open Chrome Extensions page**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

2. **Load unpacked extension**:
   - Click "Load unpacked"
   - Select the `dist/` folder inside the extension directory
   - The extension should now appear in your extensions list

3. **Verify installation**:
   - You should see "Spinabot Cursor AI" in your extensions
   - Click the extension icon to see the popup

## 🎨 Usage

### Text Selection Flow

1. **Select text** on any webpage (minimum 10 characters)
2. **Cursor bubble appears** near your selection
3. **Click the bubble** to open the quick menu
4. **Choose an action**:
   - **Summarize**: Opens Ask AI tab with selected text
   - **Actions**: Opens Actions tab for tasks, scraping, or enrichment
   - **Email**: Opens Email tab to draft an email

### Keyboard Shortcuts

- **Alt + S**: Toggle side panel

### Right-Click Menu

- Right-click on selected text
- Choose "Open in Spinabot"

### Side Panel Tabs

#### 1. Ask AI
- Chat interface with AI
- Uses page context for better responses
- Maintains conversation history

#### 2. Actions
- **Create Task**: Generate structured tasks from text
- **Scrape & Summarize**: Extract and summarize web pages
- **Enrich Profile**: Extract structured data from profiles

#### 3. Email
- Draft professional emails
- Choose tone: Professional, Friendly, Formal, Apologetic
- Auto-generate subject and body

#### 4. Settings
- Configure triggers (text selection, right-click, keyboard)
- Enable/disable capabilities
- Manage integrations (coming soon)

## 🛠️ Development

### Extension Development Mode

To rebuild the extension automatically on changes:

```bash
npm run dev
```

Then reload the extension in Chrome after each build.

### Project Structure

```
extension/
├── manifest.json          # Extension manifest
├── background/
│   └── index.ts          # Service worker
├── content/
│   ├── index.ts          # Main coordinator
│   ├── cursor-bubble.ts  # Floating button
│   ├── quick-menu.ts     # Action menu
│   ├── side-panel.ts     # Main UI panel
│   ├── action-executor.ts # API calls
│   ├── settings.ts       # Settings management
│   └── content.css       # Styles
├── popup/
│   ├── index.html        # Popup UI
│   └── popup.ts          # Popup logic
└── assets/               # Icons
```

## 🔧 Troubleshooting

### Backend Issues

**Problem**: "Backend offline" in dashboard
- **Solution**: Ensure Next.js dev server is running on port 3000
- Check: `http://localhost:3000/api/agent/health`

**Problem**: "GROQ_API_KEY not configured"
- **Solution**: Add your Groq API key to `.env.local`
- Restart the dev server after adding the key

### Extension Issues

**Problem**: Extension not loading
- **Solution**: Check Chrome console for errors
- Rebuild extension: `npm run build`
- Reload extension in `chrome://extensions/`

**Problem**: Cursor bubble not appearing
- **Solution**: Check if text selection trigger is enabled in settings
- Ensure you're selecting more than 10 characters

**Problem**: API calls failing
- **Solution**: Check browser console for CORS errors
- Verify backend is running and accessible
- Check network tab for failed requests

### Build Issues

**Problem**: TypeScript compilation errors
- **Solution**: Run `npm install` to ensure all dependencies are installed
- Check `tsconfig.json` configuration

**Problem**: Vite build fails
- **Solution**: Clear `node_modules` and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## 🔐 Security

- **API Key**: Stored ONLY in backend `.env.local`, never in extension
- **All AI calls**: Go through Next.js API routes
- **Input validation**: Max length checks on all API endpoints
- **Shadow DOM**: UI isolation to prevent style conflicts and XSS
- **No sensitive data**: Only UI preferences stored in localStorage

## 📝 API Endpoints

All endpoints are at `http://localhost:3000/api/agent/`:

- `POST /chat` - Chat with AI (max 5k chars)
- `POST /summarize` - Summarize text (max 20k chars)
- `POST /explain` - Explain concepts (max 10k chars)
- `POST /generate-task` - Generate tasks (max 5k chars)
- `POST /generate-email` - Draft emails (max 5k chars)
- `POST /scrape` - Scrape URLs
- `POST /enrich` - Enrich data (max 5k chars)
- `GET /health` - Health check

## 🎯 Roadmap

- [ ] Gmail integration for sending emails
- [ ] Notion integration for task management
- [ ] Slack integration for messaging
- [ ] Jira integration for issue tracking
- [ ] Custom AI model selection
- [ ] Offline mode with cached responses
- [ ] Multi-language UI support

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for errors
3. Verify backend health endpoint
4. Check Chrome extension console

## 🙏 Credits

- **AI Model**: Groq (llama-3.1-70b-versatile)
- **Framework**: Next.js 14
- **Extension**: Chrome Manifest V3
- **Build Tool**: Vite

---

**Version**: 1.0.0  
**Last Updated**: February 2026
