"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useAnimation,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Brain, Zap, GitBranch, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

type NodeDef = {
  id: string;
  logo: string;
  label: string;
  color: string;
};

const sidebarNodes: NodeDef[] = [
  { id: "trigger", logo: "/logos/googleform.svg", label: "Webhook", color: "from-violet-500 to-purple-500" },
  { id: "openai", logo: "/logos/openai.svg", label: "OpenAI", color: "from-emerald-500 to-teal-500" },
  { id: "notion", logo: "/logos/notion.svg", label: "Notion", color: "from-slate-600 to-slate-800" },
  { id: "slack", logo: "/logos/slack.svg", label: "Slack", color: "from-pink-500 to-rose-500" },
  { id: "email", logo: "/logos/sendgrid.png", label: "SendGrid", color: "from-sky-500 to-blue-500" },
  { id: "github", logo: "/logos/googleform.svg", label: "GitHub", color: "from-gray-700 to-gray-900" },
  { id: "stripe", logo: "/logos/openai.svg", label: "Stripe", color: "from-indigo-500 to-blue-600" },
  { id: "calendar", logo: "/logos/notion.svg", label: "Calendar", color: "from-orange-500 to-red-500" },
];

const canvasNodes = [
  { id: 1, type: "trigger", position: { x: 50, y: 40 } },
  { id: 2, type: "openai", position: { x: 50, y: 130 } },
  { id: 3, type: "notion", position: { x: 50, y: 220 } },
  { id: 4, type: "slack", position: { x: 280, y: 130 } },
  { id: 5, type: "email", position: { x: 280, y: 220 } },
] as const;

/** ↓↓↓ ONLY CHANGE #1: shorter stage height so card fits on page ↓↓↓ */
const STAGE_H = 520;
/** ↑↑↑ ONLY CHANGE #1 ↑↑↑ */

const STAGE_RADIUS = "rounded-3xl";

const HUD_TOP = 18;
const HUD_LEFT = 18;
const HUD_RIGHT = 18;

/** ↓↓↓ ONLY CHANGE #2: move canvas up so nodes don’t get clipped ↓↓↓ */
const CANVAS_OFFSET_X = 220;
const CANVAS_OFFSET_Y = 80;
/** ↑↑↑ ONLY CHANGE #2 ↑↑↑ */

const NODE_SIZE = 60;
const NODE_CENTER = NODE_SIZE / 2;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const promptExamples = [
  { text: "Send Slack notification and email when form is submitted", lang: "English" },
  { text: "Enviar notificación de Slack y correo cuando se envía el formulario", lang: "Español" },
  { text: "フォームが送信されたらSlack通知とメールを送信", lang: "日本語" },
  { text: "Envoyer une notification Slack et un e-mail lors de la soumission du formulaire", lang: "Français" },
  { text: "Bei Formularübermittlung Slack-Benachrichtigung und E-Mail senden", lang: "Deutsch" },
];

const Meteors = ({ number = 16 }: { number?: number }) => {
  const [mounted, setMounted] = useState(false);

  const styles = useMemo(() => {
    if (!mounted) return [];
    return [...new Array(number)].map(() => ({
      top: 0,
      left: Math.floor(Math.random() * 100) + "%",
      animationDelay: Math.random() * 1 + 0.2 + "s",
      animationDuration: Math.floor(Math.random() * 8 + 2) + "s",
    }));
  }, [mounted, number]);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <>
      {styles.map((style, idx) => (
        <span
          key={idx}
          className="pointer-events-none absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10]"
          style={style}
        >
          <div className="pointer-events-none absolute top-1/2 -z-10 h-[1px] w-[60px] -translate-y-1/2 bg-gradient-to-r from-slate-500 to-transparent" />
        </span>
      ))}
    </>
  );
};

const Spotlight = () => (
  <div
    className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full blur-3xl opacity-70"
    style={{
      background:
        "radial-gradient(closest-side, rgba(139,92,246,0.14), rgba(139,92,246,0.06), transparent 70%)",
    }}
  />
);

