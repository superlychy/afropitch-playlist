
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, User, Music, DollarSign, Activity, AlertCircle, Clock } from "lucide-react";

interface SystemLog {
    id: string;
    created_at: string;
    event_type: string;
    event_data: any;
    user_id?: string;
}

export function AdminActivityFeed() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // 1. Fetch initial logs
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) setLogs(data);
        };

        fetchLogs();

        // 2. Subscribe to new logs
        const channel = supabase
            .channel('realtime-system-logs')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'system_logs' },
                (payload) => {
                    const newLog = payload.new as SystemLog;
                    console.log('Real-time log received:', newLog);
                    setLogs((prev) => [newLog, ...prev]);
                }
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const getIcon = (type: string) => {
        if (type.includes('email') || type.includes('contact')) return <Mail className="w-4 h-4 text-blue-400" />;
        if (type.includes('login')) return <User className="w-4 h-4 text-green-400" />;
        if (type.includes('submission')) return <Music className="w-4 h-4 text-purple-400" />;
        if (type.includes('withdrawal')) return <DollarSign className="w-4 h-4 text-yellow-400" />;
        if (type.includes('error') || type.includes('fail')) return <AlertCircle className="w-4 h-4 text-red-400" />;
        return <Activity className="w-4 h-4 text-gray-400" />;
    };

    const getMessage = (log: SystemLog) => {
        const data = log.event_data || {};

        switch (log.event_type) {
            case 'email_received':
                return `Incoming Email from ${data.from || 'Unknown'}: "${data.subject}"`;
            case 'contact_message':
                return `Contact Form: ${data.sender} - "${data.subject}"`;
            case 'USER_LOGIN':
                return `User Login: ${data.user_data?.email || 'Unknown User'}`;
            case 'submission_created':
                return `New Song Submission: ${data.song_title}`;
            case 'withdrawal_created':
                return `Withdrawal Request: ${data.amount}`;
            case 'ADMIN_LOGIN':
                return `Admin Login detected`;
            default:
                // Fallback to checking data keys
                if (data.message) return data.message;
                return log.event_type.replace(/_/g, ' ').toUpperCase();
        }
    };

    return (
        <Card className="bg-black/40 border-white/10 h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Live System Activity
                </CardTitle>
                <div className={`flex items-center gap-1.5 text-[10px] uppercase font-bold ${isConnected ? 'text-green-500' : 'text-yellow-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                    {isConnected ? 'LIVE' : 'WAITING'}
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="space-y-3">
                        {logs.length === 0 && (
                            <div className="text-center text-gray-500 py-10 text-sm">
                                No activity recorded yet.
                            </div>
                        )}
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-3 items-start p-3 rounded-lg bg-white/5 border border-white/5 animate-in slide-in-from-left-2 duration-300">
                                <div className="mt-0.5 bg-white/5 p-1.5 rounded-md border border-white/5">
                                    {getIcon(log.event_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-200 truncate">
                                        {getMessage(log)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded uppercase">
                                            {log.event_type.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-[10px] text-gray-600 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(log.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
