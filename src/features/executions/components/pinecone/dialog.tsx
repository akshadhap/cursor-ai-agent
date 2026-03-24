"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import { useTheme } from "next-themes";
import Image from "next/image";

const pineconeFormSchema = z.object({
    variableName: z.string().min(1, "Variable name is required"),
    credentialId: z.string().min(1, "Credential is required"),
    resource: z.enum(["vector", "index"]),
    operation: z.string().min(1, "Operation is required"),
    // Index configuration
    indexName: z.string().optional(),
    indexHost: z.string().optional(),
    namespace: z.string().optional(),
    // Vector operations
    vectorId: z.string().optional(),
    vectorIds: z.string().optional(),
    values: z.string().optional(),
    metadata: z.string().optional(),
    topK: z.string().optional(),
    queryVector: z.string().optional(),
    filter: z.string().optional(),
    includeMetadata: z.string().optional(),
    includeValues: z.string().optional(),
    // Embedding settings
    enableEmbedding: z.boolean().optional(),
    embeddingModel: z.string().optional(),
    embeddingCredentialId: z.string().optional(),
    textToEmbed: z.string().optional(),
    // Reranking settings
    enableReranking: z.boolean().optional(),
    rerankModel: z.string().optional(),
    rerankCredentialId: z.string().optional(),
    rerankTopN: z.string().optional(),
});

export type PineconeFormValues = z.infer<typeof pineconeFormSchema>;

type PineconeDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: PineconeFormValues) => void;
    defaultValues?: Partial<PineconeFormValues>;
};

