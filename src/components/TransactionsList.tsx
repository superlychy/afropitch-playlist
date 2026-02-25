"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowDownLeft, ArrowUpRight, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pricingConfig } from "@/../config/pricing";

interface Transaction {
    id: string;
    amount: number;
    type: 'payment' | 'refund' | 'earning' | 'withdrawal' | 'deposit';
    description: string;
    created_at: string;
    reference: string | null;
    user_id: string;
    profiles?: {
        full_name: string;
        email: string;
    } | null;
}

const TYPE_COLORS: Record<string, string> = {
    deposit: 'bg-green-500/20 text-green-400 border-green-500/30',
    refund: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    earning: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    payment: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    withdrawal: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const isCredit = (type: string) => ['deposit', 'refund', 'earning'].includes(type);

export function TransactionsList({ userId }: { userId?: string }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const fetchTransactions = async () => {
        setIsLoading(true);
        let query = supabase
            .from('transactions')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false })
            .limit(200);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            console.error("TransactionsList fetch error:", error.message);
        }
        if (data) setTransactions(data as any);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchTransactions();
    }, [userId]);

    const filtered = transactions.filter(tx => {
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const searchLower = search.toLowerCase();
        const matchesSearch = !search
            || (tx.description || '').toLowerCase().includes(searchLower)
            || (tx.profiles?.full_name || '').toLowerCase().includes(searchLower)
            || (tx.profiles?.email || '').toLowerCase().includes(searchLower)
            || (tx.reference || '').toLowerCase().includes(searchLower);
        return matchesType && matchesSearch;
    });

    const totalDeposits = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + Number(t.amount), 0);
    const totalWithdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
    const totalPayments = transactions.filter(t => t.type === 'payment').reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    if (isLoading) return (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-6">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading transactions...
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Summary Row — only for admin view (no userId) */}
            {!userId && (
                <div className="grid grid-cols-3 gap-4 mb-2">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">Total Deposits</p>
                        <p className="font-bold text-green-400">{pricingConfig.currency}{totalDeposits.toLocaleString()}</p>
                    </div>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">Total Payments</p>
                        <p className="font-bold text-yellow-400">{pricingConfig.currency}{totalPayments.toLocaleString()}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">Total Withdrawals</p>
                        <p className="font-bold text-red-400">{pricingConfig.currency}{totalWithdrawals.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search name, email, description..."
                        className="pl-9 bg-black/40 border-white/10 text-white text-sm"
                    />
                </div>
                <div className="flex gap-1 flex-wrap">
                    {['all', 'deposit', 'payment', 'refund', 'earning', 'withdrawal'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-3 py-1.5 rounded text-xs font-bold capitalize border transition-all ${typeFilter === t
                                ? 'bg-green-600 text-white border-green-500'
                                : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <Button size="sm" variant="ghost" onClick={fetchTransactions} className="text-gray-400 hover:text-white">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <Card className="bg-white/5 border-dashed border-white/10 p-8 text-center">
                    <p className="text-gray-400 text-sm">No transactions found.</p>
                </Card>
            ) : (
                <Card className="bg-black/40 border-white/10 max-h-[600px] overflow-y-auto">
                    <CardContent className="p-0 divide-y divide-white/5">
                        {filtered.map((tx) => (
                            <div
                                key={tx.id}
                                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors gap-4"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`p-2 rounded-full shrink-0 ${isCredit(tx.type) ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-400'}`}>
                                        {isCredit(tx.type) ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${TYPE_COLORS[tx.type] || 'bg-white/10 text-white border-white/20'}`}>
                                                {tx.type}
                                            </span>
                                            {!userId && tx.profiles?.full_name && (
                                                <span className="text-xs text-gray-400 truncate max-w-[140px]">
                                                    {tx.profiles.full_name}
                                                    {tx.profiles.email && <span className="text-gray-600"> · {tx.profiles.email}</span>}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs" title={tx.description}>
                                            {tx.description || 'No description'}
                                        </p>
                                        {tx.reference && (
                                            <p className="text-[10px] text-gray-700 font-mono mt-0.5 truncate max-w-xs" title={tx.reference}>
                                                Ref: {tx.reference}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className={`font-bold text-sm block ${isCredit(tx.type) ? 'text-green-400' : 'text-white'}`}>
                                        {isCredit(tx.type) ? '+' : '-'}{pricingConfig.currency}{Math.abs(Number(tx.amount)).toLocaleString()}
                                    </span>
                                    <span className="text-[10px] text-gray-600 block">
                                        {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
            <p className="text-xs text-gray-600 text-right">{filtered.length} of {transactions.length} transactions</p>
        </div>
    );
}