function getNodeCenter(nodeIndex: number) {
  const n = canvasNodes[nodeIndex];
  const cx = CANVAS_OFFSET_X + n.position.x + NODE_CENTER;
  const cy = CANVAS_OFFSET_Y + n.position.y + NODE_CENTER;
  return { cx, cy };
}

function buildConnections() {
  const n1 = getNodeCenter(0);
  const n2 = getNodeCenter(1);
  const n3 = getNodeCenter(2);
  const n4 = getNodeCenter(3);
  const n5 = getNodeCenter(4);

  const vPad = 18;

  return [
    {
      from: 1,
      to: 2,
      path: `M ${n1.cx} ${n1.cy + vPad} L ${n2.cx} ${n2.cy - vPad}`,
    },
    {
      from: 2,
      to: 3,
      path: `M ${n2.cx} ${n2.cy + vPad} L ${n3.cx} ${n3.cy - vPad}`,
    },
    {
      from: 2,
      to: 4,
      path: `M ${n2.cx + NODE_CENTER} ${n2.cy} C ${n2.cx + 120} ${n2.cy} ${n4.cx - 140} ${n4.cy} ${n4.cx - NODE_CENTER} ${n4.cy}`,
    },
    {
      from: 3,
      to: 5,
      path: `M ${n3.cx + NODE_CENTER} ${n3.cy} C ${n3.cx + 120} ${n3.cy} ${n5.cx - 140} ${n5.cy} ${n5.cx - NODE_CENTER} ${n5.cy}`,
    },
  ];
}

