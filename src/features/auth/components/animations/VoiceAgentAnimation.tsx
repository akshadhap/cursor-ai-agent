"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Phone, Settings, Brain, Database, Check, Upload, FileText, Sparkles, Loader2, Plug, ShoppingCart, CreditCard, Store, Webhook, Zap } from "lucide-react";
import { useTheme } from "next-themes";

export function VoiceAgentAnimation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [animatingIndex, setAnimatingIndex] = useState(0);
  const { theme } = useTheme();

  const steps = [
    {
      id: 1,
      title: "Phone Setup",
      icon: Phone,
      description: "Creating dedicated phone number",
      detail: "+1 (405) 555-1234",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
    {
      id: 2,
      title: "Agent Details",
      icon: Settings,
      description: "Configuring agent profile",
      detail: "Customer Support Agent",
      color: "from-violet-500 to-purple-500",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/30",
    },
    {
      id: 3,
      title: "Knowledge Base",
      icon: Database,
      description: "Uploading training documents",
      detail: "3 files processed",
      color: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
    },
    {
      id: 4,
      title: "Integrations",
      icon: Plug,
      description: "",
      detail: "",
      color: "from-pink-500 to-rose-500",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/30",
    },
  ];

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % steps.length;
        return next;
      });
      setProgress(0);
    }, currentStep === 3 ? 4000 : 2500);

    return () => clearInterval(stepInterval);
  }, [steps.length, currentStep]);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 1, 100));
    }, 25);

    return () => clearInterval(progressInterval);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 3) {
      const interval = setInterval(() => {
        setAnimatingIndex((prev) => (prev + 1) % 6);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-3"
      >
        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
          Build AI Voice Agents
        </h3>
        <p className="text-muted-foreground text-sm">
          Create intelligent voice assistants in 4 simple steps
        </p>
      </motion.div>

      <div className={`relative min-h-[480px] rounded-2xl shadow-2xl overflow-hidden ${
        theme === "light"
          ? "bg-white border border-gray-200"
          : "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800"
      }`}>
        {/* Ambient background */}
        <div className={`absolute inset-0 ${
          theme === "light"
            ? "bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent"
            : "bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"
        }`} />
        <div className={`absolute inset-0 ${
          theme === "light"
            ? "bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-purple-100/40 via-transparent to-transparent"
            : "bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"
        }`} />

        <div className="relative h-full p-8">
          {/* Progress Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  theme === "light" ? "text-gray-800" : "text-slate-300"
                }`}>Creating Voice Agent</span>
              </div>
              <div className={`text-sm font-medium ${
                theme === "light" ? "text-gray-600" : "text-slate-400"
              }`}>
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${
              theme === "light" ? "bg-gray-200" : "bg-slate-800"
            }`}>
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Steps Overview */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {steps.map((step, idx) => {
              const isComplete = idx < currentStep;
              const isActive = idx === currentStep;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative p-4 rounded-xl border transition-all duration-300 ${
                    isActive
                      ? `${step.bgColor} ${step.borderColor} shadow-lg`
                      : isComplete
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : theme === "light"
                        ? "bg-gray-50 border-gray-200"
                        : "bg-slate-800/50 border-slate-700/50"
                  }`}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div
                      className={`h-12 w-12 rounded-lg flex items-center justify-center transition-all ${
                        isComplete
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? `bg-gradient-to-br ${step.color} text-white`
                            : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {isComplete ? <Check className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
                    </div>
                    <div className={`text-xs font-medium ${
                      isComplete
                        ? "text-emerald-100"
                        : isActive
                        ? theme === "light"
                          ? "text-gray-900"
                          : "text-white"
                        : theme === "light"
                        ? "text-gray-600"
                        : "text-slate-400"
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/5 to-transparent"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Active Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Main Card */}
              {currentStep !== 3 && (
                <div className={`p-6 rounded-xl border ${steps[currentStep].bgColor} ${steps[currentStep].borderColor} backdrop-blur-sm`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${steps[currentStep].color}`}>
                      {React.createElement(steps[currentStep].icon, { className: "h-6 w-6 text-white" })}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-lg font-semibold mb-1 ${
                        theme === "light" ? "text-gray-900" : "text-white"
                      }`}>{steps[currentStep].title}</h4>
                      <p className={`text-sm ${
                        theme === "light" ? "text-gray-600" : "text-slate-400"
                      }`}>{steps[currentStep].description}</p>
                    </div>
                  </div>

                  {/* Step-specific content */}
                  <div className="space-y-3">
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      theme === "light"
                        ? "bg-gray-50 border border-gray-200"
                        : "bg-slate-900/50 border border-slate-700/50"
                    }`}>
                      <span className={`text-sm ${
                        theme === "light" ? "text-gray-700" : "text-slate-300"
                      }`}>{steps[currentStep].detail}</span>
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {currentStep === 1 && (
                <div className={`p-4 rounded-lg ${
                  theme === "light"
                    ? "bg-gray-50 border border-gray-200"
                    : "bg-slate-800/50 border border-slate-700/50"
                }`}>
                  <div className={`text-xs mb-2 ${
                    theme === "light" ? "text-gray-600" : "text-slate-400"
                  }`}>Agent Type</div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-violet-500/20 text-violet-300 text-xs rounded-full border border-violet-500/30">Support</span>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      theme === "light"
                        ? "bg-gray-200 text-gray-600 border border-gray-300"
                        : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                    }`}>Sales</span>
                    <span className={`px-3 py-1 text-xs rounded-full ${
                      theme === "light"
                        ? "bg-gray-200 text-gray-600 border border-gray-300"
                        : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                    }`}>Receptionist</span>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-3">
                  <div className={`text-xs text-center ${
                    theme === "light" ? "text-gray-600" : "text-slate-400"
                  }`}>Connect your tools</div>
                  
                  {/* Compact Drag & Drop Animation */}
                  <div className={`relative rounded-xl p-3 backdrop-blur-sm ${
                    theme === "light"
                      ? "bg-gray-50 border border-gray-200"
                      : "bg-slate-900/40 border border-slate-700/40"
                  }`}>
                    {/* Source Area - Available Tools */}
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        
                        <span className={`text-xs font-medium ${
                          theme === "light" ? "text-gray-700" : "text-slate-300"
                        }`}>Available</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { name: "Clover", icon: ShoppingCart, color: "from-green-500 to-emerald-500" },
                          { name: "Stripe", icon: CreditCard, color: "from-blue-500 to-indigo-500" },
                          { name: "Shopify", icon: Store, color: "from-green-500 to-teal-500" },
                          { name: "Zapier", icon: Zap, color: "from-orange-500 to-yellow-500" },
                          { name: "Webhook", icon: Webhook, color: "from-pink-500 to-rose-500" },
                          { name: "API", icon: Plug, color: "from-violet-500 to-purple-500" },
                        ].map((tool, idx) => (
                          <motion.div
                            key={tool.name}
                            animate={{
                              y: animatingIndex === idx ? [-4, 0] : 0,
                              scale: animatingIndex === idx ? [1, 1.05, 1] : 1,
                            }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="relative"
                          >
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-br ${tool.color} shadow-sm`}>
                              <tool.icon className="h-2.5 w-2.5 text-white" />
                              <span className="text-xs font-medium text-white">{tool.name}</span>
                            </div>
                            {/* Drag trail */}
                            {animatingIndex === idx && (
                              <motion.div
                                initial={{ opacity: 0, y: 0 }}
                                animate={{ 
                                  opacity: [0, 0.5, 0],
                                  y: [0, 40, 40],
                                }}
                                transition={{ duration: 0.4 }}
                                className={`absolute inset-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-br ${tool.color} pointer-events-none blur-sm`}
                              >
                                <tool.icon className="h-2.5 w-2.5 text-white" />
                                <span className="text-xs font-medium text-white">{tool.name}</span>
                              </motion.div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Cute Arrow */}
                    <div className="flex justify-center my-1.5">
                      <motion.div
                        animate={{ y: [0, 3, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="text-pink-400 opacity-60"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5V19M12 19L6 13M12 19L18 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </motion.div>
                    </div>

                    {/* Drop Zone - Connected Tools */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">Connected ({animatingIndex + 1})</span>
                      </div>
                      <div className="min-h-[50px] p-2 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-wrap gap-1.5">
                        {[
                          { name: "Clover", icon: ShoppingCart },
                          { name: "Stripe", icon: CreditCard },
                          { name: "Shopify", icon: Store },
                          { name: "Zapier", icon: Zap },
                          { name: "Webhook", icon: Webhook },
                          { name: "API", icon: Plug },
                        ].map((tool, idx) => (
                          <AnimatePresence key={tool.name}>
                            {idx <= animatingIndex && (
                              <motion.div
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0 }}
                                transition={{ 
                                  type: "spring", 
                                  stiffness: 300,
                                  delay: idx === animatingIndex ? 0.4 : 0 
                                }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-500/40 ${
                                  theme === "light"
                                    ? "bg-emerald-50"
                                    : "bg-slate-800/70"
                                }`}
                              >
                                <tool.icon className="h-2.5 w-2.5 text-emerald-400" />
                                <span className={`text-xs ${
                                  theme === "light" ? "text-emerald-700" : "text-emerald-300"
                                }`}>{tool.name}</span>
                                <Check className="h-2.5 w-2.5 text-emerald-400" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
