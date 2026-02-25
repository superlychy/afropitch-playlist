'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, MousePointer, Monitor, Globe, Clock, RefreshCw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Visit = {
    id: string;
    session_id: string;
    ip_address: string;
    user_agent: string;
    country: string;
    path: string;
    created_at: string;
    last_seen_at: string;
    page_views: number;
    clicks: number;
    duration_seconds: number;
    user_id?: string | null;
};

type GroupedVisit = {
    ip_address: string;
    country: string;
    last_seen_at: string;
    first_seen_at: string;
    is_online: boolean;
    total_duration_seconds: number;
    total_page_views: number;
    total_clicks: number;
    session_count: number;
    user_agent: string;
    latest_path: string;
    user_id?: string | null;
    user_name?: string | null;
    user_email?: string | null;
    user_role?: string | null;
};

export default function AnalyticsPage() {
    const [rawVisits, setRawVisits] = useState<Visit[]>([]);
    const [groupedVisits, setGroupedVisits] = useState<GroupedVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeUsers, setActiveUsers] = useState(0);

    const refreshAnalytics = async () => {
        setLoading(true);

        // Fetch visits alongside profile data if user_id exists
        const { data, error } = await supabase
            .from('analytics_visits')
            .select('*, profiles(full_name, email, role)')
            .order('last_seen_at', { ascending: false })
            .limit(300);

        if (data) {
            const fetchedVisits = data as any[];
            setRawVisits(fetchedVisits);

            // Build IP → profile map from the profiles join
            // Also try to match IPs without user_id to registered profiles if possible
            const groups: { [key: string]: GroupedVisit } = {};
            const now = new Date().getTime();
            const fiveMinsAgo = now - 5 * 60 * 1000;

            fetchedVisits.forEach(v => {
                if (!groups[v.ip_address]) {
                    groups[v.ip_address] = {
                        ip_address: v.ip_address,
                        country: v.country,
                        last_seen_at: v.last_seen_at,
                        first_seen_at: v.created_at,
                        is_online: false,
                        total_duration_seconds: 0,
                        total_page_views: 0,
                        total_clicks: 0,
                        session_count: 0,
                        user_agent: v.user_agent,
                        latest_path: v.path,
                        user_id: v.user_id || null,
                        user_name: v.profiles?.full_name || null,
                        user_email: v.profiles?.email || null,
                        user_role: v.profiles?.role || null,
                    };
                }

                const g = groups[v.ip_address];
                g.total_duration_seconds += (v.duration_seconds || 0);
                g.total_page_views += (v.page_views || 0);
                g.total_clicks += (v.clicks || 0);
                g.session_count += 1;

                if (new Date(v.last_seen_at).getTime() > new Date(g.last_seen_at).getTime()) {
                    g.last_seen_at = v.last_seen_at;
                    g.user_agent = v.user_agent;
                    g.latest_path = v.path;
                    // Update user info if found in a newer session
                    if (v.user_id) {
                        g.user_id = v.user_id;
                        g.user_name = v.profiles?.full_name || g.user_name;
                        g.user_email = v.profiles?.email || g.user_email;
                        g.user_role = v.profiles?.role || g.user_role;
                    }
                }
                if (new Date(v.created_at).getTime() < new Date(g.first_seen_at).getTime()) {
                    g.first_seen_at = v.created_at;
                }
            });

            const groupedArray = Object.values(groups).map(g => ({
                ...g,
                is_online: new Date(g.last_seen_at).getTime() > fiveMinsAgo
            })).sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());

            setGroupedVisits(groupedArray);
            setActiveUsers(groupedArray.filter(g => g.is_online).length);
        }
        setLoading(false);
    };

    useEffect(() => {
        refreshAnalytics();
        const interval = setInterval(refreshAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const getBrowserName = (ua: string) => {
        if (!ua) return 'Unknown';
        if (ua.includes('Chrome') && !ua.includes('Edg')) return '🌐 Chrome';
        if (ua.includes('Firefox')) return '🦊 Firefox';
        if (ua.includes('Safari') && !ua.includes('Chrome')) return '🧭 Safari';
        if (ua.includes('Edg')) return '🔷 Edge';
        if (ua.includes('Mobile')) return '📱 Mobile';
        return '🖥 Desktop';
    };

    const registeredCount = groupedVisits.filter(g => g.user_id).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Live Analytics</h1>
                    <p className="text-sm text-gray-400">Track visitors, active sessions, and engagement. Auto-refreshes every 30s.</p>
                </div>
                <Button onClick={refreshAnalytics} variant="outline" size="sm" className="gap-2 text-white border-white/20">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card className="bg-green-600/10 border-green-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Active Now</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">{activeUsers}</div>
                        <p className="text-xs text-gray-500">Online in last 5 mins</p>
                    </CardContent>
                </Card>
                <Card className="bg-blue-600/10 border-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Unique Visitors</CardTitle>
                        <Monitor className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{groupedVisits.length}</div>
                        <p className="text-xs text-gray-500">Total unique IPs logged</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-600/10 border-purple-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Registered Users</CardTitle>
                        <User className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-400">{registeredCount}</div>
                        <p className="text-xs text-gray-500">Logged-in visitors identified</p>
                    </CardContent>
                </Card>
                <Card className="bg-orange-600/10 border-orange-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total Clicks</CardTitle>
                        <MousePointer className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{rawVisits.reduce((a, v) => a + (v.clicks || 0), 0)}</div>
                        <p className="text-xs text-gray-500">Across {rawVisits.length} sessions</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Longest Session</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {formatDuration(Math.max(...rawVisits.map(v => v.duration_seconds || 0), 0))}
                        </div>
                        <p className="text-xs text-gray-500">Single longest visit</p>
                    </CardContent>
                </Card>
            </div>

            {/* Visitor Table */}
            <Card className="bg-zinc-900 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        Recent Visitors
                        <span className="text-xs text-gray-500 font-normal">— grouped by IP, sorted by last seen</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-black/20">
                                <tr>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Visitor / IP</th>
                                    <th className="px-4 py-3">User Account</th>
                                    <th className="px-4 py-3">Latest Path</th>
                                    <th className="px-4 py-3">Browser</th>
                                    <th className="px-4 py-3">Time on Site</th>
                                    <th className="px-4 py-3">Sessions</th>
                                    <th className="px-4 py-3">Clicks</th>
                                    <th className="px-4 py-3">Last Seen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {groupedVisits.map((group) => (
                                    <tr key={group.ip_address} className={`hover:bg-white/5 transition-colors ${group.is_online ? 'bg-green-500/5' : ''}`}>
                                        <td className="px-4 py-3">
                                            {group.is_online ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="text-gray-600 text-xs">Offline</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-white font-mono text-xs flex items-center gap-1.5">
                                                <span>{group.country === 'Unknown' ? '🌍' : group.country}</span>
                                                <span className="text-gray-300">{group.ip_address}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {group.user_id ? (
                                                <div>
                                                    <p className="text-white font-medium text-xs flex items-center gap-1">
                                                        <User className="w-3 h-3 text-purple-400" />
                                                        {group.user_name || 'Unknown'}
                                                        {group.user_role && (
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${group.user_role === 'admin' ? 'border-yellow-500 text-yellow-500' :
                                                                    group.user_role === 'curator' ? 'border-green-500 text-green-500' :
                                                                        'border-purple-500 text-purple-500'
                                                                }`}>
                                                                {group.user_role}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-gray-600 mt-0.5">{group.user_email}</p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-600 text-xs italic">Guest</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300 max-w-[180px] truncate text-xs" title={group.latest_path}>
                                            {group.latest_path?.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || '/'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 text-xs">{getBrowserName(group.user_agent)}</td>
                                        <td className="px-4 py-3 text-gray-300 font-mono text-xs">{formatDuration(group.total_duration_seconds)}</td>
                                        <td className="px-4 py-3">
                                            <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-gray-300">{group.session_count}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300 font-bold text-xs">{group.total_clicks}</td>
                                        <td className="px-4 py-3 text-xs text-gray-500">
                                            {new Date(group.last_seen_at).toLocaleTimeString()}
                                            <p className="text-[10px] text-gray-700">{new Date(group.last_seen_at).toLocaleDateString()}</p>
                                        </td>
                                    </tr>
                                ))}
                                {groupedVisits.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                            {loading ? 'Loading...' : 'No visitor data yet.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
