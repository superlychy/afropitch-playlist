
// ============================================================================
// AFROPITCH BRANDED EMAIL TEMPLATE
// The one and only email design. EVERY email AfroPitch sends must be wrapped
// in brandedEmail(). No exceptions, no alternate themes.
// ============================================================================
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

const btn = (href: string, label: string, bg = '#16a34a') =>
    `<div style="text-align: center; margin: 24px 0;"><a href="${href}" style="display: inline-block; padding: 12px 24px; background-color: ${bg}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">${label}</a></div>`;

export const getTransactionReceiptTemplate = (data: {
    name: string;
    currency: string;
    amount: number;
    transactionType: string;
    date: string;
    referenceId: string;
    description: string;
    paymentMethod: string;
    dashboardLink: string;
}) => brandedEmail(`
    <p>Hi ${data.name},</p>
    <p>Here is the receipt for your recent transaction.</p>
    <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Total Amount</div>
        <div style="font-size: 36px; font-weight: bold; color: #111; margin-top: 5px;">${data.currency}${data.amount.toLocaleString()}</div>
        <div style="margin-top: 10px;">
            <span style="background: #f0fdf4; color: #15803d; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; font-weight: bold;">${data.transactionType}</span>
            <span style="font-size: 12px; margin-left: 5px; color: #16a34a;">&#9679; Success</span>
        </div>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Date</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; color: #111; font-weight: bold;">${data.date}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Reference ID</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; font-family: monospace; color: #666;">${data.referenceId}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666;">Description</td><td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; color: #111; font-weight: bold;">${data.description}</td></tr>
        <tr><td style="padding: 12px 0; color: #666;">Payment Method</td><td style="padding: 12px 0; text-align: right; color: #111; font-weight: bold;">${data.paymentMethod}</td></tr>
    </table>
    <p style="margin-top: 30px; font-size: 13px; color: #888; text-align: center;">Transaction ID: ${data.referenceId}</p>
    ${btn(data.dashboardLink, 'View Wallet')}
`);

