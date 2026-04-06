"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import z from "zod";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import Image from "next/image";

// Calendly operations grouped by category
const calendlyOperations = {
  // Scheduled Events
  list_scheduled_events: "List Scheduled Events",
  get_scheduled_event: "Get Scheduled Event",
  cancel_scheduled_event: "Cancel Scheduled Event",
  
  // Event Types
  list_event_types: "List Event Types",
  get_event_type: "Get Event Type",
  
  // Invitees
  list_event_invitees: "List Event Invitees",
  get_invitee: "Get Invitee",
  cancel_invitee: "Cancel/No-Show Invitee",
  
  // Users & Organizations
  get_current_user: "Get Current User",
  list_organization_members: "List Organization Members",
  
  // Scheduling Links
  create_scheduling_link: "Create One-Off Scheduling Link",
  
  // Availability
  list_user_availability_schedules: "List Availability Schedules",
  get_user_availability_schedule: "Get Availability Schedule",
  list_user_busy_times: "List User Busy Times",
  
  // Webhooks
  list_webhook_subscriptions: "List Webhook Subscriptions",
  create_webhook_subscription: "Create Webhook Subscription",
  delete_webhook_subscription: "Delete Webhook Subscription",
} as const;

type CalendlyOperation = keyof typeof calendlyOperations;

const formSchema = z.object({
  operation: z.string().min(1, "Operation is required"),
  credentialId: z.string().min(1, "Credential is required"),
  variableName: z.string()
    .min(1, "Variable name is required")
    .regex(
      /^[a-zA-Z_][a-zA-Z0-9_]*$/,
      "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores"
    ),
  
  // Event/Resource identifiers
  eventUuid: z.string().optional(),
  eventTypeUuid: z.string().optional(),
  inviteeUuid: z.string().optional(),
  webhookUuid: z.string().optional(),
  scheduleUuid: z.string().optional(),
  
  // User/Organization identifiers  
  userUri: z.string().optional(),
  organizationUri: z.string().optional(),
  
  // Filtering options
  status: z.string().optional(),
  minStartTime: z.string().optional(),
  maxStartTime: z.string().optional(),
  count: z.coerce.number().optional(),
  pageToken: z.string().optional(),
  sort: z.string().optional(),
  
  // Scheduling link options
  maxEventCount: z.coerce.number().optional(),
  
  // Webhook options
  webhookUrl: z.string().optional(),
  webhookEvents: z.string().optional(),
  webhookScope: z.string().optional(),
  signingKey: z.string().optional(),
  
  // Cancel options
  cancelReason: z.string().optional(),
  markAsNoShow: z.boolean().optional(),
});

export type CalendlyFormValues = z.infer<typeof formSchema>;

interface CalendlyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CalendlyFormValues) => void;
  defaultValues?: Partial<CalendlyFormValues>;
}

