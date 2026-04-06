'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Bot, Zap, Share2, Globe, Lock, ArrowRight, Sparkles, Database, Workflow, Code, Send, FileText, Layout, X, UploadCloud, RefreshCw, File, Check, Network, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Section } from '../LayoutUtils';
import { authClient } from '@/lib/auth-client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';

const LaunchButton = ({ text = "Start Building", onClick, isLoading }: { text?: string; onClick?: () => void; isLoading?: boolean }) => {
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

const KnowledgeGraph = () => {
    return (
        <div className="relative w-full h-[400px] bg-zinc-900/30 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line x1="50%" y1="50%" x2="30%" y2="30%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <line x1="50%" y1="50%" x2="70%" y2="30%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <line x1="50%" y1="50%" x2="30%" y2="70%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <line x1="50%" y1="50%" x2="70%" y2="70%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <line x1="30%" y1="30%" x2="20%" y2="40%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <line x1="70%" y1="70%" x2="80%" y2="60%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            </svg>

            {/* Central Node */}
            <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)] z-10"
            >
                <Database size={24} className="text-white" />
            </motion.div>

            {/* Satellite Nodes */}
            <motion.div className="absolute top-[30%] left-[30%] -translate-x-1/2 -translate-y-1/2 p-3 bg-zinc-800 rounded-xl border border-white/10 text-xs text-white">Pricing PDF</motion.div>
            <motion.div className="absolute top-[30%] left-[70%] -translate-x-1/2 -translate-y-1/2 p-3 bg-zinc-800 rounded-xl border border-white/10 text-xs text-white">API Docs</motion.div>
            <motion.div className="absolute top-[70%] left-[30%] -translate-x-1/2 -translate-y-1/2 p-3 bg-zinc-800 rounded-xl border border-white/10 text-xs text-white">Support Logs</motion.div>
            <motion.div className="absolute top-[70%] left-[70%] -translate-x-1/2 -translate-y-1/2 p-3 bg-zinc-800 rounded-xl border border-white/10 text-xs text-white">Website</motion.div>

            <div className="absolute bottom-4 left-4 text-xs text-zinc-500">
                Visualizing RAG Context Window
            </div>
        </div>
    )
}

