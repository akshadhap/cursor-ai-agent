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

const googleCalendarFormSchema = z.object({
    variableName: z.string().min(1, "Variable name is required"),
    credentialId: z.string().min(1, "Credential is required"),
    resource: z.enum(["calendar", "event"]),
    operation: z.string().min(1, "Operation is required"),
    calendarId: z.string().optional(),
    eventId: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    location: z.string().optional(),
    startDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
    timeZone: z.string().optional(),
    attendees: z.string().optional(),
});

export type GoogleCalendarFormValues = z.infer<typeof googleCalendarFormSchema>;

type GoogleCalendarDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: GoogleCalendarFormValues) => void;
    defaultValues?: Partial<GoogleCalendarFormValues>;
};

export const GoogleCalendarDialog = ({
    open,
    onOpenChange,
    onSubmit,
    defaultValues,
}: GoogleCalendarDialogProps) => {
    const {
        data: credentials,
        isLoading: isLoadingCredentials,
    } = useCredentialsByType(CredentialType.GOOGLE_CALENDAR);

    const { theme, systemTheme } = useTheme();
    const currentTheme = theme === "system" ? systemTheme : theme;

    const form = useForm<GoogleCalendarFormValues>({
        resolver: zodResolver(googleCalendarFormSchema),
        defaultValues: {
            variableName: defaultValues?.variableName || "calendarResult",
            credentialId: defaultValues?.credentialId || "",
            resource: defaultValues?.resource || "event",
            operation: defaultValues?.operation || "list",
            calendarId: defaultValues?.calendarId || "primary",
            eventId: defaultValues?.eventId || "",
            summary: defaultValues?.summary || "",
            description: defaultValues?.description || "",
            location: defaultValues?.location || "",
            startDateTime: defaultValues?.startDateTime || "",
            endDateTime: defaultValues?.endDateTime || "",
            timeZone: defaultValues?.timeZone || "",
            attendees: defaultValues?.attendees || "",
        },
    });

    const resource = form.watch("resource");
    const operation = form.watch("operation");

    const getOperations = () => {
        const operations: Record<string, { value: string; label: string }[]> = {
            calendar: [
                { value: "list", label: "List Calendars" },
                { value: "get", label: "Get Calendar" },
            ],
            event: [
                { value: "list", label: "List Events" },
                { value: "get", label: "Get Event" },
                { value: "create", label: "Create Event" },
                { value: "update", label: "Update Event" },
                { value: "delete", label: "Delete Event" },
            ],
        };
        return operations[resource] || [];
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configure Google Calendar Node</DialogTitle>
                    <DialogDescription>
                        Manage calendars and events in Google Calendar
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
                                        <Input placeholder="calendarResult" {...field} />
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
                                    <FormLabel>Google Calendar Credential</FormLabel>
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
                                                                src="/logos/google-calendar.svg"
                                                                alt="Google Calendar"
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
                                        Select your Google Calendar OAuth credential
                                    </FormDescription>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a resource" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="calendar">Calendar</SelectItem>
                                            <SelectItem value="event">Event</SelectItem>
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
                                                <SelectValue placeholder="Select an operation" />
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

                        {/* Calendar ID - for all event operations and get calendar */}
                        {(resource === "event" || (resource === "calendar" && operation === "get")) && (
                            <FormField
                                control={form.control}
                                name="calendarId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Calendar ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="primary" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Use &quot;primary&quot; for your main calendar or a specific calendar ID
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Event ID - for get, update, delete */}
                        {resource === "event" && ["get", "update", "delete"].includes(operation) && (
                            <FormField
                                control={form.control}
                                name="eventId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Event ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Event ID" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Event creation/update fields */}
                        {resource === "event" && ["create", "update"].includes(operation) && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="summary"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Event Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Meeting with Team" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Event description..."
                                                    className="min-h-[80px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="location"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Location (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Conference Room A" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="startDateTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Start Date/Time</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="datetime-local"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="endDateTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End Date/Time</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="datetime-local"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="timeZone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Time Zone (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="America/New_York" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Leave empty to use your calendar&apos;s default timezone
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="attendees"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Attendees (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="email1@example.com, email2@example.com" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Comma-separated email addresses
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
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