export default function CalendlyDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: CalendlyDialogProps) {
  const { data: credentials } = useCredentialsByType(CredentialType.CALENDLY);

  const form = useForm<CalendlyFormValues, unknown, CalendlyFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      operation: defaultValues?.operation || "",
      credentialId: defaultValues?.credentialId || "",
      variableName: defaultValues?.variableName || "calendlyResult",
      eventUuid: defaultValues?.eventUuid || "",
      eventTypeUuid: defaultValues?.eventTypeUuid || "",
      inviteeUuid: defaultValues?.inviteeUuid || "",
      webhookUuid: defaultValues?.webhookUuid || "",
      scheduleUuid: defaultValues?.scheduleUuid || "",
      userUri: defaultValues?.userUri || "",
      organizationUri: defaultValues?.organizationUri || "",
      status: defaultValues?.status || "",
      minStartTime: defaultValues?.minStartTime || "",
      maxStartTime: defaultValues?.maxStartTime || "",
      count: defaultValues?.count || 20,
      pageToken: defaultValues?.pageToken || "",
      sort: defaultValues?.sort || "",
      maxEventCount: defaultValues?.maxEventCount || 1,
      webhookUrl: defaultValues?.webhookUrl || "",
      webhookEvents: defaultValues?.webhookEvents || "",
      webhookScope: defaultValues?.webhookScope || "user",
      signingKey: defaultValues?.signingKey || "",
      cancelReason: defaultValues?.cancelReason || "",
      markAsNoShow: defaultValues?.markAsNoShow || false,
    },
  });

  const operation = useWatch({ control: form.control, name: "operation" }) as CalendlyOperation;
  const watchVariableName = form.watch("variableName") || "calendlyResult";

  const handleSubmit = (values: CalendlyFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Helper to determine which fields to show based on operation
  const showEventUuid = [
    "get_scheduled_event",
    "cancel_scheduled_event",
    "list_event_invitees",
  ].includes(operation);

  const showEventTypeUuid = [
    "get_event_type",
    "create_scheduling_link",
  ].includes(operation);

  const showInviteeUuid = [
    "get_invitee",
    "cancel_invitee",
  ].includes(operation);

  const showWebhookUuid = ["delete_webhook_subscription"].includes(operation);

  const showScheduleUuid = ["get_user_availability_schedule"].includes(operation);

  const showUserUri = [
    "list_scheduled_events",
    "list_event_types",
    "list_organization_members",
    "list_user_availability_schedules",
    "list_user_busy_times",
    "list_webhook_subscriptions",
    "create_webhook_subscription",
  ].includes(operation);

  const showOrganizationUri = [
    "list_scheduled_events",
    "list_event_types",
    "list_organization_members",
    "list_webhook_subscriptions",
    "create_webhook_subscription",
  ].includes(operation);

  const showDateFilters = [
    "list_scheduled_events",
    "list_user_busy_times",
  ].includes(operation);

  const showStatusFilter = ["list_scheduled_events"].includes(operation);

  const showPagination = [
    "list_scheduled_events",
    "list_event_types",
    "list_event_invitees",
    "list_organization_members",
    "list_webhook_subscriptions",
  ].includes(operation);

  const showSchedulingLinkOptions = ["create_scheduling_link"].includes(operation);

  const showWebhookOptions = ["create_webhook_subscription"].includes(operation);

  const showCancelOptions = [
    "cancel_scheduled_event",
    "cancel_invitee",
  ].includes(operation);

  const showNoShowOption = ["cancel_invitee"].includes(operation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
         <DialogHeader>
          <DialogTitle>Configure Calendly</DialogTitle>
          <DialogDescription className="pb-4">
            Schedule meetings, manage events, and handle invitees with Calendly API.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
           

            

            {/* Credential Selection */}
            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendly Credential</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!credentials?.length}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue 
                          placeholder={
                            credentials?.length 
                              ? "Select a credential" 
                              : "No credentials available"
                          } 
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {credentials?.length ? (
                        credentials.map((cred) => (
                          <SelectItem key={cred.id} value={cred.id}>
                            <div className="flex items-center gap-2">
                              <Image
                                src="/logos/calendly.svg"
                                alt="Calendly"
                                width={16}
                                height={16}
                              />
                              {cred.name}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                          No Calendly credentials found.
                          <br />
                          <a href="/credentials/new" className="text-primary underline">
                            Create one first
                          </a>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select your Calendly API credentials (Personal Access Token)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />





            {/* Operation Selection */}
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
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Scheduled Events
                      </div>
                      <SelectItem value="list_scheduled_events">List Scheduled Events</SelectItem>
                      <SelectItem value="get_scheduled_event">Get Scheduled Event</SelectItem>
                      <SelectItem value="cancel_scheduled_event">Cancel Scheduled Event</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Event Types
                      </div>
                      <SelectItem value="list_event_types">List Event Types</SelectItem>
                      <SelectItem value="get_event_type">Get Event Type</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Invitees
                      </div>
                      <SelectItem value="list_event_invitees">List Event Invitees</SelectItem>
                      <SelectItem value="get_invitee">Get Invitee</SelectItem>
                      <SelectItem value="cancel_invitee">Cancel/No-Show Invitee</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Users & Organization
                      </div>
                      <SelectItem value="get_current_user">Get Current User</SelectItem>
                      <SelectItem value="list_organization_members">List Organization Members</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Scheduling
                      </div>
                      <SelectItem value="create_scheduling_link">Create One-Off Scheduling Link</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Availability
                      </div>
                      <SelectItem value="list_user_availability_schedules">List Availability Schedules</SelectItem>
                      <SelectItem value="get_user_availability_schedule">Get Availability Schedule</SelectItem>
                      <SelectItem value="list_user_busy_times">List User Busy Times</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Webhooks
                      </div>
                      <SelectItem value="list_webhook_subscriptions">List Webhook Subscriptions</SelectItem>
                      <SelectItem value="create_webhook_subscription">Create Webhook Subscription</SelectItem>
                      <SelectItem value="delete_webhook_subscription">Delete Webhook Subscription</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Variable Name */}
            <FormField
              control={form.control}
              name="variableName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Variable Name</FormLabel>
                  <FormControl>
                    <Input placeholder="calendlyResult" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormDescription>
                    The result will be available as{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {`{{${watchVariableName}}}`}
                    </code>{" "}
                    in subsequent nodes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event UUID */}
            {showEventUuid && (
              <FormField
                control={form.control}
                name="eventUuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event UUID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="abc12345-1234-5678-abcd-123456789abc" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      The UUID of the scheduled event (from event URI)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Event Type UUID */}
            {showEventTypeUuid && (
              <FormField
                control={form.control}
                name="eventTypeUuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type UUID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="abc12345-1234-5678-abcd-123456789abc" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      The UUID of the event type (e.g., "30 Minute Meeting")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Invitee UUID */}
            {showInviteeUuid && (
              <FormField
                control={form.control}
                name="inviteeUuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invitee UUID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="abc12345-1234-5678-abcd-123456789abc" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      The UUID of the invitee
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Webhook UUID */}
            {showWebhookUuid && (
              <FormField
                control={form.control}
                name="webhookUuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook UUID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="abc12345-1234-5678-abcd-123456789abc" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      The UUID of the webhook subscription to delete
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Schedule UUID */}
            {showScheduleUuid && (
              <FormField
                control={form.control}
                name="scheduleUuid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule UUID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="abc12345-1234-5678-abcd-123456789abc" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      The UUID of the availability schedule
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* User URI */}
            {showUserUri && (
              <FormField
                control={form.control}
                name="userUri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User URI (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://api.calendly.com/users/abc123..." 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Filter by user URI. Leave empty to use current user.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Organization URI */}
            {showOrganizationUri && (
              <FormField
                control={form.control}
                name="organizationUri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization URI (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://api.calendly.com/organizations/abc123..." 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Filter by organization. Required for organization-wide queries.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Status Filter */}
            {showStatusFilter && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="__all__">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Filter events by status
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Date Filters */}
            {showDateFilters && (
              <>
                <FormField
                  control={form.control}
                  name="minStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Filter events starting after this time
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Filter events starting before this time
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Pagination */}
            {showPagination && (
              <>
                <FormField
                  control={form.control}
                  name="count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Results Per Page</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          max={100}
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of results to return (1-100)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pageToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Token (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Token from previous response" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Use for pagination to get next page of results
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Default order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__default__">Default</SelectItem>
                          <SelectItem value="start_time:asc">Start Time (Ascending)</SelectItem>
                          <SelectItem value="start_time:desc">Start Time (Descending)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Scheduling Link Options */}
            {showSchedulingLinkOptions && (
              <FormField
                control={form.control}
                name="maxEventCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Event Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={1}
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of events that can be scheduled with this link (default: 1)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Webhook Options */}
            {showWebhookOptions && (
              <>
                <FormField
                  control={form.control}
                  name="webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://your-app.com/webhooks/calendly" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        URL where Calendly will send webhook events
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhookEvents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Events</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="invitee.created, invitee.canceled"
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Comma-separated events: invitee.created, invitee.canceled, routing_form_submission.created
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhookScope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook Scope</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="organization">Organization</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Scope of the webhook subscription
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signingKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signing Key (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Your webhook signing key" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional key for verifying webhook signatures
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Cancel Options */}
            {showCancelOptions && (
              <FormField
                control={form.control}
                name="cancelReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Reason (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Reason for cancellation..."
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional reason for the cancellation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* No-Show Option */}
            {showNoShowOption && (
              <FormField
                control={form.control}
                name="markAsNoShow"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Mark as No-Show</FormLabel>
                      <FormDescription>
                        Mark the invitee as a no-show instead of canceling
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
            )}

            <DialogFooter>
              <Button type="submit">Save Configuration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}