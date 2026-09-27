import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Verifies a Paystack transaction server-side, then creates the mixing order.
// The package price is read from the DB and matched against the verified amount,
// so a forged client callback cannot create an unpaid order.
//
// If PAYSTACK_SECRET_KEY is not configured yet, this returns 503
// { error: "verification_unavailable" } and the client falls back to the
// legacy direct-RPC path (logged for review). Once the key is set, the
// verified path is used automatically.
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { reference, song_title, file_link, package_id, submission_id } = body || {};
        if (!reference || typeof reference !== "string") {
            return NextResponse.json({ ok: false, error: "Missing payment reference." }, { status: 400 });
        }
        if (!song_title?.trim() || !file_link?.trim() || !package_id) {
            return NextResponse.json({ ok: false, error: "Missing order details." }, { status: 400 });
        }

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
        }

        if (!PAYSTACK_SECRET) {
            return NextResponse.json({ ok: false, error: "verification_unavailable" }, { status: 503 });
        }

        // 1. Verify the transaction with Paystack directly.
        const verifyRes = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
        );
        const verifyJson = await verifyRes.json().catch(() => null);
        if (!verifyJson?.status || verifyJson?.data?.status !== "success") {
            return NextResponse.json(
                { ok: false, error: "Payment could not be verified with Paystack." },
                { status: 402 }
            );
        }
        const paidNgn = Math.round(Number(verifyJson.data.amount || 0) / 100);
        const currency = verifyJson.data.currency || "NGN";

        // 2. Match the verified amount against the package price from the DB.
        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: pkg } = await admin
            .from("mixing_packages")
            .select("id, price_ngn")
            .eq("id", package_id)
            .eq("active", true)
            .single();
        if (!pkg) {
            return NextResponse.json({ ok: false, error: "Package not available." }, { status: 400 });
        }
        if (currency !== "NGN" || paidNgn !== Number(pkg.price_ngn)) {
            return NextResponse.json(
                { ok: false, error: "Paid amount does not match the package price." },
                { status: 402 }
            );
        }

        // 3. Record the verification (idempotent), then create the order as the user.
        await admin
            .from("verified_payments")
            .upsert({ reference, amount: paidNgn, currency }, { onConflict: "reference" });

        const { data: orderId, error } = await supabase.rpc("create_mixing_order", {
            p_song_title: song_title.trim(),
            p_file_link: file_link.trim(),
            p_package_id: package_id,
            p_reference: reference,
            p_submission_id: submission_id || null,
        });
        if (error) {
            return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
        }

        await admin
            .from("verified_payments")
            .update({ used_at: new Date().toISOString(), order_id: orderId })
            .eq("reference", reference);

        return NextResponse.json({ ok: true, order_id: orderId });
    } catch (e: any) {
        return NextResponse.json(
            { ok: false, error: e?.message || "Verification failed." },
            { status: 500 }
        );
    }
}
