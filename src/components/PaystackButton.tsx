"use client";

import React, { useState, useEffect } from "react";

interface PayProps {
  email: string;
  amount: number; // in Kobo
  userId?: string;
  onSuccess: (reference: any) => void;
  onClose: () => void;
}

const PayWithPaystack = ({ email, amount, userId, onSuccess, onClose }: PayProps) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY || "";
  const lockedAmount = React.useMemo(() => amount, [amount]);

  useEffect(() => {
    setMounted(true);
    // Debug log - remove in production
    console.log("[Paystack] Key check:", {
      hasKey: !!publicKey,
      keyLength: publicKey.length,
      startsWithPk: publicKey.startsWith("pk_"),
      first10: publicKey.substring(0, 10)
    });
    // Verify key exists
    if (!publicKey || !publicKey.startsWith("pk_")) {
      console.error("[Paystack] Invalid key:", publicKey.substring(0, 20));
      setError("Payment key not configured. Please contact support.");
    }
  }, []);

  const handleClick = () => {
    if (!publicKey || !publicKey.startsWith("pk_")) {
      setError("Payment configuration error. Please contact support.");
      return;
    }

    setLoading(true);
    setError(null);

    const loadAndPay = () => {
      if (typeof window === "undefined") return;

      const Win: any = window;
      
      if (Win.PaystackPop) {
        const handler = Win.PaystackPop.setup({
          key: publicKey,
          email,
          amount: lockedAmount,
          currency: "NGN",
          metadata: {
            custom_fields: userId
              ? [
                  {
                    display_name: "User ID",
                    variable_name: "user_id",
                    value: userId,
                  },
                ]
              : [],
          },
          onSuccess: (reference: any) => {
            setLoading(false);
            // Close the popup immediately
            if (handler && handler.closeIframe) {
              handler.closeIframe();
            }
            onSuccess(reference);
          },
          onClose: () => {
            setLoading(false);
            onClose();
          },
        });
        handler.openIframe();
      } else {
        // Load Paystack script
        const script = document.createElement("script");
        script.src = "https://js.paystack.co/v1/inline.js";
        script.onload = () => {
          setTimeout(() => {
            const handler2 = Win.PaystackPop?.setup({
              key: publicKey,
              email,
              amount: lockedAmount,
              currency: "NGN",
              metadata: {
                custom_fields: userId
                  ? [
                      {
                        display_name: "User ID",
                        variable_name: "user_id",
                        value: userId,
                      },
                    ]
                  : [],
              },
              onSuccess: (reference: any) => {
                setLoading(false);
                // Close the popup immediately
                if (handler2 && handler2.closeIframe) {
                  handler2.closeIframe();
                }
                onSuccess(reference);
              },
              onClose: () => {
                setLoading(false);
                onClose();
              },
            });
            handler2?.openIframe();
          }, 500);
        };
        script.onerror = () => {
          setLoading(false);
          setError("Failed to load payment. Please try again.");
        };
        document.head.appendChild(script);
      }
    };

    loadAndPay();
  };

  if (!mounted) {
    return (
      <button
        disabled
        className="w-full bg-gray-600 text-white text-base sm:text-lg py-4 sm:py-6 font-bold rounded-xl flex items-center justify-center gap-2"
      >
        ₦{(lockedAmount / 100).toLocaleString()}
      </button>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <button
          disabled
          className="w-full bg-red-900/30 border border-red-500/30 text-red-400 text-sm py-3 font-medium rounded-xl"
        >
          {error}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || lockedAmount <= 0}
      className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white text-base sm:text-lg py-4 sm:py-6 font-bold shadow-xl shadow-green-500/20 hover:shadow-green-500/40 rounded-xl flex items-center justify-center gap-2 transition-all duration-300"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span> Processing...
        </>
      ) : (
        <>💳 PAY ₦{(lockedAmount / 100).toLocaleString()}</>
      )}
    </button>
  );
};

export default PayWithPaystack;
