"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { BuildMode } from "./types";
import { BotBuildIntro } from "./bot-build-intro";

export function CreateChatbotBuildOverlay({
  buildMode,
}: {
  buildMode: BuildMode;
}) {
  return (
    <AnimatePresence>
      {buildMode !== "idle" ? (
        <motion.div
          key="build"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6"
        >
          <div className="w-full max-w-4xl">
            <BotBuildIntro />
            {buildMode === "success" ? (
              <div className="mt-5 text-center text-sm text-muted-foreground">
                Chatbot ready. Redirecting…
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
