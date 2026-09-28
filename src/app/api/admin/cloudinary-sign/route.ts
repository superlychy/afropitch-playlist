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

/**
 * POST /api/admin/cloudinary-sign
 * Admin-only. Returns a signed upload payload so the browser can upload
 * directly to Cloudinary (audio as resource_type "video", covers as "image").
 * The API secret never leaves the server.
 *
 * Body: { resource_type: "video" | "image", folder_key?: "showcase" | "preview" }
 *   folder_key "preview" -> afropitch/mix-previews (mixing order previews)
 *   default "showcase"   -> afropitch/mixed-audio / afropitch/mixed-covers
 */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: admin.status });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhjsvoorl";
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary credentials are not configured on the server." },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const resourceType = body.resource_type === "image" ? "image" : "video";
    const folderKey = body.folder_key === "preview" ? "preview" : "showcase";
    const folder =
      folderKey === "preview"
        ? "afropitch/mix-previews"
        : resourceType === "image"
          ? "afropitch/mixed-covers"
          : "afropitch/mixed-audio";
    const timestamp = Math.floor(Date.now() / 1000);

    // Cloudinary signature: sha1 of alphabetically-sorted params + api_secret
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
