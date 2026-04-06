"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Cpu,
  Zap,
  TrendingDown,
  CheckCircle2,
  Sparkles,
  Database,
  Network,
  Globe,
  Code2,
  Box,
  Workflow,
  GitBranch,
  MessageSquare,
  Shield,
  Clock,
  BarChart3,
  Layers,
  Cloud,
  Webhook,
  Brain,
  FileCode,
  Server,
  Settings,
  Activity,
  Gauge,
} from "lucide-react";

export function SLMAnimation() {
  const [processingStep, setProcessingStep] = useState(0);
  const [activeIntegration, setActiveIntegration] = useState(0);
  const [dataFlow, setDataFlow] = useState(0);

  const steps = [
    { label: "Input Processing", progress: 100, icon: Sparkles, desc: "Tokenizing & normalizing" },
    { label: "Context Analysis", progress: 100, icon: Brain, desc: "Understanding intent" },
    { label: "Tool Selection", progress: 100, icon: Settings, desc: "Choosing integrations" },
    { label: "Response Generation", progress: 100, icon: Zap, desc: "Generating output" },
  ];

  const integrations = [
    { name: "REST APIs", icon: Webhook, color: "from-blue-500 to-cyan-500", status: "active" },
    { name: "Database", icon: Database, color: "from-purple-500 to-pink-500", status: "active" },
    { name: "Cloud Services", icon: Cloud, color: "from-green-500 to-emerald-500", status: "active" },
    { name: "Git/Version Control", icon: GitBranch, color: "from-orange-500 to-red-500", status: "syncing" },
    { name: "Message Queues", icon: MessageSquare, color: "from-yellow-500 to-amber-500", status: "active" },
    { name: "Monitoring", icon: Activity, color: "from-indigo-500 to-violet-500", status: "active" },
  ];


  useEffect(() => {
    const interval = setInterval(() => {
      setProcessingStep((prev) => (prev + 1) % 5);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIntegration((prev) => (prev + 1) % integrations.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataFlow((prev) => (prev + 1) % 10);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-2"
      >
    
        <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
          Small Language Models
        </h3>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
          Lightning-fast AI that seamlessly integrates with your entire tech stack
        </p>
      </motion.div>

      {/* Main Visualization Container */}
      <div className="relative min-h-[300px] bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 dark:from-slate-950 dark:via-orange-950/10 dark:to-slate-950 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Ambient background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-orange-200/20 dark:from-orange-900/30 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--tw-gradient-stops))] from-amber-200/20 dark:from-amber-900/20 via-transparent to-transparent" />
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-10 dark:opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, rgb(251 146 60 / 0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgb(251 146 60 / 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative h-full p-4">
          {/* Header Stats */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-orange-500 dark:text-orange-400">
              <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <span className="font-semibold text-sm block text-slate-800 dark:text-slate-200">SLM Processing</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Neural Networks</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400 text-xs"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-sm" />
                <span className="font-medium">Active</span>
              </motion.div>
              <div className="flex items-center gap-1.5 text-orange-500 dark:text-orange-300 text-xs">
                <Zap className="h-3 w-3" />
                <span className="font-mono">~50ms</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column - Central Processing */}
            <div className="space-y-3">
              {/* Central Processing Visualization */}
              <div className="flex flex-col items-center justify-center bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm rounded-xl p-4 border border-slate-200 dark:border-slate-800/50">
                <div className="relative mb-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="relative h-20 w-20"
                  >
                    {/* Outer ring */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-orange-500/20"
                      animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                    {/* Middle ring */}
                    <motion.div
                      className="absolute inset-2 rounded-full border-2 border-amber-500/40"
                      animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.8, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity, delay: 0.3 }}
                    />
                    {/* Core */}
                    <motion.div 
                      className="absolute inset-6 rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg"
                      animate={{ 
                        boxShadow: [
                          "0 0 20px rgba(249, 115, 22, 0.3)",
                          "0 0 30px rgba(249, 115, 22, 0.5)",
                          "0 0 20px rgba(249, 115, 22, 0.3)",
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Brain className="h-5 w-5 text-white" />
                    </motion.div>
                  </motion.div>

                  {/* Data flow particles */}
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute top-1/2 left-1/2 h-1.5 w-1.5"
                      animate={{ 
                        rotate: 360,
                        opacity: [0, 1, 1, 0]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i * 1,
                      }}
                      style={{ transformOrigin: "0 0" }}
                    >
                      <div 
                        className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 shadow-sm" 
                        style={{ transform: "translateX(45px)" }} 
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Processing Steps */}
                <div className="w-full space-y-1.5">
                  {steps.map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-white/60 dark:bg-slate-900/50 backdrop-blur-sm rounded-lg p-2 border border-slate-200 dark:border-slate-800/50 hover:border-orange-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${processingStep === i ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-slate-200 dark:bg-slate-800/50'}`}>
                            <step.icon className={`h-3 w-3 ${processingStep === i ? 'text-orange-500 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'}`} />
                          </div>
                          <div>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{step.label}</span>
                            <p className="text-xs text-slate-500 dark:text-slate-500">{step.desc}</p>
                          </div>
                        </div>
                        <AnimatePresence mode="wait">
                          {processingStep > i && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 180 }}
                              transition={{ type: "spring", stiffness: 200 }}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="h-1 bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: processingStep > i ? "100%" : processingStep === i ? "60%" : "0%",
                          }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                          className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Tool Integrations */}
            <div className="space-y-3">
              {/* Active Integrations Header */}
              <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm rounded-xl p-3 border border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Integrations</h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-500 dark:text-emerald-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>{integrations.length} Active</span>
                  </div>
                </div>

                {/* Integration Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {integrations.map((integration, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ 
                        opacity: 1, 
                        scale: activeIntegration === i ? 1.02 : 1,
                      }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className={`relative p-3 rounded-lg border backdrop-blur-sm transition-all ${
                        activeIntegration === i 
                          ? 'bg-gradient-to-br ' + integration.color + ' border-transparent shadow-md' 
                          : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/50 hover:border-orange-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${activeIntegration === i ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800/50'}`}>
                          <integration.icon className={`h-3.5 w-3.5 ${activeIntegration === i ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${activeIntegration === i ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {integration.name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {activeIntegration === i && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 3 }}
                                className="h-0.5 bg-white/40 rounded-full"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Data flow indicator */}
                      {activeIntegration === i && (
                        <motion.div
                          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-white shadow-sm"
                          animate={{ 
                            scale: [1, 1.3, 1],
                            opacity: [1, 0.5, 1]
                          }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Workflow Visualization */}
              <div className="bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm rounded-xl p-3 border border-slate-200 dark:border-slate-800/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Workflow className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
                  <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Live Data Flow</h4>
                </div>
                
                <div className="space-y-1.5">
                  {/* Data flow visualization */}
                  <div className="relative h-16 bg-white/60 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800/50 overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      {/* Source */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-1.5 rounded-full bg-blue-500/20 border border-blue-500/30">
                          <Globe className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Input</span>
                      </div>

                      {/* Flow lines */}
                      <div className="flex-1 relative h-0.5 mx-2">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-orange-500/20 to-orange-500/20 rounded-full" />
                        <motion.div
                          className="absolute h-1 w-1 rounded-full bg-orange-500 shadow-sm"
                          animate={{
                            left: ["0%", "50%", "100%"],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        />
                      </div>

                      {/* Processing */}
                      <div className="flex flex-col items-center gap-1">
                        <motion.div 
                          className="p-1.5 rounded-full bg-orange-500/20 border border-orange-500/30"
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Cpu className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" />
                        </motion.div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Process</span>
                      </div>

                      {/* Flow lines */}
                      <div className="flex-1 relative h-0.5 mx-2">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 via-emerald-500/20 to-emerald-500/20 rounded-full" />
                        <motion.div
                          className="absolute h-1 w-1 rounded-full bg-emerald-500 shadow-sm"
                          animate={{
                            left: ["0%", "50%", "100%"],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                            delay: 1
                          }}
                        />
                      </div>

                      {/* Output */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Output</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/60 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800/50 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Requests/s</p>
                      <p className="text-sm font-bold text-blue-500 dark:text-blue-400">1.2K</p>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800/50 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Avg Time</p>
                      <p className="text-sm font-bold text-orange-500 dark:text-orange-400">48ms</p>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-200 dark:border-slate-800/50 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Success</p>
                      <p className="text-sm font-bold text-emerald-500 dark:text-emerald-400">99.9%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