export const PineconeDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
}: PineconeDialogProps) => {
    const { data: pineconeCredentials, isLoading: isLoadingPinecone } = useCredentialsByType(CredentialType.PINECONE);
    const { data: openaiCredentials } = useCredentialsByType(CredentialType.OPENAI);
    const { data: geminiCredentials } = useCredentialsByType(CredentialType.GEMINI);

    const { theme, systemTheme } = useTheme();
    const currentTheme = theme === "system" ? systemTheme : theme;

    const form = useForm<PineconeFormValues>({
        resolver: zodResolver(pineconeFormSchema),
        defaultValues: {
            variableName: defaultValues?.variableName || "pineconeResult",
            credentialId: defaultValues?.credentialId || "",
            resource: defaultValues?.resource || "vector",
            operation: defaultValues?.operation || "query",
            indexName: defaultValues?.indexName || "",
            indexHost: defaultValues?.indexHost || "",
            namespace: defaultValues?.namespace || "",
            vectorId: defaultValues?.vectorId || "",
            vectorIds: defaultValues?.vectorIds || "",
            values: defaultValues?.values || "",
            metadata: defaultValues?.metadata || "",
            topK: defaultValues?.topK || "10",
            queryVector: defaultValues?.queryVector || "",
            filter: defaultValues?.filter || "",
            includeMetadata: defaultValues?.includeMetadata || "true",
            includeValues: defaultValues?.includeValues || "false",
            // Embedding
            enableEmbedding: defaultValues?.enableEmbedding || false,
            embeddingModel: defaultValues?.embeddingModel || "openai",
            embeddingCredentialId: defaultValues?.embeddingCredentialId || "",
            textToEmbed: defaultValues?.textToEmbed || "",
            // Reranking
            enableReranking: defaultValues?.enableReranking || false,
            rerankModel: defaultValues?.rerankModel || "cohere",
            rerankCredentialId: defaultValues?.rerankCredentialId || "",
            rerankTopN: defaultValues?.rerankTopN || "5",
        },
    });

    const resource = form.watch("resource");
    const operation = form.watch("operation");
    const enableEmbedding = form.watch("enableEmbedding");
    const embeddingModel = form.watch("embeddingModel");
    const enableReranking = form.watch("enableReranking");

    // Get embedding credentials based on selected model
    const getEmbeddingCredentials = () => {
        if (embeddingModel === "openai") return openaiCredentials;
        if (embeddingModel === "gemini") return geminiCredentials;
        return [];
    };

    // Operations that support embedding
    const supportsEmbedding = resource === "vector" && ["upsert", "query"].includes(operation);
    // Operations that support reranking
    const supportsReranking = resource === "vector" && operation === "query";

    const getOperations = () => {
        const operations: Record<string, { value: string; label: string }[]> = {
            vector: [
                { value: "upsert", label: "Upsert" },
                { value: "query", label: "Query" },
                { value: "fetch", label: "Fetch" },
                { value: "update", label: "Update" },
                { value: "delete", label: "Delete" },
                { value: "describeStats", label: "Describe Stats" },
            ],
            index: [
                { value: "list", label: "List" },
                { value: "get", label: "Get" },
            ],
        };
        return operations[resource] || [];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Pinecone Node</DialogTitle>
                    <DialogDescription>
                        Store and query vector embeddings for AI applications
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="pineconeResult" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="credentialId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Pinecone Credential</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Pinecone credential" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {isLoadingPinecone ? (
                                                <SelectItem value="loading" disabled>Loading...</SelectItem>
                                            ) : pineconeCredentials && pineconeCredentials.length > 0 ? (
                                                pineconeCredentials.map((credential) => (
                                                    <SelectItem key={credential.id} value={credential.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Image
                                                                src={currentTheme === "dark" ? "/logos/pinecone-white.svg" : "/logos/pinecone.svg"}
                                                                alt="Pinecone"
                                                                width={16}
                                                                height={16}
                                                            />
                                                            {credential.name}
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>No credentials found</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="resource"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Resource</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a resource" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="vector">Vector</SelectItem>
                                                <SelectItem value="index">Index</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="operation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Operation</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select operation" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {getOperations().map((op) => (
                                                    <SelectItem key={op.value} value={op.value}>
                                                        {op.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Index Host */}
                        {resource === "vector" && (
                            <FormField
                                control={form.control}
                                name="indexHost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Index Host</FormLabel>
                                        <FormControl>
                                            <Input placeholder="my-index-abc123.svc.pinecone.io" {...field} />
                                        </FormControl>
                                        <FormDescription>From Pinecone Console → Indexes</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Namespace */}
                        {resource === "vector" && (
                            <FormField
                                control={form.control}
                                name="namespace"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Namespace (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="default" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* ==================== EMBEDDING TOGGLE ==================== */}
                        {supportsEmbedding && (
                            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="enableEmbedding"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between">
                                            <div className="space-y-0.5">
                                                <FormLabel>Auto Embedding</FormLabel>
                                                <FormDescription>
                                                    Generate embeddings automatically from text
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {enableEmbedding && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="embeddingModel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Embedding Model</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select model" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="openai">
                                                                <div className="flex items-center gap-2">
                                                                    <Image src="/logos/openai.svg" alt="OpenAI" width={16} height={16} />
                                                                    OpenAI (text-embedding-3-small)
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="gemini">
                                                                <div className="flex items-center gap-2">
                                                                    <Image src="/logos/gemini.svg" alt="Gemini" width={16} height={16} />
                                                                    Gemini (text-embedding-004)
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="embeddingCredentialId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{embeddingModel === "openai" ? "OpenAI" : "Gemini"} Credential</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select credential" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {getEmbeddingCredentials()?.map((credential) => (
                                                                <SelectItem key={credential.id} value={credential.id}>
                                                                    {credential.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="textToEmbed"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{operation === "upsert" ? "Document Text" : "Query Text"}</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder={operation === "upsert" ? "Text to embed and store..." : "Search query text..."}
                                                            className="min-h-[80px]"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Supports {"{{handlebars}}"} templates
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {/* ==================== RERANKING TOGGLE ==================== */}
                        {supportsReranking && (
                            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                                <FormField
                                    control={form.control}
                                    name="enableReranking"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between">
                                            <div className="space-y-0.5">
                                                <FormLabel>Reranking</FormLabel>
                                                <FormDescription>
                                                    Re-order results using a reranker model
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                {enableReranking && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="rerankModel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Rerank Model</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select reranker" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="cohere">Cohere Rerank</SelectItem>
                                                            <SelectItem value="pinecone">Pinecone Rerank (coming soon)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="rerankTopN"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Top N Results After Reranking</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={1} max={100} placeholder="5" {...field} />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Number of results to return after reranking
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {/* Index Name - for index get */}
                        {resource === "index" && operation === "get" && (
                            <FormField
                                control={form.control}
                                name="indexName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Index Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="my-index" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Vector ID - for upsert/update */}
                        {resource === "vector" && ["upsert", "update"].includes(operation) && (
                            <FormField
                                control={form.control}
                                name="vectorId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vector ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="vec-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Vector IDs - for fetch/delete */}
                        {resource === "vector" && ["fetch", "delete"].includes(operation) && (
                            <FormField
                                control={form.control}
                                name="vectorIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vector IDs</FormLabel>
                                        <FormControl>
                                            <Input placeholder="vec-001, vec-002" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Vector Values - only show if embedding is disabled */}
                        {resource === "vector" && ["upsert", "update"].includes(operation) && !enableEmbedding && (
                            <FormField
                                control={form.control}
                                name="values"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vector Values (JSON Array)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="[0.1, 0.2, 0.3, ...]"
                                                className="min-h-[80px] font-mono text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Query Vector - for query, only show if embedding is disabled */}
                        {resource === "vector" && operation === "query" && !enableEmbedding && (
                            <FormField
                                control={form.control}
                                name="queryVector"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Query Vector (JSON Array)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="[0.1, 0.2, 0.3, ...] or {{embedding}}"
                                                className="min-h-[80px] font-mono text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Top K */}
                        {resource === "vector" && operation === "query" && (
                            <FormField
                                control={form.control}
                                name="topK"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Top K</FormLabel>
                                        <FormControl>
                                            <Input type="number" min={1} max={10000} placeholder="10" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Metadata */}
                        {resource === "vector" && ["upsert", "update"].includes(operation) && (
                            <FormField
                                control={form.control}
                                name="metadata"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Metadata (JSON, Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder='{"source": "documents"}'
                                                className="min-h-[60px] font-mono text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Filter */}
                        {resource === "vector" && ["query", "delete", "describeStats"].includes(operation) && (
                            <FormField
                                control={form.control}
                                name="filter"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Filter (JSON, Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder='{"category": {"$eq": "tech"}}'
                                                className="min-h-[60px] font-mono text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
