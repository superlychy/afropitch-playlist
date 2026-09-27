import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Uploads a Featured Artist photo to the `featured-photos` bucket.
// Two authorized paths:
//  1. Artist: multipart field `token` = their questionnaire token.
//  2. Admin: multipart field `feature_id` + a logged-in admin session.
// The photo is stored at featured-photos/<feature_id>/photo.<ext> (upsert),
// and featured_artists.photo_url is updated to the public URL.

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

        const path = `${featureId}/photo.${ext}`;
        const bytes = Buffer.from(await file.arrayBuffer());
        const { error: uploadError } = await admin.storage
            .from("featured-photos")
            .upload(path, bytes, { upsert: true, contentType: file.type });
        if (uploadError) {
            return NextResponse.json({ ok: false, error: "Upload failed. Please try again." }, { status: 500 });
        }

        const { data: urlData } = admin.storage.from("featured-photos").getPublicUrl(path);
        // Cache-bust so a replaced photo shows immediately.
        const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

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
