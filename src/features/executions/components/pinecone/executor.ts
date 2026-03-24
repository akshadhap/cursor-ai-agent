import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { pineconeChannel } from "@/inngest/channels/pinecone";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(jsonString);
});

const CONTROL_PLANE_BASE = "https://api.pinecone.io";
const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const GEMINI_EMBEDDINGS_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type PineconeData = {
    variableName?: string;
    credentialId?: string;
    resource?: "vector" | "index";
    operation?: string;
    indexName?: string;
    indexHost?: string;
    namespace?: string;
    vectorId?: string;
    vectorIds?: string;
    values?: string;
    metadata?: string;
    topK?: number | string;
    queryVector?: string;
    filter?: string;
    includeMetadata?: boolean | string;
    includeValues?: boolean | string;
    // Embedding settings
    enableEmbedding?: boolean;
    embeddingModel?: string;
    embeddingCredentialId?: string;
    textToEmbed?: string;
    // Reranking settings
    enableReranking?: boolean;
    rerankModel?: string;
    rerankCredentialId?: string;
    rerankTopN?: string;
};

// Generate embeddings using OpenAI
async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
    const response = await ky.post(OPENAI_EMBEDDINGS_URL, {
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        json: {
            input: text,
            model: "text-embedding-3-small",
        },
    });
    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
}

// Generate embeddings using Gemini
async function generateGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
    const url = `${GEMINI_EMBEDDINGS_BASE}/text-embedding-004:embedContent?key=${apiKey}`;
    const response = await ky.post(url, {
        headers: { "Content-Type": "application/json" },
        json: {
            content: { parts: [{ text }] },
        },
    });
    const data = await response.json() as { embedding: { values: number[] } };
    return data.embedding.values;
}

