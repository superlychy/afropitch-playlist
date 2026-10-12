import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

// Homepage partner spotlight: one curated slot for partners.
// Ships OFF; the admin switches it on when a deal goes live.
// Renders nothing unless enabled AND given a headline + image.
export async function PartnerSpotlight() {
    const supabase = await createClient();
    const { data: rows } = await supabase.from("site_settings").select("key, value");
    const settings = new Map((rows ?? []).map((r) => [r.key, r.value]));

    // site_settings.value is TEXT: "true"/"false" or "".
    const isOn = (v: unknown) => v === true || v === "true";
    const asText = (k: string) => {
        const v = settings.get(k);
        if (typeof v !== "string") return "";
        const t = v.trim();
        if (t === "" || t === "null") return "";
        // Tolerate double-encoded values saved by hand ("\"Partner\"").
        return t.replace(/^"+|"+$/g, "");
    };

    if (!isOn(settings.get("spotlight_enabled"))) return null;
    const headline = asText("spotlight_headline");
    const imageUrl = asText("spotlight_image_url");
    if (!headline || !imageUrl) return null;

    const label = asText("spotlight_label") || "Partner";
    const subtext = asText("spotlight_subtext");
    const linkUrl = asText("spotlight_link_url");

    const inner = (
        <div className="max-w-5xl mx-auto px-4">
            <div className="rounded-3xl overflow-hidden border border-yellow-500/25 bg-white/[0.03] hover:border-yellow-500/50 transition-colors">
                <div className="flex flex-col md:flex-row items-stretch">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={headline} className="w-full md:w-1/2 h-56 md:h-auto object-cover" />
                    <div className="p-8 md:p-10 flex flex-col justify-center min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-yellow-400 uppercase tracking-widest mb-3">
                            {label}
                        </p>
                        <p className="text-2xl md:text-3xl font-extrabold text-white leading-tight">
                            {headline}
                        </p>
                        {subtext && <p className="text-gray-400 mt-3 leading-relaxed">{subtext}</p>}
                        {linkUrl && (
                            <span className="inline-block mt-6 rounded-full bg-yellow-500 px-6 py-3 text-sm font-bold text-black w-fit">
                                Learn more
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <section className="w-full py-16 md:py-20">
            {linkUrl ? (
                <Link href={linkUrl} {...(linkUrl.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                    {inner}
                </Link>
            ) : (
                inner
            )}
        </section>
    );
}