export function WorkflowBuilderAnimation() {
  const cursorControls = useAnimation();
  const { theme } = useTheme();

  const [placedNodes, setPlacedNodes] = useState<number[]>([]);
  const [drawnConnections, setDrawnConnections] = useState<number[]>([]);
  const [showNotification, setShowNotification] = useState(false);

  const [typedText, setTypedText] = useState("");
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  const [cursorMode, setCursorMode] =
    useState<"idle" | "click" | "typing">("idle");

  const isAliveRef = useRef(false);
  const runIdRef = useRef(0);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 500, damping: 55 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 55 });
  const rotateX = useTransform(mouseY, [-400, 400], [2, -2]);
  const rotateY = useTransform(mouseX, [-400, 400], [-2, 2]);

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    x.set(clientX - left - width / 2);
    y.set(clientY - top - height / 2);
  }
  function onMouseLeave() {
    x.set(0);
    y.set(0);
  }

  const currentExample = promptExamples[currentExampleIndex];
  const connections = useMemo(() => buildConnections(), []);

  useEffect(() => {
    isAliveRef.current = true;
    return () => {
      isAliveRef.current = false;
    };
  }, []);

  const activeNodesCount = useMemo(
    () => placedNodes.length,
    [placedNodes.length]
  );

  useEffect(() => {
    const runId = ++runIdRef.current;
    let cancelled = false;

    const safe = (fn: () => void) => {
      if (cancelled || !isAliveRef.current || runIdRef.current !== runId) return;
      fn();
    };

    const safeStart = async (v: any) => {
      if (cancelled || !isAliveRef.current || runIdRef.current !== runId) return;
      try {
        await cursorControls.start(v);
      } catch {
        // ignore
      }
    };

    const run = async () => {
      await new Promise<void>((res) => requestAnimationFrame(() => res()));
      if (cancelled || runIdRef.current !== runId) return;

      while (!cancelled && isAliveRef.current && runIdRef.current === runId) {
        const englishExample = promptExamples[0];

        safe(() => {
          setPlacedNodes([]);
          setDrawnConnections([]);
          setShowNotification(false);
          setTypedText("");
          setShowPrompt(false);
          setIsGenerating(false);
          setCursorMode("idle");
          setCurrentExampleIndex(0);
        });

        await safeStart({
          x: 290,
          y: 105,
          opacity: 0,
          scale: 1,
          transition: { duration: 0.2 },
        });
        await wait(150);

        safe(() => {
          setShowPrompt(true);
          setShowPalette(true);
        });
        await wait(130);

        safe(() => setCursorMode("typing"));
        await safeStart({
          x: 315,
          y: 142,
          opacity: 1,
          transition: { duration: 0.55, ease: "easeInOut" },
        });
        await wait(130);

        for (let i = 0; i <= englishExample.text.length; i++) {
          if (cancelled || runIdRef.current !== runId) return;
          safe(() => setTypedText(englishExample.text.slice(0, i)));
          await wait(15);
        }

        await wait(400);

        for (let langIndex = 1; langIndex < promptExamples.length; langIndex++) {
          if (cancelled || runIdRef.current !== runId) return;
          const example = promptExamples[langIndex];

          safe(() => setCursorMode("idle"));

          safe(() => {
            setCurrentExampleIndex(langIndex);
            setTypedText(example.text);
          });

          await wait(700);
        }

        safe(() => {
          setCurrentExampleIndex(0);
          setTypedText(englishExample.text);
        });

        await wait(180);

        safe(() => setCursorMode("click"));
        await safeStart({
          x: 560,
          y: 48,
          transition: { duration: 0.45, ease: "easeInOut" },
        });
        await wait(80);
        await safeStart({ scale: 0.95, transition: { duration: 0.08 } });
        await safeStart({ scale: 1, transition: { duration: 0.12 } });

        safe(() => {
          setIsGenerating(true);
          setCursorMode("idle");
        });

        await wait(400);

        for (let i = 0; i < canvasNodes.length; i++) {
          if (cancelled || runIdRef.current !== runId) return;
          safe(() => setPlacedNodes((p) => [...p, i]));
          await wait(120);
        }

        safe(() => setIsGenerating(false));
        await wait(150);

        for (let i = 0; i < connections.length; i++) {
          if (cancelled || runIdRef.current !== runId) return;
          safe(() =>
            setDrawnConnections((p) => {
              if (p.includes(i)) return p;
              return [...p, i];
            })
          );
          await wait(180);
        }

        await wait(300);

        safe(() => setShowNotification(true));
        await wait(900);

        await safeStart({ opacity: 0, transition: { duration: 0.25 } });
        await wait(500);
      }
    };

    run();
    return () => {
      cancelled = true;
      cursorControls.stop();
    };
  }, [cursorControls, connections]);

  return (
    <div className="flex h-full w-full flex-col justify-center space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-3"
      >
        <motion.h3
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="text-2xl font-bold bg-linear-to-r from-slate-900 via-violet-600 to-purple-600 bg-clip-text text-transparent"
        >
          Intelligent Workflow Builder
        </motion.h3>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className={`text-sm max-w-md mx-auto ${
            theme === "light" ? "text-gray-600" : "text-slate-600"
          }`}
        >
          Transform natural language into production-ready workflows
        </motion.p>
      </motion.div>

      {/* Stage */}
      <motion.div
        initial={{ opacity: 0, y: 36, rotateX: 18 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1, delay: 0.25, type: "spring", bounce: 0.2 }}
        className="relative mx-auto w-full max-w-[1400px] perspective-1000"
      >
        <motion.div
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
            height: `${STAGE_H}px`,
          }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          className={[
            "relative w-full",
            STAGE_RADIUS,
            "overflow-hidden",
            theme === "light"
              ? "border-2 border-violet-300 bg-white shadow-2xl shadow-violet-300/20"
              : "border-2 border-violet-500/30 bg-black/40 backdrop-blur-sm shadow-2xl shadow-violet-500/20",
          ].join(" ")}
        >
          {/* Background */}
          <div className="absolute inset-0 -z-10">
            <div className={`absolute inset-0 ${
              theme === "light" ? "bg-white" : "bg-[#070709]"
            }`} />
            <div className={`absolute inset-0 opacity-60 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_60%_55%_at_50%_20%,#000_65%,transparent_100%)] ${
              theme === "light" ? "opacity-30" : "opacity-60"
            }`} />
            <div className={`absolute inset-0 blur-[120px] ${
              theme === "light" ? "bg-violet-300/20 opacity-30" : "bg-violet-500/10 opacity-40"
            }`} />
            <Spotlight />
          </div>

          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-20" />
          <Meteors number={16} />

          {/* HUD */}
          <div className="absolute inset-0 z-40 pointer-events-none">
            {/* Controls Panel */}
            <div className="absolute top-40 left-4 flex flex-col gap-2 pointer-events-auto">
              <div className={`rounded-lg p-1.5 shadow-lg ${
                theme === "light"
                  ? "border border-gray-200 bg-white/95 backdrop-blur-xl"
                  : "border border-white/10 bg-[#0a0a0b]/95 backdrop-blur-xl"
              }`}>
                <div className="flex flex-col gap-1">
                  <button className={`p-1 rounded transition-colors ${
                    theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/10"
                  }`}>
                    <GitBranch className={`h-3 w-3 ${
                      theme === "light" ? "text-gray-600" : "text-zinc-400"
                    }`} />
                  </button>
                  <div className={`h-px my-0.5 ${
                    theme === "light" ? "bg-gray-200" : "bg-white/10"
                  }`} />
                  <button className={`p-1 rounded transition-colors ${
                    theme === "light" ? "hover:bg-gray-100" : "hover:bg-white/10"
                  }`}>
                    <Zap className={`h-3 w-3 ${
                      theme === "light" ? "text-gray-600" : "text-zinc-400"
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Mini Map */}
            <div className={`absolute bottom-3 left-3 w-24 h-18 rounded-lg overflow-hidden shadow-lg pointer-events-none ${
              theme === "light"
                ? "border border-gray-200 bg-white/95 backdrop-blur-xl"
                : "border border-white/10 bg-[#0a0a0b]/95 backdrop-blur-xl"
            }`}>
              <div className="absolute inset-0 p-1.5">
                <div className={`text-[8px] font-medium mb-1 ${
                  theme === "light" ? "text-gray-600" : "text-zinc-500"
                }`}>
                  Overview
                </div>
                <div className="relative h-full">
                  {canvasNodes.slice(0, placedNodes.length).map((node) => (
                    <div
                      key={node.id}
                      className="absolute w-2 h-2 rounded-sm bg-violet-500/40 border border-violet-400/60"
                      style={{
                        left: `${(node.position.x / 400) * 100}%`,
                        top: `${(node.position.y / 300) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Prompt */}
            <AnimatePresence>
              {showPrompt && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.25 }}
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{ top: HUD_TOP }}
                >
                  <div className={`pointer-events-auto w-[min(600px,92vw)] rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.25)] px-4 py-3 flex items-center gap-3 ${
                    theme === "light"
                      ? "border border-gray-200 bg-white/95 backdrop-blur-xl"
                      : "border border-white/10 bg-[#0a0a0b]/95 backdrop-blur-xl"
                  }`}>
                    <div className="h-8 w-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <Brain className="h-3.5 w-3.5 text-violet-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium mb-0.5 flex items-center gap-2 ${
                        theme === "light" ? "text-gray-600" : "text-zinc-500"
                      }`}>
                        <span>Natural Language Input</span>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentExample.lang}
                            initial={{ opacity: 0, scale: 0.9, y: -2 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 2 }}
                            transition={{ duration: 0.2 }}
                            className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 text-[10px] font-semibold border border-violet-500/20"
                          >
                            {currentExample.lang}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      <div className={`text-sm font-medium truncate ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}>
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={currentExampleIndex}
                            initial={{ opacity: 0, y: -3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ duration: 0.15 }}
                          >
                            {typedText}
                          </motion.span>
                        </AnimatePresence>
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="inline-block w-1.5 ml-0.5 text-violet-400"
                        >
                          ▍
                        </motion.span>
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="shrink-0 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <motion.div
                            className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 0.9,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          <span>Processing</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5" />
                          <span>Build Workflow</span>
                        </>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Canvas Layer */}
          <div className="absolute inset-0 z-20">
            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="cuteConn" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>

                <filter id="softGlow">
                  <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {connections.map((conn, i) =>
                drawnConnections.includes(i) ? (
                  <g key={i}>
                    <motion.path
                      d={conn.path}
                      stroke="url(#cuteConn)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      fill="none"
                      filter="url(#softGlow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: theme === "light" ? 0.5 : 0.35 }}
                      transition={{ duration: 0.55, ease: "easeInOut" }}
                    />
                    <motion.path
                      d={conn.path}
                      stroke="url(#cuteConn)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.55, ease: "easeInOut" }}
                    />
                    <motion.path
                      d={conn.path}
                      stroke={theme === "light" ? "rgba(100,100,100,0.6)" : "rgba(255,255,255,0.85)"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray="2 10"
                      initial={{ strokeDashoffset: 0, opacity: 0.65 }}
                      animate={{ strokeDashoffset: -120 }}
                      transition={{
                        duration: 2.0,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                    />
                  </g>
                ) : null
              )}
            </svg>

            {/* Nodes */}
            <div className="relative w-full h-full">
              {canvasNodes.map((node, i) => {
                if (!placedNodes.includes(i)) return null;
                const data = sidebarNodes.find((n) => n.id === node.type)!;

                return (
                  <motion.div
                    key={node.id}
                    className="absolute"
                    initial={{ opacity: 0, scale: 0.82, y: 10 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: CANVAS_OFFSET_X + node.position.x,
                      y: CANVAS_OFFSET_Y + node.position.y,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 18,
                      delay: i * 0.06,
                    }}
                  >
                    <motion.div whileHover={{ scale: 1.03 }} className="relative">
                      <div
                        className={[
                          "h-[60px] w-[60px] rounded-xl bg-linear-to-br",
                          data.color,
                          "shadow-[0_8px_28px_rgba(0,0,0,0.35)] border border-white/15",
                          "flex items-center justify-center",
                        ].join(" ")}
                      >
                        <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <Image
                            src={data.logo}
                            alt={data.label}
                            width={22}
                            height={22}
                            className="object-contain"
                          />
                        </div>
                      </div>

                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.55)] ${
                          theme === "light"
                            ? "bg-white border border-gray-200 text-gray-900"
                            : "bg-[#0a0a0b]/95 backdrop-blur-xl border border-white/10 text-white"
                        }`}>
                          {data.label}
                        </div>
                      </div>

                      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-violet-400 border-2 border-violet-200 shadow-lg shadow-violet-500/40" />
                      <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-pink-400 border-2 border-pink-200 shadow-lg shadow-pink-500/40" />
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Cursor */}
          <motion.div
            className="absolute pointer-events-none z-[70]"
            animate={cursorControls}
            initial={{ x: 330, y: 105, opacity: 0, scale: 1 }}
          >
            <div className="absolute -left-6 -top-6 h-16 w-16 rounded-full bg-violet-500/25 blur-3xl" />

            <motion.svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              className="drop-shadow-[0_12px_20px_rgba(139,92,246,0.55)]"
              animate={{ rotate: cursorMode === "click" ? -10 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <defs>
                <linearGradient id="cursorCute" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
              <path
                d="M3 3L10.2 20.2L12.7 12.7L20.2 10.2L3 3Z"
                fill="url(#cursorCute)"
                stroke="white"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </motion.svg>

            <AnimatePresence>
              {cursorMode === "click" && (
                <motion.div
                  initial={{ scale: 0.25, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="absolute -left-5 -top-5 h-16 w-16 rounded-full border-2 border-violet-400 bg-violet-400/15"
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {cursorMode === "typing" && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`absolute left-7 top-7 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-[0_6px_16px_rgba(0,0,0,0.55)] ${
                    theme === "light"
                      ? "bg-white border border-gray-200 text-gray-900"
                      : "bg-[#0a0a0b]/95 backdrop-blur-xl border border-white/10 text-white"
                  }`}
                >
                  typing…
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Success */}
          <AnimatePresence>
            {showNotification && (
              <motion.div
                initial={{ y: 10, opacity: 0, scale: 0.99 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[80]"
              >
                <div className={`rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.25)] px-4 py-2.5 flex items-center gap-3 ${
                  theme === "light"
                    ? "bg-white border border-emerald-300 backdrop-blur-xl"
                    : "bg-[#0a0a0b]/95 backdrop-blur-xl border border-emerald-500/20"
                }`}>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${
                      theme === "light" ? "text-gray-900" : "text-white"
                    }`}>
                      Workflow Deployed
                    </div>
                    <div className={`text-xs ${
                      theme === "light" ? "text-gray-600" : "text-zinc-400"
                    }`}>
                      {activeNodesCount} nodes • Ready for execution
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
