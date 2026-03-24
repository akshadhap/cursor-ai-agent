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
import Image from "next/image";

const hubspotFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().min(1, "Credential is required"),
  resource: z.enum(["contact", "company", "deal", "ticket", "conversation"]),
  operation: z.string().min(1, "Operation is required"),
  
  // Contact fields
  email: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().optional(),
  lifecyclestage: z.string().optional(),
  
  // Company fields
  companyName: z.string().optional(),
  domain: z.string().optional(),
  
  // Deal fields
  dealName: z.string().optional(),
  dealStage: z.string().optional(),
  amount: z.string().optional(),
  
  // Ticket fields
  subject: z.string().optional(),
  content: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  
  // Conversation fields
  conversationId: z.string().optional(),
  
  // Common fields
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  ticketId: z.string().optional(),
  
  // Additional
  customProperties: z.string().optional(),
  limit: z.string().optional(),
  searchQuery: z.string().optional(),
});

export type HubSpotFormValues = z.infer<typeof hubspotFormSchema>;

type HubSpotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: HubSpotFormValues) => void;
  defaultValues?: Partial<HubSpotFormValues>;
};

export const HubSpotDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: HubSpotDialogProps) => {
  const { 
    data: credentials,
    isLoading: isLoadingCredentials,
  } = useCredentialsByType(CredentialType.HUBSPOT);

  const form = useForm<HubSpotFormValues>({
    resolver: zodResolver(hubspotFormSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "",
      credentialId: defaultValues?.credentialId || "",
      resource: defaultValues?.resource || "contact",
      operation: defaultValues?.operation || "upsert",
      email: defaultValues?.email || "",
      firstname: defaultValues?.firstname || "",
      lastname: defaultValues?.lastname || "",
      phone: defaultValues?.phone || "",
      company: defaultValues?.company || "",
      website: defaultValues?.website || "",
      lifecyclestage: defaultValues?.lifecyclestage || "",
      companyName: defaultValues?.companyName || "",
      domain: defaultValues?.domain || "",
      dealName: defaultValues?.dealName || "",
      dealStage: defaultValues?.dealStage || "",
      amount: defaultValues?.amount || "",
      subject: defaultValues?.subject || "",
      content: defaultValues?.content || "",
      priority: defaultValues?.priority || "",
      status: defaultValues?.status || "",
      category: defaultValues?.category || "",
      conversationId: defaultValues?.conversationId || "",
      contactId: defaultValues?.contactId || "",
      companyId: defaultValues?.companyId || "",
      dealId: defaultValues?.dealId || "",
      ticketId: defaultValues?.ticketId || "",
      customProperties: defaultValues?.customProperties || "",
      limit: defaultValues?.limit || "",
      searchQuery: defaultValues?.searchQuery || "",
    },
  });

  const resource = form.watch("resource");
  const operation = form.watch("operation");

  // Get available operations for selected resource
  const getOperations = () => {
    const operations: Record<string, { value: string; label: string }[]> = {
      contact: [
        { value: "upsert", label: "Create or Update" },
        { value: "get", label: "Get" },
        { value: "getMany", label: "Get Many" },
        { value: "delete", label: "Delete" },
        { value: "search", label: "Search" },
      ],
      company: [
        { value: "create", label: "Create" },
        { value: "get", label: "Get" },
        { value: "getMany", label: "Get Many" },
        { value: "searchByDomain", label: "Search by Domain" },
      ],
      deal: [
        { value: "create", label: "Create" },
        { value: "get", label: "Get" },
        { value: "getMany", label: "Get Many" },
      ],
      ticket: [
        { value: "create", label: "Create" },
        { value: "get", label: "Get" },
        { value: "getMany", label: "Get Many" },
      ],
      conversation: [
        { value: "get", label: "Get" },
        { value: "getMany", label: "Get Many" },
      ],
    };
    return operations[resource] || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure HubSpot Node</DialogTitle>
          <DialogDescription>
            Manage contacts, companies, deals, tickets, and conversations in HubSpot CRM
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
                    <Input placeholder="hubspotResult" {...field} />
                  </FormControl>
                  <FormDescription>
                    Name to store the result (e.g., hubspotContact)
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
                  <FormLabel>HubSpot Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select HubSpot credential" />
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
                                src="/logos/hubspot.svg"
                                alt="HubSpot"
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
                    Select your HubSpot App Token credential
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
                      <SelectItem value="contact">Contact</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="deal">Deal</SelectItem>
                      <SelectItem value="ticket">Ticket</SelectItem>
                      <SelectItem value="conversation">Conversation</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the HubSpot CRM object type
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
                      {getOperations().map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the operation to perform
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CONTACT FIELDS */}
            {resource === "contact" && (
              <>
                {(operation === "upsert") && (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="{{trigger.email}}"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Contact email (required, supports Handlebars)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firstname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl>
                            <Input placeholder="Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lifecyclestage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lifecycle Stage</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="subscriber">Subscriber</SelectItem>
                              <SelectItem value="lead">Lead</SelectItem>
                              <SelectItem value="marketingqualifiedlead">Marketing Qualified Lead</SelectItem>
                              <SelectItem value="salesqualifiedlead">Sales Qualified Lead</SelectItem>
                              <SelectItem value="opportunity">Opportunity</SelectItem>
                              <SelectItem value="customer">Customer</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {(operation === "get" || operation === "delete") && (
                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact ID</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormDescription>
                          HubSpot contact ID or email
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(operation === "getMany" || operation === "search") && (
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="100" type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Maximum number of results (max 100)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {operation === "search" && (
                  <FormField
                    control={form.control}
                    name="searchQuery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Search Query</FormLabel>
                        <FormControl>
                          <Input placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Search by email (supports Handlebars)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* COMPANY FIELDS */}
            {resource === "company" && (
              <>
                {operation === "create" && (
                  <>
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corp" {...field} />
                          </FormControl>
                          <FormDescription>
                            Company name (required, supports Handlebars)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="domain"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Domain</FormLabel>
                          <FormControl>
                            <Input placeholder="acme.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {operation === "get" && (
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company ID</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {operation === "searchByDomain" && (
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain</FormLabel>
                        <FormControl>
                          <Input placeholder="acme.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          Search company by domain name
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {operation === "getMany" && (
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="100" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* DEAL FIELDS */}
            {resource === "deal" && (
              <>
                {operation === "create" && (
                  <>
                    <FormField
                      control={form.control}
                      name="dealName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="New Deal" {...field} />
                          </FormControl>
                          <FormDescription>
                            Deal name (required, supports Handlebars)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dealStage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Deal Stage</FormLabel>
                          <FormControl>
                            <Input placeholder="appointmentscheduled" {...field} />
                          </FormControl>
                          <FormDescription>
                            Deal stage ID from your pipeline
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="10000" type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {operation === "get" && (
                  <FormField
                    control={form.control}
                    name="dealId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deal ID</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {operation === "getMany" && (
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="100" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* TICKET FIELDS */}
            {resource === "ticket" && (
              <>
                {operation === "create" && (
                  <>
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject *</FormLabel>
                          <FormControl>
                            <Input placeholder="Support Request" {...field} />
                          </FormControl>
                          <FormDescription>
                            Ticket subject (required, supports Handlebars)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="priority"
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
                              <SelectItem value="LOW">Low</SelectItem>
                              <SelectItem value="MEDIUM">Medium</SelectItem>
                              <SelectItem value="HIGH">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="Support" {...field} />
                          </FormControl>
                          <FormDescription>
                            Ticket category (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {operation === "get" && (
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

                {operation === "getMany" && (
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="100" type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* CONVERSATION FIELDS */}
            {resource === "conversation" && (
              <>
                {operation === "get" && (
                  <FormField
                    control={form.control}
                    name="conversationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conversation ID</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" {...field} />
                        </FormControl>
                        <FormDescription>
                          HubSpot conversation thread ID
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {operation === "getMany" && (
                  <FormField
                    control={form.control}
                    name="limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limit</FormLabel>
                        <FormControl>
                          <Input placeholder="100" type="number" {...field} />
                        </FormControl>
                        <FormDescription>
                          Maximum number of conversations to retrieve
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* CUSTOM PROPERTIES (ALL RESOURCES) */}
            {(resource === "contact" || resource === "company" || resource === "deal" || resource === "ticket") && 
             (operation === "upsert" || operation === "create") && (
              <FormField
                control={form.control}
                name="customProperties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Properties (JSON, Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"custom_field": "value"}'
                        className="min-h-[100px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional properties in JSON format (supports Handlebars)
                    </FormDescription>
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
