
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
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #22c55e; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .amount-box { text-align: center; margin: 30px 0; }
        .amount-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .amount-value { font-size: 36px; font-weight: bold; color: #fff; margin-top: 5px; }
        .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .details-table td { padding: 12px 0; border-bottom: 1px solid #333; color: #bbb; }
        .details-table td:last-child { text-align: right; color: #fff; font-weight: bold; }
        .details-table tr:last-child td { border-bottom: none; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
        .type-badge { background: #333; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <p>Hi ${data.name},</p>
            <p>Here is the receipt for your recent transaction.</p>
            <div class="amount-box">
                <div class="amount-label">Total Amount</div>
                <div class="amount-value">${data.currency}${data.amount.toLocaleString()}</div>
                <div style="margin-top: 10px;">
                    <span class="type-badge">${data.transactionType}</span> 
                    <span style="font-size: 12px; margin-left: 5px; color: #22c55e;">● Success</span>
                </div>
            </div>
            <table class="details-table">
                <tr><td>Date</td><td>${data.date}</td></tr>
                <tr><td>Reference ID</td><td style="font-family: monospace; color: #888;">${data.referenceId}</td></tr>
                <tr><td>Description</td><td>${data.description}</td></tr>
                <tr><td>Payment Method</td><td>${data.paymentMethod}</td></tr>
            </table>
            <p style="margin-top: 30px; font-size: 13px; color: #888; text-align: center;">Transaction ID: ${data.referenceId}</p>
        </div>
        <div class="footer">&copy; 2026 AfroPitch.<br><a href="${data.dashboardLink}" style="color: #666;">View Wallet</a></div>
    </div>
</body>
</html>`;

export const getSongApprovedTemplate = (data: {
    name: string;
    songTitle: string;
    playlistName: string;
    curatorName: string;
    playlistLink: string;
    dashboardLink: string;
    trackingLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #22c55e; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .success-box { background-color: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
        .tip-box { background-color: #2a2a2a; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
        .share-link { background: #000; color: #22c55e; padding: 10px; border: 1px solid #333; border-radius: 4px; font-family: monospace; word-break: break-all; margin: 10px 0; display: block; text-decoration: none; text-align: center;}
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>Good News! Your Song was Approved! 🚀</h2>
            <p>Hi ${data.name},</p>
            <p>We are thrilled to inform you that your song <strong>${data.songTitle}</strong> has been accepted into the following playlist:</p>
            
            <div class="success-box">
                <h3 style="margin: 0; color: #fff;">${data.playlistName}</h3>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #22c55e;">Curated by ${data.curatorName}</p>
            </div>

            <p>This is a huge step! Now, let's make sure you get the most out of this placement.</p>

            <div class="tip-box">
                <strong>📈 HOW TO RANK HIGHER (IMPORTANT):</strong>
                <p style="margin-top: 10px;">To grow and get ranked higher on the playlist, you <strong>must copy and share your unique tracking link</strong> below.</p>
                
                <a href="${data.trackingLink}" class="share-link">${data.trackingLink}</a>
                <p style="font-size: 12px; text-align: center; color: #777;">(Copy this link to share)</p>

                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Share the Link:</strong> We track traffic! Post the playlist link on your Instagram Stories, Twitter, and TikTok. Tag us @AfroPitch!</li>
                    <li><strong>Encourage Saves:</strong> Ask your fans to "Like" the playlist and "Save" your song. This signals our algorithm to boost your track to higher positions.</li>
                </ul>
            </div>

            <center>
                <a href="${data.dashboardLink}" class="button">View Dashboard</a>
            </center>
        </div>
        <div class="footer">&copy; 2026 AfroPitch. Keep soaring.<br><a href="${data.dashboardLink}" style="color: #666;">View Dashboard</a></div>
    </div>
</body>
</html>`;

export const getSongDeclinedTemplate = (data: {
    name: string;
    songTitle: string;
    playlistName: string;
    feedback: string;
    refundAmount: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #ef4444; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .feedback-box { background-color: #2a2a2a; border: 1px solid #444; padding: 15px; border-radius: 5px; margin: 20px 0; font-style: italic; color: #fff; }
        .refund-notice { color: #ef4444; font-weight: bold; margin-top: 10px; font-size: 14px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <p>Hi ${data.name},</p>
            <p>Regarding your submission of <strong>${data.songTitle}</strong> to <strong>${data.playlistName}</strong>.</p>
            <p>Unfortunately, the curator has decided not to add your track at this time. Here is their feedback:</p>
            
            <div class="feedback-box">"${data.feedback}"</div>

            <p class="refund-notice">Amount Refunded: ${data.refundAmount}</p>
            <p>This has been credited back to your wallet instantly. You can use it to submit to other playlists that might be a better fit.</p>
            <div style="margin: 25px 0; padding: 20px; background-color: #0f2a1a; border: 1px solid #22c55e; border-radius: 8px; text-align: center;">
                <p style="color: #ffffff; font-weight: bold; margin: 0 0 8px 0;">Give your song the mix it deserves</p>
                <p style="color: #cccccc; font-size: 14px; margin: 0 0 15px 0;">Most songs get rejected because they are not well mixed or arranged. Try mixing with AfroPitch &mdash; a professional engineer works on your track, and your payment stays in escrow until you love the mix.</p>
                <a href="https://afropitchplay.best/mixing" style="display: inline-block; background-color: #22c55e; color: #000000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Mix my song with AfroPitch</a>
            </div>

        </div>
        <div class="footer">&copy; 2026 AfroPitch.<br><a href="${data.dashboardLink}" style="color: #666;">View Wallet</a></div>
    </div>
</body>
</html>`;

export const getSupportTicketTemplate = (data: {
    name: string;
    subject: string;
    status: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #3b82f6; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
        .button { display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch Support</h1></div>
        <div class="content">
            <p>Hi ${data.name},</p>
            <p>Your support ticket <strong>"${data.subject}"</strong> has been updated.</p>
            <p>Status: <strong>${data.status}</strong></p>
            <p>Please check your dashboard to view the latest response from our team.</p>
            <a href="${data.dashboardLink}" class="button">View Ticket</a>
        </div>
        <div class="footer">&copy; 2026 AfroPitch.</div>
    </div>
</body>
</html>`;

export const getCuratorApprovedTemplate = (data: {
    name: string;
    playlistLink: string;
    signupLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #22c55e; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .success-box { background-color: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center; }
        .tip-box { background-color: #2a2a2a; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>You're In! Curator Application Approved \u{1F389}</h2>
            <p>Hi ${data.name},</p>
            <p>We're thrilled to welcome you to AfroPitch as a curator! Your application has been <strong>approved</strong>.</p>

            <div class="success-box">
                <h3 style="margin: 0; color: #fff;">Application Approved</h3>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #22c55e;">${data.playlistLink}</p>
            </div>

            <p>One quick step to activate everything &mdash; create your curator account:</p>

            <div style="text-align: center;">
                <a href="${data.signupLink}" class="button">Create Your Curator Account</a>
            </div>

            <p>Once your account is set up, here's what happens next:</p>

            <div class="tip-box">
                <strong>\u{1F680} GET STARTED AS A CURATOR:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Complete your profile:</strong> Head to your curator dashboard and make sure your playlists are listed and looking sharp.</li>
                    <li><strong>Receive submissions:</strong> Artists will start pitching their songs to your playlists.</li>
                    <li><strong>Review &amp; earn:</strong> Listen, accept the tracks you love, and earn on every submission you review.</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AfroPitch. Keep soaring.</p>
        </div>
    </div>
</body>
</html>
`;

export const getCuratorVerifiedTemplate = (data: {
    name: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #22c55e; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .button { display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .tip-box { background-color: #0d1f14; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 5px 5px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>You're Verified! &#x2705;</h2>
            <p>Hi ${data.name},</p>
            <p>Great news! Your AfroPitch curator account has been <strong>verified</strong>. Your playlists can now receive paid song submissions from artists.</p>

            <div style="text-align: center;">
                <a href="${data.dashboardLink}" class="button">Open Your Curator Dashboard</a>
            </div>

            <div class="tip-box">
                <strong>&#x1F680; WHAT'S NEXT:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li><strong>Add your playlists:</strong> make sure they're listed and looking sharp.</li>
                    <li><strong>Receive submissions:</strong> artists will start pitching songs to you.</li>
                    <li><strong>Review &amp; earn:</strong> listen, accept the tracks you love, and earn on every submission you review.</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AfroPitch. Keep soaring.</p>
        </div>
    </div>
</body>
</html>
`;

export const getCuratorRejectedTemplate = (data: {
    name: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #f59e0b; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .button { display: inline-block; padding: 12px 24px; background-color: #22c55e; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>Update on Your Curator Application</h2>
            <p>Hi ${data.name},</p>
            <p>Thanks for applying to become a curator on AfroPitch. After reviewing your application, we weren't able to approve it this time.</p>
            <p>You're welcome to reapply in the future with an updated playlist or profile. If you have questions, just reply to this email.</p>
            <div style="text-align: center;">
                <a href="${data.dashboardLink}" class="button">Visit AfroPitch</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AfroPitch. Keep soaring.</p>
        </div>
    </div>
</body>
</html>
`;

export const getMixingMessageTemplate = (data: {
    name: string;
    songTitle: string;
    snippet: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #22c55e; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .quote { background: #111; border-left: 3px solid #22c55e; padding: 12px 16px; margin: 20px 0; color: #eee; font-style: italic; }
        .button { display: inline-block; background-color: #22c55e; color: #000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>New message about your mix</h2>
            <p>Hi ${data.name},</p>
            <p>Your engineer replied about <strong>${data.songTitle}</strong>:</p>
            <div class="quote">${data.snippet}</div>
            <div style="text-align: center;">
                <a href="${data.dashboardLink}" class="button">Open the conversation</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AfroPitch. Keep soaring.</p>
        </div>
    </div>
</body>
</html>`;

export const getMixingRefundRequestTemplate = (data: {
    songTitle: string;
    packageName: string;
    amount: string;
    artistName: string;
    reason: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #f59e0b; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .quote { background: #111; border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 20px 0; color: #eee; font-style: italic; }
        .button { display: inline-block; background-color: #f59e0b; color: #000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>Refund requested</h2>
            <p><strong>${data.artistName}</strong> requested a refund of <strong>${data.amount}</strong> for:</p>
            <p><strong>${data.songTitle}</strong> (${data.packageName})</p>
            <div class="quote">${data.reason}</div>
            <p>No money has moved. Review and approve or decline it in the admin dashboard (Mixing tab).</p>
            <div style="text-align: center;">
                <a href="${data.dashboardLink}" class="button">Review refund request</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AfroPitch. Keep soaring.</p>
        </div>
    </div>
</body>
</html>`;

export const getMixingRefundDeniedTemplate = (data: {
    name: string;
    songTitle: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #22c55e; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .button { display: inline-block; background-color: #22c55e; color: #000; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 10px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>Update on your refund request</h2>
            <p>Hi ${data.name},</p>
            <p>Your refund request for <strong>${data.songTitle}</strong> was reviewed and declined, so your order stays active and your payment remains held in escrow.</p>
            <p>If something is wrong with your mix, reply to the engineer in the order chat and we'll sort it out.</p>
            <div style="text-align: center;">
                <a href="${data.dashboardLink}" class="button">View your order</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} AfroPitch. Keep soaring.</p>
        </div>
    </div>
</body>
</html>`;

export const getSupportTicketReceivedTemplate = (data: {
    name: string;
    subject: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #3b82f6; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
        .button { display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch Support</h1></div>
        <div class="content">
            <p>Hi ${data.name},</p>
            <p>We've received your support ticket <strong>"${data.subject}"</strong>. Our team will get back to you shortly.</p>
            <a href="${data.dashboardLink}" class="button">View Ticket</a>
        </div>
        <div class="footer">&copy; 2026 AfroPitch.</div>
    </div>
</body>
</html>`;

export const getSupportTicketAdminTemplate = (data: {
    subject: string;
    from: string;
    snippet: string;
    dashboardLink: string;
}) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; border: 1px solid #333; }
        .header { background-color: #000; padding: 20px; text-align: center; border-bottom: 2px solid #f59e0b; }
        .content { padding: 30px; line-height: 1.6; color: #cccccc; }
        .quote { background: #111; border-left: 3px solid #f59e0b; padding: 12px 16px; margin: 20px 0; color: #eee; font-style: italic; }
        .button { display: inline-block; padding: 10px 20px; background-color: #f59e0b; color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #111; border-top: 1px solid #333; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>AfroPitch</h1></div>
        <div class="content">
            <h2>New support ticket</h2>
            <p><strong>From:</strong> ${data.from}</p>
            <p><strong>Subject:</strong> ${data.subject}</p>
            <div class="quote">${data.snippet}</div>
            <div style="text-align: center;">
                <a href="${data.dashboardLink}" class="button">Open inbox</a>
            </div>
        </div>
        <div class="footer">&copy; 2026 AfroPitch.</div>
    </div>
</body>
</html>`;
