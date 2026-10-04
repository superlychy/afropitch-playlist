import { siteConfig } from "@/../config/site";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service - AfroPitch",
    description: "Read our Terms of Service to understand the rules and regulations for using the AfroPitch playlist pitching platform.",
};

export default function TermsOfService() {
    const contactEmail = siteConfig.contact?.email || "admin@afropitchplay.best";
    const websiteUrl = siteConfig.url || "https://afropitchplay.best";
    const country = "Nigeria"; // Inferred from currency usage (₦)

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
            <p className="mb-8 text-gray-400">Effective Date: October 4, 2026</p>

            <div className="space-y-8">
                <section>
                    <p className="mb-4">
                        <b>Platform Name:</b> AfroPitch <br />
                        Welcome to AfroPitch. These Terms of Service (“Terms”) govern your access to and use of the AfroPitch platform, website, and services (collectively, the “Platform”). By accessing or using AfroPitch, you agree to be bound by these Terms.
                    </p>
                    <p className="font-semibold text-white">If you do not agree, please do not use the Platform.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">1. About AfroPitch</h2>
                    <p>AfroPitch is a music submission and playlist promotion platform that connects artists with playlist curators. Artists may submit songs for review, and curators may review and potentially add songs to their playlists.</p>
                    <p className="mt-2">AfroPitch does not guarantee playlist placement, streams, or specific results.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">2. Eligibility</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Be at least 18 years old</li>
                        <li>Have the legal authority to enter into this agreement</li>
                        <li>Provide accurate and complete registration information</li>
                    </ul>
                    <p className="mt-2">We reserve the right to suspend or terminate accounts that violate these Terms.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">3. User Accounts</h2>
                    <p>You are responsible for:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Maintaining the confidentiality of your account credentials</li>
                        <li>All activities that occur under your account</li>
                        <li>Providing accurate and up-to-date information</li>
                    </ul>
                    <p className="mt-2">AfroPitch is not liable for unauthorized access caused by your failure to secure your account.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">4. Artist Terms</h2>
                    <p>If you are an Artist:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>You confirm that you own or have the necessary rights to submit the music.</li>
                        <li>You grant AfroPitch a non-exclusive, worldwide license to use your submitted content solely for the purpose of platform operation and promotion.</li>
                        <li>Submission fees (if applicable) are non-refundable once a curator review has started.</li>
                        <li>Playlist placement is not guaranteed.</li>
                        <li>You agree not to submit copyrighted content you do not own or have permission to use.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">5. Curator Terms</h2>
                    <p>If you are a Curator:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>You must provide accurate playlist information.</li>
                        <li>You agree to review submissions fairly and professionally.</li>
                        <li>You may not request additional payments outside AfroPitch.</li>
                        <li>You must not use bots, fake streams, or artificial engagement.</li>
                        <li>You may not guarantee placement unless explicitly allowed under platform rules.</li>
                    </ul>
                    <p className="mt-2">AfroPitch reserves the right to remove curators found using fraudulent or artificial engagement methods.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">6. Payments and refunds</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>All payments are processed through third-party payment providers (including Paystack). AfroPitch does not store your full card details.</li>
                        <li>All fees, commissions, and service charges are displayed before you confirm payment.</li>
                        <li>Submission fees are non-refundable once a curator review has started. If no review has started, you may request a refund by contacting us.</li>
                        <li>Mixing orders are held in escrow and governed by Section 16.</li>
                        <li>Curator payouts and wallet withdrawals are subject to verification and fraud checks (see Section 17).</li>
                        <li>Except as stated in these Terms, payments are non-refundable unless required by law.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">7. Prohibited Activities</h2>
                    <p>Users may not:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Use bots or artificial streaming tools</li>
                        <li>Upload unlawful, infringing, or harmful content</li>
                        <li>Harass or abuse other users</li>
                        <li>Attempt to hack, disrupt, or reverse engineer the platform</li>
                        <li>Circumvent platform fees</li>
                    </ul>
                    <p className="mt-2">Violation may result in immediate suspension or permanent ban.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">8. Intellectual Property</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>All platform content, branding, logos, and design elements belong to AfroPitch.</li>
                        <li>Users retain ownership of their uploaded music but grant AfroPitch a limited license to operate and promote the platform.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">9. No Guarantee of Results</h2>
                    <p>AfroPitch does not guarantee:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Playlist placement</li>
                        <li>Minimum stream counts</li>
                        <li>Revenue generation</li>
                        <li>Career advancement</li>
                    </ul>
                    <p className="mt-2">All submission outcomes depend on curator discretion.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">10. Limitation of Liability</h2>
                    <p>AfroPitch is provided “as is.” We are not liable for:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Loss of revenue</li>
                        <li>Loss of streams</li>
                        <li>Business interruptions</li>
                        <li>Third-party platform changes (e.g., streaming services algorithm updates)</li>
                    </ul>
                    <p className="mt-2">Your use of the platform is at your own risk.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">11. Termination</h2>
                    <p>We may suspend or terminate your account if:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>You violate these Terms</li>
                        <li>You engage in fraudulent activity</li>
                        <li>You harm the reputation or operation of AfroPitch</li>
                    </ul>
                    <p className="mt-2">You may delete your account at any time.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">12. Changes to Terms</h2>
                    <p>We may update these Terms from time to time. Where changes are material, we will give you reasonable notice before they take effect, for example by email or a notice on the Platform. Your continued use of the Platform after the changes take effect means you accept the updated Terms.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">13. Privacy</h2>
                    <p>Your use of AfroPitch is also governed by our Privacy Policy.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">14. Governing Law and Disputes</h2>
                    <p>These Terms shall be governed by the laws of {country}. Any disputes arising from these Terms or your use of the Platform shall be resolved in the courts of Lagos State, {country}.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">15. Contact Information</h2>
                    <p>For questions regarding these Terms:</p>
                    <ul className="list-none mt-2 space-y-1">
                        <li>Email: <a href={`mailto:${contactEmail}`} className="text-green-500 hover:underline">{contactEmail}</a></li>
                        <li>Website: <a href={websiteUrl} className="text-green-500 hover:underline">{websiteUrl}</a></li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">16. Mixing service</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>AfroPitch offers a professional song mixing service with the following packages and typical turnaround times: Demo Polish (₦35,000, about 3 days), Full Mix (₦65,000, about 5 days), and Mix + Master (₦100,000, about 7 days). The price shown at checkout is the price that applies to your order.</li>
                        <li>You pay upfront, but your payment is held in escrow. It is not released to the engineer until you accept the delivered mix.</li>
                        <li>You will receive a watermarked preview of the mix in your dashboard. The full, clean file is released to you only after you accept the mix.</li>
                        <li>If you decline the preview mix, you will receive a 75% refund via manual bank transfer to the bank details you provided when placing the order. If you cancel an order while it is still in escrow (before work begins), you will receive a 95% refund the same way. Refunds are processed manually and may take up to 7 business days to reach your account. AfroPitch retains the remaining percentage as a processing and service fee. Mixing refunds are never credited to your AfroPitch wallet.</li>
                        <li>After each preview delivery, you have 72 hours to accept it, request adjustments, or decline it. If you take no action within 72 hours, the preview is automatically accepted and the escrowed payment is released to the engineer immediately. Once you accept a preview, the engineer delivers the final mix. You then have a single 3-day revision window, which starts at the first final delivery and does not restart. If you take no action within those 3 days, the order is automatically marked complete, the full file is released to you, and the order chat is closed.</li>
                        <li>Each package includes revision rounds as shown at checkout: Demo Polish includes 1 round, Full Mix includes 2 rounds, and Mix + Master includes 3 rounds.</li>
                        <li>You confirm that you own, or have the rights to, any song files you share for mixing. You are responsible for the file-sharing links you provide (for example, Google Drive links set to “Anyone with the link”); AfroPitch is not responsible if anyone else accesses files you choose to share publicly.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">17. Fees, commissions, and withdrawals</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>When an artist pays a submission fee, 70% goes to the reviewing curator and 30% is retained by AfroPitch as a platform fee. The amounts shown to you before payment already reflect this split.</li>
                        <li>Curator payouts and wallet withdrawals may be delayed for verification and fraud checks. AfroPitch may withhold payouts where suspicious activity is detected.</li>
                        <li>Withdrawals are available to curators only. Artists cannot withdraw funds from AfroPitch. The minimum withdrawal amount is ₦5,000. Withdrawals are reviewed and approved by AfroPitch before funds are released to your bank account.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">18. Copyright complaints</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>If you believe that content on the Platform infringes your copyright, send a notice to <a href={`mailto:${contactEmail}`} className="text-green-500 hover:underline">{contactEmail}</a> including: (a) identification of the copyrighted work; (b) identification of the material you claim is infringing; (c) your contact details; and (d) a statement that you believe in good faith the use is not authorized.</li>
                        <li>We will act on valid notices, which may include removing the material. Users who repeatedly upload infringing content may have their accounts suspended or terminated.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">19. Referral rewards</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>AfroPitch may offer referral rewards: ₦1,000 for each artist you refer who completes their first paid submission.</li>
                        <li>Referral rewards are credited to a separate referral balance, which can only be spent on submissions. Referral balances cannot be withdrawn as cash.</li>
                        <li>When you pay for a submission, your referral balance is used first, then your wallet balance.</li>
                        <li>Self-referrals are not allowed, and each referred artist qualifies for only one reward.</li>
                        <li>AfroPitch may change or end the referral program at any time.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">20. General</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Severability: if any part of these Terms is found to be unenforceable, the remaining parts continue in full effect.</li>
                        <li>You may not assign or transfer your rights under these Terms without our written consent.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
