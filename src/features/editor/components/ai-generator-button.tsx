"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useSetAtom } from "jotai";
import { aiGeneratorOpenAtom } from "../store/ai-generator-atoms";

export function AiGeneratorButton() {
  const setAiGeneratorOpen = useSetAtom(aiGeneratorOpenAtom);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setAiGeneratorOpen(true)}
      className="gap-2"
    >
      <Sparkles className="h-4 w-4" />
      <span>AI Generator</span>
    </Button>
  );
}
