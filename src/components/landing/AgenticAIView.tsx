'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, GitBranch, Code2, Check, ArrowRight, Terminal, CreditCard, Slack, Mail, Database, Calendar, Globe, MessageSquare, PlusCircle, Zap, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Section } from '../LayoutUtils';
import { authClient } from '@/lib/auth-client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';

const LaunchButton = ({ text = "Launch Builder", onClick, isLoading }: { text?: string; onClick?: () => void; isLoading?: boolean }) => {
    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className="group relative px-8 py-4 bg-white text-black font-bold rounded-lg overflow-hidden transition-all duration-300 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <span className="relative flex items-center gap-2">
                {isLoading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        Activating...
                    </>
                ) : (
                    <>
                        {text} <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </span>
        </button>
    )
}

const LiveTerminal = () => {
    const [lines, setLines] = useState<string[]>([]);

    const logSequence = [
        { text: "Initializing Agent [Sales_Bot_v4]...", color: "text-zinc-400" },
        { text: "Loading context from CRM...", color: "text-zinc-400" },
        { text: "> Trigger: Incoming Lead (Score: 85)", color: "text-white font-bold" },
        { text: "Thinking: User is high intent. Checking calendar availability...", color: "text-amber-400" },
        { text: "Action: Search_Calendar(start='tomorrow')", color: "text-blue-400" },
        { text: "Result: Available slots [10:00, 14:30]", color: "text-green-400" },
        { text: "Action: Draft_Email(template='meeting_invite')", color: "text-blue-400" },
        { text: "Output: Email drafted successfully.", color: "text-zinc-400" },
        { text: "Waiting for human approval...", color: "text-amber-400 animate-pulse" },
    ];

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            if (index < logSequence.length) {
                setLines(prev => {
                    const newLines = [...prev, logSequence[index].text];
                    if (newLines.length > 8) newLines.shift();
                    return newLines;
                });
                index = (index + 1) % logSequence.length;
                if (index === 0) setLines([]); // Reset for loop
            }
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-[350px] bg-black border border-zinc-800 rounded-xl p-4 font-mono text-xs overflow-hidden flex flex-col shadow-2xl relative">
            <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
                <Terminal size={14} className="text-zinc-500" />
                <span className="text-zinc-500">Agent Logs</span>
                <div className="ml-auto flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
                </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
                {lines.map((line, i) => {
                    const logItem = logSequence.find(l => l.text === line);
                    return (
                        <div key={i} className={`${logItem?.color || 'text-zinc-400'}`}>
                            <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                            {line}
                        </div>
                    );
                })}
                <div className="w-2 h-4 bg-amber-500 animate-pulse mt-1" />
            </div>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
    )
}

const ToolLibrary = () => {
    const tools = [
        { icon: <CreditCard size={18} />, name: "Stripe", color: "text-purple-400" },
        { icon: <Slack size={18} />, name: "Slack", color: "text-orange-400" },
        { icon: <Mail size={18} />, name: "Gmail", color: "text-red-400" },
        { icon: <Database size={18} />, name: "Postgres", color: "text-blue-400" },
        { icon: <Calendar size={18} />, name: "GCal", color: "text-green-400" },
        { icon: <Globe size={18} />, name: "Browser", color: "text-cyan-400" },
        { icon: <MessageSquare size={18} />, name: "Twilio", color: "text-red-500" },
    ];

    return (
        <div className="w-full overflow-hidden py-6 border-y border-white/5 bg-black/50 backdrop-blur-md mb-12">
            <div className="flex animate-scroll whitespace-nowrap gap-12">
                {[...tools, ...tools, ...tools].map((tool, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900 border border-white/5 hover:border-white/20 transition-colors cursor-pointer group">
                        <div className={`p-1.5 rounded bg-white/5 ${tool.color}`}>{tool.icon}</div>
                        <span className="text-sm font-medium text-zinc-400 group-hover:text-white">{tool.name}</span>
                        <PlusCircle size={14} className="text-zinc-600 group-hover:text-white ml-2" />
                    </div>
                ))}
            </div>
        </div>
    )
}

const LogicGraph = () => {
    return (
        <div className="relative w-full h-[300px] bg-zinc-900/30 rounded-2xl border border-white/5 p-6 overflow-hidden flex items-center justify-center group">
            {/* Interactive Nodes */}
            <div className="flex items-center gap-12 relative z-10">
                <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center cursor-pointer">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 mb-3 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Mail size={28} />
                    </div>
                    <span className="text-xs font-bold text-zinc-300">Trigger</span>
                    <span className="text-[10px] text-zinc-500">New Email</span>
                </motion.div>

                <div className="w-16 h-0.5 bg-zinc-700 relative overflow-hidden">
                    <motion.div
                        className="absolute inset-0 bg-blue-500"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                </div>

                <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center cursor-pointer">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-400 mb-3 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                        <Brain size={28} />
                    </div>
                    <span className="text-xs font-bold text-zinc-300">Reasoning</span>
                    <span className="text-[10px] text-zinc-500">Analyze Intent</span>
                </motion.div>

                <div className="w-16 h-0.5 bg-zinc-700 relative overflow-hidden">
                    <motion.div
                        className="absolute inset-0 bg-purple-500"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.75 }}
                    />
                </div>

                <motion.div whileHover={{ scale: 1.1 }} className="flex flex-col items-center cursor-pointer">
                    <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/50 flex items-center justify-center text-green-400 mb-3 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                        <Zap size={28} />
                    </div>
                    <span className="text-xs font-bold text-zinc-300">Action</span>
                    <span className="text-[10px] text-zinc-500">Webhooks</span>
                </motion.div>
            </div>

            <div className="absolute bottom-4 right-4 text-xs text-zinc-600 font-mono">live_preview</div>
        </div>
    )
}

