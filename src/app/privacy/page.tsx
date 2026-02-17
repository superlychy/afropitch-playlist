import { siteConfig } from "@/../config/site";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Privacy Policy - AfroPitch",
    description: "Learn how AfroPitch collects, uses, and protects your personal data and privacy.",
};

export default function PrivacyPolicy() {
    const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const contactEmail = siteConfig.contact?.email || "admin@afropitchplay.best";
    const websiteUrl = siteConfig.url || "https://afropitchplay.best";
    const country = "Nigeria"; // Inferred

    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl text-gray-300">
            <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="mb-8 text-gray-400">Effective Date: {currentDate}</p>

            <div className="space-y-8">
                <section>
                    <p className="mb-4">
                        <b>Platform Name:</b> AfroPitch <br />
                        AfroPitch (“we,” “our,” or “us”) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the AfroPitch platform (the “Platform”).
                    </p>
                    <p className="font-semibold text-white">By using AfroPitch, you agree to this Privacy Policy.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                    <p>We may collect the following types of information:</p>

                    <h3 className="text-xl font-semibold text-white mt-4 mb-2">1.1 Personal Information</h3>
                    <p>When you register or use AfroPitch, we may collect:</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>Full name</li>
                        <li>Email address</li>
                        <li>Username</li>
                        <li>Payment details (processed via third-party providers)</li>
                        <li>Bank details (for curator payouts, if applicable)</li>
                        <li>Country and location information</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-white mt-4 mb-2">1.2 Account & Platform Data</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Songs submitted</li>
                        <li>Playlist information</li>
                        <li>Submission history</li>
                        <li>Review decisions</li>
                        <li>Messages sent through the platform</li>
                        <li>Pricing tier selected (Free, Standard, Express, Exclusive)</li>
                    </ul>

                    <h3 className="text-xl font-semibold text-white mt-4 mb-2">1.3 Technical Information</h3>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>IP address</li>
                        <li>Browser type</li>
                        <li>Device information</li>
                        <li>Usage data</li>
                        <li>Cookies and tracking technologies</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
                    <p>We use your information to:</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>Create and manage user accounts</li>
                        <li>Process submissions and payments</li>
                        <li>Facilitate communication between artists and curators</li>
                        <li>Detect fraud and prevent abuse</li>
                        <li>Improve platform performance and user experience</li>
                        <li>Send service-related notifications</li>
                        <li>Provide customer support</li>
                        <li>Comply with legal obligations</li>
                    </ul>
                    <p className="mt-2">We do not sell your personal data to third parties.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">3. Payments & Financial Information</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Payments on AfroPitch are processed by third-party payment providers. We do not store full credit card details on our servers.</li>
                        <li>Curator payout information (such as bank details) is stored securely and used only for payout processing.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">4. Cookies & Tracking</h2>
                    <p>AfroPitch may use cookies and similar technologies to:</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>Improve site performance</li>
                        <li>Remember user preferences</li>
                        <li>Analyze traffic and usage patterns</li>
                        <li>Enhance security</li>
                    </ul>
                    <p className="mt-2">You may disable cookies in your browser settings, but some features may not function properly.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">5. How We Share Information</h2>
                    <p>We may share information:</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>With payment processors</li>
                        <li>With service providers who assist in operating the platform</li>
                        <li>If required by law or legal process</li>
                        <li>To prevent fraud or enforce our Terms</li>
                    </ul>
                    <p className="mt-2">We do not share user music files beyond platform functionality unless authorized.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">6. Data Security</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>We implement reasonable security measures to protect your data. However, no system is 100% secure.</li>
                        <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">7. Data Retention</h2>
                    <p>We retain your data:</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>For as long as your account is active</li>
                        <li>As necessary to comply with legal obligations</li>
                        <li>To resolve disputes and enforce agreements</li>
                    </ul>
                    <p className="mt-2">You may request account deletion, subject to legal retention requirements.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">8. Your Rights</h2>
                    <p>Depending on your location, you may have the right to:</p>
                    <ul className="list-disc pl-5 space-y-2 mt-2">
                        <li>Access your personal data</li>
                        <li>Correct inaccurate data</li>
                        <li>Request deletion</li>
                        <li>Restrict processing</li>
                        <li>Object to certain uses of your data</li>
                    </ul>
                    <p className="mt-2 text-white">To exercise these rights, contact us at the email below.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">9. Children’s Privacy</h2>
                    <p>AfroPitch is not intended for individuals under 18 years old. We do not knowingly collect data from minors.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">10. International Users</h2>
                    <p>If you access AfroPitch from outside {country}, your data may be transferred and processed in other countries.</p>
                    <p className="mt-2">By using the platform, you consent to such transfers.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">11. Changes to This Policy</h2>
                    <p>We may update this Privacy Policy periodically. Continued use of the platform after updates constitutes acceptance of the revised policy.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
                    <p>If you have questions about this Privacy Policy:</p>
                    <ul className="list-none mt-2 space-y-1">
                        <li>Email: <a href={`mailto:${contactEmail}`} className="text-green-500 hover:underline">{contactEmail}</a></li>
                        <li>Website: <a href={websiteUrl} className="text-green-500 hover:underline">{websiteUrl}</a></li>
                    </ul>
                </section>
            </div>
        </div>
    );
}
