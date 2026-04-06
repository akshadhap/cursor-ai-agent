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

const googleSheetsFormSchema = z.object({
    variableName: z.string().min(1, "Variable name is required"),
    credentialId: z.string().min(1, "Credential is required"),
    operation: z.string().min(1, "Operation is required"),
    spreadsheetId: z.string().optional(),
    range: z.string().optional(),
    values: z.string().optional(),
    valueInputOption: z.string().optional(),
    insertDataOption: z.string().optional(),
});

export type GoogleSheetsFormValues = z.infer<typeof googleSheetsFormSchema>;

type GoogleSheetsDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: GoogleSheetsFormValues) => void;
    defaultValues?: Partial<GoogleSheetsFormValues>;
};

export const GoogleSheetsDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
}: GoogleSheetsDialogProps) => {
    const {
        data: credentials,
        isLoading: isLoadingCredentials,
    } = useCredentialsByType(CredentialType.GOOGLE_SHEETS);

    const { theme, systemTheme } = useTheme();
    const currentTheme = theme === "system" ? systemTheme : theme;

    const form = useForm<GoogleSheetsFormValues>({
        resolver: zodResolver(googleSheetsFormSchema),
        defaultValues: {
            variableName: defaultValues?.variableName || "sheetsResult",
            credentialId: defaultValues?.credentialId || "",
            operation: defaultValues?.operation || "read_values",
            spreadsheetId: defaultValues?.spreadsheetId || "",
            range: defaultValues?.range || "Sheet1!A1:Z100",
            values: defaultValues?.values || "",
            valueInputOption: defaultValues?.valueInputOption || "USER_ENTERED",
            insertDataOption: defaultValues?.insertDataOption || "INSERT_ROWS",
        },
    });

    const operation = form.watch("operation");

    const operations = [
        { value: "get_spreadsheet", label: "Get Spreadsheet Info" },
        { value: "read_values", label: "Read Values" },
        { value: "write_values", label: "Write Values" },
        { value: "append_row", label: "Append Row" },
        { value: "clear_values", label: "Clear Values" },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Google Sheets Node</DialogTitle>
                    <DialogDescription>
                        Read and write data to Google Sheets spreadsheets
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
                                        <Input placeholder="sheetsResult" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Name to store the result
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="credentialId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Google Sheets Credential</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select credential" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {isLoadingCredentials ? (
                                                <SelectItem value="loading" disabled>
                                                    Loading credentials...
                                                </SelectItem>
                                            ) : credentials && credentials.length > 0 ? (
                                                credentials.map((credential) => (
                                                    <SelectItem key={credential.id} value={credential.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Image
                                                                src="/logos/google-sheets.svg"
                                                                alt="Google Sheets"
                                                                width={16}
                                                                height={16}
                                                            />
                                                            {credential.name}
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem value="none" disabled>
                                                    No credentials found
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        OAuth access token with spreadsheets scope
                                    </FormDescription>
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
                                                <SelectValue placeholder="Select an operation" />
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

                        <FormField
                            control={form.control}
                            name="spreadsheetId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Spreadsheet ID</FormLabel>
                                    <FormControl>
                                        <Input placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Find in the spreadsheet URL: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Range field for read, write, append, clear */}
                        {["read_values", "write_values", "append_row", "clear_values"].includes(operation) && (
                            <FormField
                                control={form.control}
                                name="range"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Range</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Sheet1!A1:Z100" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            A1 notation (e.g., Sheet1!A1:D10)
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Values field for write and append */}
                        {["write_values", "append_row"].includes(operation) && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="values"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Values (JSON Array)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={`[["Name", "Email"], ["John", "john@example.com"]]`}
                                                    className="min-h-[100px] font-mono text-sm"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                2D array of values as JSON. Each inner array is a row.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="valueInputOption"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Value Input Option</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="USER_ENTERED">User Entered (parse formulas)</SelectItem>
                                                    <SelectItem value="RAW">Raw (literal text)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}

                        {/* Insert option for append */}
                        {operation === "append_row" && (
                            <FormField
                                control={form.control}
                                name="insertDataOption"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Insert Data Option</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="INSERT_ROWS">Insert Rows (add new rows)</SelectItem>
                                                <SelectItem value="OVERWRITE">Overwrite (replace existing)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
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
