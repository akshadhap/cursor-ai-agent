/**
 * PostFlow (LinkedIn Scheduler) Configuration
 * AI-powered LinkedIn post scheduler with content strategy
 */

export const LINKEDIN_SCHEDULER_CONFIG = {
    name: "PostFlow",
    description: "AI-powered LinkedIn post scheduler with content strategy",
    type: "LINKEDIN_SCHEDULER" as const,
} as const;

// ============================================
// ONBOARDING STEPS
// ============================================

export const ONBOARDING_STEPS = {
    ACCOUNT_TYPE: 1,           // NEW - Personal or Business selection
    DATA_COLLECTION: 2,        // Modified for account type
    ANALYSIS_INTRO: 3,
    DETAILED_ANALYSIS: 4,
    POST_TYPE_SELECTION: 5,
    TIMING_SUGGESTIONS: 6,
    CONNECT_LINKEDIN: 7,       // NEW - Mandatory LinkedIn connection
} as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[keyof typeof ONBOARDING_STEPS];

// Account type for onboarding
export type AccountType = "personal" | "business";

// ============================================
// COMPANY SIZE
// ============================================

export const COMPANY_SIZES = {
    SOLO: "solo",
    SMALL: "small",
    MEDIUM: "medium",
    LARGE: "large",
    ENTERPRISE: "enterprise",
} as const;

export type CompanySize = (typeof COMPANY_SIZES)[keyof typeof COMPANY_SIZES];

export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
    solo: "Solo / Freelancer",
    small: "Small (2-10)",
    medium: "Medium (11-50)",
    large: "Large (51-200)",
    enterprise: "Enterprise (200+)",
};

// ============================================
// POST TYPES
// ============================================

export const POST_TYPES = {
    EDUCATIONAL: "educational",
    PROMOTIONAL: "promotional",
    THOUGHT_LEADERSHIP: "thought-leadership",
    CASE_STUDY: "case-study",
    BEHIND_THE_SCENES: "behind-the-scenes",
    ENGAGEMENT: "engagement",
    NEWS_COMMENTARY: "news-commentary",
} as const;

export type PostType = (typeof POST_TYPES)[keyof typeof POST_TYPES];

export const POST_TYPE_CONFIG: Record<PostType, { label: string; description: string; icon: string; color: string }> = {
    educational: {
        label: "Educational",
        description: "Share knowledge, tips, and how-tos",
        icon: "GraduationCap",
        color: "text-blue-500",
    },
    promotional: {
        label: "Promotional",
        description: "Showcase products, services, offers",
        icon: "Megaphone",
        color: "text-orange-500",
    },
    "thought-leadership": {
        label: "Thought Leadership",
        description: "Share opinions, insights, industry trends",
        icon: "Lightbulb",
        color: "text-yellow-500",
    },
    "case-study": {
        label: "Case Study",
        description: "Client success stories and results",
        icon: "Trophy",
        color: "text-green-500",
    },
    "behind-the-scenes": {
        label: "Behind the Scenes",
        description: "Team culture, processes, day-to-day",
        icon: "Camera",
        color: "text-purple-500",
    },
    engagement: {
        label: "Engagement",
        description: "Questions, polls, discussions",
        icon: "MessageCircle",
        color: "text-cyan-500",
    },
    "news-commentary": {
        label: "News Commentary",
        description: "React to industry news and trends",
        icon: "Newspaper",
        color: "text-red-500",
    },
};

// ============================================
// POST STATUS
// ============================================

