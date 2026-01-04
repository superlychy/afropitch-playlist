"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, CreditCard, User } from "lucide-react";
import { pricingConfig } from "@/../config/pricing";

interface Transaction {
    id: string;
    amount: number;
    type: 'payment' | 'refund' | 'earning' | 'withdrawal' | 'deposit';
    description: string;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
    } | null;
}

export function TransactionsList({ userId }: { userId?: string }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            let query = supabase
                .from('transactions')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false });

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;

            if (data) setTransactions(data as any);
            setIsLoading(false);
        };

        fetchTransactions();
    }, [userId]);

    if (isLoading) return <div className="text-gray-500 text-sm">Loading history...</div>;

    if (transactions.length === 0) {
        return (
            <Card className="bg-white/5 border-dashed border-white/10 p-6 text-center">
                <p className="text-gray-400 text-sm">No transaction history yet.</p>
            </Card>
        );
    }

    return (
        <Card className="bg-black/40 border-white/10 max-h-[500px] overflow-y-auto">
            <CardContent className="p-0">
                {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'earning' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                }`}>
                                {tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'earning' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm capitalize flex items-center gap-2">
                                    {tx.type}
                                    {!userId && tx.profiles?.full_name && (
                                        <span className="text-[10px] text-gray-500 font-normal px-2 py-0.5 rounded bg-white/5 flex items-center gap-1">
                                            <User className="w-3 h-3" /> {tx.profiles.full_name}
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-1 max-w-[180px] sm:max-w-xs" title={tx.description}>{tx.description}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`font-bold block ${tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'earning' ? 'text-green-500' : 'text-white'
                                }`}>
                                {tx.type === 'deposit' || tx.type === 'refund' || tx.type === 'earning' ? '+' : '-'}{pricingConfig.currency}{Math.abs(tx.amount).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-gray-600 block">{new Date(tx.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
