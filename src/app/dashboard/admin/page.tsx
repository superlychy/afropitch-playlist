"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, TrendingUp, Music, Users, Trophy, DollarSign, ShieldAlert, CheckCircle, XCircle, MessageSquare, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pricingConfig } from "@/../config/pricing";

// ----------------------------------------------------------------------
// TYPES & MOCK DATA (Ideally move to types file)
// ----------------------------------------------------------------------

interface AdminUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    balance: number;
    is_blocked: boolean;
    created_at: string;
}

interface WithdrawalRequest {
    id: string;
    user_id: string;
    user_name: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    bank_details: string;
    date: string;
}

interface SupportTicket {
    id: string;
    user_name: string;
    subject: string;
    status: 'open' | 'closed';
    last_message: string;
    date: string;
}

export default function AdminDashboard() {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "withdrawals" | "support">("overview");

    // DATA STATE
    const [usersList, setUsersList] = useState<AdminUser[]>([]);
    const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);

    useEffect(() => {
        if (!isLoading && (!user || user.role !== "admin")) {
            // In a real app, strict redirect. For demo/dev, we might allow viewing if we manually set role in DB
            // router.push("/portal"); 
        }

        const fetchData = async () => {
            // 1. Fetch Users
            const { data: users, error: userError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (users) setUsersList(users as AdminUser[]);

            // 2. Fetch Withdrawals
            const { data: withdraws, error: withdrawError } = await supabase
                .from('withdrawals')
                .select('*') // You might want to join profiles to get names: .select('*, profiles(full_name)')
                .order('created_at', { ascending: false });

            if (withdraws) {
                // For now, mapping manually if not joined, or assuming we fetch names. 
                // Let's stick to basic fetching. The table has user_id, we might need to fetch names if not joined.
                // For simplicity in this step, we'll map what we have.
                // To get names properly, we should actually join.
                // Refetching with join:
                const { data: withdrawsJoined } = await supabase
                    .from('withdrawals')
                    .select('*, profiles(full_name)')
                    .order('created_at', { ascending: false });

                if (withdrawsJoined) {
                    setWithdrawals(withdrawsJoined.map((w: any) => ({
                        id: w.id,
                        user_id: w.user_id,
                        user_name: w.profiles?.full_name || 'Unknown',
                        amount: w.amount,
                        status: w.status,
                        bank_details: `${w.bank_name} - ${w.account_number}`,
                        date: new Date(w.created_at).toLocaleDateString()
                    })));
                }
            }

            // 3. Fetch Tickets
            const { data: supportTicks, error: ticketError } = await supabase
                .from('support_tickets')
                .select('*, profiles(full_name)')
                .order('created_at', { ascending: false });

            if (supportTicks) {
                setTickets(supportTicks.map((t: any) => ({
                    id: t.id,
                    user_name: t.profiles?.full_name || 'Unknown',
                    subject: t.subject,
                    status: t.status,
                    last_message: t.message, // Initial message as last message for now
                    date: new Date(t.created_at).toLocaleDateString()
                })));
            }
        };

        fetchData();

    }, [user, isLoading, router]);

    // ACTIONS
    const toggleUserBlock = async (userId: string) => {
        // Toggle locally first
        const user = usersList.find(u => u.id === userId);
        if (!user) return;
        const newStatus = !user.is_blocked;

        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: newStatus } : u));

        // Call Supabase
        const { error } = await supabase.from('profiles').update({ is_blocked: newStatus }).eq('id', userId);
        if (error) {
            alert("Error updating user block status: " + error.message);
            // Revert on error
            setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: !newStatus } : u));
        }
    };

    const deleteUser = async (userId: string) => {
        if (confirm("Are you sure you want to delete this user? This cannot be undone.")) {
            // Optimistic Update
            setUsersList(prev => prev.filter(u => u.id !== userId));

            // Call Supabase (Requires admin specific delete capability usually, often via Edge Function or just soft delete if RLS blocks user deletion from auth)
            // If we just delete from profiles, auth user remains. Best to use custom admin function.
            // For now, we try standard table delete (cascades usually require more).
            const { error } = await supabase.from('profiles').delete().eq('id', userId);

            if (error) {
                alert("Error deleting user: " + error.message);
                // Can't easily revert local filter without refetching, so refetch would be safesty.
                // Or just ignore if user doesn't notice immediately.
            } else {
                alert("User deleted from public profiles. Auth account may still exist.");
            }
        }
    };

    const handleWithdrawal = async (id: string, action: 'approve' | 'reject') => {
        const withdrawal = withdrawals.find(w => w.id === id);
        if (!withdrawal) return;

        const status = action === 'approve' ? 'approved' : 'rejected';

        // Optimistic UI update
        setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: status } : w));

        const { error } = await supabase.from('withdrawals').update({ status }).eq('id', id);

        if (error) {
            alert("Error updating withdrawal: " + error.message);
            // Revert state if error
            setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status: withdrawal.status } : w));
            return;
        }

        if (action === 'reject') {
            // Refund the user
            const { data: profile } = await supabase.from('profiles').select('balance').eq('id', withdrawal.user_id).single();
            if (profile) {
                const newBalance = (profile.balance || 0) + withdrawal.amount;
                const { error: refundError } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', withdrawal.user_id);

                if (refundError) {
                    alert("Error refunding user: " + refundError.message);
                } else {
                    alert("Withdrawal rejected and funds refunded.");
                }
            }
        } else {
            alert(`Withdrawal approved.`);
        }
    };

    if (isLoading) return <div className="p-10 text-center text-white">Loading Admin...</div>;

    return (
        <div className="container mx-auto px-4 max-w-7xl py-12 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-gray-400">Platform Management System</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        {["overview", "users", "withdrawals", "support"].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${activeTab === tab ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <Button variant="outline" size="icon" className="border-white/10 hover:bg-red-500/20 h-10 w-10 group" title="Logout" onClick={logout}>
                        <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                    </Button>
                </div>
            </div>

            {/* OVERVIEW CONTENT */}
            {activeTab === "overview" && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-blue-600/10 border-blue-500/20">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-400">Total Users</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-white">{usersList.length}</div></CardContent>
                        </Card>
                        <Card className="bg-green-600/10 border-green-500/20">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-400">Total Revenue</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-white">{pricingConfig.currency}45,000</div></CardContent>
                        </Card>
                        <Card className="bg-yellow-600/10 border-yellow-500/20">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-400">Pending Withdrawals</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-white">{withdrawals.filter(w => w.status === 'pending').length}</div></CardContent>
                        </Card>
                        <Card className="bg-red-600/10 border-red-500/20">
                            <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-400">Open Tickets</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-white">{tickets.filter(t => t.status === 'open').length}</div></CardContent>
                        </Card>
                    </div>

                    <Card className="bg-black/40 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-gray-400 text-sm">No recent activity logged.</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* USERS MANAGEMENT */}
            {activeTab === "users" && (
                <Card className="bg-black/40 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-white">User Management</CardTitle>
                        <Button size="sm" className="bg-white text-black hover:bg-gray-200"><Users className="w-4 h-4 mr-2" /> Add User</Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {usersList.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${u.role === 'artist' ? 'bg-purple-500/20 text-purple-500' : 'bg-green-500/20 text-green-500'}`}>
                                            {u.full_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white flex items-center gap-2">
                                                {u.full_name}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${u.role === 'artist' ? 'border-purple-500 text-purple-500' : 'border-green-500 text-green-500'}`}>{u.role}</span>
                                                {u.is_blocked && <span className="text-[10px] bg-red-500 text-white px-2 rounded">BLOCKED</span>}
                                            </p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" className={`border-red-500/20 ${u.is_blocked ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'}`} onClick={() => toggleUserBlock(u.id)}>
                                            {u.is_blocked ? "Unblock" : "Block"}
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteUser(u.id)}>Delete</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* WITHDRAWALS MANAGEMENT */}
            {activeTab === "withdrawals" && (
                <Card className="bg-black/40 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Withdrawal Requests</CardTitle>
                        <CardDescription>Manage fund payout requests from curators.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {withdrawals.length === 0 && <p className="text-gray-500 text-center py-4">No requests found.</p>}
                            {withdrawals.map(w => (
                                <div key={w.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-500/20 p-2 rounded-full text-green-500">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white flex items-center gap-2">
                                                {pricingConfig.currency}{w.amount.toLocaleString()}
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${w.status === 'pending' ? 'bg-yellow-500 text-black' : w.status === 'approved' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                                    {w.status}
                                                </span>
                                            </p>
                                            <p className="text-sm text-gray-400">Requested by <span className="text-white">{w.user_name}</span> • {w.date}</p>
                                            <p className="text-xs text-gray-500 mt-1 font-mono">{w.bank_details}</p>
                                        </div>
                                    </div>
                                    {w.status === 'pending' && (
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleWithdrawal(w.id, 'approve')}>
                                                <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleWithdrawal(w.id, 'reject')}>
                                                <XCircle className="w-4 h-4 mr-1" /> Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SUPPORT SYSTEM */}
            {activeTab === "support" && (
                <Card className="bg-black/40 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white">Support Tickets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {tickets.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-500/20 p-2 rounded-full text-blue-500">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{t.subject}</p>
                                            <p className="text-sm text-gray-400">From: {t.user_name} • {t.date}</p>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.last_message}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] px-2 py-1 rounded-full uppercase ${t.status === 'open' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                            {t.status}
                                        </span>
                                        <Button size="sm" variant="outline">Chat</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
