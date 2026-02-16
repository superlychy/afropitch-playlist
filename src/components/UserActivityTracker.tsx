"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export function UserActivityTracker() {
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const updateActivity = async () => {
            try {
                // Call the RPC function we created in migration
                // Or simply update the profile directly if RLS allows
                const { error } = await supabase.from('profiles').update({
                    last_activity_at: new Date().toISOString(),
                    is_online: true
                }).eq('id', user.id);

                if (error) console.error("Error updating activity:", error);
            } catch (err) {
                console.error("Failed to update activity", err);
            }
        };

        // Update on mount and route change
        updateActivity();

        // Update periodically (every 2 minutes) to keep session alive
        const interval = setInterval(updateActivity, 2 * 60 * 1000);

        // Also update on visibility change (tab focus)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateActivity();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [pathname, user]);

    return null; // Render nothing
}
