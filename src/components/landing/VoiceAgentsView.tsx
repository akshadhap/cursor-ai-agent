'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Phone, Activity, Globe, Shield, Zap, AudioLines, Sparkles, Check, Play, Pause, BarChart3, Timer, ArrowRight, User, Settings, Smartphone, Sliders, DollarSign, Volume2, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Section } from '../LayoutUtils';
import { authClient } from '@/lib/auth-client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';

const LaunchButton = ({ text = "Deploy Voice Agent", onClick, isLoading }: { text?: string; onClick?: () => void; isLoading?: boolean }) => {
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

const VoiceTuner = () => {
    const [stability, setStability] = useState(50);
    const [similarity, setSimilarity] = useState(75);
    const [style, setStyle] = useState(30);
    const [selectedVoice, setSelectedVoice] = useState('Sarah');

    const voices = ['Sarah', 'James', 'Echo', 'Alloy'];

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sliders size={20} />
                </div>
                <div>
                    <h3 className="text-white font-bold">Voice Tuner</h3>
                    <p className="text-xs text-zinc-500">Fine-tune personality prosody</p>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8">
                {voices.map(v => (
                    <button
                        key={v}
                        onClick={() => setSelectedVoice(v)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${selectedVoice === v ? 'bg-white text-black' : 'bg-black border border-zinc-800 text-zinc-400 hover:text-white'}`}
                    >
                        {v}
                    </button>
                ))}
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-zinc-400">Stability</span>
                        <span className="text-white">{stability}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={stability} onChange={(e) => setStability(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-zinc-400">Similarity Boost</span>
                        <span className="text-white">{similarity}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={similarity} onChange={(e) => setSimilarity(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
                <div>
                    <div className="flex justify-between text-xs mb-2">
                        <span className="text-zinc-400">Style Exaggeration</span>
                        <span className="text-white">{style}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={style} onChange={(e) => setStyle(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                </div>
            </div>

            <div className="mt-8 p-4 bg-black rounded-xl border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Volume2 size={14} className="text-white" />
                    </div>
                    <div className="flex gap-0.5 items-end h-4">
                        {[...Array(10)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-1 bg-purple-500 rounded-full"
                                animate={{ height: [4, Math.random() * 16 + 4, 4] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: Math.random() }}
                            />
                        ))}
                    </div>
                </div>
                <button className="text-xs text-purple-400 font-medium hover:text-purple-300">Test Voice</button>
            </div>
        </div>
    )
}

const CostEstimator = () => {
    const [minutes, setMinutes] = useState(1000);
    const costPerMin = 0.08;
    const humanCostPerMin = 1.50;

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400">
                    <DollarSign size={20} />
                </div>
                <div>
                    <h3 className="text-white font-bold">ROI Calculator</h3>
                    <p className="text-xs text-zinc-500">Compare vs Human Agents</p>
                </div>
            </div>

            <div className="mb-8">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-zinc-400">Minutes per month</span>
                    <span className="text-white font-mono">{minutes.toLocaleString()}</span>
                </div>
                <input type="range" min="100" max="50000" step="100" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-green-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black border border-white/10">
                    <div className="text-zinc-500 text-xs mb-1">Spinabot Cost</div>
                    <div className="text-2xl font-bold text-white">${(minutes * costPerMin).toLocaleString()}</div>
                    <div className="text-[10px] text-green-400 mt-1">${costPerMin}/min</div>
                </div>
                <div className="p-4 rounded-xl bg-black border border-white/10 opacity-60">
                    <div className="text-zinc-500 text-xs mb-1">Human Cost</div>
                    <div className="text-2xl font-bold text-zinc-400">${(minutes * humanCostPerMin).toLocaleString()}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">~${humanCostPerMin}/min</div>
                </div>
            </div>

            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <span className="text-sm font-medium text-green-400">You save ${(minutes * (humanCostPerMin - costPerMin)).toLocaleString()} / month</span>
            </div>
        </div>
    )
}

const LatencyMap = () => {
    return (
        <div className="relative w-full h-[300px] bg-zinc-900/30 rounded-2xl border border-white/5 overflow-hidden">
            {/* Abstract Map Background */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #3f3f46 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            {/* Nodes */}
            <div className="absolute top-[30%] left-[20%] flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-ping absolute opacity-50" />
                <div className="w-3 h-3 rounded-full bg-green-500 relative z-10" />
                <span className="text-[10px] text-zinc-400 mt-2">US-East (45ms)</span>
            </div>

            <div className="absolute top-[40%] left-[50%] flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-ping absolute opacity-50 delay-300" />
                <div className="w-3 h-3 rounded-full bg-green-500 relative z-10" />
                <span className="text-[10px] text-zinc-400 mt-2">EU-West (52ms)</span>
            </div>

            <div className="absolute top-[60%] left-[80%] flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-ping absolute opacity-50 delay-700" />
                <div className="w-3 h-3 rounded-full bg-green-500 relative z-10" />
                <span className="text-[10px] text-zinc-400 mt-2">Asia-Pacific (85ms)</span>
            </div>

            <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-1 rounded-full text-xs text-green-400 border border-green-900">
                Global Avg: 60ms
            </div>
        </div>
    )
}

const ConversationDemo = () => {
    return (
        <div className="rounded-[2.5rem] border-8 border-zinc-900 bg-black overflow-hidden shadow-2xl max-w-sm mx-auto relative h-[600px]">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-zinc-900 rounded-b-xl z-20" />

            {/* UI */}
            <div className="h-full flex flex-col bg-zinc-950">
                {/* Header */}
                <div className="pt-12 pb-6 px-6 flex justify-between items-center border-b border-white/5">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500 font-medium tracking-wide">INCALL • 00:42</span>
                        <span className="text-lg font-bold text-white">Support Agent</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <BotIcon size={20} className="text-purple-400" />
                    </div>
                </div>

                {/* Waveform Area */}
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />
                    <div className="w-32 h-32 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center relative mb-8">
                        <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping opacity-20" />
                        <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-pulse delay-75" />
                        <Mic size={32} className="text-white" />
                    </div>
                    <div className="flex items-center gap-1 h-12">
                        {[...Array(20)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-1 bg-zinc-700 rounded-full"
                                animate={{
                                    height: [10, Math.random() * 40 + 10, 10],
                                    backgroundColor: Math.random() > 0.5 ? "#a855f7" : "#3f3f46"
                                }}
                                transition={{
                                    duration: 0.5,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                        ))}
                    </div>
                    <p className="mt-8 text-sm text-zinc-500 font-medium">Listening...</p>
                </div>

                {/* Controls */}
                <div className="p-8 pb-12">
                    <div className="grid grid-cols-3 gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-white"><Settings size={20} /></div>
                            <span className="text-[10px] text-zinc-500">Keypad</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-white"><Mic size={20} /></div>
                            <span className="text-[10px] text-zinc-500">Mute</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-white"><Smartphone size={20} /></div>
                            <span className="text-[10px] text-zinc-500">Speaker</span>
                        </div>
                    </div>
                    <button className="w-full mt-8 h-14 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center gap-2 font-bold hover:bg-red-500 hover:text-white transition-all">
                        <Phone size={20} className="rotate-[135deg]" /> End Call
                    </button>
                </div>
            </div>
        </div>
    )
}

const BotIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
    </svg>
)

const FeatureRow = ({ title, desc, icon }: any) => (
    <div className="flex gap-6 items-start py-8 border-b border-white/5 last:border-0">
        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center flex-shrink-0 text-white">
            {icon}
        </div>
        <div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-zinc-400 leading-relaxed text-sm">{desc}</p>
        </div>
    </div>
)

export const VoiceAgentsView = () => {
    const router = useRouter();
    const [isActivating, setIsActivating] = useState(false);
    const { data: session } = authClient.useSession();
    const currentEmail = session?.user?.email ?? null;
    const { isAdmin, isLoading: checkingRole, entityId } = useIsAdmin();

    const entityData = useQuery(
        api.public.entities.getEntity,
        entityId ? { entityId } : "skip"
    );

    const handleDeployAgent = async () => {
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
                    productKey: 'voice-agent-builder',
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
        <div className="w-full pb-20 overflow-x-hidden selection:bg-purple-500/30 selection:text-purple-200">
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 px-6">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-medium mb-8 backdrop-blur-md"
                        >
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                            <span>Live Voice API</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tighter leading-tight"
                        >
                            Voice AI that <br />
                            actually listens.
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-zinc-400 mb-12 leading-relaxed"
                        >
                            Create phone agents that handle complex conversations with sub-500ms latency.
                            Interruptible, emotional, and indistinguishable from human support.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row items-center gap-4"
                        >
                            {checkingRole ? (
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Checking permissions...</span>
                                </div>
                            ) : isAdmin ? (
                                <>
                                    <LaunchButton onClick={handleDeployAgent} isLoading={isActivating} />
                                    <div className="flex items-center gap-2 text-zinc-500 text-sm px-4">
                                        <Check size={16} className="text-zinc-400" /> SOC2 Compliant
                                    </div>
                                </>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800/50 text-zinc-400 text-sm font-medium rounded-lg border border-zinc-700/50 backdrop-blur-sm">
                                    <Lock size={16} className="text-zinc-500" />
                                    <span>Contact your admin to activate voice agents</span>
                                </div>
                            )}
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <ConversationDemo />
                    </motion.div>
                </div>
            </section>

            {/* Config Section */}
            <Section className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
                    <VoiceTuner />
                    <CostEstimator />
                </div>
            </Section>

            {/* Global Scale Map */}
            <Section className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <LatencyMap />
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Global Low Latency</h2>
                        <p className="text-zinc-400 mb-8 text-lg">
                            Our edge network processes voice data in 35+ regions.
                            We route calls to the nearest inference node to ensure natural, lag-free conversations anywhere in the world.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
                                <div className="text-2xl font-bold text-white mb-1">500ms</div>
                                <div className="text-xs text-zinc-500 uppercase">Avg Response</div>
                            </div>
                            <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
                                <div className="text-2xl font-bold text-white mb-1">99.9%</div>
                                <div className="text-xs text-zinc-500 uppercase">Uptime SLA</div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Technical Deep Dive */}
            <Section className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-8">Built for developers</h2>
                        <div className="space-y-2">
                            <FeatureRow
                                icon={<Zap size={20} />}
                                title="Sub-500ms Latency"
                                desc="Our proprietary audio-to-audio model skips transcription, processing sound directly to generate responses instantly."
                            />
                            <FeatureRow
                                icon={<Activity size={20} />}
                                title="Full Duplex"
                                desc="Users can interrupt the bot naturally. The AI stops speaking immediately when it detects a user's voice."
                            />
                            <FeatureRow
                                icon={<Phone size={20} />}
                                title="SIP & PSTN Ready"
                                desc="Connect to Twilio, Vonage, or your existing PBX with a simple SIP URI. No complex VoIP knowledge needed."
                            />
                            <FeatureRow
                                icon={<Shield size={20} />}
                                title="Enterprise Security"
                                desc="End-to-end encryption for all audio streams. PII redaction and optional on-premise deployment available."
                            />
                        </div>
                    </div>
                    <div className="relative">
                        <div className="sticky top-24">
                            <div className="p-6 rounded-2xl bg-[#09090B] border border-white/5 font-mono text-sm text-zinc-400 overflow-hidden">
                                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="ml-2 text-zinc-500">agent_config.json</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-purple-400">{"{"}</div>
                                    <div className="pl-4"><span className="text-white">&quot;voice_id&quot;</span>: <span className="text-green-400">&quot;sarah_v2&quot;</span>,</div>
                                    <div className="pl-4"><span className="text-white">&quot;responsiveness&quot;</span>: <span className="text-orange-400">0.8</span>,</div>
                                    <div className="pl-4"><span className="text-white">&quot;interruption_sensitivity&quot;</span>: <span className="text-orange-400">0.95</span>,</div>
                                    <div className="pl-4"><span className="text-white">&quot;tools&quot;</span>: [</div>
                                    <div className="pl-8"><span className="text-green-400">&quot;calendar_booking&quot;</span>,</div>
                                    <div className="pl-8"><span className="text-green-400">&quot;crm_update&quot;</span></div>
                                    <div className="pl-4">],</div>
                                    <div className="pl-4"><span className="text-white">&quot;webhooks&quot;</span>: <span className="text-green-400">&quot;https://api.yourapp.com/hook&quot;</span></div>
                                    <div className="text-purple-400">{"}"}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};