export const getSongApprovedTemplate = (data: {
    name: string;
    songTitle: string;
    playlistName: string;
    curatorName: string;
    playlistLink: string;
    dashboardLink: string;
    trackingLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">Good News! Your Song was Approved! 🚀</h2>
    <p>Hi ${data.name},</p>
    <p>We are thrilled to inform you that your song <strong>${data.songTitle}</strong> has been accepted into the following playlist:</p>

    <div style="background-color: #f0fdf4; border: 1px solid #16a34a; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="margin: 0; color: #111;">${data.playlistName}</h3>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #16a34a;">Curated by ${data.curatorName}</p>
    </div>

    <p>This is a huge step! Now, let's make sure you get the most out of this placement.</p>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; font-size: 14px; border-radius: 0 8px 8px 0;">
        <strong>📈 HOW TO RANK HIGHER (IMPORTANT):</strong>
        <p style="margin-top: 10px;">To grow and get ranked higher on the playlist, you <strong>must copy and share your unique tracking link</strong> below.</p>

        <a href="${data.trackingLink}" style="background: #f0fdf4; color: #16a34a; padding: 10px; border: 1px solid #bbf7d0; border-radius: 4px; font-family: monospace; word-break: break-all; margin: 10px 0; display: block; text-decoration: none; text-align: center;">${data.trackingLink}</a>
        <p style="font-size: 12px; text-align: center; color: #777;">(Copy this link to share)</p>

        <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Share the Link:</strong> We track traffic! Post the playlist link on your Instagram Stories, Twitter, and TikTok. Tag us @AfroPitch!</li>
            <li><strong>Encourage Saves:</strong> Ask your fans to "Like" the playlist and "Save" your song. This signals our algorithm to boost your track to higher positions.</li>
        </ul>
    </div>

    ${btn(data.dashboardLink, 'View Dashboard')}
`);

export const getSongDeclinedTemplate = (data: {
    name: string;
    songTitle: string;
    playlistName: string;
    feedback: string;
    refundAmount: string;
    dashboardLink: string;
}) => brandedEmail(`
    <p>Hi ${data.name},</p>
    <p>Regarding your submission of <strong>${data.songTitle}</strong> to <strong>${data.playlistName}</strong>.</p>
    <p>Unfortunately, the curator has decided not to add your track at this time. Here is their feedback:</p>

    <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic; color: #333;">"${data.feedback}"</div>

    <p style="color: #dc2626; font-weight: bold; margin-top: 10px; font-size: 14px;">Amount Refunded: ${data.refundAmount}</p>
    <p>This has been credited back to your wallet instantly. You can use it to submit to other playlists that might be a better fit.</p>
    <div style="margin: 25px 0; padding: 20px; background-color: #f0fdf4; border: 1px solid #16a34a; border-radius: 8px; text-align: center;">
        <p style="color: #111; font-weight: bold; margin: 0 0 8px 0;">Give your song the mix it deserves</p>
        <p style="color: #555; font-size: 14px; margin: 0 0 15px 0;">Most songs get rejected because they are not well mixed or arranged. Try mixing with AfroPitch &mdash; a professional engineer works on your track, and your payment stays in escrow until you love the mix.</p>
        <a href="https://afropitchplay.best/mixing" style="display: inline-block; background-color: #16a34a; color: #ffffff; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Mix my song with AfroPitch</a>
    </div>
`);

export const getSupportTicketTemplate = (data: {
    name: string;
    subject: string;
    status: string;
    dashboardLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0; margin-bottom: 4px;">AfroPitch Support replied</h2>
    <p style="color: #555; font-size: 14px;">Re: ${data.subject}</p>
    <p>Hi ${data.name},</p>
    <p>Your support ticket <strong>"${data.subject}"</strong> has been updated.</p>
    <p>Status: <strong>${data.status}</strong></p>
    <p>Please check your dashboard to view the latest response from our team.</p>
    ${btn(data.dashboardLink, 'View Ticket', '#2563eb')}
`);

export const getCuratorApprovedTemplate = (data: {
    name: string;
    playlistLink: string;
    signupLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">You're In! Curator Application Approved 🎉</h2>
    <p>Hi ${data.name},</p>
    <p>We're thrilled to welcome you to AfroPitch as a curator! Your application has been <strong>approved</strong>.</p>

    <div style="background-color: #f0fdf4; border: 1px solid #16a34a; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <h3 style="margin: 0; color: #111;">Application Approved</h3>
        <p style="margin: 5px 0 0 0; font-size: 12px; color: #16a34a;">${data.playlistLink}</p>
    </div>

    <p>One quick step to activate everything &mdash; create your curator account:</p>

    ${btn(data.signupLink, 'Create Your Curator Account')}

    <p>Once your account is set up, here's what happens next:</p>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; font-size: 14px; border-radius: 0 8px 8px 0;">
        <strong>🚀 GET STARTED AS A CURATOR:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Complete your profile:</strong> Head to your curator dashboard and make sure your playlists are listed and looking sharp.</li>
            <li><strong>Receive submissions:</strong> Artists will start pitching their songs to your playlists.</li>
            <li><strong>Review &amp; earn:</strong> Listen, accept the tracks you love, and earn on every submission you review.</li>
        </ul>
    </div>
`);

export const getCuratorVerifiedTemplate = (data: {
    name: string;
    dashboardLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">You're Verified! ✅</h2>
    <p>Hi ${data.name},</p>
    <p>Great news! Your AfroPitch curator account has been <strong>verified</strong>. Your playlists can now receive paid song submissions from artists.</p>

    ${btn(data.dashboardLink, 'Open Your Curator Dashboard')}

    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
        <strong>🚀 WHAT'S NEXT:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Add your playlists:</strong> make sure they're listed and looking sharp.</li>
            <li><strong>Receive submissions:</strong> artists will start pitching songs to you.</li>
            <li><strong>Review &amp; earn:</strong> listen, accept the tracks you love, and earn on every submission you review.</li>
        </ul>
    </div>
`);

export const getCuratorRejectedTemplate = (data: {
    name: string;
    dashboardLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">Update on Your Curator Application</h2>
    <p>Hi ${data.name},</p>
    <p>Thanks for applying to become a curator on AfroPitch. After reviewing your application, we weren't able to approve it this time.</p>
    <p>You're welcome to reapply in the future with an updated playlist or profile. If you have questions, just reply to this email.</p>
    ${btn(data.dashboardLink, 'Visit AfroPitch')}
`);

export const getMixingMessageTemplate = (data: {
    name: string;
    songTitle: string;
    snippet: string;
    dashboardLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">New message about your mix</h2>
    <p>Hi ${data.name},</p>
    <p>Your engineer replied about <strong>${data.songTitle}</strong>:</p>
    <div style="background: #f9f9f9; border-left: 3px solid #16a34a; padding: 12px 16px; margin: 20px 0; color: #333; font-style: italic;">${data.snippet}</div>
    ${btn(data.dashboardLink, 'Open the conversation')}
`);

export const getMixingRefundRequestTemplate = (data: {
    songTitle: string;
    packageName: string;
    amount: string;
    artistName: string;
    reason: string;
    dashboardLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">Refund requested</h2>
    <p><strong>${data.artistName}</strong> requested a refund of <strong>${data.amount}</strong> for:</p>
    <p><strong>${data.songTitle}</strong> (${data.packageName})</p>
    <div style="background: #f9f9f9; border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 20px 0; color: #333; font-style: italic;">${data.reason}</div>
    <p>No money has moved. Review and approve or decline it in the admin dashboard (Mixing tab).</p>
    ${btn(data.dashboardLink, 'Review refund request', '#d97706')}
`);

export const getMixingRefundDeniedTemplate = (data: {
    name: string;
    songTitle: string;
    dashboardLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">Update on your refund request</h2>
    <p>Hi ${data.name},</p>
    <p>Your refund request for <strong>${data.songTitle}</strong> was reviewed and declined, so your order stays active and your payment remains held in escrow.</p>
    <p>If something is wrong with your mix, reply to the engineer in the order chat and we'll sort it out.</p>
    ${btn(data.dashboardLink, 'View your order')}
`);

export const getSupportTicketReceivedTemplate = (data: {
    name: string;
    subject: string;
    dashboardLink: string;
}) => brandedEmail(`
    <p>Hi ${data.name},</p>
    <p>We've received your support ticket <strong>"${data.subject}"</strong>. Our team will get back to you shortly.</p>
    ${btn(data.dashboardLink, 'View Ticket', '#2563eb')}
`);

export const getSupportTicketAdminTemplate = (data: {
    subject: string;
    from: string;
    snippet: string;
    dashboardLink: string;
}) => brandedEmail(`
    <h2 style="margin-top: 0;">New support ticket</h2>
    <p><strong>From:</strong> ${data.from}</p>
    <p><strong>Subject:</strong> ${data.subject}</p>
    <div style="background: #f9f9f9; border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 20px 0; color: #333; font-style: italic;">${data.snippet}</div>
    ${btn(data.dashboardLink, 'Open inbox', '#d97706')}
`);
