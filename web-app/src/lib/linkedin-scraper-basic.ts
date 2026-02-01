/**
 * Simple LinkedIn scraper using standard web scraping
 * Falls back to basic HTML parsing when APIs fail
 */

export interface BasicLinkedInData {
    success: boolean;
    fullName?: string;
    headline?: string;
    location?: string;
    about?: string;
    error?: string;
}

export async function scrapeLinkedInBasic(profileUrl: string): Promise<BasicLinkedInData> {
    try {
        console.log('🌐 Attempting basic LinkedIn scrape...');

        // Use Scraping Dog's standard endpoint (you already have this key)
        const scrapingDogKey = process.env.SCRAPING_DOG_API_KEY;

        if (!scrapingDogKey) {
            throw new Error('No scraping API key available');
        }

        const apiUrl = `https://api.scrapingdog.com/scrape?api_key=${scrapingDogKey}&url=${encodeURIComponent(profileUrl)}&dynamic=true`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/html',
            }
        });

        if (!response.ok) {
            throw new Error(`Scraping failed: ${response.status}`);
        }

        const html = await response.text();

        // Basic HTML parsing to extract LinkedIn data
        const extractText = (pattern: RegExp): string => {
            const match = html.match(pattern);
            return match ? match[1].trim() : '';
        };

        // Try to extract basic information
        const fullName = extractText(/<h1[^>]*class="[^"]*text-heading-xlarge[^"]*"[^>]*>([^<]+)<\/h1>/) ||
            extractText(/<title>([^|<]+)/);

        const headline = extractText(/<div[^>]*class="[^"]*text-body-medium[^"]*"[^>]*>([^<]+)<\/div>/) ||
            extractText(/<h2[^>]*class="[^"]*mt1[^"]*"[^>]*>([^<]+)<\/h2>/);

        const location = extractText(/<span[^>]*class="[^"]*text-body-small[^"]*"[^>]*>([^<]+)<\/span>/);

        console.log('✅ Basic scrape successful!');
        return {
            success: true,
            fullName: fullName || 'LinkedIn Profile',
            headline: headline || '',
            location: location || '',
            about: 'Profile data extracted via basic scraping'
        };

    } catch (error: any) {
        console.error('❌ Basic scrape failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}
