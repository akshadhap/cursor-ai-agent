"use client";

import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export type CreateChatbotStep = {
  id: number;
  title: string;
  icon: LucideIcon;
};

export function CreateChatbotStepper({
  steps,
  step,
}: {
  steps: CreateChatbotStep[];
  step: number;
}) {
  const totalSteps = steps.length;
  const currentStep = step + 1;
  const stepProgressPercent =
    totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="flex justify-center">
        <div className="flex items-center gap-4">
          {steps.map((s, idx) => {
            const stepNum = idx + 1;
            const isComplete = currentStep > stepNum;
            const isActive = currentStep === stepNum;
            const Icon = s.icon;

            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center h-12 w-12 rounded-full text-sm font-semibold transition-all duration-200 ${
                      isComplete
                        ? "bg-emerald-500 text-white shadow-md"
                        : isActive
                          ? "bg-primary/5 text-gray-400 border border-primary/20 dark:border-gray-600 shadow-sm"
                          : "bg-gray-50 border border-gray-200 text-primary dark:bg-transparent dark:border-gray-800"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon
                        className={`h-5 w-5 ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                    )}
                  </div>
                  <div className="mt-2 text-xs text-center w-24 text-muted-foreground">
                    {s.title}
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div className="mx-3 -mt-7">
                    <div
                      className={`h-1 w-20 rounded-full transition-all duration-200 ${
                        currentStep > stepNum
                          ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                          : "bg-gray-200 dark:bg-muted-foreground/30"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
