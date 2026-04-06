"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import { Plus, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// Resources available in Zoho CRM
const ZOHO_RESOURCES = [
    { value: "account", label: "Account" },
    { value: "contact", label: "Contact" },
    { value: "deal", label: "Deal" },
    { value: "lead", label: "Lead" },
    { value: "product", label: "Product" },
    { value: "task", label: "Task" },
    { value: "note", label: "Note" },
    { value: "call", label: "Call" },
    { value: "event", label: "Event" },
] as const;

// Operations for different resources
const ZOHO_OPERATIONS = [
    { value: "create", label: "Create" },
    { value: "update", label: "Update" },
    { value: "get", label: "Get" },
    { value: "getAll", label: "Get All" },
    { value: "delete", label: "Delete" },
    { value: "upsert", label: "Upsert" },
] as const;

const additionalFieldSchema = z.object({
    key: z.string().min(1, "Field name is required"),
    value: z.string(),
});

const formSchema = z.object({
    credentialId: z.string().min(1, "Credential is required"),
    resource: z.string().min(1, "Resource is required"),
    operation: z.string().min(1, "Operation is required"),
    recordId: z.string().optional(),
    additionalFields: z.array(additionalFieldSchema).optional(),
    variableName: z.string().min(1, "Variable name is required"),
});

export type ZohoFormValues = z.infer<typeof formSchema>;

interface ZohoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: ZohoFormValues) => void;
    defaultValues?: Partial<ZohoFormValues>;
}

export function ZohoDialog({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
}: ZohoDialogProps) {
    // Fetch ZOHO credentials from database
    const { data: zohoCredentials = [] } = useCredentialsByType(CredentialType.ZOHO_CRM);

    const form = useForm<ZohoFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            credentialId: defaultValues?.credentialId || "",
            resource: defaultValues?.resource || "account",
            operation: defaultValues?.operation || "create",
            recordId: defaultValues?.recordId || "",
            additionalFields: defaultValues?.additionalFields || [],
            variableName: defaultValues?.variableName || "",
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "additionalFields",
    });

    // Reset form values when dialog opens with new defaults
    useEffect(() => {
        if (open) {
            form.reset({
                credentialId: defaultValues?.credentialId || "",
                resource: defaultValues?.resource || "account",
                operation: defaultValues?.operation || "create",
                recordId: defaultValues?.recordId || "",
                additionalFields: defaultValues?.additionalFields || [],
                variableName: defaultValues?.variableName || "",
            });
        }
    }, [open, defaultValues, form]);

    const watchOperation = form.watch("operation");
    const watchResource = form.watch("resource");
    const watchVariableName = form.watch("variableName") || "myZoho";

    // Operations that need a record ID
    const needsRecordId = ["update", "get", "delete", "upsert"].includes(watchOperation);

    const handleSubmit = (values: ZohoFormValues) => {
        onSubmit(values);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Zoho CRM</DialogTitle>
                    <DialogDescription>
                        Configure your Zoho CRM action
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Credential Selector */}
                        <FormField
                            control={form.control}
                            name="credentialId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Credential to connect with *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className={!field.value ? "border-destructive" : ""}>
                                                <SelectValue placeholder="Select Credential" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {zohoCredentials.length === 0 ? (
                                                <SelectItem value="none" disabled>
                                                    No Zoho credentials found
                                                </SelectItem>
                                            ) : (
                                                zohoCredentials.map((cred) => (
                                                    <SelectItem key={cred.id} value={cred.id}>
                                                        {cred.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Redirect URL Helper - shown when no credentials */}
                        {zohoCredentials.length === 0 && (
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-amber-500">
                                    <ExternalLink className="h-4 w-4" />
                                    <span className="text-sm font-medium">Setup Required</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    No Zoho credentials found. To connect Zoho CRM, you'll need to:
                                </p>
                                <div className="space-y-2">
                                    <p className="text-xs font-medium">1. Copy this Redirect URL to your Zoho API Console:</p>
                                    <div className="flex gap-2">
                                        <Input
                                            readOnly
                                            value="https://dev-nextjs-ssr-745810511686.us-central1.run.app/api/oauth/zoho/callback"
                                            className="font-mono text-xs bg-background"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText("https://dev-nextjs-ssr-745810511686.us-central1.run.app/api/oauth/zoho/callback");
                                                toast.success("Redirect URL copied!");
                                            }}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <p className="text-xs font-medium mb-2">2. Create a Zoho credential:</p>
                                    <Button asChild variant="outline" size="sm" className="w-full">
                                        <Link href="/credentials/new" target="_blank">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Create Zoho Credential
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Resource Dropdown */}
                        <FormField
                            control={form.control}
                            name="resource"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Resource</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select resource" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ZOHO_RESOURCES.map((resource) => (
                                                <SelectItem key={resource.value} value={resource.value}>
                                                    {resource.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Operation Dropdown */}
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
                                            {ZOHO_OPERATIONS.map((op) => (
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

                        {/* Record ID - shown for update, get, delete, upsert */}
                        {needsRecordId && (
                            <FormField
                                control={form.control}
                                name="recordId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {watchResource.charAt(0).toUpperCase() + watchResource.slice(1)} ID
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={`Enter ${watchResource} ID or use {{variables.id}}`}
                                                className={!field.value ? "border-destructive" : ""}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Additional Fields Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <FormLabel className="text-sm font-medium">Additional Fields</FormLabel>
                            </div>

                            {fields.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No properties</p>
                            ) : (
                                <div className="space-y-2">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex gap-2 items-start">
                                            <FormField
                                                control={form.control}
                                                name={`additionalFields.${index}.key`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Field name (e.g., Email)"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`additionalFields.${index}.value`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Value or {{variable}}"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => append({ key: "", value: "" })}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Field
                            </Button>
                        </div>

                        {/* Variable Name */}
                        <FormField
                            control={form.control}
                            name="variableName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Variable Name *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="myZoho" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Result available as {"{{"}variables.{watchVariableName}{"}}"}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
}