const ChatSimulator = () => {
    const [messages, setMessages] = useState([
        { role: 'bot', text: '👋 Hi! How can I help you today?' }
    ]);
    const [isTyping, setIsTyping] = useState(false);

    const handlePrompt = async (text: string, response: string) => {
        if (isTyping) return;
        setMessages(prev => [...prev, { role: 'user', text }]);
        setIsTyping(true);

        // Simulate thinking
        setTimeout(() => {
            setIsTyping(false);
            setMessages(prev => [...prev, { role: 'bot', text: response }]);
        }, 1500);
    };

    return (
        <div className="w-full h-[600px] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl relative border-4 border-zinc-900">
            {/* Header */}
            <div className="bg-zinc-900 p-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700"><Bot size={16} /></div>
                    <div>
                        <div className="font-bold text-sm">Help Bot</div>
                        <div className="text-[10px] text-zinc-400">Replies instantly</div>
                    </div>
                </div>
                <X size={18} className="opacity-70 cursor-pointer" />
            </div>

            {/* Messages */}
            <div className="flex-1 bg-zinc-50 p-6 overflow-y-auto space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm shadow-sm max-w-[85%] ${msg.role === 'user'
                            ? 'bg-zinc-900 text-white rounded-br-none'
                            : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none'
                            }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-zinc-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-75" />
                            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
            </div>

            {/* Prompt Suggestions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-200">
                <p className="text-xs text-zinc-500 mb-3 font-medium ml-1">Try asking:</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => handlePrompt("Where are my API keys?", "You can find your API keys in the Dashboard under Settings > Developers. Need a direct link?")}
                        className="whitespace-nowrap px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                        🔑 Where are my keys?
                    </button>
                    <button
                        onClick={() => handlePrompt("What is the pricing?", "We offer a Free tier for hobbyists, and a Pro tier at $29/mo for growing teams.")}
                        className="whitespace-nowrap px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                        💰 Pricing info
                    </button>
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-zinc-100">
                <div className="relative">
                    <input disabled type="text" placeholder="Type a message..." className="w-full bg-zinc-100 rounded-full px-4 py-3 text-sm focus:outline-none pr-12" />
                    <button disabled className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-zinc-900 text-white rounded-full flex items-center justify-center"><ArrowRight size={14} /></button>
                </div>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-zinc-400">Powered by Spinabot</span>
                </div>
            </div>
        </div>
    );
};

const IngestionDemo = () => {
    return (
        <div className="w-full h-full bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="w-20 h-20 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-2xl relative">
                <UploadCloud size={32} className="text-emerald-400" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center border-4 border-zinc-900 text-black font-bold text-[10px]">3</div>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Drag & Drop Data</h3>
            <p className="text-zinc-400 text-sm max-w-xs mb-8">
                Upload PDF, DOCX, CSV or paste a URL. We&apos;ll parse, chunk, and index it instantly.
            </p>

            <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 border border-white/5 text-xs text-zinc-300">
                    <FileText size={12} className="text-blue-400" /> manual.pdf
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 border border-white/5 text-xs text-zinc-300">
                    <Globe size={12} className="text-green-400" /> website.com
                </div>
            </div>
        </div>
    )
}

const BentoItem = ({ title, desc, icon, className = "" }: any) => (
    <div className={`p-8 rounded-2xl border border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all duration-300 group flex flex-col ${className}`}>
        <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed flex-1">{desc}</p>
    </div>
);

export const ChatbotBuilderView = () => {
    const router = useRouter();
    const [isActivating, setIsActivating] = useState(false);
    const { data: session } = authClient.useSession();
    const currentEmail = session?.user?.email ?? null;
    const { isAdmin, isLoading: checkingRole, entityId } = useIsAdmin();

    const entityData = useQuery(
        api.public.entities.getEntity,
        entityId ? { entityId } : "skip"
    );

    const handleStartBuilding = async () => {
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
                    productKey: 'chatbot-builder',
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
        <div className="w-full pb-20 overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
            {/* Hero Section */}
            <section className="relative pt-20 pb-24 px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-8 backdrop-blur-md"
                >
                    <Bot size={12} />
                    <span>RAG-Powered Chatbots</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tighter"
                >
                    Turn your data into <br />
                    <span className="text-zinc-500">intelligent conversations.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed"
                >
                    Upload PDFs, Notion pages, or crawl your website.
                    Spinabot trains a custom support agent in seconds, not months.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    {checkingRole ? (
                        <div className="flex items-center justify-center gap-2 text-zinc-400">
                            <Loader2 size={18} className="animate-spin" />
                            <span>Checking permissions...</span>
                        </div>
                    ) : isAdmin ? (
                        <LaunchButton onClick={handleStartBuilding} isLoading={isActivating} />
                    ) : (
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800/50 text-zinc-400 text-sm font-medium rounded-lg border border-zinc-700/50 backdrop-blur-sm">
                            <Lock size={16} className="text-zinc-500" />
                            <span>Contact your admin to activate chatbot builder</span>
                        </div>
                    )}
                </motion.div>
            </section>

            {/* Knowledge Graph Section */}
            <Section className="max-w-6xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-6">Visual Knowledge Mapping</h2>
                        <p className="text-zinc-400 text-lg mb-8">
                            See exactly what your bot knows. Our semantic graph visualizes relationships between your documents, ensuring no critical information is missed.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-white">
                                <Check size={20} className="text-emerald-500" />
                                <span>Real-time sync with Google Drive & Notion</span>
                            </div>
                            <div className="flex items-center gap-3 text-white">
                                <Check size={20} className="text-emerald-500" />
                                <span>Auto-parsing of tables and images</span>
                            </div>
                            <div className="flex items-center gap-3 text-white">
                                <Check size={20} className="text-emerald-500" />
                                <span>Semantic search with re-ranking</span>
                            </div>
                        </div>
                    </div>
                    <KnowledgeGraph />
                </div>
            </Section>

            {/* Main Feature Split */}
            <Section className="max-w-7xl mx-auto px-6 mb-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div className="order-2 lg:order-1 relative">
                        {/* Background blob */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[80%] bg-zinc-800/20 blur-[80px] -z-10 rounded-full" />
                        <ChatSimulator />
                    </div>

                    <div className="order-1 lg:order-2 space-y-12">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-6">Train on anything</h2>
                            <p className="text-zinc-400 text-lg leading-relaxed">
                                Spinabot&apos;s ingestion engine handles messy data. We parse tables, images, and complex documents to ensure your bot has the full context.
                            </p>
                        </div>
                        <div className="h-[300px]">
                            <IngestionDemo />
                        </div>
                    </div>
                </div>
            </Section>

            {/* Feature Grid */}
            <Section className="max-w-6xl mx-auto px-6 mb-32">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-white mb-4">Everything you need</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <BentoItem
                        title="Vector Database"
                        desc="Built-in high performance vector search. No external Pinecone or Weaviate setup required."
                        icon={<Database size={24} />}
                        className="md:col-span-2"
                    />
                    <BentoItem
                        title="Brand Customization"
                        desc="Remove our branding. Use your own colors, avatar, and tone of voice."
                        icon={<Layout size={24} />}
                    />
                    <BentoItem
                        title="Human Handoff"
                        desc="Seamlessly escalates to Intercom, Zendesk, or Slack when the confidence score is low."
                        icon={<MessageSquare size={24} />}
                    />
                    <BentoItem
                        title="Embed Anywhere"
                        desc="React component, Script tag, or an Iframe. Works on WordPress, Shopify, and custom apps."
                        icon={<Code size={24} />}
                    />
                    <BentoItem
                        title="Security First"
                        desc="GDPR compliant. Data is encrypted at rest and in transit. We don't train on your data."
                        icon={<Lock size={24} />}
                    />
                </div>
            </Section>
        </div>
    );
};
