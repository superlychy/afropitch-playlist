export async function sendDiscordNotification(message: string) {
    const webhookUrl = process.env.DISCORD_ANALYTICS_WEBHOOK_URL;

    if (!webhookUrl) {
        console.warn('DISCORD_ANALYTICS_WEBHOOK_URL is not set');
        return;
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: message,
                username: "AfroPitch Visitor Bot",
                avatar_url: "https://afropitchplay.best/logo.png" // assuming this exists
            }),
        });
    } catch (error) {
        console.error('Failed to send Discord notification:', error);
    }
}
