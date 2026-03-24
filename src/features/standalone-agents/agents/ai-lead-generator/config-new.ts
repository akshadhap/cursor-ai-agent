// AI Lead Generator Configuration - Apollo-style Lead Intelligence

export const AI_LEAD_GENERATOR_CONFIG = {
  name: "AI Lead Generator",
  description: "Extract and qualify leads using AI-powered natural language filters",
  type: "AI_LEAD_GENERATOR" as const,
  defaultApiKey: "lShupJrywrczAtsV9LJtza0jmwCgJmtbytzqtukzk2o",
} as const;

// Type definitions
export interface AiLeadGeneratorConfig {
  apiKey: string;
  naturalLanguageQuery: string; // e.g., "fintech startups in Bangalore with engineering managers"
  extractionInterval: "15min" | "30min" | "hourly" | "daily";
  searchFilters: SearchFilters;
  qualificationCriteria: QualificationCriteria;
  routing: RoutingConfig;
}

export interface SearchFilters {
  industryKeywords: string[];
  locations: string[];
  jobTitles: string[];
  companySize?: string[];
  technologies?: string[];
}

export interface QualificationCriteria {
  hotLeadKeywords: string[];
  coldLeadKeywords: string[];
  customRules: any[];
}

export interface RoutingConfig {
  hotLeadsAction: HotLeadAction;
  coldLeadsAction: ColdLeadAction;
}

export type HotLeadAction = 
  | "SEND_TO_SALES" 
  | "IMMEDIATE_EMAIL" 
  | "CRM_HIGH_PRIORITY" 
  | "SLACK_NOTIFICATION";

export type ColdLeadAction = 
  | "NURTURE_SEQUENCE" 
  | "CRM_LOW_PRIORITY" 
  | "EMAIL_DRIP" 
  | "DO_NOTHING";

// Enhanced keyword mappings (Apollo-style with 10x more comprehensive mappings)
export const INDUSTRY_KEYWORD_MAPPINGS: Record<string, string[]> = {
  'startup': ['startup', 'startups', 'start-up', 'new company', 'emerging company', 'early stage', 'venture backed'],
  'fintech': ['fintech', 'financial technology', 'banking', 'payments', 'lending', 'credit', 'investment', 'wealth management'],
  'saas': ['saas', 'software as a service', 'cloud software', 'subscription software', 'b2b software', 'enterprise software'],
  'technology': ['tech', 'technology', 'software', 'it company', 'digital', 'innovation', 'tech company'],
  'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural network', 'generative ai'],
  'healthcare': ['healthcare', 'health tech', 'medical', 'pharma', 'biotech', 'telemedicine', 'healthtech'],
  'ecommerce': ['ecommerce', 'e-commerce', 'online retail', 'marketplace', 'shopping', 'd2c', 'direct to consumer'],
  'edtech': ['edtech', 'education technology', 'online learning', 'e-learning', 'learning platform', 'online education'],
  'blockchain': ['blockchain', 'crypto', 'cryptocurrency', 'web3', 'defi', 'nft', 'decentralized'],
  'manufacturing': ['manufacturing', 'industrial', 'production', 'factory', 'supply chain', 'logistics'],
};

export const LOCATION_MAPPINGS: Record<string, string[]> = {
  'bangalore': ['bangalore', 'bengaluru', 'blr', 'karnataka', 'india'],
  'mumbai': ['mumbai', 'bombay', 'maharashtra', 'india'],
  'delhi': ['delhi', 'new delhi', 'ncr', 'gurgaon', 'gurugram', 'noida', 'india'],
  'chennai': ['chennai', 'madras', 'tamil nadu', 'india'],
  'hyderabad': ['hyderabad', 'hyd', 'telangana', 'india'],
  'pune': ['pune', 'poona', 'maharashtra', 'india'],
  'san francisco': ['san francisco', 'sf', 'bay area', 'silicon valley', 'california', 'ca'],
  'new york': ['new york', 'ny', 'nyc', 'manhattan', 'brooklyn', 'new york city'],
  'london': ['london', 'uk', 'united kingdom', 'england', 'gb'],
  'singapore': ['singapore', 'sg', 'apac', 'asia pacific'],
};

export const JOB_TITLE_MAPPINGS: Record<string, string[]> = {
  'founder': ['founder', 'ceo', 'chief executive', 'co-founder', 'owner', 'president', 'managing director'],
  'engineer': ['engineer', 'engineering', 'developer', 'programmer', 'coder', 'tech lead', 'software engineer'],
  'manager': ['manager', 'management', 'lead', 'head', 'director', 'vp', 'vice president'],
  'data scientist': ['data scientist', 'data science', 'analyst', 'data analyst', 'ml engineer', 'data engineer'],
  'sales': ['sales', 'business development', 'account manager', 'sales manager', 'bd', 'account executive'],
  'marketing': ['marketing', 'growth', 'digital marketing', 'content marketing', 'growth hacker', 'marketing manager'],
  'product manager': ['product manager', 'product management', 'pm', 'product lead', 'product owner'],
  'designer': ['designer', 'ui designer', 'ux designer', 'design', 'creative', 'design lead'],
};

