import { createTRPCRouter } from '../init';
import { workflowsRouter } from '@/features/workflows/server/routers';
import { credentialsRouter } from '@/features/credentials/server/routers';
import { executionsRouter } from '@/features/executions/server/routers';
import { templatesRouter } from '@/features/templates/server/routers';
import { voiceAgentsRouter } from '@/voiceagent/modules/server/router';
import { callLogsRouter } from '@/voiceagent/modules/server/calllogs';
import { batchCallsRouter } from '@/voiceagent/modules/server/batch-calls';
import { analyticsRouter } from '@/voiceagent/modules/server/analytics';
import { apiKeysRouter } from '@/voiceagent/modules/server/apikeysrouter';
import { standaloneAgentsRouter } from '@/features/standalone-agents/server/routers';



export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  templates: templatesRouter,
  voiceagents: voiceAgentsRouter,
  calllogs: callLogsRouter,
  batchcalls : batchCallsRouter,
  analytics : analyticsRouter,
  apikeys: apiKeysRouter,
  standaloneAgents: standaloneAgentsRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
