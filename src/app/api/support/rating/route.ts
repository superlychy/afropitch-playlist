import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Records the visitor's "how did we perform" rating after a ticket is closed.
// One rating per ticket (upsert on ticket_id).
//   POST { ticket_id, access_token, rating (1-5), comment? }
// Auth: ticket owner (logged in) or the ticket's access_token (guests).
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { ticket_id, access_token, rating, comment } = body || {};

        const stars = Number(rating);
        if (!ticket_id || !Number.isInteger(stars) || stars < 1 || stars > 5) {
            return NextResponse.json({ ok: false, error: "A rating of 1 to 5 stars is required." }, { status: 400 });
        }
        const cleanComment = String(comment || "").trim().slice(0, 1000);

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: ticket, error: tErr } = await admin
            .from("support_tickets")
            .select("id, user_id, access_token, status")
            .eq("id", ticket_id)
            .single();
        if (tErr || !ticket) {
            return NextResponse.json({ ok: false, error: "Ticket not found." }, { status: 404 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        const isOwner = !!user && ticket.user_id === user.id;
        const hasToken = !!access_token && ticket.access_token === access_token;
        if (!isOwner && !hasToken) {
            return NextResponse.json({ ok: false, error: "Not authorized for this ticket." }, { status: 403 });
        }

        // Ratings belong to finished conversations only.
        if (ticket.status !== "closed") {
            return NextResponse.json({ ok: false, error: "You can rate this conversation once it is closed." }, { status: 400 });
        }

        const { error: rErr } = await admin.from("support_ratings").upsert(
            {
                ticket_id: ticket.id,
                rating: stars,
                comment: cleanComment || null,
            },
            { onConflict: "ticket_id" }
        );
        if (rErr) {
            return NextResponse.json({ ok: false, error: "Could not save your rating." }, { status: 500 });
        }
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false, error: "Could not save your rating." }, { status: 500 });
    }
}
