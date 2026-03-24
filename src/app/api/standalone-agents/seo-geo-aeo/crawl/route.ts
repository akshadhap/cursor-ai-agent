import { NextResponse } from "next/server";
import { load } from "cheerio";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

export async function POST(req: Request) {
    try {
        const { domain } = await req.json();

        if (!domain) {
            return NextResponse.json({ error: "Domain is required" }, { status: 400 });
        }

        logger.info(`Starting crawl for domain: ${domain}`);

        // Ensure URL format
        let url = domain.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = `https://${url}`;
        }

        // We'll mimic a small crawler by fetching the homepage 
        // For a full app we would follow internal links, but for this agent context we extract deep data from the homepage
        
        const response = await fetch(url, {
            headers: {
                "User-Agent": "VisibilityAI-Crawler/1.0",
                "Accept": "text/html,application/xhtml+xml,application/xml"
            },
            next: { revalidate: 3600 } // Cache for 1 hour to avoid spamming
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        const $ = load(html);

        // Extract Title
        const title = $("title").text().trim() || "";

        // Extract Meta Description
        const metaDescription = $("meta[name='description']").attr("content")?.trim() || "";

        // Extract H1-H3
        const h1 = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
        const h2 = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean);
        const h3 = $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean);

        // Extract Body Text (limit to 3000 chars for LLM context limits)
        // Remove script and style tags first
        $("script, style, noscript, nav, footer, header").remove();
        let bodyText = $("body").text().replace(/\s+/g, " ").trim();
        bodyText = bodyText.substring(0, 3000); // Truncate early to save tokens

        const wordCount = bodyText.split(/\s+/).length;

        // Extract Images (max 10 for analysis)
        const images = $("img")
            .map((_, el) => ({
                src: $(el).attr("src") || "",
                alt: $(el).attr("alt") || ""
            }))
            .get()
            .filter(img => img.src && !img.src.startsWith("data:"))
            .slice(0, 10);

        // Extract Internal Links (max 15 for analysis)
        const baseUrl = new URL(url).origin;
        const internalLinks = $("a")
            .map((_, el) => ({
                href: $(el).attr("href") || "",
                anchor: $(el).text().trim()
            }))
            .get()
            .filter(link => {
                const isInternal = link.href.startsWith(baseUrl) || link.href.startsWith("/");
                return link.href && link.anchor && isInternal && link.href !== "/";
            })
            .slice(0, 15);

        // Extract Canonical
        const canonicalUrl = $("link[rel='canonical']").attr("href") || "";

        const pageData = {
            url,
            title,
            metaDescription,
            h1,
            h2,
            h3,
            bodyText,
            images,
            internalLinks,
            canonicalUrl,
            wordCount,
            crawledAt: new Date().toISOString()
        };

        // For this MVP, we return an array with just the homepage.
        // A real crawler would traverse links and push to this array.
        logger.info(`Crawl complete for ${domain}. Found ${wordCount} words.`);

        return NextResponse.json({ pages: [pageData] });

    } catch (error: any) {
        logger.error("Crawl error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
