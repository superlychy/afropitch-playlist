import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createClient as createAuthClient } from "@/lib/supabase-server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/migrate-featured-photos
 * One-off migration (2026-09-28): moves Featured Artist photos from the
 * Supabase `featured-photos` storage bucket to Cloudinary
 * (`afropitch/featured-photos`), updates photo_url, and removes the old
 * bucket objects. Admin only. Safe to re-run — skips non-Supabase URLs.
 */
export async function POST() {
  try {
    const auth = await createAuthClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhjsvoorl";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret)
      return NextResponse.json({ error: "Cloudinary not configured" }, { status: 503 });

    const { data: features } = await supabase
      .from("featured_artists")
      .select("id, photo_url")
      .not("photo_url", "is", null);

    const results: { id: string; migrated: boolean; reason?: string }[] = [];
    const oldPaths: string[] = [];

    for (const f of features ?? []) {
      const url: string = f.photo_url;
      if (!url.includes("supabase.co")) {
        results.push({ id: f.id, migrated: false, reason: "not-supabase" });
        continue;
      }
      try {
        // Track the bucket path for cleanup: featured-photos/<id>/photo.<ext>
        const m = url.match(/featured-photos\/(.+?)(\?|$)/);
        if (m) oldPaths.push(m[1]);

        const dlRes = await fetch(url.split("?")[0]);
        if (!dlRes.ok) throw new Error(`download ${dlRes.status}`);
        const buf = Buffer.from(await dlRes.arrayBuffer());
        const contentType = dlRes.headers.get("content-type") || "image/jpeg";

        const timestamp = Math.floor(Date.now() / 1000);
        const folder = "afropitch/featured-photos";
        const toSign = `folder=${folder}&invalidate=true&overwrite=true&public_id=${f.id}&timestamp=${timestamp}${apiSecret}`;
        const signature = createHash("sha1").update(toSign).digest("hex");

        const data = new FormData();
        data.append("file", new Blob([buf], { type: contentType }), "photo.jpg");
        data.append("api_key", apiKey);
        data.append("timestamp", String(timestamp));
        data.append("signature", signature);
        data.append("folder", folder);
        data.append("public_id", f.id);
        data.append("overwrite", "true");
        data.append("invalidate", "true");

        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: data,
        });
        const up = await upRes.json().catch(() => ({}));
        if (!upRes.ok || !up.secure_url) throw new Error("cloudinary upload failed");

        const publicUrl = `${up.secure_url}?v=${Date.now()}`;
        await supabase.from("featured_artists").update({ photo_url: publicUrl }).eq("id", f.id);
        results.push({ id: f.id, migrated: true });
      } catch (e) {
        results.push({
          id: f.id,
          migrated: false,
          reason: e instanceof Error ? e.message : "failed",
        });
      }
    }

    // Remove the old bucket objects now that they live on Cloudinary.
    let cleaned = 0;
    if (oldPaths.length > 0) {
      const { error } = await supabase.storage.from("featured-photos").remove(oldPaths);
      if (!error) cleaned = oldPaths.length;
    }

    return NextResponse.json({ ok: true, results, cleaned });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Migration failed" },
      { status: 500 }
    );
  }
}
