"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type UserRole = "artist" | "curator" | null;

interface User {
    name: string;
    email: string;
    role: UserRole;
    balance: number; // For artists (Credits)
    earnings: number; // For curators (Net Income)
}

interface AuthContextType {
    user: User | null;
    login: (email: string, role: UserRole) => void;
    logout: () => void;
    loadFunds: (amount: number) => void;
    deductFunds: (amount: number) => boolean;
    addEarnings: (amount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    // Load from local storage for persistence across reloads
    useEffect(() => {
        const stored = localStorage.getItem("afropitch_user");
        if (stored) {
            setUser(JSON.parse(stored));
        }
    }, []);

    useEffect(() => {
        if (user) {
            localStorage.setItem("afropitch_user", JSON.stringify(user));
        } else {
            localStorage.removeItem("afropitch_user");
        }
    }, [user]);

    const login = (email: string, role: UserRole) => {
        // Mock login logic
        const newUser: User = {
            name: email.split("@")[0],
            email,
            role,
            balance: role === "artist" ? 0 : 0,
            earnings: 0,
        };

        // Simulate pre-loaded curated data for demo
        if (role === "curator") {
            newUser.name = "Lagos Vibes Team";
            newUser.earnings = 15000;
        }

        setUser(newUser);
    };

    const logout = () => setUser(null);

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
        <AuthContext.Provider value={{ user, login, logout, loadFunds, deductFunds, addEarnings }}>
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
