import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { brandedEmail } from "@/lib/email-template";

// Public event submission endpoint. Submissions land as drafts only;
// nothing here can publish. The admin approves from the Events tab.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "superlychy@gmail.com";

const CATEGORIES = new Set([
    "concert",
    "festival",
    "awards",
    "industry",
    "competition",
    "party",
    "tour",
    "showcase",
    "gospel",
    "comedy",
    "cultural",
]);

const slugify = (s: string) =>
    s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const isHttpUrl = (u: string) => {
    try {
        const p = new URL(u);
        return p.protocol === "http:" || p.protocol === "https:";
    } catch {
        return false;
    }
};

const esc = (s: string) =>
    s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Honeypot: real submitters never see this field.
        if (body.website) {
            return NextResponse.json({ ok: false, error: "Submission rejected." }, { status: 400 });
        }

        const title = String(body.title || "").trim();
        const city = String(body.city || "").trim();
        const category = String(body.category || "");
        const contactName = String(body.contact_name || "").trim();
        const contactEmail = String(body.contact_email || "").trim();
        const startsAt = new Date(body.starts_at || "");
        const endsAt = new Date(body.ends_at || "");

        if (!title) return NextResponse.json({ ok: false, error: "Give the event a name." }, { status: 400 });
        if (!CATEGORIES.has(category)) return NextResponse.json({ ok: false, error: "Pick a category." }, { status: 400 });
        if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
            return NextResponse.json({ ok: false, error: "Set a start and end date and time." }, { status: 400 });
        }
        if (endsAt < startsAt) {
            return NextResponse.json({ ok: false, error: "The end must be after the start." }, { status: 400 });
        }
        if (!city) return NextResponse.json({ ok: false, error: "Set a city." }, { status: 400 });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            return NextResponse.json({ ok: false, error: "Give a valid contact email." }, { status: 400 });
        }

        const ticketUrl = String(body.ticket_url || "").trim();
        const imageUrl = String(body.image_url || "").trim();
        if (ticketUrl && !isHttpUrl(ticketUrl)) {
            return NextResponse.json({ ok: false, error: "The ticket link must be a full web address." }, { status: 400 });
        }
        if (imageUrl && !isHttpUrl(imageUrl)) {
            return NextResponse.json({ ok: false, error: "The poster link must be a full web address." }, { status: 400 });
        }

        const isFree = body.is_free === true;
        const price = String(body.price || "").trim();
        let description = String(body.description || "").trim();
        if (!isFree && price) {
            description = description ? `${description}\n\nTickets: ${price}` : `Tickets: ${price}`;
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            process.env.SUPABASE_SERVICE_ROLE_KEY || ""
        );

        const base = slugify(title) || `event-${Date.now()}`;
        let slug = base;
        let n = 2;
        for (;;) {
            const { data } = await supabase.from("events").select("id").eq("slug", slug).limit(1);
            if (!data || data.length === 0) break;
            slug = `${base}-${n++}`;
        }

        const { error } = await supabase.from("events").insert({
            title,
            slug,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            venue: String(body.venue || "").trim() || null,
            city,
            state: String(body.state || "").trim() || null,
            country: String(body.country || "").trim() || "Nigeria",
            image_url: imageUrl || null,
            description: description || null,
            ticket_url: ticketUrl || null,
            organizer: String(body.organizer || "").trim() || null,
            lineup: String(body.lineup || "").trim() || null,
            category,
            is_free: isFree,
            status: "draft",
            source: "event-submission-form",
            submitted_by_name: contactName || null,
            submitted_by_email: contactEmail,
        });

        if (error) {
            console.error("[events/submit] insert failed", error);
            return NextResponse.json({ ok: false, error: "Could not save your event. Please try again." }, { status: 500 });
        }

        // Notify Max. A mail failure must not lose the submission;
        // it still sits in the admin Events tab under Drafts.
        try {
            if (process.env.RESEND_API_KEY) {
                const resend = new Resend(process.env.RESEND_API_KEY);
                await resend.emails.send({
                    from: "AfroPitch <contact@afropitchplay.best>",
                    to: [ADMIN_EMAIL],
                    subject: `New event submission: ${title}`,
                    html: brandedEmail(`
          <h2 style="color: #16a34a; margin-top: 0;">New event submission</h2>
          <p><strong>${esc(title)}</strong> in ${esc(city)}, starting ${esc(startsAt.toISOString())}.</p>
          <p>Submitted by ${esc(contactName || "not given")} (${esc(contactEmail)}).</p>
          <p>Review it in the admin Events tab under Drafts. It is not live until you publish it.</p>
        `),
                });
            }
        } catch (mailErr) {
            console.error("[events/submit] notify failed", mailErr);
        }

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false, error: "Could not save your event. Please try again." }, { status: 500 });
    }
}
