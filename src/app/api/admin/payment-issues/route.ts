import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/payment-issues
 * List recent payment issues for admin review
 * 
 * Returns:
 * - Failed payments from system_logs
 * - Payments without corresponding transactions
 * - Recent payment attempts
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    // 1. Get failed payments from system logs
    const { data: failedPayments } = await supabase
      .from("system_logs")
      .select("*")
      .or("event_type.eq.payment_failed,event_type.eq.webhook_deposit_failed,event_type.eq.webhook_missing_user_id")
      .order("created_at", { ascending: false })
      .limit(limit);

    // 2. Get recent deposits to check for issues
    const { data: recentDeposits } = await supabase
      .from("transactions")
      .select(`
        *,
        profiles!transactions_user_id_fkey (
          email,
          full_name
        )
      `)
      .eq("type", "deposit")
      .order("created_at", { ascending: false })
      .limit(limit);

    // 3. Get recent Paystack charges that might need verification
    // (This would require storing Paystack webhooks or charges)
    const { data: recentActivity } = await supabase
      .from("transactions")
      .select(`
        *,
        profiles!transactions_user_id_fkey (
          email,
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit * 2);

    // Calculate stats
    const totalFailed = failedPayments?.length || 0;
    const totalDeposits = recentDeposits?.length || 0;

    return NextResponse.json({
      success: true,
      data: {
        failedPayments: failedPayments || [],
        recentDeposits: recentDeposits || [],
        recentActivity: recentActivity || [],
        stats: {
          totalFailed,
          totalDeposits,
          checkedAt: new Date().toISOString()
        }
      }
    });

  } catch (err: any) {
    console.error("[Payment Issues API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payment-issues
 * Manually verify and credit a payment
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, userId, amount, description } = body;

    if (!reference || !userId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: reference, userId, amount" },
        { status: 400 }
      );
    }

    // Check if already exists
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

    // Credit the user
    const { data: result, error } = await supabase.rpc("admin_top_up_user", {
      p_user_id: userId,
      p_amount: amount,
      p_description: description || `Manual fix: ${reference}`
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Payment credited successfully",
      reference
    });

  } catch (err: any) {
    console.error("[Payment Issues API - POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
