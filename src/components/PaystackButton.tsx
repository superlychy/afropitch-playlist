"use client";

import React from 'react';
import { PaystackButton } from 'react-paystack';
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

interface PayProps {
    email: string;
    amount: number; // in Kobo (Naira * 100) or smallest currency unit
    onSuccess: (reference: any) => void;
    onClose: () => void;
}

const PayWithPaystack = ({ email, amount, onSuccess, onClose }: PayProps) => {

    // REPLACE THIS WITH YOUR OWN PUBLIC KEY FROM PAYSTACK DASHBOARD
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_KEY || "pk_test_0e3dd68677c77840131496660e5361362e697858";

    const componentProps = {
        email,
        amount, // Paystack expects amount in kobo
        metadata: {
            name: "AfroPitch Submission",
            phone: "",
            custom_fields: []
        },
        publicKey,
        text: "Pay Now",
        onSuccess,
        onClose,
    };

    return (
        <PaystackButton
            {...componentProps}
            className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 font-bold shadow-lg shadow-green-900/20 rounded-md text-white flex items-center justify-center gap-2"
        >
            <CreditCard className="w-4 h-4" /> PAY ₦{(amount / 100).toLocaleString()}
        </PaystackButton>
    );
};

export default PayWithPaystack;
