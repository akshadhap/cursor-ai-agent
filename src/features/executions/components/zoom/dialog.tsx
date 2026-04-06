"use client";

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useCredentialsByType } from "@/features/credentials/hooks/use-credentials";
import { CredentialType } from "@/generated/prisma";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  variableName: z
    .string()
    .min(1, { message: "Variable name is required" })
    .regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/, {
      message:
        "Variable name must start with a letter or underscore and contain only letters, numbers, and underscores",
    }),
  credentialId: z.string().min(1, "Credential is required"),
  operation: z.string().min(1, "Operation is required"),
  // Meeting ID (for get, update, delete)
  meetingId: z.string().optional(),
  // Create/Update fields
  meetingTopic: z.string().optional(),
  meetingDescription: z.string().optional(),
  duration: z.string().optional(),
  startTime: z.string().optional(),
  timezone: z.string().optional(),
  // List options
  pageSize: z.coerce.number().optional(),
});

export type ZoomFormValues = z.infer<typeof formSchema>;

type ZoomOperation =
  | "create_meeting"
  | "get_meeting"
  | "update_meeting"
  | "delete_meeting"
  | "list_meetings";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ZoomFormValues) => void;
  defaultValues?: Partial<ZoomFormValues>;
}

export const ZoomDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues = {},
}: Props) => {
  const {
    data: credentials,
    isLoading: isLoadingCredentials,
  } = useCredentialsByType(CredentialType.ZOOM);

  const form = useForm<ZoomFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues.variableName || "",
      credentialId: defaultValues.credentialId || "",
      operation: defaultValues.operation || "create_meeting",
      meetingId: defaultValues.meetingId || "",
      meetingTopic: defaultValues.meetingTopic || "",
      meetingDescription: defaultValues.meetingDescription || "",
      duration: defaultValues.duration || "30",
      startTime: defaultValues.startTime || "",
      timezone: defaultValues.timezone || "UTC",
      pageSize: defaultValues.pageSize || 30,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        variableName: defaultValues.variableName || "",
        credentialId: defaultValues.credentialId || "",
        operation: defaultValues.operation || "create_meeting",
        meetingId: defaultValues.meetingId || "",
        meetingTopic: defaultValues.meetingTopic || "",
        meetingDescription: defaultValues.meetingDescription || "",
        duration: defaultValues.duration || "30",
        startTime: defaultValues.startTime || "",
        timezone: defaultValues.timezone || "UTC",
        pageSize: defaultValues.pageSize || 30,
      });
    }
  }, [open, defaultValues, form]);

  const operation = useWatch({ control: form.control, name: "operation" }) as ZoomOperation;
  const watchVariableName = form.watch("variableName") || "meeting";

  const handleSubmit = (values: ZoomFormValues) => {
    onSubmit(values);
    onOpenChange(false);
  };

  // Conditional field visibility
  const showMeetingId = ["get_meeting", "update_meeting", "delete_meeting"].includes(operation);
  const showCreateFields = ["create_meeting", "update_meeting"].includes(operation);
  const showListOptions = operation === "list_meetings";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Zoom Meeting</DialogTitle>
          <DialogDescription>
            Configure the meeting operation for this node.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 mt-4"
          >
            {/* Credential Selector */}
            <FormField
              control={form.control}
              name="credentialId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zoom Credential</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingCredentials || !credentials?.length}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a credential" />
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
                                src="/logos/zoom.svg"
                                alt="Zoom"
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
                  {(!credentials || credentials.length === 0) && !isLoadingCredentials && (
                    <FormDescription>
                      <Link href="/credentials/new" className="text-primary underline">
                        Create a Zoom credential
                      </Link>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Operation Selector */}
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
                      <SelectItem value="create_meeting">Create Meeting</SelectItem>
                      <SelectItem value="get_meeting">Get Meeting</SelectItem>
                      <SelectItem value="update_meeting">Update Meeting</SelectItem>
                      <SelectItem value="delete_meeting">Delete Meeting</SelectItem>
                      <SelectItem value="list_meetings">List Meetings</SelectItem>
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
                    <Input placeholder="meeting" {...field} />
                  </FormControl>
                  <FormDescription>
                    Use this name to reference the result: {`{{${watchVariableName}.zoom.join_url}}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meeting ID (for get, update, delete) */}
            {showMeetingId && (
              <FormField
                control={form.control}
                name="meetingId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting ID</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormDescription>
                      The Zoom meeting ID. Supports variables like {`{{previousNode.zoom.id}}`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Create/Update Fields */}
            {showCreateFields && (
              <>
                <FormField
                  control={form.control}
                  name="meetingTopic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Topic</FormLabel>
                      <FormControl>
                        <Input placeholder="Sales Demo" {...field} />
                      </FormControl>
                      <FormDescription>
                        Supports Handlebars variables like {`{{lead.name}}`}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="meetingDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Meeting details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (min)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone</FormLabel>
                        <FormControl>
                          <Input placeholder="UTC" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* List Options */}
            {showListOptions && (
              <FormField
                control={form.control}
                name="pageSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of meetings to return (max 300)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
