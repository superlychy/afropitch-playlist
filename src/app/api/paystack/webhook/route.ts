import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Paystack webhook secret (should be set in Vercel environment variables)
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // TODO: Implement signature verification when webhook secret is configured
    // const signature = req.headers.get('x-paystack-signature');
    // const hash = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    //   .update(JSON.stringify(body))
    //   .digest('hex');
    // if (signature !== hash) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    console.log("[Paystack Webhook] Event received:", body.event);

    // Handle charge.success event
    if (body.event === 'charge.success') {
      const { reference, amount, customer, metadata } = body.data;
      
      console.log("[Paystack Webhook] Full metadata:", JSON.stringify(metadata, null, 2));
    console.log("[Paystack Webhook] custom_fields type:", typeof metadata?.custom_fields);
    console.log("[Paystack Webhook] custom_fields length:", metadata?.custom_fields?.length);
      
      // Extract user_id from Paystack metadata structure
      // Paystack sends custom_fields as an array
      let userId = metadata?.user_id;
      
      if (!userId && metadata?.custom_fields && Array.isArray(metadata.custom_fields)) {
        // custom_fields is an array: [{ variable_name: "user_id", value: "uuid" }]
        console.log("[Paystack Webhook] Checking custom_fields array...");
        
        for (let i = 0; i < metadata.custom_fields.length; i++) {
          const field = metadata.custom_fields[i];
          console.log(`[Paystack Webhook] Field ${i}:`, JSON.stringify(field, null, 2));
          
          if (field && (field.variable_name === 'user_id' || field.name === 'user_id')) {
            userId = field.value;
            console.log("[Paystack Webhook] ✓ Found user_id in custom_fields:", userId);
            break;
          }
        }
        
        // Also check if the first field has a value (fallback)
        if (!userId && metadata.custom_fields.length > 0) {
          const firstField = metadata.custom_fields[0];
          if (firstField && firstField.value) {
            userId = firstField.value;
            console.log("[Paystack Webhook] Using first field value as user_id:", userId);
          }
        }
      }
      
      // Also check if metadata has user_id directly (some integrations send it this way)
      if (!userId && metadata?.user_id) {
        userId = metadata.user_id;
        console.log("[Paystack Webhook] Found user_id in metadata.user_id:", userId);
      }

      if (!userId) {
        console.error("[Paystack Webhook] Missing user_id in metadata", {
          reference,
          metadata
        });
        
        // Log to system logs for manual review
        await supabase.from("system_logs").insert({
          event_type: "webhook_missing_user_id",
          event_data: {
            reference,
            amount,
            metadata,
            timestamp: new Date().toISOString()
          }
        });
        
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }

      // Check if already processed (idempotency)
      const { data: existingTxn } = await supabase
        .from("transactions")
        .select("id")
        .eq("reference", reference)
        .limit(1)
        .single();

      if (existingTxn) {
        console.log("[Paystack Webhook] Already processed:", reference);
        return NextResponse.json({ success: true, message: "Already processed" });
      }

      // Process deposit using the RPC function
      const amountInNaira = amount / 100; // Convert from kobo
      const { data: result, error } = await supabase.rpc("process_deposit", {
        p_user_id: userId,
        p_amount: amountInNaira,
        p_reference: reference,
        p_description: `Paystack Deposit: ${reference}`
      });

      if (error) {
        console.error("[Paystack Webhook] Deposit failed:", error);
        
        // Log the failure
        await supabase.from("system_logs").insert({
          event_type: "webhook_deposit_failed",
          event_data: {
            user_id: userId,
            amount: amountInNaira,
            reference,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
        
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log("[Paystack Webhook] Deposit successful:", {
        userId,
        amount: amountInNaira,
        reference
      });

      return NextResponse.json({ success: true });
    }

    // Log unhandled events
    console.log("[Paystack Webhook] Unhandled event:", body.event);
    return NextResponse.json({ success: true, message: "Event not processed" });

  } catch (err: any) {
    console.error("[Paystack Webhook] Error:", err);
    
    await supabase.from("system_logs").insert({
      event_type: "webhook_error",
      event_data: {
        error: err.message,
        timestamp: new Date().toISOString()
      }
    });
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET endpoint for health check / testing
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Paystack webhook endpoint is ready",
    events_supported: ["charge.success"]
  });
}
