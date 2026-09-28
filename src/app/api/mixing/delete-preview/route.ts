import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Extract the Cloudinary public_id from a delivery URL, or null if not a Cloudinary URL. */
function publicIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("res.cloudinary.com")) return null;
    // /<cloud>/video/upload/[v123/]<public_id>.<ext>
    const m = u.pathname.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/mixing/delete-preview
 * Deletes a mixing order's preview file from Cloudinary and clears preview_link.
 * Called when the deal closes (artist accepts the mix, or a refund is resolved),
 * and opportunistically on page load for any completed order still holding one.
 *
 * Body: { order_id }
 * Auth: the order's artist, or an admin.
 */
export async function POST(req: Request) {
  try {
    const auth = await createAuthClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return NextResponse.json({ error: "order_id required" }, { status: 400 });

    const { data: order } = await supabase
      .from("mixing_orders")
      .select("id, artist_id, preview_link, status")
      .eq("id", order_id)
      .single();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = profile?.role === "admin";
    if (order.artist_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!order.preview_link) return NextResponse.json({ ok: true, deleted: false });

    const publicId = publicIdFromUrl(order.preview_link);
    if (!publicId) {
      // Not hosted on Cloudinary (e.g. Drive link) — nothing to delete server-side.
      return NextResponse.json({ ok: true, deleted: false, reason: "not-cloudinary" });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhjsvoorl";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 503 });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const form = new URLSearchParams({
      public_id: publicId,
      api_key: apiKey,
      timestamp: String(timestamp),
      signature,
    });
    const destroyRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/destroy`,
      { method: "POST", body: form }
    );
    const destroyJson = await destroyRes.json().catch(() => ({}));
    if (!destroyRes.ok && destroyJson.result !== "not found") {
      // Don't clear the link — a later retry (page load) will try again.
      return NextResponse.json(
        { error: "Cloudinary destroy failed", detail: destroyJson },
        { status: 502 }
      );
    }

    await supabase
      .from("mixing_orders")
      .update({ preview_link: null })
      .eq("id", order_id);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