// Company size ranges (Apollo-style)
export const COMPANY_SIZE_RANGES = [
  { value: "1,10", label: "1-10 employees" },
  { value: "11,50", label: "11-50 employees" },
  { value: "51,200", label: "51-200 employees" },
  { value: "201,500", label: "201-500 employees" },
  { value: "501,1000", label: "501-1000 employees" },
  { value: "1001,5000", label: "1001-5000 employees" },
  { value: "5001,10000", label: "5001-10000 employees" },
  { value: "10000+", label: "10000+ employees" },
] as const;

// Default configuration
export const DEFAULT_CONFIG: AiLeadGeneratorConfig = {
  apiKey: AI_LEAD_GENERATOR_CONFIG.defaultApiKey,
  naturalLanguageQuery: "",
  extractionInterval: "hourly",
  searchFilters: {
    industryKeywords: [],
    locations: [],
    jobTitles: [],
    companySize: [],
    technologies: [],
  },
  qualificationCriteria: {
    hotLeadKeywords: ["interested", "demo", "pricing", "quote", "urgent", "asap", "buy", "purchase"],
    coldLeadKeywords: ["maybe", "later", "not now", "thinking", "considering", "not sure"],
    customRules: [],
  },
  routing: {
    hotLeadsAction: "SEND_TO_SALES",
    coldLeadsAction: "NURTURE_SEQUENCE",
  },
};

// Extraction interval options
export const EXTRACTION_INTERVALS = [
  { value: "15min", label: "Every 15 minutes" },
  { value: "30min", label: "Every 30 minutes" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Daily" },
] as const;

// Hot lead action options
export const HOT_LEAD_ACTIONS = [
  { value: "SEND_TO_SALES", label: "Send to Sales Team" },
  { value: "IMMEDIATE_EMAIL", label: "Send Immediate Email" },
  { value: "CRM_HIGH_PRIORITY", label: "Add to CRM (High Priority)" },
  { value: "SLACK_NOTIFICATION", label: "Slack Notification" },
] as const;

// Cold lead action options
export const COLD_LEAD_ACTIONS = [
  { value: "NURTURE_SEQUENCE", label: "Add to Nurture Sequence" },
  { value: "CRM_LOW_PRIORITY", label: "Add to CRM (Low Priority)" },
  { value: "EMAIL_DRIP", label: "Start Email Drip Campaign" },
  { value: "DO_NOTHING", label: "Do Nothing" },
] as const;

/**
 * Parse natural language query into structured filters (Apollo-style)
 * Example: "fintech startups in Bangalore with engineering managers"
 * Returns: { industryKeywords: [...], locations: [...], jobTitles: [...] }
 */
export function parseNaturalLanguageQuery(query: string): SearchFilters {
  const queryLower = query.toLowerCase().trim();
  const filters: SearchFilters = {
    industryKeywords: [],
    locations: [],
    jobTitles: [],
    companySize: [],
    technologies: [],
  };

  // Extract industry keywords
  for (const [keyword, variations] of Object.entries(INDUSTRY_KEYWORD_MAPPINGS)) {
    if (variations.some(variation => queryLower.includes(variation))) {
      filters.industryKeywords.push(keyword);
      // Add all variations for comprehensive matching
      filters.industryKeywords.push(...variations);
    }
  }

  // Extract locations
  for (const [location, variations] of Object.entries(LOCATION_MAPPINGS)) {
    if (variations.some(variation => queryLower.includes(variation))) {
      filters.locations.push(location);
      // Add variations
      filters.locations.push(...variations.slice(0, 3)); // Limit to top 3 variations
    }
  }

  // Extract job titles
  for (const [title, variations] of Object.entries(JOB_TITLE_MAPPINGS)) {
    if (variations.some(variation => queryLower.includes(variation))) {
      filters.jobTitles.push(title);
      // Add variations
      filters.jobTitles.push(...variations.slice(0, 3));
    }
  }

  // If no filters extracted, use the query as a general keyword
  if (filters.industryKeywords.length === 0 && 
      filters.locations.length === 0 && 
      filters.jobTitles.length === 0) {
    filters.industryKeywords.push(queryLower);
  }

  // Remove duplicates
  filters.industryKeywords = [...new Set(filters.industryKeywords)];
  filters.locations = [...new Set(filters.locations)];
  filters.jobTitles = [...new Set(filters.jobTitles)];

  return filters;
}
