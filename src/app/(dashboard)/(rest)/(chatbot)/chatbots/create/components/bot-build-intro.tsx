"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Check } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { BUILD_STAGES } from "./constants";

export function BotBuildIntro() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const interval = setInterval(() => {
      setStage((prev) =>
        prev < BUILD_STAGES.length - 1 ? prev + 1 : BUILD_STAGES.length - 1,
      );
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const progressValue = ((stage + 1) / BUILD_STAGES.length) * 100;
  const active = BUILD_STAGES[stage];
  const ActiveIcon = active.icon;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border bg-background">
      <motion.div
        className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(139,92,246,0.22), rgba(59,130,246,0.10), transparent 70%)",
        }}
        animate={{ x: [0, 40, 0], y: [0, 25, 0] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(16,185,129,0.18), rgba(34,211,238,0.10), transparent 70%)",
        }}
        animate={{ x: [0, -35, 0], y: [0, -20, 0] }}
        transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      <div className="relative px-6 py-8 sm:px-10 sm:py-10">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="relative">
              <motion.div
                className="absolute -inset-10 rounded-full bg-gradient-to-r from-violet-500/25 via-cyan-500/20 to-emerald-500/25 blur-2xl"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 12,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              />
              <motion.div
                className="absolute -inset-6 rounded-full border border-primary/20"
                animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.25, 0.7] }}
                transition={{
                  duration: 1.8,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border bg-background/70 shadow-sm">
                <Bot className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Building your chatbot
              </div>
              <motion.div
                key={active.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-center gap-2 text-xl font-semibold lg:justify-start"
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r ${active.color} text-white shadow-sm`}
                >
                  <ActiveIcon className="h-4 w-4" />
                </span>
                <span>{active.label}</span>
              </motion.div>
              <div className="pt-2">
                <Progress value={progressValue} />
              </div>
              <div className="text-xs text-muted-foreground">
                This will only take a moment…
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {BUILD_STAGES.map((s, idx) => {
              const Icon = s.icon;
              const done = idx < stage;
              const isActive = idx === stage;
              return (
                <div
                  key={s.label}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                    isActive
                      ? "bg-accent/40"
                      : done
                        ? "bg-muted/30"
                        : "bg-background"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r ${s.color} text-white shadow-sm`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {done ? "Done" : isActive ? "In progress" : "Queued"}
                    </div>
                  </div>
                  {done ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <Check className="h-4 w-4 text-emerald-600" />
                    </div>
                  ) : (
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary/60"
                      animate={isActive ? { scale: [1, 1.4, 1] } : undefined}
                      transition={{
                        duration: 0.9,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
