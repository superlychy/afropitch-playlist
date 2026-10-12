import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Artist profile photo upload -> Supabase Storage bucket `artist-photos`.
// Logged-in artist only; the photo is stored at {user_id}/profile.{ext}
// (re-uploads overwrite) and profiles.photo_url is updated to the public URL.
// Reads are public (fan pages); writes happen here with the service role.
const ALLOWED_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Please log in." }, { status: 401 });
        }

        const form = await req.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
            return NextResponse.json({ ok: false, error: "No photo attached." }, { status: 400 });
        }
        const ext = ALLOWED_MIME[file.type];
        if (!ext) {
            return NextResponse.json({ ok: false, error: "Photo must be JPG, PNG or WebP." }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ ok: false, error: "Photo is too large (max 4MB)." }, { status: 400 });
        }

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const path = `${user.id}/profile.${ext}`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error: upErr } = await admin.storage
            .from("artist-photos")
            .upload(path, bytes, { contentType: file.type, upsert: true });
        if (upErr) {
            return NextResponse.json({ ok: false, error: "Upload failed. Please try again." }, { status: 500 });
        }

        const { data: urlData } = admin.storage.from("artist-photos").getPublicUrl(path);
        const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

        const { error: dbErr } = await admin
            .from("profiles")
            .update({ photo_url: publicUrl, updated_at: new Date().toISOString() })
            .eq("id", user.id);
        if (dbErr) {
            return NextResponse.json({ ok: false, error: "Photo saved but profile update failed." }, { status: 500 });
        }

        return NextResponse.json({ ok: true, url: publicUrl });
    } catch {
        return NextResponse.json({ ok: false, error: "Upload failed. Please try again." }, { status: 500 });
    }
}
