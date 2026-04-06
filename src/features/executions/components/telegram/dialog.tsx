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
  chatId: z.string().optional(),
  text: z.string().optional(),
  photo: z.string().optional(),
  document: z.string().optional(),
  caption: z.string().optional(),
  parseMode: z.string().optional(),
  messageId: z.string().optional(),
  disableNotification: z.string().optional(),
});

export type TelegramFormValues = z.infer<typeof formSchema>;

const resources = [
  { value: "message", label: "Message" },
  { value: "chat", label: "Chat" },
  { value: "bot", label: "Bot" },
];

const operationsByResource: Record<string, { value: string; label: string }[]> = {
  message: [
    { value: "sendText", label: "Send Text Message" },
    { value: "sendPhoto", label: "Send Photo" },
    { value: "sendDocument", label: "Send Document" },
    { value: "editText", label: "Edit Message Text" },
    { value: "delete", label: "Delete Message" },
  ],
  chat: [
    { value: "getInfo", label: "Get Chat Info" },
    { value: "getMembersCount", label: "Get Members Count" },
  ],
  bot: [
    { value: "getMe", label: "Get Bot Info" },
    { value: "getUpdates", label: "Get Updates" },
  ],
};

const parseModes = [
  { value: "none", label: "None" },
  { value: "HTML", label: "HTML" },
  { value: "MarkdownV2", label: "MarkdownV2" },
  { value: "Markdown", label: "Markdown (Legacy)" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: TelegramFormValues) => void;
  defaultValues?: Partial<TelegramFormValues>;
}

export const TelegramDialog = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
}: Props) => {
  const form = useForm<TelegramFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variableName: defaultValues?.variableName || "telegramResult",
      credentialId: defaultValues?.credentialId || "",
      resource: defaultValues?.resource || "",
      operation: defaultValues?.operation || "",
      chatId: defaultValues?.chatId || "",
      text: defaultValues?.text || "",
      photo: defaultValues?.photo || "",
      document: defaultValues?.document || "",
      caption: defaultValues?.caption || "",
      parseMode: defaultValues?.parseMode || "",
      messageId: defaultValues?.messageId || "",
      disableNotification: defaultValues?.disableNotification || "",
    },
  });

  const { data: credentials } = useCredentialsByType(CredentialType.TELEGRAM);

  const selectedResource = form.watch("resource");
  const selectedOperation = form.watch("operation");
  const operations = selectedResource ? operationsByResource[selectedResource] || [] : [];

  const handleSubmit = (values: TelegramFormValues) => {
    onSubmit(values);
  };

  // Determine which fields to show
  const showChatId = selectedResource === "message" || selectedResource === "chat";
  const showText = selectedResource === "message" && ["sendText", "editText"].includes(selectedOperation || "");
  const showPhoto = selectedResource === "message" && selectedOperation === "sendPhoto";
  const showDocument = selectedResource === "message" && selectedOperation === "sendDocument";
  const showCaption = selectedResource === "message" && ["sendPhoto", "sendDocument"].includes(selectedOperation || "");
  const showParseMode = selectedResource === "message" && ["sendText", "editText", "sendPhoto", "sendDocument"].includes(selectedOperation || "");
  const showMessageId = selectedResource === "message" && ["editText", "delete"].includes(selectedOperation || "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img src="/logos/telegram.svg" alt="Telegram" className="size-6" />
            Telegram
          </DialogTitle>
          <DialogDescription>
            Send messages and interact with Telegram bots and chats.
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
                            <img src="/logos/telegram.svg" alt="" className="size-4" />
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

            {showChatId && (
              <FormField
                control={form.control}
                name="chatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chat ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123456789 or @channelname" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Numeric chat ID or @username for public channels
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showText && (
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter your message..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showPhoto && (
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Photo URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showDocument && (
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/file.pdf" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showCaption && (
              <FormField
                control={form.control}
                name="caption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caption (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Caption for the media" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showParseMode && (
              <FormField
                control={form.control}
                name="parseMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parse Mode (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parse mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parseModes.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showMessageId && (
              <FormField
                control={form.control}
                name="messageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 12345" {...field} />
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
                    <Input placeholder="telegramResult" {...field} />
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
