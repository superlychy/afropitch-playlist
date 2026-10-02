import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/mixing/voice-note-sign
 * Any authenticated participant of a mixing order (the artist or an admin)
 * gets a signed Cloudinary payload for uploading a voice note to
 * afropitch/mix-voice-notes. The API secret never leaves the server.
 *
 * Body: { order_id: string }
 */
export async function POST(req: Request) {
  try {
    const auth = await createAuthClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id as string | undefined;
    if (!orderId) return NextResponse.json({ error: "order_id required" }, { status: 400 });

    const { data: order } = await supabase
      .from("mixing_orders")
      .select("artist_id")
      .eq("id", orderId)
      .single();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isParticipant = order.artist_id === user.id || profile?.role === "admin";
    if (!isParticipant) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhjsvoorl";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary credentials are not configured on the server." },
        { status: 503 }
      );
    }

    const folder = "afropitch/mix-voice-notes";
    const resourceType = "video"; // Cloudinary stores audio under "video"
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(toSign).digest("hex");

    return NextResponse.json({
      cloud_name: cloudName,
      api_key: apiKey,
      timestamp,
      signature,
      folder,
      resource_type: resourceType,
      upload_url: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Signing failed" },
      { status: 500 }
    );
  }
}
