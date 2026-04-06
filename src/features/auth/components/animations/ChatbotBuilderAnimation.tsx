"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Copy, Check, Code2, Sparkles, MessageSquare, Settings2, Palette } from "lucide-react";
import { useTheme } from "next-themes";

const EMBED_CODE = `<!-- Add to your website -->
<script 
  src="https://your-domain.com/widget.js"
  data-entity-id="entity_xxx"
  data-position="bottom-right"
></script>`;

export function ChatbotBuilderAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { theme } = useTheme();

  const steps = [
    { icon: Settings2, label: "Configure", color: "from-violet-500 to-purple-500" },
    { icon: Palette, label: "Customize", color: "from-blue-500 to-cyan-500" },
    { icon: Code2, label: "Embed", color: "from-emerald-500 to-teal-500" },
    { icon: MessageSquare, label: "Deploy", color: "from-orange-500 to-amber-500" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentStep === 3) {
      setTimeout(() => setShowChat(true), 300);
    } else {
      setShowChat(false);
    }
  }, [currentStep]);

  const handleCopy = () => {
    navigator.clipboard.writeText(EMBED_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
        <h3 className="text-2xl font-bold bg-linear-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
          AI Chatbot Builder
        </h3>
        <p className="text-muted-foreground text-sm">
          Enterprise-grade chatbots. Built in minutes.
        </p>
      </motion.div>


      <div className={`relative h-[500px] rounded-2xl shadow-2xl overflow-hidden transform perspective-1000 rotate-y-2 hover:rotate-y-0 transition-transform duration-500 ${
        theme === "light" 
          ? "bg-white border border-gray-200" 
          : "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800"
      }`}>
        {/* Ambient background */}
        <div className={`absolute inset-0 ${
          theme === "light"
            ? "bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-violet-100/40 via-transparent to-transparent"
            : "bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent"
        }`} />
        <div className={`absolute inset-0 ${
          theme === "light"
            ? "bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-cyan-100/40 via-transparent to-transparent"
            : "bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent"
        }`} />

        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative h-full p-6 flex flex-col gap-4"
            >
              <div className={`flex items-center gap-2 mb-2 ${theme === "light" ? "text-violet-600" : "text-violet-400"}`}>
                <Settings2 className="h-5 w-5" />
                <span className="font-semibold">Configure Settings</span>
              </div>
              {["Name & Description", "Knowledge Base", "Welcome Message"].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  className={`rounded-lg p-4 ${
                    theme === "light" 
                      ? "bg-gray-50 border border-gray-200" 
                      : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme === "light" ? "text-gray-700" : "text-slate-300"}`}>{item}</span>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 200 }}
                      className="h-2 w-2 rounded-full bg-emerald-500"
                    />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="customize"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative h-full p-6"
            >
              <div className={`flex items-center gap-2 mb-4 ${theme === "light" ? "text-blue-600" : "text-blue-400"}`}>
                <Palette className="h-5 w-5" />
                <span className="font-semibold">Customize Appearance</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className={`rounded-lg p-4 ${
                    theme === "light"
                      ? "bg-gray-50 border border-gray-200"
                      : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50"
                  }`}
                >
                  <p className={`text-xs mb-2 ${theme === "light" ? "text-gray-600" : "text-slate-400"}`}>Primary Color</p>
                  <div className="flex gap-2">
                    {["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-orange-500"].map((color, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className={`h-8 w-8 ${color} rounded-lg cursor-pointer border-2 ${i === 0 ? "border-white" : "border-transparent"}`}
                      />
                    ))}
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`rounded-lg p-4 ${
                    theme === "light"
                      ? "bg-gray-50 border border-gray-200"
                      : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50"
                  }`}
                >
                  <p className={`text-xs mb-2 ${theme === "light" ? "text-gray-600" : "text-slate-400"}`}>Position</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["↘️ Bottom Right", "↙️ Bottom Left"].map((pos, i) => (
                      <div
                        key={i}
                        className={`text-xs py-2 px-3 rounded text-center ${
                          i === 0 
                            ? theme === "light"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-blue-500/20 text-blue-300"
                            : theme === "light"
                            ? "bg-gray-200 text-gray-600"
                            : "bg-slate-700/30 text-slate-400"
                        }`}
                      >
                        {pos}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`mt-4 rounded-lg p-4 ${
                  theme === "light"
                    ? "bg-gray-50 border border-gray-200"
                    : "bg-slate-800/50 backdrop-blur-sm border border-slate-700/50"
                }`}
              >
                <p className={`text-xs mb-3 ${theme === "light" ? "text-gray-600" : "text-slate-400"}`}>Widget Preview</p>
                <div className={`rounded-lg p-3 h-32 flex items-end justify-end ${
                  theme === "light" ? "bg-gray-100" : "bg-slate-900/80"
                }`}>
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="h-12 w-12 rounded-full bg-linear-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg cursor-pointer"
                  >
                    <MessageSquare className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="embed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative h-full p-6 flex flex-col"
            >
              <div className={`flex items-center gap-2 mb-4 ${theme === "light" ? "text-emerald-600" : "text-emerald-400"}`}>
                <Code2 className="h-5 w-5" />
                <span className="font-semibold">Embed Code</span>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-lg p-4 flex-1 font-mono text-xs overflow-auto relative group ${
                  theme === "light"
                    ? "bg-gray-50 border border-gray-200"
                    : "bg-slate-900/90 backdrop-blur-sm border border-slate-700"
                }`}
              >
                <pre className={theme === "light" ? "text-emerald-700 leading-relaxed" : "text-emerald-400 leading-relaxed"}>
                  <code>{EMBED_CODE}</code>
                </pre>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopy}
                  className={`absolute top-3 right-3 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                    theme === "light"
                      ? "bg-gray-200 hover:bg-gray-300 text-gray-800"
                      : "bg-slate-800 hover:bg-slate-700 text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-xs">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className={`mt-4 flex items-start gap-2 text-xs ${theme === "light" ? "text-gray-600" : "text-slate-400"}`}
              >
                
                <p>Copy this code and paste it before the closing <code className={theme === "light" ? "text-emerald-700" : "text-emerald-400"}>&lt;/body&gt;</code> tag of your website</p>
              </motion.div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="deploy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="relative h-full p-6"
            >
              <div className={`flex items-center gap-2 mb-4 ${theme === "light" ? "text-orange-600" : "text-orange-400"}`}>
                <MessageSquare className="h-5 w-5" />
                <span className="font-semibold">Live Preview</span>
              </div>
              <div className={`rounded-lg h-[calc(100%-2rem)] overflow-hidden relative ${
                theme === "light"
                  ? "bg-gray-50 border border-gray-200"
                  : "bg-linear-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border border-slate-700"
              }`}>
                {/* Browser mockup */}
                <div className={`px-4 py-2 flex items-center gap-2 ${
                  theme === "light"
                    ? "bg-gray-100 border-b border-gray-200"
                    : "bg-slate-800/80 border-b border-slate-700"
                }`}>
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  </div>
                  <div className={`flex-1 rounded px-3 py-1 text-xs ${
                    theme === "light"
                      ? "bg-white text-gray-600"
                      : "bg-slate-900/50 text-slate-400"
                  }`}>
                    https://your-website.com
                  </div>
                </div>

                {/* Website content with chat */}
                <div className="p-4 h-[calc(100%-3rem)] relative">
                  <div className="text-center space-y-2 opacity-30">
                    <div className={`h-8 rounded w-3/4 mx-auto ${theme === "light" ? "bg-gray-200" : "bg-slate-700/30"}`} />
                    <div className={`h-4 rounded w-1/2 mx-auto ${theme === "light" ? "bg-gray-200" : "bg-slate-700/20"}`} />
                    <div className="space-y-2 mt-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`h-3 rounded ${theme === "light" ? "bg-gray-200" : "bg-slate-700/20"}`} />
                      ))}
                    </div>
                  </div>

                  {/* Chat Widget */}
                  <AnimatePresence>
                    {showChat && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`absolute bottom-4 right-4 w-64 rounded-xl shadow-2xl overflow-hidden ${
                          theme === "light"
                            ? "bg-white border border-gray-200"
                            : "bg-slate-900 border border-slate-700"
                        }`}
                      >
                        <div className="bg-linear-to-r from-violet-600 to-purple-600 px-4 py-3 flex items-center justify-between">
                          <span className="text-white font-semibold text-sm">Chat Assistant</span>
                          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                        </div>
                        <div className="p-3 space-y-2 h-48 overflow-hidden">
                          {[
                            { sender: "bot", text: "👋 Hi! How can I help you today?" },
                            { sender: "user", text: "Tell me about your platform" },
                            { sender: "bot", text: "We provide AI-powered chatbots that integrate seamlessly into your website!" },
                          ].map((msg, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.15 + i * 0.2, duration: 0.3 }}
                              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`text-xs px-3 py-2 rounded-lg max-w-[80%] ${
                                  msg.sender === "user"
                                    ? "bg-violet-600 text-white"
                                    : theme === "light"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-slate-800 text-slate-200"
                                }`}
                              >
                                {msg.text}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
