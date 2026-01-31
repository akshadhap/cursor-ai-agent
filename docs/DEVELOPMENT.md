# Development Guide

## Prerequisites

- Node.js 18+ and npm
- Chrome browser
- Git
- Code editor (VS Code recommended)

## Initial Setup

### 1. Clone and Install

```bash
# Navigate to project
cd spinabot-cursor-agent

# Install web app dependencies
cd web-app
npm install

# Install extension dependencies
cd ../extension
npm install
```

### 2. Configure Environment Variables

**Web App** (`web-app/.env.local`):
```env
GROQ_API_KEY=your_groq_api_key_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
```

**Extension** (`extension/.env`):
```env
VITE_API_URL=http://localhost:3000
```

### 3. Get API Keys

**Groq API** (Required):
1. Visit https://console.groq.com
2. Sign up for free account
3. Generate API key
4. Add to `web-app/.env.local`

**Supabase** (Optional):
1. Visit https://supabase.com
2. Create new project
3. Get URL and anon key from settings
4. Add to `web-app/.env.local`

**Upstash Redis** (Optional):
1. Visit https://upstash.com
2. Create Redis database
3. Get REST URL and token
4. Add to `web-app/.env.local`

## Development Workflow

### Running the Web App

```bash
cd web-app
npm run dev
```

The app will be available at `http://localhost:3000`

### Building the Extension

```bash
cd extension
npm run build
```

This creates a `dist/` folder with the built extension.

### Loading Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. The extension should now appear in your extensions list

### Development Mode

For faster development, you can use watch mode:

```bash
# Terminal 1: Run web app
cd web-app
npm run dev

# Terminal 2: Build extension in watch mode
cd extension
npm run dev
```

After making changes to the extension:
1. Save your files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Spinabot extension
4. Reload the webpage you're testing on

## Project Structure

```
spinabot-cursor-agent/
├── web-app/                    # Next.js web application
│   ├── src/
│   │   ├── app/               # App router pages
│   │   │   ├── api/           # API routes
│   │   │   │   └── agent/     # Agent endpoints
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Dashboard page
│   │   │   └── globals.css    # Global styles
│   │   ├── components/        # React components
│   │   │   └── ui/            # shadcn/ui components
│   │   └── lib/               # Utilities
│   │       ├── groq.ts        # Groq API client
│   │       └── utils.ts       # Helper functions
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
│
├── extension/                  # Chrome extension
│   ├── src/
│   │   ├── background/        # Background service worker
│   │   │   └── index.ts
│   │   ├── content/           # Content scripts
│   │   │   ├── index.ts       # Main coordinator
│   │   │   ├── cursor-bubble.ts
│   │   │   ├── side-panel.ts
│   │   │   ├── settings.ts
│   │   │   └── content.css
│   │   └── popup/             # Extension popup
│   │       ├── index.html
│   │       └── popup.js
│   ├── public/
│   │   ├── manifest.json      # Extension manifest
│   │   └── icons/             # Extension icons
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
└── docs/                       # Documentation
    ├── ARCHITECTURE.md
    ├── API.md
    └── DEVELOPMENT.md
```

## Adding New Features

### Adding a New AI Action

1. **Create API Route** (`web-app/src/app/api/agent/new-action/route.ts`):
```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { text } = await request.json();
  
  // Your logic here
  const result = await processText(text);
  
  return NextResponse.json({
    success: true,
    result,
    action: "new-action"
  });
}
```

2. **Add to Groq Client** (`web-app/src/lib/groq.ts`):
```typescript
export async function newAction(text: string): Promise<string> {
  const messages = [
    { role: "system", content: "Your system prompt" },
    { role: "user", content: text }
  ];
  
  const completion = await generateChatCompletion(messages);
  return completion.choices[0]?.message?.content || "";
}
```

3. **Update Dashboard** (`web-app/src/app/page.tsx`):
```typescript
// Add to capabilities state
const [capabilities, setCapabilities] = useState({
  // ... existing
  newAction: true,
});

// Add UI toggle
<Switch
  id="new-action"
  checked={capabilities.newAction}
  onCheckedChange={(checked) =>
    setCapabilities({ ...capabilities, newAction: checked })
  }
/>
```

4. **Update Extension Menu** (`extension/src/content/cursor-bubble.ts`):
```typescript
// Add to actionConfig
const actionConfig = {
  // ... existing
  "new-action": {
    label: "New Action",
    icon: '<svg>...</svg>',
  },
};
```

### Adding a New Trigger

1. **Update Settings** (`extension/src/content/settings.ts`):
```typescript
export interface Settings {
  triggers: {
    // ... existing
    newTrigger: boolean;
  };
}
```

2. **Implement Trigger** (`extension/src/content/index.ts`):
```typescript
function setupEventListeners() {
  // ... existing
  
  if (settings.triggers.newTrigger) {
    document.addEventListener('event-type', handleNewTrigger);
  }
}
```

3. **Add Dashboard Toggle** (`web-app/src/app/page.tsx`):
```typescript
<Switch
  id="new-trigger"
  checked={triggers.newTrigger}
  onCheckedChange={(checked) =>
    setTriggers({ ...triggers, newTrigger: checked })
  }
/>
```

## Testing

### Manual Testing

1. **Test Text Selection**:
   - Select text on any webpage
   - Verify bubble appears
   - Click bubble and verify menu expands
   - Select action and verify side panel opens

2. **Test Right-Click**:
   - Select text
   - Right-click and find "Ask Spinabot AI"
   - Verify menu appears

3. **Test API Endpoints**:
```bash
curl -X POST http://localhost:3000/api/agent/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello", "targetLanguage": "Spanish"}'
```

4. **Test Dashboard**:
   - Open `http://localhost:3000`
   - Toggle settings
   - Verify settings save to localStorage

### Debugging

**Extension Console**:
1. Right-click extension icon
2. Select "Inspect popup" for popup debugging
3. Open DevTools on any page for content script logs
4. Visit `chrome://extensions/` and click "background page" for service worker logs

**Web App**:
- Check terminal for server logs
- Use browser DevTools for client-side debugging
- Check Network tab for API requests

## Common Issues

### Extension Not Loading

- Verify `dist/` folder exists
- Check for build errors: `npm run build`
- Ensure manifest.json is valid
- Try removing and re-adding extension

### API Errors

- Verify Groq API key is set
- Check API key has not expired
- Verify backend is running on port 3000
- Check CORS headers in browser DevTools

### Bubble Not Appearing

- Check content script loaded (DevTools Console)
- Verify settings allow text selection trigger
- Check for JavaScript errors
- Ensure Shadow DOM is supported

### Settings Not Saving

- Check localStorage in DevTools
- Verify dashboard and extension use same domain
- Clear browser cache and try again

## Code Style

- Use TypeScript for type safety
- Follow ESLint rules
- Use Prettier for formatting
- Write descriptive comments
- Keep functions small and focused

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
```

## Performance Tips

1. **Minimize API Calls**: Cache results when possible
2. **Debounce Events**: Prevent excessive event firing
3. **Lazy Load**: Only create UI when needed
4. **Optimize Styles**: Use Shadow DOM for isolation
5. **Monitor Memory**: Clean up event listeners

## Security Best Practices

1. **Never expose API keys** in client-side code
2. **Validate all inputs** on the server
3. **Use HTTPS** in production
4. **Implement rate limiting** for API routes
5. **Sanitize user input** before displaying

## Deployment

See main README.md for deployment instructions.

## Getting Help

- Check documentation in `/docs`
- Review code comments
- Search existing issues
- Create new issue with details

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

Happy coding! 🚀
