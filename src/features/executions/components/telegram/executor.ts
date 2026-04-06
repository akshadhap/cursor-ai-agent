import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { telegramChannel } from "@/inngest/channels/telegram";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
  const jsonString = JSON.stringify(context, null, 2);
  return new Handlebars.SafeString(jsonString);
});

type TelegramData = {
  variableName?: string;
  credentialId?: string;
  resource?: string;
  operation?: string;
  chatId?: string;
  text?: string;
  photo?: string;
  document?: string;
  caption?: string;
  parseMode?: string;
  messageId?: string;
  disableNotification?: string;
};

export const telegramExecutor: NodeExecutor<TelegramData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
  userId,
}) => {
  await publish(
    telegramChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    // Fetch credential
    const credential = await step.run("fetch-telegram-credential", async () => {
      if (!data?.credentialId) {
        throw new NonRetriableError("No Telegram credential selected");
      }

      return prisma.credential.findFirst({
        where: {
          id: data.credentialId,
          userId,
        },
      });
    });

    if (!credential) {
      throw new NonRetriableError("Telegram credential not found");
    }

    // Decrypt bot token
    const botToken = await decrypt(credential.value);

    if (!botToken) {
      throw new NonRetriableError("Invalid Telegram Bot Token");
    }

    // Build base URL
    const baseUrl = `https://api.telegram.org/bot${botToken.trim()}`;

    console.log("[Telegram Executor] Using baseUrl:", baseUrl.substring(0, 40) + "...");

    // Template helper for dynamic values
    const template = (str?: string): string => {
      if (!str) return "";
      try {
        const compiled = Handlebars.compile(str);
        return compiled(context);
      } catch {
        return str;
      }
    };

    // Execute API request
    const result = await step.run("telegram-api-request", async () => {
      const { resource, operation } = data;

      if (!resource || !operation) {
        throw new NonRetriableError("Resource and operation are required");
      }

      // Message operations
      if (resource === "message") {
        const chatId = template(data.chatId);

        if (operation === "sendText") {
          if (!chatId) throw new NonRetriableError("Chat ID is required");
          const text = template(data.text);
          if (!text) throw new NonRetriableError("Message text is required");

          const body: Record<string, unknown> = {
            chat_id: chatId,
            text,
          };

          if (data.parseMode && data.parseMode !== "none") body.parse_mode = data.parseMode;
          if (data.disableNotification === "true") body.disable_notification = true;

          return ky.post(`${baseUrl}/sendMessage`, { json: body }).json();
        }

        if (operation === "sendPhoto") {
          if (!chatId) throw new NonRetriableError("Chat ID is required");
          const photo = template(data.photo);
          if (!photo) throw new NonRetriableError("Photo URL is required");

          const body: Record<string, unknown> = {
            chat_id: chatId,
            photo,
          };

          if (data.caption) body.caption = template(data.caption);
          if (data.parseMode && data.parseMode !== "none") body.parse_mode = data.parseMode;
          if (data.disableNotification === "true") body.disable_notification = true;

          return ky.post(`${baseUrl}/sendPhoto`, { json: body }).json();
        }

        if (operation === "sendDocument") {
          if (!chatId) throw new NonRetriableError("Chat ID is required");
          const document = template(data.document);
          if (!document) throw new NonRetriableError("Document URL is required");

          const body: Record<string, unknown> = {
            chat_id: chatId,
            document,
          };

          if (data.caption) body.caption = template(data.caption);
          if (data.parseMode && data.parseMode !== "none") body.parse_mode = data.parseMode;
          if (data.disableNotification === "true") body.disable_notification = true;

          return ky.post(`${baseUrl}/sendDocument`, { json: body }).json();
        }

        if (operation === "editText") {
          if (!chatId) throw new NonRetriableError("Chat ID is required");
          const messageId = template(data.messageId);
          if (!messageId) throw new NonRetriableError("Message ID is required");
          const text = template(data.text);
          if (!text) throw new NonRetriableError("Message text is required");

          const body: Record<string, unknown> = {
            chat_id: chatId,
            message_id: parseInt(messageId, 10),
            text,
          };

          if (data.parseMode && data.parseMode !== "none") body.parse_mode = data.parseMode;

          return ky.post(`${baseUrl}/editMessageText`, { json: body }).json();
        }

        if (operation === "delete") {
          if (!chatId) throw new NonRetriableError("Chat ID is required");
          const messageId = template(data.messageId);
          if (!messageId) throw new NonRetriableError("Message ID is required");

          return ky.post(`${baseUrl}/deleteMessage`, {
            json: {
              chat_id: chatId,
              message_id: parseInt(messageId, 10),
            },
          }).json();
        }
      }

      // Chat operations
      if (resource === "chat") {
        const chatId = template(data.chatId);
        if (!chatId) throw new NonRetriableError("Chat ID is required");

        if (operation === "getInfo") {
          return ky.post(`${baseUrl}/getChat`, {
            json: { chat_id: chatId },
          }).json();
        }

        if (operation === "getMembersCount") {
          return ky.post(`${baseUrl}/getChatMemberCount`, {
            json: { chat_id: chatId },
          }).json();
        }
      }

      // Bot operations
      if (resource === "bot") {
        if (operation === "getMe") {
          return ky.post(`${baseUrl}/getMe`).json();
        }

        if (operation === "getUpdates") {
          return ky.post(`${baseUrl}/getUpdates`, {
            json: { limit: 100 },
          }).json();
        }
      }

      throw new NonRetriableError(`Unsupported operation: ${resource}.${operation}`);
    });

    await publish(
      telegramChannel().status({
        nodeId,
        status: "success",
      }),
    );

    const variableName = data?.variableName || "telegramResult";
    return {
      ...context,
      [variableName]: result,
    };
  } catch (error) {
    await publish(
      telegramChannel().status({
        nodeId,
        status: "error",
      }),
    );

    if (error instanceof NonRetriableError) {
      throw error;
    }

    // Try to extract detailed error from ky HTTPError
    if (error && typeof error === 'object' && 'response' in error) {
      try {
        const response = (error as { response: Response }).response;
        const errorBody = await response.text();
        console.error("[Telegram Executor] API Error Response:", errorBody);
        throw new NonRetriableError(`Telegram API error (${response.status}): ${errorBody}`);
      } catch (parseError) {
        if (parseError instanceof NonRetriableError) throw parseError;
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new NonRetriableError(`Telegram API error: ${errorMessage}`);
  }
};
