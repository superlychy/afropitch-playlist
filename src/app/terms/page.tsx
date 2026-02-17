import { siteConfig } from "@/../config/site";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Terms of Service - AfroPitch",
    description: "Read our Terms of Service to understand the rules and regulations for using the AfroPitch playlist pitching platform.",
};

export default function TermsOfService() {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const contactEmail = siteConfig.contact?.email || "admin@afropitchplay.best";
    const websiteUrl = siteConfig.url || "https://afropitchplay.best";
    const country = "Nigeria"; // Inferred from currency usage (₦)

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
            <p className="mb-8 text-gray-400">Effective Date: {currentDate}</p>

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
                    <h2 className="text-2xl font-bold text-white mb-4">6. Payments</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>All payments are processed through third-party payment providers.</li>
                        <li>AfroPitch may charge service fees.</li>
                        <li>Fees are displayed before payment confirmation.</li>
                        <li>Payments are generally non-refundable unless required by law.</li>
                        <li>Curator payouts are subject to verification and may be delayed for fraud checks.</li>
                        <li>AfroPitch reserves the right to withhold payouts if suspicious activity is detected.</li>
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
                    <p>AfroPitch may update these Terms at any time. Continued use of the platform after changes means you accept the updated Terms.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">13. Privacy</h2>
                    <p>Your use of AfroPitch is also governed by our Privacy Policy.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">14. Governing Law</h2>
                    <p>These Terms shall be governed by the laws of {country}.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">15. Contact Information</h2>
                    <p>For questions regarding these Terms:</p>
                    <ul className="list-none mt-2 space-y-1">
                        <li>Email: <a href={`mailto:${contactEmail}`} className="text-green-500 hover:underline">{contactEmail}</a></li>
                        <li>Website: <a href={websiteUrl} className="text-green-500 hover:underline">{websiteUrl}</a></li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
