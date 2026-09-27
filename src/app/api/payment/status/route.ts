import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verifies a Paystack transaction server-side, then credits the wallet.
// The amount and the account credited both come from Paystack's verification
// response — never from the client — so a forged callback cannot mint money.
const PAYSTACK_SECRET =
  process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_WEBHOOK_SECRET || "";

/**
 * GET /api/payment/status
 * Check payment status and verify if deposit was credited
 * 
 * Query params:
 * - reference: Paystack transaction reference
 * - userId: User ID to verify ownership
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference");
    const userId = searchParams.get("userId");

    if (!reference || !userId) {
      return NextResponse.json(
        { error: "Missing reference or userId" },
        { status: 400 }
      );
    }

    // Verify the transaction exists and belongs to the user
    const { data: transaction, error: txnError } = await supabase
      .from("transactions")
      .select("*")
      .eq("reference", reference)
      .eq("user_id", userId)
      .eq("type", "deposit")
      .single();

    // Get user's current balance
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance, full_name, email")
      .eq("id", userId)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if transaction exists
    const isCredited = !txnError && transaction !== null;

    // Get recent transactions for this user
    const { data: recentTxns } = await supabase
      .from("transactions")
      .select("amount, type, description, created_at, reference")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        credited: isCredited,
        transaction: transaction || null,
        user: {
          id: userId,
          name: profile.full_name,
          email: profile.email,
          balance: profile.balance
        },
        recentTransactions: recentTxns || [],
        checkedAt: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error("[Payment Status API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment/status
 * Verify a Paystack payment server-side and credit the matching wallet.
 *
 * Body:
 * - reference: Paystack transaction reference
 *
 * The verified amount (kobo -> naira) and the customer email come from
 * Paystack. The wallet credited is the AfroPitch profile whose email matches
 * the Paystack customer email. Client-supplied amounts are never trusted.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference } = body || {};

    if (!reference || typeof reference !== "string") {
      return NextResponse.json(
        { error: "Missing required field: reference" },
        { status: 400 }
      );
    }

    if (!PAYSTACK_SECRET) {
      return NextResponse.json(
        { error: "verification_unavailable" },
        { status: 503 }
      );
    }

    // 1. Verify the transaction with Paystack directly.
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    const verifyJson = await verifyRes.json().catch(() => null);
    if (!verifyJson?.status || verifyJson?.data?.status !== "success") {
      return NextResponse.json(
        { success: false, error: "Payment could not be verified with Paystack." },
        { status: 402 }
      );
    }

    const paidNgn = Math.round(Number(verifyJson.data.amount || 0) / 100);
    const currency = verifyJson.data.currency || "NGN";
    const customerEmail = verifyJson.data?.customer?.email || "";

    if (currency !== "NGN" || paidNgn <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid verified payment." },
        { status: 402 }
      );
    }

    // 2. Find the AfroPitch account that owns this payment email.
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, balance")
      .ilike("email", customerEmail)
      .limit(1)
      .single();

    if (!profile) {
      console.error("[Payment Status API] Verified payment has no matching profile:", {
        reference,
        customerEmail,
        amount: paidNgn,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Payment verified but no AfroPitch account matches the payment email. Contact support with your reference.",
          reference,
        },
        { status: 404 }
      );
    }

    // 3. Idempotency: already credited (e.g. by the webhook)?
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference", reference)
      .limit(1)
      .single();

    if (existing) {
      const { data: fresh } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", profile.id)
        .single();
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        amount: paidNgn,
        balance: fresh?.balance,
        transactionId: existing.id,
      });
    }

    // 4. Credit the verified amount.
    const { data: result, error } = await supabase.rpc("process_deposit", {
      p_user_id: profile.id,
      p_amount: paidNgn,
      p_reference: reference,
      p_description: `Wallet Deposit: ${reference}`,
    });

    if (error || result?.success === false) {
      console.error("[Payment Status API] process_deposit failed:", {
        error: error?.message,
        result,
        reference,
      });
      return NextResponse.json(
        { success: false, error: error?.message || result?.message || "Failed to credit wallet." },
        { status: 500 }
      );
    }

    const { data: updated } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", profile.id)
      .single();

    return NextResponse.json({
      success: true,
      alreadyProcessed: false,
      amount: paidNgn,
      balance: updated?.balance,
    });
  } catch (err: any) {
    console.error("[Payment Status API] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
