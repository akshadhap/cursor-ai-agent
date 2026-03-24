"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { ChatbotFormState } from "../types";

export function AiConfigurationStep({
  form,
  setForm,
  hasBeyondPresencePlugin,
  beyondPresenceAgents,
  isBeyondPresenceAgentsLoading,
  hasVapiPlugin,
  vapiAssistants,
  isVapiAssistantsLoading,
  vapiPhoneNumbers,
  isVapiPhoneNumbersLoading,
  onOpenBeyondPresenceSettings,
  onOpenVapiSettings,
}: {
  form: ChatbotFormState;
  setForm: (next: ChatbotFormState) => void;
  hasBeyondPresencePlugin: boolean;
  beyondPresenceAgents: any[];
  isBeyondPresenceAgentsLoading: boolean;
  hasVapiPlugin: boolean;
  vapiAssistants: any[];
  isVapiAssistantsLoading: boolean;
  vapiPhoneNumbers: any[];
  isVapiPhoneNumbersLoading: boolean;
  onOpenBeyondPresenceSettings: () => void;
  onOpenVapiSettings: () => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt (optional)</Label>
        <Textarea
          id="systemPrompt"
          placeholder="Add system-level instructions for how this assistant should behave"
          value={form.customSystemPrompt}
          onChange={(e) => setForm({ ...form, customSystemPrompt: e.target.value })}
        />
      </div>

      {hasBeyondPresencePlugin ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">AI Avatar</div>
              <div className="text-xs text-muted-foreground">
                Enable an avatar agent for this chatbot.
              </div>
            </div>
            <Checkbox
              checked={form.aiAvatarEnabled}
              onCheckedChange={(checked) =>
                setForm({ ...form, aiAvatarEnabled: checked === true })
              }
            />
          </div>

          {form.aiAvatarEnabled ? (
            <div className="space-y-2">
              <Label htmlFor="beyAgent">Avatar Agent</Label>
              <Select
                value={form.beyondPresenceAgentId}
                onValueChange={(value) =>
                  setForm({ ...form, beyondPresenceAgentId: value })
                }
                disabled={isBeyondPresenceAgentsLoading}
              >
                <SelectTrigger id="beyAgent">
                  <SelectValue
                    placeholder={
                      isBeyondPresenceAgentsLoading
                        ? "Loading agents..."
                        : "Select an agent"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {beyondPresenceAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name || "Unnamed Agent"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {beyondPresenceAgents.length === 0 && !isBeyondPresenceAgentsLoading ? (
                <div className="text-xs text-muted-foreground">
                  No agents found. Create one in AI Avatar settings.
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenBeyondPresenceSettings}
                    >
                      Go to AI Avatar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          AI Avatar plugin is not connected.
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenBeyondPresenceSettings}
            >
              Connect AI Avatar
            </Button>
          </div>
        </div>
      )}

      {hasVapiPlugin ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium">Voice Agent</div>
              <div className="text-xs text-muted-foreground">
                Enable voice calling for this chatbot.
              </div>
            </div>
            <Checkbox
              checked={form.voiceEnabled}
              onCheckedChange={(checked) =>
                setForm({ ...form, voiceEnabled: checked === true })
              }
            />
          </div>

          {form.voiceEnabled ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vapiAssistant">Voice Assistant</Label>
                <Select
                  value={form.vapiAssistantId}
                  onValueChange={(value) =>
                    setForm({ ...form, vapiAssistantId: value })
                  }
                  disabled={isVapiAssistantsLoading}
                >
                  <SelectTrigger id="vapiAssistant">
                    <SelectValue
                      placeholder={
                        isVapiAssistantsLoading
                          ? "Loading assistants..."
                          : "Select an assistant"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vapiAssistants.map((assistant) => (
                      <SelectItem key={assistant.id} value={assistant.id}>
                        {assistant.name || "Unnamed Assistant"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vapiPhone">Phone Number</Label>
                <Select
                  value={form.vapiPhoneNumber}
                  onValueChange={(value) =>
                    setForm({ ...form, vapiPhoneNumber: value })
                  }
                  disabled={isVapiPhoneNumbersLoading}
                >
                  <SelectTrigger id="vapiPhone">
                    <SelectValue
                      placeholder={
                        isVapiPhoneNumbersLoading
                          ? "Loading numbers..."
                          : "Select a phone number"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vapiPhoneNumbers.map((phone) => (
                      <SelectItem key={phone.id} value={phone.number || phone.id}>
                        {phone.number || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {vapiAssistants.length === 0 && !isVapiAssistantsLoading ? (
                <div className="text-xs text-muted-foreground sm:col-span-2">
                  No assistants found. Create one in Voice Assistant settings.
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenVapiSettings}
                    >
                      Go to Voice Assistant
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          Voice Assistant plugin is not connected.
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenVapiSettings}
            >
              Connect Voice Assistant
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
