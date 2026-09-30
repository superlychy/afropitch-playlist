"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Copy, Check, Gift, Clock } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

interface ReferralRow {
  name: string;
  status: "pending" | "qualified";
  created_at: string;
  qualified_at: string | null;
}

export function ReferralCard() {
  const [code, setCode] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [pending, setPending] = useState(0);
  const [qualified, setQualified] = useState(0);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/referral/stats");
        const data = await res.json();
        if (data.success) {
          setCode(data.referral_code);
          setBalance(data.referral_balance);
          setPending(data.pending);
          setQualified(data.qualified);
          setRows(data.referrals || []);
        }
      } catch {
        // Card stays hidden if stats fail to load.
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  if (!loaded || !code) return null;

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/ref/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <Card className="bg-zinc-900 border-white/10 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-900/40 to-black p-4 sm:p-6 border-b border-amber-500/10">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" /> Refer & Earn
        </h3>
        <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {pricingConfig.currency}
          {balance.toLocaleString()}
        </div>
        <p className="text-xs text-gray-500 mt-1">referral balance</p>
      </div>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <p className="text-sm text-gray-300">
          Earn {pricingConfig.currency}1,000 for every artist who joins with your
          link and pays for their first submission. Your referral balance pays
          for submissions.
        </p>

        <div className="flex items-center gap-2">
          <code className="flex-1 truncate bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300">
            {link}
          </code>
          <Button size="sm" variant="outline" onClick={copy} className="shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black/40 border border-white/10 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-white">{qualified}</div>
            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <Gift className="w-3 h-3 text-green-400" /> paid referrals
            </div>
          </div>
          <div className="bg-black/40 border border-white/10 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-white">{pending}</div>
            <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> joined, not paid yet
            </div>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.slice(0, 5).map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm bg-black/40 border border-white/10 rounded-lg px-3 py-2"
              >
                <span className="text-gray-300 truncate">{r.name}</span>
                <span
                  className={
                    r.status === "qualified"
                      ? "text-green-400 text-xs font-medium"
                      : "text-amber-400 text-xs font-medium"
                  }
                >
                  {r.status === "qualified" ? "+₦1,000" : "pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
