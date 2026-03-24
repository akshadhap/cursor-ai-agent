/**
 * LinkedIn Scraping Service
 * Supports multiple providers with automatic fallback:
 * 1. Apify (Primary - if rented)
 * 2. RapidAPI (Fallback - Free 50/month when activated)
 * 3. Basic HTML Scraping (Last resort - uses existing Scraping Dog key)
 */

import { scrapeLinkedInBasic } from './linkedin-scraper-basic';

export interface LinkedInProfile {
    fullName: string;
    headline: string;
    summary?: string;
    location?: string;
    experience?: Array<{
        position: string;
        company: string;
        dateRange: string;
        description?: string;
    }>;
    education?: Array<{
        school: string;
        degree: string;
        field?: string;
        dateRange: string;
    }>;
    skills?: string[];
    profileUrl: string;
    imageUrl?: string;
}

export interface LinkedInScraperResult {
    success: boolean;
    data?: LinkedInProfile;
    error?: string;
    provider?: 'rapidapi' | 'apify' | 'scrapingdog' | 'none';
    creditsUsed?: number;
}

/**
 * Scrape LinkedIn profile using ScrapingDog Dedicated LinkedIn API
 */
async function scrapeWithScrapingDog(profileUrl: string, apiKey: string): Promise<LinkedInScraperResult> {
    try {
        console.log('🟠 Attempting LinkedIn scrape with ScrapingDog Dedicated API...');

        const url = `https://api.scrapingdog.com/linkedin?api_key=${apiKey}&type=profile&link=${encodeURIComponent(profileUrl)}`;

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`ScrapingDog Error: ${response.status} - ${errorText}`);
            throw new Error(`ScrapingDog returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // The API returns an array of profiles
        if (Array.isArray(data) && data.length > 0) {
            const item = data[0];
            const profile: LinkedInProfile = {
                fullName: item.name || 'Unknown',
                headline: item.headline || '',
                summary: item.about || '',
                location: item.location || '',
                experience: item.experience?.map((exp: any) => ({
                    position: exp.title || '',
                    company: exp.company || '',
                    dateRange: exp.dateRange || '',
                    description: exp.description || ''
                })) || [],
                education: item.education?.map((edu: any) => ({
                    school: edu.school || '',
                    degree: edu.degree || '',
                    field: '',
                    dateRange: edu.dateRange || ''
                })) || [],
                skills: item.skills || [],
                profileUrl: profileUrl,
                imageUrl: item.image || ''
            };

            console.log('✅ ScrapingDog dedicated scrape successful!');
            return {
                success: true,
                data: profile,
                provider: 'scrapingdog',
                creditsUsed: 1
            };
        }

        throw new Error('ScrapingDog returned unexpected data format');

    } catch (error: any) {
        console.error('❌ ScrapingDog dedicated scrape failed:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'scrapingdog'
        };
    }
}


/**
 * Main function: Scrape LinkedIn profile using ScrapingDog
 * 
 * Strategy:
 * 1. Try ScrapingDog Dedicated LinkedIn API (Best data)
 * 2. Fallback to ScrapingDog Basic HTML scraping (Minimal data)
 */
export async function scrapeLinkedInProfile(profileUrl: string): Promise<LinkedInScraperResult> {
    const scrapingDogApiKey = process.env.SCRAPING_DOG_API_KEY;

    console.log(`\n🔍 Starting LinkedIn scrape for: ${profileUrl}`);
    console.log(`DEBUG: SCRAPING_DOG_API_KEY=${scrapingDogApiKey?.substring(0, 10)}...`);

    if (!scrapingDogApiKey) {
        return {
            success: false,
            error: 'SCRAPING_DOG_API_KEY is not configured',
            provider: 'none'
        };
    }

    // 1. Try ScrapingDog Dedicated API (Primary)
    const result = await scrapeWithScrapingDog(profileUrl, scrapingDogApiKey);
    if (result.success) {
        return result;
    }
    console.log('⚠️ ScrapingDog dedicated failed, trying basic fallback...');

    // 2. Fallback: Try basic HTML scraping
    console.log('⚠️ Trying basic HTML scraping as fallback...');
    const basicResult = await scrapeLinkedInBasic(profileUrl);
    if (basicResult.success) {
        // Convert basic result to LinkedInProfile format
        const profile: LinkedInProfile = {
            fullName: basicResult.fullName || 'LinkedIn User',
            headline: basicResult.headline || '',
            summary: basicResult.about || '',
            location: basicResult.location || '',
            experience: [],
            education: [],
            skills: [],
            profileUrl: profileUrl,
            imageUrl: ''
        };

        return {
            success: true,
            data: profile,
            provider: 'none' as any, // Basic scraping
            creditsUsed: 0
        };
    }

    // All methods failed
    return {
        success: false,
        error: 'LinkedIn scraping failed. Please check your ScrapingDog API key.',
        provider: 'none'
    };
}
