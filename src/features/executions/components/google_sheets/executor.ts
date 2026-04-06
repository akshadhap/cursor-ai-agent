import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import ky from "ky";
import type { NodeExecutor } from "@/features/executions/types";
import { googleSheetsChannel } from "@/inngest/channels/google_sheets";
import prisma from "@/lib/db";
import { decrypt } from "@/lib/encryption";

Handlebars.registerHelper("json", (context) => {
    const jsonString = JSON.stringify(context, null, 2);
    return new Handlebars.SafeString(jsonString);
});

const GOOGLE_SHEETS_BASE_URL = "https://sheets.googleapis.com/v4";

type GoogleSheetsData = {
    variableName?: string;
    credentialId?: string;
    operation?: string;
    spreadsheetId?: string;
    range?: string;
    values?: string;
    valueInputOption?: string;
    insertDataOption?: string;
};

export const googleSheetsExecutor: NodeExecutor<GoogleSheetsData> = async ({
    data,
    nodeId,
    context,
    step,
    publish,
    userId,
}) => {
    await publish(
        googleSheetsChannel().status({
            nodeId,
            status: "loading",
        }),
    );

    if (!data.credentialId) {
        await publish(
            googleSheetsChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Google Sheets node: Credential is required");
    }

    const credential = await step.run("fetch-google-sheets-credential", async () => {
        return prisma.credential.findFirst({
            where: {
                id: data.credentialId,
                userId,
            },
        });
    });

    if (!credential) {
        await publish(
            googleSheetsChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Google Sheets node: Credential not found");
    }

    // Parse credential - supports JSON with accessToken or plain token
    let accessToken: string;
    const decryptedValue = await decrypt(credential.value);

    try {
        const parsed = JSON.parse(decryptedValue);
        accessToken = parsed.accessToken || parsed.access_token || decryptedValue;
    } catch {
        // Assume it's a plain access token
        accessToken = decryptedValue;
    }

    if (!data.variableName) {
        await publish(
            googleSheetsChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw new NonRetriableError("Google Sheets node: Variable name is missing");
    }

    const operation = data.operation || "read_values";

    const template = (value?: string) => {
        if (!value) return "";
        try {
            return Handlebars.compile(value)(context);
        } catch {
            return value;
        }
    };

    const safeParseJson = <T>(value: string | undefined, defaultValue: T): T => {
        if (!value || !value.trim()) return defaultValue;
        try {
            return JSON.parse(value);
        } catch (err) {
            const error = err as Error;
            const preview = value.length > 100 ? value.substring(0, 100) + "..." : value;
            throw new NonRetriableError(`Invalid JSON (${error.message}). Preview: ${preview}`);
        }
    };

    const buildRequest = async () => {
        const headers = {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        };

        const spreadsheetId = template(data.spreadsheetId);
        if (!spreadsheetId && operation !== "get_spreadsheet") {
            throw new NonRetriableError("Google Sheets: Spreadsheet ID is required");
        }

        // GET SPREADSHEET INFO
        if (operation === "get_spreadsheet") {
            if (!spreadsheetId) {
                throw new NonRetriableError("Google Sheets: Spreadsheet ID is required");
            }
            const res = await ky.get(`${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${spreadsheetId}`, { headers });
            return await res.json();
        }

        // READ VALUES
        if (operation === "read_values") {
            const range = template(data.range) || "Sheet1!A1:Z100";
            const res = await ky.get(
                `${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
                { headers }
            );
            return await res.json();
        }

        // WRITE VALUES
        if (operation === "write_values") {
            const range = template(data.range) || "Sheet1!A1";
            const valuesStr = template(data.values);
            const values = safeParseJson<string[][]>(valuesStr, []);
            const valueInputOption = data.valueInputOption || "USER_ENTERED";

            const res = await ky.put(
                `${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
                {
                    headers,
                    searchParams: { valueInputOption },
                    json: { values },
                }
            );
            return await res.json();
        }

        // APPEND ROW
        if (operation === "append_row") {
            const range = template(data.range) || "Sheet1!A1";
            const valuesStr = template(data.values);
            const values = safeParseJson<string[][]>(valuesStr, []);
            const valueInputOption = data.valueInputOption || "USER_ENTERED";
            const insertDataOption = data.insertDataOption || "INSERT_ROWS";

            const res = await ky.post(
                `${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
                {
                    headers,
                    searchParams: { valueInputOption, insertDataOption },
                    json: { values },
                }
            );
            return await res.json();
        }

        // CLEAR VALUES
        if (operation === "clear_values") {
            const range = template(data.range) || "Sheet1!A1:Z100";

            const res = await ky.post(
                `${GOOGLE_SHEETS_BASE_URL}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`,
                { headers, json: {} }
            );
            return await res.json();
        }

        throw new NonRetriableError(
            `Google Sheets node: Unsupported operation: ${operation}`
        );
    };

    try {
        const result = await step.run(`google-sheets-${operation}`, buildRequest);

        await publish(
            googleSheetsChannel().status({
                nodeId,
                status: "success",
            }),
        );

        return {
            ...context,
            [data.variableName]: result,
        };
    } catch (error) {
        await publish(
            googleSheetsChannel().status({
                nodeId,
                status: "error",
            }),
        );
        throw error;
    }
};
