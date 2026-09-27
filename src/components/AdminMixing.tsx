"use client";

import { useState } from "react";
import { AdminMixingQueue } from "./AdminMixingQueue";
import { AdminMixedSongs } from "./AdminMixedSongs";

export function AdminMixing() {
  const [tab, setTab] = useState<"queue" | "showcase">("queue");
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("queue")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "queue"
              ? "bg-green-500 text-black"
              : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
          }`}
        >
          Mixing Queue
        </button>
        <button
          onClick={() => setTab("showcase")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "showcase"
              ? "bg-green-500 text-black"
              : "bg-white/5 text-gray-400 hover:text-white border border-white/10"
          }`}
        >
          Showcase
        </button>
      </div>
      {tab === "queue" ? <AdminMixingQueue /> : <AdminMixedSongs />}
    </div>
  );
}
