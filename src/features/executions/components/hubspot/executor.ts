import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { hubspotChannel } from "@/inngest/channels/hubspot";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type HubSpotData = {
  variableName?: string;
  credentialId?: string;
  resource?: "contact" | "company" | "deal" | "ticket" | "conversation";
  operation?: string;
  
  // Contact fields
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string;
  
  // Company fields
  companyName?: string;
  domain?: string;
  
  // Deal fields
  dealName?: string;
  dealStage?: string;
  amount?: string;
  
  // Ticket fields
  subject?: string;
  content?: string;
  priority?: string;
  status?: string;
  category?: string;
  
  // Conversation fields
  conversationId?: string;
  
  // Common fields
  contactId?: string;
  companyId?: string;
  dealId?: string;
  ticketId?: string;
  
  // Additional properties
  customProperties?: string;
  
  // Pagination
  limit?: string;
  searchQuery?: string;
};

export const hubspotExecutor: NodeExecutor<HubSpotData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    hubspotChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.credentialId) {
    await publish(
      hubspotChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("HubSpot node: Credential is required");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-hubspot-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      hubspotChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("HubSpot node: Credential not found");
  }

  const hubspotToken = await decrypt(credential.value);

  if (!data.variableName) {
    await publish(
      hubspotChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("HubSpot node: Variable name is missing");
  }

  const resource = data.resource || "contact";
  const operation = data.operation || "upsert";

  // Build API request based on resource and operation
  const buildRequest = async () => {
    const headers = {
      "Authorization": `Bearer ${hubspotToken}`,
      "Content-Type": "application/json",
    };

    // CONTACT operations
    if (resource === "contact") {
      if (operation === "upsert") {
        const email = data.email ? Handlebars.compile(data.email)(context).trim() : "";
        
        if (!email) {
          throw new NonRetriableError("Email is required for contact upsert");
        }

        const properties: any = { email };
        
        if (data.firstname) {
          properties.firstname = Handlebars.compile(data.firstname)(context).trim();
        }
        if (data.lastname) {
          properties.lastname = Handlebars.compile(data.lastname)(context).trim();
        }
        if (data.phone) {
          properties.phone = Handlebars.compile(data.phone)(context).trim();
        }
        if (data.company) {
          properties.company = Handlebars.compile(data.company)(context).trim();
        }
        if (data.website) {
          properties.website = Handlebars.compile(data.website)(context).trim();
        }
        if (data.lifecyclestage) {
          properties.lifecyclestage = Handlebars.compile(data.lifecyclestage)(context).trim();
        }
        
        // Merge custom properties
        if (data.customProperties) {
          const compiledProps = Handlebars.compile(data.customProperties)(context);
          const additionalProps = JSON.parse(compiledProps);
          Object.assign(properties, additionalProps);
        }

        const requestBody = { properties };

        try {
          const res = await ky.post(
            `https://api.hubapi.com/crm/v3/objects/contacts`,
            {
              headers,
              json: requestBody,
              // HubSpot will return existing contact if email exists
            }
          );
          return await res.json();
        } catch (error: any) {
          // If contact exists, update it
          if (error.response?.status === 409) {
            try {
              const res = await ky.patch(
                `https://api.hubapi.com/crm/v3/objects/contacts/${email}?idProperty=email`,
                {
                  headers,
                  json: requestBody,
                }
              );
              return await res.json();
            } catch (updateError: any) {
              if (updateError.response) {
                const errorBody = await updateError.response.json();
                console.error("HubSpot API Error (update):", JSON.stringify(errorBody, null, 2));
                throw new Error(`HubSpot API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
              }
              throw updateError;
            }
          }
          
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("HubSpot API Error (create):", JSON.stringify(errorBody, null, 2));
            throw new Error(`HubSpot API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }

      if (operation === "get") {
        const contactId = data.contactId 
          ? Handlebars.compile(data.contactId)(context)
          : "";
        
        if (!contactId) {
          throw new NonRetriableError("Contact ID is required for get operation");
        }

        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
          { headers }
        );
        return await res.json();
      }

      if (operation === "getMany") {
        const limit = data.limit ? parseInt(Handlebars.compile(data.limit)(context)) : 100;
        
        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}`,
          { headers }
        );
        return await res.json();
      }

      if (operation === "delete") {
        const contactId = data.contactId 
          ? Handlebars.compile(data.contactId)(context)
          : "";
        
        if (!contactId) {
          throw new NonRetriableError("Contact ID is required for delete operation");
        }

        const res = await ky.delete(
          `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
          { headers }
        );
        return { success: true, id: contactId };
      }

      if (operation === "search") {
        const searchQuery = data.searchQuery
          ? Handlebars.compile(data.searchQuery)(context)
          : "";

        const requestBody = {
          filterGroups: searchQuery ? [{
            filters: [{
              propertyName: "email",
              operator: "CONTAINS_TOKEN",
              value: searchQuery
            }]
          }] : [],
          limit: data.limit ? parseInt(Handlebars.compile(data.limit)(context)) : 100
        };

        try {
          const res = await ky.post(
            `https://api.hubapi.com/crm/v3/objects/contacts/search`,
            {
              headers,
              json: requestBody,
            }
          );
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("HubSpot API Error (search):", JSON.stringify(errorBody, null, 2));
            throw new Error(`HubSpot API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
    }

    // COMPANY operations
    if (resource === "company") {
      if (operation === "create") {
        const companyName = data.companyName 
          ? Handlebars.compile(data.companyName)(context)
          : "";
        
        if (!companyName) {
          throw new NonRetriableError("Company name is required");
        }

        const properties: any = { name: companyName };
        
        if (data.domain) {
          properties.domain = Handlebars.compile(data.domain)(context);
        }
        
        // Merge custom properties
        if (data.customProperties) {
          const compiledProps = Handlebars.compile(data.customProperties)(context);
          const additionalProps = JSON.parse(compiledProps);
          Object.assign(properties, additionalProps);
        }

        const requestBody = { properties };

        try {
          const res = await ky.post(
            `https://api.hubapi.com/crm/v3/objects/companies`,
            {
              headers,
              json: requestBody,
            }
          );
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("HubSpot API Error (company create):", JSON.stringify(errorBody, null, 2));
            throw new Error(`HubSpot API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }

      if (operation === "get") {
        const companyId = data.companyId 
          ? Handlebars.compile(data.companyId)(context)
          : "";
        
        if (!companyId) {
          throw new NonRetriableError("Company ID is required for get operation");
        }

        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/companies/${companyId}`,
          { headers }
        );
        return await res.json();
      }

      if (operation === "getMany") {
        const limit = data.limit ? parseInt(Handlebars.compile(data.limit)(context)) : 100;
        
        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/companies?limit=${limit}`,
          { headers }
        );
        return await res.json();
      }

      if (operation === "searchByDomain") {
        const domain = data.domain 
          ? Handlebars.compile(data.domain)(context)
          : "";
        
        if (!domain) {
          throw new NonRetriableError("Domain is required for search by domain");
        }

        try {
          const res = await ky.post(
            `https://api.hubapi.com/companies/v2/domains/${domain}/companies`,
            { headers }
          );
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("HubSpot API Error (search by domain):", JSON.stringify(errorBody, null, 2));
            throw new Error(`HubSpot API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
    }

    // DEAL operations
    if (resource === "deal") {
      if (operation === "create") {
        const dealName = data.dealName 
          ? Handlebars.compile(data.dealName)(context)
          : "";
        
        if (!dealName) {
          throw new NonRetriableError("Deal name is required");
        }

        const properties: any = { dealname: dealName };
        
        if (data.dealStage) {
          properties.dealstage = Handlebars.compile(data.dealStage)(context);
        }
        if (data.amount) {
          properties.amount = Handlebars.compile(data.amount)(context);
        }
        
        // Merge custom properties
        if (data.customProperties) {
          const compiledProps = Handlebars.compile(data.customProperties)(context);
          const additionalProps = JSON.parse(compiledProps);
          Object.assign(properties, additionalProps);
        }

        const requestBody = { properties };

        try {
          const res = await ky.post(
            `https://api.hubapi.com/crm/v3/objects/deals`,
            {
              headers,
              json: requestBody,
            }
          );
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("HubSpot API Error (deal create):", JSON.stringify(errorBody, null, 2));
            throw new Error(`HubSpot API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }

      if (operation === "get") {
        const dealId = data.dealId 
          ? Handlebars.compile(data.dealId)(context)
          : "";
        
        if (!dealId) {
          throw new NonRetriableError("Deal ID is required for get operation");
        }

        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
          { headers }
        );
        return await res.json();
      }

      if (operation === "getMany") {
        const limit = data.limit ? parseInt(Handlebars.compile(data.limit)(context)) : 100;
        
        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/deals?limit=${limit}`,
          { headers }
        );
        return await res.json();
      }
    }

    // TICKET operations
    if (resource === "ticket") {
      if (operation === "create") {
        const subject = data.subject 
          ? Handlebars.compile(data.subject)(context)
          : "";
        
        if (!subject) {
          throw new NonRetriableError("Ticket subject is required");
        }

        const properties: any = { 
          subject,
          hs_pipeline: "0",
          hs_pipeline_stage: "1"
        };
        
        if (data.content) {
          properties.content = Handlebars.compile(data.content)(context);
        }
        if (data.priority) {
          properties.hs_ticket_priority = Handlebars.compile(data.priority)(context);
        }
        if (data.status) {
          properties.hs_pipeline_stage = Handlebars.compile(data.status)(context);
        }
        if (data.category) {
          properties.hs_ticket_category = Handlebars.compile(data.category)(context);
        }
        
        // Merge custom properties
        if (data.customProperties) {
          const compiledProps = Handlebars.compile(data.customProperties)(context);
          const additionalProps = JSON.parse(compiledProps);
          Object.assign(properties, additionalProps);
        }

        const requestBody = { properties };

        try {
          const res = await ky.post(
            `https://api.hubapi.com/crm/v3/objects/tickets`,
            {
              headers,
              json: requestBody,
            }
          );
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("HubSpot API Error (ticket create):", JSON.stringify(errorBody, null, 2));
            throw new Error(`HubSpot API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }

      if (operation === "get") {
        const ticketId = data.ticketId 
          ? Handlebars.compile(data.ticketId)(context)
          : "";
        
        if (!ticketId) {
          throw new NonRetriableError("Ticket ID is required for get operation");
        }

        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/tickets/${ticketId}`,
          { headers }
        );
        return await res.json();
      }

      if (operation === "getMany") {
        const limit = data.limit ? parseInt(Handlebars.compile(data.limit)(context)) : 100;
        
        const res = await ky.get(
          `https://api.hubapi.com/crm/v3/objects/tickets?limit=${limit}`,
          { headers }
        );
        return await res.json();
      }
    }

    // CONVERSATION operations
    if (resource === "conversation") {
      if (operation === "get") {
        const conversationId = data.conversationId 
          ? Handlebars.compile(data.conversationId)(context)
          : "";
        
        if (!conversationId) {
          throw new NonRetriableError("Conversation ID is required for get operation");
        }

        const res = await ky.get(
          `https://api.hubapi.com/conversations/v3/conversations/threads/${conversationId}`,
          { headers }
        );
        return await res.json();
      }

      if (operation === "getMany") {
        const limit = data.limit ? parseInt(Handlebars.compile(data.limit)(context)) : 100;
        
        const res = await ky.get(
          `https://api.hubapi.com/conversations/v3/conversations/threads?limit=${limit}`,
          { headers }
        );
        return await res.json();
      }
    }

    throw new NonRetriableError(
      `HubSpot node: Unsupported resource/operation: ${resource}/${operation}`
    );
  };

  try {
    const result = await step.run(`hubspot-${resource}-${operation}`, buildRequest);

    await publish(
      hubspotChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return {
      ...context,
      [data.variableName]: result,
    };
  } catch (error) {
    await publish(
      hubspotChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
