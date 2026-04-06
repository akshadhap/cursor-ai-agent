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

const formSchema = z.object({
  operation: z.string().min(1, "Operation is required"),
  credentialId: z.string().min(1, "Credential is required"),
  subdomain: z.string().min(1, "Subdomain is required"),
  
  // Ticket fields
  ticketId: z.string().optional(),
  ticketSubject: z.string().optional(),
  ticketDescription: z.string().optional(),
  ticketPriority: z.string().optional(),
  ticketStatus: z.string().optional(),
  ticketType: z.string().optional(),
  ticketTags: z.string().optional(),
  ticketAssigneeId: z.string().optional(),
  ticketRequesterId: z.string().optional(),
  ticketGroupId: z.string().optional(),
  ticketCustomFields: z.string().optional(),
  ticketComment: z.string().optional(),
  ticketCommentPublic: z.boolean().optional(),
  
  // User fields
  userId: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  userPhone: z.string().optional(),
  userRole: z.string().optional(),
  userOrganizationId: z.string().optional(),
  userNotes: z.string().optional(),
  userDetails: z.string().optional(),
  
  // Organization fields
  organizationId: z.string().optional(),
  organizationName: z.string().optional(),
  organizationNotes: z.string().optional(),
  organizationDetails: z.string().optional(),
  organizationDomains: z.string().optional(),
  organizationTags: z.string().optional(),
  
  // Search/Query fields
  searchQuery: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  pageSize: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  
  // Filter options
  filterStatus: z.string().optional(),
  filterPriority: z.string().optional(),
  filterType: z.string().optional(),
  filterAssignee: z.string().optional(),
  filterRequester: z.string().optional(),
  filterGroup: z.string().optional(),
  filterCreatedAfter: z.string().optional(),
  filterUpdatedAfter: z.string().optional(),
});

export type ZendeskFormValues = z.infer<typeof formSchema>;

type ZendeskOperation = 
  // Tickets
  | "list_tickets"
  | "get_ticket"
  | "create_ticket"
  | "update_ticket"
  | "delete_ticket"
  | "add_ticket_comment"
  | "get_ticket_comments"
  // Users
  | "list_users"
  | "get_user"
  | "create_user"
  | "update_user"
  | "delete_user"
  | "search_users"
  // Organizations
  | "list_organizations"
  | "get_organization"
  | "create_organization"
  | "update_organization"
  | "delete_organization"
  // Groups
  | "list_groups"
  | "get_group"
  // Search
  | "search_tickets"
  | "search_all";

interface ZendeskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ZendeskFormValues) => void;
  defaultValues?: Partial<ZendeskFormValues>;
}

