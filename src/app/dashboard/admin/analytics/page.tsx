'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, MousePointer, Info, Monitor, Globe, Clock, RefreshCw } from 'lucide-react';
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
};

type GroupedVisit = {
    ip_address: string;
    country: string;
    last_seen_at: string; // Most recent
    first_seen_at: string; // Earliest
    is_online: boolean;
    total_duration_seconds: number;
    total_page_views: number;
    total_clicks: number;
    session_count: number;
    user_agent: string; // Most recent
    latest_path: string;
};

export default function AnalyticsPage() {
    // We fetch raw visits but render grouped visits
    const [rawVisits, setRawVisits] = useState<Visit[]>([]);
    const [groupedVisits, setGroupedVisits] = useState<GroupedVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeUsers, setActiveUsers] = useState(0);

    const refreshAnalytics = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('analytics_visits')
            .select('*')
            .order('last_seen_at', { ascending: false })
            .limit(200); // Increased limit for better grouping context

        if (data) {
            const fetchedVisits = data as Visit[];
            setRawVisits(fetchedVisits);

            // GROUPING LOGIC
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
                        is_online: false, // Calc later
                        total_duration_seconds: 0,
                        total_page_views: 0,
                        total_clicks: 0,
                        session_count: 0,
                        user_agent: v.user_agent,
                        latest_path: v.path
                    };
                }

                const g = groups[v.ip_address];

                // Aggregates
                g.total_duration_seconds += (v.duration_seconds || 0);
                g.total_page_views += (v.page_views || 0);
                g.total_clicks += (v.clicks || 0);
                g.session_count += 1;

                // Time comparisons
                if (new Date(v.last_seen_at).getTime() > new Date(g.last_seen_at).getTime()) {
                    g.last_seen_at = v.last_seen_at;
                    g.user_agent = v.user_agent; // Update to latest UA
                    g.latest_path = v.path;
                }
                if (new Date(v.created_at).getTime() < new Date(g.first_seen_at).getTime()) {
                    g.first_seen_at = v.created_at;
                }
            });

            // Final Pass: Determine Online Status & Convert to Array
            const groupedArray = Object.values(groups).map(g => {
                const lastSeenTime = new Date(g.last_seen_at).getTime();
                return {
                    ...g,
                    is_online: lastSeenTime > fiveMinsAgo
                };
            }).sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());

            setGroupedVisits(groupedArray);
            setActiveUsers(groupedArray.filter(g => g.is_online).length);
        }
        setLoading(false);
    };

    useEffect(() => {
        refreshAnalytics();
        const interval = setInterval(refreshAnalytics, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const formatDuration = (seconds: number) => {
        if (!seconds) return "0s";
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Live Analytics</h1>
                    <p className="text-sm text-gray-400">Track visitors, active sessions, and engagement.</p>
                </div>
                <Button onClick={refreshAnalytics} variant="outline" size="sm" className="gap-2 text-white border-white/20">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* KPI Cards (Using Raw Visits for totals to be accurate to "visits" vs "users" where needed) */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Active Users</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{activeUsers}</div>
                        <p className="text-xs text-gray-500">Unique IPs online now</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Unique Visitors</CardTitle>
                        <Monitor className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {groupedVisits.length}
                        </div>
                        <p className="text-xs text-gray-500">Total Unique IPs Logged</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
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
                            {/* Calculate Max duration from single session to be more intuitive */}
                            {formatDuration(Math.max(...rawVisits.map(v => v.duration_seconds || 0), 0))}
                        </div>
                        <p className="text-xs text-gray-500">Single Longest Visit</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="bg-zinc-900 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Recent Visitors (Grouped by IP)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-black/20">
                                <tr>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Visitor / IP</th>
                                    <th className="px-4 py-3">Latest Path</th>
                                    <th className="px-4 py-3">Time on Site</th>
                                    <th className="px-4 py-3">Sessions</th>
                                    <th className="px-4 py-3">Total Clicks</th>
                                    <th className="px-4 py-3">Last Seen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {groupedVisits.map((group) => {
                                    return (
                                        <tr key={group.ip_address} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3">
                                                {group.is_online ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                                        Online
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">Offline</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-white font-medium flex items-center gap-2">
                                                    {group.country === 'Unknown' ? '🌍' : group.country}
                                                    <span className="truncate max-w-[120px]">{group.ip_address}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate" title={group.latest_path}>
                                                {group.latest_path.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || '/'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 font-mono">
                                                {formatDuration(group.total_duration_seconds)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">
                                                <span className="bg-white/10 px-2 py-0.5 rounded text-xs">{group.session_count}</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 font-bold">{group.total_clicks}</td>
                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                {new Date(group.last_seen_at).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {groupedVisits.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            No data available yet.
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
