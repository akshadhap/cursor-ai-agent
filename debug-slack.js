require('dotenv').config({ path: '.env.local' });
const https = require('https');

async function debugSlack() {
    const token = process.env.SLACK_BOT_TOKEN;
    const channel = process.env.SLACK_CHANNEL_ID;

    console.log("Token configured:", token ? "YES (Starting with " + token.substring(0, 10) + "...)" : "NO");
    console.log("Channel ID:", channel);

    if (!token || !channel) {
        console.error("Missing credentials.");
        return;
    }

    const message = {
        channel: channel,
        text: "Test Message from Debug Script",
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Debug Test Message*\nIf you see this, the integration is working!"
                }
            }
        ]
    };

    const options = {
        hostname: 'slack.com',
        path: '/api/chat.postMessage',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log("Debugging Slack Response:");
            console.log("Status Code:", res.statusCode);
            console.log("Response Body:", data);

            try {
                const parsed = JSON.parse(data);
                if (parsed.ok) {
                    console.log("\n✅ SUCCESS: Message sent successfully!");
                } else {
                    console.error("\n❌ FAILED: Slack API Error:", parsed.error);
                    if (parsed.error === 'channel_not_found') {
                        console.log("-> Suggestion: The Bot is likely not in the channel. Run '/invite @YourBotName' in the channel.");
                    } else if (parsed.error === 'invalid_auth') {
                        console.log("-> Suggestion: Check your Bot Token.");
                    }
                }
            } catch (e) {
                console.error("Error parsing response:", e);
            }
        });
    });

    req.on('error', (e) => {
        console.error("Request Error:", e);
    });

    req.write(JSON.stringify(message));
    req.end();
}

debugSlack();
