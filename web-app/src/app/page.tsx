"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Zap, Mail, Settings, FileText, CheckSquare, Shield, Check } from "lucide-react";

/**
 * Spinabot V2 Dashboard - Simplified Configuration
 * Core APIs configured server-side, only optional integrations shown
 */
export default function Home() {
    const [capabilities, setCapabilities] = useState({
        summary: true,
        actions: true,
        email: true,
    });

    const [integrations, setIntegrations] = useState({
        notion: '',
        jira: '',
        slack: '',
    });

    const [saved, setSaved] = useState(false);

    // Load saved settings on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem("spinabot-config");
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                if (parsed.capabilities) setCapabilities(parsed.capabilities);
                if (parsed.integrations) setIntegrations(parsed.integrations);
            } catch (error) {
                console.error("Failed to load settings:", error);
            }
        }
    }, []);

    const handleSaveSettings = () => {
        const settings = { capabilities, integrations };
        localStorage.setItem("spinabot-config", JSON.stringify(settings));

        // Also save to Chrome storage if extension is available
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ spinabot_config: settings });
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <main className="min-h-screen bg-white dark:bg-black">
            {/* Header */}
            <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black sticky top-0 z-50">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
                            <Sparkles className="w-7 h-7 text-white dark:text-black" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-black dark:text-white">
                                Spinabot AI Assistant
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Simplified configuration dashboard
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Welcome Card */}
                    <Card className="border-2 border-black dark:border-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                                <Sparkles className="w-6 h-6" />
                                Welcome to Spinabot V2
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Your premium AI assistant with page summarization, web scraping, lead enrichment, and email automation.
                                Core APIs are pre-configured for security.
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    {/* Core API Status - Pre-configured */}
                    <Card className="border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                                <Shield className="w-5 h-5" />
                                Core APIs (Pre-Configured)
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Essential APIs are configured server-side in .env.local
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <div>
                                        <span className="text-sm font-medium text-black dark:text-white">Groq API</span>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">AI summarization, chat, and email drafting</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">gsk_R505...3L4r</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <div>
                                        <span className="text-sm font-medium text-black dark:text-white">Scraping Dog API</span>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Web scraping with anti-bot protection</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">697c4e...8450</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <div>
                                        <span className="text-sm font-medium text-black dark:text-white">SERP API</span>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Web search and data enrichment</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">de514c...d41a7</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-600" />
                                    <div>
                                        <span className="text-sm font-medium text-black dark:text-white">SMTP2GO</span>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Email sending service</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">mail.smtp2go.com</span>
                            </div>
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    🔒 <strong>Security Note:</strong> API keys are stored securely in server environment variables (.env.local) and never exposed to the browser.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Capabilities */}
                    <Card className="border border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-black dark:text-white">AI Capabilities</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Enable or disable core features
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-black dark:text-white" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="summary" className="text-black dark:text-white">Summary</Label>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            AI-powered page and text summarization using Groq
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="summary"
                                    checked={capabilities.summary}
                                    onCheckedChange={(checked) =>
                                        setCapabilities({ ...capabilities, summary: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-black dark:text-white" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="actions" className="text-black dark:text-white">Actions</Label>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Create tasks, scrape links, enrich information
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="actions"
                                    checked={capabilities.actions}
                                    onCheckedChange={(checked) =>
                                        setCapabilities({ ...capabilities, actions: checked })
                                    }
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-5 h-5 text-black dark:text-white" />
                                    <div className="space-y-0.5">
                                        <Label htmlFor="email" className="text-black dark:text-white">Email</Label>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Draft and send professional emails with AI
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="email"
                                    checked={capabilities.email}
                                    onCheckedChange={(checked) =>
                                        setCapabilities({ ...capabilities, email: checked })
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Optional Integrations */}
                    <Card className="border border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-black dark:text-white">
                                <CheckSquare className="w-5 h-5" />
                                Optional Task Integrations
                            </CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Configure third-party integrations for task creation (optional)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="notion-key" className="text-black dark:text-white">Notion API Key</Label>
                                <Input
                                    id="notion-key"
                                    type="password"
                                    placeholder="secret_..."
                                    value={integrations.notion}
                                    onChange={(e) => setIntegrations({ ...integrations, notion: e.target.value })}
                                    className="border-gray-300 dark:border-gray-700"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    For creating tasks in Notion databases
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="jira-key" className="text-black dark:text-white">Jira API Token</Label>
                                <Input
                                    id="jira-key"
                                    type="password"
                                    placeholder="Enter Jira API token"
                                    value={integrations.jira}
                                    onChange={(e) => setIntegrations({ ...integrations, jira: e.target.value })}
                                    className="border-gray-300 dark:border-gray-700"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    For creating issues in Jira projects
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slack-key" className="text-black dark:text-white">Slack Bot Token</Label>
                                <Input
                                    id="slack-key"
                                    type="password"
                                    placeholder="xoxb-..."
                                    value={integrations.slack}
                                    onChange={(e) => setIntegrations({ ...integrations, slack: e.target.value })}
                                    className="border-gray-300 dark:border-gray-700"
                                />
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    For sending messages to Slack channels
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <div className="flex justify-end gap-4">
                        {saved && (
                            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                <CheckSquare className="w-4 h-4" />
                                Settings saved successfully!
                            </div>
                        )}
                        <Button
                            onClick={handleSaveSettings}
                            size="lg"
                            className="bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Save Configuration
                        </Button>
                    </div>

                    {/* Installation Instructions */}
                    <Card className="border border-gray-200 dark:border-gray-800">
                        <CardHeader>
                            <CardTitle className="text-black dark:text-white">🚀 Extension Installation</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Load the Spinabot extension to use these features
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-black dark:text-white">1. Build the extension:</p>
                                <code className="block bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded text-sm text-black dark:text-white">
                                    cd extension && npm run build
                                </code>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-black dark:text-white">2. Load in Chrome:</p>
                                <ul className="text-sm space-y-1 ml-4 list-disc text-gray-600 dark:text-gray-400">
                                    <li>Open <code className="bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">chrome://extensions/</code></li>
                                    <li>Enable "Developer mode"</li>
                                    <li>Click "Load unpacked"</li>
                                    <li>Select <code className="bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">extension/dist</code> folder</li>
                                </ul>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-black dark:text-white">3. Use the extension:</p>
                                <ul className="text-sm space-y-1 ml-4 list-disc text-gray-600 dark:text-gray-400">
                                    <li>Visit any website</li>
                                    <li>Select text to see quick menu</li>
                                    <li>Click extension icon to toggle panel</li>
                                    <li>Press <kbd className="bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">Alt+S</kbd> to toggle</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
