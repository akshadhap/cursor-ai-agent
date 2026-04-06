# Spinabot Cursor Agent

This directory contains the implementation of the Spinabot Cursor Agent, a standalone agent that runs as a Chrome Extension.

## 📂 Directory Structure

### `extension/`
Contains the **source code** for the Chrome Extension. This is a standalone Vite project.
- **`content/`**: Content scripts injected into webpages (the sidebar, cursor bubble, etc.).
- **`background/`**: Service worker logic.
- **`popup/`**: The extension popup UI.
- **`dist/`**: The build output (load this folder in Chrome).

### `lib/`
Contains **server-side utilities** used by the Next.js API routes.
- **`groq.ts`**: Helper functions to interact with the Groq AI API.
- **`auth-helper.ts`**: Authentication middleware.
- **`rate-limit.ts`**: Rate limiting logic.
- **`usage-tracker.ts`**: Token usage tracking.

### `components/`
Contains **React components** for the Agent's Dashboard and Onboarding flow within the main Spinabot web application.
- **`onboarding/`**: Steps for the initial setup wizard.
- **`dashboard/`**: The main settings and stats dashboard for the agent.

### Root Files
- **`editor.tsx`**: The main entry component (`CursorAgentEditor`) rendered when a user clicks on this agent in the Spinabot dashboard. It manages the onboarding flow and renders the dashboard.
- **`config.ts`**: Defines the agent's metadata (ID, name, capabilities) and default settings.
- **`index.ts`**: The public API of this module, exporting the Editor and Config.

## 🔌 API Routes
The API routes for this agent are located in `src/app/api/standalone-agents/cursor-agent/`. They import utilities from the `lib/` folder in this directory.

## 🚀 Development
To modify the **Chrome Extension**:
1. Go to `extension/`
2. Run `npm install`
3. Run `npm run dev` to watch for changes
4. Reload the extension in Chrome

To modify the **Dashboard/Onboarding**:
1. Edit files in `components/` or `editor.tsx`
2. Changes reflect immediately in the Next.js app (`npm run dev` in root)
