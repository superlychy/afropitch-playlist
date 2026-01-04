import { siteConfig } from "@/../config/site";

export default function TermsOfService() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-4xl text-gray-300">
            <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>
            <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
                <p>By accessing and using {siteConfig.name}, you accept and agree to be bound by the terms and provision of this agreement.</p>
            </section>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">2. Use License</h2>
                <p>Permission is granted to temporarily download one copy of the materials on {siteConfig.name}'s website for personal, non-commercial transitory viewing only.</p>
            </section>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">3. Disclaimer</h2>
                <p>The materials on {siteConfig.name}'s website are provided on an 'as is' basis. {siteConfig.name} makes no warranties, expressed or implied.</p>
            </section>

            <section className="space-y-4 mb-8">
                <h2 className="text-xl font-bold text-white">4. Limitations</h2>
                <p>In no event shall {siteConfig.name} or its suppliers be liable for any damages arising out of the use or inability to use the materials on {siteConfig.name}'s website.</p>
            </section>
        </div>
    );
}
