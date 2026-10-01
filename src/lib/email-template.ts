/**
 * The one and only AfroPitch branded email template.
 *
 * EVERY email AfroPitch sends must be wrapped in this template. No exceptions,
 * no inline copies, no alternate themes. Import and use `brandedEmail()`.
 */
export function brandedEmail(bodyHtml: string): string {
    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">AfroPitch Play</h1>
            </div>
            <div style="padding: 30px 20px; background: white; color: #333; font-size: 16px; line-height: 1.6;">
                ${bodyHtml}
            </div>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                    &copy; 2026 AfroPitch Play. All rights reserved.
                </p>
            </div>
        </div>
    `;
}
