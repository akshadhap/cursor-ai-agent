"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ChevronRightIcon,
  MenuIcon,
  MessageSquareTextIcon,
  MicIcon,
  PhoneIcon,
  SendHorizonal,
  VideoIcon,
} from "lucide-react";

export function CreateChatbotMockPreview({
  mode,
  name,
  greetMessage,
  suggestions,
  primaryColor,
  hasAvatar,
  hasVoice,
  hasPhone,
  showLauncher,
}: {
  mode: "chat" | "selection";
  name: string;
  greetMessage: string;
  suggestions: string[];
  primaryColor: string;
  hasAvatar: boolean;
  hasVoice: boolean;
  hasPhone: boolean;
  showLauncher?: boolean;
}) {
  const safeName = name.trim() || "New Chatbot";
  const safeGreet = greetMessage.trim() || "Hi! How can I help you today?";

  const width = 418;
  const height = 560;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Preview</div>
          <div className="text-xs text-muted-foreground">Medium widget size</div>
        </div>
        <div className="text-xs text-muted-foreground">{width}px</div>
      </div>

      <div className="flex justify-center rounded-xl bg-muted/30 p-4">
        <div
          className="relative rounded-2xl border bg-background shadow-sm overflow-hidden"
          style={{ width, height }}
        >
          {mode === "chat" ? (
            <div className="flex flex-col" style={{ height }}>
              <div
                className="h-12 px-2 flex items-center justify-between text-white"
                style={{ background: primaryColor }}
              >
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    className="text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-white/20" />
                  <span className="text-sm font-medium truncate">{safeName}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  className="text-white hover:bg-white/10"
                >
                  <MenuIcon className="size-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="rounded-2xl bg-muted px-3 py-2 text-sm max-w-[280px]">
                    {safeGreet}
                  </div>
                </div>
              </div>

              {suggestions.length > 0 ? (
                <div className="border-t px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 3).map((s, idx) => (
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
                </div>
              ) : null}

              <div className="border-t p-3">
                <div className="flex items-end gap-2 rounded-xl border bg-background px-3 py-2">
                  <div className="text-sm text-muted-foreground flex-1">Type a message…</div>
                  <Button size="icon" variant="ghost" type="button">
                    <SendHorizonal className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col" style={{ height }}>
              <div
                className="h-12 px-2 flex items-center justify-between text-white"
                style={{ background: primaryColor }}
              >
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    type="button"
                    className="text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-white/20" />
                  <span className="text-sm font-medium truncate">{safeName}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  className="text-white hover:bg-white/10"
                >
                  <MenuIcon className="size-4" />
                </Button>
              </div>

              <div className="p-4">
                <div className="flex flex-col gap-y-0.5">
                  <p className="text-lg font-semibold leading-tight">Hi there! 👋</p>
                  <p className="text-sm opacity-80 leading-tight">Let&apos;s get you started</p>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-y-4 px-4 pb-4 overflow-y-auto">
                <Button className="h-16 w-full justify-between" variant="outline" type="button">
                  <div className="flex items-center gap-x-2">
                    <MessageSquareTextIcon className="size-4" />
                    <span>Start chat</span>
                  </div>
                  <ChevronRightIcon />
                </Button>

                {hasAvatar ? (
                  <Button
                    className="h-16 w-full justify-between"
                    variant="outline"
                    type="button"
                  >
                    <div className="flex items-center gap-x-2">
                      <VideoIcon className="size-4" />
                      <span>Start Video Call</span>
                    </div>
                    <ChevronRightIcon />
                  </Button>
                ) : null}

                {hasVoice ? (
                  <Button
                    className="h-16 w-full justify-between"
                    variant="outline"
                    type="button"
                  >
                    <div className="flex items-center gap-x-2">
                      <MicIcon className="size-4" />
                      <span>Start Voice Call</span>
                    </div>
                    <ChevronRightIcon />
                  </Button>
                ) : null}

                {hasPhone ? (
                  <Button
                    className="h-16 w-full justify-between"
                    variant="outline"
                    type="button"
                  >
                    <div className="flex items-center gap-x-2">
                      <PhoneIcon className="size-4" />
                      <span>Call us</span>
                    </div>
                    <ChevronRightIcon />
                  </Button>
                ) : null}

                <div className="mt-auto text-[11px] text-muted-foreground">
                  Powered by SpinaBot
                </div>
              </div>
            </div>
          )}

          {showLauncher ? (
            <div
              className="absolute"
              style={{ right: 16, bottom: 16 }}
            >
              <div
                className="h-12 w-12 rounded-full shadow-lg border"
                style={{ background: primaryColor }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
