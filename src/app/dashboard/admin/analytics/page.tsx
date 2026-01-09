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

export default function AnalyticsPage() {
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeUsers, setActiveUsers] = useState(0);

    const refreshAnalytics = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('analytics_visits')
            .select('*')
            .order('last_seen_at', { ascending: false })
            .limit(100);

        if (data) {
            setVisits(data as Visit[]);

            // Calculate Active Users (Unique IPs online in last 5 mins)
            const now = new Date().getTime();
            const fiveMinsAgo = now - 5 * 60 * 1000;

            const onlineVisits = data.filter((v: any) => {
                const lastSeen = new Date(v.last_seen_at).getTime();
                return lastSeen > fiveMinsAgo;
            });

            // Count Unique IPs
            // Use Set to ensure uniqueness of IP addresses
            const uniqueOnlineIPs = new Set(onlineVisits.map((v: any) => v.ip_address)).size;
            setActiveUsers(uniqueOnlineIPs);
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

            {/* KPI Cards */}
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
                        <CardTitle className="text-sm font-medium text-gray-400">Unique Users</CardTitle>
                        <Monitor className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {new Set(visits.map(v => v.ip_address)).size}
                        </div>
                        <p className="text-xs text-gray-500">Total Unique IPs</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Total Clicks</CardTitle>
                        <MousePointer className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{visits.reduce((a, v) => a + (v.clicks || 0), 0)}</div>
                        <p className="text-xs text-gray-500">Across sessions</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-400">Highest Duration</CardTitle>
                        <Clock className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">
                            {formatDuration(Math.max(...visits.map(v => v.duration_seconds || 0), 0))}
                        </div>
                        <p className="text-xs text-gray-500">Longest session</p>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="bg-zinc-900 border-white/10">
                <CardHeader>
                    <CardTitle className="text-white">Recent Visitors</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-400 uppercase bg-black/20">
                                <tr>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Location/IP</th>
                                    <th className="px-4 py-3">Path</th>
                                    <th className="px-4 py-3">Duration (Active)</th>
                                    <th className="px-4 py-3">Views</th>
                                    <th className="px-4 py-3">Clicks</th>
                                    <th className="px-4 py-3">User Agent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {visits.map((visit) => {
                                    const isOnline = (new Date().getTime() - new Date(visit.last_seen_at).getTime()) < 5 * 60 * 1000;
                                    return (
                                        <tr key={visit.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-4 py-3">
                                                {isOnline ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                                        Online
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-xs">Offline</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-white font-medium">{visit.country}</div>
                                                <div className="text-xs text-gray-500">{visit.ip_address}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate" title={visit.path}>
                                                {visit.path.replace(typeof window !== 'undefined' ? window.location.origin : '', '') || '/'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">
                                                {formatDuration(visit.duration_seconds)}
                                            </td>
                                            <td className="px-4 py-3 text-gray-300">{visit.page_views}</td>
                                            <td className="px-4 py-3 text-gray-300">{visit.clicks}</td>
                                            <td className="px-4 py-3 max-w-[200px] truncate text-xs text-gray-500" title={visit.user_agent}>
                                                {visit.user_agent}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {visits.length === 0 && (
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
