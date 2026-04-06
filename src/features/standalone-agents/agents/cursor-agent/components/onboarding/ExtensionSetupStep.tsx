import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Download,
    Terminal,
    FolderOpen,
    CheckCircle2Icon,
    Copy,
    ChevronLeft,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface ExtensionSetupStepProps {
    onContinue: () => void;
    onBack: () => void;
}

export function ExtensionSetupStep({ onContinue, onBack }: ExtensionSetupStepProps) {
    const [copiedStep, setCopiedStep] = useState<number | null>(null);

    const copyToClipboard = (text: string, stepNumber: number) => {
        navigator.clipboard.writeText(text);
        setCopiedStep(stepNumber);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedStep(null), 2000);
    };

    const extensionPath = "src/features/standalone-agents/agents/cursor-agent/extension";

    const commands = [
        {
            step: 1,
            title: "Navigate to Extension Folder",
            command: `cd ${extensionPath}`,
            description: "Open terminal in your project root and run:"
        },
        {
            step: 2,
            title: "Install Dependencies",
            command: "npm install",
            description: "Install required packages:"
        },
        {
            step: 3,
            title: "Build Extension",
            command: "npm run build",
            description: "Build the extension (creates dist/ folder):"
        }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold">Build Chrome Extension</h2>
                <p className="text-muted-foreground">
                    Follow these steps to build and install the CursorAI extension
                </p>
            </div>

            {/* Build Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Terminal className="w-5 h-5" />
                        Step 1: Build Extension
                    </CardTitle>
                    <CardDescription>
                        Run these commands in your terminal
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {commands.map((cmd) => (
                        <div key={cmd.step} className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                                    {cmd.step}
                                </div>
                                {cmd.title}
                            </div>
                            <p className="text-sm text-muted-foreground ml-8">{cmd.description}</p>
                            <div className="ml-8 relative">
                                <div className="bg-muted rounded-lg p-4 pr-12 font-mono text-sm">
                                    {cmd.command}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="absolute right-2 top-2"
                                    onClick={() => copyToClipboard(cmd.command, cmd.step)}
                                >
                                    {copiedStep === cmd.step ? (
                                        <CheckCircle2Icon className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Install Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5" />
                        Step 2: Install in Chrome
                    </CardTitle>
                    <CardDescription>
                        Load the extension into your browser
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        <InstallStep number={1} text="Open Chrome and go to chrome://extensions/" />
                        <InstallStep number={2} text='Enable "Developer mode" (toggle in top right)' />
                        <InstallStep number={3} text='Click "Load unpacked"' />
                        <InstallStep
                            number={4}
                            text={`Select the dist/ folder inside: ${extensionPath}`}
                        />
                        <InstallStep number={5} text="Extension is now installed! 🎉" />
                    </div>

                    <Alert>
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                            <strong>Important:</strong> After building, the extension will be in the{" "}
                            <code className="bg-muted px-1 py-0.5 rounded">dist/</code> folder.
                            Make sure to select this folder when loading unpacked.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={onBack}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Button onClick={onContinue} size="lg">
                    Extension Installed - Continue
                    <CheckCircle2Icon className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}

function InstallStep({ number, text }: { number: number; text: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                {number}
            </div>
            <span className="text-sm">{text}</span>
        </div>
    );
}
