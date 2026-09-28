import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Uploads a Featured Artist photo to Cloudinary (folder `afropitch/featured-photos`).
// Only text lives in Supabase; all media goes to Cloudinary.
// Two authorized paths:
//  1. Artist: multipart field `token` = their questionnaire token.
//  2. Admin: multipart field `feature_id` + a logged-in admin session.
// The photo uses public_id = the feature id, so re-uploads overwrite it,
// and featured_artists.photo_url is updated to the Cloudinary URL.

const ALLOWED_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const form = await req.formData();
        const file = form.get("file");
        const token = String(form.get("token") || "").trim();
        const featureIdParam = String(form.get("feature_id") || "").trim();

        if (!(file instanceof File)) {
            return NextResponse.json({ ok: false, error: "No photo attached." }, { status: 400 });
        }
        const ext = ALLOWED_MIME[file.type];
        if (!ext) {
            return NextResponse.json({ ok: false, error: "Photo must be a JPG, PNG or WebP image." }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ ok: false, error: "Photo is too large (max 8MB)." }, { status: 400 });
        }

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let featureId: string | null = null;

        if (token) {
            const { data, error } = await admin
                .from("featured_artists")
                .select("id")
                .eq("questionnaire_token", token)
                .single();
            if (error || !data) {
                return NextResponse.json({ ok: false, error: "Invalid link. Please reopen your questionnaire email." }, { status: 403 });
            }
            featureId = data.id;
        } else if (featureIdParam) {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return NextResponse.json({ ok: false, error: "Please log in." }, { status: 401 });
            }
            const { data: profile } = await admin
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();
            if (profile?.role !== "admin") {
                return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
            }
            const { data: feature } = await admin
                .from("featured_artists")
                .select("id")
                .eq("id", featureIdParam)
                .single();
            if (!feature) {
                return NextResponse.json({ ok: false, error: "Feature not found." }, { status: 404 });
            }
            featureId = feature.id;
        } else {
            return NextResponse.json({ ok: false, error: "Missing credentials." }, { status: 400 });
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhjsvoorl";
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!apiKey || !apiSecret) {
            return NextResponse.json({ ok: false, error: "Photo uploads are not configured. Please try again later." }, { status: 503 });
        }

        // Server-side signed upload to Cloudinary; the secret never leaves the server.
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = "afropitch/featured-photos";
        const publicId = featureId as string;
        const toSign = `folder=${folder}&invalidate=true&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = createHash("sha1").update(toSign).digest("hex");

        const bytes = Buffer.from(await file.arrayBuffer());
        const data = new FormData();
        data.append("file", new Blob([bytes], { type: file.type }), `photo.${ext}`);
        data.append("api_key", apiKey);
        data.append("timestamp", String(timestamp));
        data.append("signature", signature);
        data.append("folder", folder);
        data.append("public_id", publicId);
        data.append("overwrite", "true");
        data.append("invalidate", "true");

        const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: "POST",
            body: data,
        });
        const up = await upRes.json().catch(() => ({}));
        if (!upRes.ok || !up.secure_url) {
            return NextResponse.json({ ok: false, error: "Upload failed. Please try again." }, { status: 500 });
        }
        // Cache-bust so a replaced photo shows immediately.
        const publicUrl = `${up.secure_url}?v=${Date.now()}`;

        const { error: updateError } = await admin
            .from("featured_artists")
            .update({ photo_url: publicUrl })
            .eq("id", featureId);
        if (updateError) {
            return NextResponse.json({ ok: false, error: "Photo saved but the feature could not be updated." }, { status: 500 });
        }

        return NextResponse.json({ ok: true, url: publicUrl });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: "Upload failed. Please try again." }, { status: 500 });
    }
}