export const POST_STATUS = {
    DRAFT: "draft",
    SCHEDULED: "scheduled",
    POSTED: "posted",
    FAILED: "failed",
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

// ============================================
// CONTENT CATEGORIES (legacy, for suggestions)
// ============================================

export const POST_CATEGORIES = {
    PRODUCT: "product",
    THOUGHT_LEADERSHIP: "thought-leadership",
    INDUSTRY: "industry",
    ENGAGEMENT: "engagement",
} as const;

export type PostCategory = (typeof POST_CATEGORIES)[keyof typeof POST_CATEGORIES];

// ============================================
// CONTENT TONE
// ============================================

export const CONTENT_TONES = {
    PROFESSIONAL: "professional",
    CASUAL: "casual",
    FRIENDLY: "friendly",
    AUTHORITATIVE: "authoritative",
} as const;

export type ContentTone = (typeof CONTENT_TONES)[keyof typeof CONTENT_TONES];

// ============================================
// CONSTANTS
// ============================================

export const CHARACTER_LIMIT = 3000;
export const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB

// ============================================
// NAVIGATION
// ============================================

export const NAV_ITEMS = [
    { id: "dashboard" as const, label: "Dashboard", icon: "LayoutDashboard" },
    { id: "analyze" as const, label: "Analyze", icon: "BarChart3" },
    { id: "chat" as const, label: "AI Chat", icon: "MessageSquare" },
    { id: "messages" as const, label: "Messages", icon: "Mail" },
    { id: "history" as const, label: "History", icon: "Clock" },
    { id: "settings" as const, label: "Settings", icon: "Settings" },
];

export type NavItemId = "dashboard" | "analyze" | "chat" | "inbox" | "myposts" | "leadmagnets" | "automations" | "calendar" | "history" | "analytics" | "settings";

// ============================================
// CATEGORY CONFIG (for display)
// ============================================

export const CATEGORY_CONFIG: Record<
    PostCategory,
    { label: string; color: string; bgColor: string; icon: string }
> = {
    product: {
        label: "Product",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        icon: "Package",
    },
    "thought-leadership": {
        label: "Thought Leadership",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        icon: "Lightbulb",
    },
    industry: {
        label: "Industry",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        icon: "Building2",
    },
    engagement: {
        label: "Engagement",
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        icon: "MessageCircle",
    },
};

// ============================================
// DATA MODELS
// ============================================

/**
 * Company profile collected during onboarding Step 1
 */
export interface CompanyProfile {
    // Basic Info
    businessName: string;
    industry: string;
    description: string;
    companySize: CompanySize;

    // Products & Audience
    productsServices: string[];
    targetAudience: string;
    contentTone: ContentTone;

    // Context for Personalization (NEW)
    valueProposition?: string;      // "10x your LinkedIn engagement"
    calendarLink?: string;          // Calendly or similar link
    leadMagnetUrl?: string;         // Default PDF/resource link

    // Links
    linkedInUrl: string;
    websiteUrl: string;
    additionalLinks: string[];
}

/**
 * Analysis result from AI (Groq)
 */
export interface AnalysisResult {
    // Company Classification
    companyType: string;
    categories: string[];
    audienceType: string;

    // Recommendations
    recommendedPostTypes: PostType[];
    contentThemes: string[];

    // Strategy
    strategyScore: number;
    contentMix: Record<PostType, number>;

    // Insights
    keyInsights: {
        title: string;
        description: string;
        severity: "high" | "medium" | "low";
        type: "positive" | "warning" | "improvement";
    }[];

    // Timing
    optimalPostingTimes: {
        day: string;
        timeRange: string;
        timezone: string;
    }[];

    // Audience
    audienceInsights: string;

    // Actions
    actionItems: string[];

    // Trends
    trends: {
        topic: string;
        relevance: number;
        description: string;
    }[];

    // Scraped Data Metadata (from deep analysis)
    scrapedData?: {
        linkedInAnalyzed: boolean;
        websiteAnalyzed: boolean;
        additionalUrlsAnalyzed: number;
    };

    generatedAt: string;
}

/**
 * User's selected preferences from onboarding
 */
export interface UserPreferences {
    selectedPostTypes: PostType[];
    approvedSchedule: {
        day: string;
        time: string;
    }[];
    contentFrequency: "daily" | "3x-week" | "2x-week" | "weekly";
}

/**
 * Content suggestion from AI
 */
export interface ContentSuggestion {
    id: string;
    postType: PostType;
    category: PostCategory;
    content: string;
    hashtags: string[];
    matchScore: number;
    status: "suggested" | "scheduled" | "dismissed";
    scheduledFor?: string;
    hook?: string;
    angle?: string;
}

/**
 * LinkedIn post
 */
export interface LinkedInPost {
    id: string;
    content: string;
    imageUrl?: string;
    postType: PostType;
    category: PostCategory;
    status: PostStatus;
    scheduledAt?: string;
    postedAt?: string;
    createdAt: string;
    updatedAt: string;
    ayrsharePostId?: string;
    unipilePostId?: string;
    error?: string;
}

// ============================================
// MESSAGE AUTOMATION TYPES
// ============================================

export interface MessageTemplate {
    id: string;
    name: string;
    category: "welcome" | "follow-up" | "thank-you" | "custom";
    content: string;
    variables: string[];
    createdAt: string;
}

export interface AutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: "new_message" | "connection_request" | "mention" | "keyword";
    conditions: {
        field: string;
        operator: "contains" | "equals" | "starts_with";
        value: string;
    }[];
    delay: {
        value: number;
        unit: "minutes" | "hours" | "days";
    };
    templateId: string;
    createdAt: string;
}

export interface LinkedInMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderTitle?: string;
    senderAvatar?: string;
    content: string;
    timestamp: string;
    isRead: boolean;
    isAutomated: boolean;
    conversationId: string;
}

// Legacy type for backwards compatibility
export type BusinessProfile = CompanyProfile;
export type AIAnalysis = AnalysisResult;
