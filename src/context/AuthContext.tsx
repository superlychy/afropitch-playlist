"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export type UserRole = "artist" | "curator" | "admin" | null;

export interface User {
    id?: string;
    name: string;
    email: string;
    role: UserRole;
    balance: number; // For artists (Credits)
    earnings: number; // For curators (Net Income)
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, role: UserRole, name?: string) => Promise<void>;
    logout: () => void;
    loadFunds: (amount: number) => void;
    deductFunds: (amount: number) => boolean;
    addEarnings: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const router = useRouter();

    // Load session from Supabase on mount
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Determine role based on email or metadata (mock for now)
                const role = session.user.email?.includes("curator") ? "curator" : "artist";

                setUser({
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                    email: session.user.email || "",
                    role: role as UserRole,
                    balance: 0,
                    earnings: 0
                });
            }
            setIsLoading(false);
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                const role = session.user.email?.includes("curator") ? "curator" : "artist";
                setUser({
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                    email: session.user.email || "",
                    role: role as UserRole,
                    balance: 0,
                    earnings: 0
                });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, role: UserRole, name?: string) => {
        setIsLoading(true);
        // Supabase Magic Link Login
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                // Redirect back to the portal page after login
                emailRedirectTo: `${window.location.origin}/portal`,
                data: {
                    full_name: name,
                    role: role
                }
            },
        });

        if (error) {
            alert("Error logging in: " + error.message);
        } else {
            alert("Check your email for the login link! (For testing, check Supabase dashboard)");
        }
        setIsLoading(false);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        router.push("/portal");
    };

    const loadFunds = (amount: number) => {
        if (!user) return;
        setUser({ ...user, balance: user.balance + amount });
    };

    const deductFunds = (amount: number) => {
        if (!user || user.balance < amount) return false;
        setUser({ ...user, balance: user.balance - amount });
        return true;
    };

    const addEarnings = (amount: number) => {
        if (!user) return;
        setUser({ ...user, earnings: user.earnings + amount });
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, loadFunds, deductFunds, addEarnings }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
