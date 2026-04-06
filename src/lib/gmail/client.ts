/**
 * Gmail API Client for SpinaBOT
 * Simplified version adapted from spinabot-classifier
 */

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

interface GmailMessagePart {
    partId: string;
    mimeType: string;
    filename?: string;
    body?: {
        attachmentId?: string;
        size?: number;
        data?: string;
    };
    parts?: GmailMessagePart[];
}

interface GmailMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    payload?: {
        headers: Array<{ name: string; value: string }>;
        body?: { data?: string };
        mimeType?: string;
        parts?: GmailMessagePart[];
    };
    internalDate: string;
}

interface GmailListResponse {
    messages: Array<{ id: string; threadId: string }>;
    nextPageToken?: string;
}

interface Attachment {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
}

/**
 * Decode base64url encoded string (Gmail API format)
 */
function decodeBase64Url(data: string): string {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    try {
        return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
        console.error("Failed to decode base64:", e);
        return "";
    }
}

/**
 * Extract header value from Gmail message
 */
function getHeader(message: GmailMessage, headerName: string): string {
    const header = message.payload?.headers.find(
        (h) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header?.value || "";
}

/**
 * Parse email body from Gmail message
 */
function parseEmailBody(message: GmailMessage): string {
    if (!message.payload) return message.snippet || "";

    // Try to get plain text body
    const bodyData = message.payload.body?.data;
    if (bodyData) {
        return decodeBase64Url(bodyData);
    }

    // If no direct body, use snippet
    return message.snippet || "";
}

/**
 * Extract attachments from Gmail message parts (recursive)
 */
function extractAttachments(parts: GmailMessagePart[] | undefined, messageId: string): Attachment[] {
    if (!parts) return [];

    const attachments: Attachment[] = [];

    for (const part of parts) {
        // Check if this part is an attachment (has filename and attachmentId)
        if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
            attachments.push({
                id: part.body.attachmentId,
                filename: part.filename,
                mimeType: part.mimeType,
                size: part.body.size || 0,
            });
        }

        // Recursively check nested parts
        if (part.parts) {
            attachments.push(...extractAttachments(part.parts, messageId));
        }
    }

    return attachments;
}

/**
 * Fetch single email details
 */
export async function getGmailMessage(accessToken: string, messageId: string): Promise<any> {
    const url = `${GMAIL_API_BASE}/users/me/messages/${messageId}`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const message = await response.json();

    return {
        id: message.id,
        threadId: message.threadId,
        subject: getHeader(message, "Subject"),
        from: getHeader(message, "From"),
        to: getHeader(message, "To"),
        date: new Date(parseInt(message.internalDate)).toISOString(),
        snippet: message.snippet,
        body: parseEmailBody(message),
        messageId: getHeader(message, "Message-ID"),
        references: getHeader(message, "References"),
        inReplyTo: getHeader(message, "In-Reply-To"),
    };
}

/**
 * Fetch email list from Gmail
 */
