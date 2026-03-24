# Standalone Cognitive Agents Architecture

This directory contains the scalable architecture for standalone cognitive agents - specialized AI agents that work independently to automate specific business development tasks.

## 🏗️ Architecture Overview

The architecture follows a **registry-based pattern** that makes it easy to add new agents without modifying core routing or UI code.

```
src/features/standalone-agents/
├── lib/
│   ├── agent-registry.ts         # Central registry of all agents
│   ├── agent-actions.ts          # Centralized agent creation logic
│   └── get-standalone-agent-editor.tsx  # Dynamic editor component resolver
├── agents/
│   ├── ai-lead-generator/        # AI Lead Generator agent
│   │   ├── editor.tsx            # Agent-specific UI
│   │   └── config-new.ts         # Agent configuration
│   └── [future-agent]/           # Additional agents follow same pattern
├── hooks/
│   └── use-agents.ts             # React hooks for agent data
└── server/
    └── routers.ts                # TRPC routes for agents
```

## 📋 How It Works

### 1. **Central Registry** (`lib/agent-registry.ts`)
- **Single source of truth** for all agent types and metadata
- Defines agent IDs, names, descriptions, features, and status
- Provides utility functions for type conversions
- **To add a new agent**: Simply add an entry to `AGENT_REGISTRY`

### 2. **Centralized Actions** (`lib/agent-actions.ts`)
- **One function** (`createOrGetAgent`) handles all agent creation
- Ensures **one agent per type per user** (enforced at DB level)
- Type-specific functions wrap the central creator for convenience
- **To support a new agent**: Add a wrapper function

### 3. **Dynamic Editor Resolution** (`lib/get-standalone-agent-editor.tsx`)
- Maps agent types to their UI components
- Returns fallback component for unimplemented agents
- **To add a new agent UI**: Import component and add to registry

### 4. **Database Schema**
```prisma
model StandaloneAgent {
  id          String   @id @default(cuid())
  name        String
  type        String   // "AI_LEAD_GENERATOR", "COLD_WRITER", etc.
  status      String   @default("DRAFT")
  config      Json     @default("{}")  // Agent-specific configuration
  data        Json?    // Agent-specific data (leads, analytics, etc.)
  userId      String
  
  @@unique([userId, type])  // Ensures one agent per type per user
}
```

## ✨ Adding a New Agent

### Step 1: Register the Agent

Add to `lib/agent-registry.ts`:

```typescript
export const AGENT_TYPES = {
  // ... existing types
  MY_NEW_AGENT: "MY_NEW_AGENT",
} as const;

export const AGENT_REGISTRY: Record<string, AgentMetadata> = {
  // ... existing agents
  [AGENT_TYPES.MY_NEW_AGENT]: {
    id: "my-new-agent",
    name: "MyNewAgent",
    description: "Description of what this agent does",
    status: "live",  // or "coming-soon"
    icon: "IconName",  // Lucide icon name
    tags: ["Tag1", "Tag2"],
    features: ["Feature 1", "Feature 2"],
  },
};
```

### Step 2: Add Action Creator

Add to `lib/agent-actions.ts`:

```typescript
export async function createMyNewAgent() {
  return createOrGetAgent(AGENT_TYPES.MY_NEW_AGENT);
}
```

### Step 3: Create the Editor Component

Create `agents/my-new-agent/editor.tsx`:

```tsx
import type { StandaloneAgentEditorProps } from "../../lib/get-standalone-agent-editor";

export default function MyNewAgentEditor({ agentId }: StandaloneAgentEditorProps) {
  // Your agent-specific UI
  return <div>My New Agent Dashboard</div>;
}
```

### Step 4: Register the Editor

Update `lib/get-standalone-agent-editor.tsx`:

```typescript
import { MyNewAgentEditor } from "../agents/my-new-agent";

const EDITOR_COMPONENTS: Record<string, React.ComponentType<StandaloneAgentEditorProps>> = {
  // ... existing editors
  MY_NEW_AGENT: MyNewAgentEditor,
};
```

### Step 5: (Optional) Add Agent-Specific API Routes

Create API endpoints if needed:
- `src/app/api/standalone-agents/my-new-agent/...`

## 🔄 User Flow

1. **Marketplace** → User clicks "Launch Agent" on any agent card
2. **Creation** → System navigates to `/cognitive-agents/create/[agentType]`
3. **Action** → Server action creates agent or retrieves existing one
4. **Redirect** → User redirected to `/cognitive-agents/[agentId]`
5. **Dashboard** → Agent-specific editor component renders

## 📊 Data Storage

All agent-specific data is stored in the `data` JSON field:

```typescript
// Example: AI Lead Generator
{
  generatedAt: "2025-12-29T10:00:00.000Z",
  lastPrompt: "Find me fintech startups...",
  leads: [
    { id: "123", name: "John Doe", email: "john@example.com", ... },
    // ... more leads
  ],
  total: 15
}
```

## 🎯 Key Benefits

1. **Scalability**: Add new agents by just adding registry entries
2. **Type Safety**: TypeScript ensures all agents follow the same pattern
3. **One Agent Per Type**: Database constraint prevents duplicates
4. **Clean Routing**: Single dynamic route handles all agents
5. **Separation of Concerns**: Each agent owns its UI and logic
6. **Centralized Metadata**: Easy to update agent info across the app

## 🔒 Security & Validation

- All agent creation goes through authenticated server actions
- Database enforces unique constraint on `[userId, type]`
- Invalid agent types are caught and rejected
- Each user can only access their own agents

## 📝 Best Practices

1. **Keep agent logic self-contained** in the agent folder
2. **Use the registry** for all agent metadata
3. **Store agent data** in the `data` JSON field
4. **Use shared components** from `@/components/ui`
5. **Follow naming conventions**: kebab-case for IDs, UPPER_SNAKE_CASE for types
6. **Document new agents** in this README

## 🚀 Future Enhancements

- Agent marketplace with user ratings
- Agent templates and presets
- Cross-agent communication
- Agent analytics and insights
- Team sharing of agents
- Agent scheduling and automation
