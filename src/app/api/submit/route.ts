import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      user_id,
      playlist_ids,
      song_title,
      artist_name,
      song_link,
      tier,
      total_amount,
      email,
    } = body;

    // --- Validation ---
    if (!user_id || !playlist_ids?.length || !song_title || !song_link || !artist_name) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate song link format
    const validDomains = [
      "open.spotify.com",
      "spotify.com",
      "music.apple.com",
      "audiomack.com",
      "soundcloud.com",
      "boomplay.com",
      "youtube.com",
      "youtu.be",
      "audiomack.com",
    ];
    const linkUrl = song_link.toLowerCase();
    const isValidLink = validDomains.some((d) => linkUrl.includes(d));
    if (!isValidLink) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please use a valid link from Spotify, Apple Music, Audiomack, SoundCloud, BoomPlay, or YouTube.",
        },
        { status: 400 }
      );
    }

    // --- Check for duplicate submissions (same artist, same song, same playlist) ---
    const { data: existing } = await supabase
      .from("submissions")
      .select("id, playlist_id")
      .eq("artist_id", user_id)
      .eq("song_title", song_title)
      .in("playlist_id", playlist_ids);

    if (existing && existing.length > 0) {
      const existingPlaylistIds = existing.map((e: any) => e.playlist_id);
      const duplicatePlaylists = playlist_ids.filter((id: string) =>
        existingPlaylistIds.includes(id)
      );
      return NextResponse.json(
        {
          success: false,
          error: `You've already submitted "${song_title}" to ${duplicatePlaylists.length} of the selected playlists.`,
        },
        { status: 409 }
      );
    }

    // --- Fetch current balance (atomic check) ---
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    const currentBalance = Number(profile.balance);
    if (total_amount > 0 && currentBalance < total_amount) {
      return NextResponse.json(
        { success: false, error: "Insufficient wallet balance" },
        { status: 400 }
      );
    }

    // --- Calculate per-item costs (matching client logic) ---
    const { data: playlistsData } = await supabase
      .from("playlists")
      .select("id, type, submission_fee")
      .in("id", playlist_ids);

    const pricingTiers: Record<string, number> = {
      standard: 3000,
      express: 5000,
      exclusive: 13500,
    };

    let paidTotal = 0;
    let paidCount = 0;
    const perItemCosts: Record<string, number> = {};

    for (const pid of playlist_ids) {
      const pl = playlistsData?.find((p: any) => p.id === pid);
      let cost = 0;
      if (pl) {
        if (pl.type === "exclusive") cost = pricingTiers.exclusive;
        else if (pl.type === "express") cost = pricingTiers.express;
        else if (pl.type === "free") cost = 0;
        else cost = pricingTiers[tier] || pricingTiers.standard;
      }
      perItemCosts[pid] = cost;
      if (cost > 0) {
        paidTotal += cost;
        paidCount++;
      }
    }

    // Bulk discount
    const discount = paidCount >= 7 ? Math.floor(paidTotal * 0.1) : 0;
    const discountPerItem = paidCount > 0 ? discount / paidCount : 0;

    const finalTotal = paidTotal - discount;

    // Verify amount matches what client calculated (within rounding)
    if (total_amount > 0 && Math.abs(finalTotal - total_amount) > 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount mismatch. Please try again.",
        },
        { status: 400 }
      );
    }

    // --- ATOMIC: Deduct wallet + insert submissions + record transaction ---
    if (total_amount > 0) {
      const { error: deductError } = await supabase
        .from("profiles")
        .update({ balance: currentBalance - total_amount })
        .eq("id", user_id)
        .eq("balance", currentBalance); // Optimistic lock: only update if balance hasn't changed

      if (deductError) {
        return NextResponse.json(
          { success: false, error: "Balance changed. Please try again." },
          { status: 409 }
        );
      }

      // Verify deduction worked (optimistic lock check)
      const { data: newProfile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user_id)
        .single();

      if (!newProfile || Number(newProfile.balance) !== currentBalance - total_amount) {
        // Rollback
        await supabase
          .from("profiles")
          .update({ balance: currentBalance })
          .eq("id", user_id);

        return NextResponse.json(
          { success: false, error: "Payment processing failed. Please try again." },
          { status: 500 }
        );
      }
    }

    // Insert submissions
    const submissions = playlist_ids.map((playlistId: string) => {
      const cost = perItemCosts[playlistId] || 0;
      const finalCost = cost > 0 ? Math.max(0, cost - discountPerItem) : 0;
      return {
        artist_id: user_id,
        playlist_id: playlistId,
        song_title,
        artist_name,
        song_link,
        tier,
        amount_paid: finalCost,
        status: "pending",
      };
    });

    const { error: insertError } = await supabase
      .from("submissions")
      .insert(submissions);

    if (insertError) {
      // Rollback wallet deduction
      if (total_amount > 0) {
        await supabase
          .from("profiles")
          .update({ balance: currentBalance })
          .eq("id", user_id);
      }
      return NextResponse.json(
        { success: false, error: "Failed to save submissions. Please try again." },
        { status: 500 }
      );
    }

    // Record transaction
    if (total_amount > 0) {
      await supabase.from("transactions").insert({
        user_id,
        amount: -total_amount,
        type: "payment",
        description: `Submission Fee: ${playlist_ids.length} Playlists${discount > 0 ? ` (10% bulk discount)` : ""}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Submission API error:", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
