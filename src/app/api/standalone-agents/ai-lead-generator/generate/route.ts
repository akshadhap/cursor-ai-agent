import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

// Apollo API URLs
const APOLLO_ORG_URL = "https://api.apollo.io/v1/organizations/search";
const APOLLO_PEOPLE_URL = "https://api.apollo.io/api/v1/mixed_people/api_search";
const BULK_ENRICH_URL = "https://api.apollo.io/v1/people/bulk_match";

// Daily lead generation limit per user
const DAILY_LEAD_LIMIT = 20;

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await requireAuth();
    const userId = session.user.id as string;

    const { prompt, filters, agentId } = await req.json();

    // Get today's date (date only, no time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check or create daily quota record for this user
    let quotaRecord = await prisma.dailyLeadQuota.findUnique({
      where: {
        userId_date: {
          userId: userId,
          date: today,
        },
      },
    });

    if (!quotaRecord) {
      quotaRecord = await prisma.dailyLeadQuota.create({
        data: {
          userId: userId,
          date: today,
          leadsGenerated: 0,
        },
      });
    }

    // Calculate remaining quota
    const remainingQuota = DAILY_LEAD_LIMIT - quotaRecord.leadsGenerated;

    if (remainingQuota <= 0) {
      return NextResponse.json(
        { 
          error: "Daily lead limit reached", 
          message: `You have reached your daily limit of ${DAILY_LEAD_LIMIT} leads. Please try again tomorrow.`,
          limit: DAILY_LEAD_LIMIT,
          used: quotaRecord.leadsGenerated,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // Get API keys from environment
    const apolloApiKey = process.env.APOLLO_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!apolloApiKey) {
      return NextResponse.json(
        { error: "Apollo API key not configured" },
        { status: 500 }
      );
    }

    // Use Gemini to determine optimal lead count, but cap it at remaining quota
    let targetLeadCount = 15;
    if (geminiApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        // Inform Gemini about the remaining quota
        const geminiPrompt = `Based on this lead generation request: "${prompt}"

User has ${remainingQuota} leads remaining in their daily quota of ${DAILY_LEAD_LIMIT}.

Analyze the specificity and requirements. Return ONLY a number between 1-${Math.min(18, remainingQuota)} indicating how many leads to fetch.
- If remaining quota is less than 15, use the remaining quota
- Otherwise, for more specific requests (exact titles, specific locations) = fewer leads (15-16)
- For broader requests (general industries, multiple criteria) = more leads (17-18), but never exceed ${remainingQuota}

Return only the number, nothing else.`;
        
        const result = await model.generateContent(geminiPrompt);
        const count = parseInt(result.response.text().trim());
        if (count >= 1 && count <= Math.min(18, remainingQuota)) {
          targetLeadCount = count;
          console.log(`Gemini determined target lead count: ${targetLeadCount} (remaining quota: ${remainingQuota})`);
        } else {
          targetLeadCount = Math.min(15, remainingQuota);
        }
      } catch (geminiError) {
        console.warn("Gemini analysis failed, using default count:", geminiError);
        targetLeadCount = Math.min(15, remainingQuota);
      }
    } else {
      // If no Gemini key, randomly vary between 15-18, but respect quota
      targetLeadCount = Math.min(Math.floor(Math.random() * 4) + 15, remainingQuota);
      targetLeadCount = Math.floor(Math.random() * 4) + 15;
      console.log(`No Gemini key, using random count: ${targetLeadCount}`);
    }

    const headers = {
      "accept": "application/json",
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apolloApiKey,
    };

    // Step 1: Search for organizations with comprehensive filters
    const orgFilters: any = {
      page: 1,
      per_page: Math.ceil(targetLeadCount * 1.5), // Get more orgs to ensure enough leads
    };

    // Add organization keyword tags (industries)
    if (filters.industryKeywords && filters.industryKeywords.length > 0) {
      orgFilters.q_organization_keyword_tags = filters.industryKeywords.slice(0, 10);
    }

    // Add organization locations
    if (filters.locations && filters.locations.length > 0) {
      orgFilters.organization_locations = filters.locations.slice(0, 10);
    }

    // Add company size if specified
    if (filters.companySize && filters.companySize.length > 0) {
      orgFilters.organization_num_employees_ranges = filters.companySize;
    }

    console.log("Step 1: Fetching organizations with filters:", JSON.stringify(orgFilters, null, 2));

    // Fetch organizations
    const orgResponse = await fetch(APOLLO_ORG_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(orgFilters),
    });

    if (!orgResponse.ok) {
      const errorText = await orgResponse.text();
      console.error("Apollo Organizations API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch organizations from Apollo", details: errorText },
        { status: orgResponse.status }
      );
    }

    const orgData = await orgResponse.json();
    const organizations = orgData.organizations || [];
    console.log(`Apollo returned ${organizations.length} organizations`);

    if (organizations.length === 0) {
      return NextResponse.json({
        leads: [],
        total: 0,
        message: "No organizations found matching your criteria",
      });
    }

    // Step 2: Search for people using the new API endpoint
    const organizationIds = organizations.map((org: any) => org.id).slice(0, 10);
    
    const peopleFilters: any = {
      organization_ids: organizationIds,
      page: 1,
      per_page: Math.max(25, targetLeadCount + 10), // Fetch extra to account for filtering
    };

    // Add person titles if specified
    if (filters.jobTitles && filters.jobTitles.length > 0) {
      peopleFilters.person_titles = filters.jobTitles.slice(0, 10);
      peopleFilters.include_similar_titles = true;
    } else {
      // Default to decision-maker seniorities
      peopleFilters.person_seniorities = ["owner", "founder", "c_suite", "vp", "head", "director", "manager"];
    }

    console.log("Step 2: Fetching people with filters:", JSON.stringify(peopleFilters, null, 2));

    const peopleResponse = await fetch(APOLLO_PEOPLE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(peopleFilters),
    });

    if (!peopleResponse.ok) {
      const errorText = await peopleResponse.text();
      console.error("Apollo People API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch people from Apollo", details: errorText },
        { status: peopleResponse.status }
      );
    }

    const peopleData = await peopleResponse.json();
    const people = peopleData.people || [];
    console.log(`Apollo returned ${people.length} people`);

    if (people.length === 0) {
      return NextResponse.json({
        leads: [],
        total: 0,
        organizationsFound: organizations.length,
        message: "No people found in these organizations",
      });
    }

    // Fetch existing leads to filter out duplicates BEFORE enrichment
    let existingIds = new Set<string>();
    if (agentId) {
      try {
        const existingAgent = await prisma.standaloneAgent.findUnique({
          where: { id: agentId },
          select: { data: true },
        });
        const existingData = existingAgent?.data as any;
        const existingLeadsArray = existingData?.leads || [];
        existingIds = new Set(existingLeadsArray.map((lead: any) => lead.id));
        console.log(`Found ${existingIds.size} existing leads to filter out`);
      } catch (error) {
        console.warn("Could not fetch existing leads:", error);
      }
    }

    // Filter people to only include those not already in our database
    const newPeople = people.filter((p: any) => !existingIds.has(p.id));
    console.log(`After filtering duplicates: ${newPeople.length} new people (filtered out ${people.length - newPeople.length} duplicates)`);

    if (newPeople.length === 0) {
      return NextResponse.json({
        leads: [],
        newLeadsCount: 0,
        duplicatesSkipped: people.length,
        total: existingIds.size,
        message: "All people were duplicates of existing leads",
      });
    }

    // Step 3: Bulk enrich people to get actual contact details (emails, phones)
    // The api_search endpoint only returns flags (has_email, has_phone) not actual values
    // Apollo bulk enrichment has a hard limit of 10 people per request
    // Process in batches of 10 to enrich all target leads
    const allPersonIds = newPeople.map((p: any) => p.id).filter(Boolean).slice(0, targetLeadCount);
    
    console.log(`Will enrich ${allPersonIds.length} people in batches of 10 (target: ${targetLeadCount})`);
    
    let enrichedPeople: any[] = [];
    
    if (allPersonIds.length > 0) {
      // Split into batches of 10
      const batchSize = 10;
      const batches: string[][] = [];
      for (let i = 0; i < allPersonIds.length; i += batchSize) {
        batches.push(allPersonIds.slice(i, i + batchSize));
      }
      
      console.log(`Step 3: Processing ${batches.length} batch(es) to enrich ${allPersonIds.length} people`);
      
      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Enriching batch ${batchIndex + 1}/${batches.length} with ${batch.length} people`);
        
        const enrichPayload = {
          details: batch.map((id: string) => ({ id })),
          reveal_personal_emails: true,
        };

        try {
          const enrichResponse = await fetch(BULK_ENRICH_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(enrichPayload),
          });

          if (enrichResponse.ok) {
            const enrichData = await enrichResponse.json();
            const batchEnriched = enrichData.matches || [];
            enrichedPeople.push(...batchEnriched);
            console.log(`Batch ${batchIndex + 1}: Enriched ${batchEnriched.length} people`);
          } else {
            const errorText = await enrichResponse.text();
            console.warn(`Batch ${batchIndex + 1} enrichment failed:`, errorText);
            // Use basic data for this batch
            const batchPeople = newPeople.filter((p: any) => batch.includes(p.id));
            enrichedPeople.push(...batchPeople);
          }
        } catch (enrichError) {
          console.warn(`Batch ${batchIndex + 1} enrichment error:`, enrichError);
          // Use basic data for this batch
          const batchPeople = newPeople.filter((p: any) => batch.includes(p.id));
          enrichedPeople.push(...batchPeople);
        }
        
        // Small delay between batches to avoid rate limiting
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log(`Total enriched: ${enrichedPeople.length} people across ${batches.length} batch(es)`);
    } else {
      enrichedPeople = newPeople.slice(0, targetLeadCount);
    }

    // Transform Apollo data to our format with unique IDs
    const leads = enrichedPeople.map((person: any, index: number) => ({
      id: person.id || index,
      uniqueId: `${person.id || index}-${Date.now()}-${index}`, // Ensure unique key for React
      companyName: person.organization?.name || person.employment_history?.[0]?.organization_name || "N/A",
      contactPerson: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim() || "N/A",
      location: person.city && person.state 
        ? `${person.city}, ${person.state}` 
        : person.city || person.state || person.country || "N/A",
      industry: person.organization?.industry || person.employment_history?.[0]?.organization_industry || "N/A",
      email: person.email || person.personal_emails?.[0] || (person.has_email ? "Available (requires enrichment)" : "N/A"),
      title: person.title || person.employment_history?.[0]?.title || "N/A",
      phone: person.phone_numbers?.[0] || person.mobile_phone || person.corporate_phone || (person.has_direct_phone ? "Available" : null),
      linkedinUrl: person.linkedin_url || null,
      companyWebsite: person.organization?.website_url || null,
      employeeCount: person.organization?.estimated_num_employees || null,
      seniority: person.seniority || null,
      departments: person.departments || [],
    }));

    // Save leads to database if agentId provided
    if (agentId && leads.length > 0) {
      try {
        // Fetch existing leads again to update with new ones
        const existingAgent = await prisma.standaloneAgent.findUnique({
          where: { id: agentId },
          select: { data: true },
        });

        const existingData = existingAgent?.data as any;
        const existingLeadsArray = existingData?.leads || [];
        
        const allLeads = [...existingLeadsArray, ...leads];

        await prisma.standaloneAgent.update({
          where: { id: agentId },
          data: {
            data: {
              generatedAt: new Date().toISOString(),
              lastPrompt: prompt,
              leads: allLeads,
              total: allLeads.length,
            },
          },
        });
        console.log(`Saved ${leads.length} new unique leads (total: ${allLeads.length}) to agent ${agentId}`);
        
        // Update daily quota - increment by the number of NEW leads generated
        await prisma.dailyLeadQuota.update({
          where: {
            userId_date: {
              userId: userId,
              date: today,
            },
          },
          data: {
            leadsGenerated: {
              increment: leads.length,
            },
          },
        });

        console.log(`Updated daily quota: ${quotaRecord.leadsGenerated} + ${leads.length} = ${quotaRecord.leadsGenerated + leads.length}/${DAILY_LEAD_LIMIT}`);
        
        // No need to filter leads again - they're already unique
      } catch (dbError) {
        console.warn("Failed to save leads to database:", dbError);
      }
    }

    // Calculate updated quota info
    const newQuotaUsed = quotaRecord.leadsGenerated + leads.length;
    const newRemainingQuota = DAILY_LEAD_LIMIT - newQuotaUsed;

    return NextResponse.json({
      leads,
      newLeadsCount: leads.length,
      total: peopleData.total_entries || leads.length,
      page: peopleFilters.page || 1,
      perPage: peopleFilters.per_page || 25,
      organizationsFound: organizations.length,
      enriched: enrichedPeople.length > 0 && enrichedPeople[0].email !== undefined,
      targetCount: targetLeadCount,
      quota: {
        limit: DAILY_LEAD_LIMIT,
        used: newQuotaUsed,
        remaining: newRemainingQuota,
      },
    });
  } catch (error) {
    console.error("Error generating leads:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}