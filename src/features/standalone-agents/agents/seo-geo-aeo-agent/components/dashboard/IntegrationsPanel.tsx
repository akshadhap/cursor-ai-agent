"use client";

import { useState } from "react";
import {
    BlocksIcon,
    CheckCircle2Icon,
    ArrowUpRightIcon,
    PlugIcon,
    TerminalIcon,
    GlobeIcon,
    ShoppingCartIcon,
    LayoutTemplateIcon,
    PenToolIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WebsiteProfile } from "../../config";

interface IntegrationsPanelProps {
    websiteProfile: WebsiteProfile;
}

const PLUGINS = [
    {
        id: "wordpress",
        name: "WordPress",
        description: "Auto-sync SEO tags, apply FAQ pages, and update Yoast/RankMath fields automatically.",
        icon: PenToolIcon,
        status: "disconnected",
        popular: true,
    },
    {
        id: "shopify",
        name: "Shopify",
        description: "Optimize product descriptions, push JSON-LD for products, and handle image alt texts.",
        icon: ShoppingCartIcon,
        status: "disconnected",
        popular: true,
    },
    {
        id: "webflow",
        name: "Webflow",
        description: "Connect via Webflow API to auto-publish CMS items and update static page metadata.",
        icon: LayoutTemplateIcon,
        status: "disconnected",
    },
];

export function IntegrationsPanel({ websiteProfile }: IntegrationsPanelProps) {
    const [connectedPlugins, setConnectedPlugins] = useState<Record<string, boolean>>({});
    const [isConnecting, setIsConnecting] = useState<string | null>(null);

    const handleConnect = (id: string) => {
        setIsConnecting(id);
        
        // Simulate an OAuth redirect and connection process for maximum realism
        setTimeout(() => {
            setIsConnecting(null);
            setConnectedPlugins(prev => ({ ...prev, [id]: true }));
            toast.success(`Successfully connected ${id.charAt(0).toUpperCase() + id.slice(1)}!`);
            toast.success("Agent now has permissions to push changes directly.", {
                description: "You'll still be prompted for approval in the agent log."
            });
        }, 2000);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto flex flex-col h-full bg-background relative z-0">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                        <BlocksIcon className="h-4 w-4 text-background" />
                    </div>
                    CMS Plugins & Integrations
                </h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
                    Don't want to copy-paste? Connect your website platform below. The Visibility Agent will 
                    automatically draft changes into your CMS. You just click "Approve". No coding required.
                </p>
            </div>

            {/* Plugin Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {PLUGINS.map(plugin => {
                    const isConnected = connectedPlugins[plugin.id];
                    const connecting = isConnecting === plugin.id;
                    
                    return (
                        <Card 
                            key={plugin.id} 
                            className={cn(
                                "border transition-all duration-300 relative overflow-hidden group",
                                isConnected 
                                    ? "border-foreground bg-muted/10 shadow-sm"
                                    : "border-border/60 hover:border-foreground/40 bg-card hover:bg-muted/10"
                            )}
                        >
                            {isConnected && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-foreground" />
                            )}
                            
                            <CardContent className="p-6 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                            isConnected ? "bg-foreground text-background" : "bg-muted text-foreground group-hover:bg-foreground/10"
                                        )}>
                                            <plugin.icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{plugin.name}</h3>
                                            <div className="flex gap-2 items-center">
                                                {isConnected ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" /> Active
                                                    </span>
                                                ) : plugin.status === "coming_soon" ? (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                        Waitlist
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-muted-foreground mr-0.5" /> Ready
                                                    </span>
                                                )}
                                                {plugin.popular && !isConnected && (
                                                    <span className="text-[9px] font-bold uppercase tracking-widest bg-foreground text-background px-1.5 py-0.5 rounded">
                                                        Popular
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                                    {plugin.description}
                                </p>
                                
                                <div>
                                    {isConnected ? (
                                        <Button 
                                            variant="outline" 
                                            className="w-full gap-2 border-border/50 bg-background hover:bg-muted"
                                            onClick={() => setConnectedPlugins(prev => ({ ...prev, [plugin.id]: false }))}
                                        >
                                            <CheckCircle2Icon className="h-4 w-4" /> Connected
                                        </Button>
                                    ) : (
                                        <Button 
                                            className="w-full gap-2 bg-foreground text-background"
                                            disabled={plugin.status === "coming_soon" || isConnecting !== null}
                                            onClick={() => handleConnect(plugin.id)}
                                        >
                                            {connecting ? (
                                                <><span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> Authenticating...</>
                                            ) : plugin.status === "coming_soon" ? (
                                                "Join Waitlist"
                                            ) : (
                                                <><PlugIcon className="h-4 w-4" /> Connect {plugin.name}</>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Dev/Custom Connection */}
            <div className="mt-auto">
                <Card className="border-border bg-foreground text-background overflow-hidden relative">
                    {/* Background abstract shape to make it look premium */}
                    <div className="absolute right-0 top-0 w-64 h-64 bg-background/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    
                    <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="space-y-4 max-w-xl">
                            <h3 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                                <TerminalIcon className="h-6 w-6" /> Custom API Access
                            </h3>
                            <p className="text-background/80 leading-relaxed text-sm md:text-base">
                                Are you running a custom stack? (React, Next.js, headless CMS). Give your engineering team access to the Visibility CLI. They can pull agent-generated Schema and Meta tags automatically during CI/CD builds.
                            </p>
                        </div>
                        <div className="w-full md:w-auto">
                            <Button className="w-full md:w-auto bg-background text-foreground hover:bg-muted font-semibold gap-2 border-none">
                                Generate API Key <ArrowUpRightIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