export default function ZendeskDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: ZendeskDialogProps) {
  const { data: credentials } = useCredentialsByType(CredentialType.ZENDESK);

  const form = useForm<ZendeskFormValues, unknown, ZendeskFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      operation: defaultValues?.operation || "",
      credentialId: defaultValues?.credentialId || "",
      subdomain: defaultValues?.subdomain || "",
      ticketId: defaultValues?.ticketId || "",
      ticketSubject: defaultValues?.ticketSubject || "",
      ticketDescription: defaultValues?.ticketDescription || "",
      ticketPriority: defaultValues?.ticketPriority || "",
      ticketStatus: defaultValues?.ticketStatus || "",
      ticketType: defaultValues?.ticketType || "",
      ticketTags: defaultValues?.ticketTags || "",
      ticketAssigneeId: defaultValues?.ticketAssigneeId || "",
      ticketRequesterId: defaultValues?.ticketRequesterId || "",
      ticketGroupId: defaultValues?.ticketGroupId || "",
      ticketCustomFields: defaultValues?.ticketCustomFields || "",
      ticketComment: defaultValues?.ticketComment || "",
      ticketCommentPublic: defaultValues?.ticketCommentPublic ?? true,
      userId: defaultValues?.userId || "",
      userName: defaultValues?.userName || "",
      userEmail: defaultValues?.userEmail || "",
      userPhone: defaultValues?.userPhone || "",
      userRole: defaultValues?.userRole || "",
      userOrganizationId: defaultValues?.userOrganizationId || "",
      userNotes: defaultValues?.userNotes || "",
      userDetails: defaultValues?.userDetails || "",
      organizationId: defaultValues?.organizationId || "",
      organizationName: defaultValues?.organizationName || "",
      organizationNotes: defaultValues?.organizationNotes || "",
      organizationDetails: defaultValues?.organizationDetails || "",
      organizationDomains: defaultValues?.organizationDomains || "",
      organizationTags: defaultValues?.organizationTags || "",
      searchQuery: defaultValues?.searchQuery || "",
      sortBy: defaultValues?.sortBy || "",
      sortOrder: defaultValues?.sortOrder || "",
      pageSize: defaultValues?.pageSize || 25,
      page: defaultValues?.page || 1,
      filterStatus: defaultValues?.filterStatus || "",
      filterPriority: defaultValues?.filterPriority || "",
      filterType: defaultValues?.filterType || "",
      filterAssignee: defaultValues?.filterAssignee || "",
      filterRequester: defaultValues?.filterRequester || "",
      filterGroup: defaultValues?.filterGroup || "",
      filterCreatedAfter: defaultValues?.filterCreatedAfter || "",
      filterUpdatedAfter: defaultValues?.filterUpdatedAfter || "",
    },
  });

  const operation = useWatch({ control: form.control, name: "operation" }) as ZendeskOperation;

  const handleSubmit = (values: ZendeskFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Show field conditions
  const isTicketOperation = [
    "list_tickets", "get_ticket", "create_ticket", "update_ticket", 
    "delete_ticket", "add_ticket_comment", "get_ticket_comments", "search_tickets"
  ].includes(operation);
  
  const isUserOperation = [
    "list_users", "get_user", "create_user", "update_user", 
    "delete_user", "search_users"
  ].includes(operation);
  
  const isOrganizationOperation = [
    "list_organizations", "get_organization", "create_organization", 
    "update_organization", "delete_organization"
  ].includes(operation);

  const showTicketId = [
    "get_ticket", "update_ticket", "delete_ticket", 
    "add_ticket_comment", "get_ticket_comments"
  ].includes(operation);

  const showTicketCreate = ["create_ticket", "update_ticket"].includes(operation);
  
  const showTicketComment = ["add_ticket_comment"].includes(operation);

  const showUserId = ["get_user", "update_user", "delete_user"].includes(operation);
  
  const showUserCreate = ["create_user", "update_user"].includes(operation);

  const showOrganizationId = [
    "get_organization", "update_organization", "delete_organization"
  ].includes(operation);
  
  const showOrganizationCreate = ["create_organization", "update_organization"].includes(operation);

  const showSearchQuery = ["search_tickets", "search_users", "search_all"].includes(operation);
  
  const showPagination = [
    "list_tickets", "list_users", "list_organizations", "list_groups",
    "search_tickets", "search_users", "search_all"
  ].includes(operation);

  const showTicketFilters = ["list_tickets", "search_tickets"].includes(operation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Zendesk</DialogTitle>
          <DialogDescription>
            Manage tickets, users, and organizations in Zendesk Support.
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
                  <FormLabel>Zendesk Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a credential" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {credentials?.map((cred) => (
                        <SelectItem key={cred.id} value={cred.id}>
                          {cred.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select your Zendesk API credentials
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Subdomain */}
            <FormField
              control={form.control}
              name="subdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zendesk Subdomain</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="your-company" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Your Zendesk subdomain (e.g., &quot;your-company&quot; from your-company.zendesk.com)
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
                        Tickets
                      </div>
                      <SelectItem value="list_tickets">List Tickets</SelectItem>
                      <SelectItem value="get_ticket">Get Ticket</SelectItem>
                      <SelectItem value="create_ticket">Create Ticket</SelectItem>
                      <SelectItem value="update_ticket">Update Ticket</SelectItem>
                      <SelectItem value="delete_ticket">Delete Ticket</SelectItem>
                      <SelectItem value="add_ticket_comment">Add Ticket Comment</SelectItem>
                      <SelectItem value="get_ticket_comments">Get Ticket Comments</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Users
                      </div>
                      <SelectItem value="list_users">List Users</SelectItem>
                      <SelectItem value="get_user">Get User</SelectItem>
                      <SelectItem value="create_user">Create User</SelectItem>
                      <SelectItem value="update_user">Update User</SelectItem>
                      <SelectItem value="delete_user">Delete User</SelectItem>
                      <SelectItem value="search_users">Search Users</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Organizations
                      </div>
                      <SelectItem value="list_organizations">List Organizations</SelectItem>
                      <SelectItem value="get_organization">Get Organization</SelectItem>
                      <SelectItem value="create_organization">Create Organization</SelectItem>
                      <SelectItem value="update_organization">Update Organization</SelectItem>
                      <SelectItem value="delete_organization">Delete Organization</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Groups
                      </div>
                      <SelectItem value="list_groups">List Groups</SelectItem>
                      <SelectItem value="get_group">Get Group</SelectItem>
                      
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Search
                      </div>
                      <SelectItem value="search_tickets">Search Tickets</SelectItem>
                      <SelectItem value="search_all">Search All</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ticket ID */}
            {showTicketId && (
              <FormField
                control={form.control}
                name="ticketId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket ID</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Ticket Creation/Update Fields */}
            {showTicketCreate && (
              <>
                <FormField
                  control={form.control}
                  name="ticketSubject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Ticket subject" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticketDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ticket description..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ticketPriority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ticketStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="hold">On Hold</SelectItem>
                            <SelectItem value="solved">Solved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ticketType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="question">Question</SelectItem>
                            <SelectItem value="incident">Incident</SelectItem>
                            <SelectItem value="problem">Problem</SelectItem>
                            <SelectItem value="task">Task</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ticketTags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input placeholder="tag1, tag2, tag3" {...field} />
                        </FormControl>
                        <FormDescription>Comma-separated</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ticketAssigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="User ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ticketRequesterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requester ID (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="User ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="ticketGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Group ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticketCustomFields"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Fields (JSON)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder='[{"id": 123, "value": "custom value"}]'
                          className="font-mono text-xs"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        JSON array of custom field objects
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Ticket Comment */}
            {showTicketComment && (
              <>
                <FormField
                  control={form.control}
                  name="ticketComment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comment</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Your comment..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ticketCommentPublic"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Public Comment</FormLabel>
                        <FormDescription>
                          Make this comment visible to the requester
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
              </>
            )}

            {/* User ID */}
            {showUserId && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User ID</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* User Creation/Update Fields */}
            {showUserCreate && (
              <>
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="userPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="userRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="end-user">End User</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="userOrganizationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Organization ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Internal notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Organization ID */}
            {showOrganizationId && (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization ID</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Organization Creation/Update Fields */}
            {showOrganizationCreate && (
              <>
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organizationDomains"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Domains (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="acme.com, acme.org" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated domain names</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organizationTags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="enterprise, vip" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated tags</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organizationNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Internal notes..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Search Query */}
            {showSearchQuery && (
              <FormField
                control={form.control}
                name="searchQuery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Query</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="status:open priority:high" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Zendesk search syntax (e.g., status:open type:ticket)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Ticket Filters */}
            {showTicketFilters && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="filterStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filter by Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__all__">All</SelectItem>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="hold">On Hold</SelectItem>
                            <SelectItem value="solved">Solved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="filterPriority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filter by Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="All priorities" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__all__">All</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="filterCreatedAfter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Created After</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="filterUpdatedAfter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Updated After</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Pagination */}
            {showPagination && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pageSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Results Per Page</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          max={100}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="page"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Number</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min={1}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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