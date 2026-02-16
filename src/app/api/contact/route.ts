
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'superlychy@gmail.com';
const DISCORD_WEBHOOK = process.env.ADMIN_WEBHOOK_URL;

export async function POST(request: Request) {
    try {
        const { email, subject, message } = await request.json();

        if (!email || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Send email to admin
        const { data, error } = await resend.emails.send({
            from: 'AfroPitch Contact <notifications@afropitchplay.best>',
            to: [ADMIN_EMAIL],
            subject: `Contact Form: ${subject}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h1 style="color: #16a34a;">New Contact Form Message</h1>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${email}</p>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="padding: 15px; background: white; border-left: 4px solid #16a34a;">
            <p style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777; text-align: center;">
            Reply directly to this email to respond to ${email}
          </p>
        </div>
      `,
            replyTo: email
        });

        if (error) {
            console.error('Resend API Error:', error);

            // Try Discord webhook as fallback
            if (DISCORD_WEBHOOK) {
                await fetch(DISCORD_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: `📧 **Contact Form Submission** (Email failed)\n**From:** ${email}\n**Subject:** ${subject}\n**Message:** ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`,
                        username: 'AfroPitch Bot'
                    })
                });
            }

            return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
        }

        // Also send Discord notification
        if (DISCORD_WEBHOOK) {
            try {
                await fetch(DISCORD_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: `📧 **New Contact Form Message**\n**From:** ${email}\n**Subject:** ${subject}\n**Preview:** ${message.substring(0, 150)}${message.length > 150 ? '...' : ''}`,
                        username: 'AfroPitch Bot'
                    })
                });
            } catch (e) {
                console.error('Discord webhook failed:', e);
            }
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
