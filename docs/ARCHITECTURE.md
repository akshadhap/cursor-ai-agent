# Spinabot Cursor Agent - Architecture

## Overview

The Spinabot Cursor Agent is a browser-based AI assistant that provides contextual intelligence through cursor interactions. The system consists of three main components:

1. **Browser Extension** (Chrome Manifest V3)
2. **Web Application** (Next.js 14)
3. **Backend API** (Next.js API Routes)

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Content Script (Extension)                 │ │
│  │  ┌──────────────┐         ┌──────────────────────────┐ │ │
│  │  │ Cursor Bubble│         │      Side Panel          │ │ │
│  │  │  (Shadow DOM)│         │    (Shadow DOM)          │ │ │
│  │  └──────────────┘         └──────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Background Service Worker                     │ │
│  │  - Context Menu Management                              │ │
│  │  - API Communication                                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Web Application                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Dashboard (React)                      │ │
│  │  - Agent Configuration                                  │ │
│  │  - Trigger Settings                                     │ │
│  │  - Capability Management                                │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↕                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  API Routes                             │ │
│  │  /api/agent/translate                                   │ │
│  │  /api/agent/summarize                                   │ │
│  │  /api/agent/explain                                     │ │
│  │  /api/agent/rewrite                                     │ │
│  │  /api/agent/generate-task                               │ │
│  │  /api/agent/generate-email                              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  - Groq API (LLaMA 3 LLM)                                   │
│  - Supabase (Optional: Auth & Storage)                      │
│  - Upstash Redis (Optional: Session Memory)                 │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Browser Extension

**Technology**: Chrome Manifest V3, TypeScript, Vite

**Key Files**:
- `src/content/index.ts` - Main content script coordinator
- `src/content/cursor-bubble.ts` - Cursor bubble UI component
- `src/content/side-panel.ts` - Side panel UI component
- `src/background/index.ts` - Background service worker
- `src/popup/` - Extension popup

**Features**:
- Text selection detection
- Cursor-adjacent bubble UI (Shadow DOM)
- Expandable action menu
- Right-click context menu integration
- Side panel for results and history
- Settings synchronization with dashboard

### 2. Web Application

**Technology**: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui

**Key Files**:
- `src/app/page.tsx` - Dashboard page
- `src/app/layout.tsx` - Root layout
- `src/lib/groq.ts` - Groq API client
- `src/components/ui/` - UI components

**Features**:
- Agent configuration dashboard
- Trigger settings (text selection, right-click, hover)
- Capability toggles (translate, summarize, explain, etc.)
- Settings persistence (localStorage)
- Responsive design

### 3. Backend API

**Technology**: Next.js API Routes, Groq SDK

**Endpoints**:
- `POST /api/agent/translate` - Text translation
- `POST /api/agent/summarize` - Text summarization
- `POST /api/agent/explain` - Text explanation
- `POST /api/agent/rewrite` - Text rewriting
- `POST /api/agent/generate-task` - Task generation
- `POST /api/agent/generate-email` - Email draft generation

**Features**:
- CORS enabled for extension communication
- Input validation
- Error handling
- Groq API integration
- Modular action handlers

## Data Flow

### Text Selection Flow

1. User selects text on webpage
2. Content script detects selection via `mouseup` event
3. Cursor bubble appears near selection
4. User clicks bubble to expand action menu
5. User selects action (e.g., "Translate")
6. Content script sends message to background worker
7. Background worker makes API request to backend
8. Backend calls Groq API for processing
9. Result returns through background worker
10. Side panel opens and displays result
11. User can copy, edit, or save result

### Settings Synchronization Flow

1. User configures settings in dashboard
2. Settings saved to localStorage
3. Extension content script reads settings on page load
4. Cursor bubble and menu adapt to enabled capabilities
5. Disabled actions are hidden from UI

## Security Considerations

1. **Shadow DOM Isolation**: UI components use Shadow DOM to prevent style conflicts
2. **CORS Configuration**: API routes have explicit CORS headers for extension
3. **Input Validation**: All API endpoints validate input length and type
4. **API Key Security**: Groq API key stored server-side only
5. **Minimal Permissions**: Extension requests only necessary permissions

## Performance Optimizations

1. **Lazy Loading**: Components created only when needed
2. **Event Debouncing**: Text selection events debounced
3. **Shadow DOM**: Isolated styles prevent global CSS conflicts
4. **Efficient API Calls**: Background worker handles all API communication
5. **Local Settings**: Settings cached in localStorage

## Extensibility

The system is designed to be modular and extensible:

1. **New Actions**: Add new API routes and update action menu
2. **Custom Models**: Swap Groq for other LLM providers
3. **Additional Triggers**: Add hover, keyboard shortcuts, etc.
4. **Integrations**: Connect to task managers, email clients, etc.
5. **Multi-language**: Easy to add i18n support

## Deployment

### Web App (Vercel)
```bash
cd web-app
vercel
```

### Extension (Chrome Web Store)
```bash
cd extension
npm run build
# Upload dist/ folder to Chrome Web Store
```

## Future Enhancements

- OCR for image text extraction
- Multi-agent routing
- Voice input support
- Offline mode with local models
- Advanced integrations (Notion, Slack, etc.)
- Custom agent training
