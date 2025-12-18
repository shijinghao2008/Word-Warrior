
import { supabase } from './supabaseClient';
import { createUserProfile, initializeUserStats } from './databaseService';
import { INITIAL_STATS } from '../constants';

/**
 * Auth Service for Word Warrior
 * Handles user authentication with Supabase Auth
 */

export interface AuthUser {
    id: string;
    email: string;
    username?: string;
}

/**
 * Sign up a new user with email and password
 */
export const signUpWithEmail = async (email: string, password: string, username: string) => {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username
            }
        }
    });

    if (authError) {
        throw new Error(authError.message);
    }

    if (!authData.user) {
        throw new Error('注册失败，请重试');
    }

    // Profile and stats will be created automatically by database trigger
    // But we can also manually create them here for immediate access
    try {
        await createUserProfile(email, username, false);
        await initializeUserStats(authData.user.id, INITIAL_STATS);
    } catch (error) {
        console.log('Profile creation handled by trigger or already exists');
    }

    return authData;
};

/**
 * Sign in an existing user with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new Error(error.message);
    }
};

/**
 * Get the current session
 */
export const getCurrentSession = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        console.error('Error getting session:', error);
        return null;
    }

    return data.session;
};

/**
 * Get the current user
 */
export const getCurrentUser = async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        console.error('Error getting user:', error);
        return null;
    }

    return data.user;
};

/**
 * Reset password via email
 */
export const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
        throw new Error(error.message);
    }
};

/**
 * Update user password (when logged in)
 */
export const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        throw new Error(error.message);
    }
};
