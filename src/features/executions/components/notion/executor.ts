import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { notionChannel } from "@/inngest/channels/notion";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type NotionData = {
  variableName?: string;
  credentialId?: string;
  resource?: "database" | "databasePage" | "page" | "block";
  operation?: string;
  databaseId?: string;
  searchQuery?: string;
  pageId?: string;
  parentPageId?: string;
  blockId?: string;
  title?: string;
  content?: string;
  properties?: string;
  filter?: string;
  blockContent?: string;
  blockType?: string;
};

export const notionExecutor: NodeExecutor<NotionData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    notionChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  if (!data.credentialId) {
    await publish(
      notionChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Notion node: Credential is required");
  }

  // Fetch the credential from the database
  const credential = await step.run("fetch-notion-credential", async () => {
    return prisma.credential.findFirst({
      where: {
        id: data.credentialId,
        userId,
      },
    });
  });

  if (!credential) {
    await publish(
      notionChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Notion node: Credential not found");
  }

  const notionToken = await decrypt(credential.value);

  if (!data.variableName) {
    await publish(
      notionChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw new NonRetriableError("Notion node: Variable name is missing");
  }

  const resource = data.resource || "databasePage";
  const operation = data.operation || "create";

  // Normalize Notion ID to UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const normalizeId = (id?: string) => {
    if (!id) return id;
    // Remove all dashes first
    const clean = id.replace(/-/g, "");
    // If it's 32 characters, add dashes in UUID format
    if (clean.length === 32) {
      return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
    }
    // Return as-is if already formatted or invalid length
    return id;
  };

  // Build API request based on resource and operation
  const buildRequest = async () => {
    const headers = {
      "Authorization": `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2025-09-03",
    };

    // Compile Handlebars templates for IDs before normalizing
    const compiledDatabaseId = data.databaseId 
      ? Handlebars.compile(data.databaseId)(context) 
      : undefined;
    const compiledPageId = data.pageId 
      ? Handlebars.compile(data.pageId)(context) 
      : undefined;
    const compiledBlockId = data.blockId 
      ? Handlebars.compile(data.blockId)(context) 
      : undefined;
    const compiledParentPageId = data.parentPageId 
      ? Handlebars.compile(data.parentPageId)(context) 
      : undefined;

    const databaseId = normalizeId(compiledDatabaseId);
    const pageId = normalizeId(compiledPageId);
    const blockId = normalizeId(compiledBlockId);
    const parentPageId = normalizeId(compiledParentPageId);

    // DATABASE operations
    if (resource === "database") {
      if (operation === "get") {
        const res = await ky.get(
          `https://api.notion.com/v1/databases/${databaseId}`,
          { headers }
        );
        return await res.json();
      }
      if (operation === "getMany") {
        try {
          const res = await ky.post("https://api.notion.com/v1/search", {
            headers,
            json: {
              filter: { value: "data_source", property: "object" },
              page_size: 100,
            },
          });
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("Notion API Error (database getMany):", JSON.stringify(errorBody, null, 2));
            throw new Error(`Notion API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
      if (operation === "search") {
        const searchQuery = data.searchQuery
          ? Handlebars.compile(data.searchQuery)(context)
          : "";
        try {
          const res = await ky.post("https://api.notion.com/v1/search", {
            headers,
            json: {
              query: searchQuery,
              filter: { value: "data_source", property: "object" },
              page_size: 100,
            },
          });
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("Notion API Error (database search):", JSON.stringify(errorBody, null, 2));
            throw new Error(`Notion API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
    }

    // DATABASE PAGE operations
    if (resource === "databasePage") {
      if (operation === "create") {
        const compiledTitle = data.title
          ? Handlebars.compile(data.title)(context)
          : "Untitled";
        const compiledContent = data.content
          ? Handlebars.compile(data.content)(context)
          : "";
        
        // Start with title property using the database's default title column name
        let properties: any = {
          Name: {
            title: [{ text: { content: compiledTitle } }],
          },
        };
        
        // Merge in additional properties if provided
        if (data.properties) {
          const compiledProps = Handlebars.compile(data.properties)(context);
          const additionalProps = JSON.parse(compiledProps);
          
          // Clean up date properties with empty strings
          Object.keys(additionalProps).forEach(key => {
            const prop = additionalProps[key];
            // If it's a date property with an empty start date, remove it
            if (prop.date && prop.date.start === "") {
              delete additionalProps[key];
            }
          });
          
          // Merge, allowing properties JSON to override the Name if it includes it
          properties = { ...properties, ...additionalProps };
        }

        const requestBody = {
          parent: { database_id: databaseId },
          properties,
          ...(compiledContent ? {
            children: [
              {
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ type: "text", text: { content: compiledContent } }],
                },
              },
            ]
          } : {}),
        };

        console.log("Creating Notion page with:", JSON.stringify(requestBody, null, 2));

        try {
          const res = await ky.post("https://api.notion.com/v1/pages", {
            headers,
            json: requestBody,
          });
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("Notion API Error:", JSON.stringify(errorBody, null, 2));
            throw new Error(`Notion API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
      if (operation === "get") {
        const res = await ky.get(
          `https://api.notion.com/v1/pages/${pageId}`,
          { headers }
        );
        return await res.json();
      }
      if (operation === "update") {
        const properties = data.properties
          ? JSON.parse(Handlebars.compile(data.properties)(context))
          : {};
        const res = await ky.patch(
          `https://api.notion.com/v1/pages/${pageId}`,
          {
            headers,
            json: { properties },
          }
        );
        return await res.json();
      }
      if (operation === "getMany") {
        if (!databaseId) {
          throw new Error("Database ID is required for getMany operation");
        }
        
        let queryBody: any = {};
        
        // Add filter if provided
        if (data.filter) {
          try {
            const compiledFilter = Handlebars.compile(data.filter)(context);
            queryBody.filter = JSON.parse(compiledFilter);
          } catch (e) {
            console.warn("Failed to parse filter, ignoring:", e);
          }
        }
        
        try {
          const res = await ky.post(
            `https://api.notion.com/v1/databases/${databaseId}/query`,
            { 
              headers,
              json: queryBody
            }
          );
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("Notion API Error (getMany):", JSON.stringify(errorBody, null, 2));
            throw new Error(`Notion API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
    }

    // PAGE operations
    if (resource === "page") {
      if (operation === "create") {
        const compiledTitle = data.title
          ? Handlebars.compile(data.title)(context)
          : "Untitled";
        const compiledContent = data.content
          ? Handlebars.compile(data.content)(context)
          : "";

        const requestBody = {
          parent: { page_id: parentPageId || pageId },
          properties: {
            title: {
              title: [{ text: { content: compiledTitle } }],
            },
          },
          children: compiledContent
            ? [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [{ type: "text", text: { content: compiledContent } }],
                  },
                },
              ]
            : [],
        };

        console.log("Creating standalone page with:", JSON.stringify(requestBody, null, 2));

        try {
          const res = await ky.post("https://api.notion.com/v1/pages", {
            headers,
            json: requestBody,
          });
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("Notion API Error (page create):", JSON.stringify(errorBody, null, 2));
            throw new Error(`Notion API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
      if (operation === "archive") {
        const res = await ky.patch(
          `https://api.notion.com/v1/pages/${pageId}`,
          {
            headers,
            json: { archived: true },
          }
        );
        return await res.json();
      }
      if (operation === "search") {
        const searchQuery = data.searchQuery
          ? Handlebars.compile(data.searchQuery)(context)
          : "";
        try {
          const res = await ky.post("https://api.notion.com/v1/search", {
            headers,
            json: {
              query: searchQuery,
              filter: { value: "page", property: "object" },
              page_size: 100,
            },
          });
          return await res.json();
        } catch (error: any) {
          if (error.response) {
            const errorBody = await error.response.json();
            console.error("Notion API Error (page search):", JSON.stringify(errorBody, null, 2));
            throw new Error(`Notion API Error: ${errorBody.message || JSON.stringify(errorBody)}`);
          }
          throw error;
        }
      }
    }

    // BLOCK operations
    if (resource === "block") {
      if (operation === "append") {
        const compiledContent = data.blockContent
          ? Handlebars.compile(data.blockContent)(context)
          : "";

        const res = await ky.patch(
          `https://api.notion.com/v1/blocks/${pageId}/children`,
          {
            headers,
            json: {
              children: [
                {
                  object: "block",
                  type: data.blockType || "paragraph",
                  [data.blockType || "paragraph"]: {
                    rich_text: [{ type: "text", text: { content: compiledContent } }],
                  },
                },
              ],
            },
          }
        );
        return await res.json();
      }
      if (operation === "getChildren") {
        const res = await ky.get(
          `https://api.notion.com/v1/blocks/${pageId}/children`,
          { headers }
        );
        return await res.json();
      }
    }

    throw new NonRetriableError(
      `Notion node: Unsupported resource/operation: ${resource}/${operation}`
    );
  };

  try {
    const result = await step.run(`notion-${resource}-${operation}`, buildRequest);

    await publish(
      notionChannel().status({
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
      notionChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
