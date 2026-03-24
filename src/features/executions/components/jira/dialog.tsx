"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";

const formSchema = z.object({
    variableName: z.string().optional(),
    credentialId: z.string().optional(),
    resource: z.string().optional(),
    operation: z.string().optional(),
    projectKey: z.string().optional(),
    issueIdOrKey: z.string().optional(),
    issueType: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    assignee: z.string().optional(),
    priority: z.string().optional(),
    jql: z.string().optional(),
    transitionId: z.string().optional(),
    fields: z.string().optional(),
});

export type JiraFormValues = z.infer<typeof formSchema>;

const resources = [
    { value: "issue", label: "Issue" },
    { value: "project", label: "Project" },
    { value: "user", label: "User" },
];

const operationsByResource: Record<string, { value: string; label: string }[]> = {
    issue: [
        { value: "create", label: "Create" },
        { value: "get", label: "Get" },
        { value: "update", label: "Update" },
        { value: "delete", label: "Delete" },
        { value: "search", label: "Search (JQL)" },
        { value: "transition", label: "Transition" },
    ],
    project: [
        { value: "list", label: "List All" },
        { value: "get", label: "Get" },
    ],
    user: [
        { value: "search", label: "Search" },
        { value: "getCurrentUser", label: "Get Current User" },
    ],
};

const issueTypes = [
    { value: "Bug", label: "Bug" },
    { value: "Task", label: "Task" },
    { value: "Story", label: "Story" },
    { value: "Epic", label: "Epic" },
    { value: "Subtask", label: "Subtask" },
];

const priorities = [
    { value: "Highest", label: "Highest" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
    { value: "Lowest", label: "Lowest" },
];

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: JiraFormValues) => void;
    defaultValues?: Partial<JiraFormValues>;
}

export const JiraDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
}: Props) => {
    const form = useForm<JiraFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            variableName: defaultValues?.variableName || "jiraResult",
            credentialId: defaultValues?.credentialId || "",
            resource: defaultValues?.resource || "",
            operation: defaultValues?.operation || "",
            projectKey: defaultValues?.projectKey || "",
            issueIdOrKey: defaultValues?.issueIdOrKey || "",
            issueType: defaultValues?.issueType || "",
            summary: defaultValues?.summary || "",
            description: defaultValues?.description || "",
            assignee: defaultValues?.assignee || "",
            priority: defaultValues?.priority || "",
            jql: defaultValues?.jql || "",
            transitionId: defaultValues?.transitionId || "",
            fields: defaultValues?.fields || "",
        },
    });

    const { data: credentials } = useCredentialsByType(CredentialType.JIRA);

    const selectedResource = form.watch("resource");
    const selectedOperation = form.watch("operation");
    const operations = selectedResource ? operationsByResource[selectedResource] || [] : [];

    const handleSubmit = (values: JiraFormValues) => {
        onSubmit(values);
    };

    // Determine which fields to show based on resource/operation
    const showProjectKey = selectedResource === "issue" && ["create"].includes(selectedOperation || "");
    const showIssueIdOrKey = selectedResource === "issue" && ["get", "update", "delete", "transition"].includes(selectedOperation || "");
    const showIssueType = selectedResource === "issue" && selectedOperation === "create";
    const showSummary = selectedResource === "issue" && ["create", "update"].includes(selectedOperation || "");
    const showDescription = selectedResource === "issue" && ["create", "update"].includes(selectedOperation || "");
    const showJql = selectedResource === "issue" && selectedOperation === "search";
    const showTransitionId = selectedResource === "issue" && selectedOperation === "transition";
    const showFields = selectedResource === "issue" && selectedOperation === "update";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <img src="/logos/jira.svg" alt="Jira" className="size-6" />
                        Jira
                    </DialogTitle>
                    <DialogDescription>
                        Configure Jira integration to manage issues, projects, and users.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="credentialId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Credential</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select credential" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {credentials?.map((cred) => (
                                                <SelectItem key={cred.id} value={cred.id}>
                                                    <div className="flex items-center gap-2">
                                                        <img src="/logos/jira.svg" alt="" className="size-4" />
                                                        {cred.name}
                                                    </div>
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
                            name="resource"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Resource</FormLabel>
                                    <Select onValueChange={(v) => { field.onChange(v); form.setValue("operation", ""); }} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select resource" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {resources.map((r) => (
                                                <SelectItem key={r.value} value={r.value}>
                                                    {r.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedResource && (
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
                                                {operations.map((op) => (
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
                        )}

                        {showProjectKey && (
                            <FormField
                                control={form.control}
                                name="projectKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Project Key</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., PROJ" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showIssueIdOrKey && (
                            <FormField
                                control={form.control}
                                name="issueIdOrKey"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Issue ID or Key</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., PROJ-123 or {{context.issueKey}}" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showIssueType && (
                            <FormField
                                control={form.control}
                                name="issueType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Issue Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select issue type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {issueTypes.map((t) => (
                                                    <SelectItem key={t.value} value={t.value}>
                                                        {t.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showSummary && (
                            <FormField
                                control={form.control}
                                name="summary"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Summary</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Issue summary" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showDescription && (
                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Issue description" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showJql && (
                            <FormField
                                control={form.control}
                                name="jql"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>JQL Query</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder='e.g., project = PROJ AND status = "In Progress"' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showTransitionId && (
                            <FormField
                                control={form.control}
                                name="transitionId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Transition ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 21" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {showFields && (
                            <FormField
                                control={form.control}
                                name="fields"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fields (JSON)</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder='{"summary": "Updated title"}' {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="jiraResult" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-2 justify-end pt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Save</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};