export const pineconeExecutor: NodeExecutor<PineconeData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
    userId,
}) => {
    await publish(pineconeChannel().status({ nodeId, status: "loading" }));

    if (!data.credentialId) {
        await publish(pineconeChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Pinecone node: Credential is required");
    }

    const credential = await step.run("fetch-pinecone-credential", async () => {
        return prisma.credential.findFirst({
            where: { id: data.credentialId, userId },
        });
    });

    if (!credential) {
        await publish(pineconeChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Pinecone node: Credential not found");
    }

    const apiKey = await decrypt(credential.value);

    if (!data.variableName) {
        await publish(pineconeChannel().status({ nodeId, status: "error" }));
        throw new NonRetriableError("Pinecone node: Variable name is missing");
    }

    const resource = data.resource || "vector";
    const operation = data.operation || "query";

    const template = (value?: string) => {
        if (!value) return "";
        try {
            return Handlebars.compile(value)(context);
        } catch {
            return value;
        }
    };

    const safeParseJson = <T>(value: string | undefined, defaultValue: T): T => {
        if (!value || !value.trim()) return defaultValue;
        try {
            return JSON.parse(value);
        } catch (err) {
            const error = err as Error;
            const preview = value.length > 100 ? value.substring(0, 100) + "..." : value;
            throw new NonRetriableError(`Invalid JSON (${error.message}). Value preview: ${preview}`);
        }
    };

    // Generate embedding if enabled
    const generateEmbedding = async (): Promise<number[] | null> => {
        if (!data.enableEmbedding) return null;

        const textToEmbed = template(data.textToEmbed);
        if (!textToEmbed) {
            throw new NonRetriableError("Pinecone: Text to embed is required when embedding is enabled");
        }

        if (!data.embeddingCredentialId) {
            throw new NonRetriableError("Pinecone: Embedding credential is required");
        }

        const embeddingCredential = await step.run("fetch-embedding-credential", async () => {
            return prisma.credential.findFirst({
                where: { id: data.embeddingCredentialId, userId },
            });
        });

        if (!embeddingCredential) {
            throw new NonRetriableError("Pinecone: Embedding credential not found");
        }

        const embeddingApiKey = await decrypt(embeddingCredential.value);

        if (data.embeddingModel === "openai") {
            return await step.run("generate-openai-embedding", async () => {
                return generateOpenAIEmbedding(textToEmbed, embeddingApiKey);
            });
        } else if (data.embeddingModel === "gemini") {
            return await step.run("generate-gemini-embedding", async () => {
                return generateGeminiEmbedding(textToEmbed, embeddingApiKey);
            });
        }

        return null;
    };

    const buildRequest = async () => {
        const headers = {
            "Api-Key": apiKey,
            "Content-Type": "application/json",
        };

        // INDEX OPERATIONS
        if (resource === "index") {
            if (operation === "list") {
                const res = await ky.get(`${CONTROL_PLANE_BASE}/indexes`, { headers });
                return await res.json();
            }
            if (operation === "get") {
                const indexName = template(data.indexName);
                if (!indexName) throw new NonRetriableError("Pinecone: index name is required");
                const res = await ky.get(`${CONTROL_PLANE_BASE}/indexes/${indexName}`, { headers });
                return await res.json();
            }
        }

        // VECTOR OPERATIONS
        if (resource === "vector") {
            const indexHost = template(data.indexHost);
            if (!indexHost) throw new NonRetriableError("Pinecone: index host is required");

            const hostUrl = indexHost.startsWith("http") ? indexHost : `https://${indexHost}`;
            const namespace = template(data.namespace) || "";

            // UPSERT
            if (operation === "upsert") {
                const vectorId = template(data.vectorId);
                const metadata = template(data.metadata);

                if (!vectorId) throw new NonRetriableError("Pinecone: vector ID is required for upsert");

                // Get vector values - either from embedding or manual input
                let vectorValues: number[];
                const embedding = await generateEmbedding();

                if (embedding) {
                    vectorValues = embedding;
                } else {
                    const values = template(data.values);
                    if (!values) throw new NonRetriableError("Pinecone: vector values required for upsert");
                    vectorValues = safeParseJson<number[]>(values, []);
                }

                const metadataObj = safeParseJson<Record<string, unknown>>(metadata, {});

                const res = await ky.post(`${hostUrl}/vectors/upsert`, {
                    headers,
                    json: {
                        vectors: [{
                            id: vectorId,
                            values: vectorValues,
                            metadata: Object.keys(metadataObj).length > 0 ? metadataObj : undefined,
                        }],
                        namespace: namespace || undefined,
                    },
                });
                return await res.json();
            }

            // QUERY
            if (operation === "query") {
                const filter = template(data.filter);

                // Get query vector
                let vectorValues: number[];
                const embedding = await generateEmbedding();

                if (embedding) {
                    vectorValues = embedding;
                } else {
                    const queryVector = template(data.queryVector);
                    if (!queryVector) throw new NonRetriableError("Pinecone: query vector is required");
                    vectorValues = safeParseJson<number[]>(queryVector, []);
                }

                const filterObj = filter ? safeParseJson<Record<string, unknown>>(filter, {}) : undefined;
                const topK = typeof data.topK === "string" ? parseInt(data.topK, 10) : (data.topK || 10);
                const includeMetadata = data.includeMetadata === true || data.includeMetadata === "true";
                const includeValues = data.includeValues === true || data.includeValues === "true";

                const res = await ky.post(`${hostUrl}/query`, {
                    headers,
                    json: {
                        vector: vectorValues,
                        topK,
                        namespace: namespace || undefined,
                        filter: filterObj && Object.keys(filterObj).length > 0 ? filterObj : undefined,
                        includeMetadata: includeMetadata,
                        includeValues: includeValues,
                    },
                });

                let result = await res.json() as { matches?: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> };

                // RERANKING (if enabled)
                if (data.enableReranking && result.matches && result.matches.length > 0) {
                    // Note: Reranking requires Cohere API - placeholder for now
                    // In production, you would call Cohere's rerank API here
                    const rerankTopN = parseInt(data.rerankTopN || "5", 10);
                    result.matches = result.matches.slice(0, rerankTopN);
                    // TODO: Implement actual Cohere rerank API call
                }

                return result;
            }

            // FETCH
            if (operation === "fetch") {
                const vectorIds = template(data.vectorIds);
                if (!vectorIds) throw new NonRetriableError("Pinecone: vector IDs required for fetch");

                const ids = vectorIds.split(",").map((id) => id.trim()).filter(Boolean);
                const params = new URLSearchParams();
                ids.forEach((id) => params.append("ids", id));
                if (namespace) params.append("namespace", namespace);

                const res = await ky.get(`${hostUrl}/vectors/fetch?${params.toString()}`, { headers });
                return await res.json();
            }

            // UPDATE
            if (operation === "update") {
                const vectorId = template(data.vectorId);
                const values = template(data.values);
                const metadata = template(data.metadata);

                if (!vectorId) throw new NonRetriableError("Pinecone: vector ID required for update");

                const updateBody: Record<string, unknown> = {
                    id: vectorId,
                    namespace: namespace || undefined,
                };

                if (values && values.trim()) {
                    updateBody.values = safeParseJson<number[]>(values, []);
                }
                if (metadata && metadata.trim()) {
                    updateBody.setMetadata = safeParseJson<Record<string, unknown>>(metadata, {});
                }

                const res = await ky.post(`${hostUrl}/vectors/update`, { headers, json: updateBody });
                return await res.json();
            }

            // DELETE
            if (operation === "delete") {
                const vectorIds = template(data.vectorIds);
                const filter = template(data.filter);

                const deleteBody: Record<string, unknown> = { namespace: namespace || undefined };

                if (vectorIds && vectorIds.trim()) {
                    deleteBody.ids = vectorIds.split(",").map((id) => id.trim()).filter(Boolean);
                } else if (filter && filter.trim()) {
                    deleteBody.filter = safeParseJson<Record<string, unknown>>(filter, {});
                } else {
                    throw new NonRetriableError("Pinecone: vector IDs or filter required for delete");
                }

                const res = await ky.post(`${hostUrl}/vectors/delete`, { headers, json: deleteBody });
                return await res.json();
            }

            // DESCRIBE STATS
            if (operation === "describeStats") {
                const filter = template(data.filter);
                const filterObj = filter ? safeParseJson<Record<string, unknown>>(filter, {}) : undefined;

                const res = await ky.post(`${hostUrl}/describe_index_stats`, {
                    headers,
                    json: filterObj && Object.keys(filterObj).length > 0 ? { filter: filterObj } : {},
                });
                return await res.json();
            }
        }

        throw new NonRetriableError(`Pinecone: Unsupported: ${resource}/${operation}`);
    };

    try {
        const result = await step.run(`pinecone-${resource}-${operation}`, buildRequest);
        await publish(pineconeChannel().status({ nodeId, status: "success" }));
        return { ...context, [data.variableName]: result };
    } catch (error) {
        await publish(pineconeChannel().status({ nodeId, status: "error" }));
        throw error;
    }
};
