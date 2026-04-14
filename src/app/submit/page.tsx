"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { pricingConfig } from "@/../config/pricing";
import {
  Loader2,
  Music,
  CheckCircle,
  Wallet,
  User,
  Search,
  BadgeCheck,
  ListMusic,
  Users,
  ArrowRight,
  Music2,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { SongSearch } from "@/components/SongSearch";

interface Playlist {
  id: string;
  name: string;
  genre: string;
  followers: number;
  curatorName: string;
  description: string;
  coverImage: string;
  submissionFee: number;
  type: "free" | "standard" | "express" | "exclusive";
  playlistLink?: string;
  isAdmin: boolean;
  songCount?: number;
}

const PayWithPaystack = dynamic(() => import("@/components/PaystackButton"), {
  ssr: false,
});

function SubmitForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  // Page State
  const [step, setStep] = useState<"selection" | "details">("selection");
  const [activeTab, setActiveTab] = useState<"playlists" | "curators">(
    "playlists"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [error, setError] = useState(false);

  // Data State
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [curators, setCurators] = useState<any[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);

  // Submission Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tier, setTier] = useState("standard");
  const [artistName, setArtistName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songLink, setSongLink] = useState("");
  const [email, setEmail] = useState("");

  // Ref to prevent double-submit
  const submitRef = useRef(false);

  const genres = [
    "All",
    "Afrobeats",
    "Amapiano",
    "Hip Hop",
    "RnB",
    "Pop",
    "Alternative",
  ];

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      if (user.name) setArtistName(user.name);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const fetchPlaylistsPromise = supabase
          .from("playlists")
          .select("*, curator:profiles!curator_id(role, full_name, verification_status)")
          .eq("is_active", true)
          .order("followers", { ascending: false });

        const fetchCuratorsPromise = supabase
          .from("profiles")
          .select("*, playlists(count)")
          .or("role.eq.curator,role.eq.admin");

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 15000)
        );

        const [plResult, curResult] = await Promise.allSettled([
          Promise.race([fetchPlaylistsPromise, timeoutPromise]),
          Promise.race([fetchCuratorsPromise, timeoutPromise]),
        ]);

        if (plResult.status === "fulfilled" && (plResult.value as any).data) {
          const plData = (plResult.value as any).data;
          const mapped = plData
            .filter(
              (p: any) =>
                p.curator?.role === "admin" ||
                p.curator?.verification_status === "verified"
            )
            .map((p: any) => {
              const match = (p.description || "").match(
                /(\d+)\s+(songs|items|tracks)/i
              );
              return {
                id: p.id,
                name: p.name,
                genre: p.genre || "Other",
                followers: p.followers,
                curatorName: p.curator?.full_name || "Unknown",
                description: p.description,
                coverImage: p.cover_image,
                submissionFee: p.submission_fee,
                type: p.type,
                playlistLink: p.playlist_link,
                isAdmin: p.curator?.role === "admin",
                songCount: match ? parseInt(match[1]) : 0,
              };
            });
          setAllPlaylists(mapped);
        } else {
          console.error("Playlists fetch failed", plResult);
          setError(true);
          toast("Failed to load playlists. Please refresh.", "error");
        }

        if (curResult.status === "fulfilled" && (curResult.value as any).data) {
          const cData = (curResult.value as any).data;
          const verifiedCurators = cData.filter(
            (c: any) =>
              c.role === "admin" || c.verification_status === "verified"
          );
          setCurators(
            verifiedCurators.map((c: any) => ({
              ...c,
              playlistCount: c.playlists?.[0]?.count || 0,
            }))
          );
        } else {
          console.error("Curators fetch failed", curResult);
          setCurators([]);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        toast("Failed to load page data", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Params
  useEffect(() => {
    const playlistParam = searchParams.get("playlist");
    const playlistsParam = searchParams.get("playlists");
    let idsToSelect: string[] = [];

    if (playlistParam) idsToSelect.push(playlistParam);
    if (playlistsParam) {
      idsToSelect = [
        ...idsToSelect,
        ...playlistsParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id),
      ];
    }

    if (idsToSelect.length > 0) {
      setSelectedPlaylistIds((prev) =>
        Array.from(new Set([...prev, ...idsToSelect]))
      );
    }

    const tierParam = searchParams.get("tier");
    if (tierParam) setTier(tierParam);
  }, [searchParams]);

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setSelectedPlaylistIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const proceedToDetails = () => {
    if (selectedPlaylistIds.length === 0) return;
    setStep("details");
    window.scrollTo(0, 0);
  };


  const calculateTotal = () => {
    let paidTotal = 0;
    let paidCount = 0;
    if (selectedPlaylistIds.length === 0)
      return { total: 0, discount: 0 };

    selectedPlaylistIds.forEach((id) => {
      const playlist = allPlaylists.find((p) => p.id === id);
      if (playlist) {
        let cost = 0;
        if (playlist.type === "exclusive")
          cost = pricingConfig.tiers.exclusive.price;
        else if (playlist.type === "express")
          cost = pricingConfig.tiers.express.price;
        else if (playlist.type === "standard" || !playlist.type)
          cost = pricingConfig.tiers.standard.price;
        // free = 0

        if (cost > 0) {
          paidTotal += cost;
          paidCount++;
        }
      }
    });

    let discount = 0;
    if (paidCount >= 7) discount = Math.floor(paidTotal * 0.1);

    return { total: paidTotal - discount, discount };
  };

  const { total, discount: discountAmount } = calculateTotal();

  // Validate song link
  const isValidSongLink = (url: string): boolean => {
    try {
      const u = new URL(url.startsWith("http") ? url : `https://${url}`);
      const host = u.hostname.toLowerCase();
      const valid = [
        "open.spotify.com",
        "spotify.com",
        "music.apple.com",
        "audiomack.com",
        "soundcloud.com",
        "boomplay.com",
        "youtube.com",
        "youtu.be",
      ];
      return valid.some((d) => host.includes(d) || host.endsWith(`.${d}`));
    } catch {
      return false;
    }
  };

  // ============================================
  // MAIN SUBMIT HANDLER — Server-side atomic
  // ============================================
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Double-submit guard
    if (submitRef.current || isSubmitting) return;
    if (!user) {
      toast("Please login to submit.", "warning");
      router.push("/portal");
      return;
    }

    // Validate song link
    if (!isValidSongLink(songLink)) {
      toast(
        "Please use a valid link from Spotify, Apple Music, Audiomack, SoundCloud, BoomPlay, or YouTube.",
        "error"
      );
      return;
    }

    submitRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          playlist_ids: selectedPlaylistIds,
          song_title: songTitle,
          artist_name: artistName,
          song_link: songLink,
          tier,
          total_amount: total,
          email,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Submission failed");
      }

      // Refresh user balance
      await refreshUser();

      setIsSuccess(true);
      toast("Submission received successfully! 🎵", "success");
    } catch (err: any) {
      console.error("Submission error:", err);
      toast(err.message || "An error occurred. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
      submitRef.current = false;
    }
  }

  // Filter Logic
  const filteredPlaylists = allPlaylists.filter((pl) => {
    const matchesSearch =
      pl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pl.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGenre =
      selectedGenre === "All" ||
      (pl.genre &&
        pl.genre.toLowerCase() === selectedGenre.toLowerCase());
    const matchesPrice =
      selectedPrice === "all" ||
      (selectedPrice === "standard" &&
        (!pl.type || pl.type === "standard")) ||
      pl.type === selectedPrice;
    return matchesSearch && matchesGenre && matchesPrice;
  });

  const filteredCurators = curators.filter((cur) => {
    const matchesSearch = (cur.full_name || "Curator")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // ============================================
  // SUCCESS VIEW
  // ============================================
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center space-y-6 py-24 min-h-[60vh] pb-20 md:pb-0">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-white">
          Submission Received!
        </h1>
        <p className="text-gray-400">
          Curators have been notified.
          <br />
          Paid:{" "}
          <span className="text-green-400 font-bold">
            {pricingConfig.currency}
            {total.toLocaleString()}
          </span>
        </p>
        <div className="flex gap-4">
          <Button
            onClick={() => router.push("/dashboard/artist")}
            className="bg-green-600 hover:bg-green-700"
          >
            Go to Dashboard
          </Button>
          <Button
            onClick={() => {
              setIsSuccess(false);
              setSelectedPlaylistIds([]);
              setStep("selection");
            }}
            variant="outline"
          >
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // SELECTION VIEW
  // ============================================
  if (step === "selection") {
    return (
      <div className="w-full mx-auto max-w-7xl px-4 py-16 md:py-24 min-h-screen relative pb-32">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Submit Your <span className="text-green-500">Music</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Browse top-tier playlists and select the perfect curators for your
            sound.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="max-w-2xl mx-auto mb-10 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search playlists or curators..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === "playlists" && (
            <div className="w-full md:w-48">
              <Select
                className="bg-white/5 border-white/10 text-white"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
              >
                {genres.map((g) => (
                  <option key={g} value={g} className="bg-zinc-900 text-white">
                    {g}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {activeTab === "playlists" && (
            <div className="w-full md:w-48">
              <Select
                className="bg-white/5 border-white/10 text-white"
                value={selectedPrice}
                onChange={(e) => setSelectedPrice(e.target.value)}
              >
                <option value="all" className="bg-zinc-900 text-white">
                  All Prices
                </option>
                <option value="free" className="bg-zinc-900 text-white">
                  Free Submission
                </option>
                <option value="standard" className="bg-zinc-900 text-white">
                  Standard (
                  {pricingConfig.currency}
                  {pricingConfig.tiers.standard.price.toLocaleString()})
                </option>
                <option value="express" className="bg-zinc-900 text-white">
                  Express Only (
                  {pricingConfig.currency}
                  {pricingConfig.tiers.express.price.toLocaleString()})
                </option>
                <option value="exclusive" className="bg-zinc-900 text-white">
                  Exclusive (
                  {pricingConfig.currency}
                  {pricingConfig.tiers.exclusive.price.toLocaleString()})
                </option>
              </Select>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/5 p-1 rounded-full flex gap-1 border border-white/10">
            <button
              onClick={() => setActiveTab("playlists")}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === "playlists"
                  ? "bg-green-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Playlists
            </button>
            <button
              onClick={() => setActiveTab("curators")}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                activeTab === "curators"
                  ? "bg-green-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Curators
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-20 text-gray-500">
            Loading {activeTab}...
          </div>
        )}

        {/* Playlists Grid */}
        {!isLoading && activeTab === "playlists" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlaylists.length === 0 && (
              <div className="text-center w-full col-span-full text-gray-500">
                No playlists found.
              </div>
            )}
            {filteredPlaylists.map((playlist) => {
              const isSelected = selectedPlaylistIds.includes(playlist.id);
              return (
                <div
                  key={playlist.id}
                  onClick={(e) => toggleSelection(playlist.id, e)}
                  className="cursor-pointer h-full"
                >
                  <Card
                    className={`group h-full flex flex-col backdrop-blur-sm transition-all duration-300 overflow-hidden shadow-lg ${
                      isSelected
                        ? "bg-green-900/10 border-green-500 shadow-green-900/20"
                        : "bg-black/60 border-white/10 hover:bg-black/80 hover:border-green-500/30"
                    }`}
                  >
                    <CardContent className="p-0 flex flex-col h-full">
                      <div className="w-full h-48 relative overflow-hidden bg-zinc-800">
                        {playlist.coverImage?.startsWith("http") ? (
                          <img
                            src={playlist.coverImage}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            alt={playlist.name}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Music2 className="w-12 h-12" />
                          </div>
                        )}
                        <div
                          className={`absolute inset-0 transition-opacity duration-300 ${
                            isSelected
                              ? "bg-green-500/20"
                              : "bg-gradient-to-t from-black/90 via-black/20 to-transparent"
                          }`}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                            <div className="bg-green-500 rounded-full p-3 shadow-lg scale-110">
                              <CheckCircle className="w-8 h-8 text-black" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-4 left-4 text-white p-2">
                          <p className="font-bold text-lg leading-tight">
                            {playlist.name}
                          </p>
                          <div className="flex gap-2 items-center mt-1">
                            <p className="text-xs text-green-400 font-medium uppercase">
                              {playlist.genre}
                            </p>
                            {playlist.isAdmin && (
                              <span className="bg-green-500 text-black text-[10px] font-bold px-1.5 rounded uppercase">
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-5 space-y-4 flex-1 flex flex-col">
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {playlist.description &&
                          !playlist.description.match(/^0\s+(songs|items)/i)
                            ? playlist.description
                            : "No description available."}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-400">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />{" "}
                            {playlist.followers.toLocaleString()}
                          </span>
                          {(playlist.songCount || 0) > 0 && (
                            <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                              {playlist.songCount} Items
                            </span>
                          )}
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                          <div className="text-sm">
                            <span className="block text-[10px] text-gray-500 uppercase tracking-wider">
                              Fee
                            </span>
                            <span className="font-bold text-white">
                              {playlist.type === "exclusive"
                                ? `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price.toLocaleString()}`
                                : playlist.type === "express"
                                ? `${pricingConfig.currency}${pricingConfig.tiers.express.price.toLocaleString()}`
                                : playlist.type === "standard"
                                ? `${pricingConfig.currency}${pricingConfig.tiers.standard.price.toLocaleString()}`
                                : playlist.submissionFee > 0
                                ? `${pricingConfig.currency}${playlist.submissionFee.toLocaleString()}`
                                : "FREE"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/playlist/${playlist.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/10 hover:bg-white/10 text-white"
                              >
                                View
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              className={`shadow-lg transition-all ${
                                isSelected
                                  ? "bg-red-500 hover:bg-red-600 text-white"
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleSelection(playlist.id, e); }}
                            >
                              {isSelected ? "Remove" : "Select"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}

        {/* Curators Grid */}
        {!isLoading && activeTab === "curators" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCurators.length === 0 && (
              <div className="text-center w-full col-span-full text-gray-500">
                No curators found.
              </div>
            )}
            {filteredCurators.map((curator) => (
              <div key={curator.id} className="space-y-4">
                <Card className="cursor-pointer transition-all duration-300 border-white/10 bg-black/60 backdrop-blur-sm hover:bg-black/80 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-900/10 h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl font-bold text-white overflow-hidden border-2 border-white/10">
                        {curator.role === "admin" ? (
                          <img
                            src="/admin_avatar.png"
                            className="w-full h-full object-cover"
                            alt="Admin"
                          />
                        ) : curator.avatar_url ? (
                          <img
                            src={curator.avatar_url}
                            className="w-full h-full object-cover"
                            alt={curator.full_name}
                          />
                        ) : (
                          curator.full_name?.[0] || (
                            <User className="w-8 h-8 text-gray-500" />
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-green-500 text-xs font-medium bg-green-500/10 px-2 py-1 rounded-full">
                        <BadgeCheck className="w-3 h-3" /> Curator
                      </div>
                    </div>
                    <CardTitle className="mt-4 text-xl text-white">
                      {curator.full_name || "Curator"}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-green-400 font-bold mb-1">
                      <ListMusic className="w-3 h-3" />
                      {curator.playlistCount !== undefined
                        ? curator.playlistCount
                        : 0}{" "}
                      Playlists
                    </div>
                    <CardDescription className="line-clamp-2 text-gray-400 min-h-[2.5rem]">
                      {curator.bio || "No bio available."}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-4">
                    <Link
                      href={`/curators/${curator.id}`}
                      className="w-full"
                    >
                      <Button
                        variant="ghost"
                        className="w-full text-green-400 hover:text-green-300 hover:bg-green-400/10 group"
                      >
                        View Profile{" "}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Floating Selection Bar */}
        <div
          className={`fixed bottom-0 left-0 right-0 bg-black/95 border-t border-green-500/30 backdrop-blur-xl p-3 md:p-4 transition-transform duration-300 z-50 shadow-2xl ${
            selectedPlaylistIds.length > 0
              ? "translate-y-0"
              : "translate-y-full"
          }`}
        >
          <div className="container mx-auto max-w-6xl flex items-center justify-between px-2 md:px-0">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="bg-green-500 text-black font-bold w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-lg animate-bounce shadow-lg shadow-green-500/20">
                {selectedPlaylistIds.length}
              </div>
              <div className="flex flex-col">
                <p className="text-white font-bold text-sm md:text-lg leading-tight">
                  <span className="md:hidden">Total: </span>
                  {pricingConfig.currency}
                  {total.toLocaleString()}
                  <span className="hidden md:inline text-gray-400 font-normal mx-2">
                    •
                  </span>
                  <span className="hidden md:inline text-gray-300 font-normal">
                    {selectedPlaylistIds.length} Selected
                  </span>
                </p>
                <p className="text-[10px] md:text-xs text-gray-400 hidden md:block">
                  Step 1 of 2
                </p>
              </div>
            </div>
            <Button
              size="default"
              onClick={proceedToDetails}
              className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm md:text-lg px-6 md:px-8 py-2 md:py-6 rounded-full shadow-lg shadow-green-900/20 h-10 md:h-12 flex items-center"
            >
              Continue <ArrowRight className="ml-2 w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // DETAILS VIEW (Form) — Sticky Checkout
  // ============================================
  return (
    <div className="container mx-auto px-4 max-w-6xl py-12 md:py-16 pb-32 md:pb-24">
      <div className="text-center mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-white sm:text-4xl text-pretty">
          Complete Your Submission
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Review your selection and complete your submission details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 fade-in duration-300">
        {/* Form Column */}
        <div className="lg:col-span-2">
          <Card className="border-green-500/20 shadow-[0_0_50px_rgba(22,163,74,0.05)] bg-black/40 backdrop-blur-sm">
            <form onSubmit={onSubmit}>
              <CardHeader>
                <CardTitle>Track Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pb-24 md:pb-6">
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>
                        Selected Playlists ({selectedPlaylistIds.length})
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep("selection")}
                        className="text-green-500 hover:text-green-400"
                      >
                        Edit Selection
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                      {filteredPlaylists
                        .filter((p) => selectedPlaylistIds.includes(p.id))
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/10"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center overflow-hidden bg-zinc-800">
                                {p.coverImage?.startsWith("http") ? (
                                  <img
                                    src={p.coverImage}
                                    className="w-full h-full object-cover"
                                    alt={p.name}
                                  />
                                ) : (
                                  <Music className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm font-bold text-white truncate block max-w-[180px]">
                                  {p.name}
                                </span>
                                <span className={`text-[10px] font-bold uppercase ${
                                  p.type === "exclusive" ? "text-yellow-400" :
                                  p.type === "express" ? "text-blue-400" :
                                  p.type === "free" ? "text-gray-500" :
                                  "text-gray-400"
                                }`}>
                                  {p.type === "free" ? "Free" :
                                   p.type === "exclusive" ? "24hr" :
                                   p.type === "express" ? "48hr" :
                                   "5 days"} review
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-white">
                              {p.type === "exclusive"
                                ? `${pricingConfig.currency}${pricingConfig.tiers.exclusive.price.toLocaleString()}`
                                : p.type === "express"
                                ? `${pricingConfig.currency}${pricingConfig.tiers.express.price.toLocaleString()}`
                                : p.type === "standard"
                                ? `${pricingConfig.currency}${pricingConfig.tiers.standard.price.toLocaleString()}`
                                : "FREE"}
                            </span>
                          </div>
                        ))}
                    </div>
                    {discountAmount > 0 && (
                      <p className="text-xs text-green-400 font-bold">
                        Bulk discount applied (10% off paid items)!
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Artist Name</Label>
                    <Input
                      placeholder="e.g. Burna Boy"
                      required
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Song Title</Label>
                    <Input
                      placeholder="e.g. Last Last"
                      required
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <SongSearch
                    value={songLink}
                    onChange={setSongLink}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <div className="w-full bg-black/40 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Subtotal ({selectedPlaylistIds.length || 1} items)</span>
                    <span>
                      {pricingConfig.currency}
                      {(total + (discountAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-400">
                      <span>Bulk Discount</span>
                      <span>
                        -{pricingConfig.currency}
                        {discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-white border-t border-white/10 pt-2 mt-2">
                    <span>Total Due</span>
                    <span>
                      {pricingConfig.currency}
                      {total.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div className="bg-gradient-to-r from-green-950/30 to-black/40 p-4 rounded-xl flex items-center justify-between border border-green-500/20 hover:border-green-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-white text-sm">
                          Pay with Wallet
                        </p>
                        <p className="text-xs text-gray-400">
                          Balance:{" "}
                          {user
                            ? `${pricingConfig.currency}${user.balance.toLocaleString()}`
                            : "Login to view"}
                        </p>
                      </div>
                    </div>
                    {!user ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push("/portal")}
                      >
                        Login
                      </Button>
                    ) : (
                      user.balance < total && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push("/dashboard/artist")}
                          className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500 hover:text-white transition-all duration-300 rounded-lg"
                        >
                          ⚡ Load Funds
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-lg py-6 font-bold rounded-xl shadow-xl shadow-green-500/20 hover:shadow-green-500/40 transition-all duration-300"
                  disabled={
                    isSubmitting ||
                    !user ||
                    (total > 0 && user.balance < total)
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <span>
                      {!user
                        ? "Login to Pay"
                        : total > 0 && user.balance < total
                        ? "Insufficient Balance"
                        : total === 0
                        ? "SUBMIT FREE"
                        : `PAY ${pricingConfig.currency}${total.toLocaleString()}`}
                    </span>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="hidden lg:block space-y-6 sticky top-20">
          <Card className="bg-white/5 border-none">
            <CardHeader>
              <CardTitle className="text-lg">Why use Wallet?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-400 space-y-2">
              <p>• Avoid repetitive card transactions.</p>
              <p>• Easier budgeting for release campaigns.</p>
              <p>• Instant verification.</p>
            </CardContent>
          </Card>
          <Card className="bg-green-600/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" /> Trust
                Guarantee
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-2">
              <p>
                Funds are held securely until your song is reviewed by the
                curator.
              </p>
              <p>If declined, you get a full refund to your wallet.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-green-500/30 backdrop-blur-xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-50 shadow-2xl md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">Total Due</p>
            <p className="text-xl font-bold text-green-400">
              {pricingConfig.currency}{total.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector('form');
              if (form) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) (submitBtn as HTMLButtonElement).click();
              }
            }}
            className="bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold rounded-xl px-8 py-3 shadow-lg shadow-green-500/20"
          >
            {isSubmitting ? "Processing..." : "Pay Now →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center text-white py-20">Loading form...</div>
      }
    >
      <SubmitForm />
    </Suspense>
  );
}
