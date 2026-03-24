import { NextResponse } from "next/server";
import { logger } from "@/features/standalone-agents/agents/seo-geo-aeo-agent/lib/logger";

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export async function POST(req: Request) {
    try {
        const { domain, competitors } = await req.json();

        if (!domain) {
            return NextResponse.json({ error: "Domain is required" }, { status: 400 });
        }

        if (!SERPER_API_KEY) {
            logger.warn("No Serper API key found. Skipping SERP check.");
            // Return empty mock data so analysis doesn't completely fail
            return NextResponse.json({
                keywords: [
                    { keyword: "example brand keyword", position: null, searchVolume: "N/A", url: "", competitorPositions: [] }
                ]
            });
        }

        logger.info(`Running SERP check for domain: ${domain}`);

        const queries = [
            `site:${domain}`,
            domain.split('.')[0], // simple brand name
            `${domain.split('.')[0]} reviews`
        ];

        let results = [];

        // In a real scenario we might search for actual top keywords
        // For this MVP we'll do a basic search using the brand to see if they rank for their own name
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                q: queries[1],
                gl: "us",
                hl: "en",
                num: 10
            })
        });

        if (!response.ok) {
            throw new Error("Serper API request failed");
        }

        const data = await response.json();
        
        // Find if domain is in results
        const organicResults = data.organic || [];
        const domainPosition = organicResults.findIndex((r: any) => r.link.includes(domain)) + 1;
        
        let competitorPositions: { domain: string, position: number }[] = [];
        
        // Check competitors
        if (competitors && Array.isArray(competitors)) {
            competitors.forEach(comp => {
                if (comp) {
                    const pos = organicResults.findIndex((r: any) => r.link.includes(comp)) + 1;
                    if (pos > 0) {
                        competitorPositions.push({ domain: comp, position: pos });
                    }
                }
            });
        }

        results.push({
            keyword: queries[1],
            position: domainPosition > 0 ? domainPosition : null,
            searchVolume: "Unknown", // Serper doesn't provide search volume easily in standard search
            url: domainPosition > 0 ? organicResults[domainPosition - 1].link : "",
            competitorPositions,
        });

        return NextResponse.json({ keywords: results });

    } catch (error: any) {
        logger.error("SERP check error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
