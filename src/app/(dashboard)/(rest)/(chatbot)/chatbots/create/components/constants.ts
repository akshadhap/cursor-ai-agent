import type { LucideIcon } from "lucide-react";
import { Cpu, Database, Palette, Sparkles } from "lucide-react";

export const THEME_PRESETS = {
  classic: {
    name: "Classic Glow",
    description: "Warm gold gradient glow",
    primaryColor:
      "linear-gradient(90deg, #F7E07A 0%, #F2B85A 50%, #E08A3A 100%)",
  },
  dark: {
    name: "Dark Mode",
    description: "Sleek dark theme",
    primaryColor: "#1F2937",
  },
} as const;

export const CHATBOT_TEMPLATES = {
  support: {
    name: "Support",
    description: "Answer questions and help customers resolve issues.",
    greetMessage: "Hi! I'm your support assistant , how can I help today?",
    suggestions: ["Pricing", "Troubleshooting", "Talk to a human"],
  },
  sales: {
    name: "Sales",
    description: "Qualify leads and guide visitors to the right plan.",
    greetMessage:
      "Hey! Looking for the right plan? Tell me what you're building.",
    suggestions: ["Plans & pricing", "Book a demo", "Features"],
  },
  faq: {
    name: "FAQ",
    description: "Quick answers to common questions from your docs.",
    greetMessage: "Hi! Ask me anything , I’ll answer from your knowledge base.",
    suggestions: ["Refund policy", "Setup", "Contact support"],
  },
} as const;

export const BUILD_STAGES = [
  { label: "Forging the core", icon: Cpu, color: "from-violet-500 to-purple-500" },
  {
    label: "Loading knowledge",
    icon: Database,
    color: "from-emerald-500 to-teal-500",
  },
  {
    label: "Infusing personality",
    icon: Sparkles,
    color: "from-orange-500 to-amber-500",
  },
  { label: "Wiring the UI", icon: Palette, color: "from-sky-500 to-blue-500" },
] as const satisfies readonly {
  label: string;
  icon: LucideIcon;
  color: string;
}[];
