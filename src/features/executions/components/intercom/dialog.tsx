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

const intercomFormSchema = z.object({
  variableName: z.string().min(1, "Variable name is required"),
  credentialId: z.string().min(1, "Credential is required"),
  resource: z.enum(["contact", "conversation", "company"]),
  operation: z.string().min(1, "Operation is required"),
  contactId: z.string().optional(),
  conversationId: z.string().optional(),
  companyId: z.string().optional(),
  email: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  customAttributes: z.string().optional(),
  messageBody: z.string().optional(),
  messageType: z.string().optional(),
  query: z.string().optional(),
});

export type IntercomFormValues = z.infer<typeof intercomFormSchema>;

type IntercomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: IntercomFormValues) => void;
  defaultValues?: Partial<IntercomFormValues>;
};

export const IntercomDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: IntercomDialogProps) => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
  } = useCredentialsByType(CredentialType.INTERCOM);

  const { theme, systemTheme } = useTheme();
  const currentTheme = theme === "system" ? systemTheme : theme;

  const form = useForm<IntercomFormValues>({
    resolver: zodResolver(intercomFormSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "intercomResult",
      credentialId: defaultValues?.credentialId || "",
      resource: defaultValues?.resource || "contact",
      operation: defaultValues?.operation || "list",
      contactId: defaultValues?.contactId || "",
      conversationId: defaultValues?.conversationId || "",
      companyId: defaultValues?.companyId || "",
      email: defaultValues?.email || "",
      name: defaultValues?.name || "",
      phone: defaultValues?.phone || "",
      customAttributes: defaultValues?.customAttributes || "",
      messageBody: defaultValues?.messageBody || "",
      messageType: defaultValues?.messageType || "comment",
      query: defaultValues?.query || "",
    },
  });

  const resource = form.watch("resource");
  const operation = form.watch("operation");

  const getOperations = () => {
    const operations: Record<string, { value: string; label: string }[]> = {
      contact: [
        { value: "list", label: "List Contacts" },
        { value: "get", label: "Get Contact" },
        { value: "create", label: "Create Contact" },
        { value: "update", label: "Update Contact" },
        { value: "delete", label: "Delete Contact" },
        { value: "search", label: "Search Contacts" },
      ],
      conversation: [
        { value: "list", label: "List Conversations" },
        { value: "get", label: "Get Conversation" },
        { value: "reply", label: "Reply to Conversation" },
      ],
      company: [
        { value: "list", label: "List Companies" },
        { value: "get", label: "Get Company" },
        { value: "create", label: "Create Company" },
      ],
    };
    return operations[resource] || [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Intercom Node</DialogTitle>
          <DialogDescription>
            Manage contacts, conversations, and companies in Intercom
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
                    <Input placeholder="intercomResult" {...field} />
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
                  <FormLabel>Intercom Credential</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Intercom credential" />
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
                                src={currentTheme === "dark" ? "/logos/intercom-white.svg" : "/logos/intercom.svg"}
                                alt="Intercom"
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
                    Select your Intercom Access Token credential
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
                      <SelectItem value="conversation">Conversation</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
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

            {/* Contact ID - for get, update, delete contact */}
            {resource === "contact" && ["get", "update", "delete"].includes(operation) && (
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Contact fields - for create, update */}
            {resource === "contact" && ["create", "update"].includes(operation) && (
              <>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="user@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
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
                  name="phone"
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
                  name="customAttributes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Attributes (JSON, Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{"plan": "premium", "company": "Acme"}'
                          className="min-h-[80px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Search query */}
            {resource === "contact" && operation === "search" && (
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Query (JSON)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='{"field": "email", "operator": "=", "value": "user@example.com"}'
                        className="min-h-[80px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Intercom search query object
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Conversation ID */}
            {resource === "conversation" && ["get", "reply"].includes(operation) && (
              <FormField
                control={form.control}
                name="conversationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Conversation ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Conversation ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Reply fields */}
            {resource === "conversation" && operation === "reply" && (
              <>
                <FormField
                  control={form.control}
                  name="messageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="comment">Comment</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="messageBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Your reply message..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Company ID */}
            {resource === "company" && operation === "get" && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Company ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Company create fields */}
            {resource === "company" && operation === "create" && (
              <>
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company ID (External)</FormLabel>
                      <FormControl>
                        <Input placeholder="your-company-id" {...field} />
                      </FormControl>
                      <FormDescription>
                        Your unique identifier for this company
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Inc." {...field} />
                      </FormControl>
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
