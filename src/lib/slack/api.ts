/**
 * Slack API Helper
 * Handles OAuth exchange and message sending
 */

const SLACK_API_URL = 'https://slack.com/api';

interface SlackTokenResponse {
    ok: boolean;
    access_token?: string;
    bot_user_id?: string;
    team?: { name: string; id: string };
    error?: string;
}

interface SlackMessageResponse {
    ok: boolean;
    error?: string;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeSlackCode(code: string): Promise<SlackTokenResponse> {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/standalone-agents/gmail-classifier/slack-callback`;

    const formData = new URLSearchParams();
    formData.append('code', code);
    formData.append('client_id', clientId || '');
    formData.append('client_secret', clientSecret || '');
    formData.append('redirect_uri', redirectUri);

    const response = await fetch(`${SLACK_API_URL}/oauth.v2.access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });

    return await response.json();
}

/**
 * Send a message to a Slack channel
 */
export async function sendSlackMessage(
    token: string,
    channelId: string,
    text: string,
    blocks?: any[]
): Promise<SlackMessageResponse> {
    const response = await fetch(`${SLACK_API_URL}/chat.postMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            channel: channelId,
            text: text,
            blocks: blocks
        })
    });

    return await response.json();
}
