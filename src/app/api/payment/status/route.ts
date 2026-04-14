import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
 * Manually verify and credit a payment (admin only)
 * 
 * Body:
 * - reference: Paystack transaction reference
 * - userId: User ID
 * - amount: Payment amount in Naira
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, userId, amount } = body;

    if (!reference || !userId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: reference, userId, amount" },
        { status: 400 }
      );
    }

    // Check if already processed
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("reference", reference)
      .limit(1)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        transactionId: existing.id
      });
    }

    // Process deposit using RPC
    const { data: result, error } = await supabase.rpc("process_deposit", {
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_description: `Manual verification: ${reference}`
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Get updated balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      success: true,
      message: "Payment credited successfully",
      newBalance: profile?.balance,
      reference
    });

  } catch (err: any) {
    console.error("[Payment Status API - POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
