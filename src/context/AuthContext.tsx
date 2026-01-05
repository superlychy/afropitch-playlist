"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export type UserRole = "artist" | "curator" | "admin" | null;

// Update interface
export interface User {
    id?: string;
    name: string;
    email: string;
    role: UserRole;
    balance: number; // For artists (Credits)
    earnings: number; // For curators (Net Income)
    bio?: string;
    instagram?: string;
    twitter?: string;
    website?: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, role: UserRole, name: string) => Promise<void>;
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
        const syncProfile = async (session: any) => {
            if (session?.user) {
                try {
                    // 1. Try to fetch existing profile
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profile) {
                        setUser({
                            id: profile.id,
                            name: profile.full_name || session.user.email?.split("@")[0] || "User",
                            email: profile.email || session.user.email || "",
                            role: (profile.role as UserRole) || "artist",
                            balance: profile.balance || 0,
                            earnings: 0, // In real app, this might be separate table or field
                            bio: profile.bio,
                            instagram: profile.instagram,
                            twitter: profile.twitter,
                            website: profile.website
                        });
                        return;
                    }

                    // 2. If no profile, create one (First time login)
                    const role = session.user.user_metadata?.role || (session.user.email?.includes("curator") ? "curator" : "artist");
                    const name = session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User";

                    const newProfile = {
                        id: session.user.id,
                        email: session.user.email,
                        full_name: name,
                        role: role,
                        balance: 0,
                        verified: false
                    };

                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert([newProfile]);

                    if (!insertError) {
                        setUser({
                            id: newProfile.id,
                            name: newProfile.full_name,
                            email: newProfile.email || "",
                            role: newProfile.role as UserRole,
                            balance: newProfile.balance,
                            earnings: 0
                        });
                    } else {
                        console.error("Error creating profile:", insertError);
                        // Fallback to session data
                        setUser({
                            id: session.user.id,
                            name: name,
                            email: session.user.email || "",
                            role: role as UserRole,
                            balance: 0,
                            earnings: 0
                        });
                    }

                } catch (e) {
                    console.error("Profile sync error", e);
                }
            } else {
                setUser(null);
            }
        };

        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) console.error("getSession error:", error);
                await syncProfile(session);
            } catch (error) {
                console.error("Auth initialization error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await syncProfile(session);
            setIsLoading(false); // Ensure loading is cleared on auth change
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error("Login error:", error.message);
                throw error; // Re-throw to let component handle UI feedback
            }
        } catch (error) {
            // Error is handled by caller or logged
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (email: string, password: string, role: UserRole, name: string) => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/portal`,
                    data: {
                        full_name: name,
                        role: role
                    }
                }
            });

            if (error) {
                console.error("Signup error:", error.message);
                throw error;
            } else {
                console.log("Signup successful, check email for confirmation if enabled.");
            }
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
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
        <AuthContext.Provider value={{ user, isLoading, login, signup, logout, loadFunds, deductFunds, addEarnings }}>
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
