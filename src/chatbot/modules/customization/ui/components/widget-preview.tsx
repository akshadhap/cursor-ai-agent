"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { EyeIcon, EyeOffIcon } from "lucide-react";

interface WidgetPreviewProps {
  chatbot?: {
    _id: string;
    chatbotId?: string;
    name: string;
  };
  chatbotId: string;
  entityId: string;
  primaryColor?: string;
  width?: number;
  autoShow?: boolean;
  defaultOpen?: boolean;
  autoOpen?: boolean;
  dockToContainer?: boolean;
  hideToggle?: boolean;
  forcedScreen?: string;
  openMode?: "open" | "button";
  reloadKey?: string | number;
  containerMinHeight?: number;
  containerClassName?: string;
}

// Cleanup helper to remove all widget elements
const cleanupWidget = () => {
  // Remove the script
  const scriptEl = document.getElementById("echo-widget-preview-script");
  if (scriptEl) {
    scriptEl.remove();
  }

  // Remove any widget elements created by the script
  const widgetButton = document.getElementById("echo-widget-button");
  const widgetContainer = document.getElementById("echo-widget-container");
  
  if (widgetButton) widgetButton.remove();
  if (widgetContainer) widgetContainer.remove();

  // Also remove by query selector patterns as fallback
  document.querySelectorAll('[id^="echo-widget"]').forEach(el => el.remove());
  document.querySelectorAll('iframe[src*="widget"]').forEach(el => el.remove());

  // Clean up EchoWidget global
  if ((window as any).EchoWidget) {
    try {
      (window as any).EchoWidget.destroy?.();
    } catch (e) {
      // ignore
    }
    delete (window as any).EchoWidget;
  }
};

