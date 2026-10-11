import type { Metadata } from "next";
import { FAQS, faqSchemaJsonLd } from "@/lib/faqs";
import { HomeFaq } from "@/components/HomeFaq";

export const metadata: Metadata = {
    title: "Frequently Asked Questions",
    description:
        "Answers to common questions about AfroPitch: how playlist pitching works, free and paid submissions, refunds, curators, mixing and more.",
};

export default function FaqPage() {
    return (
        <div className="flex flex-col items-center w-full">
            {/* FAQ Schema for Google Rich Results (canonical SEO source for the Q&A) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchemaJsonLd(FAQS)) }}
            />
            <section className="w-full py-24 px-4 bg-white/[0.02]">
                <HomeFaq faqs={FAQS} />
            </section>
        </div>
    );
}
