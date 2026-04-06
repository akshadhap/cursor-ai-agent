"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";

import { CHATBOT_TEMPLATES, THEME_PRESETS } from "../constants";
import type { ChatbotFormState, ThemePreset } from "../types";

export function StylingStep({
  form,
  setForm,
  kbName,
}: {
  form: ChatbotFormState;
  setForm: (next: ChatbotFormState) => void;
  kbName: string;
}) {
  const selectedTheme = THEME_PRESETS[form.themePreset];
  const selectedTemplate = CHATBOT_TEMPLATES[form.template];

  const customColorValue =
    typeof form.primaryColorOverride === "string" ? form.primaryColorOverride : "";
  const isHex = /^#([0-9a-fA-F]{3}){1,2}$/.test(customColorValue.trim());
  const fallbackHex = "#E08A3A";

  return (
    <>
      <div className="space-y-3">
        <Label>Theme</Label>
        <RadioGroup
          value={form.themePreset}
          onValueChange={(value) =>
            setForm({ ...form, themePreset: value as ThemePreset })
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((themeKey) => {
            const theme = THEME_PRESETS[themeKey];
            return (
              <div key={themeKey} className="relative">
                <RadioGroupItem
                  value={themeKey}
                  id={`create-theme-${themeKey}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`create-theme-${themeKey}`}
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <div
                    className="mb-2 h-8 w-8 rounded-full"
                    style={{ background: theme.primaryColor }}
                  />
                  <div className="text-center">
                    <div className="font-semibold">{theme.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {theme.description}
                    </div>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        <div className="text-xs text-muted-foreground">
          Select a preset or choose a custom color below.
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="primaryColor">Custom Primary Color (optional)</Label>
        <div className="flex items-center gap-x-2">
          <Input
            id="primaryColor"
            placeholder="e.g., #3b82f6 or leave blank"
            value={form.primaryColorOverride}
            onChange={(e) =>
              setForm({ ...form, primaryColorOverride: e.target.value })
            }
          />
          <Input
            className="h-10 w-20 cursor-pointer"
            type="color"
            value={isHex ? customColorValue.trim() : fallbackHex}
            onChange={(e) =>
              setForm({ ...form, primaryColorOverride: e.target.value })
            }
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Use a hex value for the color picker. Leave empty to use the preset.
        </div>
      </div>

      <div className="space-y-2">
        <Label>Widget Size</Label>
        <div className="flex items-center gap-x-4">
          <Slider
            value={[form.widgetWidth]}
            onValueChange={(value) =>
              setForm({ ...form, widgetWidth: Math.round(value[0] ?? 418) })
            }
            min={300}
            max={600}
            step={10}
            className="w-full"
          />
          <span className="text-sm text-muted-foreground w-20 text-right">
            {form.widgetWidth}px
          </span>
        </div>

        <div className="mt-2">
          <div className="text-sm font-medium">Recommended sizes</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={form.widgetWidth === 368 ? "default" : "outline"}
              onClick={() => setForm({ ...form, widgetWidth: 368 })}
            >
              Small
            </Button>
            <Button
              type="button"
              variant={form.widgetWidth === 418 ? "default" : "outline"}
              onClick={() => setForm({ ...form, widgetWidth: 418 })}
            >
              Medium
            </Button>
            <Button
              type="button"
              variant={form.widgetWidth === 468 ? "default" : "outline"}
              onClick={() => setForm({ ...form, widgetWidth: 468 })}
            >
              Large
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Small: 368px, Medium: 418px, Large: 468px
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isDefault"
          checked={form.isDefault}
          onCheckedChange={(checked) =>
            setForm({ ...form, isDefault: checked === true })
          }
        />
        <Label htmlFor="isDefault">Set as default chatbot</Label>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        <div className="font-medium">Review</div>
        <div className="mt-2 space-y-1 text-muted-foreground">
          <div>
            <span className="text-foreground">Name:</span> {form.name.trim() || "—"}
          </div>
          <div>
            <span className="text-foreground">Template:</span> {selectedTemplate.name}
          </div>
          <div>
            <span className="text-foreground">Knowledge base:</span> {kbName}
          </div>
          <div>
            <span className="text-foreground">Theme:</span> {selectedTheme.name}
          </div>
        </div>
      </div>
    </>
  );
}
