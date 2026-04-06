/**
 * VisibilityAI — SEO + GEO + AEO Agent Configuration
 * All types, constants, nav items, and data models
 */

export const VISIBILITY_AI_CONFIG = {
    name: "VisibilityAI",
    description: "AI-powered SEO, GEO & AEO visibility agent — analyze, boost, and automate your digital presence",
    type: "SEO_GEO_AEO_AGENT" as const,
} as const;

// ============================================
// ONBOARDING STEPS
// ============================================

export const ONBOARDING_STEPS = {
    WEBSITE_SETUP: 1,
    CRAWL_PROGRESS: 2,
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

// ============================================
// NAV ITEMS
// ============================================

export const NAV_ITEMS = [
    { id: "overview" as const, label: "Overview", icon: "LayoutDashboard" },
    { id: "seo-audit" as const, label: "SEO Audit", icon: "SearchCheck" },
    { id: "seo-boost" as const, label: "SEO Boost", icon: "Rocket" },
    { id: "geo-analysis" as const, label: "GEO Analysis", icon: "Globe" },
    { id: "geo-boost" as const, label: "GEO Boost", icon: "Sparkles" },
    { id: "aeo-generator" as const, label: "AEO Generator", icon: "MessageSquare" },
    { id: "content-briefs" as const, label: "Content Briefs", icon: "FileText" },
    { id: "schema" as const, label: "Schema", icon: "Code" },
    { id: "impact-tracker" as const, label: "Impact Tracker", icon: "LineChart" },
    { id: "integrations" as const, label: "Integrations", icon: "Blocks" },
    { id: "settings" as const, label: "Settings", icon: "Settings" },
] as const;

export type NavItemId = (typeof NAV_ITEMS)[number]["id"];

// ============================================
// INDUSTRY OPTIONS
// ============================================

export const INDUSTRIES = [
    "Technology / SaaS",
    "E-Commerce / Retail",
    "Healthcare / Medical",
    "Finance / Fintech",
    "Education / EdTech",
    "Real Estate",
    "Marketing / Agency",
    "Travel / Hospitality",
    "Food & Beverage",
    "Legal / Law Firm",
    "Consulting / Professional Services",
    "Manufacturing",
    "Non-Profit",
    "Other",
] as const;

export type Industry = (typeof INDUSTRIES)[number];

// ============================================
// FOCUS GOALS
// ============================================

export const FOCUS_GOALS = {
    SEO: "seo",
    GEO: "geo",
    AEO: "aeo",
    ALL: "all",
} as const;

export type FocusGoal = (typeof FOCUS_GOALS)[keyof typeof FOCUS_GOALS];

// ============================================
// SEVERITY LEVELS
// ============================================

export const SEVERITY = {
    CRITICAL: "critical",
    WARNING: "warning",
    INFO: "info",
    GOOD: "good",
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

// ============================================
// DATA MODELS
// ============================================

/** Basic info from onboarding step 1 */
export interface WebsiteProfile {
    domain: string;             // e.g. "example.com"
    competitors: string[];      // up to 3 competitor domains
    industry: Industry;
    focusGoal: FocusGoal;
    businessName: string;
    description: string;
}

/** A single crawled page */
export interface CrawledPage {
    url: string;
    title: string;
    metaDescription: string;
    h1: string[];
    h2: string[];
    h3: string[];
    bodyText: string;           // first 2000 chars
    images: { src: string; alt: string }[];
    internalLinks: { href: string; anchor: string }[];
    canonicalUrl: string;
    wordCount: number;
    crawledAt: string;
}

/** SEO issue for a single page */
export interface SeoIssue {
    id: string;
    url: string;
    type: string;               // e.g. "missing-meta-description"
    title: string;
    description: string;
    severity: Severity;
    fix: string;                // actionable fix suggestion
}

/** SEO Boost result for a page */
export interface SeoBoostResult {
    url: string;
    optimizedTitle: string;
    optimizedMetaDescription: string;
    optimizedH1: string;
    altTextSuggestions: { src: string; suggestedAlt: string }[];
    internalLinkSuggestions: { href: string; suggestedAnchor: string }[];
    generatedAt: string;
}

/** GEO entity analysis */
export interface GeoAnalysis {
    entityClarityScore: number;         // 0-100
    knowledgePanelReadiness: number;    // 0-100
    aiMentionScore: number;             // 0-100
    entityStrengths: string[];
    entityGaps: string[];
    aiPresenceCheck: {
        query: string;
        brandMentioned: boolean;
        snippet: string;
    }[];
    structuredDataGaps: string[];
    recommendations: string[];
    generatedAt: string;
}

/** GEO Boost result */
export interface GeoBoostResult {
    entitySummary: string;              // About [Brand] paragraph for AI crawlers
    knowledgePanelContent: {
        name: string;
        description: string;
        foundedYear?: string;
        headquarters?: string;
        industry: string;
        website: string;
    };
    faqAnswers: { question: string; answer: string }[];
    suggestedCitations: string[];
    wikidataSnippet: string;
    jsonLd: string;                     // Organization JSON-LD
    generatedAt: string;
}

/** AEO generated Q&A */
export interface AeoResult {
    pageUrl: string;
    questions: {
        id: string;
        question: string;
        answer: string;
        schema: string;             // FAQPage JSON-LD snippet
    }[];
    faqSchemaFull: string;          // Full JSON-LD
    generatedAt: string;
}

/** Content brief */
export interface ContentBrief {
    id: string;
    keyword: string;
    searchVolume: string;
    difficulty: "easy" | "medium" | "hard";
    intent: "informational" | "commercial" | "transactional" | "navigational";
    title: string;
    outline: string[];
    targetKeywords: string[];
    wordCountTarget: number;
    suggestedFaqs: string[];
    generatedAt: string;
}

/** SERP keyword data */
export interface SerpKeyword {
    keyword: string;
    position: number | null;
    searchVolume: string;
    url: string;
    competitorPositions: { domain: string; position: number }[];
}

/** Generated schema blocks */
export interface SchemaBlock {
    id: string;
    type: "FAQ" | "Article" | "HowTo" | "Organization" | "BreadcrumbList" | "WebSite";
    pageUrl: string;
    jsonLd: string;
    generatedAt: string;
}

/** Full analysis result */
export interface VisibilityAnalysis {
    // Scores
    visibilityScore: number;    // 0-100 overall
    seoScore: number;           // 0-100
    geoScore: number;           // 0-100
    aeoScore: number;           // 0-100

    // Data
    crawledPages: CrawledPage[];
    seoIssues: SeoIssue[];
    geoAnalysis: GeoAnalysis | null;
    aeoResults: AeoResult[];
    serpKeywords: SerpKeyword[];
    contentBriefs: ContentBrief[];
    schemaBlocks: SchemaBlock[];

    // Boosts generated
    seoBoosts: SeoBoostResult[];
    geoBoost: GeoBoostResult | null;

    // Meta
    pagesAnalyzed: number;
    issuesFound: number;
    quickWins: string[];
    generatedAt: string;
}

/** Agent state used by editor.tsx */
export interface VisibilityAgentState {
    onboardingStep: number;
    onboardingComplete: boolean;
    websiteProfile: WebsiteProfile | null;
    analysis: VisibilityAnalysis | null;
    isCrawling: boolean;
    isAnalyzing: boolean;
    activeTab: NavItemId;
    crawlProgress: number;          // 0-100
    crawlStatus: string;            // status message
}
