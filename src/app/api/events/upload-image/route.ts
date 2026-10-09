import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/lib/supabase-server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Uploads an event image to Cloudinary (folder `afropitch/event-images`).
// Admin only: multipart field `event_id` + a logged-in admin session.
// The image uses public_id = the event id, so re-uploads overwrite it,
// and events.image_url is updated to the Cloudinary URL.

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
        const eventIdParam = String(form.get("event_id") || "").trim();

        if (!(file instanceof File)) {
            return NextResponse.json({ ok: false, error: "No image attached." }, { status: 400 });
        }
        const ext = ALLOWED_MIME[file.type];
        if (!ext) {
            return NextResponse.json({ ok: false, error: "Image must be a JPG, PNG or WebP file." }, { status: 400 });
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json({ ok: false, error: "Image is too large (max 8MB)." }, { status: 400 });
        }
        if (!eventIdParam) {
            return NextResponse.json({ ok: false, error: "Missing event." }, { status: 400 });
        }

        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

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
        const { data: event } = await admin
            .from("events")
            .select("id")
            .eq("id", eventIdParam)
            .single();
        if (!event) {
            return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
        }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "dhjsvoorl";
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!apiKey || !apiSecret) {
            return NextResponse.json({ ok: false, error: "Image uploads are not configured. Please try again later." }, { status: 503 });
        }

        // Server-side signed upload to Cloudinary; the secret never leaves the server.
        const timestamp = Math.floor(Date.now() / 1000);
        const folder = "afropitch/event-images";
        const publicId = event.id as string;
        const toSign = `folder=${folder}&invalidate=true&overwrite=true&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = createHash("sha1").update(toSign).digest("hex");

        const bytes = Buffer.from(await file.arrayBuffer());
        const data = new FormData();
        data.append("file", new Blob([bytes], { type: file.type }), `image.${ext}`);
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
        // Cache-bust so a replaced image shows immediately.
        const publicUrl = `${up.secure_url}?v=${Date.now()}`;

        const { error: updateError } = await admin
            .from("events")
            .update({ image_url: publicUrl })
            .eq("id", event.id);
        if (updateError) {
            return NextResponse.json({ ok: false, error: "Image saved but the event could not be updated." }, { status: 500 });
        }

        return NextResponse.json({ ok: true, url: publicUrl });
    } catch {
        return NextResponse.json({ ok: false, error: "Upload failed. Please try again." }, { status: 500 });
    }
}