export async function fetchGmailEmails(
    accessToken: string,
    options: {
        maxResults?: number;
        pageToken?: string;
        labelIds?: string[];
        query?: string;
    } = {}
): Promise<{
    emails: Array<{
        id: string;
        threadId: string;
        subject: string;
        from: string;
        to: string;
        date: string;
        snippet: string;
        body: string;
        labels: string[];
        isRead: boolean;
        attachments: Attachment[];
    }>;
    nextPageToken?: string;
}> {
    const { maxResults = 25, pageToken, labelIds = ["INBOX"], query } = options;

    // Build query parameters
    const params = new URLSearchParams({
        maxResults: maxResults.toString(),
        ...(pageToken && { pageToken }),
        ...(labelIds.length > 0 && { labelIds: labelIds.join(",") }),
        ...(query && { q: query }),
    });

    // Fetch message list
    const listUrl = `${GMAIL_API_BASE}/users/me/messages?${params}`;
    const listResponse = await fetch(listUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!listResponse.ok) {
        const error = await listResponse.text();
        throw new Error(`Failed to fetch emails: ${error}`);
    }

    const listData: GmailListResponse = await listResponse.json();

    if (!listData.messages || listData.messages.length === 0) {
        return { emails: [], nextPageToken: listData.nextPageToken };
    }

    // Fetch full message details
    const emails = await Promise.all(
        listData.messages.map(async (msg) => {
            const msgUrl = `${GMAIL_API_BASE}/users/me/messages/${msg.id}`;
            const msgResponse = await fetch(msgUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (!msgResponse.ok) {
                console.error(`Failed to fetch message ${msg.id}`);
                return null;
            }

            const message: GmailMessage = await msgResponse.json();

            return {
                id: message.id,
                threadId: message.threadId,
                subject: getHeader(message, "Subject"),
                from: getHeader(message, "From"),
                to: getHeader(message, "To"),
                date: new Date(parseInt(message.internalDate)).toISOString(),
                snippet: message.snippet,
                body: parseEmailBody(message),
                labels: message.labelIds || [],
                isRead: !message.labelIds?.includes("UNREAD"),
                attachments: extractAttachments(message.payload?.parts, message.id),
            };
        })
    );

    // Filter out null values
    const validEmails = emails.filter((email) => email !== null) as Array<{
        id: string;
        threadId: string;
        subject: string;
        from: string;
        to: string;
        date: string;
        snippet: string;
        body: string;
        labels: string[];
        isRead: boolean;
        attachments: Attachment[];
    }>;

    // Log unique IDs to verify no duplicates
    const uniqueIds = new Set(validEmails.map(e => e.id));
    console.log(`[Gmail Client] Fetched ${validEmails.length} emails, ${uniqueIds.size} unique IDs`);
    if (validEmails.length > 0) {
        console.log(`[Gmail Client] Sample: ${validEmails[0].subject} from ${validEmails[0].from}`);
    }

    return {
        emails: validEmails,
        nextPageToken: listData.nextPageToken,
    };
}

/**
 * Get Gmail user profile
 */
export async function getGmailProfile(accessToken: string): Promise<{
    emailAddress: string;
    messagesTotal: number;
    threadsTotal: number;
}> {
    const url = `${GMAIL_API_BASE}/users/me/profile`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to fetch profile: ${error}`);
    }

    return response.json();
}

/**
 * Encode string to Base64Url (RFC 4648)
 */
function encodeBase64Url(str: string): string {
    return Buffer.from(str)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/**
 * Create RFC 822 email string
 */
function createEmailRaw(to: string, subject: string, body: string, threadId?: string): string {
    const emailLines = [
        `To: ${to}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        `Subject: ${subject}`,
        "",
        body,
    ];

    if (threadId) {
        // Note: For threading to work, In-Reply-To and References headers are usually needed,
        // but passing threadId to the API is often sufficient for basic grouping.
        // We will pass threadId in the message object, not the raw content for now.
    }

    return emailLines.join("\r\n");
}

/**
 * Create a draft in Gmail
 */
export async function createGmailDraft(
    accessToken: string,
    draft: {
        to: string;
        subject: string;
        body: string;
        threadId?: string;
    }
): Promise<{ output: any, error?: string }> {
    const raw = encodeBase64Url(createEmailRaw(draft.to, draft.subject, draft.body, draft.threadId));

    const messagePayload: any = {
        raw,
    };

    if (draft.threadId) {
        messagePayload.threadId = draft.threadId;
    }

    const url = `${GMAIL_API_BASE}/users/me/drafts`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: messagePayload,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Failed to create draft:", error);
            return { output: null, error };
        }

        const data = await response.json();
        return { output: data };
    } catch (e: any) {
        console.error("Draft creation exception:", e);
        return { output: null, error: e.message };
    }
}

/**
 * Get Google User Info (Profile & Email)
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch user info");
    }

    return response.json();
}
