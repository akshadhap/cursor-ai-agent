// src/features/editor/components/template-config-button.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { editorAtom } from "../store/atoms";
import { useSuspenseWorkflow } from "@/features/workflows/hooks/use-workflows";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type FollowupConfig = {
  daysOffset: number;
  subjectTemplate: string;
  bodyTemplate: string;
};

type TemplateConfig = {
  companyName: string;
  companyDescription: string;
  calendlyUrl: string;
  senderEmail: string;          // 👈 NEW
  numberOfFollowups: number;
  followups: FollowupConfig[];
};


const FIXED_FOLLOWUPS = 3;

// Default slots for followups – we’ll only use the first 3
const DEFAULT_FOLLOWUPS: FollowupConfig[] = [
  { daysOffset: 2, subjectTemplate: "", bodyTemplate: "" },
  { daysOffset: 5, subjectTemplate: "", bodyTemplate: "" },
  { daysOffset: 10, subjectTemplate: "", bodyTemplate: "" },
  { daysOffset: 14, subjectTemplate: "", bodyTemplate: "" },
  { daysOffset: 20, subjectTemplate: "", bodyTemplate: "" },
];

export const TemplateConfigButton = ({ workflowId }: { workflowId: string }) => {
  const { data: workflow } = useSuspenseWorkflow(workflowId);
  const editor = useAtomValue(editorAtom);

   // 👇 same logic you used in EditorHeader
  const isDeveloper = (workflow as any).isDeveloper ?? true;
  const isGuidedWorkflow = !isDeveloper;

  const [open, setOpen] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");

const [senderEmail, setSenderEmail] = useState("");
const [isSenderValid, setIsSenderValid] = useState(false);
const [isValidatingSender, setIsValidatingSender] = useState(false);
const [senderValidationError, setSenderValidationError] = useState<string | null>(null);

  const [followups, setFollowups] = useState<FollowupConfig[]>(
    DEFAULT_FOLLOWUPS.slice(0, FIXED_FOLLOWUPS),
  );

  const templateNodeId = useMemo(() => {
    const node = workflow.nodes.find((n) => {
      const data = (n.data ?? {}) as any;
      return !!data.templateId;
    });

    return node?.id ?? null;
  }, [workflow.nodes]);

  const isTemplateWorkflow = !!templateNodeId;

  useEffect(() => {
    if (!open || !editor || !templateNodeId) return;

    const nodes = editor.getNodes();
    const templateNode = nodes.find((n) => n.id === templateNodeId);
    const data = (templateNode?.data ?? {}) as any;
    const existingConfig = data.templateConfig as Partial<TemplateConfig> | undefined;

    // Build an index of WAIT nodes by followupIndex to read current delays
    const waitByIndex: Record<number, any> = {};
    nodes.forEach((n) => {
      const nd = (n.data ?? {}) as any;
      if (
        n.type === "WAIT" &&
        typeof nd.followupIndex === "number" &&
        nd.followupIndex >= 0
      ) {
        waitByIndex[nd.followupIndex] = nd;
      }
    });

    if (existingConfig) {
      // company fields
      setCompanyName(existingConfig.companyName ?? "");
      setCompanyDescription(existingConfig.companyDescription ?? "");
      setCalendlyUrl(existingConfig.calendlyUrl ?? "");

      // 👇 NEW: load sender email & treat as valid if present
const existingSender = (existingConfig as any).senderEmail ?? "";
setSenderEmail(existingSender);
setIsSenderValid(!!existingSender);
setSenderValidationError(null);

      const existingFollowups = Array.isArray(existingConfig.followups)
        ? existingConfig.followups
        : [];

      const mergedFollowups: FollowupConfig[] = Array.from(
        { length: FIXED_FOLLOWUPS },
        (_, index) => {
          const fromConfig = existingFollowups[index];
          const waitData = waitByIndex[index];

          const daysFromWait =
            waitData && typeof waitData.delayDays === "number"
              ? waitData.delayDays
              : undefined;

          return {
            daysOffset:
              typeof daysFromWait === "number"
                ? daysFromWait
                : typeof fromConfig?.daysOffset === "number"
                  ? fromConfig.daysOffset
                  : DEFAULT_FOLLOWUPS[index]?.daysOffset ?? 2,
            subjectTemplate: fromConfig?.subjectTemplate ?? "",
            bodyTemplate: fromConfig?.bodyTemplate ?? "",
          };
        },
      );

      setFollowups(mergedFollowups);
    } else {
      // No existing config → reset to defaults / empty
      setCompanyName("");
      setCompanyDescription("");
      setCalendlyUrl("");
      setFollowups(DEFAULT_FOLLOWUPS.slice(0, FIXED_FOLLOWUPS));
    }
  }, [open, editor, templateNodeId]);

  const handleFollowupChange = (index: number, patch: Partial<FollowupConfig>) => {
    setFollowups((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  };


  const handleValidateSenderEmail = async () => {
  setSenderValidationError(null);
  setIsSenderValid(false);

  const trimmed = senderEmail.trim();
  if (!trimmed) {
    setSenderValidationError("Sender email is required.");
    return;
  }

  // simple client-side sanity check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    setSenderValidationError("Please enter a valid email address.");
    return;
  }

  setIsValidatingSender(true);
  try {
    // 👇 adjust this URL to match your actual backend endpoint
    const res = await fetch("/api/smtp2go/validate-sender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });

    if (!res.ok) {
      throw new Error("Failed to validate sender email.");
    }

    const data = await res.json();

// Sender is fully verified in SMTP2GO
if (data?.valid) {
  setIsSenderValid(true);
  setSenderValidationError(null);
}
// Sender was just added in SMTP2GO, but still needs to click
// the confirmation link in their inbox.
else if (data?.pending) {
  setIsSenderValid(false);
  setSenderValidationError(
    data?.message ||
      `We've sent a verification email to ${trimmed}. Please confirm it from your inbox and then click "Validate" again.`
  );
}
// Sender is not valid and not pending → hard failure
else {
  setIsSenderValid(false);
  setSenderValidationError(
    data?.message || "Sender email is not verified in SMTP2GO."
  );
}

  } catch (err: any) {
    setIsSenderValid(false);
    setSenderValidationError(
      err?.message || "Could not validate sender email. Try again."
    );
  } finally {
    setIsValidatingSender(false);
  }
};

  const handleSaveConfig = () => {
    if (!editor || !templateNodeId) return;

    const nodes = editor.getNodes();

    // Always exactly 3 followups
    const paddedFollowups = [...followups];

    for (let i = 0; i < FIXED_FOLLOWUPS; i++) {
      if (!paddedFollowups[i]) {
        paddedFollowups[i] = {
          daysOffset: DEFAULT_FOLLOWUPS[i]?.daysOffset ?? 2,
          subjectTemplate: `Follow-up for {{lead.company}} #${i + 1}`,
          bodyTemplate: `Hi {{lead.name}}, this is follow-up #${i + 1} from {{templateConfig.companyName}}.`,
        };
      }
    }

    const config: TemplateConfig = {
      companyName,
      companyDescription,
      calendlyUrl,
      senderEmail,
      numberOfFollowups: FIXED_FOLLOWUPS,
      followups: paddedFollowups.slice(0, FIXED_FOLLOWUPS),
    };

    const updatedNodes = nodes.map((node) => {
      const data = (node.data ?? {}) as any;

      // 1) Update template node with new templateConfig
      if (node.id === templateNodeId) {
        return {
          ...node,
          data: {
            ...data,
            templateConfig: config,
          },
        };
      }

      // 2) For followup-related nodes (WAIT + SENDGRID) use followupIndex
      const followupIndex =
        typeof data.followupIndex === "number" ? data.followupIndex : null;

      if (followupIndex === null || followupIndex < 0 || followupIndex >= FIXED_FOLLOWUPS) {
        return node;
      }

      const follow = config.followups[followupIndex];
      if (!follow) {
        return node;
      }

      // 2a) Sync WAIT node delay with daysOffset
      if (node.type === "WAIT") {
        return {
          ...node,
          data: {
            ...data,
            followupIndex,
            delayDays: follow.daysOffset ?? 0,
            delayHours: 0,
            delayMinutes: 0,
          },
        };
      }

      // 2b) Sync SENDGRID followup email subject/body
      if (
        node.type === "SENDGRID" &&
        typeof data.variableName === "string" &&
        data.variableName.startsWith("sentFollowup_") // 👈 match your server-side creation
      ) {
        return {
          ...node,
          data: {
            ...data,
            followupIndex,
            subject: follow.subjectTemplate ?? "",
            body: follow.bodyTemplate ?? "",
          },
        };
      }

      return node;
    });

    // Only update NODES. Do NOT touch edges here.
    editor.setNodes(updatedNodes);
    setOpen(false);
  };

  if (!isTemplateWorkflow) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="mr-2">
          Config
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[420px] p-0">
        <div className="h-full overflow-y-auto p-6 space-y-8">
          <SheetHeader>
            <SheetTitle className="text-xl font-semibold">
              Template Configuration
            </SheetTitle>
            <SheetDescription>
              Configure dynamic placeholders and follow-up timing.
            </SheetDescription>
          </SheetHeader>

          {/* Company */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Company</h3>
            <div className="space-y-4">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g. Quoratio Labs"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="companyDescription">
                Tell more about the company
              </Label>
              <Textarea
                id="companyDescription"
                placeholder="What do you do, who do you help, key value prop..."
                rows={3}
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Label htmlFor="calendlyUrl">Meeting link</Label>
              <Input
                id="calendlyUrl"
                placeholder="https://calendly.com/your-company/demo"
                value={calendlyUrl}
                onChange={(e) => setCalendlyUrl(e.target.value)}
              />
            </div>

            {/* 👇 NEW: Sender email + validate button */}
<div className="space-y-4">
  <Label htmlFor="senderEmail">Sender email</Label>
  <div className="flex items-center gap-2">
    <Input
      id="senderEmail"
      placeholder="you@yourcompany.com"
      value={senderEmail}
      onChange={(e) => {
        setSenderEmail(e.target.value);
        setIsSenderValid(false);           // reset validity when editing
        setSenderValidationError(null);
      }}
    />
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleValidateSenderEmail}
      disabled={isValidatingSender}
    >
      {isValidatingSender ? "Validating..." : "Validate"}
    </Button>
  </div>

  {senderValidationError && (
    <p className="text-sm text-red-500 mt-1">{senderValidationError}</p>
  )}

  {isSenderValid && !senderValidationError && senderEmail.trim() && (
    <p className="text-sm font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
      Sender email verified and ready to use!
    </p>
  )}
</div>

          </section>

          <Separator />

          {/* Follow-up Settings */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium">Follow-up Settings</h3>

            {/* We fix it at 3, so no number-of-followups input */}

            <Separator />

            {/* Follow-up items */}
            <div className="space-y-6">
              {followups.map((f, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Follow-up #{index + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Days After</Label>
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={f.daysOffset}
                        onChange={(e) =>
                          handleFollowupChange(index, {
                            daysOffset: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Subject Template</Label>
                    <Input
                      placeholder="Quick question about {{lead.company}}"
                      value={f.subjectTemplate}
                      onChange={(e) =>
                        handleFollowupChange(index, {
                          subjectTemplate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Body Template</Label>
                    <Textarea
                      rows={3}
                      placeholder="Use {{lead.*}} and {{templateConfig.companyName}}..."
                      value={f.bodyTemplate}
                      onChange={(e) =>
                        handleFollowupChange(index, {
                          bodyTemplate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <Separator />
                </div>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
  {isSenderValid && senderEmail.trim() ? (
    <Button size="sm" onClick={handleSaveConfig}>
      Save Config
    </Button>
  ) : (
    <Button size="sm" disabled variant="outline">
      Validate sender email to save
    </Button>
  )}
</div>

        </div>
      </SheetContent>
    </Sheet>
  );
};
