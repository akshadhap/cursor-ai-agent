"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import { CHATBOT_TEMPLATES } from "../constants";
import type { ChatbotFormState, ChatbotTemplate } from "../types";

export function BasicInfoStep({
  form,
  setForm,
}: {
  form: ChatbotFormState;
  setForm: (next: ChatbotFormState) => void;
}) {
  const selectedTemplate = CHATBOT_TEMPLATES[form.template];

  const handleTemplateChange = (value: string) => {
    const templateKey = value as ChatbotTemplate;
    const template = CHATBOT_TEMPLATES[templateKey];
    setForm({
      ...form,
      template: templateKey,
      greetMessage: template.greetMessage,
      suggestion1: template.suggestions[0] ?? "",
      suggestion2: template.suggestions[1] ?? "",
      suggestion3: template.suggestions[2] ?? "",
    });
  };

  return (
    <>
      <div className="space-y-3">
        <Label>Start with a template</Label>
        <RadioGroup
          value={form.template}
          onValueChange={handleTemplateChange}
          className="grid gap-3 sm:grid-cols-3"
        >
          {(Object.keys(CHATBOT_TEMPLATES) as ChatbotTemplate[]).map(
            (templateKey) => {
              const template = CHATBOT_TEMPLATES[templateKey];
              return (
                <div key={templateKey} className="relative">
                  <RadioGroupItem
                    value={templateKey}
                    id={`create-template-${templateKey}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`create-template-${templateKey}`}
                    className="flex h-full flex-col justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                  >
                    <div className="font-semibold">{template.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {template.description}
                    </div>
                  </Label>
                </div>
              );
            },
          )}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Chatbot Name</Label>
        <Input
          id="name"
          placeholder={`e.g., ${selectedTemplate.name} Bot`}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="What is this chatbot for?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="greet">Greeting Message</Label>
        <Textarea
          id="greet"
          placeholder="Hello! How can I help you today?"
          value={form.greetMessage}
          onChange={(e) => setForm({ ...form, greetMessage: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Suggested questions (optional)</Label>
        <div className="grid gap-2">
          <Input
            placeholder="Suggestion 1"
            value={form.suggestion1}
            onChange={(e) => setForm({ ...form, suggestion1: e.target.value })}
          />
          <Input
            placeholder="Suggestion 2"
            value={form.suggestion2}
            onChange={(e) => setForm({ ...form, suggestion2: e.target.value })}
          />
          <Input
            placeholder="Suggestion 3"
            value={form.suggestion3}
            onChange={(e) => setForm({ ...form, suggestion3: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}