export const AgenticAIView = () => {
    const router = useRouter();
    const [isActivating, setIsActivating] = useState(false);
    const { data: session } = authClient.useSession();
    const currentEmail = session?.user?.email ?? null;
    const { isAdmin, isLoading: checkingRole, entityId } = useIsAdmin();

    const entityData = useQuery(
        api.public.entities.getEntity,
        entityId ? { entityId } : "skip"
    );

    const handleLaunchBuilder = async () => {
        if (!entityId || !currentEmail) {
            console.error('Missing entity ID or email');
            return;
        }

        setIsActivating(true);

        try {
            const response = await fetch("/api/polar/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    productKey: 'workflows',
                    tierKey: 'basic',
                    externalCustomerId: entityId,
                    customerEmail: currentEmail,
                    customerName: entityData?.name,
                }),
            });

            const payload = await response.json();

            if (!response.ok || !payload.url) {
                alert(payload.error ?? "Checkout failed.");
                setIsActivating(false);
                return;
            }

            // Redirect to Polar checkout
            window.location.href = payload.url;
        } catch (error) {
            console.error('Checkout error:', error);
            alert('Failed to start checkout. Please try again.');
            setIsActivating(false);
        }
    };

    return (
        <div className="w-full pb-20 animate-fade-in-down overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
            {/* Hero Section */}
            <section className="relative pt-20 pb-24 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-8 backdrop-blur-md"
                        >
                            <Brain size={12} />
                            <span>Autonomous Agents</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-6xl font-bold text-white mb-8 tracking-tighter leading-[1.1]"
                        >
                            Orchestrate your <br />
                            <span className="text-zinc-500">digital workforce.</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-zinc-400 mb-12 leading-relaxed max-w-lg"
                        >
                            Build agents that plan, reason, and execute.
                            Give them tools, set goals, and watch them work across your entire stack.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            {checkingRole ? (
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Checking permissions...</span>
                                </div>
                            ) : isAdmin ? (
                                <LaunchButton onClick={handleLaunchBuilder} isLoading={isActivating} />
                            ) : (
                                <div className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800/50 text-zinc-400 text-sm font-medium rounded-lg border border-zinc-700/50 backdrop-blur-sm">
                                    <Lock size={16} className="text-zinc-500" />
                                    <span>Contact your admin to activate workflows</span>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="relative"
                    >
                        {/* Connecting Lines Graphic */}
                        <div className="absolute -top-10 -left-10 w-full h-full border border-white/5 rounded-3xl -z-10" />
                        <LiveTerminal />

                        <div className="absolute -right-10 -bottom-10 p-6 bg-zinc-900 rounded-xl border border-white/10 shadow-xl max-w-xs hidden md:block">
                            <h4 className="text-white text-sm font-bold mb-2 flex items-center gap-2"><Check size={14} className="text-green-500" /> Goal Achieved</h4>
                            <p className="text-zinc-400 text-xs">Agent successfully navigated 4 steps to book the meeting without human intervention.</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            <ToolLibrary />

            {/* How it works */}
            <Section className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Visual Logic Builder</h2>
                        <p className="text-zinc-400 mb-8 text-lg">
                            Don&apos;t write complex loops. Drag and drop nodes to define how your agent perceives, thinks, and acts.
                        </p>
                        <ul className="space-y-4 text-zinc-400">
                            <li className="flex items-center gap-3">
                                <GitBranch size={20} className="text-amber-500" />
                                <span>Conditional branching logic</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Database size={20} className="text-amber-500" />
                                <span>Memory persistence across sessions</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Code2 size={20} className="text-amber-500" />
                                <span>Custom Python/JS tool execution</span>
                            </li>
                        </ul>
                    </div>
                    <LogicGraph />
                </div>
            </Section>

            {/* Feature Grid */}
            <Section className="max-w-6xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-colors">
                        <Code2 className="w-10 h-10 text-white mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Function Calling</h3>
                        <p className="text-zinc-400 leading-relaxed mb-6">
                            Connect your agents to the real world. Simply define your API schema, and the agent knows when and how to call it.
                        </p>
                        <div className="bg-black rounded-lg p-4 font-mono text-xs text-zinc-400 border border-white/5">
                            <span className="text-purple-400">tools</span> = [<br />
                            &nbsp;&nbsp;{"{"} <span className="text-blue-400">&quot;name&quot;</span>: <span className="text-green-400">&quot;stripe_charge&quot;</span> ... {"}"},<br />
                            &nbsp;&nbsp;{"{"} <span className="text-blue-400">&quot;name&quot;</span>: <span className="text-green-400">&quot;slack_notify&quot;</span> ... {"}"}<br />
                            ]
                        </div>
                    </div>

                    <div className="p-8 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-white/10 transition-colors">
                        {/* Shield icon (Lucide) was failing in previous edits, assuming "Shield" is available or imported */}
                        <Zap className="w-10 h-10 text-white mb-6" />
                        <h3 className="text-xl font-bold text-white mb-3">Reliability & Safety</h3>
                        <p className="text-zinc-400 leading-relaxed mb-6">
                            Agents can go rogue. We provide the guardrails. Set budget limits, require approval for sensitive actions, and monitor every step.
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-amber-500" /> Human-in-the-loop approval mode</li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-amber-500" /> PII redaction layer</li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={16} className="text-amber-500" /> Rate limiting & cost controls</li>
                        </ul>
                    </div>
                </div>
            </Section>
        </div>
    );
};
