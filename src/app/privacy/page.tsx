import { siteConfig } from "@/../config/site";

export default function PrivacyPolicy() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl text-gray-300">
            <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
            <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">1. Introduction</h2>
                <p>Welcome to {siteConfig.name}. We respect your privacy and are committed to protecting your personal data.</p>
            </section>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">2. Data We Collect</h2>
                <p>We may collect personal information such as your name, email address, and payment information when you use our services.</p>
            </section>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">3. How We Use Your Data</h2>
                <p>We use your data to provide our services, process payments, and improve user experience.</p>
            </section>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">4. Contact Us</h2>
                <p>If you have any questions about this privacy policy, please contact us.</p>
            </section>
        </div>
    );
}