export const WidgetPreview = ({
  chatbot,
  chatbotId,
  entityId,
  primaryColor,
  width,
  autoShow,
  defaultOpen,
  autoOpen,
  dockToContainer,
  hideToggle,
  forcedScreen,
  openMode,
  reloadKey,
  containerMinHeight,
  containerClassName,
}: WidgetPreviewProps) => {
  const [showPreview, setShowPreview] = useState(
    Boolean(autoShow) || Boolean(defaultOpen) || Boolean(hideToggle),
  );
  const [previewKey, setPreviewKey] = useState(0); // Force re-render on chatbot change

  // When chatbot changes, cleanup and reset
  useEffect(() => {
    cleanupWidget();
    setShowPreview(Boolean(autoShow) || Boolean(defaultOpen) || Boolean(hideToggle));
    setPreviewKey(prev => prev + 1);
  }, [chatbot?._id, chatbotId, autoShow, defaultOpen, hideToggle, reloadKey]);

  useEffect(() => {
    if (!showPreview || typeof window === "undefined") return;

    // Clean up any existing widget first
    cleanupWidget();

    // Small delay to ensure cleanup is complete
    const timeoutId = setTimeout(() => {
      // Create script element that loads the embed script
      const script = document.createElement("script");
      const widgetBaseUrl =
        (process.env.NEXT_PUBLIC_CHATBOT_WIDGET_URL ?? "").trim() ||
        (typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "http://localhost:3001"
          : "https://chatbot.spinabot.com");
      const embedUrl = `${widgetBaseUrl.replace(/\/$/, "")}/widget.js`;

      // Use the string chatbotId field, NOT the _id
      
      script.src = embedUrl;
      script.setAttribute("data-entity-id", entityId);
            script.setAttribute("data-chatbot-id", chatbotId);
      script.async = true;
      script.id = "echo-widget-preview-script";

      // Append to preview container
      const container = document.getElementById("widget-preview-container");
      if (container) {
        container.appendChild(script);
      }

      if (autoShow || autoOpen) {
        setTimeout(() => {
          try {
            (window as any).EchoWidget?.show?.();
          } catch (e) {
            // ignore
          }
        }, 250);
      }
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      cleanupWidget();
    };
  }, [showPreview, entityId, chatbotId, previewKey, autoShow, autoOpen]);

  useEffect(() => {
    if (!showPreview || typeof window === "undefined") return;
    if (!dockToContainer) return;

    const containerEl = document.getElementById("widget-preview-container");
    if (!containerEl) return;

    // Ensure the preview container can act as a positioning context.
    if (!containerEl.style.position) {
      containerEl.style.position = "relative";
    }

    const dock = (): boolean => {
      const widgetButton = document.getElementById(
        "echo-widget-button",
      ) as HTMLButtonElement | null;
      const widgetContainer = document.getElementById(
        "echo-widget-container",
      ) as HTMLElement | null;

      if (!widgetButton || !widgetContainer) return false;

      // Move elements under the preview container (instead of body).
      if (widgetContainer.parentElement !== containerEl) {
        containerEl.appendChild(widgetContainer);
      }
      if (widgetButton.parentElement !== containerEl) {
        containerEl.appendChild(widgetButton);
      }

      // Force them to be positioned within the preview container.
      widgetButton.style.position = "absolute";
      widgetButton.style.right = "16px";
      widgetButton.style.bottom = "16px";
      widgetButton.style.zIndex = "10";

      widgetContainer.style.position = "absolute";
      widgetContainer.style.right = "16px";
      widgetContainer.style.bottom = "76px";
      widgetContainer.style.zIndex = "9";

      // Keep the widget from being clipped.
      widgetContainer.style.maxWidth = "100%";

      return true;
    };

    const ok = dock();
    if (ok) return;

    let attempts = 0;
    const intervalId = setInterval(() => {
      attempts += 1;
      if (dock() || attempts >= 20) {
        clearInterval(intervalId);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [showPreview, dockToContainer, previewKey, chatbotId, entityId]);

  useEffect(() => {
    if (!showPreview || typeof window === "undefined") return;

    const nextPrimaryColor =
      typeof primaryColor === "string" && primaryColor.trim().length > 0
        ? primaryColor.trim()
        : null;

    const applyToLauncher = () => {
      const widgetButton = document.getElementById("echo-widget-button") as HTMLButtonElement | null;
      if (!widgetButton) return;

      if (nextPrimaryColor) {
        const hexes = nextPrimaryColor.match(/#(?:[0-9a-fA-F]{3}){1,2}/g);
        const shadowColor = hexes && hexes.length > 0 ? hexes[hexes.length - 1] : nextPrimaryColor;
        widgetButton.style.background = nextPrimaryColor;
        widgetButton.style.boxShadow = `0 4px 24px ${shadowColor}59`;
      } else {
        widgetButton.style.background = "";
        widgetButton.style.boxShadow = "";
      }
    };

    const postToIframe = (): boolean => {
      const iframe = document.querySelector(
        "#echo-widget-container iframe"
      ) as HTMLIFrameElement | null;

      if (!iframe?.contentWindow) return false;

      iframe.contentWindow.postMessage(
        {
          type: "previewAppearance",
          payload: {
            primaryColor: nextPrimaryColor,
          },
        },
        "*"
      );
      return true;
    };

    applyToLauncher();

    const sent = postToIframe();
    if (sent) return;

    const timeoutId = setTimeout(() => {
      applyToLauncher();
      postToIframe();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [showPreview, primaryColor]);

  useEffect(() => {
    if (!showPreview || typeof window === "undefined") return;
    if (!forcedScreen) return;

    const postToIframe = (): boolean => {
      const iframe = document.querySelector(
        "#echo-widget-container iframe",
      ) as HTMLIFrameElement | null;

      if (!iframe?.contentWindow) return false;

      iframe.contentWindow.postMessage(
        {
          type: "setScreen",
          payload: { screen: forcedScreen },
        },
        "*",
      );
      return true;
    };

    const sent = postToIframe();
    if (sent) return;

    const timeoutId = setTimeout(() => {
      postToIframe();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [showPreview, forcedScreen]);

  useEffect(() => {
    if (!showPreview || typeof window === "undefined") return;

    const mode = openMode ?? "open";
    const container = document.getElementById("echo-widget-container") as HTMLElement | null;

    if (mode === "button") {
      try {
        (window as any).EchoWidget?.hide?.();
      } catch {
        // ignore
      }
      if (container) {
        container.style.display = "none";
      }
      return;
    }

    if (container) {
      container.style.display = "";
    }

    try {
      (window as any).EchoWidget?.show?.();
    } catch {
      // ignore
    }
  }, [showPreview, openMode]);

  useEffect(() => {
    if (!showPreview || typeof window === "undefined") return;
    if (!width) return;

    const w = Math.max(300, Math.min(600, width));
    const h = Math.round(w * 1.22);

    const applySize = (): boolean => {
      const container = document.getElementById("echo-widget-container");
      if (!container) return false;

      container.style.width = `${w}px`;
      container.style.height = `${h}px`;

      const iframe = container.querySelector("iframe") as HTMLIFrameElement | null;
      if (iframe) {
        iframe.style.width = "100%";
        iframe.style.height = "100%";
      }

      return true;
    };

    // Try immediately
    const applied = applySize();
    if (applied) return;

    // Widget DOM can mount after the embed script runs; retry a few times.
    let attempts = 0;
    const intervalId = setInterval(() => {
      attempts += 1;
      if (applySize() || attempts >= 10) {
        clearInterval(intervalId);
      }
    }, 120);

    return () => clearInterval(intervalId);
  }, [showPreview, width]);

  if (!entityId) {
    return null;
  }

  // When autoShow is true, only render the container without any wrapper
  if (autoShow) {
    return (
      <div
        id="widget-preview-container"
        key={previewKey}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
        }}
      >
        {/* Widget will be injected here by the embed script */}
      </div>
    );
  }

  // Otherwise show the button toggle
  if (hideToggle) {
    return (
      <div
        id="widget-preview-container"
        key={previewKey}
        className={`relative rounded-lg border bg-muted/50 overflow-visible ${
          containerClassName ?? "p-4"
        }`}
        style={{
          minHeight: `${containerMinHeight ?? 120}px`,
          position: "relative",
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setShowPreview(!showPreview)}
      >
        {showPreview ? (
          <>
            <EyeOffIcon className="mr-2 h-4 w-4" />
            Hide Live Preview
          </>
        ) : (
          <>
            <EyeIcon className="mr-2 h-4 w-4" />
            Show Live Preview
          </>
        )}
      </Button>

      {showPreview && (
        <div
          id="widget-preview-container"
          key={previewKey}
          className={`relative rounded-lg border bg-muted/50 overflow-visible ${
            containerClassName ?? "p-4"
          }`}
          style={{
            minHeight: `${containerMinHeight ?? 120}px`,
            position: "relative",
          }}
        >
          {/* Widget will be injected here by the embed script */}
        </div>
      )}
    </div>
  );
};
