import { 
  Editor, 
  EditorError, 
  EditorLoading
} from "@/features/editor/components/editor";
import { EditorHeader } from "@/features/editor/components/editor-header";
import { prefetchWorkflow } from "@/features/workflows/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    workflowId: string;
  }>;
}


const Page = async ({ params }: PageProps) => {
  await requireAuth();

  const { workflowId } = await params;

  // make sure we await this; if the workflow is missing, send the user back
  try {
    await prefetchWorkflow(workflowId);
  } catch (err) {
    // Prefer soft redirect over throwing an unhandled TRPC error
    redirect("/workflows?missing=1");
  }

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<EditorError />}>
        <Suspense fallback={<EditorLoading />}>
          <EditorHeader workflowId={workflowId} />
          <main className="flex-1">
            <Editor workflowId={workflowId} />
          </main>
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
