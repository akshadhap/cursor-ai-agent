'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Cpu, Zap, Lock, BarChart3, Database, Server, Smartphone, HardDrive, Network, Box, ChevronRight, Activity, Check, Loader2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Section } from '../LayoutUtils';
import { authClient } from '@/lib/auth-client';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { toast } from 'sonner';

const LaunchButton = ({ text = "Join Waitlist", onClick, isLoading, isOnWaitlist, status }: { text?: string; onClick?: () => void; isLoading?: boolean; isOnWaitlist?: boolean; status?: string | null }) => {
    if (isOnWaitlist) {
        const statusConfig = {
            pending: {
                bg: "bg-gradient-to-r from-amber-500/20 to-orange-500/20",
                border: "border-amber-500/40",
                text: "text-amber-300",
                icon: <Clock size={20} className="animate-pulse" />,
                message: "On Waitlist • Pending Review"
            },
            approved: {
                bg: "bg-gradient-to-r from-green-500/20 to-emerald-500/20",
                border: "border-green-500/40",
                text: "text-green-300",
                icon: <Check size={20} />,
                message: "Approved • Access Coming Soon"
            },
            rejected: {
                bg: "bg-gradient-to-r from-red-500/20 to-rose-500/20",
                border: "border-red-500/40",
                text: "text-red-300",
                icon: <Check size={20} />,
                message: "Not Approved"
            }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

        return (
            <div className="flex flex-col items-center gap-4">
                <button
                    disabled
                    className={`group relative px-10 py-5 ${config.bg} ${config.text} font-bold rounded-xl overflow-hidden transition-all duration-300 cursor-default border-2 ${config.border} backdrop-blur-sm shadow-lg`}
                >
                    <span className="relative flex items-center gap-3 text-lg">
                        {config.icon}
                        {config.message}
                    </span>
                </button>
                {status === 'pending' && (
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-zinc-400 text-center max-w-md"
                    >
                        Thank you for your interest! We&apos;re reviewing waitlist entries and will notify you via email when SLM access is available.
                    </motion.p>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className="group relative px-10 py-5 bg-gradient-to-r from-white to-zinc-100 text-black font-bold rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
        >
            <span className="relative flex items-center gap-3 text-lg">
                {isLoading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Joining Waitlist...
                    </>
                ) : (
                    <>
                        {text} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                )}
            </span>
        </button>
    );
};

const ModelComparator = () => {
    const [modelSize, setModelSize] = useState(3); // 1, 3, 7, 70

    const specs: Record<number, { size: string, type: string, vram: string, tokens: string, device: string }> = {
        1: { size: "1B", type: "Nano", vram: "2GB", tokens: "450 t/s", device: "Mobile / IoT" },
        3: { size: "3B", type: "Standard", vram: "6GB", tokens: "180 t/s", device: "Laptop / Edge" },
        7: { size: "7B", type: "Pro", vram: "12GB", tokens: "90 t/s", device: "Workstation" },
        70: { size: "70B", type: "Ultra", vram: "48GB", tokens: "25 t/s", device: "Server Cluster" }
    };

    const current = specs[modelSize];

    return (
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-8 max-w-4xl mx-auto">
            <h3 className="text-xl font-bold text-white mb-8 text-center">Interactive Sizing Guide</h3>

            {/* Slider */}
            <div className="relative h-2 bg-zinc-800 rounded-full mb-12 mx-8">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: modelSize === 1 ? '0%' : modelSize === 3 ? '33%' : modelSize === 7 ? '66%' : '100%' }} />
                {[1, 3, 7, 70].map((size) => (
                    <div
                        key={size}
                        onClick={() => setModelSize(size)}
                        className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 cursor-pointer transition-all duration-300 flex items-center justify-center z-10 ${modelSize === size ? 'bg-amber-500 border-amber-500 scale-125' : 'bg-zinc-900 border-zinc-600 hover:border-zinc-400'}`}
                        style={{ left: size === 1 ? '0%' : size === 3 ? '33%' : size === 7 ? '66%' : '100%' }}
                    >
                        {modelSize === size && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-black border border-white/10 text-center">
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Parameters</div>
                    <div className="text-2xl font-bold text-white">{current.size}</div>
                </div>
                <div className="p-4 rounded-2xl bg-black border border-white/10 text-center">
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">VRAM Req</div>
                    <div className="text-2xl font-bold text-amber-400">{current.vram}</div>
                </div>
                <div className="p-4 rounded-2xl bg-black border border-white/10 text-center">
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Speed</div>
                    <div className="text-2xl font-bold text-green-400">{current.tokens}</div>
                </div>
                <div className="p-4 rounded-2xl bg-black border border-white/10 text-center">
                    <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Target</div>
                    <div className="text-lg font-bold text-white truncate">{current.device}</div>
                </div>
            </div>
        </div>
    )
}

const LatencyChart = () => {
    return (
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5">
            <div className="flex items-center gap-3 mb-8">
                <Activity size={24} className="text-green-400" />
                <h3 className="text-xl font-bold text-white">Cloud vs Local Latency</h3>
            </div>
            <div className="space-y-6">
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-white">Local SLM (Spinabot 3B)</span>
                        <span className="text-green-400 font-mono font-bold">12ms</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: '10%' }}
                            transition={{ duration: 1 }}
                            className="h-full bg-green-500"
                        />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-zinc-400">Cloud API (GPT-4o)</span>
                        <span className="text-zinc-500 font-mono">450ms</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: '80%' }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full bg-zinc-600"
                        />
                    </div>
                </div>
            </div>
            <p className="mt-6 text-xs text-zinc-500">
                Running locally eliminates network round-trips and queue times, resulting in near-instant inference for real-time applications.
            </p>
        </div>
    )
}

const VRAMCalculator = () => {
    return (
        <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6">
                <Cpu size={32} className="text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Quantization Efficiency</h3>
            <p className="text-sm text-zinc-400 mb-6">
                Our 4-bit quantization reduces memory usage by 75% with less than 1% accuracy loss.
            </p>
            <div className="flex gap-4 w-full">
                <div className="flex-1 bg-black rounded-lg p-3 border border-white/10">
                    <div className="text-xs text-zinc-500 mb-1">FP16 (Standard)</div>
                    <div className="text-lg font-bold text-white">16GB</div>
                </div>
                <div className="flex items-center text-zinc-600"><ArrowRight size={16} /></div>
                <div className="flex-1 bg-amber-950/30 rounded-lg p-3 border border-amber-500/30">
                    <div className="text-xs text-amber-400 mb-1">4-bit (Spinabot)</div>
                    <div className="text-lg font-bold text-white">4.5GB</div>
                </div>
            </div>
        </div>
    )
}

const DeploymentTimeline = () => (
    <div className="flex flex-col md:flex-row justify-between items-start gap-4 max-w-5xl mx-auto relative">
        <div className="absolute top-6 left-0 w-full h-0.5 bg-zinc-800 -z-10 hidden md:block" />
        {[
            { title: "Select Model", desc: "Choose size & capabilities", icon: <Box size={18} /> },
            { title: "Fine-tune", desc: "Upload JSONL dataset", icon: <Database size={18} /> },
            { title: "Quantize", desc: "Compress to 4-bit/8-bit", icon: <Zap size={18} /> },
            { title: "Deploy", desc: "Push to edge device", icon: <RocketIcon /> },
        ].map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center w-full md:w-auto">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-white mb-4 shadow-xl z-10 relative">
                    {step.icon}
                    {i < 3 && <div className="absolute -right-1/2 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-800 -z-10 md:hidden" />}
                </div>
                <h4 className="font-bold text-white text-sm">{step.title}</h4>
                <p className="text-zinc-500 text-xs mt-1">{step.desc}</p>
            </div>
        ))}
    </div>
)

const RocketIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>
)

export const SLMView = () => {
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    const { data: session } = authClient.useSession();
    const currentEmail = session?.user?.email ?? null;

    // Get entity ID
    const entityIdData = useQuery(
        api.public.entities.getEntityIdByEmail,
        currentEmail ? { email: currentEmail } : "skip"
    );
    const entityId = entityIdData?.entityId ?? null;

    // Get entity data
    const entityData = useQuery(
        api.public.entities.getEntity,
        entityId ? { entityId } : "skip"
    );

    // Check waitlist status
    const waitlistStatus = useQuery(
        api.public.entities.checkWaitlistStatus,
        entityId ? { entityId } : "skip"
    );

    const joinWaitlist = useMutation(api.public.entities.joinWaitlist);

    const handleJoinWaitlist = async () => {
        if (!entityId || !currentEmail) {
            toast.error('Please sign in to join the waitlist');
            return;
        }

        setIsJoining(true);

        try {
            const result = await joinWaitlist({
                entityId,
                entityName: entityData?.name,
                email: currentEmail,
            });

            if (result.alreadyOnWaitlist) {
                toast.info('You are already on the waitlist!');
            } else {
                toast.success('Successfully joined the waitlist! We will notify you when SLM access is available.');
            }
        } catch (error) {
            console.error('Error joining waitlist:', error);
            toast.error('Failed to join waitlist. Please try again.');
        } finally {
            setIsJoining(false);
        }
    };

    const isOnWaitlist = waitlistStatus?.onWaitlist ?? false;
    const waitlistCurrentStatus = waitlistStatus?.status ?? null;

    return (
        <div className="w-full pb-20 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Hero Section */}
            <section className="relative pt-20 pb-32 px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs font-medium mb-8 backdrop-blur-md"
                >
                    <Cpu size={12} />
                    <span>On-Device Intelligence</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tighter leading-[1.1]"
                >
                    Small Models. <br />
                    <span className="text-zinc-500">Massive Impact.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed"
                >
                    Enterprise-grade AI that runs on your infrastructure.
                    No data leaks, no API latency, just raw performance.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <LaunchButton 
                        onClick={handleJoinWaitlist} 
                        isLoading={isJoining}
                        isOnWaitlist={isOnWaitlist}
                        status={waitlistCurrentStatus}
                    />
                </motion.div>
            </section>

            {/* Model Comparator */}
            <Section className="px-6 mb-32">
                <ModelComparator />
            </Section>

            <Section className="max-w-7xl mx-auto px-6 mb-32 grid grid-cols-1 md:grid-cols-2 gap-8">
                <LatencyChart />
                <VRAMCalculator />
            </Section>

            {/* Deployment Timeline */}
            <Section className="px-6 mb-32">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-white mb-4">Deployment Pipeline</h2>
                    <p className="text-zinc-400">From HuggingFace to Hardware in 4 steps.</p>
                </div>
                <DeploymentTimeline />
            </Section>

            {/* Features Grid */}
            <Section className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-amber-500/30 transition-all group">
                        <Lock className="w-10 h-10 text-white mb-4 group-hover:text-amber-400 transition-colors" />
                        <h3 className="text-xl font-bold text-white mb-2">Private by Design</h3>
                        <p className="text-zinc-400">Your data never leaves your VPC. Perfect for healthcare (HIPAA) and finance.</p>
                    </div>
                    <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-amber-500/30 transition-all group">
                        <HardDrive className="w-10 h-10 text-white mb-4 group-hover:text-amber-400 transition-colors" />
                        <h3 className="text-xl font-bold text-white mb-2">Hardware Agnostic</h3>
                        <p className="text-zinc-400">Optimized for ONNX, CoreML, and TensorRT. Run on NVIDIA, AMD, or Apple Silicon.</p>
                    </div>
                    <div className="p-8 rounded-2xl bg-zinc-900 border border-white/5 hover:border-amber-500/30 transition-all group">
                        <Network className="w-10 h-10 text-white mb-4 group-hover:text-amber-400 transition-colors" />
                        <h3 className="text-xl font-bold text-white mb-2">Offline Capable</h3>
                        <p className="text-zinc-400">Deploy to edge devices, drones, or IoT hardware with zero internet dependency.</p>
                    </div>
                </div>
            </Section>

            {/* Use Cases */}
            <Section className="max-w-7xl mx-auto px-6 mb-32 bg-zinc-900/20 rounded-3xl p-12 border border-white/5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Fine-tune in minutes</h2>
                        <p className="text-zinc-400 mb-8 text-lg leading-relaxed">
                            Use our distillation pipeline to train a small model to mimic GPT-4&apos;s performance on your specific tasks.
                            Achieve higher accuracy with 100x lower cost.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-white">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400"><ChevronRight size={14} /></div>
                                <span>Legal Contract Review</span>
                            </div>
                            <div className="flex items-center gap-3 text-white">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400"><ChevronRight size={14} /></div>
                                <span>Medical Record Extraction</span>
                            </div>
                            <div className="flex items-center gap-3 text-white">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400"><ChevronRight size={14} /></div>
                                <span>Text-to-SQL Generation</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative bg-black rounded-2xl border border-white/10 p-6 font-mono text-sm shadow-2xl">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="ml-auto text-zinc-500 text-xs">training_log.txt</span>
                        </div>
                        <div className="space-y-2 text-zinc-400">
                            <div className="text-white">{">"} Initializing training run...</div>
                            <div>Loading dataset: <span className="text-amber-400">contracts_v2.jsonl</span> (150MB)</div>
                            <div>Epoch 1/3: Loss <span className="text-red-400">2.45</span></div>
                            <div>Epoch 2/3: Loss <span className="text-yellow-400">1.12</span></div>
                            <div>Epoch 3/3: Loss <span className="text-green-400">0.08</span></div>
                            <div className="text-green-400">{">"} Model saved: spinabot-3b-legal-v1.gguf</div>
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};
