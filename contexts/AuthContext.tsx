
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { signUpWithEmail, signInWithEmail, signOut as authSignOut } from '../services/authService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, username: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth state changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, username: string) => {
        try {
            const { user } = await signUpWithEmail(email, password, username);
            console.log('✅ User signed up:', user?.email);
        } catch (error: any) {
            console.error('❌ Sign up error:', error);
            throw error;
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { user } = await signInWithEmail(email, password);
            console.log('✅ User signed in:', user?.email);
        } catch (error: any) {
            console.error('❌ Sign in error:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await authSignOut();
            console.log('✅ User signed out');
        } catch (error: any) {
            console.error('❌ Sign out error:', error);
            throw error;
        }
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
