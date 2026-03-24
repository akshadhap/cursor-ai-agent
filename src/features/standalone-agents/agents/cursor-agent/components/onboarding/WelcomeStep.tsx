import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointerClickIcon, CheckCircle2Icon, Zap, Chrome } from "lucide-react";

interface WelcomeStepProps {
    onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
    return (
        <div className="max-w-3xl mx-auto">
            <Card className="border-2">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <MousePointerClickIcon className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-bold">Welcome to CursorAI</CardTitle>
                        <CardDescription className="text-lg mt-2">
                            Your AI-powered cursor assistant with 9 intelligent capabilities
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="space-y-8">
                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FeatureCard
                            icon={<Zap className="w-5 h-5" />}
                            title="9 AI Capabilities"
                            description="Chat, Summarize, Explain, Tasks, Emails, Scraping, and more"
                        />
                        <FeatureCard
                            icon={<Chrome className="w-5 h-5" />}
                            title="Chrome Extension"
                            description="Works on any webpage with text selection"
                        />
                        <FeatureCard
                            icon={<CheckCircle2Icon className="w-5 h-5" />}
                            title="Easy Setup"
                            description="3 simple steps to get started"
                        />
                        <FeatureCard
                            icon={<MousePointerClickIcon className="w-5 h-5" />}
                            title="Instant Access"
                            description="Select text, click bubble, get AI results"
                        />
                    </div>

                    {/* Setup Steps Preview */}
                    <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                            Quick Setup (3 Steps)
                        </h3>
                        <div className="space-y-2">
                            <SetupStepItem number={1} text="Download & Build Extension" />
                            <SetupStepItem number={2} text="Install in Chrome" />
                            <SetupStepItem number={3} text="Configure Capabilities" />
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="flex justify-center pt-4">
                        <Button onClick={onContinue} size="lg" className="px-8">
                            Get Started
                            <CheckCircle2Icon className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex gap-3 p-4 rounded-lg border bg-card">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
            </div>
            <div>
                <h4 className="font-semibold text-sm">{title}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
        </div>
    );
}

function SetupStepItem({ number, text }: { number: number; text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {number}
            </div>
            <span className="text-sm">{text}</span>
        </div>
    );
}
