import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin() {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return { ok: false as const, status: 403 as const };
  return { ok: true as const };
}

/** Extract the Cloudinary public_id + resource type from a delivery URL. */
function parseCloudinary(url: string): { publicId: string; resourceType: "video" | "image" } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("res.cloudinary.com")) return null;
    // /<cloud>/<video|image>/upload/[v123/]<public_id>.<ext>
    const m = u.pathname.match(/\/(video|image)\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
    if (!m) return null;
    return { publicId: m[2], resourceType: m[1] as "video" | "image" };
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/cloudinary-delete
 * Admin-only. Deletes Cloudinary files by delivery URL (audio uploaded as
 * resource_type "video", covers as "image"). Non-Cloudinary URLs (e.g. Google
 * Drive links) are skipped — AfroPitch never deletes Drive files.
 *
 * Body: { urls: string[] }
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: admin.status });
    }

    const { urls } = await req.json().catch(() => ({}));
    const list: string[] = Array.isArray(urls) ? urls.filter((u) => typeof u === "string") : [];

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhjsvoorl";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary credentials are not configured on the server." },
        { status: 503 }
      );
    }

    const results: { url: string; deleted: boolean; reason?: string }[] = [];
    for (const url of list) {
      const parsed = parseCloudinary(url);
      if (!parsed) {
        results.push({ url, deleted: false, reason: "not-cloudinary" });
        continue;
      }
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHash("sha1")
        .update(`public_id=${parsed.publicId}&timestamp=${timestamp}${apiSecret}`)
        .digest("hex");
      const form = new URLSearchParams({
        public_id: parsed.publicId,
        api_key: apiKey,
        timestamp: String(timestamp),
        signature,
      });
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${parsed.resourceType}/destroy`,
        { method: "POST", body: form }
      );
      const json = await res.json().catch(() => ({}));
      results.push({ url, deleted: res.ok || json.result === "not found" });
    }
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
