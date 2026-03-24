"use client";

import { Button } from "@/components/ui/button";

import type { ChatbotFormState } from "./types";

export function CreateChatbotPreview({
  form,
  kbName,
  resolvedPrimaryColor,
  previewSuggestions,
}: {
  form: ChatbotFormState;
  kbName: string;
  resolvedPrimaryColor: string;
  previewSuggestions: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Live preview</div>
          <div className="text-xs text-muted-foreground">
            Resize this panel to see different layouts.
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-background overflow-hidden w-full">
        <div
          className="h-12 px-4 flex items-center"
          style={{ background: resolvedPrimaryColor }}
        >
          <div className="text-sm font-semibold text-white truncate">
            {form.name.trim() || "Your chatbot"}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-muted-foreground">Knowledge base: {kbName}</div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            {form.greetMessage.trim() || "Hello! How can I help you today?"}
          </div>
          {previewSuggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {previewSuggestions.map((s, idx) => (
                <Button
                  key={`${s}-${idx}`}
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  type="button"
                >
                  {s}
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              Add suggested questions to help users get started.
            </div>
          )}
          <div className="h-9 rounded-md border bg-background" />
        </div>
      </div>
    </div>
  );
}
